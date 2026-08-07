# Module 03 Quiz — Packet Tracer: IP Configuration & Connectivity

> **Course:** Network Operations (Part 2) · **Phase 1 — Fundamentals**
> **Serves:** `part2-module-03-packet-tracer-ip.md`
> **Source:** `docs/resources/networking/ip-addressing-and-subnetting.md`, `docs/resources/networking/routing-and-switching.md`

---

## Multiple Choice

**1.** What must match for two PCs on the same subnet to ping each other?

- A. MAC addresses
- B. IP addresses must be on the same subnet
- C. Both must use DHCP
- D. A router must exist between them

**2.** A switch forwards frames using:

- A. IP addresses
- B. MAC addresses
- C. Port numbers
- D. DNS names

**3.** When a switch receives a frame with an UNKNOWN destination MAC, it:

- A. Drops the frame
- B. Floods it out all ports except the source
- C. Sends it to the router
- D. Returns it to the sender

**4.** Two PCs on DIFFERENT subnets need which device to communicate?

- A. A switch
- B. A router
- C. A hub
- D. A repeater

**5.** After the first message, a switch stops flooding by using its:

- A. Routing table
- B. MAC address table
- C. ARP cache
- D. DNS cache

**6.** In Packet Tracer's simulation mode, you can observe:

- A. The packets traveling device by device
- B. The crimping process
- C. DNS records only
- D. Physical cable colors

---

## Short Answer

**7.** How does a switch learn which MAC address is on which port?

**8.** Why do 4 PCs on the same subnet (192.168.1.0/24) reach each other through a switch with no router?

**9.** What happens if you put one PC on a different subnet (e.g., 192.168.2.3) on the same switch, and why?

---

## Answer Key

1. **B** — Same subnet required; switch handles it (module §Lab 3A/3C).
2. **B** — Switch = Layer 2, MAC-based forwarding (resource §1, module §Lecture).
3. **B** — Unknown MAC → flood all ports except source (resource §2).
4. **B** — Different subnets require a router (module §Lab 3C bonus).
5. **B** — MAC address table (resource §2, module §Lecture).
6. **A** — Simulation mode animates packet flow (module §Lab 3C).
7. It learns by recording the source MAC → port for each frame received, then forwards to the learned port (resource §2, module §Lecture).
8. All are on the same Layer-2 broadcast domain / subnet, so the switch can forward between them — no routing needed (module §Lecture).
9. The ping fails — same switch but different subnet requires a router (Layer 3) to route between subnets (module §Lab 3C bonus).

> Difficulty: recall (Q1–6), explain (Q7–9).