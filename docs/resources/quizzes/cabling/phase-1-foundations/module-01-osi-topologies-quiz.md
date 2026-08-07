# Module 01 Quiz — OSI Model & Network Topologies

> **Course:** Cabling & Infrastructure (Part 1) · **Phase 1 — Foundations**
> **Serves:** `module-01-osi-topologies.md`
> **Source:** `docs/resources/shared/cisco-netacad-alignment-map.md` (Cisco Networking Basics M1/M5/M7)

---

## Multiple Choice

**1.** Which OSI layer do Ethernet cables and connectors operate at?

- A. Layer 2 — Data Link
- B. Layer 1 — Physical
- C. Layer 3 — Network
- D. Layer 4 — Transport

**2.** Which topology connects every device to a central switch?

- A. Bus
- B. Ring
- C. Star
- D. Mesh

**3.** In the OSI model, which layer is responsible for routing packets by IP address?

- A. Physical
- B. Data Link
- C. Network
- D. Transport

**4.** What is the main advantage of a Mesh topology?

- A. Cheapest to build
- B. Highly redundant / fault-tolerant
- C. Easiest to troubleshoot
- D. Uses the least cabling

**5.** TCP/IP is best described as:

- A. A single network cable standard
- B. The model actually used on the internet
- C. A replacement for the OSI model
- D. A hardware topology

**6.** Which of the following maps to the "Network Access" layer of the TCP/IP model?

- A. HTTP and DNS
- B. TCP and UDP
- C. IP and ICMP
- D. Ethernet, cables, switches, MAC

---

## Short Answer

**7.** What does "encapsulation" mean in the OSI model, and in which direction does it happen?

**8.** Give one advantage and one disadvantage of Bus topology.

**9.** Name one real-world situation where a Mesh topology would be worth its cost.

---

## Answer Key

1. **B** — Layer 1 (Physical): cables, connectors, voltages (module §OSI Model).
2. **C** — Star topology (module §Network Topologies).
3. **C** — Network layer: IP addresses, routers, routing.
4. **B** — Redundancy is the defining benefit of Mesh.
5. **B** — TCP/IP is the model actually used on the internet; OSI is the teaching model (§OSI vs TCP/IP).
6. **D** — Cables/Ethernet/switches/MAC live in the Network Access layer of the TCP/IP table.
7. Each layer adds a header as data moves **down** the stack at the sender (§How data travels).
8. Advantage: cheap and simple. Disadvantage: a single break takes down the whole network.
9. Hospital ICU, data centers, or any system where downtime is unacceptable (module §Lab 1).

> Difficulty: recall (Q1–6), apply/explain (Q7–9).
