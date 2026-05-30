/**
 * tilt.js — Vanilla JS 3D card tilt effect
 * Applies mouse-tracking perspective transform to all .tilt-card elements.
 */

(function () {
  'use strict';

  const MAX_TILT = 10; // degrees

  function applyTilt(card) {
    const shine = card.querySelector('.card-shine');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      const rotX = -dy * MAX_TILT;
      const rotY = dx * MAX_TILT;

      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;
      card.style.transition = 'transform 0.1s ease';

      // Update shine position
      if (shine) {
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        shine.style.setProperty('--mx', mx + '%');
        shine.style.setProperty('--my', my + '%');
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    // Keyboard accessibility
    card.addEventListener('focus', () => {
      card.style.boxShadow = '0 0 0 2px var(--clr-cyan)';
    });

    card.addEventListener('blur', () => {
      card.style.boxShadow = '';
    });
  }

  document.querySelectorAll('.tilt-card').forEach(applyTilt);

})();
