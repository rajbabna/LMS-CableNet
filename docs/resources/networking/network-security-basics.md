# Resource: Network Security Basics — Student Reference

> Course: Network Operations — Configuration & Troubleshooting (Part 2)
> Fills networking module 08 (security basics). Derived from Cisco Network
> Support and Security (Modules 2–3): threats, vulnerabilities, and defense.

---

## 1. The Security Triad (CIA)

- **Confidentiality** — only authorized people can read data.
- **Integrity** — data is accurate and unchanged.
- **Availability** — systems are up and usable when needed.

Every security control exists to protect one or more of these.

---

## 2. Common Threats

| Threat | What it is |
|---|---|
| Malware | Software designed to harm: viruses, worms, trojans, ransomware, spyware |
| Phishing / social engineering | Tricking people into revealing credentials or clicking bad links |
| Botnets | Compromised devices used in coordinated attacks |
| Denial of Service (DoS/DDoS) | Flooding a service so it's unavailable |
| Man-in-the-middle | Eavesdropping / altering traffic between two parties |
| Zero-day | Attack on a vulnerability the vendor hasn't patched yet |

---

## 3. Types of Attacks

- **Deception attacks** — spoofing emails, fake websites, pretexting (fake
  identities). Often the entry point.
- **Network attacks** — packet sniffing, ARP spoofing, DNS poisoning, session
  hijacking.
- **Wireless/mobile attacks** — evil twin APs, rogue access points, Bluetooth
  attacks, app-based malware.
- **Application attacks** — SQL injection, cross-site scripting (XSS), buffer
  overflow, privilege escalation.

> Rule: **the human is often the weakest link** — most breaches start with a
> phishing email, not a firewall.

---

## 4. Defense Foundations

1. **Access Control** — authenticate (who), authorize (what), and audit (log).
   Principle of **least privilege**: give users only the access they need.
2. **Patch management** — keep OS and apps updated; most attacks exploit known,
   already-patched holes.
3. **Strong credentials** — long passphrases + multi-factor authentication (MFA).
4. **Antimalware** — signature-based + behaviour/heuristic detection on endpoints.
5. **Firewalls** — filter traffic between networks by rule (allow/deny IPs,
   ports, protocols).
6. **Host-based intrusion prevention (HIPS)** — monitors a single endpoint for
   malicious behaviour.
7. **Secure wireless** — WPA2/WPA3 (never WEP), hidden SSID is not security,
   disable WPS, strong passphrase, change default admin credentials.

---

## 5. Firewall Basics

| Type | Where | What it does |
|---|---|---|
| Host firewall | On the endpoint | Filters that device's traffic |
| Network firewall | Between networks | Filters all traffic crossing the boundary |
| Next-gen firewall (NGFW) | Network edge | Adds app awareness, intrusion prevention, TLS inspection |

Rule model (simplified): **Source IP : Port → Dest IP : Port → Action**
(allow/deny). Default should be **deny**; explicitly allow what's needed.

---

## 6. Securing User Access on a Home/Small Router (lab task)

1. Change the **default admin username/password** immediately.
2. Enable **WPA2/WPA3** with a long passphrase.
3. Update the router **firmware**.
4. Disable remote admin access from the internet.
5. Set a strong router admin password + change the default SSID.
6. Review connected-device lists for unknown hosts.

---

## 7. Help Desk & Support Perspective (mod 08 context)

- **Document** every ticket: symptom, tests run, resolution (repeatable
  troubleshooting).
- Verify a device before trusting it: check for unexpected network connections,
  installed software, and login events.
- Escalate suspected security incidents (phishing, ransomware) per policy —
  do NOT "just fix it" silently.

---

## 8. Key Takeaways

1. CIA triad → every control maps to confidentiality, integrity, or availability.
2. Human error / phishing is the top attack vector.
3. Least privilege + patching + MFA cover most real-world risk.
4. WPA3/WPA2, not WEP; change defaults; default-deny firewalls.
5. Support work needs documentation and an incident-escalation mindset.

> Cross-references: part2-module-08 (security basics), part2-module-06/07
> (troubleshooting labs), Cisco Network Support and Security modules 2–3.