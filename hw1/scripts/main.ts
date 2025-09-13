import { highlightActiveNav } from './nav';
import { initTimeline } from './timeline';
import { initContactForm } from './contact';

function init(): void {
  highlightActiveNav();

  const isTimeline = document.getElementById('timeline-events') !== null;
  if (isTimeline) {
    initTimeline();
  }

  const hasContactForm = document.getElementById('contact-form') !== null;
  if (hasContactForm) {
    initContactForm();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

