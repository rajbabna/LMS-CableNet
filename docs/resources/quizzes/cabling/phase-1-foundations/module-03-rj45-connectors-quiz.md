# Module 03 Quiz — RJ45 Connectors & Wiring Standards

> **Course:** Cabling & Infrastructure (Part 1) · **Phase 1 — Foundations**
> **Serves:** `module-03-rj45-connectors.md`
> **Source:** `docs/resources/cabling/rj45-crimping-field-guide.md`, `docs/resources/cabling/cable-types-and-categories.md`

---

## Multiple Choice

**1.** Holding an RJ45 plug with the clip facing down and contacts facing you, pins are numbered:

- A. 8 to 1, right to left
- B. 1 to 8, left to right
- C. Randomly, per plug
- D. 1–4 top row, 5–8 bottom row

**2.** In the T568B standard, which pair occupies pins 3 and 6?

- A. Orange pair
- B. Green pair
- C. Blue pair
- D. Brown pair

**3.** Ethernet's usable pair circuits are:

- A. 1-2, 3-4, 5-6, 7-8
- B. 1-2, 3-6, 4-5, 7-8
- C. 1-3, 2-4, 5-7, 6-8
- D. 1-6, 2-5, 3-8, 4-7

**4.** How many pairs are needed for 100 Mbps (vs Gigabit)?

- A. All 4 pairs
- B. Only pairs 1-2 and 3-6
- C. Only pair 1-2
- D. 3 pairs

**5.** The only difference between T568A and T568B is:

- A. They use different numbers of wires
- B. Swapping pairs 2 and 3 (orange/green)
- C. One uses more shielding
- D. The clip orientation

**6.** When would you use a crossover cable?

- A. PC to switch
- B. PC to router LAN port
- C. Two like devices directly (e.g., PC to PC)
- D. PC to keystone wall jack

---

## Short Answer

**7.** Write the T568B pin order (colors 1–8) from memory.

**8.** Why does pin order matter so much that it is the #1 cause of dead cables?

**9.** What is the correct strip length of jacket before crimping, and why should untwisted length stay short?

---

## Answer Key

1. **B** — 1–8 left to right, clip down (field guide §Front View Pinout).
2. **B** — Green pair (W-Green, Green) on pins 3 and 6 (module §T568B).
3. **B** — Real pair circuits 1-2, 3-6, 4-5, 7-8 (module §Real Pair Circuits).
4. **B** — Only pairs 1-2 and 3-6 for 100 Mbps; all four for Gigabit (module §Real Pair Circuits).
5. **B** — Swapping pairs 2 and 3 (orange/green) (module §T568A).
6. **C** — Crossover = like devices directly; straight-through = unlike devices. Auto-MDIX makes it rare today (module §Straight-Through vs Crossover).
7. W-Orange, Orange, W-Green, Blue, W-Blue, Green, W-Brown, Brown (module §T568B).
8. Wrong order → partial connectivity, wrong speed, or dead cable; consistency on both ends matters more than which standard (module §Why Order Matters).
9. Strip ~13 mm (10–12 mm per module §Lab 3C); keep untwisted section <13 mm short to keep crosstalk low (field guide §3).

> Difficulty: recall (Q1–6), memorize/apply (Q7–9).