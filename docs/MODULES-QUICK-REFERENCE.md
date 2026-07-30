[← Back to START-HERE](./START-HERE.md) · Need the full walkthrough instead? See [MODULES-IMPLEMENTATION-GUIDE.md](./MODULES-IMPLEMENTATION-GUIDE.md)

# Module Management - Quick Reference Card

## 🎯 Common Tasks

### Add a New Module

**Steps:**
1. Supabase → **Table Editor** → **modules** tab
2. Click **"Insert row"** (+ icon, top right)
3. Fill in these fields:
   ```
   course_id:    "cabling" or "networking"
   module_number: 5 (if adding to end of list)
   title:        "Your lesson name"
   description:  "Short description (optional)"
   content_type: "pdf" | "video" | "interactive" | "text" | "lesson"
   content_url:  "https://link-to-your-lesson"
   ```
4. Press **Enter** or click outside → auto-saves
5. Done! Refresh course page to see it.

**Time to publish:** ~10 seconds

---

### Edit a Module

**Steps:**
1. Supabase → **Table Editor** → **modules**
2. Click the cell you want to change (title, URL, etc.)
3. Edit the text
4. Press **Enter** → auto-saves
5. Refresh page

**Time to publish:** ~5 seconds

---

### Delete a Module

**Steps:**
1. Supabase → **Table Editor** → **modules**
2. Right-click the row
3. Click **"Delete row"**
4. Confirm
5. Refresh page

**Time to publish:** ~5 seconds

---

### Reorder Modules

**Method 1: Change module_number**

Each module has a `module_number` (1, 2, 3, 4...). The course page displays them in this order.

1. Click the `module_number` field
2. Change the number (e.g., move MOD 02 to MOD 05)
3. Refresh page → reordered!

**Method 2: Full reorder (if renumbering is annoying)**

| Current | New |
|---------|-----|
| MOD 01  | MOD 04 |
| MOD 02  | MOD 01 |
| MOD 03  | MOD 02 |
| MOD 04  | MOD 03 |

Just swap the numbers and refresh.

---

## 🔗 Content Types & Link Text

The `content_type` field determines what the link says:

| Content Type | Link Says | Use For |
|---|---|---|
| `pdf` | "open pdf" | PDF documents |
| `video` | "watch video" | YouTube, Vimeo, etc. |
| `interactive` | "launch tool" | Simulators, calculators, quizzes |
| `text` | "read article" | Blog posts, HTML articles |
| `lesson` | "open lesson" | Generic (default) |

### Example:
```
Title: Cable types & standards
Content Type: pdf
Content URL: https://example.com/cable-types.pdf
Link renders as: "Cable types & standards — [open pdf]"
```

---

## 📋 Sample Module Entries

### PDF Lesson
```
course_id:    cabling
module_number: 1
title:        Cable types & standards
description:  Learn UTP, STP, and fiber
content_type: pdf
content_url:  https://myserver.com/lessons/cable-types.pdf
```

### Video Lesson
```
course_id:    networking
module_number: 2
title:        Network fundamentals
description:  OSI model and TCP/IP
content_type: video
content_url:  https://youtube.com/watch?v=dQw4w9WgXcQ
```

### Interactive Tool
```
course_id:    cabling
module_number: 2
title:        T568A/B Termination Simulator
description:  Practice wiring in interactive mode
content_type: interactive
content_url:  https://mysite.com/termination-simulator
```

### HTML Lesson
```
course_id:    networking
module_number: 3
title:        Switching & Routing Basics
description:  Interactive guide with examples
content_type: text
content_url:  https://mysite.com/lessons/switching-guide.html
```

---

## 🚀 Bulk Operations

### Add Multiple Modules at Once

If you have many modules to add, it's faster to do them in one go:

1. Click **"Insert row"** multiple times
2. Fill in each one
3. They auto-save as you go

Or, contact me for a bulk import script (CSV → Supabase).

### Duplicate a Module

To copy an existing module:

1. Find the module in Supabase Table Editor
2. Note the values
3. Insert a new row
4. Paste the values, change `module_number` and `content_url`

---

## 📊 Current State (What You Have)

### Cabling Course
```
MOD 01: Cable types & standards
        PDF @ https://example.com/lessons/cable-types.pdf

MOD 02: T568A / T568B termination
        Interactive @ https://yoursite.com/lessons/termination-simulator

MOD 03: Testing & certification
        Video @ https://youtube.com/watch?v=example

MOD 04: Structured cabling practice
        Lesson @ https://example.com/lessons/structured-cabling
```

### Networking Course
```
MOD 01: Network fundamentals
        PDF @ https://example.com/lessons/network-fundamentals.pdf

MOD 02: IP addressing
        Interactive @ https://yoursite.com/lessons/ip-addressing-calc

MOD 03: Switching & routing basics
        Video @ https://youtube.com/watch?v=example

MOD 04: Troubleshooting connections
        Lesson @ https://example.com/lessons/troubleshooting
```

**Note:** These URLs are just examples. Replace them with links to your actual content.

---

## ⚠️ Important Notes

### Supabase Table Fields

**Must fill:**
- `course_id` — "cabling" or "networking" (must match exactly, case-sensitive)
- `module_number` — 1, 2, 3, etc. (can have gaps, but don't duplicate within same course)
- `title` — the lesson name
- `content_type` — one of: pdf, video, interactive, text, lesson
- `content_url` — full URL to the lesson (must start with http:// or https://)

**Optional:**
- `description` — short summary (shows under title)
- `created_at`, `updated_at` — auto-filled by Supabase

### What If I Make a Mistake?

- **Wrong course_id?** Module won't show on any course page. Just fix it.
- **Wrong content_type?** Link label will be wrong. Just change the content_type.
- **Dead URL?** Link will 404. Just update the URL.

Everything is live-editable. No risk of breaking the site.

---

## 🔐 Privacy & Security

- ✅ Module URLs are stored in Supabase (visible server-side)
- ✅ Course pages are protected by auth-guard.js (login required)
- ⚠️ The actual lesson files (PDFs, videos, etc.) are separate
  - Anyone with the direct URL can access them
  - This is fine for your small, approved cohort
  - If you need tighter control later, we can add download gating

---

## 📱 Mobile-Friendly

Module lists are responsive. They work great on:
- ✅ Desktop browsers
- ✅ Tablets
- ✅ Mobile phones

Links open in a new tab, so students don't lose their place on the course page.

---

## Keyboard Shortcuts (Supabase)

Inside Table Editor:
- **Tab** — move to next cell
- **Shift+Tab** — move to previous cell
- **Enter** — save and move down
- **Escape** — cancel edits
- **Delete** — clear cell content

---

## Questions?

**Q: Can I have modules on multiple courses?**  
A: Yes. Each module has a `course_id`. Set it to "cabling" to show on cabling course, "networking" for networking course. Same module can't show on both (unless you duplicate it with a different `id`).

**Q: Can I group modules into units or sections?**  
A: Not yet (would require adding a `unit` column and updating the script). Let me know if you want this.

**Q: Can I mark modules as "coming soon"?**  
A: Yes. Add a status column or just leave `content_url` empty for now. Update when ready.

**Q: Can students track which modules they've completed?**  
A: Not yet. Would need progress tracking table. Let me know if you want this later.

---

## Checklist: First Module Update

- [ ] Log in to Supabase
- [ ] Go to Table Editor → modules
- [ ] Find a module with `content_url: "https://example.com/..."`
- [ ] Click that cell
- [ ] Replace with your actual URL
- [ ] Save (press Enter)
- [ ] Go to course page, refresh
- [ ] Click the link → opens your content ✓

Done! 🎉
