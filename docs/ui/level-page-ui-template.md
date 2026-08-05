# Cable&Net Courses — Level Page UI Template

> **Three-in-one file:**
> 1. **Blueprint** — describes every UI element a developer needs to build the Level page
> 2. **Content template** — fill in the YAML blocks to define a new Level's modules
> 3. **Claude prompt spec** — paste this file (with content filled in) when asking Claude to generate the HTML

---

## 1. UI Concept Mapping

This table maps the reference design (Ellipsis CMS, Image 1) to the Cable&Net target layout (Image 2).

| Ellipsis CMS element | Cable&Net equivalent | Notes |
|---|---|---|
| Breadcrumb nav bar | Top nav: `Dashboard › Level X › ...` | Same hierarchical role |
| Lesson header (title, duration, tag) | Level page header (level number + title) | Cable&Net shows level number separately above title |
| "In This Lesson" sidebar tabs | Filter tab bar (`ALL / LESSONS / VIDEOS / PDFS / TOOLS / ARTICLES`) | Horizontal tabs replace vertical sidebar |
| Procedure 1, Procedure 2 … | **Core Lessons** section — numbered MOD cards | Sequential, instructional |
| Materials & Resources sidebar | **Resources & Extras** section | Supplementary / non-sequential |
| Resource type tags on items | Type badge on each card (`VIDEO`, `PDF`, `TOOL` …) | Colour-coded pill |
| Collapsible section headers | Section divider labels (`CORE LESSONS` / `RESOURCES & EXTRAS`) | Always visible; no collapse needed |
| Standards panel | _(not present in Cable&Net)_ | Omit |
| Teacher Preparation section | _(instructor-only; not in student view)_ | Omit from student-facing page |
| Download / open-external icons | Action buttons: play, download, open, bookmark, info | Per-card icon row at the bottom |

---

## 2. Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP NAV: Dashboard  ›  Level 2  ›  Cabling & Troubleshooting   │
│           [Log out]                                             │
├─────────────────────────────────────────────────────────────────┤
│  PORT 80                        ← optional context label        │
│  Level 1 — Network Foundations: Cabling & Infrastructure        │
│                                                                 │
│  [ALL] [LESSONS] [VIDEOS] [PDFS] [TOOLS] [ARTICLES]            │
│                              ← filter tab bar                   │
├─────────────────────────────────────────────────────────────────┤
│  ── CORE LESSONS ────────────────────────────────────────────── │
│  [card][card][card]                                             │
│  [card][card][card]                                             │
│  [card][card][card]                                             │
├─────────────────────────────────────────────────────────────────┤
│  ── RESOURCES & EXTRAS ──────────────────────────────────────── │
│  [card][card][card]                                             │
│  [card][card]                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2a. Page Header fields

| Field | Example | Notes |
|---|---|---|
| `context_label` | `PORT 80` | Optional label above the title (port, topic tag, etc.) |
| `level_number` | `Level 1` | Displayed above the title |
| `level_title` | `Network Foundations: Cabling & Infrastructure` | Main heading |
| `filter_tabs` | `[ALL, LESSONS, VIDEOS, PDFS, TOOLS, ARTICLES]` | Include only tabs for types that exist in this level |

---

## 3. Module Card — Fields

Every card in both sections uses these fields.

```yaml
module_number : "MOD 01"       # Zero-padded. Core Lessons start at 01.
                               # Resources & Extras continue or use a defined offset (e.g. MOD 10+).
section       : CORE LESSONS   # CORE LESSONS | RESOURCES & EXTRAS
type_badge    : LESSON         # See §4a — controls the colour pill shown top-right of card
status_badge  : UNLOCK         # See §4b — controls the CTA button at the bottom of card
title         : ""             # Short, action-oriented heading (≤ 60 chars recommended)
description   : ""             # 1–2 sentences shown on the card face
duration      : ""             # e.g. "30 mins". Leave blank if not applicable (PDFs, Tools).
action_buttons: [play, bookmark, info]   # See §4c — icon row at card bottom-right
```

---

## 4. Field Reference

### 4a. `type_badge` — Content type

| Value | Colour (suggested) | Typical use |
|---|---|---|
| `LESSON` | No badge / neutral | Main instructional module |
| `VIDEO` | Orange | Demo or tutorial video |
| `PDF` | Red | Downloadable reference document or handout |
| `TOOL` | Teal / Blue | Interactive quiz, calculator, or embedded app |
| `ARTICLE` | Green | Written reference or required reading |
| `QUIZ` | Purple | Standalone graded or self-check assessment |
| `LINK` | Grey | External resource (opens in new tab) |

> **Filter tab mapping:** Each `type_badge` value maps to a filter tab.
> `LESSON` cards are shown under the `LESSONS` tab; all others match their own tab name.

---

### 4b. `status_badge` — Student progress state

| Value | Displayed as | Meaning |
|---|---|---|
| `UNLOCK` | Green button · "UNLOCK" | Available — student can open it |
| `IN PROGRESS` | Amber button · "IN PROGRESS" | Started but not yet finished |
| `MARK COMPLETE` | Blue button · "MARK COMPLETE" | Finished — tap to mark done |
| `LOCKED` | Grey button · "LOCKED" | Not yet available (prerequisite not met) |
| `COMING SOON` | Grey pill · "COMING SOON" | Placeholder — content not yet published |

> **Rule:** A card with `COMING SOON` should have no action buttons.
> A card with `LOCKED` shows the info button only.

---

### 4c. `action_buttons` — Icon row

| Button key | Icon | When to include |
|---|---|---|
| `play` | ▶ Play | VIDEO, LESSON |
| `download` | ↓ Download | PDF |
| `open` | ↗ Open | TOOL, LINK, ARTICLE, QUIZ |
| `bookmark` | 🔖 Bookmark | All cards (except COMING SOON) |
| `info` | ℹ Info | All cards |

---

## 5. Full Page Template (fill in to create a Level)

Copy this block, fill in every field, then use it as input to generate the HTML page.

```yaml
# ═══════════════════════════════════════════════
# LEVEL PAGE DEFINITION
# ═══════════════════════════════════════════════

page:
  context_label : ""              # e.g. "PORT 80" — leave blank to hide
  level_number  : "Level 1"
  level_title   : "Network Foundations: Cabling & Infrastructure"
  filter_tabs   : [ALL, LESSONS, VIDEOS, PDFS, TOOLS, ARTICLES]
  # Remove a tab type if no cards of that type exist in this level.


# ───────────────────────────────────────────────
# CORE LESSONS
# Numbered, sequential instructional modules.
# ───────────────────────────────────────────────

core_lessons:

  - module_number : "MOD 01"
    section       : CORE LESSONS
    type_badge    : LESSON
    status_badge  : MARK COMPLETE
    title         : "OSI Model & Network Topologies"
    description   : "Name and describe the 7 layers of the OSI model."
    duration      : "30 mins"
    action_buttons: [play, bookmark, info]

  - module_number : "MOD 02"
    section       : CORE LESSONS
    type_badge    : LESSON
    status_badge  : MARK COMPLETE
    title         : "Cabling Standards & Cable Types"
    description   : "Distinguish Cat5e, Cat6, and Cat6a cable specifications."
    duration      : "30 mins"
    action_buttons: [play, bookmark, info]

  - module_number : "MOD 03"
    section       : CORE LESSONS
    type_badge    : LESSON
    status_badge  : UNLOCK
    title         : "RJ45 Connectors & Wiring Standards"
    description   : "Identify the pins of an RJ45 connector and their purpose."
    duration      : "30 mins"
    action_buttons: [play, bookmark, info]

  # … duplicate and fill for MOD 04, 05, etc.


# ───────────────────────────────────────────────
# RESOURCES & EXTRAS
# Supplementary materials — demos, tools, references.
# Module numbers continue from Core Lessons (or use offset e.g. MOD 10+).
# ───────────────────────────────────────────────

resources_and_extras:

  - module_number : "MOD 10"
    section       : RESOURCES & EXTRAS
    type_badge    : VIDEO
    status_badge  : UNLOCK
    title         : "Make Your Own Ethernet Cables"
    description   : "Step-by-step guide to crimping your own Cat6 patch cable."
    duration      : "12 mins"
    action_buttons: [play, bookmark, info]

  - module_number : "MOD 11"
    section       : RESOURCES & EXTRAS
    type_badge    : VIDEO
    status_badge  : UNLOCK
    title         : "[Demo] Cable Crimping — Video"
    description   : "Sample video module — replace this URL with your real hosted video."
    duration      : ""
    action_buttons: [play, bookmark, info]

  - module_number : "MOD 12"
    section       : RESOURCES & EXTRAS
    type_badge    : PDF
    status_badge  : UNLOCK
    title         : "[Demo] Structured Cabling PDF"
    description   : "Sample PDF module — replace the URL with your real handout."
    duration      : ""
    action_buttons: [download, bookmark, info]

  - module_number : "MOD 13"
    section       : RESOURCES & EXTRAS
    type_badge    : TOOL
    status_badge  : UNLOCK
    title         : "[Demo] Practice Quiz Tool"
    description   : "Sample interactive module — an in-page tool embedded in the module."
    duration      : ""
    action_buttons: [open, bookmark, info]

  - module_number : "MOD 14"
    section       : RESOURCES & EXTRAS
    type_badge    : ARTICLE
    status_badge  : UNLOCK
    title         : "[Demo] Networking Article"
    description   : "Sample article module — fetched and rendered inline."
    duration      : ""
    action_buttons: [open, bookmark, info]

  # … add more resource cards as needed
```

---

## 6. Authoring Notes

| Rule | Detail |
|---|---|
| **`[Demo]` prefix** | Flag any placeholder card that still needs real content with `[Demo]` in the title. Remove the prefix before publishing. |
| **Module numbering** | Core Lessons run 01 → N sequentially. Resources & Extras restart at a fixed offset (e.g. 10, 20) so there's room to add Core lessons later without renumbering Resources. |
| **Duration field** | Omit (leave blank `""`) for PDFs, articles, and tools where time-on-task is not meaningful. |
| **Filter tabs** | Only list tab types that have at least one card. A `LESSONS` tab with zero LESSON cards should be removed. |
| **COMING SOON cards** | Set `action_buttons: []` and `duration: ""`. The card still needs `module_number`, `title`, and `description` so the slot is visible in the grid. |
| **LOCKED cards** | Set `action_buttons: [info]` only. The status button itself is greyed out and non-interactive. |

---

## 7. Claude Prompt — Generating the HTML Page

Once this file is filled in, paste it into a new Claude chat with this instruction:

```
Using the Level Page UI Template below, generate a single self-contained HTML file
that matches the Cable&Net Courses card-grid layout.

Requirements:
- Match the existing site palette (cream/off-white background, dark nav, green CTA buttons,
  colour-coded type badges as defined in §4a of the template).
- Render the page header (context label, level number, level title, filter tab bar).
- Render Core Lessons and Resources & Extras as separate labelled grid sections.
- Each card must show: module number, type badge, title, description, duration (if set),
  status badge button, and action icon buttons.
- Filter tabs must show/hide cards by type_badge on click.
- Cards with status COMING SOON have no action buttons.
- Cards with status LOCKED show only the info button.
- Output a single .html file with all CSS and JS inline.

[PASTE FILLED-IN YAML FROM SECTION 5 HERE]
```

---

*Template version 1.0 — Cable&Net Courses project*
