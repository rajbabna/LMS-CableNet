# Step 10 — Branching Scenarios

## Overview

Branching scenarios are **story-based learning modules** where students face a real-world problem, make decisions, and see the consequences. Each decision branches to new scenarios, creating a tree of possible paths.

**Example for your courses:**

> *Scenario: "Your lab network is down. Machines can't reach the server."*
>
> **Your choices:**
> - A) Check cable connections first
> - B) Reboot all devices
> - C) Check network configuration
>
> Each choice leads to new information + new choices, until the student solves the problem or learns why their approach failed.

This step covers:
- How branching scenarios work
- Story structure and branching logic
- Building a scenario engine in JavaScript
- Database schema for storing decision trees
- Tracking student paths (what decisions did they make?)

---

## Why Branching Scenarios?

**Traditional training:** "Here's how to troubleshoot a downed network" (read text, memorize steps)

**Branching scenario:** "Your network is down. What do you do?" (student decides → sees consequences → learns)

**Result:** 
- Higher engagement (feels interactive, like a game)
- Deeper learning (students discover why wrong approaches fail)
- Data on reasoning (you see their decision path, can identify misunderstandings)

---

## Story Structure

### Example: Network Troubleshooting Scenario

```
START: "Your lab network is down"
  │
  ├─ Choice A: "Check cables first"
  │   ├─ Result: "Found loose cable. Reconnect and test."
  │   │   └─ Choice A1: "Retest connectivity" → WIN (Learned: always check physical first)
  │   └─ Failed path if missed
  │
  ├─ Choice B: "Reboot all devices"
  │   ├─ Result: "After reboot, still no connectivity"
  │   │   └─ Choice B1: "Check cables now" → WIN (Learned: reboot doesn't fix physical issues)
  │   └─ Choice B2: "Check configuration" → PARTIAL (solves one issue, miss the physical problem)
  │
  └─ Choice C: "Check network configuration"
      ├─ Result: "Config looks fine. Still no connectivity."
      │   └─ Next choice: "Now check physical"
      └─ Failed path leads to frustration
```

### Key Insights

1. **Multiple paths to success** — there's usually more than one right answer, but some are better/faster
2. **Dead ends teach** — wrong choices show why they don't work (not punishment, but learning)
3. **Optimal path** — there's usually one ideal path (check physical first) vs acceptable alternatives
4. **Player choice matters** — the story changes based on what they decide

---

## Scenario Data Structure

Store scenarios as a JSON tree:

```javascript
const troubleshootingScenario = {
  id: 'network-down-scenario',
  title: 'Network Troubleshooting Challenge',
  startNodeId: 'node-1',
  
  nodes: {
    'node-1': {
      nodeId: 'node-1',
      type: 'scenario',
      title: 'Your network is down',
      text: 'Students can\'t reach the lab server. You have 5 minutes to diagnose the issue. What do you do first?',
      choices: [
        {
          choiceId: 'c1-check-cables',
          text: 'Check physical cable connections',
          nextNodeId: 'node-2',
          feedback: 'Good instinct. Physical layer is always a good starting point.'
        },
        {
          choiceId: 'c1-reboot',
          text: 'Reboot all network devices',
          nextNodeId: 'node-3',
          feedback: 'Possible, but time-consuming. What if it\'s a physical issue?'
        },
        {
          choiceId: 'c1-config',
          text: 'Check network configuration',
          nextNodeId: 'node-4',
          feedback: 'Configuration could be the issue, but check faster things first.'
        }
      ]
    },
    
    'node-2': {
      nodeId: 'node-2',
      type: 'scenario',
      title: 'Checking cables',
      text: 'You go to the patch panel. You notice the cable to the core switch looks loose. You reseat it.',
      choices: [
        {
          choiceId: 'c2-test',
          text: 'Test connectivity again',
          nextNodeId: 'node-win-fast',
          feedback: 'Excellent. You found and fixed the problem quickly.'
        },
        {
          choiceId: 'c2-replace',
          text: 'Replace the cable entirely',
          nextNodeId: 'node-win-thorough',
          feedback: 'Also works, but unnecessary. The original cable was fine.'
        }
      ]
    },
    
    'node-3': {
      nodeId: 'node-3',
      type: 'scenario',
      title: 'Rebooting devices',
      text: 'After 3 minutes of rebooting, everything is back online. Network is working again.',
      choices: [
        {
          choiceId: 'c3-done',
          text: 'Problem solved, move on',
          nextNodeId: 'node-win-lucky',
          feedback: 'It worked! But you might not have fixed the root cause. The cable was loose.'
        }
      ]
    },
    
    'node-4': {
      nodeId: 'node-4',
      type: 'scenario',
      title: 'Checking configuration',
      text: 'You review routing and VLAN configs. Everything looks correct. The network is still down.',
      choices: [
        {
          choiceId: 'c4-check-cables',
          text: 'Check cables now',
          nextNodeId: 'node-2',
          feedback: 'Should have done this first. But you got there eventually.'
        },
        {
          choiceId: 'c4-reboot',
          text: 'Try rebooting',
          nextNodeId: 'node-3',
          feedback: 'You\'re going in circles. The real issue is physical.'
        }
      ]
    },
    
    'node-win-fast': {
      nodeId: 'node-win-fast',
      type: 'ending',
      title: '✓ Scenario Complete!',
      text: 'You diagnosed and fixed the problem in 2 minutes. Excellent troubleshooting discipline: always check physical first.',
      score: 100,
      lessonsLearned: [
        'OSI Layer 1 (physical) is the foundation',
        'Always check the simplest things first',
        'Good diagnostics save time'
      ]
    },
    
    'node-win-lucky': {
      nodeId: 'node-win-lucky',
      type: 'ending',
      title: '✓ Network is up, but...',
      text: 'The reboot fixed it, but you didn\'t identify the root cause. The cable is still loose—it could fail again.',
      score: 60,
      lessonsLearned: [
        'Reboots can mask physical issues',
        'Always diagnose, not just fix symptoms'
      ]
    }
  }
};
```

---

## Scenario Engine (JavaScript)

```javascript
class ScenarioEngine {
  constructor(scenario, moduleId) {
    this.scenario = scenario;
    this.moduleId = moduleId;
    this.currentNodeId = scenario.startNodeId;
    this.choiceHistory = []; // Track decisions
    this.score = 0;
    this.init();
  }

  async init() {
    // Check auth
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    this.userId = user.id;
    this.render();
  }

  render() {
    const node = this.scenario.nodes[this.currentNodeId];
    const container = document.getElementById('scenarioContent');

    if (node.type === 'ending') {
      // Show ending screen
      container.innerHTML = `
        <div class="scenario-ending ${node.score >= 80 ? 'success' : 'partial'}">
          <h2>${node.title}</h2>
          <p>${node.text}</p>
          <div class="score">Score: ${node.score}%</div>
          <h3>Key Lessons:</h3>
          <ul>
            ${node.lessonsLearned.map(lesson => `<li>${lesson}</li>`).join('')}
          </ul>
          <button onclick="location.href='../student-dashboard.html'" class="btn btn-primary">Back to Dashboard</button>
        </div>
      `;
      this.markComplete(node.score);
      return;
    }

    // Show scenario + choices
    container.innerHTML = `
      <div class="scenario-node">
        <h2>${node.title}</h2>
        <p>${node.text}</p>
        
        <div class="choices">
          ${node.choices.map((choice, idx) => `
            <button class="choice-btn" onclick="scenarioEngine.makeChoice('${choice.choiceId}', '${choice.nextNodeId}', '${choice.feedback}')">
              <strong>${String.fromCharCode(65 + idx)}.</strong> ${choice.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  makeChoice(choiceId, nextNodeId, feedback) {
    // Save choice to history
    this.choiceHistory.push({
      choiceId: choiceId,
      nodeId: this.currentNodeId,
      timestamp: Date.now()
    });

    // Show feedback
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'choice-feedback';
    feedbackEl.textContent = feedback;
    document.querySelector('.scenario-node').appendChild(feedbackEl);

    // Move to next node after brief delay
    setTimeout(() => {
      this.currentNodeId = nextNodeId;
      this.render();
    }, 2000);
  }

  async markComplete(score) {
    // Save decision path to database
    await supabaseClient.from('scenario_outcomes').insert({
      id: crypto.randomUUID(),
      user_id: this.userId,
      module_id: this.moduleId,
      decision_path: JSON.stringify(this.choiceHistory),
      final_score: score,
      completed_at: new Date()
    });

    // Mark module complete
    await supabaseClient.from('module_completions').upsert({
      user_id: this.userId,
      module_id: this.moduleId,
      status: 'completed',
      completion_percentage: score,
      completed_at: new Date()
    });
  }
}

// Global instance so HTML buttons can call it
let scenarioEngine;
document.addEventListener('DOMContentLoaded', () => {
  scenarioEngine = new ScenarioEngine(troubleshootingScenario, 'network-troubleshooting');
});
```

---

## HTML Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Troubleshooting Scenario</title>
  <link rel="stylesheet" href="../css/scenario-styles.css">
</head>
<body>

<main class="scenario-container">
  <div class="scenario-header">
    <h1>Network Troubleshooting Challenge</h1>
    <p>Make decisions to troubleshoot a network issue. Your choices affect the outcome.</p>
  </div>

  <div id="scenarioContent"></div>
</main>

<!-- Auth -->
<script src="../js/supabase-client.js"></script>
<script src="../js/auth-guard.js"></script>

<!-- Scenario data and engine -->
<script src="../js/scenario-data-troubleshooting.js"></script>
<script src="../js/scenario-engine.js"></script>
</body>
</html>
```

---

## CSS (scenario-styles.css)

```css
.scenario-container {
  max-width: 700px;
  margin: 2rem auto;
  padding: 2rem;
}

.scenario-header {
  text-align: center;
  margin-bottom: 2rem;
}

.scenario-node {
  background: var(--paper);
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 2rem;
}

.scenario-node h2 {
  color: var(--copper);
  margin-bottom: 1rem;
}

.scenario-node p {
  margin-bottom: 1.5rem;
  line-height: 1.7;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.choice-btn {
  padding: 1rem;
  background: white;
  border: 2px solid var(--line);
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.choice-btn:hover {
  border-color: var(--copper);
  background: #f9f7f4;
}

.choice-btn strong {
  color: var(--copper);
  margin-right: 0.5rem;
}

.choice-feedback {
  margin-top: 1rem;
  padding: 1rem;
  background: #F7E4DC;
  border-left: 4px solid var(--copper);
  border-radius: 4px;
  font-style: italic;
}

.scenario-ending {
  text-align: center;
  padding: 2rem;
  background: var(--paper);
  border-radius: 10px;
}

.scenario-ending.success {
  background: #E4EEE1;
  color: var(--green);
}

.scenario-ending.partial {
  background: #F7E4DC;
  color: var(--copper-dark);
}

.score {
  font-size: 2rem;
  font-weight: bold;
  margin: 1rem 0;
}

.scenario-ending h3 {
  text-align: left;
  margin-top: 1.5rem;
}

.scenario-ending ul {
  text-align: left;
  margin-left: 1.5rem;
}
```

---

## Database Schema

Add to Supabase:

```sql
CREATE TABLE public.scenario_outcomes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  module_id TEXT REFERENCES public.modules(id),
  decision_path JSONB, -- array of choices made
  final_score INT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

This lets you later query: "What % of students chose to check cables first?" → reveals which students need more coaching.

---

## Instructor Analytics (Bonus)

Query student decisions:

```sql
-- Which branching paths do students take?
SELECT 
  decision_path,
  COUNT(*) as num_students,
  AVG((final_score)::numeric) as avg_score
FROM public.scenario_outcomes
GROUP BY decision_path
ORDER BY num_students DESC;

-- Identify struggling students
SELECT 
  p.email,
  s.final_score,
  COUNT(*) as num_attempts
FROM public.scenario_outcomes s
JOIN public.profiles p ON s.user_id = p.id
WHERE s.final_score < 70
GROUP BY p.email
ORDER BY s.final_score ASC;
```

---

## Done When

- [ ] Understand branching scenario structure (nodes, choices, outcomes)
- [ ] Reviewed scenario data format (JSON tree)
- [ ] Reviewed ScenarioEngine class (how it renders and tracks choices)
- [ ] Know how to create new scenarios (just change data file)
- [ ] Understand how to store and analyze decision paths

---

## Quick Wins

**Scenario 1:** Network troubleshooting (you have it)
**Scenario 2:** Cable installation troubleshooting
**Scenario 3:** Network configuration scenarios
**Scenario 4:** Disaster recovery / failover decisions

Each reuses the same engine—just new data file.

---

## Next Step

**Step 11** — Database schema migration (create all tables at once)
