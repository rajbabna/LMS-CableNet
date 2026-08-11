const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { config } = require('dotenv');
config();

const DB_URL = process.env.LMS_PGTAP_DB_URL;
if (!DB_URL) { console.error('LMS_PGTAP_DB_URL missing in tests/.env'); process.exit(2); }

const SQL_DIR = path.resolve(__dirname, '..', '..', 'sql');
const PGTAP_DIR = __dirname;

// Scripts that should NOT run on a fresh TEST DB (one-time data hygiene /
// diagnostics / seeds that abort when the production emails don't exist or
// are not part of schema establishment):
//   11, 14, 20, 22    -> delete production test/probe/legacy users by email
//   16, 17, 18        -> diagnostic listing / JSON dumps (SELECT only)
//   23                -> cleanup orphaned completions
//   27b               -> dummy mentor-session seed (bootstrap inserts its own)
//   31-pilot-lesson   -> superseded by 31-course-content (18 real modules)
//   32b               -> dummy feedback preview rows
//   52                -> manual how-to (UPDATE against real emails)
const SKIP_SCHEMA = new Set([
  '11-cleanup-users.sql',
  '14-cleanup-probes-dedupe.sql',
  '16-list-triggers.sql',
  '17-list-triggers-full.sql',
  '18-diagnostic-single.sql',
  '20-delete-legacy-accounts.sql',
  '22-cleanup-probes.sql',
  '23-cleanup-orphaned-completions.sql',
  '27b-mentor-sessions-seed.sql',
  '31-pilot-lesson-content.sql',
  '32b-dummy-feedback.sql',
  '52-renew-student-access.sql',
]);

const MODE = process.argv[2] || 'all';

// Split a SQL file into top-level statements, respecting single-quoted strings,
// dollar-quoted strings, -- line comments, and /* */ block comments.
function splitSql(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === '-' && next === '-') {          // line comment
      while (i < n && sql[i] !== '\n') { cur += sql[i]; i++; }
    } else if (ch === '/' && next === '*') {   // block comment
      cur += '/*'; i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) { cur += sql[i]; i++; }
      if (i < n) { cur += '*/'; i += 2; }
    } else if (ch === "'") {                   // single-quoted string
      cur += ch; i++;
      while (i < n) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { cur += "''"; i += 2; }
          else { cur += "'"; i++; break; }
        } else { cur += sql[i]; i++; }
      }
    } else if (ch === '$') {                   // dollar-quoted string
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (m) {
        cur += m[0]; i += m[0].length;
        const closer = m[0];
        const end = sql.indexOf(closer, i);
        if (end === -1) { cur += sql.slice(i); i = n; }
        else { cur += sql.slice(i, end + closer.length); i = end + closer.length; }
      } else { cur += ch; i++; }
    } else {
      if (ch === ';') {
        const trimmed = cur.trim();
        if (trimmed) out.push(trimmed);
        cur = '';
      } else { cur += ch; }
      i++;
    }
  }
  const trimmed = cur.trim();
  if (trimmed) out.push(trimmed);
  return out;
}

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  client.on('notice', msg => { if (msg && msg.message) console.log('   [tap]', msg.message); });
  await client.connect();

  if (MODE === 'all' || MODE === 'schema') {
    // Fresh TEST-project reset: drop public schema objects so re-runs are clean.
    try {
      await client.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
      // Restore Supabase's default public-schema grants (dropped with the schema).
      await client.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
      console.log('OK   (pre) reset public schema');
    } catch (e) {
      console.log(`FAIL (pre) reset: ${e.message.replace(/\s+/g, ' ').slice(0, 160)}`);
      await client.end();
      process.exit(1);
    }

    // Pre-req that exists in production from manual setup: modules.id uses
    // modules_id_seq, but no sql file ever creates it. Create if missing.
    try {
      await client.query(`CREATE SEQUENCE IF NOT EXISTS public.modules_id_seq`);
      console.log('OK   (pre) modules_id_seq');
    } catch (e) {
      console.log(`FAIL (pre) sequence: ${e.message.slice(0, 200)}`);
      await client.end();
      process.exit(1);
    }

    // Apply sql/01 (courses + modules) and the pre-schema base tables BEFORE
    // the incremental scripts, since base tables reference courses/modules.
    for (const f of ['01-supabase-schema.sql']) {
      const sql = fs.readFileSync(path.join(SQL_DIR, f), 'utf8');
      try { await client.query(sql); console.log(`OK   ${f}`); }
      catch (e) { console.log(`FAIL ${f}: ${e.message.replace(/\s+/g, ' ').slice(0, 220)}`); await client.end(); process.exit(1); }
    }

    try {
      await client.query(fs.readFileSync(path.join(PGTAP_DIR, '00-base-schema.sql'), 'utf8'));
      console.log('OK   (pre) base tables');
    } catch (e) {
      console.log(`FAIL (pre) base tables: ${e.message.replace(/\s+/g, ' ').slice(0, 220)}`);
      await client.end();
      process.exit(1);
    }

    const files = fs.readdirSync(SQL_DIR).filter(f => f.endsWith('.sql')).sort().filter(f => f !== '01-supabase-schema.sql');
    let applied = 0;
    const skipped = [];
    for (const f of files) {
      if (SKIP_SCHEMA.has(f)) { skipped.push(f); continue; }
      const sql = fs.readFileSync(path.join(SQL_DIR, f), 'utf8').replace(/^\uFEFF/, '');
      try {
        await client.query(sql);
        applied++;
        console.log(`OK   ${f}`);
      } catch (e) {
        console.log(`FAIL ${f}: ${e.message.replace(/\s+/g, ' ').slice(0, 220)}`);
        await client.end();
        process.exit(1);
      }
    }
    console.log(`\nSchema: ${applied} applied, skipped ${skipped.length} (${skipped.join(', ')})`);

    // Supabase sweep: ensure anon/authenticated can reach every public object
    // (schema USAGE + table grants). RLS still enforces row-level visibility.
    try {
      await client.query(`
        GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
        DO $$ DECLARE t text; BEGIN
          FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
            EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role', t);
          END LOOP;
        END $$;`);
      console.log('OK   (post) grants sweep');
    } catch (e) {
      console.log(`FAIL (post) grants sweep: ${e.message.slice(0, 160)}`);
      await client.end();
      process.exit(1);
    }
  }

  if (MODE === 'all' || MODE === 'tests') {
    // 00-bootstrap-fixtures: fixtures are INSIDE a test project on purpose; apply verbatim.
    const boot = fs.readFileSync(path.join(PGTAP_DIR, '00-bootstrap-fixtures.sql'), 'utf8');
    try {
      await client.query(boot);
      // Test files call set_role_* unqualified while running under
      // search_path = public, auth, extensions. Bridge helpers into public.
      await client.query(`
        CREATE OR REPLACE FUNCTION public.set_uid(p_uid uuid) RETURNS void LANGUAGE sql AS
          'SELECT tests.set_uid(p_uid)';
        CREATE OR REPLACE FUNCTION public.set_role_authenticated() RETURNS void LANGUAGE sql AS
          'SELECT tests.set_role_authenticated()';
        CREATE OR REPLACE FUNCTION public.set_role_postgres() RETURNS void LANGUAGE sql AS
          'SELECT tests.set_role_postgres()';
        GRANT USAGE ON SCHEMA tests TO anon, authenticated, service_role;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, service_role;
        SET search_path = public, auth, extensions;
      `);
      console.log('\nBootstrap fixtures: OK');
    } catch (e) {
      console.log(`FAIL bootstrap: ${e.message.replace(/\s+/g, ' ').slice(0, 300)}`);
      await client.end();
      process.exit(1);
    }

    // 01..08 test files, each already wrapped in BEGIN / finish / ROLLBACK.
    for (let n = 1; n <= 8; n++) {
      const file = fs.readdirSync(PGTAP_DIR).find(x => x.startsWith(`${String(n).padStart(2, '0')}-`));
      if (!file) { console.log(`?    missing 0${n}`); continue; }
      const sql = fs.readFileSync(path.join(PGTAP_DIR, file), 'utf8');
      const t0 = Date.now();
      const stmts = splitSql(sql);
      let tapOutput = [];
      let failed = false;
      let quote;
      try {
        for (const stmt of stmts) {
          try {
            const r = await client.query(stmt);
            if (r && r.command === 'SELECT' && r.rows) {
              // finish() returns SETOF text -> rows carry the TAP lines.
              r.rows.forEach(row => {
                const v = Object.values(row)[0];
                if (typeof v === 'string') tapOutput.push(v);
              });
            }
          } catch (e) {
            failed = true;
            throw e;
          }
        }
      } catch (e) {
        quote = ` (${e.message.replace(/\s+/g, ' ').slice(0, 160)})`;
      }
      const status = failed ? 'FAILED' : (tapOutput.length ? `ok (${Date.now() - t0}ms)` : `ran-no-output (${Date.now() - t0}ms)`);
      console.log(`\n=== ${file}: ${status}${quote || ''} ===`);
      tapOutput.forEach(l => console.log('   ', l));
    }
  }

  await client.end();
  console.log('\nDone.');
}

main().catch(e => { console.error(e.message); process.exit(1); });