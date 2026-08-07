# Module 05 Quiz — Routing Fundamentals

> **Course:** Network Operations (Part 2) · **Phase 2 — Operations & Configuration**
> **Serves:** `part2-module-05-routing.md`
> **Source:** `docs/resources/networking/routing-and-switching.md`

---

## Multiple Choice

**1.** What is the difference between switching and routing?

- A. Switching is wireless; routing is wired
- B. Switching moves traffic within one network; routing moves it between networks
- C. Switching uses IP; routing uses MAC
- D. There is no difference

**2.** A routing table lists:

- A. Known destination networks and how to reach them
- B. MAC addresses of all devices
- C. DNS records
- D. DHCP leases

**3.** A default gateway is where a device sends traffic when:

- A. The destination is on its local network
- B. The destination isn't on its local network
- C. DHCP fails
- D. The cable is broken

**4.** Which routing protocol is the industry-standard enterprise workhorse?

- A. RIP
- B. BGP
- C. OSPF
- D. ARP

**5.** When a router has multiple routes to the same network, it prefers:

- A. The shortest cable
- B. The longest (most specific) matching route
- C. The first route added
- D. The fastest MAC

**6.** What happens if a static route is missing or misconfigured?

- A. Nothing; routing is automatic
- B. Traffic to that network fails or takes a bad path
- C. DHCP breaks
- D. The switch reboots

---

## Short Answer

**7.** Explain the "longest match" rule for choosing a route.

**8.** What is a static route, and when is it preferred over dynamic routing?

**9.** Name one routing protocol that is distance-vector and one that is link-state.

---

## Answer Key

1. **B** — Switching within, routing between networks (module §What Is Routing, resource §1).
2. **A** — Known destination networks + how to reach them (module §What Is Routing).
3. **B** — Destination not on the local network (module §What Is Routing).
4. **C** — OSPF (resource §4, module §Routing protocol map).
5. **B** — Longest (most specific) match wins (resource §3, module §How a Router Picks a Path).
6. **B** — Traffic to that network fails/misroutes (module §Lab 5C, §Check for Understanding).
7. Router picks the most specific (longest prefix) matching route in the table, then forwards via that interface/next hop (resource §3, module §How a Router Picks a Path).
8. Static = manually configured, predictable, doesn't adapt — preferred for simple/small predictable networks (module §Static vs Dynamic).
9. Distance-vector: RIP (hop count, max 15). Link-state: OSPF (cost, SPF) (resource §4, module §protocol map).

> Difficulty: recall (Q1–6), explain/apply (Q7–9).