# Step 7 — Interactive Content Strategy

## Philosophy

Rather than static PDFs or passive videos, your courses will use **interactive, browser-based modules** that:

- Engage students actively (clicking, dragging, solving, deciding)
- Track progress and time-spent automatically
- Provide immediate feedback
- Store outcomes in Supabase for instructor review

This approach:
- Keeps content lightweight (no 500MB video files)
- Works offline or with slow connections (everything in HTML/JS)
- Scales easily (add new modules by copying patterns)
- Gives you data on what students struggle with

---

## Storage Model

### Database (Supabase PostgreSQL - 500MB)
Stores **only metadata and progress tracking**:
- `modules` — course structure (title, description, type, URLs)
- `module_completions` — student progress per module
- `quiz_responses` — quiz answers (for grading/review)
- `scenario_outcomes` — branching decisions students made

**No files stored in the database** — just text/numbers (URLs, scores, timestamps).

### File Storage (Supabase Storage - 1GB free)
For static assets:
- Module images/diagrams
- Downloaded PDFs (study guides, reference sheets)
- Audio clips (pronunciation guides, clips)

Linked from `modules` table via URL.

### External Services (Free)
- **YouTube (unlisted)** — video lectures (unlimited)
- **GitHub Pages** — the site itself (free)

---

## Content Types

### Type 1: Quiz & Game Modules
**What:** Flash cards, multiple-choice quizzes, timed challenges

**How it works:**
- Load questions from a `quiz_questions` table
- Student selects answer
- Immediate feedback (✓ correct, ✗ explanation)
- Score saved to `module_completions`
- Can retry unlimited times

**Tech:** Vanilla HTML/JS, no external libraries needed

**Storage:** Database only stores score + timestamp (tiny)

---

### Type 2: Interactive Simulators
**What:** Drag-and-drop cable simulator, subnetting calculator, packet visualizer

**How it works:**
- User interacts with visual interface (drag wires, enter IPs, etc.)
- Real-time validation and feedback
- Optional: save a "snapshot" of their work to the database
- Progress: "Completed" when they solve it correctly

**Tech:** HTML5 canvas, SVG, drag-drop API, or a charting library (Chart.js, D3.js)

**Storage:** Database only stores completion status + time-spent (optional: save their final configuration as JSON)

---

### Type 3: Branching Scenarios
**What:** Story-based troubleshooting ("Your network is down — debug it")

**How it works:**
- Present a problem situation
- Student makes a choice (A, B, or C)
- Choice branches to new scenario (correct path fixes issue, wrong path shows consequence + learning)
- At the end, store the decision path (which choices they made)
- Instructor can review decision trees per student

**Tech:** HTML + vanilla JS with conditional rendering, or a library like Twine (embeddable in HTML)

**Storage:** Database stores the path they took (e.g., `["diagnosed_connectivity", "checked_cables", "reconfigured_interface"]`)

---

## Module Lifecycle

### Creating a New Module

1. **Plan the interaction** — what does the student do? (quiz, build, decide, etc.)
2. **Create HTML file** — (e.g., `modules/cabling-termination-simulator.html`)
3. **Add to `modules` table** — insert row with title, description, content_url
4. **Wire auth guard** — module pages load `auth-guard.js` to check login/approval
5. **Track progress** — module JS calls `markModuleComplete(moduleId)` when student finishes
6. **Test locally** — open HTML file, check it renders and tracks progress
7. **Deploy** — push to GitHub Pages

### Progress Tracking Flow

```
Student opens module HTML
    ↓
auth-guard.js checks login + approval
    ↓
Module loads questions/simulator/scenario from database (or embedded JSON)
    ↓
Student interacts (answers quiz, builds cable termination, makes choices)
    ↓
Module validates (✓ or ✗ feedback)
    ↓
Student completes task
    ↓
Module calls: markModuleComplete(moduleId, progressPercent, timeSpent)
    ↓
Supabase stores in module_completions table
    ↓
Student dashboard / instructor dashboard shows progress
```

---

## Design Decisions

### Why not use a video?
- Video files are huge (100MB–1GB per hour)
- Hits your 500MB database limit immediately
- Requires streaming infrastructure
- Students can't interact or test knowledge in real-time

**Better:** Short text explanation + interactive simulator so they *do* the thing they're learning.

### Why not PDFs?
- PDFs are static (no interaction)
- Don't track what students read or understood
- Take up storage

**Better:** Embed key info in the interactive module itself (text + visuals + action).

### Why store decision trees / quiz answers?
- **For grading:** see which students got a particular question wrong
- **For improvement:** identify confusing scenarios or weak topics
- **For review:** students can see their own path ("I took 3 tries to solve this")
- **For analytics:** identify which branching paths students tend to take (suggests what's unclear)

---

## Next Steps

- **Step 8** — Quiz & Game modules (implementation guide)
- **Step 9** — Simulator modules (cable termination, subnetting calc)
- **Step 10** — Branching scenarios (troubleshooting game)
- **Step 11** — Database schema updates needed

---

## Checklist for This Step

- [ ] Understand the storage model (database = metadata only, files = external)
- [ ] Reviewed the three content types (quiz, simulator, scenario)
- [ ] Understand the progress tracking flow
- [ ] Decided which type to build first (recommended: quiz, then simulator)

---

## Quick Reference: Storage Limits

| Storage Type | Limit | What it's for | Cost if over |
|---|---|---|---|
| Supabase Database | 500MB | metadata, progress, quiz answers | $5/mo per 1GB |
| Supabase Storage | 1GB | module images, PDFs, supplementary materials | $5/mo per 100GB |
| Bandwidth | 5GB/mo | data transfer to students | $0.12/GB after |
| YouTube | Unlimited | video lectures (host on your channel) | Free |
| GitHub Pages | Unlimited | the site itself | Free |

**Strategy:** Keep database lean, use external storage for files, use YouTube for video.
