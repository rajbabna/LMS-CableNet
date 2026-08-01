# Step 8 — Quiz & Game Modules

## Overview

Quiz modules are the **easiest interactive content to build** and provide **immediate value** — students test their knowledge in real-time, scores get tracked, and you get data on what they're struggling with.

This step covers:
- How quiz modules work
- Database schema for storing questions and answers
- Building a single quiz module (HTML + JS)
- Integrating progress tracking
- Grading and review (instructor side)

---

## How It Works

### Student Experience

1. Opens a module (e.g., "Cable Color Code Quiz")
2. Sees a question with multiple choice answers
3. Clicks an answer
4. Gets immediate feedback:
   - ✓ **Correct** with explanation
   - ✗ **Incorrect** with why, plus the right answer
5. Moves to next question
6. At the end: sees their score (e.g., "8/10 - 80%")
7. Option to **retake** or **move on**
8. Score saved automatically to `module_completions`

### Instructor View

- Dashboard shows who took the quiz and when
- Can see class average (e.g., "average score: 72%")
- Can drill into: which questions were missed most
- Identifies topics students are struggling with

---

## Database Schema

### New Tables Needed

```sql
-- Store quiz questions
CREATE TABLE public.quiz_questions (
  id TEXT PRIMARY KEY,
  module_id TEXT REFERENCES public.modules(id),
  question_number INT,
  question_text TEXT NOT NULL,
  question_type TEXT, -- 'multiple_choice', 'true_false', 'matching'
  correct_answer TEXT NOT NULL,
  explanation TEXT, -- shown after answer
  created_at TIMESTAMP DEFAULT now()
);

-- Store multiple choice options
CREATE TABLE public.quiz_options (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES public.quiz_questions(id),
  option_text TEXT NOT NULL,
  option_order INT, -- controls display order
  created_at TIMESTAMP DEFAULT now()
);

-- Store individual student responses (for grading/review)
CREATE TABLE public.quiz_responses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  module_id TEXT REFERENCES public.modules(id),
  question_id TEXT REFERENCES public.quiz_questions(id),
  student_answer TEXT, -- what they selected
  is_correct BOOLEAN,
  response_time_seconds INT, -- how long they took
  attempt_number INT, -- 1st retake, 2nd retake, etc.
  created_at TIMESTAMP DEFAULT now()
);

-- Aggregated scores (one row per student per module)
-- (This gets populated from quiz_responses)
CREATE TABLE public.quiz_scores (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  module_id TEXT REFERENCES public.modules(id),
  attempts INT, -- how many times they took it
  best_score NUMERIC, -- best attempt score
  best_attempt_number INT,
  last_attempt_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Quiz Module Structure

### File Layout

```
/modules/
  quiz-cable-colors.html     (the quiz page itself)
  /js/
    quiz-engine.js           (generic quiz logic)
    quiz-data-cable-colors.js (questions for this specific quiz)
```

### Anatomy of a Quiz Module HTML

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Standard headers -->
  <meta charset="UTF-8">
  <title>Quiz: Cable Color Codes</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/quiz-styles.css">
</head>
<body>

<!-- Standard auth guard -->
<script src="../js/supabase-client.js"></script>
<script src="../js/auth-guard.js"></script>

<!-- Quiz container -->
<main>
  <div class="quiz-container">
    <div class="quiz-header">
      <h1>Quiz: Cable Color Codes</h1>
      <div class="progress-indicator">
        <span id="currentQuestion">Question 1</span> of <span id="totalQuestions">10</span>
      </div>
    </div>

    <div class="quiz-content" id="quizContent">
      <!-- Populated by quiz-engine.js -->
    </div>

    <div class="quiz-footer">
      <button id="prevBtn" class="btn btn-ghost">← Back</button>
      <button id="nextBtn" class="btn btn-primary">Next →</button>
    </div>
  </div>
</main>

<!-- Load quiz engine and questions -->
<script src="../js/quiz-engine.js"></script>
<script src="../js/quiz-data-cable-colors.js"></script>
<script>
  // Initialize the quiz with the data
  const quiz = new QuizEngine('cable-color-quiz', quizQuestions);
  quiz.init();
</script>

</body>
</html>
```

---

## Quiz Engine (quiz-engine.js)

Core logic that any quiz can use:

```javascript
class QuizEngine {
  constructor(moduleId, questions) {
    this.moduleId = moduleId;
    this.questions = questions;
    this.currentQuestionIndex = 0;
    this.responses = [];
    this.score = 0;
  }

  async init() {
    // Check auth
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return; // auth-guard.js should catch this

    this.userId = user.id;
    this.renderQuestion();
  }

  renderQuestion() {
    const q = this.questions[this.currentQuestionIndex];
    const container = document.getElementById('quizContent');

    container.innerHTML = `
      <div class="question">
        <h2>${q.question_text}</h2>
        <div class="options">
          ${q.options.map((opt, idx) => `
            <label class="option">
              <input type="radio" name="answer" value="${idx}">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    // Bind answer selection
    document.querySelectorAll('input[name="answer"]').forEach(el => {
      el.addEventListener('change', (e) => this.selectAnswer(e.target.value));
    });

    // Update progress
    document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
  }

  selectAnswer(selectedIdx) {
    const q = this.questions[this.currentQuestionIndex];
    const isCorrect = (selectedIdx == q.correctAnswerIndex);

    // Save response
    this.responses.push({
      questionId: q.id,
      studentAnswer: selectedIdx,
      isCorrect: isCorrect,
      timeSpent: Date.now() // simplification
    });

    // Update score
    if (isCorrect) this.score++;

    // Show feedback
    this.showFeedback(isCorrect, q);
  }

  showFeedback(isCorrect, question) {
    const container = document.getElementById('quizContent');
    const feedback = document.createElement('div');
    feedback.className = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
    feedback.innerHTML = `
      <p>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</p>
      <p>${question.explanation}</p>
    `;
    container.appendChild(feedback);

    // Disable further answers
    document.querySelectorAll('input[name="answer"]').forEach(el => el.disabled = true);
  }

  async nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.renderQuestion();
    } else {
      // Quiz finished
      this.finishQuiz();
    }
  }

  async finishQuiz() {
    const percentScore = Math.round((this.score / this.questions.length) * 100);

    // Save to database
    await supabaseClient.from('quiz_scores').insert({
      id: crypto.randomUUID(),
      user_id: this.userId,
      module_id: this.moduleId,
      best_score: percentScore,
      attempts: 1
    });

    // Mark module as complete
    await supabaseClient.from('module_completions').upsert({
      id: this.userId + '-' + this.moduleId,
      user_id: this.userId,
      module_id: this.moduleId,
      status: 'completed',
      completion_percentage: percentScore,
      completed_at: new Date()
    });

    // Show results screen
    const container = document.getElementById('quizContent');
    container.innerHTML = `
      <div class="quiz-results">
        <h2>Quiz Complete!</h2>
        <p>Your score: <strong>${percentScore}%</strong></p>
        <p>${this.score} of ${this.questions.length} correct</p>
        <button onclick="location.href='../student-dashboard.html'" class="btn btn-primary">Back to Dashboard</button>
        <button onclick="location.reload()" class="btn btn-ghost">Retake Quiz</button>
      </div>
    `;
  }
}
```

---

## Quiz Data File (quiz-data-cable-colors.js)

Define questions for a specific quiz:

```javascript
const quizQuestions = [
  {
    id: 'q1',
    question_text: 'What is the correct T568B color order?',
    options: [
      'Orange-White, Orange, Green-White, Blue, Blue-White, Green, Brown-White, Brown',
      'Green-White, Green, Orange-White, Blue, Blue-White, Orange, Brown-White, Brown',
      'White-Orange, Orange, White-Green, Blue, White-Blue, Green, White-Brown, Brown'
    ],
    correctAnswerIndex: 0, // First option is correct
    explanation: 'T568B order: Orange-White, Orange, Green-White, Blue, Blue-White, Green, Brown-White, Brown. This is the standard in most installations in the US.'
  },
  {
    id: 'q2',
    question_text: 'When would you use T568A instead of T568B?',
    options: [
      'Never - T568B is always correct',
      'For crossover cables connecting two similar devices',
      'For outdoor installations',
      'When using Cat 6 cable'
    ],
    correctAnswerIndex: 1,
    explanation: 'T568A is primarily used for crossover cables. It swaps the transmit and receive pairs, allowing direct connection between devices of the same type (switch-to-switch, PC-to-PC).'
  },
  // ... more questions
];
```

---

## Integration with Your Course Pages

Update your `course-cabling.html` to include the quiz:

```html
<ul class="module-list">
  <li>
    <span class="mod-tag">MOD 01</span>
    <h4>Cable Types & Standards</h4>
    <a href="modules/cable-intro.html" target="_blank" class="btn btn-ghost">Read Lesson</a>
  </li>
  
  <li>
    <span class="mod-tag">MOD 02</span>
    <h4>Cable Color Codes Quiz</h4>
    <a href="modules/quiz-cable-colors.html" class="btn btn-ghost">Take Quiz</a>
    <!-- This links to the quiz, opens in same tab so auth-guard works -->
  </li>
  
  <li>
    <span class="mod-tag">MOD 03</span>
    <h4>Termination Simulator</h4>
    <a href="modules/simulator-cable-termination.html" class="btn btn-ghost">Try Simulator</a>
  </li>
</ul>
```

---

## Styling (quiz-styles.css)

```css
.quiz-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.quiz-header {
  margin-bottom: 2rem;
}

.progress-indicator {
  font-size: 0.9rem;
  color: var(--ink-soft);
  margin-top: 0.5rem;
}

.question {
  margin-bottom: 2rem;
}

.question h2 {
  margin-bottom: 1.5rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option {
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
}

.option:hover {
  background: var(--paper);
}

.option input[type="radio"] {
  cursor: pointer;
}

.feedback-correct {
  background: #E4EEE1;
  color: var(--green);
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.feedback-incorrect {
  background: #F7E4DC;
  color: var(--copper-dark);
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.quiz-results {
  text-align: center;
  padding: 2rem;
  background: var(--paper);
  border-radius: 10px;
}

.quiz-results h2 {
  color: var(--copper);
}

.quiz-results p {
  margin: 1rem 0;
  font-size: 1.1rem;
}
```

---

## Instructor Review (Bonus)

Add a page for you to see quiz results:

```html
<!-- instructor-quiz-review.html -->
<div class="quiz-results-table">
  <table>
    <thead>
      <tr>
        <th>Student</th>
        <th>Best Score</th>
        <th>Attempts</th>
        <th>Last Attempt</th>
        <th>Drill Down</th>
      </tr>
    </thead>
    <tbody id="resultsBody">
      <!-- Populated by JS querying quiz_scores table -->
    </tbody>
  </table>
</div>
```

---

## Done When

- [ ] Understand quiz module flow (student takes it → feedback → score saved)
- [ ] Know the database tables needed (quiz_questions, quiz_responses, quiz_scores)
- [ ] Reviewed QuizEngine class and how it works
- [ ] Understand how to add new quizzes (just change quiz-data file)
- [ ] Ready to build first quiz module

---

## Next Steps

- **Step 9** — Simulator modules (cable termination, subnetting calc)
- **Step 10** — Branching scenarios (story-based troubleshooting)
- **Step 11** — Database schema migration guide

---

## Quick Reference

| Part | Purpose | Effort |
|---|---|---|
| `quiz-engine.js` | Generic logic (build once, reuse) | Medium |
| `quiz-data-*.js` | Questions for one quiz | Low (just JSON) |
| `quiz-*.html` | Page wrapper | Low (template) |
| Database tables | Store questions + scores | Low (SQL script) |
| Instructor dashboard | View results | Medium |

**Recommendation:** Build one quiz fully (end-to-end) as a template, then copy the pattern for subsequent quizzes.
