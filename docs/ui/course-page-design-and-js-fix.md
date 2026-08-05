# Course Page — Design Issues, Fixes & JS Card Rendering Proposal
**Project:** Cable&Net Courses — LMS V2.0  
**File:** `course.html`  
**Date:** August 2026

---

## PART 1 — Design Issues & Fixes

---

### Issue 1 — Empty Right Panel (Critical)

**Problem:**  
The right two-thirds of the page renders nothing after page load. Users see blank space with no cards, no prompts, no skeleton loaders. The page looks broken.

**Fix:**  
- Render all module cards immediately on load, even if status is `LOCKED` or `COMING SOON`
- Show greyed-out cards with a lock icon for locked content
- Add a skeleton loader (animated placeholder) while cards are being fetched from Supabase

```css
/* Skeleton loader pulse */
.skeleton {
  background: linear-gradient(90deg, #e0ddd8 25%, #f0ede8 50%, #e0ddd8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8px;
  height: 90px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### Issue 2 — Unit Title Truncated in Sidebar

**Problem:**  
`UNIT 01 — Core ...` is cut off with an ellipsis — looks like a rendering bug rather than intentional design.

**Fix:**  
- Widen the sidebar panel from its current fixed width (approx 240px) to at least `280px`
- Use `title` attribute on the truncated element as a fallback tooltip
- On hover, expand with CSS or show a full tooltip

```css
.unit-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px; /* increase this */
}
.unit-item:hover {
  white-space: normal;   /* allow wrap on hover */
  overflow: visible;
}
```

```html
<!-- Add title attribute for native tooltip -->
<div class="unit-item" title="UNIT 01 — Core Cabling Concepts">
  UNIT 01 — Core ...
</div>
```

---

### Issue 3 — Progress Bar Invisible at 0%

**Problem:**  
A 0% progress bar is just a flat grey line — indistinguishable from a broken element.

**Fix:**  
- Show a "Not started" label when progress is 0%
- Give the bar track a visible background colour so the empty state is intentional-looking
- Use a minimum visible fill of 4px when progress > 0 but < 5%

```css
.progress-track {
  background-color: #d8d4ce;  /* visible empty track */
  border-radius: 4px;
  height: 6px;
  width: 100%;
}
.progress-fill {
  background-color: #2d7d6f;  /* teal accent */
  height: 100%;
  border-radius: 4px;
  min-width: 4px;             /* always visible once started */
  transition: width 0.4s ease;
}
```

```html
<div class="progress-track">
  <div class="progress-fill" style="width: 0%"></div>
</div>
<span class="progress-label">
  <!-- JS: if progress === 0, show "Not started" -->
  Not started
</span>
```

---

### Issue 4 — No Visual Containment / Flat Layout

**Problem:**  
`PORT 01` badge, page title, description, course progress, and the units panel all sit on the same flat plane with no grouping or visual separation. Everything floats on the background with identical weight.

**Fix:**  
- Wrap the header block (title + description + progress) in a subtle card or give it a bottom border separator
- Give the units sidebar and the content panel each a visible container (light card with shadow)
- Add a clear two-column layout with a divider

```css
.course-header {
  border-bottom: 1px solid #d0ccc6;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}

.course-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.units-panel {
  background: #fff;
  border: 1px solid #ddd9d3;
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.modules-panel {
  background: #fff;
  border: 1px solid #ddd9d3;
  border-radius: 10px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  min-height: 400px;
}
```

---

### Issue 5 — Unit Progress Counter Has No Visual Weight

**Problem:**  
`0/14` next to the unit name is plain text — no colour, no badge, nothing to draw the eye.

**Fix:**  
- Style the counter as a small teal pill/badge matching the `ALL` filter button already used on the page

```css
.unit-count {
  display: inline-block;
  background: #2d7d6f;
  color: #fff;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  margin-left: auto;
}
```

```html
<div class="unit-row">
  <span class="unit-title">All units</span>
  <span class="unit-count">0 / 14</span>
</div>
```

---

## PART 2 — JS Fix: Rendering Module Cards

---

### Root Cause

The module cards are not rendering because the content panel has no population logic triggered on load. The `load-modules-UPDATED.js` file fetches data but either:

1. The render function is never called after fetch, OR
2. The fetched data is not being mapped to HTML card elements, OR
3. The active unit/filter state is not being set on page load (so the render call fires with no target)

---

### Proposed Fix — `load-modules-UPDATED.js`

#### Step 1 — Ensure modules are fetched on page load

```javascript
// load-modules-UPDATED.js

const supabase = window._supabase; // assumes supabase client is global

let allModules = [];       // full list fetched from Supabase
let activeUnit = 'all';    // tracks which unit is selected
let activeFilter = 'all';  // tracks which type filter is active

// ── Entry point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const courseId = getCourseIdFromURL();   // reads ?course=cabling
  await loadModules(courseId);
  setupUnitNav();
  setupFilterNav();
  renderCards();
});
```

---

#### Step 2 — Fetch all modules for the course

```javascript
async function loadModules(courseId) {
  showSkeletons();  // show placeholder cards while loading

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('module_number', { ascending: true });

  if (error) {
    console.error('Failed to load modules:', error.message);
    showError('Could not load course content. Please try again.');
    return;
  }

  allModules = data;
  hideSkeletons();
}
```

---

#### Step 3 — Render cards filtered by active unit and type

```javascript
function renderCards() {
  const panel = document.getElementById('modules-panel');
  panel.innerHTML = '';  // clear before re-render

  const filtered = allModules.filter(mod => {
    const unitMatch  = activeUnit === 'all' || mod.unit_id === activeUnit;
    const typeMatch  = activeFilter === 'all' || mod.type.toLowerCase() === activeFilter;
    return unitMatch && typeMatch;
  });

  if (filtered.length === 0) {
    panel.innerHTML = `<p class="empty-state">No items found for this selection.</p>`;
    return;
  }

  filtered.forEach(mod => {
    panel.insertAdjacentHTML('beforeend', buildCard(mod));
  });
}
```

---

#### Step 4 — Build a single card from a module row

```javascript
function buildCard(mod) {
  const isLocked = mod.status === 'LOCKED' || mod.status === 'COMING SOON';

  return `
    <div class="module-card ${isLocked ? 'locked' : ''}" data-id="${mod.id}">
      <div class="card-meta">
        <span class="badge type-badge">${mod.type}</span>
        <span class="badge status-badge status-${mod.status.toLowerCase().replace(' ', '-')}">
          ${mod.status}
        </span>
      </div>
      <div class="card-body">
        <p class="module-number">MODULE ${String(mod.module_number).padStart(2, '0')}</p>
        <h3 class="module-title">${mod.title}</h3>
        <p class="module-desc">${mod.description ?? ''}</p>
      </div>
      <div class="card-actions">
        ${isLocked
          ? `<button class="btn btn-locked" disabled>🔒 Locked</button>`
          : `<button class="btn btn-primary" onclick="openModule('${mod.id}')">Open</button>`
        }
        ${mod.duration ? `<span class="duration">${mod.duration}</span>` : ''}
      </div>
    </div>
  `;
}
```

---

#### Step 5 — Wire up unit nav and type filters

```javascript
function setupUnitNav() {
  document.querySelectorAll('.unit-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.unit-item').forEach(u => u.classList.remove('active'));
      item.classList.add('active');
      activeUnit = item.dataset.unitId ?? 'all';
      renderCards();
    });
  });
}

function setupFilterNav() {
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter.toLowerCase();
      renderCards();
    });
  });
}
```

---

#### Step 6 — Skeleton loader helpers

```javascript
function showSkeletons(count = 6) {
  const panel = document.getElementById('modules-panel');
  panel.innerHTML = Array(count).fill(`<div class="skeleton"></div>`).join('');
}

function hideSkeletons() {
  // renderCards() clears the panel anyway — this is a no-op safety call
  document.getElementById('modules-panel').innerHTML = '';
}
```

---

#### Step 7 — URL helper

```javascript
function getCourseIdFromURL() {
  return new URLSearchParams(window.location.search).get('course');
}
```

---

### Required HTML attributes (for the JS to wire up correctly)

```html
<!-- Unit nav items need data-unit-id -->
<div class="unit-item active" data-unit-id="all">All units <span class="unit-count">0 / 14</span></div>
<div class="unit-item" data-unit-id="unit_01">UNIT 01 — Core Cabling Concepts</div>

<!-- Filter pills need data-filter -->
<button class="filter-pill active" data-filter="all">ALL</button>
<button class="filter-pill" data-filter="lessons">LESSONS</button>
<button class="filter-pill" data-filter="videos">VIDEOS</button>
<button class="filter-pill" data-filter="pdfs">PDFs</button>
<button class="filter-pill" data-filter="tools">TOOLS</button>
<button class="filter-pill" data-filter="articles">ARTICLES</button>

<!-- Module cards land here -->
<div id="modules-panel"></div>
```

---

### Supabase `modules` table — expected columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `course_id` | text | Matches `?course=` URL param |
| `unit_id` | text | e.g. `unit_01` |
| `module_number` | int | Used for ordering |
| `title` | text | Card heading |
| `description` | text | Card subtitle |
| `type` | text | `LESSON`, `VIDEO`, `PDF`, `TOOL`, `ARTICLE`, `QUIZ` |
| `status` | text | `UNLOCK`, `IN PROGRESS`, `LOCKED`, `COMING SOON` |
| `duration` | text | Optional, e.g. `12 min` |

---

## Summary

| # | Issue | Priority | Fix |
|---|---|---|---|
| 1 | Empty right panel | 🔴 Critical | Implement `renderCards()` on `DOMContentLoaded` |
| 2 | Unit title truncated | 🟡 Medium | Widen sidebar, add `title` tooltip attribute |
| 3 | Progress bar invisible at 0% | 🟡 Medium | Visible track + "Not started" label |
| 4 | Flat layout — no containment | 🟡 Medium | Card wrappers + CSS grid two-column layout |
| 5 | `0/14` counter unstyled | 🟢 Low | Teal pill badge matching existing `ALL` button |
