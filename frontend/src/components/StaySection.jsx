import { useState } from 'react';
import { motion } from 'framer-motion';

const stays = [{ title: 'Stone & Silence', location: 'Karkijahan valley', price: '$118', image: 'featured' }, { title: 'Karvansaray', location: 'Shusha / old town', price: '$146', image: 'hotel-image' }, { title: 'Wild north', location: 'Lachin / highlands', price: '$92', image: 'guide-image' }];

function StayCard({ stay, onBook }) {
  const [style, setStyle] = useState({});
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const move = (event) => { const box = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - box.left) / box.width - .5; const y = (event.clientY - box.top) / box.height - .5; setStyle({ transform: `perspective(1000px) rotateX(${y * -12}deg) rotateY(${x * 12}deg)` }); };
  const handleBook = () => {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      window.dispatchEvent(new CustomEvent('auth:open'));
      return;
    }
    onBook?.();
  };
  return <motion.article className="stay-card glass" onMouseMove={move} onMouseLeave={() => setStyle({})} style={style} whileHover={{ scale: 1.015 }}><div className={`stay-image ${stay.image}`} /><div className="stay-copy"><span className="mono">{stay.location}</span><h3>{stay.title}</h3><div className="stay-drawer"><span>{stay.price} / night</span>{isLoggedIn && <span className="coin-badge"><i className="coin">G</i> +50 Coins / Night</span>}<button className="button button-primary" onClick={handleBook} type="button">Book Now ↗</button></div></div></motion.article>;
}

export default function StaySection({ onBook }) {
  return <section className="stay-section"><div className="section-heading"><div><span className="eyebrow mono">Stay / handpicked</span><h2>Slow down, settle in.</h2></div><span className="mono">{stays.length} selected stays</span></div><div className="stay-grid">{stays.map((stay) => <StayCard stay={stay} onBook={onBook} key={stay.title} />)}</div></section>;
}