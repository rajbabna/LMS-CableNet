// ===========================================================
// load-courses.js
// Fetches courses from Supabase and renders them dynamically
// on the landing page (index.html)
// ===========================================================

async function loadCoursesOnLanding() {
  const portsContainer = document.querySelector('.ports');
  
  if (!portsContainer) {
    console.log('No .ports container found — skipping course loading');
    return;
  }

  try {
    // Fetch all courses, ordered by port number
    const { data: courses, error } = await supabaseClient
      .from('courses')
      .select('*')
      .order('port_number', { ascending: true });

    if (error) {
      console.error('Error loading courses:', error);
      return;
    }

    // Clear any placeholder content
    portsContainer.innerHTML = '';

    // Render each course as a port card
    courses.forEach(course => {
      const article = document.createElement('article');
      article.className = 'port';
      article.innerHTML = `
        <span class="port-num">PORT ${String(course.port_number).padStart(2, '0')}</span>
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <span class="status">● Registration open</span>
      `;
      portsContainer.appendChild(article);
    });

  } catch (err) {
    console.error('Exception loading courses:', err);
  }
}

// Run when the page loads
document.addEventListener('DOMContentLoaded', loadCoursesOnLanding);
