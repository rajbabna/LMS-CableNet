// ===========================================================
// js/progress/progress-tracker.js
// Handles "Mark Complete" and "Reset" on the course page.
//
// Uses event delegation over the document so it works with the
// dynamically-rendered module list. Marking complete upserts a
// module_completions row; resetting (clicking a completed button,
// or the toast's Undo action) deletes it. After either change the
// tracker asks load-modules.js to recompute the derived UI (course %,
// phase donuts, completion banner) via window.recomputeCourseUI.
// ===========================================================

class ProgressTracker {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentUserId = null;
    this.init();
  }

  async init() {
    const { data: { user } } = await this.supabase.auth.getUser();
    this.currentUserId = user ? user.id : null;
    console.log(this.currentUserId
      ? 'ProgressTracker: Initialized for user ' + this.currentUserId
      : 'ProgressTracker: No authenticated user');

    this.setupEventDelegation();
  }

  setupEventDelegation() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.btn-complete');
      if (!button) return;

      e.preventDefault();

      const moduleId = button.dataset.moduleId;
      const courseId = button.closest('[data-course-id]')?.dataset.courseId;
      if (!moduleId || !courseId) return;

      if (button.classList.contains('completed')) {
        // Completed buttons stay interactive so a student can re-do a module;
        // clicking one asks for confirmation and then resets it.
        this.resetModuleComplete(moduleId, courseId, { confirm: true });
      } else {
        this.markModuleComplete(moduleId, courseId, button);
      }
    });
  }

  // Forward a completion change to load-modules.js so the derived UI
  // (course %, phase donuts, completion banner) recomputes. A fallback
  // full reload is used if the page never registered the hooks.
  applyChange(delta) {
    if (typeof window.recomputeCourseUI === 'function') {
      window.recomputeCourseUI(delta);
    } else {
      console.warn('ProgressTracker: recomputeCourseUI not registered');
      window.location.reload();
    }
  }

  async markModuleComplete(moduleId, courseId, buttonElement) {
    if (!this.currentUserId) {
      this.showToast('Please log in first', 'error');
      return;
    }

    const originalText = buttonElement.textContent;
    buttonElement.disabled = true;
    buttonElement.textContent = 'Saving...';

    try {
      const { error } = await this.supabase
        .from('module_completions')
        .upsert({
          user_id: this.currentUserId,
          module_id: moduleId,
          status: 'completed',
          completion_percentage: 100,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,module_id' });

      if (error) throw error;

      this.applyChange({ moduleId, completed: true });
      this.showToast('Module marked complete ✓', 'success', {
        label: 'Undo',
        handler: () => this.resetModuleComplete(moduleId, courseId, { confirm: false })
      });
    } catch (err) {
      console.error('Error marking module complete:', err);
      this.showToast('Error saving progress. Try again.', 'error');
      buttonElement.disabled = false;
      buttonElement.textContent = originalText;
    }
  }

  // Deletes the completion record. With confirm:true (direct clicks) it
  // warns first because it can re-lock the final quiz / drop badge counts.
  // With confirm:false (toast Undo) it is an instant reversal of an action
  // the student just took, so no prompt is shown.
  async resetModuleComplete(moduleId, courseId, opts) {
    const { confirm = false } = opts || {};
    if (!this.currentUserId) {
      this.showToast('Please log in first', 'error');
      return;
    }

    if (confirm && !window.confirm(
      'Reset this module? It will be marked incomplete and your course ' +
      'progress and badge counts will recalculate.'
    )) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('module_completions')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('module_id', moduleId);

      if (error) throw error;

      this.applyChange({ moduleId, completed: false });
      this.showToast('Module reset — mark it complete when you’re ready', 'info');
    } catch (err) {
      console.error('Error resetting module:', err);
      this.showToast('Error resetting progress. Try again.', 'error');
    }
  }

  showToast(message, type = 'info', action) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification ' + type;
    toast.textContent = message;

    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        toast.remove();
        action.handler();
      });
      toast.appendChild(btn);
    }

    document.body.appendChild(toast);

    // Auto-dismiss; give the toast with an action a couple extra seconds.
    const dismissMs = action ? 6000 : 3000;
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, dismissMs);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof supabaseClient !== 'undefined') {
    window.progressTracker = new ProgressTracker(supabaseClient);
  } else {
    console.warn('ProgressTracker: supabaseClient not available');
  }
});