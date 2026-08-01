# Step 9 — Simulator Modules

## Overview

Simulators are **interactive, hands-on tools** where students *do* the thing they're learning — not just read about it or answer questions.

Examples for your courses:
- **Cable Termination Simulator** — drag wires into correct order, validate, get feedback
- **Subnetting Calculator** — enter network, see subnets calculated visually
- **Patch Panel Builder** — drag ports, connect them, see the routing

This step covers:
- Philosophy of simulators
- Two example implementations (cable termination, subnetting)
- How to track completion
- Database schema

---

## Why Simulators?

**Quiz:** Student reads "What's T568B?" → clicks answer → moves on
- They memorized, but haven't *done* it

**Simulator:** Student *terminates* a cable (drag-and-drop wires) → sees ✓ correct or ✗ incorrect → tries again
- They've practiced the motor skill + reinforced knowledge
- If they got it wrong, they learn *why* immediately

**Result:** Deeper learning, better retention, real-world readiness.

---

## Example 1: Cable Termination Simulator

### How It Works (Student View)

1. Simulator shows an RJ45 connector diagram + 8 wires with color labels
2. Student drags wires into the connector slots (positions 1-8)
3. As they drag, visual feedback shows if colors are in order
4. They click "Check" when done
5. System validates:
   - ✓ **Perfect** — exact T568B order
   - ✗ **Not Quite** — shows which positions are wrong
6. Student can rearrange and try again, or click "Show Solution"
7. When they get it right, score saved + module marked complete

### HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>Cable Termination Simulator</title>
  <link rel="stylesheet" href="../css/simulator-styles.css">
</head>
<body>

<main class="simulator-container">
  <h1>RJ45 Cable Termination — T568B</h1>
  
  <!-- Instructions -->
  <section class="instructions">
    <p>Drag the colored wires into the correct order for T568B termination.</p>
    <p>Reference: <strong>Orange-White, Orange, Green-White, Blue, Blue-White, Green, Brown-White, Brown</strong></p>
  </section>

  <!-- Simulator -->
  <div class="simulator">
    <!-- Wire Pool (left side) -->
    <div class="wire-pool" id="wirePool">
      <div class="wire" draggable="true" data-color="orange-white">Orange-White</div>
      <div class="wire" draggable="true" data-color="orange">Orange</div>
      <div class="wire" draggable="true" data-color="green-white">Green-White</div>
      <div class="wire" draggable="true" data-color="blue">Blue</div>
      <div class="wire" draggable="true" data-color="blue-white">Blue-White</div>
      <div class="wire" draggable="true" data-color="green">Green</div>
      <div class="wire" draggable="true" data-color="brown-white">Brown-White</div>
      <div class="wire" draggable="true" data-color="brown">Brown</div>
    </div>

    <!-- RJ45 Connector (right side) -->
    <div class="rj45-connector">
      <h3>RJ45 Connector</h3>
      <div class="connector-slots">
        <div class="slot" data-position="1" id="slot-1"></div>
        <div class="slot" data-position="2" id="slot-2"></div>
        <div class="slot" data-position="3" id="slot-3"></div>
        <div class="slot" data-position="4" id="slot-4"></div>
        <div class="slot" data-position="5" id="slot-5"></div>
        <div class="slot" data-position="6" id="slot-6"></div>
        <div class="slot" data-position="7" id="slot-7"></div>
        <div class="slot" data-position="8" id="slot-8"></div>
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class="actions">
    <button id="checkBtn" class="btn btn-primary">Check</button>
    <button id="resetBtn" class="btn btn-ghost">Reset</button>
    <button id="showSolutionBtn" class="btn btn-ghost">Show Solution</button>
  </div>

  <!-- Feedback -->
  <div id="feedback" class="feedback"></div>
</main>

<!-- Auth guard -->
<script src="../js/supabase-client.js"></script>
<script src="../js/auth-guard.js"></script>

<!-- Simulator logic -->
<script src="../js/simulator-cable-termination.js"></script>
</body>
</html>
```

### JavaScript Logic (simulator-cable-termination.js)

```javascript
class CableTerminationSimulator {
  constructor() {
    this.correctOrder = ['orange-white', 'orange', 'green-white', 'blue', 'blue-white', 'green', 'brown-white', 'brown'];
    this.currentOrder = ['', '', '', '', '', '', '', ''];
    this.moduleId = 'cable-termination-sim';
    this.init();
  }

  init() {
    this.setupDragAndDrop();
    this.setupButtons();
  }

  setupDragAndDrop() {
    const wires = document.querySelectorAll('.wire');
    const slots = document.querySelectorAll('.slot');

    wires.forEach(wire => {
      wire.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('color', wire.dataset.color);
      });
    });

    slots.forEach(slot => {
      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const color = e.dataTransfer.getData('color');
        const position = slot.dataset.position - 1; // 0-indexed
        
        // Place wire in slot
        slot.textContent = this.getWireLabel(color);
        slot.dataset.color = color;
        this.currentOrder[position] = color;
        
        // Visual feedback
        slot.classList.add('filled');
      });
    });
  }

  setupButtons() {
    document.getElementById('checkBtn').addEventListener('click', () => this.check());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    document.getElementById('showSolutionBtn').addEventListener('click', () => this.showSolution());
  }

  check() {
    const feedback = document.getElementById('feedback');
    const isCorrect = JSON.stringify(this.currentOrder) === JSON.stringify(this.correctOrder);

    if (isCorrect) {
      feedback.className = 'feedback feedback-correct';
      feedback.innerHTML = `
        <h3>✓ Perfect!</h3>
        <p>You've correctly terminated the cable in T568B order.</p>
      `;
      this.markComplete();
    } else {
      feedback.className = 'feedback feedback-incorrect';
      const wrongPositions = this.findWrongPositions();
      feedback.innerHTML = `
        <h3>✗ Not quite right</h3>
        <p>Incorrect positions: ${wrongPositions.join(', ')}</p>
        <p>Try again or click "Show Solution"</p>
      `;
    }
  }

  findWrongPositions() {
    const wrong = [];
    for (let i = 0; i < this.correctOrder.length; i++) {
      if (this.currentOrder[i] !== this.correctOrder[i]) {
        wrong.push(`Position ${i + 1}`);
      }
    }
    return wrong;
  }

  showSolution() {
    const slots = document.querySelectorAll('.slot');
    this.correctOrder.forEach((color, idx) => {
      slots[idx].textContent = this.getWireLabel(color);
      slots[idx].dataset.color = color;
      slots[idx].classList.add('filled', 'solution');
    });
    this.currentOrder = [...this.correctOrder];
    
    const feedback = document.getElementById('feedback');
    feedback.className = 'feedback feedback-info';
    feedback.innerHTML = '<p>Solution shown. This is the correct T568B order.</p>';
  }

  reset() {
    document.querySelectorAll('.slot').forEach(slot => {
      slot.textContent = '';
      slot.dataset.color = '';
      slot.classList.remove('filled', 'solution');
    });
    this.currentOrder = ['', '', '', '', '', '', '', ''];
    document.getElementById('feedback').innerHTML = '';
  }

  getWireLabel(color) {
    const labels = {
      'orange-white': 'Orange-White',
      'orange': 'Orange',
      'green-white': 'Green-White',
      'blue': 'Blue',
      'blue-white': 'Blue-White',
      'green': 'Green',
      'brown-white': 'Brown-White',
      'brown': 'Brown'
    };
    return labels[color] || '';
  }

  async markComplete() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    await supabaseClient.from('module_completions').upsert({
      user_id: user.id,
      module_id: this.moduleId,
      status: 'completed',
      completion_percentage: 100,
      completed_at: new Date()
    });

    // Optionally redirect after a delay
    setTimeout(() => {
      window.location.href = '../student-dashboard.html';
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => new CableTerminationSimulator());
```

### CSS (simulator-styles.css)

```css
.simulator-container {
  max-width: 900px;
  margin: 2rem auto;
  padding: 2rem;
}

.instructions {
  background: var(--paper);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.simulator {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.wire-pool {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wire {
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid var(--line);
  border-radius: 6px;
  cursor: grab;
  user-select: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.wire:active {
  cursor: grabbing;
  opacity: 0.7;
}

.rj45-connector {
  padding: 1.5rem;
  background: var(--paper);
  border-radius: 8px;
}

.connector-slots {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
}

.slot {
  aspect-ratio: 1;
  border: 2px dashed var(--line);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  text-align: center;
  padding: 0.25rem;
  background: white;
}

.slot.filled {
  border-style: solid;
  background: var(--ink-soft);
  color: white;
  font-weight: bold;
}

.slot.solution {
  background: var(--green);
}

.feedback {
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.feedback-correct {
  background: #E4EEE1;
  color: var(--green);
}

.feedback-incorrect {
  background: #F7E4DC;
  color: var(--copper-dark);
}

.feedback-info {
  background: #E8F4F8;
  color: var(--teal);
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
```

---

## Example 2: Subnetting Calculator

Similar structure but simpler (no drag-drop):

```html
<!-- simulator-subnetting.html -->
<div class="calculator">
  <label>
    Network Address:
    <input type="text" id="networkInput" placeholder="e.g., 192.168.1.0/24">
  </label>
  
  <label>
    Number of Subnets:
    <input type="number" id="subnetCount" min="2" max="128">
  </label>

  <button id="calculateBtn" class="btn btn-primary">Calculate</button>
</div>

<div id="results">
  <!-- Populated by JS -->
</div>
```

JavaScript:

```javascript
document.getElementById('calculateBtn').addEventListener('click', () => {
  const network = document.getElementById('networkInput').value;
  const subnetCount = parseInt(document.getElementById('subnetCount').value);

  const [ip, cidr] = network.split('/');
  const [a, b, c, d] = ip.split('.').map(Number);

  // Simple calculation (real subnetting is more complex)
  const bitsNeeded = Math.ceil(Math.log2(subnetCount));
  const newCidr = parseInt(cidr) + bitsNeeded;

  document.getElementById('results').innerHTML = `
    <h3>Subnet Plan</h3>
    <table>
      <tr><th>Subnet</th><th>Network</th><th>Broadcast</th><th>Usable IPs</th></tr>
      ${generateSubnets(a, b, c, d, newCidr).map(subnet => `
        <tr>
          <td>${subnet.name}</td>
          <td>${subnet.network}</td>
          <td>${subnet.broadcast}</td>
          <td>${subnet.usable}</td>
        </tr>
      `).join('')}
    </table>
  `;

  markComplete();
});
```

---

## Database Integration

Add to `modules` table when you create a simulator:

```sql
INSERT INTO public.modules (
  id, course_id, module_number, title, description, 
  content_type, content_url, created_at
) VALUES (
  'cable-termination-sim', 'cabling', 2, 
  'Cable Termination Simulator',
  'Drag wires into the correct RJ45 termination order',
  'simulator',
  '/modules/simulator-cable-termination.html',
  now()
);
```

When student completes simulator:

```javascript
// Simulator code calls this when correct
await supabaseClient.from('module_completions').upsert({
  user_id: userId,
  module_id: 'cable-termination-sim',
  status: 'completed',
  completion_percentage: 100,
  completed_at: new Date()
});
```

---

## Tracking & Analytics

Instructors can see:
- Who completed the simulator
- Average time-to-completion
- How many tries before success (if logging retries)

Optional: Log each attempt:

```javascript
// Log attempt to database
await supabaseClient.from('simulator_attempts').insert({
  user_id: userId,
  module_id: moduleId,
  attempt_number: attemptNumber,
  result: 'correct', // or 'incorrect'
  time_spent_seconds: timeTaken,
  created_at: new Date()
});
```

This lets you see: "Average 3 tries, 8 minutes to master cable termination" across your cohort.

---

## Done When

- [ ] Understand the simulator flow (drag/interact → validate → mark complete)
- [ ] Reviewed cable termination example (HTML + JS + CSS)
- [ ] Reviewed subnetting calculator example
- [ ] Know how to add to modules table + track completion
- [ ] Have ideas for other simulators (patch panel, ping tool, etc.)

---

## Next Steps

- **Step 10** — Branching scenarios (story-based troubleshooting)
- **Step 11** — Database schema migration (create all tables at once)

---

## Quick Reference: Simulator Checklist

For each new simulator:

1. **Create HTML** (template with container + buttons)
2. **Write JS class** (drag logic, validation, marking complete)
3. **Add CSS** (styling + visual feedback)
4. **Insert into `modules` table** (one row per simulator)
5. **Test locally** (open, interact, check Supabase for completion)
6. **Link from course page** (add to module list)
7. **Deploy to GitHub**
