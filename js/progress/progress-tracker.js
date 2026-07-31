// ===========================================================
// js/progress/progress-tracker.js (FIXED)
// Handles "Mark Complete" button clicks
// Uses event delegation to work with dynamically-loaded modules
// ===========================================================

class ProgressTracker {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentUserId = null;
    this.init();
  }

  async init() {
    // Get current user
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      console.log('ProgressTracker: No authenticated user');
      return;
    }

    this.currentUserId = user.id;
    console.log('ProgressTracker: Initialized for user', this.currentUserId);
    
    // Use event delegation to listen for button clicks
    this.setupEventDelegation();
  }

  setupEventDelegation() {
    // Listen for clicks anywhere on the document
    // Then check if the clicked element is a .btn-complete button
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.btn-complete');
      
      if (!button) return; // Clicked something else, ignore
      if (button.classList.contains('completed')) return; // Already completed, ignore
      
      e.preventDefault();
      
      const moduleId = button.dataset.moduleId;
      const courseId = button.closest('[data-course-id]')?.dataset.courseId;
      
      if (moduleId && courseId) {
        this.markModuleComplete(moduleId, courseId, button);
      }
    });
  }

  async markModuleComplete(moduleId, courseId, buttonElement) {
    if (!this.currentUserId) {
      this.showToast('Please log in first', 'error');
      return;
    }

    try {
      // Show loading state
      buttonElement.disabled = true;
      const originalText = buttonElement.textContent;
      buttonElement.textContent = 'Saving...';

      console.log('Marking module complete:', { moduleId, courseId, userId: this.currentUserId });

      // Update module_completions table
      const { data, error } = await this.supabase
        .from('module_completions')
        .upsert({
          user_id: this.currentUserId,
          module_id: moduleId,
          status: 'completed',
          completion_percentage: 100,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,module_id'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Successfully marked module complete:', data);

      // Update UI
      this.updateModuleUI(buttonElement, moduleId);
      
      // Show success message
      this.showToast('Module marked complete! ✓', 'success');

    } catch (error) {
      console.error('Error marking module complete:', error);
      this.showToast('Error saving progress. Try again.', 'error');
      buttonElement.disabled = false;
      buttonElement.textContent = originalText;
    }
  }

  updateModuleUI(buttonElement, moduleId) {
    // Update button
    buttonElement.classList.add('completed');
    buttonElement.disabled = true;
    buttonElement.textContent = '✓ Completed';

    // Update progress bar to 100%
    const moduleRow = buttonElement.closest('[data-module-id]');
    if (moduleRow) {
      moduleRow.classList.add('completed');
      
      // Update progress fill
      const progressFill = moduleRow.querySelector('.progress-fill');
      if (progressFill) {
        progressFill.style.width = '100%';
      }

      // Update progress text
      const progressText = moduleRow.querySelector('.progress-text');
      if (progressText) {
        progressText.textContent = '100% · 0 min';
      }
    }
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);

    console.log('Toast shown:', message, type);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
// Note: Event delegation setup happens immediately,
// so it doesn't matter if buttons exist yet or not
document.addEventListener('DOMContentLoaded', () => {
  if (typeof supabaseClient !== 'undefined') {
    console.log('Initializing ProgressTracker...');
    window.progressTracker = new ProgressTracker(supabaseClient);
  } else {
    console.warn('ProgressTracker: supabaseClient not available');
  }
});
