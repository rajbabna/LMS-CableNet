# Module 09 Quiz — Final Assessment & Certification (Part 2)

> **Course:** Network Operations (Part 2) · **Phase 3 — Advanced & Security**
> **Serves:** `part2-module-09-final-assessment.md`
> **Source:** all Part 2 resources (synthesis)

---

## Multiple Choice

**1.** A `/30` subnet provides how many usable addresses?

- A. 14
- B. 6
- C. 2
- D. 254

**2.** Which scenario symptom points to a DHCP problem?

- A. 169.254.x.x (APIPA) address
- B. ping by name fails, IP works
- C. Remote pings fail, local works
- D. `* * *` in tracert

**3.** To route between two VLANs you need:

- A. A switch alone
- B. Layer 3 routing (router-on-a-stick or L3 switch)
- C. A bridge
- D. A repeater

**4.** Which protocol is used for routing on the internet between autonomous systems?

- A. RIP
- B. OSPF
- C. BGP
- D. STP

**5.** The default admin credentials on a new router should be:

- A. Kept as-is
- B. Changed immediately
- C. Only changed if someone complains
- D. Shared with all users

**6.** STP (Spanning Tree Protocol) exists to:

- A. Speed up routing
- B. Prevent Layer-2 loops (broadcast storms)
- C. Encrypt traffic
- D. Assign IP addresses

---

## Short Answer

**7.** Compute: how many usable hosts in a /26? Show the formula.

**8.** Walk through the written exam's 5 short-answer topics.

**9.** What completion pathways follow Part 2?

---

## Answer Key

1. **C** — /30 → 2 usable (point-to-point) (resource §5).
2. **A** — APIPA 169.254.x.x = no DHCP answer (resource §5, module-04).
3. **B** — Inter-VLAN routing happens at Layer 3 (resource §6).
4. **C** — BGP routes the internet between ASes (resource §4, module-05).
5. **B** — Change defaults immediately (resource §6, module-08).
6. **B** — Prevents Layer-2 loops / broadcast storms (resource §7).
7. /26 → 2^(32−26) − 2 = 2^6 − 2 = 62 usable hosts (module-02, resource §2).
8. IP addressing & subnetting, DHCP & DNS, static/dynamic routing, troubleshooting methodology, security basics (module §Written Exam).
9. CompTIA Network+, Cisco CCNA, networking technician roles directly, or specialization in security/cloud/wireless (module §Completion Pathways).

> Difficulty: consolidation (Q1–6), calculation/knowledge (Q7–9).

> Note: the Part 2 written exam is 20 MCQs + 5 short answers + 1 essay; this quiz covers the same topic set at reduced count.