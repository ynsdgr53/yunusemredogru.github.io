/**
 * hero3d.js — Three.js hero canvas
 * Renders an interactive wireframe airfoil wing + particle field
 * that reacts to scroll depth and mouse movement.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Scene setup ─────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 7);
  camera.lookAt(0, 0, 0);

  // ── Mouse tracking ──────────────────────────────────────────
  const mouse = { x: 0, y: 0, lerpX: 0, lerpY: 0 };

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── NACA 4-digit airfoil profile generator ──────────────────
  function naca4Profile(nDigit, m, p, t, numPts) {
    const pts = [];
    for (let i = 0; i <= numPts; i++) {
      const xc = i / numPts;
      // Thickness distribution
      const yt = (t / 0.2) * (
        0.2969 * Math.sqrt(xc)
        - 0.1260 * xc
        - 0.3516 * xc * xc
        + 0.2843 * xc * xc * xc
        - 0.1015 * xc * xc * xc * xc
      );

      // Camber line
      let yc = 0;
      let dyc_dx = 0;
      if (xc < p) {
        yc = (m / (p * p)) * (2 * p * xc - xc * xc);
        dyc_dx = (2 * m / (p * p)) * (p - xc);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * xc - xc * xc);
        dyc_dx = (2 * m / ((1 - p) * (1 - p))) * (p - xc);
      }

      const theta = Math.atan(dyc_dx);
      pts.push({
        xu: xc - yt * Math.sin(theta),
        yu: yc + yt * Math.cos(theta),
        xl: xc + yt * Math.sin(theta),
        yl: yc - yt * Math.cos(theta),
      });
    }
    return pts;
  }

  // ── Build wing geometry (extruded airfoil) ──────────────────
  function buildWingGeometry() {
    const profile = naca4Profile('2412', 0.02, 0.4, 0.12, 60);
    const chord = 3;
    const span = 6;
    const numSpan = 20;

    const positions = [];
    const indices = [];

    // Build cross-section profile points
    function getCrossSection(z, sweep, twist) {
      const pts2D = [];
      profile.forEach((p) => {
        pts2D.push([
          (p.xu - 0.5) * chord * (1 - z / span * 0.3) + z * sweep,
          p.yu * chord * Math.cos(twist) - z * 0.05,
          z,
        ]);
      });
      profile.slice().reverse().forEach((p) => {
        pts2D.push([
          (p.xl - 0.5) * chord * (1 - z / span * 0.3) + z * sweep,
          p.yl * chord * Math.cos(twist) - z * 0.05,
          z,
        ]);
      });
      return pts2D;
    }

    const ringSize = profile.length * 2;

    for (let si = 0; si <= numSpan; si++) {
      const z = (si / numSpan) * span - span * 0.5;
      const t = si / numSpan;
      const sweep = t * 0.8;
      const twist = t * 0.08;
      const cs = getCrossSection(z, sweep, twist);
      cs.forEach((v) => positions.push(...v));
    }

    // Connect rings with quads
    for (let si = 0; si < numSpan; si++) {
      for (let vi = 0; vi < ringSize - 1; vi++) {
        const a = si * ringSize + vi;
        const b = a + 1;
        const c = (si + 1) * ringSize + vi;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Wing wireframe
  const wingGeo = buildWingGeometry();
  const wingWireframe = new THREE.WireframeGeometry(wingGeo);
  const wingLine = new THREE.LineSegments(
    wingWireframe,
    new THREE.LineBasicMaterial({
      color: 0x00b7ff,
      transparent: true,
      opacity: 0.25,
    })
  );
  wingLine.rotation.y = -Math.PI / 10;
  wingLine.position.set(1.5, -0.3, 0);
  scene.add(wingLine);

  // Solid wing mesh (very subtle fill)
  const wingMesh = new THREE.Mesh(
    wingGeo,
    new THREE.MeshBasicMaterial({
      color: 0x001833,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  wingMesh.rotation.y = -Math.PI / 10;
  wingMesh.position.set(1.5, -0.3, 0);
  scene.add(wingMesh);

  // ── Particle system ──────────────────────────────────────────
  const PARTICLE_COUNT = 1800;
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pVelocities = new Float32Array(PARTICLE_COUNT * 3);
  const pPhases = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    pPositions[i3]     = (Math.random() - 0.5) * 22;
    pPositions[i3 + 1] = (Math.random() - 0.5) * 14;
    pPositions[i3 + 2] = (Math.random() - 0.5) * 12;
    pVelocities[i3]     = (Math.random() - 0.5) * 0.006;
    pVelocities[i3 + 1] = (Math.random() - 0.5) * 0.004;
    pVelocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
    pPhases[i] = Math.random() * Math.PI * 2;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0x00b7ff,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ── Flow streamlines behind wing ─────────────────────────────
  function buildStreamlines() {
    const group = new THREE.Group();
    const numLines = 12;

    for (let li = 0; li < numLines; li++) {
      const pts = [];
      const yOff = (li / (numLines - 1) - 0.5) * 2.5;
      const zOff = (Math.random() - 0.5) * 4;

      for (let xi = 0; xi < 40; xi++) {
        const x = xi * 0.35 - 4;
        const disturbance = x > -0.5 && x < 2
          ? Math.sin((x + 0.5) * Math.PI) * 0.3 * (1 - Math.abs(yOff) / 1.5)
          : 0;
        pts.push(new THREE.Vector3(x, yOff + disturbance * 0.4, zOff));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const curveGeo = new THREE.TubeGeometry(curve, 60, 0.006, 4, false);
      const curveMat = new THREE.MeshBasicMaterial({
        color: 0x00b7ff,
        transparent: true,
        opacity: 0.12 + Math.random() * 0.1,
      });
      group.add(new THREE.Mesh(curveGeo, curveMat));
    }

    return group;
  }

  const streamlines = buildStreamlines();
  streamlines.position.set(-1.5, -0.3, -1);
  scene.add(streamlines);

  // ── Mathematical grid plane ───────────────────────────────────
  const gridHelper = new THREE.GridHelper(30, 30, 0x003d6b, 0x001226);
  gridHelper.position.y = -3;
  gridHelper.material.opacity = 0.35;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // ── Scroll tracking ──────────────────────────────────────────
  let scrollProgress = 0;

  window.addEventListener('scroll', () => {
    const heroH = document.getElementById('hero').offsetHeight;
    scrollProgress = Math.min(window.scrollY / heroH, 1);
  });

  // ── Clock & animation loop ───────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse lerp
    mouse.lerpX += (mouse.x - mouse.lerpX) * 0.04;
    mouse.lerpY += (mouse.y - mouse.lerpY) * 0.04;

    // Wing rotation — gentle idle + scroll morph
    wingLine.rotation.y = -Math.PI / 10 + mouse.lerpX * 0.18 + scrollProgress * 0.8;
    wingLine.rotation.x = mouse.lerpY * 0.1 + scrollProgress * 0.2;
    wingMesh.rotation.copy(wingLine.rotation);

    // Streamlines follow slightly
    streamlines.rotation.y = mouse.lerpX * 0.05 + scrollProgress * 0.4;

    // Particle drift
    const pos = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      pos[i3]     += pVelocities[i3] + Math.sin(t * 0.3 + pPhases[i]) * 0.0012;
      pos[i3 + 1] += pVelocities[i3 + 1] + Math.cos(t * 0.25 + pPhases[i]) * 0.001;
      pos[i3 + 2] += pVelocities[i3 + 2];

      // Wrap particles
      if (pos[i3] > 11) pos[i3] = -11;
      if (pos[i3] < -11) pos[i3] = 11;
      if (pos[i3 + 1] > 7) pos[i3 + 1] = -7;
      if (pos[i3 + 1] < -7) pos[i3 + 1] = 7;
      if (pos[i3 + 2] > 6) pos[i3 + 2] = -6;
      if (pos[i3 + 2] < -6) pos[i3 + 2] = 6;
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Camera gentle bob + scroll fade
    camera.position.y = 1 + Math.sin(t * 0.15) * 0.15 + mouse.lerpY * 0.3;
    camera.position.x = mouse.lerpX * 0.5;
    camera.position.z = 7 + scrollProgress * 2;

    // Fade wing on scroll
    wingLine.material.opacity = 0.25 * (1 - scrollProgress * 0.8);
    particleMat.opacity = 0.55 * (1 - scrollProgress * 0.6);

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  animate();

  // ── Resize handler ───────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

})();
