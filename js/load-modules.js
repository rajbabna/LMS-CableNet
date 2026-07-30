// ===========================================================
// load-modules.js
// Fetches modules from Supabase for a specific course
// and renders them dynamically on the course pages
// ===========================================================

async function loadModulesForCourse(courseId) {
  const moduleList = document.querySelector('.module-list');
  
  if (!moduleList) {
    console.log('No .module-list container found — skipping module loading');
    return;
  }

  try {
    // Fetch all modules for this course, ordered by module number
    const { data: modules, error } = await supabaseClient
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('module_number', { ascending: true });

    if (error) {
      console.error('Error loading modules:', error);
      return;
    }

    // Clear any placeholder content
    moduleList.innerHTML = '';

    // If no modules found, show a message
    if (!modules || modules.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = '<span style="color: var(--ink-soft);">No modules available yet.</span>';
      moduleList.appendChild(li);
      return;
    }

    // Render each module as a list item
    modules.forEach(module => {
      const li = document.createElement('li');
      
      // Determine icon or label based on content type
      let contentLabel = 'open lesson';
      switch(module.content_type) {
        case 'pdf':
          contentLabel = 'open pdf';
          break;
        case 'video':
          contentLabel = 'watch video';
          break;
        case 'interactive':
          contentLabel = 'launch tool';
          break;
        case 'text':
          contentLabel = 'read article';
          break;
        default:
          contentLabel = 'open lesson';
      }
      
      li.innerHTML = `
        <span class="mod-tag">MOD ${String(module.module_number).padStart(2, '0')}</span>
        <span>
          <strong>${module.title}</strong>
          ${module.description ? `<br><span style="font-size: 0.9em; color: var(--ink-soft);">${module.description}</span>` : ''}
          <br>
          <a href="${module.content_url}" target="_blank">${contentLabel}</a>
        </span>
      `;
      moduleList.appendChild(li);
    });

  } catch (err) {
    console.error('Exception loading modules:', err);
  }
}

// Export for use in other scripts
window.loadModulesForCourse = loadModulesForCourse;
