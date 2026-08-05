# Resource: IP Addressing & Subnetting — Student Deep-Dive

> Course: Network Operations — Configuration & Troubleshooting (Part 2)
> Core reference for part2 modules 01 (IP addressing) and 02 (subnetting),
> derived from free CCNA learning (study-ccna.com) concepts.

---

## 1. Why IPv4 Needs Subnetting

An IPv4 address is a 32-bit number, written as four octets (0–255) for humans:
```
192.168.1.10
```
An address has two logical parts:
- **Network portion** — identifies the network.
- **Host portion** — identifies a specific device on that network.

The **subnet mask** tells you how many leading bits belong to the network part.

---

## 2. Subnet Masks & CIDR

| Notation | Address | Subnet mask | Network bits | Host bits | Usable hosts |
|---|---|---|---|---|---|
| /8 | 255.0.0.0 | 8 | 24 | 16,777,214 |
| /16 | 255.255.0.0 | 16 | 16 | 65,534 |
| /24 | 255.255.255.0 | 24 | 8 | 254 |
| /25 | 255.255.255.128 | 25 | 7 | 126 |
| /26 | 255.255.255.192 | 26 | 6 | 62 |
| /27 | 255.255.255.224 | 27 | 5 | 30 |

**Host formula:** usable hosts = **2^(32 - prefix) - 2** (the "minus 2" = network
address plus broadcast address).

---

## 3. Special Addresses on Any Subnet

Given network `192.168.1.0/24`:
- **Network address:** `192.168.1.0` (all host bits 0)
- **Broadcast address:** `192.168.1.255` (all host bits 1)
- **Usable range:** `192.168.1.1` – `192.168.1.254`
- **Gateway** (default gateway) is usually the first usable host → `192.168.1.1`

---

## 4. Subnetting Step-by-Step (method)

**Task:** break `192.168.1.0/24` into 4 equal subnets for 4 departments
(Accounting, Sales, Support, Backend), each 60 usable hosts.

1. Find borrow bits: we need 4 subnets → **2^2 = 4 → borrow 2 host bits**.
2. New prefix: /24 + 2 = **/26** (mask 255.255.255.192).
3. Host bits = 32 − 26 = 6 → usable = 2^6 − 2 = **62 hosts** each (plenty for 30).
4. Block size = 2^(6) = 64.
   - Subnet ports start at 0, increment by 64:
     - `192.168.1.0`  /26 → usable `192.168.1.1`–`192.168.1.62`
     - `192.168.1.64` /26 → usable `192.168.1.65`–`192.168.1.126`
     - `192.168.1.128` /26 → usable `192.168.1.129`–`192.168.1.190`
     - `192.168.1.192` /26 → usable `192.168.1.193`–`192.168.1.254`

---

## 5. Quick Reference Tables

**Hosts by prefix (for common /24–/30):**

| Prefix | Mask | Block | Usable hosts |
|---|---|---|---|
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 (point-to-point) |

**A /30 is the standard for a point-to-point link** (router to router) — only 2
usable addresses.

---

## 6. IPv6 in One Minute

- 128-bit address, written in **hextets** separated by colons:
  `2001:db8::1`.
- No broadcast; uses **multicast / anycast** instead.
- Auto-configuration via **SLAAC**; loopback is `::1`.
- `::` collapses consecutive zero groups (only once per address).

---

## 7. Practical Tips

1. **Always reserve the gateway** (often `.1`) for routers/access points.
2. **Never assign the network or broadcast address to a device.**
3. Use a consistent scheme: e.g. `192.168.10.x` for LAN, `.1` gateway, `.2–.10`
   servers, DHCP scope `.100–.200` for clients.
4. When a subnet must hold N hosts, always compute
   `2^(32 - mask) - 2 ≥ N` — then round up to the next clean block.

> Cross-references: part2-module-01 (IP addressing), 02 (subnetting),
> handout-subnetting-cheatsheet.