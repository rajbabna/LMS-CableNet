# LMS Full Design Audit — Cable&Net Courses
**Screens covered:** Student Dashboard · Course Page (PORT 01) · Course Page (PORT 02)  
**Date:** August 2026  
**Total issues found:** 22

---

## SECTION A — Navigation (All Pages)

---

### A1 — Navbar structure is inconsistent between pages

**Problem:**  
Dashboard nav shows: `Rahls | STUDENT | Give Feedback | Log out`  
Course page nav shows: `Dashboard | [Other Course Name] | Log out`  
The structure completely changes between pages — different items, different order, different logic. This is disorienting and feels like two different products.

**Fix:**  
Standardise one navbar layout across all pages:

```html
<nav class="site-nav">
  <a href="/" class="nav-logo">CABLE&amp;NET COURSES</a>
  <div class="nav-links">
    <a href="student-dashboard.html">Dashboard</a>
    <a href="course.html?course=cabling">PORT 01</a>
    <a href="course.html?course=networking">PORT 02</a>
  </div>
  <div class="nav-profile">
    <span class="nav-username">Rahls</span>
    <span class="role-badge">Student</span>
    <a href="#" onclick="signOut()">Log out</a>
  </div>
</nav>
```

```css
.site-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 2rem;
  border-bottom: 1px solid #ddd9d3;
}
.nav-links { display: flex; gap: 1.5rem; }
.nav-links a { color: #444; font-size: 0.9rem; text-decoration: none; }
.nav-links a:hover { color: #2d7d6f; }
.nav-profile { display: flex; align-items: center; gap: 1rem; }
```

---

### A2 — STUDENT badge dominates the navbar

**Problem:**  
The orange `STUDENT` pill badge is the most visually dominant element in the entire nav — heavier than the logo, the links, and the username. Role badges are metadata, not navigation.

**Fix:**  
Reduce to a subtle outline badge next to the username, or fold it into a profile dropdown:

```css
/* Before — too heavy */
.role-badge {
  background: #c0601a;
  color: white;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 700;
}

/* After — subtle outline */
.role-badge {
  border: 1px solid #c0601a;
  color: #c0601a;
  background: transparent;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

### A3 — Course names as nav links are too long

**Problem:**  
`Network Operations - Configuration & Troubleshooting` as a nav link takes up most of the navbar width. With two courses it crowds out everything else.

**Fix:**  
Use short labels (`PORT 01`, `PORT 02`) as nav labels with full name in a `title` tooltip. This also keeps the nav consistent with the PORT badge system already used across the site:

```html
<a href="course.html?course=cabling"  title="Network Foundations - Cabling & Infrastructure">PORT 01</a>
<a href="course.html?course=networking" title="Network Operations - Configuration & Troubleshooting">PORT 02</a>
```

---

### A4 — Give Feedback link in primary nav

**Problem:**  
`Give Feedback` is in the primary navigation bar — the same level as course links and Log out. This is utility content, not navigation. It competes with items students actually need.

**Fix:**  
Move to the page footer:

```html
<footer class="site-footer">
  <p>© 2026 Raj Babna · Cable&amp;Net Courses</p>
  <a href="feedback.html">Give Feedback</a>
</footer>
```

---

## SECTION B — Student Dashboard

---

### B1 — Overall progress card has dead space

**Problem:**  
The overall progress card shows `0% | 0 of 24 modules across 2 courses` then nothing for the entire right half of the card. A wide empty horizontal band looks unfinished.

**Fix:**  
Either shrink the card to fit its content, or fill the right space with a mini donut chart or module count breakdown:

```html
<div class="overall-progress-card">
  <div class="progress-left">
    <span class="progress-pct">0%</span>
    <div>
      <strong>Overall progress</strong>
      <p>0 of 24 modules across 2 courses</p>
    </div>
  </div>
  <div class="progress-right">
    <!-- Mini breakdown -->
    <div class="course-pill">PORT 01 &nbsp; 0/14</div>
    <div class="course-pill">PORT 02 &nbsp; 0/9</div>
  </div>
</div>
```

```css
.overall-progress-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: #fff;
  border: 1px solid #ddd9d3;
  border-radius: 10px;
}
.progress-left { display: flex; align-items: center; gap: 1rem; }
.progress-pct {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d7d6f;
  min-width: 3rem;
}
.course-pill {
  background: #f0ede8;
  border: 1px solid #ddd9d3;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.8rem;
  color: #555;
}
```

---

### B2 — Course cards have unequal heights

**Problem:**  
PORT 01 card is noticeably shorter than PORT 02 because the description text wraps to a different line count. Side-by-side cards at different heights look misaligned.

**Fix:**  
Force the card grid to stretch cards to equal height:

```css
.course-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: stretch;   /* key — stretches both to match the taller one */
}

.course-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;  /* pushes CTA button to bottom */
}

.course-card .card-description {
  flex-grow: 1;    /* description fills middle space */
  min-height: 3.5rem;  /* guarantees consistent space even with short descriptions */
}
```

---

### B3 — Unit title truncates inside dashboard course cards

**Problem:**  
`UNIT 01 - Core Mo...` truncates inside the small dashboard course card. This is a second truncation point beyond the course page sidebar.

**Fix:**  
The dashboard card only needs to show the unit name at summary level — replace the truncated unit title with a simple count label:

```html
<!-- Instead of showing the unit title which truncates -->
<!-- Show a progress summary label -->
<div class="card-unit-row">
  <span class="unit-label">UNIT 01</span>
  <span class="unit-progress">0 / 14</span>
</div>
```

```css
.card-unit-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #666;
  padding: 0.4rem 0;
  border-top: 1px dashed #ddd9d3;
}
```

---

### B4 — Access expiry date is buried and unstyled

**Problem:**  
`Access until Aug 12, 2026` on PORT 01 is tiny, plain, and visually identical to the enrolment date above it. This is important information (course expiry) and easily missed.

**Fix:**  
Style the expiry date distinctly — amber/warning colour when close to expiry:

```html
<div class="access-expiry warning">
  ⏳ Access until Aug 12, 2026
</div>
```

```css
.access-expiry {
  font-size: 0.78rem;
  color: #666;
  margin-top: 4px;
}
.access-expiry.warning {
  color: #a05c00;
  font-weight: 600;
  background: #fff4e0;
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-block;
}
```

---

### B5 — Orange colour used for too many different purposes

**Problem:**  
Orange/brown is currently used for: CTA buttons, IN PROGRESS badge, error text, subtitle link highlights, Give Feedback link, and achievement section heading. One colour with six semantic roles creates visual noise — the eye can't assign meaning to it.

**Fix — Assign colour roles clearly:**

| Role | Colour | Usage |
|---|---|---|
| Primary action | `#c0601a` orange-brown | Buttons only (`CONTINUE COURSE`) |
| Progress/status | `#2d7d6f` teal | IN PROGRESS badge, progress bars, counts |
| Warning/expiry | `#a05c00` amber | Access expiry dates |
| Error | `#b91c1c` red | Error messages only |
| Link text | `#2d7d6f` teal | All inline links |

```css
/* Reassign IN PROGRESS from orange to teal */
.status-in-progress {
  background: #2d7d6f;
  color: #fff;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.72rem;
  font-weight: 600;
}

/* Keep CTA button orange — that's its only role */
.btn-primary {
  background: #c0601a;
  color: #fff;
}

/* Error text gets red — not orange */
.error-text { color: #b91c1c; }
```

---

### B6 — Achievement badges are visually identical (earned vs unearned)

**Problem:**  
All 8 achievement badges look exactly the same — grey square, grey icon, small text. There is no visual difference between earned and unearned badges. `0 of 8 earned` is written above but the grid gives no visual confirmation of which is which.

**Fix:**  
Earned badges get full colour and a glow. Unearned get heavy greyscale with reduced opacity:

```css
.badge-card {
  border: 1px solid #ddd9d3;
  border-radius: 8px;
  padding: 1rem 0.5rem;
  text-align: center;
  transition: transform 0.2s;
}

/* Unearned */
.badge-card.locked {
  opacity: 0.45;
  filter: grayscale(1);
}

/* Earned */
.badge-card.earned {
  border-color: #2d7d6f;
  box-shadow: 0 0 0 3px rgba(45, 125, 111, 0.15);
  background: #f0faf8;
}
.badge-card.earned .badge-icon {
  color: #2d7d6f;
}
```

```html
<!-- Add earned/locked class dynamically via JS -->
<div class="badge-card locked">...</div>
<div class="badge-card earned">...</div>
```

---

### B7 — Subtitle text has coloured link words that look like bugs

**Problem:**  
`Your enrolled courses and progress` — the words `courses` and `progress` appear in orange as if they are links. They are not interactive. Colouring non-interactive text like a link creates a broken affordance.

**Fix:**  
Remove colour from the subtitle entirely, or use a single neutral accent colour for the whole phrase:

```css
/* Remove the per-word orange highlighting */
.page-subtitle { color: #666; font-size: 0.95rem; }
.page-subtitle a { color: #2d7d6f; }   /* only if they ARE actual links */
```

---

## SECTION C — Course Pages (PORT 01 & PORT 02)

---

### C1 — Progress bar nearly invisible

**Problem:**  
The progress bar track is `~3px` high and a very light grey — at 0% it looks like a blank line or a rendering glitch. The `NOT STARTED` label placed far to the right makes the layout feel broken.

**Fix:**

```css
.progress-track {
  width: 100%;
  height: 8px;                          /* increase from ~3px */
  background: #d8d4ce;                  /* visible empty track */
  border-radius: 4px;
  overflow: hidden;
  margin-top: 6px;
}
.progress-fill {
  height: 100%;
  background: #2d7d6f;
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* Move NOT STARTED label directly under the bar, not to the right */
.progress-label {
  font-size: 0.72rem;
  color: #888;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

```html
<div class="progress-section">
  <span class="progress-meta-label">COURSE PROGRESS</span>
  <div class="progress-track">
    <div class="progress-fill" style="width: 0%"></div>
  </div>
  <span class="progress-label">Not started</span>
</div>
```

---

### C2 — PORT badge has no colour identity

**Problem:**  
`PORT 01` and `PORT 02` badges are identical plain outline boxes. Yet the multicolour stripe at the top of each page implies each port has a colour identity. The badge and the stripe are not connected.

**Fix:**  
Colour-code the PORT badge to match the dominant colour of its stripe segment:

```css
/* PORT 01 — use the orange stripe colour */
.port-badge.port-01 {
  border-color: #c0601a;
  color: #c0601a;
  background: #fff4ef;
}

/* PORT 02 — use the green stripe colour */
.port-badge.port-02 {
  border-color: #2d6e2d;
  color: #2d6e2d;
  background: #f0faf0;
}
```

---

### C3 — Multicolour stripe is unexplained

**Problem:**  
The 5-segment coloured stripe at the top of course pages is visually interesting but has no legend or explanation. Students see orange, green, dark blue, green, dark brown stripes and don't know what they represent (units? modules? sections?).

**Fix:**  
Add a tooltip on hover, or make each stripe segment a progress indicator for each unit with a label:

```html
<div class="course-stripe" aria-label="Unit progress indicator">
  <div class="stripe-segment unit-1" style="width:20%" title="Unit 1 — 0% complete"></div>
  <div class="stripe-segment unit-2" style="width:20%" title="Unit 2 — 0% complete"></div>
  <!-- etc. -->
</div>
```

```css
.course-stripe { display: flex; height: 6px; width: 100%; gap: 3px; }
.stripe-segment { height: 100%; border-radius: 2px; cursor: default; }
.stripe-segment.unit-1 { background: #c0601a; }
.stripe-segment.unit-2 { background: #2d7d6f; }
/* colour remaining per unit palette */
```

---

### C4 — Filter pills inconsistent between courses

**Problem:**  
PORT 01 shows six filter pills: `ALL LESSONS VIDEOS PDFs TOOLS ARTICLES`.  
PORT 02 shows only two: `ALL LESSONS`.  
The bar looks sparse and unfinished for PORT 02.

**Fix:**  
Always render all standard pills. Disable (grey out) pills for types with no content rather than hiding them. This gives students a clear picture of what content types exist and which are coming:

```javascript
const ALL_TYPES = ['lessons', 'videos', 'pdfs', 'tools', 'articles'];

function renderFilterPills(modules) {
  const availableTypes = new Set(modules.map(m => m.type.toLowerCase()));
  const container = document.querySelector('.filter-pills');
  container.innerHTML = '';

  // Always render ALL first
  container.insertAdjacentHTML('beforeend',
    `<button class="filter-pill active" data-filter="all">ALL</button>`);

  ALL_TYPES.forEach(type => {
    const hasContent = availableTypes.has(type);
    container.insertAdjacentHTML('beforeend', `
      <button class="filter-pill ${!hasContent ? 'disabled' : ''}"
              data-filter="${type}"
              ${!hasContent ? 'disabled title="No content yet"' : ''}>
        ${type.toUpperCase()}
      </button>
    `);
  });
}
```

```css
.filter-pill.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #ccc;
  color: #999;
}
```

---

### C5 — Unit sidebar width too narrow — titles truncate

**Problem:**  
`UNIT 01 — Core Mo...` truncates on both course pages. The sidebar is too narrow for the unit names being used.

**Fix:**

```css
.units-panel {
  width: 300px;          /* increase from current ~240px */
  min-width: 280px;
  flex-shrink: 0;
}

.unit-item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;      /* increase with panel */
}
```

Also add a `title` attribute in the rendered HTML so the full name appears on hover:

```javascript
// In your unit nav render loop
`<div class="unit-item" data-unit-id="${unit.id}" title="${unit.title}">
  ${unit.title}
</div>`
```

---

### C6 — Redundant module count at bottom of units panel

**Problem:**  
`0 / 14 modules · 0%` appears at the bottom of the units panel. This exact information is already shown as `0/14` badges on each unit row above it. The duplication adds clutter without adding information.

**Fix:**  
Remove the bottom summary line entirely, or replace it with something genuinely different — such as estimated total study time:

```html
<!-- Remove this -->
<div class="units-footer">0 / 14 modules · 0%</div>

<!-- Or replace with something additive -->
<div class="units-footer">Est. ~4 hrs total</div>
```

---

### C7 — No primary call-to-action in course header

**Problem:**  
A student lands on the course page and sees the title, description, and a 0% progress bar. There is no `Start Course` or `Begin Unit 1` button. Students don't know what to click to begin.

**Fix:**  
Add a primary CTA in the course header card that changes based on progress state:

```javascript
function renderHeaderCTA(progress, firstIncompleteModule) {
  if (progress === 0) {
    return `<a href="#modules-panel" class="btn btn-primary" onclick="startCourse()">
              Start Course →
            </a>`;
  } else {
    return `<a href="#module-${firstIncompleteModule.id}" class="btn btn-primary">
              Continue: ${firstIncompleteModule.title} →
            </a>`;
  }
}
```

```css
.course-header-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
}
```

---

### C8 — Two panels don't align vertically

**Problem:**  
The modules panel is much taller than the units panel, so the two panels end at different heights. Below the shorter units panel there is raw background — it looks like a layout accident.

**Fix:**

```css
.course-body {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.25rem;
  align-items: start;    /* panels start at the same top line */
}

/* Units panel stretches to fill if modules panel is tall */
.units-panel {
  position: sticky;
  top: 1.5rem;           /* sticks while user scrolls the modules panel */
}
```

---

### C9 — No breadcrumb / back navigation

**Problem:**  
The only way back to the dashboard from a course page is via the `Dashboard` nav link. There is no breadcrumb trail, no back arrow, and no visual indication of where you are in the site hierarchy.

**Fix:**

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <a href="student-dashboard.html">Dashboard</a>
  <span class="breadcrumb-sep">›</span>
  <span class="breadcrumb-current">Network Foundations - Cabling & Infrastructure</span>
</nav>
```

```css
.breadcrumb {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.breadcrumb a { color: #2d7d6f; text-decoration: none; }
.breadcrumb-sep { color: #ccc; }
.breadcrumb-current { color: #444; font-weight: 500; }
```

---

## SECTION D — Global / Cross-cutting

---

### D1 — Monospace label sizes are inconsistent

**Problem:**  
Labels like `COURSE PROGRESS`, `PORT 01`, `UNITS` use a monospace uppercase style — a good technical design choice — but their sizes vary between screens with no clear typographic scale.

**Fix — Define a consistent label scale:**

```css
/* Small label — used for UNITS, COURSE PROGRESS, PORT labels */
.label-sm {
  font-family: 'Courier New', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #888;
}

/* Medium label — used for PORT 01 badge, section headings */
.label-md {
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #555;
}
```

---

### D2 — Large empty white space at page bottom on course pages

**Problem:**  
On both course pages, there is significant empty space below the units + modules panels before the footer. The content doesn't fill the viewport and the page feels incomplete.

**Fix:**  
Give the page layout a minimum height and let the panels fill it:

```css
.page-wrapper {
  min-height: calc(100vh - 120px);  /* subtract nav + footer height */
  display: flex;
  flex-direction: column;
}

.course-body {
  flex-grow: 1;   /* fills remaining vertical space */
}
```

---

## MASTER FIX PRIORITY LIST

| # | Section | Issue | Priority |
|---|---|---|---|
| A1 | Nav | Inconsistent navbar structure across pages | 🔴 Critical |
| B5 | Dashboard | Orange overloaded — 6 semantic roles | 🔴 Critical |
| C7 | Course | No Start Course / Continue CTA | 🔴 Critical |
| A2 | Nav | STUDENT badge too dominant | 🟠 High |
| B1 | Dashboard | Dead space in overall progress card | 🟠 High |
| B2 | Dashboard | Course cards unequal height | 🟠 High |
| B6 | Dashboard | Achievement badges look identical | 🟠 High |
| C1 | Course | Progress bar invisible at 0% | 🟠 High |
| C4 | Course | Filter pills inconsistent between courses | 🟠 High |
| A3 | Nav | Full course names too long as nav links | 🟡 Medium |
| A4 | Nav | Give Feedback in primary nav | 🟡 Medium |
| B3 | Dashboard | Unit title truncates in dashboard cards | 🟡 Medium |
| B4 | Dashboard | Access expiry date buried | 🟡 Medium |
| B7 | Dashboard | Subtitle link-coloured non-interactive words | 🟡 Medium |
| C2 | Course | PORT badge has no colour identity | 🟡 Medium |
| C3 | Course | Multicolour stripe unexplained | 🟡 Medium |
| C5 | Course | Unit sidebar too narrow — truncation | 🟡 Medium |
| C8 | Course | Two panels don't align vertically | 🟡 Medium |
| C9 | Course | No breadcrumb / back navigation | 🟡 Medium |
| D1 | Global | Monospace label sizes inconsistent | 🟢 Low |
| C6 | Course | Redundant module count at sidebar bottom | 🟢 Low |
| D2 | Global | Empty whitespace at page bottom | 🟢 Low |
