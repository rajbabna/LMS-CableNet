[← Back to START-HERE](./START-HERE.md) · See also: [MODULES-QUICK-REFERENCE.md](./MODULES-QUICK-REFERENCE.md) for a one-page cheat sheet

# Dynamic Module Loading - Step-by-Step Guide

## What You're Getting

You now have fully dynamic course pages! The module list on each course page loads from your Supabase `modules` table instead of being hardcoded in HTML.

**Before:** Modules were hardcoded in HTML. To add/change anything, you'd edit the HTML file.  
**After:** Modules come from Supabase. You manage them in the database, zero code changes.

---

## Files Updated/Created

| File | What Changed |
|------|---|
| `course-cabling.html` | Removed hardcoded modules, added dynamic loading |
| `course-networking.html` | Removed hardcoded modules, added dynamic loading |
| `js/load-modules.js` | NEW — fetches and renders modules from Supabase |

---

## How It Works (30-Second Overview)

1. Student logs in → visits `course-cabling.html`
2. Page loads, runs `load-modules.js`
3. Script queries: "Give me all modules where `course_id = 'cabling'`"
4. Supabase returns 4 modules (Cable types, T568A/B, Testing, Structured cabling)
5. Script loops through them, creates `<li>` elements, inserts into `.module-list`
6. Student sees a fully populated module list, all from the database

Same happens for the networking course — just filters by `course_id = 'networking'`.

---

## Setup (You Already Have This)

Your Supabase `modules` table already has sample data:

```
Course: cabling
├─ MOD 01: Cable types & standards
├─ MOD 02: T568A / T568B termination
├─ MOD 03: Testing & certification
└─ MOD 04: Structured cabling practice

Course: networking
├─ MOD 01: Network fundamentals
├─ MOD 02: IP addressing
├─ MOD 03: Switching & routing basics
└─ MOD 04: Troubleshooting connections
```

Each module has:
- `module_number` (1, 2, 3, 4)
- `title` (the lesson name)
- `description` (optional, shown under title)
- `content_type` ("pdf", "video", "interactive", "text", "lesson")
- `content_url` (link to the actual lesson)

---

## Now You Can...

### ✅ Add a Module

1. Go to Supabase → **Table Editor** → **modules**
2. Click **"Insert row"**
3. Fill in:
   - `course_id`: "cabling" or "networking"
   - `module_number`: next number in sequence (if cabling has 4 mods, add 5)
   - `title`: "Your lesson title"
   - `description`: (optional) "Brief description"
   - `content_type`: "pdf", "video", "interactive", "text", or "lesson"
   - `content_url`: link to your lesson (PDF URL, video link, etc.)
4. Click **Save**
5. Refresh the course page → new module appears instantly ✨

### ✅ Edit a Module

1. Supabase → **Table Editor** → **modules**
2. Click the row you want to change
3. Edit any field (title, URL, etc.)
4. Click **Save**
5. Refresh the page → changes appear instantly

### ✅ Remove a Module

1. Supabase → **Table Editor** → **modules**
2. Right-click the row → **Delete row**
3. Refresh the page → module vanishes

### ✅ Reorder Modules

Change the `module_number` in Supabase. The script sorts by `module_number`, so just update the numbers and refresh.

Example:
- MOD 01 → change to MOD 04 (moves it to the end)
- MOD 02 → change to MOD 01 (moves to start)
- Refresh → reordered!

---

## What the `load-modules.js` Script Does

```javascript
// Called when page loads:
loadModulesForCourse('cabling');  // or 'networking'

// Script:
// 1. Queries Supabase: SELECT * FROM modules WHERE course_id = 'cabling'
// 2. Receives array of module objects
// 3. For each module:
//    ├─ Create <li> element
//    ├─ Set mod tag (MOD 01, MOD 02, etc.)
//    ├─ Set title + description
//    ├─ Create link with content_url
//    ├─ Append to .module-list
// 4. Done
```

The script also:
- **Changes the link text** based on content type:
  - PDF → "open pdf"
  - Video → "watch video"
  - Interactive → "launch tool"
  - Text → "read article"
  - Lesson → "open lesson" (default)
- **Opens links in a new tab** (`target="_blank"`)
- **Shows descriptions** if you provided them

---

## Sample Module Data (What You Have Now)

These were inserted when you ran the SQL schema:

### Cabling Course Modules
```
course_id: cabling
├─ module_number: 1
│  title: Cable types & standards
│  description: Learn about UTP, STP, and fiber optic cables
│  content_type: pdf
│  content_url: https://example.com/lessons/cable-types.pdf
│
├─ module_number: 2
│  title: T568A / T568B termination
│  description: Master the wiring standards for RJ45 connectors
│  content_type: interactive
│  content_url: https://yoursite.com/lessons/termination-simulator
│
├─ module_number: 3
│  title: Testing & certification
│  description: How to test cables and obtain certification
│  content_type: video
│  content_url: https://youtube.com/watch?v=example
│
└─ module_number: 4
   title: Structured cabling practice
   description: Hands-on practice with real cabling scenarios
   content_type: lesson
   content_url: https://example.com/lessons/structured-cabling
```

### Networking Course Modules
```
course_id: networking
├─ module_number: 1
│  title: Network fundamentals
│  description: OSI model, TCP/IP stack, network types
│  content_type: pdf
│  content_url: https://example.com/lessons/network-fundamentals.pdf
│
├─ module_number: 2
│  title: IP addressing
│  description: IPv4, IPv6, subnetting, CIDR notation
│  content_type: interactive
│  content_url: https://yoursite.com/lessons/ip-addressing-calc
│
├─ module_number: 3
│  title: Switching & routing basics
│  description: VLANs, switching basics, routing protocols
│  content_type: video
│  content_url: https://youtube.com/watch?v=example
│
└─ module_number: 4
   title: Troubleshooting connections
   description: Diagnostic tools, common issues, solutions
   content_type: lesson
   content_url: https://example.com/lessons/troubleshooting
```

**These are just examples.** Replace the URLs with links to your actual lesson materials.

---

## Updating Sample URLs to Your Content

### Step 1: Identify Your Content

You need to prepare:
- PDF files for lectures
- Video links (YouTube, Vimeo, etc.)
- Interactive tools (Packet Tracer simulator, calculators, etc.)
- HTML lessons or articles

### Step 2: Host Them

You have several options:
- **PDFs:** Upload to your web server, GitHub, or Google Drive (public link)
- **Videos:** Host on YouTube, Vimeo, etc.
- **Interactive tools:** Host on your server or GitHub Pages
- **HTML lessons:** Host on your server or GitHub Pages

### Step 3: Update the URLs in Supabase

1. Go to Supabase → **Table Editor** → **modules**
2. Click each row's `content_url` field
3. Replace example URL with your actual link
4. Save

Example:
- Before: `https://example.com/lessons/cable-types.pdf`
- After: `https://github.com/rajbabna/cable-net/raw/main/lessons/cable-types.pdf`

Or if hosting on your site:
- After: `https://cablenetcourses.example.com/lessons/cable-types.pdf`

---

## Troubleshooting

### Q: Modules don't appear on the course page
**A:** 
1. Check browser console (F12 → Console)
2. Look for errors in `load-modules.js`
3. Most common: course_id in Supabase doesn't match ("cabling" vs "Cabling")
4. Verify `modules` table has rows with `course_id = "cabling"` or `"networking"`

### Q: I see "No modules available yet."
**A:** No modules found in Supabase with that course_id. Check:
1. Go to Supabase → **Table Editor** → **modules**
2. Filter by course_id
3. Add a module if missing

### Q: Link text says "open lesson" but I want "watch video"
**A:** Update the `content_type` in Supabase. Script picks the label based on content_type:
- "pdf" → "open pdf"
- "video" → "watch video"
- "interactive" → "launch tool"
- "text" → "read article"

### Q: How do I add a description to a module?
**A:** In Supabase, click the `description` field and type. Leave blank if you don't want one.

---

## HTML Structure (What Gets Rendered)

When `load-modules.js` runs, it creates HTML like this:

```html
<ul class="module-list">
  <li>
    <span class="mod-tag">MOD 01</span>
    <span>
      <strong>Cable types & standards</strong>
      <br>
      <span style="font-size: 0.9em; color: var(--ink-soft);">
        Learn about UTP, STP, and fiber optic cables
      </span>
      <br>
      <a href="https://example.com/lessons/cable-types.pdf" target="_blank">
        open pdf
      </a>
    </span>
  </li>
  
  <li>
    <span class="mod-tag">MOD 02</span>
    <span>
      <strong>T568A / T568B termination</strong>
      <br>
      <span style="font-size: 0.9em; color: var(--ink-soft);">
        Master the wiring standards for RJ45 connectors
      </span>
      <br>
      <a href="https://yoursite.com/lessons/termination-simulator" target="_blank">
        launch tool
      </a>
    </span>
  </li>
  
  <!-- ... more modules ... -->
</ul>
```

No hardcoding — all generated from database data.

---

## Testing Checklist

- [ ] Opened `course-cabling.html` while logged in
- [ ] Modules appear (MOD 01, MOD 02, etc.)
- [ ] Module titles match Supabase data
- [ ] Links work (click one, opens in new tab)
- [ ] Did the same for `course-networking.html`
- [ ] Added a test module to Supabase
- [ ] Refreshed course page → new module appears
- [ ] Edited a module title
- [ ] Refreshed page → change appears
- [ ] Deleted a module
- [ ] Refreshed page → module gone

Once all checked, you're live! 🚀

---

## What's Next?

### Optional: Add More Module Fields

You might want to track:
- Estimated time to complete
- Difficulty level (beginner, intermediate, advanced)
- Prerequisites
- Learning objectives

Just add columns to the `modules` table and update `load-modules.js` to display them.

### Optional: Add Course Descriptions

On each course page, you could also load the course description from Supabase (currently it's just "Data Cabling" and "Networking"). This follows the exact same pattern as modules.

---

## Key Takeaway

You've fully decoupled content from code. You can now:
- Add modules without editing HTML
- Update module details in seconds
- Reorder, archive, or remove modules instantly
- Never deploy code again just to change course content

Pure data management. Just like it should be. 🎯
