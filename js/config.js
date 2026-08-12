/**
 * Cable&Net Courses Configuration
 *
 * LOCAL DEVELOPMENT:
 * 1. Copy this file content
 * 2. Replace the placeholder values with your actual Supabase credentials
 * 3. Save it back
 *
 * GITHUB:
 * - Commit the placeholder version to GitHub
 * - DO NOT commit your actual credentials
 * - In your GitHub repository settings, add GitHub Actions or use your hosting platform's
 *   environment variable configuration to inject credentials at build/deploy time
 *
 * GITHUB PAGES:
 * If using GitHub Pages, you'll need to:
 * 1. Set up a build process OR
 * 2. Use a deployment service that supports environment variables
 *
 * See DEPLOYMENT.md for full instructions
 */

// ✅ CORRECT:
window.SUPABASE_CONFIG = {
  url: "https://mantjzpfhikezztonrga.supabase.co",
  key: "sb_publishable_t5GiOxBzTlWkRDR0pS0f0g_L1JhYfI0",
};

// Networking flashcard quiz (Step 13 satellite tool). Hosted same-origin
// so one Puter sign-in covers both the quiz and the AI Mentor widget.
window.PUTER_QUIZ_URL = "tools/basic-network-quiz.html";

// Course Companion apps (tools/puter-apps/<course>-companion.html) hosted on
// Puter. Owner action: upload each generated app, then paste the share URLs here.
// Leave empty to keep using the same-repo local copy (works for preview/testing).
window.PUTER_COMPANION_URLS = {
  cabling: "https://cabling-companion.puter.site/cabling-companion.html",
  networking: "https://networking-companion.puter.site/networking-companion.html"
};