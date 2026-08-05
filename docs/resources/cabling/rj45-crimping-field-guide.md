# Resource: RJ45 Connectors & Crimping — Step-by-Step Field Guide

> Course: Network Foundations — Cabling & Infrastructure (Part 1)
> Deep dive supporting lessons 03 (RJ45 connectors) and 04–05 (crimping practice/marathon).

---

## 1. Anatomy of an RJ45 Connector

The RJ45 (8P8C) modular plug is what terminates a UTP cable. Three parts matter
when crimping:

1. **The 8 gold contact pins** — each pierces one conductor of the cable.
2. **The body / housing** — transparent plastic; you verify colours through it.
3. **The locking tab** — clicks into the keystone jack / port so the plug stays seated.

> Always inspect the plug: if any pin is not aligned with its conductor, the link
> may test "up" but fail under PoE or high throughput.

---

## 2. Tools You Need

| Tool | Purpose |
|---|---|
| Crimp tool (crimper) | Terminates RJ45 plugs with a ratcheting press |
| Cable stripper | Removes the outer jacket without nicking wires |
| Wire cutter | Trims the bundle to exact length |
| Cable tester | Verifies continuity & pin order (mandatory before install) |
| Punch-down tool | Terminates keystone jacks / patch panels (110-style) |

---

## 3. Crimping Process (T568B example, end-to-end)

1. **Strip** the jacket ~13 mm (about half an inch). Do not nick the inner wires.
2. **Untwist & arrange** the 4 pairs into the T568B order:
   W-Orange, Orange, W-Green, Blue, W-Blue, Green, W-Brown, Brown.
3. **Flatten & align** the 8 wires in one plane; keep the untwisted section as short
   as possible (<13 mm) so crosstalk stays low.
4. **Trim** the ends so all 8 wires are perfectly flush.
5. **Insert into the plug** (tab facing away from you / clip down). Push until the
   jacket goes past the plug's strain-relief barb and wires reach the front.
6. **Crimp** with one firm squeeze of the ratchet until it releases.
7. **Test** on a cable tester — every pin must light in order.

---

## 4. The "Front View" Pinout to Memorise

Holding the plug with the **clip facing down** (contacts up, facing you):

```
Pin:  1     2     3     4     5     6     7     8
     W-Or  Or   W-Gr  Bl   W-Bl  Gr   W-Br  Br   (T568B)
```

Pair-to-pin reality check: **only pairs 1-2, 3-6, 4-5, 7-8** are the real circuits.
Pins 1-2 and 3-6 are the critical ones for 100 Mbps.

---

## 5. Common Mistakes & How to Avoid Them

| Mistake | Symptom | Fix |
|---|---|---|
| Wires in wrong order | Tester shows crossed/missing pins | Re-crimp, verify colour order |
| Jacket not inserted past barb | Pull test fails; plug comes loose | Push cable deeper before crimping |
| Untwisted too far | Flaky gigabit links | Keep twist as close to plug as possible |
| Trimming not flush | Some pins don't make contact | Cut again, re-insert |
| Using the wrong plug for solid vs stranded cable | Bad contact | Use the correct RJ45 type (solid/stranded) |

---

## 6. Keystones & Patch Panels (the "other end" of the run)

- A **keystone jack** is where the horizontal cable terminates at the wall plate.
- Punch-down (110/IDC) tool seats each conductor into its slot; the slot's metal
  teeth cut the insulation — no stripping required for each wire.
- Colour labels on the keystone (T568A / T568B) tell you the pin mapping; **match
  the wall end to the same standard used at the patch panel.**

---

## 7. Quick Checklist Before Every Install

- [ ] Correct cable category for the run
- [ ] Consistent T568A or T568B on BOTH ends
- [ ] Jacket inside the connector (strain relief engaged)
- [ ] All 8 pins test in order (tester PASS)
- [ ] No staples/kinks beyond bend radius
- [ ] Plenum/fire rating matches ceiling pathway

> Cross-references: lesson-cabling-03 (RJ45 connectors), 04–05 (crimping practice),
> handout-t568b-pinout-cheatsheet.