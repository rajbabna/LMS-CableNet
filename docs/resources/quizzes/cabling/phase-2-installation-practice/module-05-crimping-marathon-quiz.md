# Module 05 Quiz — Crimping Marathon & Testing Intro

> **Course:** Cabling & Infrastructure (Part 1) · **Phase 2 — Installation & Practice**
> **Serves:** `module-05-crimping-marathon.md`
> **Source:** `docs/resources/cabling/rj45-crimping-field-guide.md`

---

## Multiple Choice

**1.** On a cable tester, a lit LED on a pin indicates:

- A. That pin is broken
- B. That pin is wired and continuous
- C. The cable is miswired
- D. The tester is faulty

**2.** If the tester shows a light on the WRONG pin, the fault is:

- A. An open circuit
- B. A crossed/shorted pair (order error)
- C. Uneven crimp pressure
- D. A bad connector

**3.** If 4 of 8 pins fail clustered on one side, the likely cause is:

- A. Wires in wrong order
- B. Uneven pressure / shallow insertion
- C. Wrong cable category
- D. The cable is too long

**4.** What is the correct habit cycle for testing every cable?

- A. Crimp → Test → Read → Fix
- B. Test → Crimp → Fix → Read
- C. Crimp → Read → Fix → Test
- D. Read → Crimp → Test → Fix

**5.** A "no lights at all" result on one end most likely means:

- A. All pins are fine
- B. Connector not seated or wrong end tested
- C. The cable is shielded
- D. Too much untwisting

**6.** The tester sends a signal down each pin and:

- A. Prints a label
- B. Lights an LED per pin on the remote unit
- C. Measures the cable length only
- D. Tests the jacket color

---

## Short Answer

**7.** What is the difference between a testing failure and a crimping failure?

**8.** Why is it better to test immediately after each crimp rather than testing a batch later?

**9.** Which pair-to-pin circuits are critical for 100 Mbps, and why do they matter to a tester reading?

---

## Answer Key

1. **B** — Lit LED = that pin is wired and continuous (module §How a Cable Tester Works).
2. **B** — Light on wrong pin = crossed/shorted pair, i.e., an order error (module §Lecture).
3. **B** — 4 of 8 on one side → uneven pressure / shallow insertion (module §Testing Lab).
4. **A** — Crimp → Test → Read → Fix (module §Continued Crimping + Testing).
5. **B** — No lights = connector not seated or wrong end tested (module §Testing Lab).
6. **B** — Lights an LED per pin on the remote unit (module §Lecture).
7. Testing failure = the tester detects a fault (open/crossed pin); crimping failure = a physical/technique problem that produced the bad termination. A testing failure is the *symptom*; the crimp is the *cause* (module §Lecture + §Testing Lab).
8. Immediate testing keeps cause-and-effect tight — you know which crimp produced which result, so technique fixes stick; batch testing loses that connection (module §Wrap-Up feedback loop).
9. Pairs 1-2 and 3-6 (green pair is split across pins 3 and 6). The tester's per-pin LEDs reveal whether those critical pairs are intact and in order (field guide §4).

> Difficulty: recall (Q1–6), analyze/diagnose (Q7–9).
