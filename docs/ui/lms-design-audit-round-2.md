# LMS Design Audit — Round 2
**Screen:** Student Dashboard (updated version)  
**Date:** August 2026  
**Context:** Follow-up audit after Round 1 fixes were applied  
**Issues found this round:** 7

---

## Status from Round 1

| Issue | Status |
|---|---|
| Navbar inconsistency across pages | ✅ Fixed |
| Short PORT labels in nav | ✅ Fixed |
| STUDENT badge too dominant | ✅ Fixed |
| Overall progress card dead space | ✅ Fixed |
| Access expiry date buried | ✅ Fixed |
| Unit title truncation in cards | ✅ Fixed |
| IN PROGRESS badge colour (was orange, now teal) | ✅ Fixed |
| Course card heights | ✅ Improved |
| Orange on non-interactive text | ⚠️ Not fixed |
| Achievement badge differentiation | ⚠️ Not fixed |
| Progress bars invisible at 0% | ⚠️ Not fixed |

---

## Issue 01 — Orange text on non-interactive body text

**Screen:** Dashboard — subtitle and course card descriptions  
**Priority:** 🔴 High

**Problem:**  
Non-clickable words are highlighted orange throughout the page:

- Subtitle: *"every module"*, *"final quizzes"*, *"certificate"*, *"progress saves"*
- PORT 01 card description: *"termination standards"*, *"T568A/B"*, *"structured cabling"*
- PORT 02 card description: *"addressing, switching and routing"*, *"troubleshooting"*
- Achievements subtitle: *"modules"*, *"quizzes"*

These words have orange colour applied as if they are hyperlinks but they do not navigate anywhere. This is a broken affordance — it trains students to click text that does nothing.

**Fix:**  
Remove all colour from non-anchor body text. Only `<a>` tags should carry colour:

```css
/* Remove per-word highlights from subtitles and descriptions */
.page-subtitle,
.card-description,
.section-subtitle {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Only colour text that is an actual link */
.page-subtitle a,
.card-description a,
.section-subtitle a {
  color: #2d7d6f;
  text-decoration: underline;
}
```

**If the highlights are added via JS or a markdown parser**, find where the colouring is applied and restrict it to anchor tags only:

```javascript
// If using innerHTML with highlight spans, remove the span wrappers
// Replace:
//   <span class="highlight">every module</span>
// With:
//   every module

// Or if using a markdown parser, disable inline styling on plain text tokens
```

---

## Issue 02 — Achievement badges visually identical (earned vs unearned)

**Screen:** Dashboard — Achievements section  
**Priority:** 🔴 High

**Problem:**  
All 8 achievement badges render as identical grey squares with grey icons and grey text. There is zero visual distinction between earned and unearned badges. The only indication is the small text `0 of 8 badges earned` above the grid — but the grid itself gives no confirmation of status. Students cannot tell which badges they are working towards vs which they have already earned.

**Fix:**  
Apply two distinct visual states — full colour with a teal glow for earned, heavy greyscale with reduced opacity for unearned:

```css
/* Base card */
.badge-card {
  border: 1px solid #ddd9d3;
  border-radius: 10px;
  padding: 1rem 0.75rem;
  text-align: center;
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
}

/* Unearned — greyed out, clearly locked */
.badge-card.locked {
  opacity: 0.4;
  filter: grayscale(1);
  cursor: default;
}

/* Earned — colour, glow, slight lift */
.badge-card.earned {
  border-color: #2d7d6f;
  box-shadow: 0 0 0 3px rgba(45, 125, 111, 0.12);
  background: #f5fbfa;
}

.badge-card.earned .badge-icon {
  color: #2d7d6f;
  filter: none;
}

.badge-card.earned .badge-name {
  color: #1a1a1a;
  font-weight: 600;
}

/* Hover only on earned badges */
.badge-card.earned:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 125, 111, 0.18);
}
```

**Apply class via JS when rendering badges:**

```javascript
function renderBadge(badge, isEarned) {
  return `
    <div class="badge-card ${isEarned ? 'earned' : 'locked'}"
         title="${isEarned ? 'Earned!' : 'Not yet earned'}">
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-desc">${badge.description}</div>
      ${isEarned ? '<div class="badge-earned-label">✓ Earned</div>' : ''}
    </div>
  `;
}
```

```css
/* Small earned tick label */
.badge-earned-label {
  margin-top: 6px;
  font-size: 0.7rem;
  color: #2d7d6f;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

---

## Issue 03 — PORT 01 badge background too saturated (pink/salmon)

**Screen:** Dashboard — PORT 1 course card header  
**Priority:** 🟠 Medium

**Problem:**  
The PORT 1 badge has a salmon/pink background that reads as a warning or error state rather than a neutral colour label. Against the white card background it is too saturated and visually heavy. PORT 2 badge by contrast looks clean and appropriate.

**Fix:**  
Reduce the background tint to near-white. The border and text colour carry the identity — the background should barely be there:

```css
/* PORT 01 — orange identity, very faint background */
.port-badge.port-01 {
  border: 1px solid #c0601a;
  color: #c0601a;
  background: #fffaf7;        /* near-white tint, not salmon */
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
}

/* PORT 02 — green identity (keep as is, already correct) */
.port-badge.port-02 {
  border: 1px solid #2d6e2d;
  color: #2d6e2d;
  background: #f8fdf8;
  /* same sizing as above */
}
```

---

## Issue 04 — Progress bars invisible at 0% on course cards

**Screen:** Dashboard — PORT 01 course card  
**Priority:** 🟠 Medium

**Problem:**  
The PORT 01 progress bar (0% complete) renders as a near-invisible hairline. The track background has no visible colour so at 0% fill there is nothing to see. It looks like a missing element or a CSS rendering bug rather than an empty progress state.

PORT 02 (50% complete) looks correct because it has an orange fill — the problem only becomes visible when a course hasn't been started.

**Fix:**

```css
/* Progress track — always visible regardless of fill */
.progress-track {
  width: 100%;
  height: 8px;
  background-color: #d8d4ce;     /* clearly visible empty track */
  border-radius: 4px;
  overflow: hidden;
  margin: 6px 0 4px;
}

/* Progress fill */
.progress-fill {
  height: 100%;
  border-radius: 4px;
  background-color: #c0601a;     /* orange fill — consistent with PORT colour */
  transition: width 0.4s ease;
  min-width: 0;                  /* 0% shows nothing — track is the fallback */
}

/* Teal fill variant for overall/system progress */
.progress-fill.teal {
  background-color: #2d7d6f;
}
```

**Also update the percentage label so 0% doesn't just show a blank number:**

```javascript
function renderProgressLabel(pct) {
  if (pct === 0) return `<span class="progress-pct muted">Not started</span>`;
  if (pct === 100) return `<span class="progress-pct complete">✓ Complete</span>`;
  return `<span class="progress-pct">${pct}%</span>`;
}
```

```css
.progress-pct { font-size: 0.78rem; font-weight: 600; color: #444; }
.progress-pct.muted { color: #999; font-weight: 400; }
.progress-pct.complete { color: #2d7d6f; }
```

---

## Issue 05 — Overall progress bar in top card also invisible

**Screen:** Dashboard — overall progress card  
**Priority:** 🟠 Medium

**Problem:**  
The `0%` teal circle in the overall progress card is clear and well-designed. However the horizontal bar that follows it has the same invisible-at-zero-percent problem as the course card bars. The bar simply disappears at 0%.

**Fix:**  
Same track fix as Issue 04, applied to the overall progress bar:

```css
.overall-progress-bar .progress-track {
  background-color: #d8d4ce;
  height: 8px;
  border-radius: 4px;
}

.overall-progress-bar .progress-fill {
  background: linear-gradient(90deg, #2d7d6f, #3a9688);  /* teal gradient for overall */
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}
```

The teal gradient distinguishes the overall bar from the per-course orange bars, which is a useful visual hierarchy signal.

---

## Issue 06 — Nav right side is crowded — no visual grouping

**Screen:** All pages — navbar right side  
**Priority:** 🟡 Low-Medium

**Problem:**  
`RahnV | STUDENT | Log out` on the right of the nav sit too close together with no visual separation between the identity group (`RahnV`, `STUDENT` badge) and the action link (`Log out`). They read as one undifferentiated cluster.

**Fix:**  
Add a vertical separator before Log out, and ensure adequate gap within the identity group:

```css
.nav-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-username {
  font-size: 0.85rem;
  color: #444;
  font-weight: 500;
}

/* Separator before Log out */
.nav-logout {
  padding-left: 0.75rem;
  border-left: 1px solid #d0ccc6;
  font-size: 0.85rem;
  color: #666;
  text-decoration: none;
}

.nav-logout:hover { color: #b91c1c; }   /* red on hover — destructive action */
```

```html
<div class="nav-profile">
  <span class="nav-username">RahnV</span>
  <span class="role-badge">STUDENT</span>
  <a href="#" class="nav-logout" onclick="signOut()">Log out</a>
</div>
```

---

## Issue 07 — Colour stripe still unexplained

**Screen:** All pages — top of page stripe  
**Priority:** 🟡 Low-Medium

**Problem:**  
The two-segment coloured stripe (now green + teal) at the very top of the page is visually interesting but unexplained. Students see two coloured bars with no label or tooltip indicating what they represent. If they are meant to show per-course progress, they need to communicate that.

**Fix — Option A (Minimal): Add hover tooltips**

```html
<div class="course-stripe">
  <div class="stripe-segment port-01"
       style="width: 50%"
       title="PORT 01 — Network Foundations: 0% complete"
       aria-label="PORT 01 progress: 0%">
  </div>
  <div class="stripe-segment port-02"
       style="width: 50%"
       title="PORT 02 — Network Operations: 50% complete"
       aria-label="PORT 02 progress: 50%">
  </div>
</div>
```

**Fix — Option B (Better): Add labels below the stripe**

```html
<div class="stripe-with-labels">
  <div class="course-stripe">
    <div class="stripe-segment port-01" style="width:50%"></div>
    <div class="stripe-segment port-02" style="width:50%"></div>
  </div>
  <div class="stripe-labels">
    <span class="stripe-label port-01-label">PORT 01 · 0%</span>
    <span class="stripe-label port-02-label">PORT 02 · 50%</span>
  </div>
</div>
```

```css
.stripe-with-labels { margin-bottom: 1.5rem; }

.course-stripe {
  display: flex;
  height: 5px;
  gap: 2px;
}

.stripe-segment { border-radius: 2px; transition: width 0.5s ease; }
.stripe-segment.port-01 { background: #c0601a; }
.stripe-segment.port-02 { background: #2d7d6f; }

.stripe-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}

.stripe-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #888;
  font-family: 'Courier New', monospace;
}

.stripe-label.port-01-label { color: #c0601a; }
.stripe-label.port-02-label { color: #2d7d6f; }
```

---

## Round 2 Summary

| # | Issue | Priority | Fix Location |
|---|---|---|---|
| 01 | Orange on non-interactive text | 🔴 High | CSS — remove colour from non-anchor text |
| 02 | Achievement badges identical | 🔴 High | CSS + JS — earned/locked class states |
| 03 | PORT 01 badge too saturated | 🟠 Medium | CSS — reduce background to near-white |
| 04 | Course card progress bars invisible at 0% | 🟠 Medium | CSS — visible track background |
| 05 | Overall progress bar invisible at 0% | 🟠 Medium | CSS — same track fix |
| 06 | Nav right side crowded | 🟡 Low-Medium | CSS — separator + spacing |
| 07 | Colour stripe unexplained | 🟡 Low-Medium | HTML + CSS — tooltips or stripe labels |

**Recommended order:** Fix 01 first (it affects every paragraph on the page), then 02 (high visual impact), then 04 + 05 together (same fix pattern), then 03, 06, 07.
