# Module 08 Quiz — Network Security Basics

> **Course:** Network Operations (Part 2) · **Phase 3 — Advanced & Security**
> **Serves:** `part2-module-08-security-basics.md`
> **Source:** `docs/resources/networking/network-security-basics.md`

---

## Multiple Choice

**1.** The CIA triad stands for:

- A. Confidentiality, Integrity, Availability
- B. Certificates, Identity, Access
- C. Control, Integrity, Authentication
- D. Confidentiality, Identity, Authentication

**2.** Which is the #1 attack vector for most breaches?

- A. A misconfigured firewall
- B. Phishing / social engineering (the human is the weakest link)
- C. Unpatched network hardware only
- D. Cable faults

**3.** What is the default firewall rule model recommended in the material?

- A. Allow everything, then block what's bad
- B. Deny by default; explicitly allow what's needed
- C. Block all UDP
- D. Allow all LAN traffic unconditionally

**4.** Which wireless security is recommended (NOT WEP)?

- A. WEP
- B. WPA2/WPA3
- C. Open network
- D. Hidden SSID

**5.** A malware type that encrypts your data and demands payment is:

- A. Spyware
- B. Ransomware
- C. Botnet
- D. Zero-day

**6.** The principle that gives users only the access they need is:

- A. Defense in depth
- B. Least privilege
- C. Multi-factor authentication
- D. Patching

---

## Short Answer

**7.** Name the three parts of the CIA triad and one attack that threatens each.

**8.** List three steps to secure a home/small router.

**9.** What is defense in depth, and why is it better than a single control?

---

## Answer Key

1. **A** — Confidentiality, Integrity, Availability (resource §1, module §CIA).
2. **B** — Phishing/social engineering; the human is the weakest link (resource §3, module §Common Threats).
3. **B** — Deny by default, allow what's needed (resource §5, module §Firewalls).
4. **B** — WPA2/WPA3, never WEP (resource §4, module §Security Discussion).
5. **B** — Ransomware (resource §2, module §Common Threats).
6. **B** — Least privilege (resource §4, module §Defense in Depth).
7. Confidentiality (e.g., packet sniffing), Integrity (e.g., DNS poisoning/altering data), Availability (e.g., DoS) (module §Check for Understanding, resource §2/3).
8. Change default admin credentials, enable WPA2/WPA3 with a long passphrase, update firmware, disable remote admin, disable WPS, review connected devices (resource §6, module §Security Discussion).
9. Layering multiple controls (firewall + strong passwords + patching + antimalware) so no single failure breaks security (module §Defense in Depth, resource §4).

> Difficulty: recall (Q1–6), apply (Q7–9).