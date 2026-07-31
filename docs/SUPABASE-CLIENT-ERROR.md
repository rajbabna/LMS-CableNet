# Error: "Supabase Client Not Initialized"

## 🚨 What This Error Means

```
System error: Supabase client not initialized.
```

The browser cannot access the Supabase client because:
- The Supabase JavaScript library hasn't been loaded
- OR the client file hasn't been properly initialized
- OR the client isn't being imported/exported correctly

---

## 🔍 Root Causes & Solutions

### **Problem 1: Missing Supabase Library CDN**
The Supabase JavaScript library is never loaded into the browser.

**Check:** Open `index.html` (or your main HTML file) and search for:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**If missing:** Add this line before any scripts that use Supabase:
```html
<body>
  <!-- Your content here -->

  <!-- MUST load Supabase library first -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  
  <!-- Then load your client file -->
  <script type="module">
    import { supabaseClient } from './js/supabase-client.js';
    window.supabaseClient = supabaseClient;
  </script>
  
  <!-- Then load other scripts -->
  <script type="module" src="./js/auth-form.js"></script>
</body>
```

---

### **Problem 2: Missing Export in supabase-client.js**
The client file creates the client but doesn't export it.

**Check:** Look at `js/supabase-client.js` line with `createClient`:

```javascript
// ❌ WRONG - no export
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ CORRECT - has export
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

### **Problem 3: Wrong Import Path**
The import path doesn't match the actual file location.

**Examples of wrong paths:**
```javascript
// ❌ Wrong - path doesn't exist
import { supabaseClient } from './supabase-client.js';

// ✅ Correct - full path from WEB folder
import { supabaseClient } from './js/supabase-client.js';
```

---

### **Problem 4: Script Loading Order**
Scripts try to use Supabase before the library is loaded.

**Wrong order:**
```html
<body>
  <!-- ❌ Wrong - tries to use supabase before it's loaded -->
  <script type="module" src="./js/auth-form.js"></script>
  
  <!-- Too late -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</body>
```

**Correct order:**
```html
<body>
  <!-- 1️⃣ Load Supabase library -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  
  <!-- 2️⃣ Initialize client -->
  <script type="module">
    import { supabaseClient } from './js/supabase-client.js';
    window.supabaseClient = supabaseClient;
  </script>
  
  <!-- 3️⃣ Then use it -->
  <script type="module" src="./js/auth-form.js"></script>
</body>
```

---

### **Problem 5: Missing Credentials**
The Supabase URL or API key is not set in `supabase-client.js`.

**Check:** Open `js/supabase-client.js` and verify:

```javascript
const SUPABASE_URL = "https://your-project.supabase.co"; // ← Must not be empty
const SUPABASE_ANON_KEY = "sb_your_anon_key_here"; // ← Must not be empty
```

If either is missing or says `"your-project"`, get the real values from:
1. Go to **supabase.com** → your project
2. Click **Settings** → **API**
3. Copy the **URL** and **anon/public key**

---

## ✅ Quick Checklist for New Projects

Before testing, verify:

- [ ] `js/supabase-client.js` exists and has `export const supabaseClient`
- [ ] `supabase-client.js` has real SUPABASE_URL (not placeholder)
- [ ] `supabase-client.js` has real SUPABASE_ANON_KEY (not placeholder)
- [ ] Main HTML file has `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
- [ ] CDN script loads BEFORE any module scripts
- [ ] Module scripts have correct import path: `./js/supabase-client.js`
- [ ] If making client global, store in `window.supabaseClient`
- [ ] All other scripts import from correct location

---

## 📋 Template for New Projects

### **1. supabase-client.js**
```javascript
// Get values from Supabase dashboard → Settings → API
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";

// Create and export the client
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### **2. HTML (index.html or login.html)**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your App</title>
</head>
<body>
  <!-- Your content -->

  <!-- Step 1: Load Supabase library -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <!-- Step 2: Initialize client (make global if needed) -->
  <script type="module">
    import { supabaseClient } from './js/supabase-client.js';
    window.supabaseClient = supabaseClient;
  </script>

  <!-- Step 3: Use it in other scripts -->
  <script type="module" src="./js/your-other-script.js"></script>
</body>
</html>
```

### **3. Other scripts (e.g., auth-form.js)**
```javascript
// Import the client
import { supabaseClient } from './supabase-client.js';

// Or use the global if available
const client = window.supabaseClient || (await import('./supabase-client.js')).supabaseClient;

// Now use it
await client.auth.signIn({...});
```

---

## 🔧 Debugging Steps

1. **Open browser console** (F12 → Console tab)
2. **Check for errors** about missing scripts
3. **Test if library loaded:**
   ```javascript
   console.log(window.supabase); // Should show object, not undefined
   ```
4. **Test if client initialized:**
   ```javascript
   console.log(window.supabaseClient); // Should show Supabase client object
   ```
5. **Check network tab** (F12 → Network) to see if CDN script loaded

---

## 🚀 Prevention Tips

1. **Use the template above** for all new projects
2. **Always verify credentials** before testing
3. **Load scripts in order:**
   - CDN → Initialization → Usage
4. **Export everything explicitly** (use `export const`)
5. **Test in console** before building features
6. **Check browser console** for errors immediately

---

## 📞 Common Variations

### Variation 1: Using a custom hook
```javascript
// useSupabase.js
import { supabaseClient } from './supabase-client.js';

export function useSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized');
  }
  return supabaseClient;
}
```

### Variation 2: Global initialization
```javascript
// In HTML
<script type="module">
  import { supabaseClient } from './js/supabase-client.js';
  window.supabase = supabaseClient; // Some projects use 'supabase' as name
</script>

// In scripts
await window.supabase.auth.signIn({...});
```

### Variation 3: CDN fallback
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- OR older CDN if needed -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@1"></script>
```

---

## 📌 Key Takeaway

**The error occurs because:**
1. Supabase library isn't loaded → add CDN script
2. Client isn't exported → add `export` keyword
3. Wrong import path → fix file location
4. Wrong script order → load CDN first

**Prevent it by:** Using the template above and running the debugging checklist.

---

*Last updated: July 2026*
