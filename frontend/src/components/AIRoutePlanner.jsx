import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

const stops = [['01', 'Şuşa Qalası', '09:00 — 11:30', 'Aysel / local historian'], ['02', 'Cıdır Düzü', '12:00 — 14:00', 'Open sky / walking route'], ['03', 'Xarıbülbül Məkanı', '15:30 — 18:00', 'Nigar / food & culture']];

export default function AIRoutePlanner() {
  const [days, setDays] = useState(3);
  const [interest, setInterest] = useState('Tarix');
  const [budget, setBudget] = useState('Balanced');
  const [generated, setGenerated] = useState(false);
  const output = useRef(null);
  const generate = () => { setGenerated(true); if (output.current) gsap.fromTo(output.current.querySelectorAll('.route-stop'), { opacity: 0, y: 30, rotateX: -18 }, { opacity: 1, y: 0, rotateX: 0, duration: .75, stagger: .12, ease: 'power3.out' }); };
  return <section className="route-planner glass"><div className="route-intro"><span className="eyebrow mono">AI navigator / live beta</span><h2>Marşrutunu<br /><em>hiss et.</em></h2><p>Bir neçə seçim et, Karabakh sənin tempinə uyğun marşrut qursun.</p></div><div className="route-controls"><label className="route-label">Müddət <strong>{days} gün</strong><input type="range" min="1" max="7" value={days} onChange={(event) => setDays(event.target.value)} /></label><div><span className="route-label">Maraq dairəsi</span><div className="interest-pills">{['Tarix', 'Təbiət', 'Qastronomiya'].map((item) => <button className={interest === item ? 'active' : ''} onClick={() => setInterest(item)} type="button" key={item}>#{item}</button>)}</div></div><label className="route-label">Büdcə<select value={budget} onChange={(event) => setBudget(event.target.value)}><option>Economy</option><option>Balanced</option><option>Premium</option></select></label><button className="button button-primary route-generate" onClick={generate} type="button"><span className="energy-ring" />AI Marşrut Yarat ✦</button></div>{generated && <motion.div className="route-output" ref={output} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="route-line" />{stops.map(([number, title, time, guide]) => <article className="route-stop" key={title}><span className="route-node">{number}</span><div><span className="mono">{time}</span><h3>{title}</h3><p>{guide} · {budget}</p></div><span className="route-bonus">+150 Coin<br />Marşrut Bonusu</span></article>)}</motion.div>}</section>;
}