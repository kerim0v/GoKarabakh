(function () {
  'use strict';

  const destination = { lat: 40.1431, lng: 47.5769, altitude: 0.72 };

  function seedParticles(globe) {
    const scene = globe.scene();
    const count = 1450;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const radius = 165 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const offset = index * 3;
      positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      positions[offset + 1] = radius * Math.cos(phi);
      positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
      color.setHSL(.35 + Math.random() * .12, .48, .55 + Math.random() * .3);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: false,
      uniforms: { pointSize: { value: 1.5 } },
      vertexShader: 'attribute vec3 color; varying vec3 pointColor; uniform float pointSize; void main(){ pointColor=color; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_PointSize=pointSize*(260.0/-mvPosition.z); gl_Position=projectionMatrix*mvPosition; }',
      fragmentShader: 'varying vec3 pointColor; void main(){ float distanceFromCenter=distance(gl_PointCoord,vec2(.5)); if(distanceFromCenter>.5) discard; float glow=1.0-smoothstep(.05,.5,distanceFromCenter); gl_FragColor=vec4(pointColor,glow*.62); }'
    });
    const particles = new THREE.Points(geometry, material);
    particles.name = 'KarabakhAtmosphere';
    scene.add(particles);

    function animateParticles() {
      particles.rotation.y += .00018;
      particles.rotation.x = Math.sin(Date.now() * .00012) * .025;
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  function initializeLanding() {
    const mount = document.getElementById('globe');
    if (!mount || typeof Globe !== 'function') return;

    const globe = Globe()(mount)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#79efa9')
      .atmosphereAltitude(.16)
      .pointOfView({ lat: 22, lng: 20, altitude: 2.35 });

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = .28;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = .08;
    globe.onGlobeClick(() => flyToDestination(globe));
    seedParticles(globe);

    const button = document.getElementById('enter-destination');
    if (button) button.addEventListener('click', () => flyToDestination(globe));
  }

  function flyToDestination(globe) {
    if (document.body.dataset.departing) return;
    document.body.dataset.departing = 'true';
    globe.controls().autoRotate = false;
    globe.pointOfView(destination, 1800);
    window.setTimeout(() => {
      const curtain = document.getElementById('transition-curtain');
      curtain.classList.add('open');
      window.setTimeout(() => { window.location.href = 'dashboard.html'; }, 540);
    }, 1250);
  }

  function initializeTilt() {
    if (typeof VanillaTilt === 'undefined') return;
    document.querySelectorAll('[data-tilt]').forEach((element) => VanillaTilt.init(element, { max: 12, speed: 500, glare: true, 'max-glare': .24, perspective: 1100 }));
  }

  function initializeBookings() {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    document.querySelectorAll('[data-book]').forEach((button) => button.addEventListener('click', () => {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }));
    modal.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }));
    modal.addEventListener('click', (event) => { if (event.target === modal) modal.classList.remove('open'); });
    const form = modal.querySelector('form');
    form.addEventListener('submit', (event) => { event.preventDefault(); modal.classList.remove('open'); form.querySelector('button').textContent = 'Request sent ✓'; });
  }

  function initializeCommunity() {
    const shareForm = document.getElementById('share-form');
    const input = document.getElementById('photo-input');
    const drop = document.querySelector('.upload-drop');
    if (!shareForm || !input || !drop) return;
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { if (input.files[0]) drop.querySelector('span').textContent = input.files[0].name; });
    shareForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const rain = document.querySelector('.coin-rain');
      for (let index = 0; index < 34; index += 1) {
        const coin = document.createElement('span');
        coin.className = 'falling-coin';
        coin.textContent = 'G';
        coin.style.left = `${Math.random() * 100}%`;
        coin.style.animationDelay = `${Math.random() * .7}s`;
        coin.style.setProperty('--drift', `${(Math.random() - .5) * 180}px`);
        rain.appendChild(coin);
        window.setTimeout(() => coin.remove(), 2800);
      }
      shareForm.querySelector('button').textContent = 'Shared / +50 coins';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('globe')) initializeLanding();
    initializeTilt();
    initializeBookings();
    initializeCommunity();
  });
}());