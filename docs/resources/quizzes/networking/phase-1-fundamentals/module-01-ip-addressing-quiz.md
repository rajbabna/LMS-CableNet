# Module 01 Quiz — IP Addressing Fundamentals

> **Course:** Network Operations (Part 2) · **Phase 1 — Fundamentals**
> **Serves:** `part2-module-01-ip-addressing.md`
> **Source:** `docs/resources/networking/ip-addressing-and-subnetting.md`

---

## Multiple Choice

**1.** How many bits make up an IPv4 address?

- A. 16
- B. 32
- C. 64
- D. 128

**2.** An IPv4 address is written as:

- A. Four decimal octets (0–255)
- B. Six hex hextets
- C. One long binary string
- D. Two hexadecimal pairs

**3.** The subnet mask determines:

- A. The cable color
- B. How many leading bits belong to the network portion
- C. The MAC address
- D. The DNS server

**4.** Is `192.168.1.1` a private or public address?

- A. Public
- B. Private
- C. Multicast
- D. Experimental

**5.** Which address class is most common for small networks/labs and home?

- A. Class A
- B. Class B
- C. Class C
- D. Class E

**6.** Home routers use which technique to translate private addresses to a single public one?

- A. DHCP
- B. NAT
- C. DNS
- D. VLAN

---

## Short Answer

**7.** Convert `172` to binary (8-bit).

**8.** What is the default gateway, and where is it usually assigned?

**9.** Convert to decimal the octet `10100000` (binary).

---

## Answer Key

1. **B** — IPv4 is 32 bits (resource §1, module §What Is an IP Address).
2. **A** — Four decimal octets 0–255 (module §What Is an IP Address).
3. **B** — Subnet mask marks the network/host boundary (resource §1, module §Address Structure).
4. **B** — 192.168.x.x is a private range (resource §2, module §Private vs Public).
5. **C** — Class C (192–223) = small networks, most common in labs/home (module §Address Classes).
6. **B** — NAT (module §Private vs Public).
7. `10101100` (172 = 128+32+8+4) (module §Lab 1A, 8-bit place table).
8. The default gateway (usually first usable host, e.g., `.1`) is where a device sends traffic destined for other networks (module §Address Structure).
9. `10100000` = 128 + 32 = **160** (module §8-bit place table).

> Difficulty: recall (Q1–6), calculation (Q7–9).