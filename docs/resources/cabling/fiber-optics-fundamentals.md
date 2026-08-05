# Resource: Fiber Optics Fundamentals — Student Reference

> Course: Network Foundations — Cabling & Infrastructure (Part 1)
> Enrichment material (from fiberu.org, cablestogo.com connector guides).
> Introduces fiber so students know when to move beyond copper.

---

## 1. Why Fiber?

Fiber optics carry data as **light pulses** through a glass/plastic core.

| Benefit | Why it matters |
|---|---|
| Distance | Reaches 100 m (multi-mode) to 40 km+ (single-mode) vs copper's ~100 m |
| Bandwidth | Far higher capacity, easily 100 Gbps |
| Immunity | No electromagnetic interference (EMI), no crosstalk |
| Security | Harder to tap without detection |
| Light weight | Smaller & lighter for large runs |

---

## 2. Multi-Mode vs Single-Mode

| Type | Core size | Light path | Distance | Colour guide |
|---|---|---|---|---|
| OM2 | 50 µm | Multiple modes (rays) | ~300 m | Orange jacket |
| OM3/OM4 (aqua) | 50 µm | Multiple, laser-optimised | 300–550 m | Aqua jacket |
| OS2 Single-mode | 9 µm | One straight ray | Up to 40 km+ | Yellow jacket |

- **Multi-mode** = short, high-speed links inside a building/campus.
- **Single-mode** = long-haul, carriers, inter-building WAN.

---

## 3. Fiber Connectors

| Connector | Style | Typical use |
|---|---|---|
| LC | Small "Lucent/click" 1.25 mm ferrule | Modern equipment, high density |
| SC | Square push-pull 2.5 mm | Patch panels, simple snap |
| ST | Round bayonet | Legacy installs |
| MTP/MPO | Multi-fibre (up to 32) | High-density trunk, data center |

> LC is today the de-facto default for switches and servers; MTP/MPO dominates
> dense data-center trunks.

---

## 4. Components of a Fiber Link

1. **Transmitter** — LED (multi-mode) or laser (single-mode) at one end.
2. **Fiber cable** — the core + cladding guiding the light.
3. **Connectors & patch panels** — join cable segments.
4. **Transceiver (SFP/SFP+/QSFP)** — pluggable module converting electrical <-> optical.
5. **Receiver** — detects the light pulses (photodetector).

---

## 5. Handling Rules (why fiber is "delicate but tough")

- **Bend radius:** never bend tighter than the cable's rated minimum radius
  (typically ~10× the diameter for the cable, ~20× for patch cords when installed).
- **Tensile load:** fiber is strong in tension when pulled by its Kevlar/yarn
  strength members, NOT by the glass itself. Pull on the members.
- **Never view the transmit end / never stare into a laser** — invisible and can
  damage eyes.
- **Clean before you connect:** microscopic dust causes back-reflection and loss.
  Use fiber cleaning tools / one-click cleaners before mating connectors.

---

## 6. Two Key Optical Measurements

- **Insertion Loss (dB):** light lost through a connection; a good mated pair is
  <0.5 dB.
- **Return Loss / Reflectance (dB):** light reflected back toward the source;
  higher magnitude = better.

A technician validates links with an **OLTS** (optical loss test set) or an
**OTDR** (optical time-domain reflectometer), which maps events (splices, bends,
cleanliness) along the fibre length.

---

## 7. When to Choose Fiber vs Copper (decision aid)

- **≤100 m, standard office/house:** copper Cat6a — cheaper, easier, tools everyone has.
- **>100 m, runs across buildings:** single-mode fiber.
- **High EMI (factory floor, alongside motors):** fiber removes the noise problem.
- **High-density data center:** multi-mode OM4 or MPO trunks for short, fast links;
  single-mode for longer spine links.

> Cross-references: handout appeal — similar to handout-subnetting-cheatsheet
> model; can pair with a future fiber course module.