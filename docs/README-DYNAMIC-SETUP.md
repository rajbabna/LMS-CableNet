[← Back to START-HERE](./START-HERE.md)

# Dynamic Course Loading Setup - Quick Start

## What You're Getting

Three new files to make your course landing page **dynamic**:

1. **01-supabase-schema.sql** — Creates tables in Supabase
2. **index.html** — The dynamic landing page (built directly as `index.html`, no rename step)
3. **js/load-courses.js** — Fetches and renders course data
4. **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** — Step-by-step setup instructions
5. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — How the system works (optional reading)

---

## The 4-Minute Setup

### 1. Create Supabase Tables (2 min)

1. Open your Supabase dashboard
2. Go to **SQL Editor** → **New Query**
3. Copy-paste the entire `01-supabase-schema.sql` file
4. Click **Run**

✅ Done. You now have `courses` and `modules` tables with sample data.

---

### 2. Update Your Site Files (1 min)

1. **Add/replace** `index.html` with the dynamic version
2. **Add** `js/load-courses.js` to your `js/` folder

Your folder structure should now be:
```
/
├── index.html (the new dynamic version)
├── css/
│   └── style.css
└── js/
    ├── supabase-client.js
    ├── load-courses.js (NEW)
    ├── auth-form.js
    └── auth-guard.js
```

---

### 3. Test (1 min)

1. Open `index.html` in a browser
2. You should see the two course cards load from Supabase

If something's broken, check the **Troubleshooting** section in `IMPLEMENTATION-GUIDE.md`.

---

## What Changed?

### Before
```html
<!-- Hardcoded in HTML -->
<article class="port">
  <span class="port-num">PORT 01</span>
  <h3>Network Foundations - Cabling & Infrastructure</h3>
  ...
</article>
```

### After
```html
<!-- Empty container -->
<section class="ports"></section>

<!-- Populated by JavaScript from Supabase -->
<script src="js/load-courses.js"></script>
```

---

## Now You Can...

✅ **Add a course** — Insert row in Supabase `courses` table  
✅ **Edit a course** — Click a cell in Supabase, type  
✅ **Remove a course** — Delete row in Supabase  
✅ **See changes instantly** — No redeployment needed

---

## Next Steps (Optional)

### Make Module Lists Dynamic Too

The same pattern works for individual course modules. You already have sample data in the `modules` table — to load it dynamically:

1. Create `js/load-modules.js` (similar to `load-courses.js`, filters by `course_id`)
2. Update `course-cabling.html` and `course-networking.html` to use it
3. Now each course page loads its module list from Supabase

✅ This is already built — see **[MODULES-IMPLEMENTATION-GUIDE.md](./MODULES-IMPLEMENTATION-GUIDE.md)**.

---

## Files Reference

| File | What It Does | Where It Goes |
|------|---|---|
| `01-supabase-schema.sql` | Creates tables in Supabase | Run in Supabase SQL Editor |
| `index.html` | Landing page, built directly as the dynamic version | Site root |
| `js/load-courses.js` | Fetches + renders courses | `js/` folder |

---

## Troubleshooting

**Q: Course cards don't appear**  
A: Open DevTools (F12) → Console tab. Look for errors. Most common:
- "supabaseClient is not defined" → Check `supabase-client.js` is loaded first
- "Cannot read properties of null" → Check `.ports` container exists in HTML

**Q: I see an error "Cannot read properties of undefined"**  
A: The courses table might be empty. Go to Supabase → Table Editor → courses. Should have 2 rows.

**Q: How do I update a course title?**  
A: Supabase → Table Editor → Click the cell → Edit → Save. Changes appear on your site within seconds.

**Q: How do I add a new course?**  
A: Supabase → Table Editor → Insert row → Fill in `id`, `title`, `description`, `port_number` → Done. Refresh your site.

---

## Security Notes

✅ Course names are public (shown on landing page)  
✅ Supabase anon key is safe (designed to be public)  
✅ Course pages are still protected by auth-guard.js  
✅ Only logged-in, approved students can access course content

---

## Questions?

See **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** for detailed setup steps.  
See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for how the system works.  
See **[MODULES-QUICK-REFERENCE.md](./MODULES-QUICK-REFERENCE.md)** for day-to-day content tasks.

Good luck! 🚀
