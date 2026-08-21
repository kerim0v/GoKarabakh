import { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import VanillaTilt from 'vanilla-tilt';

const destination = { lat: 40.1431, lng: 47.5769, altitude: 0.72 };
const photos = [
  ['https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1100&q=85', 'Misty green mountains in Karabakh', '@aysel.travels', 'Tartar / 06:42'],
  ['https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=800&q=85', 'Ancient stone architecture', '@nadirnorth', 'Shusha'],
  ['https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=85', 'Hiking trail through a green valley', '@leyla.frames', 'Lachin'],
  ['https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=85', 'Sunlight over a valley', '@safar.notes', 'Kalbajar'],
  ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', 'Snowy mountain ridge beneath clouds', '@samir.road', 'Murovdag'],
];

function Header({ active }) {
  return <header className="topbar">
    <a className="brand" href="/"><span className="brand-mark">G</span><span>GOKARABAKH</span></a>
    <nav className="nav" aria-label="Primary navigation"><a className={active === 'explore' ? 'active' : ''} href="/">Explore</a><a className={active === 'stay' ? 'active' : ''} href="/dashboard">Stay</a><a className={active === 'community' ? 'active' : ''} href="/community">Community</a></nav>
    {active === 'explore' ? <span className="mono">01 / 03</span> : <div className="wallet"><span className="wallet-icon">◈</span><b>1,240</b><span className="mono">coins</span></div>}
  </header>;
}

function ParticleField({ globe }) {
  useEffect(() => {
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
      colors[offset] = color.r; colors[offset + 1] = color.g; colors[offset + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { pointSize: { value: 1.5 } },
      vertexShader: 'attribute vec3 color; varying vec3 pointColor; uniform float pointSize; void main(){ pointColor=color; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_PointSize=pointSize*(260.0/-mvPosition.z); gl_Position=projectionMatrix*mvPosition; }',
      fragmentShader: 'varying vec3 pointColor; void main(){ float distanceFromCenter=distance(gl_PointCoord,vec2(.5)); if(distanceFromCenter>.5) discard; float glow=1.0-smoothstep(.05,.5,distanceFromCenter); gl_FragColor=vec4(pointColor,glow*.62); }',
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    let frame;
    const animate = () => { particles.rotation.y += .00018; particles.rotation.x = Math.sin(Date.now() * .00012) * .025; frame = requestAnimationFrame(animate); };
    animate();
    return () => { cancelAnimationFrame(frame); scene.remove(particles); geometry.dispose(); material.dispose(); };
  }, [globe]);
  return null;
}

function Landing() {
  const mount = useRef(null);
  const [globe, setGlobe] = useState(null);
  const [departing, setDeparting] = useState(false);
  useEffect(() => {
    if (!mount.current) return undefined;
    const instance = Globe()(mount.current).backgroundColor('rgba(0,0,0,0)').globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg').bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png').showAtmosphere(true).atmosphereColor('#79efa9').atmosphereAltitude(.16).pointOfView({ lat: 22, lng: 20, altitude: 2.35 });
    instance.controls().autoRotate = true; instance.controls().autoRotateSpeed = .28; instance.controls().enableDamping = true; instance.controls().dampingFactor = .08;
    setGlobe(() => instance);
    return () => instance._destructor?.();
  }, []);
  const enter = () => { if (!globe || departing) return; setDeparting(true); globe.controls().autoRotate = false; globe.pointOfView(destination, 1800); window.setTimeout(() => { window.location.href = '/dashboard'; }, 1800); };
  return <main className="landing"><div className="page-shell"><Header active="explore" /></div><section className="globe-stage" aria-label="Interactive globe explorer"><div id="globe" ref={mount} />{globe && <ParticleField globe={globe} />}<div className="stage-copy reveal"><span className="eyebrow mono">A new latitude</span><h1>Find the<br /><span>untold.</span></h1><p>A living atlas of mountain air, ancient routes and the people who make Karabakh unforgettable.</p></div><div className="stage-control glass reveal delay-2"><p className="mono">Mission / discover 01</p><p>Drag the earth, or follow the signal into Azerbaijan.</p><button className="button button-primary" onClick={enter} type="button">Enter Karabakh <span>↗</span></button></div><span className="corner-note mono">40°08' N&nbsp;&nbsp; 47°34' E</span></section>{departing && <div className="modal-backdrop open" aria-hidden="true" />}</main>;
}

function BookingModal({ onClose }) {
  const [sent, setSent] = useState(false);
  return <div className="modal-backdrop open" onClick={(event) => event.target === event.currentTarget && onClose()}><div className="modal glass" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><span className="eyebrow mono">Request a place</span><button className="button button-icon" onClick={onClose} type="button" aria-label="Close booking modal">×</button></div><h2 id="modal-title">Begin softly.</h2><p>Tell us when the mountains should expect you. We will confirm your handpicked stay within one day.</p><form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><div className="modal-fields"><label>Arrival<input type="date" required /></label><label>Guests<input type="number" min="1" defaultValue="2" required /></label></div><button className="button button-primary" type="submit">{sent ? 'Request sent ✓' : 'Send request ↗'}</button></form></div></div>;
}

function BookingCard({ type, title, description, image, featured, onBook }) {
  return <article className={`booking-card glass reveal ${featured ? 'featured' : ''}`} data-tilt><div className={`card-image ${image}`} /><div className="card-content"><div className="card-meta"><span className="eyebrow mono">{type}</span><span className="coin-badge"><i className="coin">G</i> +50 coins</span></div><h3>{title}</h3><p>{description}</p><button className={`button ${featured ? 'button-primary' : 'button-ghost'}`} onClick={onBook} type="button">{featured ? 'View stay ↗' : 'Reserve'}</button></div></article>;
}

function Dashboard() {
  const [modal, setModal] = useState(false);
  useEffect(() => { document.querySelectorAll('[data-tilt]').forEach((element) => VanillaTilt.init(element, { max: 12, speed: 500, glare: true, 'max-glare': .24, perspective: 1100 })); return () => document.querySelectorAll('[data-tilt]').forEach((element) => element.vanillaTilt?.destroy()); }, []);
  return <div className="page-shell"><Header active="stay" /><main className="dashboard-main"><section className="page-title reveal"><span className="eyebrow mono">Your basecamp / 02</span><h1>Make room<br />for wonder.</h1><p>Handpicked stays and local guides for an unhurried journey through the highlands.</p></section><section className="dashboard-grid"><BookingCard featured type="Editor's route" title="Stone & Silence" description="A timber cabin above the Karkijahan valley, where every window faces a different story." image="" onBook={() => setModal(true)} /><div className="small-cards"><BookingCard type="Hotel / Shusha" title="Karvansaray" description="From $118 / night" image="hotel-image" onBook={() => setModal(true)} /><BookingCard type="Guide / Lachin" title="Wild north" description="From $42 / person" image="guide-image" onBook={() => setModal(true)} /></div></section><section className="stats-row reveal delay-3"><div className="stat glass"><span className="mono">Saved routes</span><strong>07</strong><span>Across 3 regions</span></div><div className="stat glass"><span className="mono">Journey wallet</span><strong>1,240</strong><span>+180 this month</span></div><div className="stat glass"><span className="mono">Local impact</span><strong>94%</strong><span>Spent with locals</span></div></section></main>{modal && <BookingModal onClose={() => setModal(false)} />}</div>;
}

function Community() {
  const [shared, setShared] = useState(false);
  const [caption, setCaption] = useState('');
  const [coins, setCoins] = useState([]);
  const share = (event) => { event.preventDefault(); if (!caption.trim()) return; setShared(true); setCoins(Array.from({ length: 34 }, (_, index) => ({ id: `${Date.now()}-${index}`, left: Math.random() * 100, delay: Math.random() * .7, drift: (Math.random() - .5) * 180 }))); window.setTimeout(() => setCoins([]), 2800); };
  return <div className="page-shell"><Header active="community" /><main className="community-main"><section className="community-hero reveal"><div><span className="eyebrow mono">Field notes / 03</span><h1>Seen through<br />your eyes.</h1></div><p>Small moments from a shared map. Add your own coordinates and help the next traveller look closer.</p></section><section className="community-layout"><div className="photo-grid" aria-label="Community photo gallery">{photos.map(([src, alt, author, place], index) => <figure className={`photo-tile reveal delay-${(index % 3) + 1}`} key={src}><img src={src} alt={alt} /><figcaption><span>{author}</span><span className="mono">{place}</span></figcaption></figure>)}</div><aside className="upload-panel glass reveal delay-3"><span className="eyebrow mono">Add to the atlas</span><h3>Leave a trace.</h3><p>Share one frame from your route and receive 50 GoKarabakh coins.</p><form className="share-form" onSubmit={share}><label className="upload-drop" htmlFor="photo-input"><span>＋</span><span>Choose a field note</span></label><input id="photo-input" type="file" accept="image/*" /><input value={caption} onChange={(event) => setCaption(event.target.value)} type="text" placeholder="A short caption" aria-label="A short caption" required /><button className="button button-primary" type="submit">{shared ? 'Shared / +50 coins' : 'Share / earn 50 ↗'}</button></form></aside></section></main><div className="coin-rain" aria-hidden="true">{coins.map((coin) => <span className="falling-coin" style={{ left: `${coin.left}%`, animationDelay: `${coin.delay}s`, '--drift': `${coin.drift}px` }} key={coin.id}>G</span>)}</div></div>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/dashboard' || path === '/dashboard.html') return <Dashboard />;
  if (path === '/community' || path === '/community.html') return <Community />;
  return <Landing />;
}