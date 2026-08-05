# OpenCode Token Optimization & Inspection Guide

A complete guide to optimizing token usage, reducing context overhead, and inspecting API payloads when running **OpenCode** with **DeepSeek V4 Flash** inside **Antigravity IDE**.

---

## 📑 Table of Contents
1. [Overview](#overview)
2. [Why OpenCode Consumes High Tokens](#why-opencode-consumes-high-tokens)
3. [Token Optimization Strategies](#token-optimization-strategies)
4. [Configuring OpenCode for DeepSeek V4 Flash](#configuring-opencode-for-deepseek-v4-flash)
5. [Antigravity IDE Integration](#antigravity-ide-integration)
6. [Inspecting & Logging Raw API Payloads](#inspecting--logging-raw-api-payloads)
7. [Recommended Workflow Summary](#recommended-workflow-summary)

---

## 1. Overview

OpenCode is a powerful terminal-based AI coding agent. However, by default, it includes extensive system prompts, tool schemas, and environment metadata that can consume **10,000+ tokens per request** before you even submit your code query.

When paired with **DeepSeek V4 Flash** in **Antigravity IDE**, optimizing this context window ensures:
* **Lower Latency:** Faster turnaround on code generation.
* **Higher Cache Hits:** Maximize DeepSeek's native prefix/context caching.
* **Cost Efficiency:** Drastically lower input/output token counts.

---

## 2. Why OpenCode Consumes High Tokens

| Cause | Impact | Solution |
| :--- | :--- | :--- |
| **Heavy Tool Schemas** | Detailed tools (Bash, Task, Web Search) add thousands of characters per prompt. | Create minimal agents with reduced tool access. |
| **Workspace Metadata Leakage** | `.git/`, `.antigravity/`, `node_modules/`, and build folders get scanned into context. | Configure ignore patterns in `opencode.json`. |
| **Verbose Output** | Conversational preamble ("Sure, here is the code...") burns unnecessary output tokens. | Add system directives forcing compact unified diffs. |
| **Uncached System Prompts** | Changing system prompts or agent rules mid-session invalidates provider cache keys. | Keep base configurations static across sessions. |

---

## 3. Token Optimization Strategies

### A. Define Minimal Custom Agents
Instead of using the heavy default `Build` agent for every quick question, create a lightweight agent inside `.opencode/agents/flash-lite.md`:

```markdown
---
mode: primary
model: opencode/deepseek-v4-flash-free
description: Minimal-context agent for fast edits and Q&A inside Antigravity.
tools:
  - read
  - edit
---

You are a concise coding assistant. Respond directly with unified diffs/patches when modifying code. Skip conversational introductions and conclusions.
```

> **Usage:** Press `Tab` in the OpenCode TUI inside your Antigravity IDE terminal to cycle between agents.

---

### B. Ignore Non-Essential Directories
Prevent build outputs, dependencies, and IDE metadata from being indexed into the conversation buffer.

Add the following to your global or project `opencode.json`:

```json
{
  "context": {
    "ignorePatterns": [
      "**/.antigravity/**",
      "**/.antigravity-ide/**",
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/*.lock",
      "**/coverage/**"
    ]
  }
}
```

---

## 4. Configuring OpenCode for DeepSeek V4 Flash

Here is a context-optimized `.opencoderc` / `opencode.json` tailored for **DeepSeek V4 Flash**:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/deepseek-v4-flash-free",
  "permission": {
    "allow": [
      "bash",
      "edit",
      "read"
    ]
  },
  "context": {
    "ignorePatterns": [
      "**/.antigravity/**",
      "**/.antigravity-ide/**",
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/*.lock"
    ]
  }
}
```

---

## 5. Antigravity IDE Integration

When running OpenCode in the integrated terminal of Antigravity IDE:

1. **Exclude Antigravity Artifacts:** Ensure `**/.antigravity/**` and `**/.antigravity-ide/**` are strictly listed under `ignorePatterns`.
2. **Leverage Dual Terminals:** Use standard Antigravity features for inline workspace actions, and execute OpenCode in the built-in terminal for deep file edits.
3. **Keep Context Static:** Maintain persistent session histories so DeepSeek V4 Flash hits its prefix-caching thresholds (~80-90% discount on input tokens).

---

## 6. Inspecting & Logging Raw API Payloads

To verify how many tokens your setup is sending and receiving, you can inspect the raw JSON payloads using one of four methods:

### Method 1: OpenCode Debug Logs *(Recommended)*
The simplest and most reliable method. Built-in, zero configuration, and accurate.

* **Launch with debug logging:**
  ```bash
  opencode --log-level DEBUG --print-logs 2> opencode_debug.log
  ```
* **Tail the logs in a separate Antigravity terminal pane:**
  ```bash
  tail -f ~/.local/share/opencode/log/*.log | grep -i "deepseek"
  ```

---

### Method 2: Environment Variable Tracing
Output provider SDK traffic directly to stdout/stderr:

```bash
# Debug all OpenCode operations
DEBUG=opencode:* opencode

# Or debug provider SDK payload transmissions
DEBUG=ai:* opencode
```

---

### Method 3: MITM Intercept Proxy
For capturing, parsing, and measuring raw HTTP payload bytes in real time using `mitmproxy`.

1. **Create intercept script (`dump_payloads.py`):**
   ```python
   import json
   from mitmproxy import http

   def request(flow: http.HTTPFlow):
       if "deepseek" in flow.request.pretty_url or "api.deepseek.com" in flow.request.pretty_url:
           print("\n=== OUTGOING DEEPSEEK PAYLOAD ===")
           try:
               data = json.loads(flow.request.get_text())
               print(json.dumps(data, indent=2))
           except Exception:
               print(flow.request.get_text())
   ```
2. **Launch proxy and route OpenCode:**
   ```bash
   mitmdump -s dump_payloads.py
   export HTTPS_PROXY="http://127.0.0.1:8080"
   opencode
   ```

---

### Method 4: Local Gateway Proxy (LiteLLM)
Route requests through a local proxy server to inspect and cache payloads.

1. **Start LiteLLM locally:**
   ```bash
   litellm --model opencode/deepseek-v4-flash-free --detailed_debug
   ```
2. **Update `opencode.json`:**
   ```json
   {
     "providers": {
       "deepseek": {
         "baseURL": "http://127.0.0.1:4000/v1"
       }
     }
   }
   ```

---

## 7. Recommended Workflow Summary

| Task | Recommended Tool / Setting |
| :--- | :--- |
| **Default Model** | DeepSeek V4 Flash (`opencode/deepseek-v4-flash-free`) |
| **Quick Edits / Single-File Q&A** | Custom `flash-lite` agent (`.opencode/agents/flash-lite.md`) |
| **Heavy Refactoring / Terminal Exec** | Primary `Build` agent |
| **Payload Inspection** | `opencode --log-level DEBUG` (Method 1) |
| **Context Pruning** | `opencode-dynamic-context-pruning` plugin |
