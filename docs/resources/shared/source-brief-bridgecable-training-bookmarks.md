# Source Brief — BridgeCable "Free Network Cabling Training Bookmarks"

> Source: https://www.bridgecable.com/free-network-cabling-training-bookmarks-to-help-you/
> Brief prepared for building in-depth course content for Cable&Net Courses (LMS V2.0).
> Purpose: a catalog of what each free resource offers, and which lesson topics it can feed.

---

## 1. study-ccna.com — Free CCNA Courses

- **What it offers:** Structured, free Cisco CCNA course content.
- **Topics covered:** LAN/WAN, OSI & TCP/IP model, VLANs, Ethernet, switches, routers,
  network utilities (ping, tracert, arp), STP, IP addressing, subnetting,
  routing protocols (RIP, EIGRP, OSPF), WLAN, NAT, ACLs.
- **Usable for course content:**
  - Part 1 (Cabling): OSI/TCP/IP layer context, Ethernet basics.
  - Part 2 (Networking): IP addressing, subnetting, routing, switching, STP, NAT,
    network utilities — directly maps to part2 modules 01–08.

## 2. searchnetworking.techtarget.com — TechTarget Networking

- **What it offers:** Networking resources plus up-to-date industry news.
- **Usable for course content:** Supplementary reading and real-world context
  (industry trends, new tech); useful for "Wrap-Up" and discussion prompts.

## 3. Lantronix — Ethernet Tutorial (Networking Basics)

- **What it offers:** A focused tutorial on networking basics from a global
  IoT / secure data-access vendor.
- **Usable for course content:** Ethernet fundamentals, network basics —
  good grounding material for Part 1 modules on cabling standards and topologies.

## 4. fiberu.org — Fiber Optics Self-Study Program

- **What it offers:** Free, self-paced fiber optics study program.
- **Usable for course content:** Fiber optic fundamentals — cable types,
  connectors, splicing, testing. Candidate for a future dedicated fiber course
  or an enrichment handout.

## 5. cs-study.blogspot.com — Networking Cables and Connections

- **What it offers:** Easy-to-read material specifically about networking cables
  and connections.
- **Usable for course content:** Cable types, connectors, pinouts, wiring
  standards — directly supports Part 1 (cabling) modules 01–06.

## 6. networkcomputing.com — 8 Free Online Networking Classes

- **What it offers:** A curated list of 8 free online networking classes.
- **Usable for course content:** Aggregates other free courses; useful as a
  resource appendix / further-learning list for students.

## 7. cables.com/cablestogo.com — Learning Center Connector Guides (Fiber)

- **What it offers:** Visually strong fiber networking and connector guides.
- **Usable for course content:** Fiber connector types and visuals —
  good for handout cheatsheets (similar to existing t568b pinout cheatsheet).

## 8. bridgecable.com/learning-center — Bridge Cable Learning Center

- **What it offers:** Bridge Cable's own learning center + blog tips (updated
  regularly).
- **Usable for course content:** Real-world installer tips, best practices,
  safety, and industry perspective from an active cabling contractor.

## 9. infoworld.com — Top 10 Free Open-Source Tools for Network Admins

- **What it offers:** Curated list of free/open-source network administration
  tools (monitoring, scanning, etc.).
- **Usable for course content:** Lab tooling for Part 2 (e.g., packet capture,
  ping/traceroute tools, network monitoring) — supports troubleshooting modules.

## 10. en.wikipedia.org — Wikipedia

- **What it offers:** General reference for every networking topic.
- **Usable for course content:** Baseline definitions, cross-checking facts,
  and building glossaries. Always secondary/verification source.

---

## Suggested mapping to existing course structure

| Source | Best fit | Notes |
|---|---|---|
| study-ccna.com | Part 2 modules 01–08 | Backbone for IP/subnetting/routing |
| Lantronix Ethernet tutorial | Part 1 (cabling basics) | Ethernet fundamentals |
| cs-study.blogspot.com | Part 1 modules 01–06 | Cables, connectors, pinouts |
| fiberu.org | Future fiber course / handout | Fiber optics deep-dive |
| cablestogo.com | Handout cheatsheet | Fiber connector visuals |
| bridgecable.com/learning-center | All modules | Installer perspective, tips |
| networkcomputing.com | Appendix / resources | Further-learning list |
| infoworld.com | Part 2 labs (troubleshooting) | Free admin/monitoring tools |
| searchnetworking.techtarget.com | All modules | Industry news, context |
| Wikipedia | All modules | Verification & glossary |

---

## Suggested next step

From this brief, pick a target lesson module (e.g., "Subnetting" or
"RJ45 Connectors") and the source to mine; then generate the lesson bundle MD
(`module-XX-*.md` / `part2-module-XX-*.md`) using the existing
`lesson-template.md` structure.
