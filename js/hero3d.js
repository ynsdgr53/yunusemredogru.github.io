/**
 * hero3d.js — Advanced WebGL CFD Wind Tunnel & NACA Airfoil Simulator
 * Pushes the boundaries of custom interactive WebGL portfolios.
 * Computes live NACA 4-digit airfoil profiles and deflects particle streamlines.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ─── 1. SIMULATION STATE ──────────────────────────────────────────────────
  const state = {
    alpha: 4.0,       // Angle of Attack (degrees)
    velocity: 25.0,   // Wind velocity (m/s)
    camber: 0.02,     // Max camber (m)
    thickness: 0.12,  // Max thickness (t)
    pMax: 0.4,        // Max camber position (chord fraction)
    themeColor: '#00e5ff',
    themeColorRGB: { r: 0, g: 229, b: 255 }
  };

  // Static constants for aerodynamics calculations
  const AIR_DENSITY = 1.225; // kg/m^3
  const CHORD_LENGTH = 0.15; // m (reference chord)
  const AIR_VISCOSITY = 1.789e-5; // kg/(m*s)

  // ─── 2. SCENE SETUP ───────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.5, 7.5);
  camera.lookAt(0, 0, 0);

  // Mouse vector for gentle viewing deflection
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ─── 3. NACA 4-DIGIT PROFILE GEOMETRY GENERATOR ───────────────────────────
  /**
   * Computes points on a NACA 4-digit airfoil.
   */
  function getNacaProfile(m, p, t, numPoints = 40) {
    const upperPoints = [];
    const lowerPoints = [];

    for (let i = 0; i <= numPoints; i++) {
      const xc = i / numPoints; // Chordwise position (0 to 1)

      // Thickness distribution
      const yt = (t / 0.2) * (
        0.2969 * Math.sqrt(xc)
        - 0.1260 * xc
        - 0.3516 * xc * xc
        + 0.2843 * xc * xc * xc
        - 0.1015 * xc * xc * xc * xc
      );

      // Mean Camber Line (yc) and Slope (dyc/dxc)
      let yc = 0;
      let slope = 0;

      if (m > 0 && p > 0) {
        if (xc < p) {
          yc = (m / (p * p)) * (2 * p * xc - xc * xc);
          slope = (2 * m / (p * p)) * (p - xc);
        } else {
          yc = (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * xc - xc * xc);
          slope = (2 * m / ((1 - p) * (1 - p))) * (p - xc);
        }
      }

      const theta = Math.atan(slope);

      // Upper Surface
      const xu = xc - yt * Math.sin(theta);
      const yu = yc + yt * Math.cos(theta);
      upperPoints.push({ x: xu, y: yu });

      // Lower Surface
      const xl = xc + yt * Math.sin(theta);
      const yl = yc - yt * Math.cos(theta);
      lowerPoints.push({ x: xl, y: yl });
    }

    return { upper: upperPoints, lower: lowerPoints };
  }

  /**
   * Rebuilds the wing mesh vertex positions based on current state.
   */
  const WING_CHORD = 2.4;
  const WING_SPAN = 5.2;
  const WING_SPAN_SEGMENTS = 20;

  function generateWingVertices() {
    const profile = getNacaProfile(state.camber, state.pMax, state.thickness, 40);
    const ringSize = (profile.upper.length) * 2 - 2; // Unique loop points (omit double trailing edges)
    const positions = [];
    const indices = [];

    // Form coordinate ring for a given span location Z
    function getSectionPoints(zFraction) {
      const sectionPoints = [];
      const z = (zFraction - 0.5) * WING_SPAN;
      
      // Scale profile chord down slightly towards the wingtip (taper)
      const localChord = WING_CHORD * (1 - zFraction * 0.35);
      // Sweep coordinate back towards tips
      const localSweep = zFraction * 0.7;
      // Twist coordinate (washout) at tips
      const localTwist = zFraction * -0.06;

      const cosT = Math.cos(localTwist);
      const sinT = Math.sin(localTwist);

      // Combine upper and lower points into one counter-clockwise loop
      const combined = [];
      for (let i = 0; i < profile.upper.length; i++) {
        combined.push(profile.upper[i]);
      }
      for (let i = profile.lower.length - 2; i > 0; i--) {
        combined.push(profile.lower[i]);
      }

      combined.forEach((pt) => {
        // Shift profile origin to 25% chord (aerodynamic center) for rotation
        const rx = (pt.x - 0.25) * localChord;
        const ry = pt.y * localChord;

        // Apply local wing twist (rotation in X-Y plane)
        const x = rx * cosT - ry * sinT + localSweep;
        const y = rx * sinT + ry * cosT;

        sectionPoints.push(x, y, z);
      });

      return sectionPoints;
    }

    // Build rings along span segments
    for (let s = 0; s <= WING_SPAN_SEGMENTS; s++) {
      const zFraction = s / WING_SPAN_SEGMENTS;
      positions.push(...getSectionPoints(zFraction));
    }

    // Build indexing for solid faces (quads converted to triangles)
    for (let s = 0; s < WING_SPAN_SEGMENTS; s++) {
      for (let v = 0; v < ringSize; v++) {
        const nextV = (v + 1) % ringSize;

        const a = s * ringSize + v;
        const b = s * ringSize + nextV;
        const c = (s + 1) * ringSize + v;
        const d = (s + 1) * ringSize + nextV;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    return { positions, indices };
  }

  // Create Wing Buffers
  const wingGeo = new THREE.BufferGeometry();
  const { positions, indices } = generateWingVertices();
  
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  wingGeo.setIndex(indices);
  wingGeo.computeVertexNormals();

  // Create high-tech materials
  const wingMaterialSolid = new THREE.MeshBasicMaterial({
    color: 0x070b13,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide
  });

  const wingMaterialWire = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.32
  });

  const wingMesh = new THREE.Mesh(wingGeo, wingMaterialSolid);
  const wingWire = new THREE.LineSegments(new THREE.WireframeGeometry(wingGeo), wingMaterialWire);

  const wingGroup = new THREE.Group();
  wingGroup.add(wingMesh);
  wingGroup.add(wingWire);
  
  // Position wing slightly to the right, angled
  wingGroup.position.set(1.4, -0.2, 0);
  wingGroup.rotation.set(0.05, -0.4, 0.05); // Default pitch, yaw, roll
  scene.add(wingGroup);

  /**
   * Refreshes the wing buffer coordinates in real-time when sliders move
   */
  function updateWingGeometry() {
    const { positions } = generateWingVertices();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    wingGeo.attributes.position.needsUpdate = true;
    wingGeo.computeVertexNormals();

    // Rebuild wireframe helper as well to avoid visual desync
    wingGroup.remove(wingWire);
    wingWire.geometry.dispose();
    wingWire.geometry = new THREE.WireframeGeometry(wingGeo);
    wingGroup.add(wingWire);
  }

  // ─── 4. HIGH-TECH GRID LANDING PLANE ──────────────────────────────────────
  const gridHelper = new THREE.GridHelper(40, 40, 0x0a1220, 0x080f1a);
  gridHelper.position.y = -3.2;
  gridHelper.material.opacity = 0.22;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // ─── 5. FLOW FIELD PARTICLE SIMULATOR ─────────────────────────────────────
  // Simulates airflow streamlines passing around the wing with deflection vectors
  const PARTICLE_COUNT = 1600;
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pColors = new Float32Array(PARTICLE_COUNT * 3);
  
  // Custom velocity and metadata fields
  const pSpeeds = new Float32Array(PARTICLE_COUNT);
  const pOffsetsY = new Float32Array(PARTICLE_COUNT);
  const pOffsetsZ = new Float32Array(PARTICLE_COUNT);

  function resetParticle(i) {
    const i3 = i * 3;
    // Spawn left of screen
    pPositions[i3] = -12 - Math.random() * 5;
    
    // Spread vertically and depth-wise
    pOffsetsY[i] = (Math.random() - 0.5) * 8.5;
    pPositions[i3 + 1] = pOffsetsY[i];

    pOffsetsZ[i] = (Math.random() - 0.5) * 8.0;
    pPositions[i3 + 2] = pOffsetsZ[i];

    // Varied base velocities
    pSpeeds[i] = 1.0 + Math.random() * 0.4;
  }

  // Initialize Particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    resetParticle(i);
    // Push some particles along X axis so tunnel is full on load
    pPositions[i * 3] = (Math.random() - 0.5) * 26;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

  // Glowing point shader-style circular particle material
  const particleMat = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  /**
   * Fluid Flow Perturbation Math
   * Deflects flow streams around the wing profile and sets velocity-pressure coloring
   */
  function updateParticles(dt) {
    const pos = particleGeo.attributes.position.array;
    const col = particleGeo.attributes.color.array;

    // Wing center position in local world coordinates
    const wx = wingGroup.position.x;
    const wy = wingGroup.position.y;
    const wz = wingGroup.position.z;

    // Live slider variables converted
    const alphaRad = (state.alpha * Math.PI) / 180;
    const flowSpeedFactor = state.velocity * 0.007;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Move particle along X axis
      const dx = flowSpeedFactor * pSpeeds[i];
      pos[i3] += dx;

      const px = pos[i3];
      const py_base = pOffsetsY[i];
      const pz = pos[i3 + 2];

      // Calculate distance relative to airfoil aerodynamic center
      const relX = px - wx;
      const relZ = pz - wz;

      let targetY = py_base;
      let pressureRatio = 0.0; // 0 (standard pressure) to 1 (max low pressure / high speed)

      // Only deflect particles passing within the wing span limits and near chord
      if (Math.abs(relZ) < WING_SPAN * 0.55 && relX > -4 && relX < 4) {
        // Influence coefficient falls off with span coordinate (tip-loss) and thickness
        const spanFraction = Math.abs(relZ) / (WING_SPAN * 0.5);
        const spanFactor = Math.cos(Math.min(spanFraction, 1.0) * Math.PI * 0.5);

        // Gaussian deflection bubble
        const influenceChord = Math.exp(-Math.pow(relX + 0.3, 2) / 1.6);
        const influenceHeight = Math.exp(-Math.pow(py_base - wy, 2) / 1.1) * spanFactor;
        
        const coupledFactor = influenceChord * influenceHeight;

        if (coupledFactor > 0.02) {
          // Angle of attack deflection (airflow pushed down)
          const angleDeflection = Math.sin(alphaRad) * 1.5 * coupledFactor;
          
          // Camber & Thickness envelope flow deflection
          // Upper streams speed up (suction), lower streams slow down
          const isUpper = py_base > wy;
          const camberDeflection = state.camber * 15 * coupledFactor * (isUpper ? 1.0 : -0.6);
          const thicknessDeflection = state.thickness * 2.2 * coupledFactor * (isUpper ? 1.0 : -1.0);

          targetY = py_base - angleDeflection + camberDeflection + thicknessDeflection;
          
          // Speed increase / pressure decrease indicator on upper wing surface
          if (isUpper) {
            pressureRatio = coupledFactor * (0.4 + (state.alpha * 0.04) + (state.camber * 5));
          }
        }
      }

      // Smoothly interpolate current particle position towards target deflection height
      pos[i3 + 1] += (targetY - pos[i3 + 1]) * 0.15;

      // Color mapping: interpolate color based on local pressureRatio
      // High speed = bright theme color. Low speed = deep dark navy/slate
      const baseR = state.themeColorRGB.r / 255;
      const baseG = state.themeColorRGB.g / 255;
      const baseB = state.themeColorRGB.b / 255;

      if (pressureRatio > 0.05) {
        // Suction peak: Shift color to brilliant white/light hue to show hyper-velocity
        const blend = Math.min(pressureRatio * 1.25, 1.0);
        col[i3]     = baseR + (1.0 - baseR) * blend * 0.8;
        col[i3 + 1] = baseG + (1.0 - baseG) * blend * 0.8;
        col[i3 + 2] = baseB + (1.0 - baseB) * blend * 0.8;
      } else {
        // Normal upstream/downstream flow color (faded neon cyan/blue)
        col[i3]     = baseR * 0.5;
        col[i3 + 1] = baseG * 0.55;
        col[i3 + 2] = baseB * 0.65;
      }

      // Reset particle if it leaves the right screen boundary
      if (pos[i3] > 12) {
        resetParticle(i);
      }
    }

    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
  }

  // ─── 6. INTERACTIVE SLIDER HOOKUPS & CALCULATIONS ───────────────────────
  const slAlpha     = document.getElementById('control-alpha');
  const slVelocity  = document.getElementById('control-velocity');
  const slCamber    = document.getElementById('control-camber');
  const slThickness = document.getElementById('control-thickness');

  const lblAlpha     = document.getElementById('lbl-alpha');
  const lblVelocity  = document.getElementById('lbl-velocity');
  const lblCamber    = document.getElementById('lbl-camber');
  const lblThickness = document.getElementById('lbl-thickness');

  const valCl       = document.getElementById('val-cl');
  const valRe       = document.getElementById('val-re');
  
  const alarmPanel  = document.getElementById('stall-alarm');
  const alarmText   = document.getElementById('stall-alarm-text');

  /**
   * Recalculates Lift coefficient, Reynolds number, and prompts safety alarms
   */
  function recalculateCFDMetrics() {
    // Lift Coefficient Cl approx formula (thin airfoil theory + correction):
    // Cl = 2*pi*(alpha_rad + 2*camber)
    const alphaRad = (state.alpha * Math.PI) / 180;
    const clValue = 2 * Math.PI * (alphaRad + 2 * state.camber);
    valCl.textContent = clValue.toFixed(3);

    // Reynolds Number: Re = (density * velocity * chord) / viscosity
    const reValue = (AIR_DENSITY * state.velocity * CHORD_LENGTH) / AIR_VISCOSITY;
    
    // Format scientific notation
    const exponent = Math.floor(Math.log10(reValue));
    const base = reValue / Math.pow(10, exponent);
    valRe.textContent = `${base.toFixed(2)} × 10⁵`;

    // Dynamic warning states
    alarmPanel.className = "hud-status-alarm"; // Reset
    
    if (state.alpha > 12.0) {
      alarmPanel.classList.add("alarm-warning");
      alarmText.textContent = "STALL WARNING: FLOW DETACHED";
    } else if (state.alpha < -2.0) {
      alarmPanel.classList.add("alarm-warning");
      alarmText.textContent = "NEGATIVE LIFT BOUNDARY DETECTED";
    } else if (state.velocity > 52.0 && state.alpha > 8.0) {
      alarmPanel.classList.add("alarm-warning");
      alarmText.textContent = "CRITICAL FLUTTER STATE ENVELOPE";
    } else {
      alarmText.textContent = "AERODYNAMIC FLOW: LAMINAR";
    }
  }

  function registerSliderEvents() {
    if (slAlpha) {
      slAlpha.addEventListener('input', (e) => {
        state.alpha = parseFloat(e.target.value);
        lblAlpha.textContent = `${state.alpha.toFixed(1)}°`;
        recalculateCFDMetrics();
      });
    }

    if (slVelocity) {
      slVelocity.addEventListener('input', (e) => {
        state.velocity = parseFloat(e.target.value);
        lblVelocity.textContent = `${state.velocity.toFixed(0)} m/s`;
        recalculateCFDMetrics();
      });
    }

    if (slCamber) {
      slCamber.addEventListener('input', (e) => {
        state.camber = parseFloat(e.target.value);
        lblCamber.textContent = `${(state.camber * 100).toFixed(1)}%`;
        updateWingGeometry();
        recalculateCFDMetrics();
      });
    }

    if (slThickness) {
      slThickness.addEventListener('input', (e) => {
        state.thickness = parseFloat(e.target.value);
        lblThickness.textContent = `${(state.thickness * 100).toFixed(1)}%`;
        updateWingGeometry();
        recalculateCFDMetrics();
      });
    }
  }

  registerSliderEvents();
  recalculateCFDMetrics(); // Run calculations on load

  // ─── 7. THEME SHIFT ACCENT HOOKS ──────────────────────────────────────────
  /**
   * Listens for global accent color changes from main.js and syncs Three.js materials
   */
  window.addEventListener('hudThemeChange', (e) => {
    const details = e.detail;
    state.themeColor = details.color;
    
    // Parse hex color into RGB object
    const hex = state.themeColor.replace('#', '');
    state.themeColorRGB = {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };

    // Update Three.js materials instantly
    const colorThree = new THREE.Color(state.themeColor);
    wingMaterialWire.color.copy(colorThree);
    
    // Recalculate particle shades immediately
    updateParticles(0);
  });

  // ─── 8. CLOCK & ANIMATION LOOP ────────────────────────────────────────────
  const clock = new THREE.Clock();
  let scrollProgress = 0;

  window.addEventListener('scroll', () => {
    const heroH = document.getElementById('hero').offsetHeight;
    scrollProgress = Math.min(window.scrollY / heroH, 1.0);
  }, { passive: true });

  function animate() {
    requestAnimationFrame(animate);
    
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Smooth lerp mouse vectors
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Wing animations (Gentle aerodynamic lift bobbing + mouse deflect + scroll lift)
    const bobHeight = Math.sin(elapsed * 1.2) * 0.06;
    wingGroup.position.y = -0.2 + bobHeight + mouse.y * 0.18 - scrollProgress * 0.8;
    wingGroup.position.z = mouse.x * 0.15;
    
    // Corrected flight dynamics orientation (Wing extruded along Z-axis):
    // Pitch (Angle of Attack α) = rotation around Z-axis (inverted to pitch leading edge UP)
    // Yaw = rotation around Y-axis
    // Roll = rotation around X-axis
    const alphaRad = (state.alpha * Math.PI) / 180;
    wingGroup.rotation.z = -alphaRad - mouse.y * 0.06; // Pitch (AoA)
    wingGroup.rotation.y = -0.4 + mouse.x * 0.18 + scrollProgress * 0.6; // Yaw
    wingGroup.rotation.x = 0.05 + mouse.x * 0.06; // Roll (slight banking)

    // Animate flow streamlines particles
    updateParticles(dt);

    // Camera perspective micro-bobbing
    camera.position.y = 0.5 + Math.sin(elapsed * 0.4) * 0.06 + mouse.y * 0.1;
    camera.position.x = mouse.x * 0.2;
    
    // Fade out elements on scroll to optimize performance
    if (scrollProgress < 0.95) {
      wingMaterialSolid.opacity = 0.65 * (1.0 - scrollProgress * 0.9);
      wingMaterialWire.opacity = 0.32 * (1.0 - scrollProgress * 0.9);
      particleMat.opacity = 0.7 * (1.0 - scrollProgress * 0.8);
      gridHelper.material.opacity = 0.22 * (1.0 - scrollProgress);
      
      renderer.render(scene, camera);
    }
  }

  animate();

  // ─── 9. RESIZING ENGINE ───────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

})();
