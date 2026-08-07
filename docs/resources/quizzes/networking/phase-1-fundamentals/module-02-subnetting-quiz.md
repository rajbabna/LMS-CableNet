# Module 02 Quiz — Subnetting & CIDR Notation

> **Course:** Network Operations (Part 2) · **Phase 1 — Fundamentals**
> **Serves:** `part2-module-02-subnetting.md`
> **Source:** `docs/resources/networking/ip-addressing-and-subnetting.md`, `docs/cablenet-courses-bundle/handout-subnetting-cheatsheet.md`

---

## Multiple Choice

**1.** What is the broadcast address of `192.168.1.0/24`?

- A. 192.168.1.0
- B. 192.168.1.254
- C. 192.168.1.255
- D. 192.168.0.255

**2.** How many usable hosts does a `/26` network support?

- A. 254
- B. 126
- C. 62
- D. 30

**3.** `255.255.255.192` in CIDR notation is:

- A. /24
- B. /25
- C. /26
- D. /27

**4.** The "minus 2" in the host formula `2^(32-prefix) - 2` accounts for:

- A. The gateway and DNS server
- B. The network address and broadcast address
- C. Two spare hosts
- D. The DHCP lease

**5.** Which prefix is the standard for a point-to-point link (router to router)?

- A. /24
- B. /26
- C. /28
- D. /30

**6.** How many usable hosts are in a `/28`?

- A. 30
- B. 14
- C. 62
- D. 6

---

## Short Answer

**7.** Split `192.168.1.0/24` into 4 equal subnets. What is the new prefix and the usable host range of the FIRST subnet?

**8.** Given network `192.168.1.0/24`, what is the usable host range?

**9.** A subnet must hold 30 hosts. What is the smallest prefix that fits?

---

## Answer Key

1. **C** — 192.168.1.255 (all host bits 1) (resource §3).
2. **C** — /26 → 2^6 − 2 = 62 (resource §2, module §CIDR Reference).
3. **C** — 255.255.255.192 = /26 (resource §2).
4. **B** — Network + broadcast addresses are not assignable (resource §2).
5. **D** — /30 gives exactly 2 usable (point-to-point) (resource §5).
6. **B** — /28 → 2^4 − 2 = 14 (resource §5).
7. Borrow 2 bits → /26 (255.255.255.192); first subnet `192.168.1.0/26`, usable `192.168.1.1`–`192.168.1.62` (module §Lab 2B, resource §4).
8. `192.168.1.1` – `192.168.1.254` (254 hosts) (resource §3).
9. /27 (2^5 − 2 = 30 usable) (resource §2, module §Speed Drills).

> Difficulty: recall (Q1–6), calculation/apply (Q7–9).
