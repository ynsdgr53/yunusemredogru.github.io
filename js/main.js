/**
 * main.js — Core interactions
 * - GSAP ScrollTrigger reveal animations
 * - Navbar scroll behaviour
 * - Skills marquee builder
 * - Counter animation
 * - Hero entrance sequence
 * - Contact form handler
 * - Active nav link tracking
 */

(function () {
  'use strict';

  // ── GSAP Plugin Registration ─────────────────────────────────
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ── NAVBAR ───────────────────────────────────────────────────
  const navbar   = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks  = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    updateActiveNav();
  }, { passive: true });

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
    navToggle.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Active section highlight
  const sections = document.querySelectorAll('section[id]');

  function updateActiveNav() {
    const scrollY = window.scrollY + 120;
    sections.forEach((sec) => {
      const top = sec.offsetTop;
      const bot = top + sec.offsetHeight;
      const id = sec.getAttribute('id');
      const navLink = document.querySelector(`.nav-link[href="#${id}"]`);
      if (navLink) {
        navLink.classList.toggle('active', scrollY >= top && scrollY < bot);
      }
    });
  }

  // ── HERO ENTRANCE ANIMATION ──────────────────────────────────
  (function heroEntrance() {
    const tl = gsap.timeline({ delay: 0.15 });

    tl.to('.hero-badge', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
    })
    .to('#title-line-1', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power4.out',
    }, '-=0.3')
    .to('#title-line-2', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power4.out',
    }, '-=0.55')
    .to('#title-line-3', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power4.out',
    }, '-=0.55')
    .to('.hero-sub', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
    }, '-=0.4')
    .to('.hero-actions', {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
    }, '-=0.4')
    .to('.deco-tag', {
      opacity: 1,
      duration: 0.8,
      stagger: 0.25,
      ease: 'power2.out',
    }, '-=0.3');
  })();

  // ── SCROLL REVEAL ANIMATIONS ─────────────────────────────────
  function initScrollReveal() {
    if (typeof ScrollTrigger === 'undefined') {
      // Fallback: show everything immediately
      document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
        .forEach((el) => el.classList.add('revealed'));
      return;
    }

    const revealTargets = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

    revealTargets.forEach((el, i) => {
      const parent = el.closest('section');
      let startY = 0;
      let startX = 0;

      if (el.classList.contains('reveal-up')) startY = 40;
      else if (el.classList.contains('reveal-left')) startX = -40;
      else if (el.classList.contains('reveal-right')) startX = 40;

      gsap.fromTo(
        el,
        { opacity: 0, x: startX, y: startY },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
          delay: el.style.getPropertyValue('--delay') ? parseFloat(el.style.getPropertyValue('--delay')) : 0,
        }
      );
    });
  }

  // ── COUNTER ANIMATION ────────────────────────────────────────
  function initCounters() {
    const counters = document.querySelectorAll('.stat-num');

    counters.forEach((counter) => {
      const target = parseInt(counter.dataset.target, 10);

      ScrollTrigger.create({
        trigger: counter,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to({ val: 0 }, {
            val: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: function () {
              counter.textContent = Math.round(this.targets()[0].val);
            },
            onComplete: () => {
              counter.textContent = target + '+';
            },
          });
        },
      });
    });
  }

  // ── SKILL BARS ANIMATION ─────────────────────────────────────
  function initSkillBars() {
    document.querySelectorAll('.skill-bar').forEach((bar) => {
      const w = bar.dataset.w;
      bar.style.setProperty('--bar-w', w + '%');

      ScrollTrigger.create({
        trigger: bar,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          setTimeout(() => bar.classList.add('animated'), 100);
        },
      });
    });
  }

  // ── SKILLS MARQUEE BUILDER ───────────────────────────────────
  (function buildMarquee() {
    const tools = [
      { name: 'MATLAB',            icon: 'M' },
      { name: 'Mathematica',       icon: 'Σ' },
      { name: 'ANSYS MAPDL',       icon: 'A' },
      { name: 'DesignModeler',     icon: 'D' },
      { name: 'MSC Nastran',       icon: 'N' },
      { name: 'MSC Patran',        icon: 'P' },
      { name: 'Python',            icon: 'Py' },
      { name: 'Power Automate',    icon: 'PA' },
      { name: 'MS Teams',          icon: 'T' },
      { name: 'State-Space',       icon: 'S' },
      { name: 'Galerkin Method',   icon: 'G' },
      { name: 'Flutter Analysis',  icon: 'F' },
    ];

    const track = document.getElementById('skills-track');
    if (!track) return;

    // Duplicate for seamless loop
    const allTools = [...tools, ...tools];

    allTools.forEach((tool) => {
      const badge = document.createElement('div');
      badge.className = 'skill-badge';
      badge.innerHTML = `
        <span class="skill-badge-icon" aria-hidden="true" style="
          font-family: var(--ff-mono);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--clr-cyan);
          width: 28px;
          height: 28px;
          background: var(--clr-cyan-dim);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">${tool.icon}</span>
        <span>${tool.name}</span>
      `;
      track.appendChild(badge);
    });
  })();

  // ── PROJECTS CARDS STAGGER ───────────────────────────────────
  function initProjectCards() {
    if (typeof ScrollTrigger === 'undefined') return;

    gsap.fromTo(
      '.project-card',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.projects-grid',
          start: 'top 80%',
          once: true,
        },
      }
    );

    gsap.fromTo(
      '.beyond-card',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.beyond-grid',
          start: 'top 80%',
          once: true,
        },
      }
    );
  }

  // ── PARALLAX SECTION BACKGROUNDS ────────────────────────────
  function initParallax() {
    if (typeof ScrollTrigger === 'undefined') return;

    gsap.to('.about-card', {
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: '#about',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
      },
    });

    gsap.to(streamlinesRef, {
      // no-op — handled in Three.js
    });
  }

  // Safe reference (not actually used in parallax, just stub)
  const streamlinesRef = {};

  // ── CONTACT FORM ─────────────────────────────────────────────
  const form       = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name    = form.querySelector('#contact-name').value.trim();
      const email   = form.querySelector('#contact-email').value.trim();
      const message = form.querySelector('#contact-message').value.trim();

      if (!name || !email || !message) {
        formStatus.textContent = 'Please fill in all required fields.';
        formStatus.className = 'form-note error';
        return;
      }

      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.querySelector('.btn-text').textContent = 'Sending…';

      // Simulate async send
      setTimeout(() => {
        formStatus.textContent = '✓ Message sent — I\'ll be in touch shortly.';
        formStatus.className = 'form-note success';
        btn.querySelector('.btn-text').textContent = 'Send Message';
        btn.disabled = false;
        form.reset();
      }, 1400);
    });
  }

  // ── DECO GRID (canvas dots in hero) ─────────────────────────
  (function buildDecoGrid() {
    const grid = document.getElementById('deco-grid');
    if (!grid) return;

    grid.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40%;
      background-image: radial-gradient(circle, rgba(0,183,255,0.15) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
      -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
      pointer-events: none;
    `;
  })();

  // ── INIT ─────────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCounters();
    initSkillBars();
    initProjectCards();
    initParallax();
    updateActiveNav();
  });

  // In case DOMContentLoaded already fired
  if (document.readyState !== 'loading') {
    initScrollReveal();
    initCounters();
    initSkillBars();
    initProjectCards();
    initParallax();
    updateActiveNav();
  }

})();
