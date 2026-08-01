// js/auth-guard.js
// Protects course pages - ensures only approved students can access
// Requires js/supabase-client.js to be loaded first (sets window.supabaseClient)

(async () => {
  try {
    // Check for active session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    // Fetch user profile
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('approved, role')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      window.location.href = 'login.html';
      return;
    }

    // Validate user role and approval
    if (profile.role !== 'student' || !profile.approved) {
      window.location.href = profile.approved ? 'index.html' : 'pending.html';
      return;
    }

    // User is approved student - allow access

    // Wire up any [data-action="logout"] links on the page
    document.querySelectorAll('[data-action="logout"]').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
      });
    });
  } catch (err) {
    console.error('Auth guard error:', err);
    window.location.href = 'login.html';
  }
})();
