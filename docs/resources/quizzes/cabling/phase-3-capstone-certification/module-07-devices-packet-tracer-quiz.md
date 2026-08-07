# Module 07 Quiz — Device Overview & Packet Tracer Intro

> **Course:** Cabling & Infrastructure (Part 1) · **Phase 3 — Capstone & Certification**
> **Serves:** `module-07-devices-packet-tracer.md`
> **Source:** `docs/resources/networking/routing-and-switching.md`

---

## Multiple Choice

**1.** A switch operates at which layer and forwards traffic based on what?

- A. Layer 3, IP addresses
- B. Layer 2, MAC addresses
- C. Layer 1, electrical signals
- D. Layer 4, port numbers

**2.** A router operates at which layer and routes by what?

- A. Layer 2, MAC addresses
- B. Layer 1, cables
- C. Layer 3, IP addresses
- D. Layer 7, applications

**3.** What device connects a local network to an ISP's external connection?

- A. Switch
- B. Router
- C. Modem
- D. NIC

**4.** A typical home "router" is actually a combination of:

- A. Router + switch + wireless access point
- B. Modem + UPS only
- C. Switch + firewall + printer
- D. NIC + hub + bridge

**5.** In Packet Tracer, two PCs on the SAME subnet can reach each other through a:

- A. Router (required)
- B. Switch alone
- C. Modem
- D. Firewall

**6.** Which port speed category is "Fast Ethernet"?

- A. 10 Mbps
- B. 100 Mbps
- C. 1 Gbps
- D. 40 Gbps

---

## Short Answer

**7.** What is the functional difference between a switch and a router?

**8.** How does a switch build its MAC address table?

**9.** Why does a switch that maintains a MAC table carry full bandwidth to many ports at once?

---

## Answer Key

1. **B** — Switch = Layer 2, forwards by MAC (resource §1, module §Lecture).
2. **C** — Router = Layer 3, forwards by IP (resource §1, module §Lecture).
3. **C** — Modem (module §Lecture).
4. **A** — Router + switch + WAP combined (module §Lecture).
5. **B** — Same subnet → switch handles it (module §Lab 7B, §Packet Tracer Lab).
6. **B** — 100 Mbps = Fast Ethernet; 1 Gbps = Gigabit (module §Lecture).
7. Switch = MAC, works "inside" a network; router = IP, works "between" networks (module §Lecture, resource §1).
8. It learns by recording which source MAC arrives on which port, then forwards only to the right port (module §Lab 3A, resource §2).
9. Because once it knows each MAC→port mapping it forwards only to the target port, so each port can run at full bandwidth simultaneously instead of flooding (resource §2).

> Difficulty: recall (Q1–6), explain (Q7–9).