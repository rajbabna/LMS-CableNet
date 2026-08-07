# Module 04 Quiz — DHCP & DNS Configuration

> **Course:** Network Operations (Part 2) · **Phase 2 — Operations & Configuration**
> **Serves:** `part2-module-04-dhcp-dns.md`
> **Source:** `docs/resources/networking/network-utilities-and-troubleshooting.md`

---

## Multiple Choice

**1.** What do the letters in "DORA" stand for?

- A. Discover, Offer, Request, Acknowledge
- B. Define, Offer, Route, Assign
- C. Detect, Option, Reply, Accept
- D. Discover, Open, Request, Answer

**2.** If a device self-assigns `169.254.x.x` (APIPA), what does it mean?

- A. The device has a valid DHCP lease
- B. It received no DHCP answer
- C. The subnet mask is wrong
- D. DNS is misconfigured

**3.** DNS resolves:

- A. MAC addresses to IP addresses
- B. Human-readable names to IP addresses
- C. IP addresses to MAC addresses
- D. Ports to protocols

**4.** Which ports does DHCP use?

- A. 80 and 443
- B. 67 and 68
- C. 22 and 23
- D. 25 and 110

**5.** If pinging by IP works but pinging by name fails, the problem is likely:

- A. Connectivity
- B. DNS
- C. Routing
- D. The cable

**6.** A DHCP relay / helper-address is needed when:

- A. A device is in a different VLAN than the switch
- B. The DHCP server is on another subnet
- C. DNS is broken
- D. The scope is exhausted

---

## Short Answer

**7.** Walk through the "DHCP is broken?" checklist in order.

**8.** Explain how a browser resolves `www.example.com` to an IP (the DNS flow).

**9.** What happens when a device's DHCP lease expires?

---

## Answer Key

1. **A** — Discover, Offer, Request, Acknowledge (module §DHCP).
2. **B** — No DHCP answer → APIPA self-assigned (module §Friendly checklist, resource §5).
3. **B** — Names → IPs (module §DNS, resource §6).
4. **B** — DHCP uses UDP 67/68 (resource §5, module §checklist).
5. **B** — Name resolution problem, not connectivity (resource §6, module §DNS hint).
6. **B** — DHCP server on another subnet (resource §5, module §checklist).
7. Server running & scope not exhausted → correct VLAN (Layer 2) → DHCP relay/helper-address if server on another subnet → DHCP (UDP 67/68) allowed by firewall (module §checklist, resource §5).
8. Browser asks local DNS → local DNS asks forwarders as needed → name resolves to an IP → traffic sent to that IP (module §DNS Flow).
9. The client re-request/negotiates a new lease (module §Lab 4B discussion; DORA process repeats).

> Difficulty: recall (Q1–6), apply/diagnose (Q7–9).

> Note: numbering restarts at 7 for short-answer consistency; see answer key for the mapping.