# Module 06 Quiz — Troubleshooting Methodology & Tools

> **Course:** Network Operations (Part 2) · **Phase 2 — Operations & Configuration**
> **Serves:** `part2-module-06-troubleshooting-methods.md`
> **Source:** `docs/resources/networking/network-utilities-and-troubleshooting.md`

---

## Multiple Choice

**1.** The "ping outward" rule says the FIRST ping test should be:

- A. A far website
- B. Yourself (127.0.0.1)
- C. The default gateway
- D. The DNS server

**2.** If `ping 127.0.0.1` fails, the problem is:

- A. The cable
- B. TCP/IP stack / drivers
- C. Routing
- D. DNS

**3.** If pinging the default gateway fails, the problem is likely at:

- A. Layer 1/2 (cable, port, VLAN, DHCP)
- B. Layer 7 (application)
- C. DNS
- D. The internet

**4.** Which command shows the path and hops to a remote host?

- A. ipconfig
- B. tracert
- C. netstat
- D. nslookup

**5.** Which command reveals the IP, mask, gateway, and DNS on a Windows device?

- A. ipconfig /all
- B. arp -a
- C. pathping
- D. route print

**6.** In `tracert`, three asterisks (`* * *`) at a hop usually mean:

- A. The network is down
- B. A router that doesn't answer ICMP (can still forward)
- C. DNS failure
- D. The hop is too slow to exist

---

## Short Answer

**7.** Walk through the 6-step troubleshooting framework from memory.

**8.** A user can't reach a website. List the first steps in order to isolate the problem.

**9.** How do you confirm a DNS problem vs. a connectivity problem?

---

## Answer Key

1. **B** — Ping yourself (127.0.0.1) first (module §Ping Outward, resource §4).
2. **B** — TCP/IP stack / drivers (resource §4, module §Ping Outward).
3. **A** — Layer 1/2 problem (cable, port, VLAN, DHCP) (resource §4, module §Ping Outward).
4. **B** — tracert (Win) / traceroute (Lin) (resource §2, module §Diagnostic Tools).
5. **A** — ipconfig /all (resource §2, module §Diagnostic Tools).
6. **B** — Routers that don't answer ICMP still forward — don't assume broken (resource §3).
7. Gather info → form/test hypothesis → isolate (OSI-style) → implement solution → verify → document (module §Troubleshooting Framework, resource §1).
8. Ping the gateway → ping the DNS server → run nslookup → trace the failure point in the chain (module §Scenario Analysis).
9. Ping by IP works but ping by name fails → DNS problem, not connectivity (resource §6, module §Scenario 4 / §DNS hint).

> Difficulty: recall (Q1–6), methodology (Q7–9).