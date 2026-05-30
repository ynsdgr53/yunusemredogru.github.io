/**
 * main.js — Aerospace Portfolio Logic & Micro-interactions
 * Coordinates theme customizers, countdown clocks, dynamic canvas charts,
 * rolling counter telemetry, GSAP scroll triggers, custom cursors, and 3D tilts.
 */

(function () {
  'use strict';

  // ─── 1. NAVBAR SMOOTH NAVIGATOR ───────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    trackActiveNav();
  }, { passive: true });

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open);
      navToggle.classList.toggle('open');
    });
  }

  // Close hamburger menu on link click
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Track scroll position to set active nav link class
  const sections = document.querySelectorAll('section[id]');
  function trackActiveNav() {
    const scrollY = window.scrollY + 140;
    sections.forEach((sec) => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');
      const link = document.querySelector(`.nav-link[href="#${id}"]`);
      if (link) {
        if (scrollY >= top && scrollY < top + height) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  }

  // ─── 2. HUD COLOR THEME CUSTOMIZER ────────────────────────────────────────
  const themeDots = document.querySelectorAll('.theme-dot');
  const colorMap = {
    cyan: '#00e5ff',
    amber: '#ff9100',
    green: '#00e676',
    silver: '#0066cc'
  };

  themeDots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      const theme = e.target.dataset.theme;

      // Reset dot active states
      themeDots.forEach((d) => d.classList.remove('active'));
      e.target.classList.add('active');

      // Update body classes
      document.body.className = ''; // Wipe all
      if (theme !== 'cyan') {
        document.body.classList.add(`theme-${theme}`);
      }

      // Dispatch global custom event to inform WebGL hero3d.js
      window.dispatchEvent(new CustomEvent('hudThemeChange', {
        detail: {
          theme: theme,
          color: colorMap[theme]
        }
      }));
    });
  });

  // ─── 3. LIVE HUD SYSTEM CLOCK ─────────────────────────────────────────────
  const liveTimeEl = document.getElementById('hud-live-time');
  function updateLiveClock() {
    if (!liveTimeEl) return;
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    liveTimeEl.textContent = `SYS_TIME: ${hrs}:${mins}:${secs}`;
  }
  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  // ─── 4. IFASD 2026 CONGRESS COUNTDOWN TIMER ────────────────────────────────
  // Target: IFASD Goettingen presentation on 17 June 2026, 09:00:00 UTC
  const targetDate = new Date('2026-06-17T09:00:00Z').getTime();

  function updateCountdown() {
    const cdDays = document.getElementById('cd-days');
    const cdHours = document.getElementById('cd-hours');
    const cdMinutes = document.getElementById('cd-minutes');
    const cdSeconds = document.getElementById('cd-seconds');

    if (!cdDays) return;

    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      const parent = document.getElementById('ifasd-countdown');
      if (parent) {
        parent.innerHTML = `<div style="grid-column: span 4; font-family: var(--ff-mono); color: var(--clr-active); font-size: 1.1rem; font-weight: 700; text-align:center; padding: 0.5rem 0;">CONGRESS PRESENTATION UNDERWAY</div>`;
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    cdDays.textContent = String(days).padStart(3, '0');
    cdHours.textContent = String(hours).padStart(2, '0');
    cdMinutes.textContent = String(minutes).padStart(2, '0');
    cdSeconds.textContent = String(seconds).padStart(2, '0');
  }
  setInterval(updateCountdown, 1000);
  updateCountdown();

  // ─── 5. TÜBİTAK DYNAMIC AEROELASTIC FLUTTER WAVE ──────────────────────────
  const waveCanvas = document.getElementById('flex-wave-canvas');
  if (waveCanvas) {
    const ctx = waveCanvas.getContext('2d');
    let time = 0;
    
    // Flutter state parameters (hovering card shifts systems into unstable bounds)
    let flutterSpeed = 1.0;
    let amplitude = 12;
    let dampening = 0.0; // 0 = stable, >0 = flutter growth!
    
    function resizeWaveCanvas() {
      if (!waveCanvas.parentElement) return;
      waveCanvas.width = waveCanvas.parentElement.clientWidth;
      waveCanvas.height = waveCanvas.parentElement.clientHeight;
    }
    resizeWaveCanvas();
    window.addEventListener('resize', resizeWaveCanvas);

    // Hover triggers flutter state changes!
    const tubitakCard = document.getElementById('project-tubitak');
    if (tubitakCard) {
      tubitakCard.addEventListener('mouseenter', () => {
        flutterSpeed = 2.4;
        dampening = 0.025; // Wave grows!
      });
      tubitakCard.addEventListener('mouseleave', () => {
        flutterSpeed = 1.0;
        dampening = 0.0; // Restabilize
      });
    }

    function drawWave() {
      requestAnimationFrame(drawWave);
      ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      
      time += 0.04 * flutterSpeed;
      
      // Dynamic growth formula to show flutter instability
      let growth = 1.0;
      if (dampening > 0) {
        growth = 1.0 + Math.sin(time * 0.4) * 0.45; // Pulsing oscillation envelope
      }

      // Draw bending mode baseline
      ctx.beginPath();
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--clr-accent').trim() || '#00e5ff';
      ctx.lineWidth = 2.0;
      
      const midY = waveCanvas.height * 0.55;
      const length = waveCanvas.width;
      
      for (let x = 0; x < length; x++) {
        // Mode shape curve (quadratic wing root to tip deflection)
        const rootTipRatio = Math.pow(x / length, 1.8);
        const y = midY + Math.sin(x * 0.02 - time * 2) * amplitude * rootTipRatio * growth;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw grid telemetry accents (nodes points)
      ctx.fillStyle = ctx.strokeStyle;
      for (let i = 1; i <= 6; i++) {
        const xFraction = i / 7;
        const x = length * xFraction;
        const rootTipRatio = Math.pow(xFraction, 1.8);
        const y = midY + Math.sin(x * 0.02 - time * 2) * amplitude * rootTipRatio * growth;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawWave();
  }

  // ─── 6. INTERACTIVE EGM GALERKIN MATRIX HUM ──────────────────────────────
  const mathCard = document.getElementById('about-math');
  const mathDisplay = document.getElementById('math-equation-display');
  if (mathCard && mathDisplay) {
    const originalEq = "∫₀¹ R(x) φᵢ(x) dx = 0";
    
    // Fun high-tech matrix calculations strings
    const matrixShards = [
      "[Aᵢⱼ]{q} + [Cᵢⱼ]{q̇} + [Kᵢⱼ]{q} = {F}",
      "∫₀¹ [ EI w'' φᵢ'' - ω² m w φᵢ ] dx = 0",
      "residual(x) ⊥ trial_space",
      " Galerkin residual = 1.082e-6",
      "State-Space form: [A]{ẋ} + [B]{x} = 0"
    ];

    mathCard.addEventListener('mouseenter', () => {
      let intervalCount = 0;
      const scrambleInterval = setInterval(() => {
        if (intervalCount > 6) {
          clearInterval(scrambleInterval);
          mathDisplay.textContent = matrixShards[Math.floor(Math.random() * matrixShards.length)];
          mathDisplay.style.color = "var(--clr-white)";
          return;
        }
        mathDisplay.textContent = Math.random().toString(36).substring(2, 14);
        intervalCount++;
      }, 70);
    });

    mathCard.addEventListener('mouseleave', () => {
      mathDisplay.style.color = "var(--clr-accent)";
      mathDisplay.textContent = originalEq;
    });
  }

  // ─── 7. THEME-CORRELATED DYNAMIC BADGE MARQUEE BUILDER ───────────────────
  (function buildBadgeMarquees() {
    const skillsList = [
      'ANSYS MAPDL', 'MSC Nastran', 'MSC Patran', 'MATLAB', 'Mathematica', 
      'Python', 'CFD Modelling', 'State-Space Systems', 'Aeroelastic Flutter', 
      'Power Automate', 'MS Teams Workflows', 'Dynamic FEA Analysis'
    ];

    const track1 = document.getElementById('marquee-track-1');
    if (!track1) return;

    // Triple arrays for seamless loop
    const tripled = [...skillsList, ...skillsList, ...skillsList];

    tripled.forEach((skill) => {
      const badge = document.createElement('div');
      badge.className = 'skill-badge';
      
      const charIcon = skill.charAt(0);

      badge.innerHTML = `
        <span class="mono" style="
          width: 24px;
          height: 24px;
          border-radius: 4px;
          background-color: var(--clr-accent-dim);
          color: var(--clr-accent);
          font-weight: 700;
          font-size: 0.7rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.5rem;
        ">${charIcon}</span>
        <span>${skill}</span>
      `;
      track1.appendChild(badge);
    });
  })();

  // ─── 8. METRICS ROLLING STATS COUNTERS & GSAP REVEALS ────────────────────
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Dynamic Hero Staggered Entrance timeline
    const heroTl = gsap.timeline({ delay: 0.1 });
    heroTl.fromTo('.hero-badge', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
          .fromTo('.hero-title span', { opacity: 0, y: 35 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }, '-=0.35')
          .fromTo('.hero-sub', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.35')
          .fromTo('.hero-actions .btn', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, '-=0.3')
          .fromTo('.hero-control-panel', { opacity: 0, x: 45 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }, '-=0.55');

    // Rolling metrics trigger
    const statsBlock = document.getElementById('about-stats');
    if (statsBlock) {
      const counters = statsBlock.querySelectorAll('.stat-number');
      
      ScrollTrigger.create({
        trigger: statsBlock,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          counters.forEach((counter) => {
            const targetVal = parseInt(counter.dataset.target, 10);
            
            gsap.to({ val: 0 }, {
              val: targetVal,
              duration: 1.8,
              ease: 'power3.out',
              onUpdate: function () {
                counter.textContent = Math.round(this.targets()[0].val);
              },
              onComplete: () => {
                counter.textContent = `${targetVal}+`;
              }
            });
          });
        }
      });
    }

    // Scroll trigger reveals for Bento Boxes (Profile & Publications)
    gsap.utils.toArray('.bento-card').forEach((card) => {
      gsap.fromTo(card, 
        { opacity: 0, y: 35 }, 
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            once: true
          }
        }
      );
    });

    // Skill telemetry bar filling triggers on viewport entrance
    const skillsSection = document.getElementById('skills');
    if (skillsSection) {
      const skillBars = skillsSection.querySelectorAll('.skill-bar-inner');
      
      ScrollTrigger.create({
        trigger: skillsSection,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          skillBars.forEach((bar) => {
            const width = bar.dataset.width;
            bar.style.width = width;
          });
        }
      });
    }

    // Staggered reveals for beyond cards
    gsap.fromTo('.beyond-card',
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.beyond-grid',
          start: 'top 85%',
          once: true
        }
      }
    );
  }

  // ─── 9. PRE-FLIGHT CHECKLIST FORM CONNECTIONS ────────────────────────────
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const subject = document.getElementById('contact-subject').value.trim();
      const message = document.getElementById('contact-message').value.trim();

      if (!name || !email || !subject || !message) {
        formStatus.textContent = "SYSTEM FAULT: ALL DISPATCH PARAMETERS REQUIRED";
        formStatus.className = "form-status-bar status-error";
        return;
      }

      // Disable inputs during dispatch
      submitBtn.disabled = true;
      const btnText = submitBtn.querySelector('span');
      btnText.textContent = "DISPATCHING ENCRYPTED COMMS...";
      formStatus.textContent = "COMM SYSTEM: UPLOADING DATA TO CAN CHANNEL...";
      formStatus.className = "form-status-bar";

      // Simulate network payload upload
      setTimeout(() => {
        formStatus.textContent = "✓ COMM SYSTEM OK: MISSION TRANSMISSION DEPLOYED SUCCESSFUL";
        formStatus.className = "form-status-bar status-success";
        btnText.textContent = "EXECUTE DISPATCH (SEND MESSAGE)";
        submitBtn.disabled = false;
        contactForm.reset();
      }, 1500);
    });
  }

  // ─── 10. DYNAMIC 3D PERSPECTIVE HOVER TILT ───────────────────────────────
  const tiltCards = document.querySelectorAll('.bento-card, .beyond-card, .form-panel');
  tiltCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      // Deflect coordinates into slight rotation angles
      const angleX = (yc - y) / 18;
      const angleY = (x - xc) / 22;

      card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.008, 1.008, 1.008)`;
      card.style.boxShadow = `0 15px 40px rgba(0, 0, 0, 0.4)`;
      card.style.zIndex = "5";
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.boxShadow = '';
      card.style.zIndex = "";
    });
  });

  // ─── 11. PHYSICS CUSTOM MOUSE TELEMETRY CURSOR ───────────────────────────
  const cursorRing = document.getElementById('cursor-ring');
  const cursorDot = document.getElementById('cursor-dot');

  if (cursorRing && cursorDot) {
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let isMoving = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMoving = true;

      // Lock inner dot instantly
      cursorDot.style.left = `${mouseX}px`;
      cursorDot.style.top = `${mouseY}px`;
    });

    // Spring/friction-based lag animation loop for outer ring
    function animateCursorRing() {
      if (isMoving) {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        
        cursorRing.style.left = `${ringX}px`;
        cursorRing.style.top = `${ringY}px`;
      }
      requestAnimationFrame(animateCursorRing);
    }
    animateCursorRing();

    // Trigger ring expansions when hovering over clickable HUD controls
    const hoverElements = document.querySelectorAll('a, button, input[type="range"], select, textarea, .theme-dot');
    hoverElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        document.body.classList.add('cursor-hover-active');
      });
      el.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-hover-active');
      });
    });
  }

})();
