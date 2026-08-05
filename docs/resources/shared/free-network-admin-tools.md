# Resource: Free Network Admin Tools — Student Toolkit

> Course: shared (both Part 1 & Part 2)
> Curated from free/open-source network administration tool lists
> (infoworld.com). These are free tools students can install today.

---

## 1. Why a Tool Toolkit?

Learning theory is one thing; being able to **see** packets, ports, and paths is
what turns a student into a technician. All tools below are free / open-source.

---

## 2. Packet Capture & Analysis

| Tool | Platform | Best for |
|---|---|---|
| **Wireshark** | Win / macOS / Linux | The gold standard packet analyzer. See every frame |
| **tcpdump** | Linux/macOS (CLI) | Headless / remote capture from the command line |
| **TShark** | All (CLI) | Wireshark's command-line sibling for scripting |

> Wireshark capture filter tip: `host 8.8.8.8`, `tcp port 443`, `icmp` — filter at
> capture to keep files small.

---

## 3. Scanning & Discovery

| Tool | Best for |
|---|---|
| **Nmap / Zenmap** | Host discovery, open ports, OS & service detection |
| **Angry IP Scanner** | Quick friendly GUI scanning of a small LAN |
| **Advanced IP Scanner** | Simple LAN device discovery (Win) |

> Nmap basics:
> `nmap -sn 192.168.1.0/24` (ping sweep — who's alive)
> `nmap -p 1-1000 192.168.1.50` (scan common ports on one host)

---

## 4. Bandwidth & Monitoring

| Tool | Best for |
|---|---|
| **iperf3** | Generate traffic and measure real throughput between two hosts |
| **ntopng** | Web-based traffic analysis / live flow monitoring |
| **Zabbix / PRTG Free** | Long-term health monitoring, alerts, dashboards |
| **GlassWire** | Desktop traffic monitor (free tier) |

> iperf3 usage (server on host B, client on A):
> `iperf3 -s` on B; `iperf3 -c 192.168.1.50` on A → read the Mbps/Mbit result.

---

## 5. Connectivity & Routing

| Tool | Best for |
|---|---|
| **Putty / Termius / Windows Terminal** | SSH/telnet console access to routers & switches |
| **GNS3** | Real network emulation (Cisco IOS images) for lab practice |
| **Packet Tracer (free for courses)** | Cisco's official teaching simulator — used in Part 2 |

> Packet Tracer is the exact lab simulator referenced by part2 modules 03/07.

---

## 6. Handy CLI Built-ins Worth Mastering First

You already have these — master them before adding tools:

- `ping`, `tracert`/`traceroute`, `pathping`
- `ipconfig` / `ip addr` / `ip route`
- `arp -a`, `netstat -an`, `route print`
- `nslookup` / `dig`, `net`

---

## 7. Responsible Use (lab only)

- Scan **only** hosts you own or have written permission to test.
- Packet capture on your own lab network.
- Monitoring tools should be deployed with the network owner's approval.
  Practising on real production networks without permission is illegal
  everywhere — it's also a skill you lose if you only use a simulator.

---

## 8. Key Takeaways

1. Master the built-ins first (they're on every machine).
2. Wireshark + Nmap + iperf3 cover capture, discovery, and throughput — 90% of labs.
3. Packet Tracer/GNS3 let you practise routing without physical gear.
4. Never scan/capture anything you don't own or have permission for.

> Cross-references: part2 modules 03/06/07 (simulators & labs); cabling labs
> (physical) benefit from ipconfig/ping validation after termination.