# Resource: Cisco NetAcad Curriculum Alignment Map

> Course: shared (both Part 1 & Part 2)
> Maps the three free Cisco Networking Academy courses (Network Technician
> career path) onto Cable&Net Courses modules. These are the main resource
> feeders for building in-depth lesson content.
>
> Feeder courses:
> 1. **Networking Basics** (22 h) — netacad.com/courses/networking-basics
> 2. **Network Addressing and Basic Troubleshooting** (14 h) — netacad.com/courses/network-addressing-and-basic-troubleshooting
> 3. **Network Support and Security** (12 h) — netacad.com/courses/network-support-security

---

## 1. How the Cisco sequence maps to our course

| Cisco course | Role in our course |
|---|---|
| Networking Basics | Foundation: communication, media, OSI/TCP-IP, IPv4/IPv6, DHCP, ARP, routing, TCP/UDP, apps, utilities |
| Network Addressing and Basic Troubleshooting | Physical/Data-Link/Network layer depth, IPv6, Cisco devices, troubleshooting |
| Network Support and Security | Help desk + troubleshooting practice, security basics, access control |

Taken together they align to the **Cisco CCST Networking** certification —
our certification-prep module.

---

## 2. Cabling course (Part 1) coverage

| Our module | Cisco feeder | Cisco module(s) |
|---|---|---|
| 01 OSI & topologies | Networking Basics | M1 Communication, M5 Communication Principles (OSI vs TCP/IP), M7 Access Layer |
| 02 Cabling standards | Networking Basics / Addressing | NetBasics M6 Network Media; Addressing M1 Physical Layer |
| 03 RJ45 connectors | — | Not covered (Cisco covers cable types, not termination) — use our own RJ45 guide |
| 04 Crimping practice | — | Not covered — use our own crimping field guide |
| 05 Crimping marathon | — | Not covered — use our own crimping field guide |
| 06 Troubleshooting | Addressing | M7 Troubleshoot Common Network Problems |
| 07 Devices & Packet Tracer | Addressing | M6 Cisco Switches and Routers |
| 08 Certification prep | All three | CCST-aligned path (badges from each) |
| 09 Final assessment | All three | Checkpoint + final exams in each course |

## 3. Networking course (Part 2) coverage

| Our module | Cisco feeder | Cisco module(s) |
|---|---|---|
| 01 IP addressing | Networking Basics | M8 Internet Protocol, M9 IPv4 & Network Segmentation |
| 02 Subnetting | Networking Basics | M9 IPv4 & Network Segmentation |
| 03 Packet Tracer IP | Addressing | M3 Routing at Network Layer, M6 Cisco Devices |
| 04 DHCP/DNS | Networking Basics | M11 Dynamic Addressing (DHCP), M16 Application Services (DNS) |
| 05 Routing | Networking Basics / Addressing | NetBasics M14 Routing Between Networks; Addressing M3 |
| 06 Troubleshooting methods | Addressing / Support & Security | Addressing M7; SupportSec M1 Diagnostics |
| 07 Troubleshooting labs | Support & Security | M1 Network Support (endpoint/network/remote) |
| 08 Security basics | Support & Security | M2 Cybersecurity Threats/Vulns/Attacks, M3 Network Security |
| 09 Final assessment | All three | Checkpoint + final exams |

---

## 4. Coverage verdict

- **Networking course: 9/9 modules fully covered.**
- **Cabling course: 6/9 covered by Cisco; modules 03–05 (RJ45, crimping,
  marathon) are hands-on termination — covered by our own authored resources**
  (`docs/resources/cabling/rj45-crimping-field-guide.md`,
  `cable-types-and-categories.md`).

> No gap remains after combining Cisco feeders with our authored resources.

---

## 5. How to use this map when authoring lessons

1. Pick a lesson module from the tables above.
2. Open the mapped Cisco module(s) as the factual backbone.
3. Enrich with our resource MDs (pinouts, crimping steps, commands).
4. Follow `lesson-template.md` to produce `module-XX-*.md` / `part2-module-XX-*.md`.

> Cross-references: source-brief-bridgecable-training-bookmarks,
> further-learning-directory, free-network-admin-tools.