# Resource: Networking Cables & Connections — Reference

> Course: Network Foundations — Cabling & Infrastructure (Part 1)
> Derived from public learning material on cabling standards, connectors, and wiring.
> Purpose: in-depth, student-facing download that expands on lesson modules 01–06.

---

## 1. The Cable Hierarchy

A network cable exactly matches a **physical layer (Layer 1)** link. Data converted
to electrical, light, or radio signals travels over a medium. Three families:

| Family | Medium | Typical use | Reach limit |
|---|---|---|---|
| Copper (UTP) | Twisted copper pairs | Office LANs (local area) | ~100 m |
| Copper (shielded) | Twisted pairs + foil/braid | Noisy industrial environments | ~100 m |
| Fiber optic | Glass/plastic core | Backbones, campus, WAN, data centers | 100 m – 40 km+ |
| Coaxial | Central conductor + shield | Legacy cable TV, older LANs | ~500 m |

**Why twisted pairs?** Twisting the two wires of a circuit cancels
electromagnetic interference from adjacent pairs and the environment,
which is what lets Cat5e/Cat6 run fast without each pair radiating into another.

---

## 2. UTP Categories (Ethernet Copper)

| Category | Max speed | Notes | Pairs |
|---|---|---|---|
| Cat5e | 1 Gbps | Minimum for modern LANs, 100 MHz | 4 (8 wires total) |
| Cat6 | 10 Gbps (≤55 m) | 250 MHz, tighter twist, spline | 4 |
| Cat6a | 10 Gbps (100 m) | 500 MHz, improved crosstalk | 4 |
| Cat7 / Cat7a | 10 Gbps (shielding) | Shielded, older standard | 4 |
| Cat8 | 40 Gbps (≤30 m) | Data-center short links | 4 |

**Practical installer rule:**
- Residential / office drops: Cat5e or Cat6e
- New structured installations today: **Cat6a** is the safe future-proof choice
- Cat8 is niche — only very short, high-speed switches-to-servers runs

---

## 3. Wiring Standards: T568A vs T568B

Both T568A and T568B define the pin-to-color mapping of an 8-position
(RJ45) connector. The physical difference is only swapping pairs 2 and 3:

| Pin | T568A | T568B |
|---|---|---|
| 1 | White-Green | White-Orange |
| 2 | Green | Orange |
| 3 | White-Orange | White-Green |
| 4 | Blue | Blue |
| 5 | White-Blue | White-Blue |
| 6 | Orange | Green |
| 7 | White-Brown | White-Brown |
| 8 | Brown | Brown |

**Rule:** pick **one** standard and use it consistently. For a **straight-through**
cable both ends use the same scheme; for a **crossover** cable (rare today —
auto-MDI-X) one end is T568A and the other T568B.

---

## 4. Connectors & Pinouts

- **RJ45 (8P8C)** — the plug on UTP cables. Crimped with a crimp tool; wires must
  seat in the correct pin order.
- **RJ11 (6P)** — older telephony 2-pair, not Ethernet.
- **Keystone jack / patch panel** — fixed receptacle the cable terminates into at
  the wall or wiring closet.
- **Fiber connectors** — LC (small, common), SC (push-pull), ST (bayonet),
  MTP/MPO (multi-fiber).
- **Coaxial** — BNC / F-type connectors.

**Pinout cheat (T568B visual, tip-left):**
```
1 2  |  3 6  |  4 5  |  7 8
W Or|W Gr|Bl  Bl|W Br  Br
```
Only pairs **1-2** and **3-6** need to be correct for 100 Mbps; 8 conductors for 1 Gbps+.

---

## 5. Reading Performance Specs (why "tight twist" matters these days)

Two signals fighting within the same cable cause errors:

- **NEXT (Near-End Crosstalk):** a strong signal leaking into a neighbouring pair
  at the near end. Measured dB; higher (less negative) is better.
- **Return Loss:** — reflected energy back toward the source.
- **Skew / Fire design measure low for shielded copper won't buy you speed by
  itself; proper termination and category rating matter more.

---

## 6. Safety & Code (installer essentials)

- **Never install above ceiling tiles without plenum/jacket rating printed on the
  cable.** Plenum-rated cable uses low-smoke, low-flame materials.
- **Building codes (e.g. NEC in the US) apply to pathways, fire ratings, and
  separation from power.** Follow all codes.
- **Never run data cable parallel and alongside mains power for long distances**
  (induction noise).
- **Wear appropriate PPE** and pull the cable gently to avoid exceeding its bend
  radius / tension rating.

---

## 7. Key Takeaways for Students

1. UTP twisted pairs exist to cancel interference (that's why they're twisted).
2. Cat5e/Cat6a are the practical backbone choices today.
3. Choose T568A OR T568B — consistency is more important than which one.
4. The RJ45 plug must be terminated in exact pin order or the link fails.
5. Safety + code (plenum, fire rating, power separation) governs real installs.

> Cross-references: lesson-cabling-01 (OSI/topologies), 02 (cabling standards),
> 03 (RJ45), 04–06 (crimping & troubleshooting), handout-t568b-pinout-cheatsheet.