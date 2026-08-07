# Module 07 Quiz — Troubleshooting Practicals (Broken Networks)

> **Course:** Network Operations (Part 2) · **Phase 3 — Advanced & Security**
> **Serves:** `part2-module-07-troubleshooting-labs.md`
> **Source:** `docs/resources/networking/network-utilities-and-troubleshooting.md`

---

## Multiple Choice

**1.** If local pings work but REMOTE pings fail, what should you check FIRST?

- A. DNS
- B. The default gateway configuration
- C. The copper cable only
- D. The application layer

**2.** In Scenario 1 (4 PCs, 1 switch), 2 PCs have IPs on the wrong subnet. The correct fix is:

- A. Reboot the switch
- B. Change the wrong IPs to the correct subnet, then verify with ping
- C. Add a router
- D. Enable DHCP only

**3.** A missing default gateway shows up as which symptom?

- A. Nothing can ping locally
- B. Local pings work, remote pings fail
- C. DNS fails
- D. The switch floods

**4.** To confirm DNS vs. routing, you would test:

- A. Ping by IP vs. ping by name
- B. Only arp -a
- C. Only netstat
- D. Reboot the device

**5.** Which command reads the local routing table to spot a misconfigured route?

- A. route print (Win) / ip route (Lin)
- B. nslookup
- C. ipconfig /flushdns
- D. pathping

**6.** In the "ping outward" flow, after local ping OK and gateway ping OK, the next test is:

- A. ping a remote IP
- B. ping yourself again
- C. reboot the switch
- D. ping the cable

---

## Short Answer

**7.** How would you confirm a DNS problem vs. a routing problem?

**8.** Describe one intentional problem you'd design for a peer to solve.

**9.** Why is it important to document every troubleshooting scenario (symptom, tests, fix)?

---

## Answer Key

1. **B** — Local OK / remote fail → check gateway config first (module §Scenario 2).
2. **B** — Correct the IP to the right subnet, verify with ping (module §Scenario 1).
3. **B** — Local pings work, remote pings fail (module §Scenario 2).
4. **A** — Ping by IP works, by name fails = DNS; not a routing/connectivity issue (module §Scenario 4, resource §4).
5. **A** — route print (Win) / ip route (Lin) (resource §2, module §Scenario 3).
6. **A** — After gateway OK, ping a remote IP (module §Setup, resource §4).
7. If ping by IP works but ping by name fails → DNS. If ping by IP to a remote subnet fails but local/gateway works → routing/gateway (module §Scenario 3 & 4, resource §4).
8. Example: one PC with a wrong subnet IP, or a missing default gateway, or a broken DNS server — fixed by adding it and verifying. (module §Scenario 5 / §Check for Understanding).
9. Real support tickets require symptom → tests → fix records; it makes fixes repeatable and speeds up future incidents (module §Wrap-Up, resource §8).

> Difficulty: recall (Q1–6), apply scenario (Q7–9).