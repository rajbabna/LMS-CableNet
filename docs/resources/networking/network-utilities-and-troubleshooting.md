# Resource: Network Utilities & Troubleshooting — Command Reference

> Course: Network Operations — Configuration & Troubleshooting (Part 2)
> Supports part2 modules 04 (DHCP/DNS), 06 (troubleshooting methods),
> 07 (troubleshooting labs); utilities from study-ccna.com + free admin tools.

---

## 1. The Troubleshooting Method (never guess)

1. **Define the problem** — what exact symptom? One device or the whole network?
2. **Gather information** — ping, ipconfig, traceroute; see logs for the exact error.
3. **Verify/reach logical top half** — is it Layer 1–3 or Layer 4–7 (application)?
4. **Test a hypothesis** — fix one thing at a time; note results.
5. **Verify the fix and check nothing else broke.**
6. **Document** and, if it recurs, compare future runs to this baseline.

> Use the "ping outward" rule: ping yourself (127.0.0.1), then your IP, then your
> gateway, then a far address. Where the ping stops, that's where the problem lives.

---

## 2. Core Command Toolkit

| Command | What it tells you |
|---|---|
| `ipconfig /all` (Win) / `ip addr` (Lin) | IP, mask, gateway, DNS, DHCP lease |
| `ping <host>` | Reaches the host? Latency, packet loss |
| `tracert <host>` (Win) / `traceroute` (Lin) | Path & hops to the host |
| `arp -a` | IP-to-MAC table on this device |
| `nslookup <name>` / `dig <name>` | DNS resolution |
| `netstat -an` | Open/established connections & listening ports |
| `pathping <host>` (Win) | Combines tracert + packet-loss stats per hop |
| `route print` (Win) / `ip route` (Lin) | The local routing table |

---

## 3. Reading a Ping / Traceroute

```
PING 8.8.8.8: 64 bytes from 8.8.8.8: icmp_seq=1 ttl=57 time=12.1 ms
```
- **time** = round-trip latency (ms). Rising/oscillating = congestion or bad link.
- **packet loss %** — any loss at a hop = a weak link (but some hops drop ICMP by design).

`tracert` shows each **hop**; `* * *` at a hop usually means a router that doesn't
answer ICMP (it can still forward fine) — don't assume it's broken.

---

## 4. Where It Stops = Where the Bug Is (ping-outward)

| Test | Result → Meaning |
|---|---|
| ping 127.0.0.1 | Fails → TCP/IP stack / drivers. (rarely fails) |
| ping own IP | Fails → interface not up / wrong IP. |
| ping default gateway | Fails → Layer 1/2 problem (cable, port, VLAN, DHCP). |
| ping remote IP | Fails after gateway OK → routing/firewall/WAN. |
| ping remote hostname | Fails but ping IP works → DNS problem. |

---

## 5. DHCP Troubleshooting (part2 mod 04)

Symptoms: device gets **169.254.x.x** (APIPA) or no IP at all.

Check in order:
1. **Is the DHCP scope active & has addresses?** (renew with `ipconfig /release`+`/renew`).
2. **Layer 2:** Is the access port in the right VLAN? VLAN mismatches block DHCP.
3. **DHCP relay / helper-address:** needed if the server is on another subnet.
4. **IP helper / config on switch/router** points at the correct server.
5. **Firewall/security:** Is DHCP (UDP 67/68) allowed?

---

## 6. DNS Troubleshooting (part2 mod 04)

Symptom: "www.site.com can't be found" but ping IP works.

Check in order:
1. **DNS client set** (`ipconfig /all`) — not pointing at a dead server.
2. **Resolution with `nslookup`** — server answers? incorrect TTL caching?
3. **Wrong server** — corporate DNS needed for internal names.
4. **DNS cache** — flush with `ipconfig /flushdns`.
5. Confirm the forwarder chain (device -> internal DNS -> root/external).

---

## 7. SQLite-level speed tips for consistent results

- Always **change one variable at a time** so you can attribute the result.
- Capture a **baseline** for normal hours to compare during an incident.
- Testing **at both ends** (source and destination) rapidly separates "my side"
  from "their side".

---

## 8. Key Takeaways

1. Troubleshoot **outer"outward-top-to-bottom"**: physical, IP, gateway, routing, DNS, app.
2. A cable/port fault shows as a dead **gateway** ping — not a config problem above it.
3. APIPA `169.254.x.x` = no DHCP answer.
4. DNS vs IP: if you can ping the IP but not the name, it's name resolution, not connectivity.

> Cross-references: part2-module-04 (DHCP/DNS), 06 (troubleshooting methods),
> 07 (troubleshooting labs).