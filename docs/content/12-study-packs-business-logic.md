# Step 12 — Downloadable Interactive Study Packs

## Business Logic & System Design

---

## Overview

**Interactive Study Packs** are self-contained HTML files that students download and use locally. Each pack contains:
- **Study notes** with text, images, diagrams
- **Embedded quiz** with immediate feedback
- **Progress tracking** (local + cloud sync)

**Goal:** Enable offline learning in lab environments while maintaining progress tracking when online.

---

## User Workflows

### Workflow 1: Download & Study Offline

```
1. Student goes to course page
   ↓
2. Sees module: "Cable Termination — Study Pack"
   ↓
3. Clicks "📥 Download Study Pack"
   ↓
4. Browser downloads: cable-termination-study-pack.html (single file, ~300KB)
   ↓
5. Student disconnects from internet / goes to lab without WiFi
   ↓
6. Opens the HTML file locally (double-click on desktop or upload to lab computer)
   ↓
7. Reads study notes (offline, no internet needed)
   ↓
8. Takes quiz (offline, quiz engine runs locally)
   ↓
9. Quiz calculates score, stores in browser localStorage
   ↓
10. Student comes back online (or returns to classroom WiFi)
   ↓
11. Opens website → goes to module → clicks "Save Progress to Cloud"
   ↓
12. Quiz score syncs to Supabase (saved to quiz_scores table)
   ↓
13. Dashboard shows: "Cable Termination: 85% ✓"
```

### Workflow 2: Study Online (No Download)

```
1. Student goes to course page
   ↓
2. Clicks "🔗 View Online"
   ↓
3. Loads the study pack in browser tab (or in an iframe on the course page)
   ↓
4. Studies + takes quiz online
   ↓
5. Quiz auto-saves to Supabase immediately
   ↓
6. Dashboard updates in real-time
```

### Workflow 3: Retake a Study Pack

```
1. Student previously took cable-termination-study-pack
2. Wants to retake it to improve score
   ↓
3. Downloads file again (or has old copy)
   ↓
4. Takes quiz again
   ↓
5. New score syncs to cloud
   ↓
6. Dashboard shows best attempt: "85% (retaken x3)"
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (Cloud)                       │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ quiz_questions   │  │ quiz_scores      │            │
│  │ (study pack data)│  │ (progress tracking)            │
│  └──────────────────┘  └──────────────────┘            │
│           ▲                      ▲                       │
│           │                      │                       │
│           └──────────────────────┘                       │
│                    (sync)                                │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Download / Sync
                        ▼
┌─────────────────────────────────────────────────────────┐
│           STUDENT DEVICE (Browser/Offline)              │
│                                                          │
│  cable-termination-study-pack.html                      │
│  ├─ Study notes (embedded HTML)                         │
│  ├─ Images (base64 encoded)                             │
│  ├─ Quiz engine (vanilla JS)                            │
│  ├─ Quiz data (embedded JSON)                           │
│  └─ localStorage (stores progress locally)              │
│                                                          │
│  When online: syncs to Supabase                         │
│  When offline: stores in localStorage                   │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Data At Rest (In Study Pack File)

```javascript
// Inside cable-termination-study-pack.html

const studyPackData = {
  moduleId: 'cable-termination',
  title: 'Cable Termination: T568A vs T568B',
  version: '1.0',
  createdAt: '2026-07-31',
  
  // Study notes (text content)
  notes: {
    sections: [
      {
        title: 'Overview',
        content: 'RJ45 connectors require...',
        images: ['<svg>...</svg>', '<img src="data:image/png;base64,...">']
      }
    ]
  },
  
  // Quiz questions (embedded)
  quiz: {
    questions: [
      {
        id: 'q1',
        question: 'What is the first wire in T568B?',
        options: ['Orange-White', 'Green-White', 'Blue-White'],
        correctIndex: 0,
        explanation: 'T568B starts with Orange-White...'
      },
      // More questions...
    ]
  }
};

// Student progress (stored locally during offline session)
const studentProgress = {
  startedAt: '2026-07-31T14:30:00Z',
  questionsAnswered: [
    { questionId: 'q1', selectedIndex: 0, isCorrect: true },
    { questionId: 'q2', selectedIndex: 1, isCorrect: false }
  ],
  score: 85,
  completedAt: '2026-07-31T14:35:00Z',
  syncedToCloud: false // Flag: not yet synced
};
```

### Sync to Supabase (Online)

When student clicks "Save Progress to Cloud":

```sql
-- Student's quiz result synced to database

INSERT INTO public.quiz_scores (
  id,
  user_id,
  module_id,
  best_score,
  attempts,
  best_attempt_number,
  last_attempt_date
) VALUES (
  'uuid-123',
  'user-id-456', -- from auth session
  'cable-termination',
  85, -- their score
  1,
  1,
  '2026-07-31T14:35:00Z'
)
ON CONFLICT (user_id, module_id) DO UPDATE SET
  best_score = GREATEST(best_score, 85),
  attempts = attempts + 1,
  last_attempt_date = NOW();

-- Also insert detailed responses for grading/review

INSERT INTO public.quiz_responses (
  id,
  user_id,
  module_id,
  question_id,
  student_answer,
  is_correct
) VALUES
  ('uuid-1', 'user-456', 'cable-termination', 'q1', 'Orange-White', true),
  ('uuid-2', 'user-456', 'cable-termination', 'q2', 'Green', false);
```

---

## Offline Progress Storage

### localStorage Structure

```javascript
// Browser's localStorage (persists even after tab closes)

localStorage.setItem('study-pack:cable-termination', JSON.stringify({
  moduleId: 'cable-termination',
  sessionId: 'session-xyz123', // unique per attempt
  startedAt: '2026-07-31T14:30:00Z',
  
  // Quiz progress (builds as student answers)
  responses: [
    {
      questionId: 'q1',
      selectedOptionIndex: 0,
      selectedOptionText: 'Orange-White',
      correctOptionIndex: 0,
      isCorrect: true,
      answeredAt: '2026-07-31T14:31:00Z'
    },
    {
      questionId: 'q2',
      selectedOptionIndex: 1,
      selectedOptionText: 'Green',
      correctOptionIndex: 2,
      isCorrect: false,
      answeredAt: '2026-07-31T14:32:00Z'
    }
    // ... more responses as student progresses
  ],
  
  finalScore: 85,
  completedAt: '2026-07-31T14:35:00Z',
  syncedToCloud: false // Flag for next sync attempt
}));
```

### localStorage Actions

**Save progress after each quiz question:**
```javascript
function saveResponseLocally(questionId, selectedIdx) {
  let progress = JSON.parse(
    localStorage.getItem('study-pack:cable-termination') || '{}'
  );
  progress.responses.push({
    questionId,
    selectedOptionIndex: selectedIdx,
    isCorrect: isCorrect(selectedIdx),
    answeredAt: new Date().toISOString()
  });
  localStorage.setItem('study-pack:cable-termination', JSON.stringify(progress));
}
```

**When quiz completes:**
```javascript
function completeQuizOffline() {
  const progress = JSON.parse(
    localStorage.getItem('study-pack:cable-termination')
  );
  progress.finalScore = calculateScore(progress.responses);
  progress.completedAt = new Date().toISOString();
  progress.syncedToCloud = false; // Not synced yet
  localStorage.setItem('study-pack:cable-termination', JSON.stringify(progress));
  
  // Show button: "Save to Cloud" (becomes available when online)
  showSyncButton();
}
```

---

## Online vs Offline Behavior

### Scenario 1: Student Completes Quiz While Online

```
Student is online (has internet)
  ↓
Opens study pack (loads from course page OR from downloaded file)
  ↓
Answers quiz questions
  ↓
Quiz completes → score calculated
  ↓
Auto-sync to Supabase (no user action needed)
  ↓
Dashboard updates immediately
  ↓
Success: "Cable Termination: 85% ✓"
```

**Code:**
```javascript
async function finishQuizOnline() {
  const score = calculateScore(responses);
  
  // Immediately sync to Supabase
  const { error } = await supabaseClient.from('quiz_scores').upsert({
    user_id: currentUser.id,
    module_id: 'cable-termination',
    best_score: score,
    // ...
  });
  
  if (!error) {
    showMessage('Score saved to cloud!');
    // Student sees this immediately
  }
}
```

### Scenario 2: Student Completes Quiz While Offline

```
Student is offline (no internet, lab environment)
  ↓
Opens downloaded study pack
  ↓
Answers quiz questions
  ↓
Quiz completes → score calculated
  ↓
Stores progress in browser's localStorage
  ↓
Shows message: "Progress saved locally. Click 'Save to Cloud' when online."
  ↓
Student returns to WiFi
  ↓
Opens course website → clicks "Sync Progress"
  ↓
localStorage sent to Supabase
  ↓
Dashboard updates
  ↓
Success: "Cable Termination: 85% ✓"
```

**Code:**
```javascript
async function finishQuizOffline() {
  const score = calculateScore(responses);
  
  // Try to sync; if it fails, store locally
  try {
    await supabaseClient.from('quiz_scores').upsert({
      user_id: currentUser.id,
      module_id: 'cable-termination',
      best_score: score
    });
    showMessage('Score saved to cloud!');
  } catch (error) {
    // No internet — save locally instead
    const progress = {
      moduleId: 'cable-termination',
      score: score,
      completedAt: new Date().toISOString(),
      syncedToCloud: false
    };
    localStorage.setItem('study-pack:cable-termination', JSON.stringify(progress));
    showMessage('Saved locally. Sync to cloud when online.');
  }
}

// Later, when online, user clicks "Sync"
async function syncProgressToCloud() {
  const saved = JSON.parse(
    localStorage.getItem('study-pack:cable-termination')
  );
  
  if (!saved.syncedToCloud) {
    await supabaseClient.from('quiz_scores').upsert({
      user_id: currentUser.id,
      module_id: 'cable-termination',
      best_score: saved.score
    });
    saved.syncedToCloud = true;
    localStorage.setItem('study-pack:cable-termination', JSON.stringify(saved));
    showMessage('✓ Synced to cloud!');
  }
}
```

---

## Study Pack File Structure

### What Gets Downloaded

**Single HTML file: `cable-termination-study-pack.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Cable Termination Study Pack</title>
  
  <!-- Embedded styles (no external CSS files) -->
  <style>
    /* All CSS inline, ~10 KB */
  </style>
</head>
<body>

<!-- STUDY NOTES -->
<h1>Cable Termination: T568A vs T568B</h1>
<section class="notes">
  <h2>Overview</h2>
  <p>RJ45 connectors require...</p>
  
  <!-- Embedded images as base64 -->
  <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0i..." alt="RJ45 Connector">
</section>

<!-- QUIZ -->
<section class="quiz">
  <h2>Test Your Knowledge</h2>
  <div id="quiz-container"></div>
</section>

<!-- EMBEDDED DATA (no external files) -->
<script>
  const STUDY_PACK = {
    moduleId: 'cable-termination',
    title: 'Cable Termination Study Pack',
    notes: { /* ... */ },
    quiz: {
      questions: [
        { id: 'q1', question: '...', options: [...], correct: 0 },
        // ...
      ]
    }
  };
</script>

<!-- QUIZ ENGINE (vanilla JS, no external libraries) -->
<script>
  class OfflineQuizEngine {
    constructor(data) { /* ... */ }
    // Methods: render(), selectAnswer(), finish(), saveLocalProgress()
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    window.quizEngine = new OfflineQuizEngine(STUDY_PACK.quiz);
  });
</script>

<!-- SYNC LOGIC (when online) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
<script>
  async function syncToCloud() {
    // Reads progress from localStorage
    // Sends to Supabase if online
  }
</script>

</body>
</html>
```

**File size: ~300-500 KB**
- HTML + embedded images: ~200 KB
- Quiz data: ~30 KB
- Inline CSS/JS: ~50 KB
- Margin: all fits in one file

---

## Checklist

- [x] Understand offline/online flow (when progress is stored locally vs synced)
- [x] Know file structure (single HTML file with embedded data + images)
- [x] Understand data model (study_packs-style single-file pack + `quiz_scores` for progress)
- [x] Know how sync works (localStorage → Supabase when online)
- [x] Ready to implement first study pack

---

## ✅ Build status (implemented 2026-08)

Study packs are **built and live**. See `docs/CURRENT-STATUS.md` §4 and
`docs/content/not-built-roadmap.md` #9 for the shipped scope. Concretely:

| Doc concept | Implementation |
|---|---|
| Single self-contained file | `tools/study-pack-template.html` (offline pack shell: notes + embedded quiz + progress + sync) |
| Pack content source | `tools/build-study-packs.js` — embeds the **same** quiz banks + lesson bundles the online course uses, per module |
| Generated packs | `tools/study-packs/<course>-module-<NN>.html` (modules 1–9, both courses) |
| Entry point | Module card "Study pack → View / download" (`js/load-modules.js`), locked/coming-soon excluded |
| Offline progress | `localStorage['study-pack:<moduleId>']` — responses, finalScore, `syncedToCloud` (this doc's schema) |
| Online sync | Results screen: when online, save best score via `submit_quiz_score` (existing RPC); a downloaded `file://` pack offers an inline course-account sign-in first |
| Retake | "Try Again" starts a fresh attempt; server-best merge is handled by `quiz_scores` `GREATEST(best_score, …)` in `submit_quiz_score` |
| Notes rendering | Markdown → HTML table/list/heading conversion in `build-study-packs.js` (tables, `-`/`1.` lists, `###`, `**bold**`, `` `code` ``) |

**Authoring flow:** edit the quiz bank / lesson bundle markdown → run
`node tools/build-study-packs.js` → commit the regenerated packs.
