# Resource: Routing & Switching Fundamentals — Student Reference
> Course: Network Operations — Configuration & Troubleshooting (Part 2)
> Supports part2 modules 03 (packet-tracer IP), 05 (routing), and routing
> concepts from study-ccna.com.
---

## 1. The Difference: Switch vs Router

| Device | Layer | Job | Key behaviour |
|---|---|---|---|
| Switch | 2 (Data Link) | Signs; forwards frames by MAC address within a LAN/VLAN | Maintains a MAC address table |
| Router | 3 (Network) | Routes packets between networks by IP address | Maintains a routing table |

- **Switches** segment a single network (more bandwidth per segment).
- **Routers** connect separate networks and choose the best path.

---

## 2. How a Switch Forwards Frames

1. Receives a frame; records the source MAC -> port (learn).
2. Looks up destination MAC.
   - **Known:** forwards out only that port (forward/filter).
   - **Unknown:** **floods** out all ports except the source (toward the destination).
3. Broadcast/multicast frames are also flooded.

That MAC table is what makes a switch efficient — one switch can carry full
bandwidth to many ports simultaneously.

---

## 3. How a Router Selects a Path

1. Router examines the destination IP in the packet.
2. Finds the **longest (most specific) matching route** in its routing table.
3. Forwards the packet out the matching interface / next hop.

The routing table is built two ways:
- **Static routes** — configured by hand.
- **Dynamic protocols** — router learns routes by talking to neighbours.

---

## 4. Routing Protocols Quick Map

| Protocol | Type | Metric | Distance-vector | Typical use |
|---|---|---|---|---|
| RIP | Distance-vector | Hop count (max 15) | Yes | Small legacy networks |
| EIGRP | Advanced distance-vector | Composite (bandwidth/delay) | No (hybrid) | Cisco enterprise |
| OSPF | Link-state | Cost (based on bandwidth) | No | Enterprise, scalable, industry common |
| BGP | Path-vector | Path attributes | No | Internet routing between ASes |

- **Distance-vector:** "I know the direction + distance to each network (tell your
  neighbours)."
- **Link-state:** every router knows the whole network topology (build a map) and
  runs SPF to compute shortest paths.

---

## 5. Administrative Distance (which route wins first)

When a router has multiple routes to the same network, it uses **AD** (lower wins)
to prefer the "more trusted" source, then the metric.

| Source | Default AD |
|---|---|
| Connected interface | 0 |
| Static route | 1 |
| EIGRP | 90 |
| OSPF | 110 |
| RIP | 120 |

---

## 6. VLANs (why switches aren't one big flat network)

- VLANs split a physical switch into multiple **logical Layer-2 networks**,
  isolating traffic (security + performance).
- Frames carry a **802.1Q VLAN tag** between switches.
- **Trunk links** carry many VLANs; **access ports** carry one untagged VLAN.
- Routing between VLANs happens at Layer 3 (router-on-a-stick or L3 switch).

Example: VL10-Marketing (192.168.10.0/24), VL20-Sales (192.168.20.0/24).

---

## 7. STP: Why Broadcast Storms Don't Melt a Switch

- **STP (Spanning Tree Protocol)** prevents Layer-2 loops.
- It builds a loop-free tree: one **root bridge**, blocked ports are put in
  Blocking state.
- If a link fails, STP recomputes and unblocks a path automatically.

---

## 8. Key Takeaways

1. Switch = MAC, inside the network; Router = IP, between networks.
2. Longest-match routing + AD (trust) + metric (cost) = the winning route.
3. OSPF is the enterprise workhorse; BGP is the internet.
4. VLANs isolate traffic; trunks carry multiple VLANs between switches.
5. STP keeps redundant topologies loop-free.

> Cross-references: part2-module-03 (packet-tracer IP), 05 (routing),
> 07 (troubleshooting labs).