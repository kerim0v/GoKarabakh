import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const rewardText = 'Xoş gəldiniz! +100 KarabakhCoin hesabınıza köçürüldü!';

export default function AuthModal({ open, onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [notice, setNotice] = useState('');
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    setNotice('');
    return undefined;
  }, [open]);

  const submit = (event) => {
    event.preventDefault();
    const isNewAccount = mode === 'signup';
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('karabakhUser', JSON.stringify({ email: event.currentTarget.email.value, createdAt: Date.now() }));
    onAuthenticated?.();
    if (isNewAccount && !localStorage.getItem('signupRewardClaimed')) {
      localStorage.setItem('signupRewardClaimed', 'true');
      setNotice(rewardText);
      setCoins(Array.from({ length: 30 }, (_, index) => ({ id: `${Date.now()}-${index}`, x: Math.random() * 100, y: Math.random() * 100, delay: Math.random() * .35, rotate: Math.random() * 360 })));
      window.setTimeout(() => setCoins([]), 2100);
    } else {
      onClose();
    }
  };

  return <AnimatePresence>{open && <motion.div className="auth-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(event) => event.target === event.currentTarget && onClose()}><motion.div className="auth-card glass" role="dialog" aria-modal="true" aria-labelledby="auth-title" initial={{ opacity: 0, y: 30, rotateX: 12, scale: .92 }} animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .94 }} transition={{ type: 'spring', stiffness: 190, damping: 18 }}><button className="button button-icon auth-close" onClick={onClose} type="button" aria-label="Modalı bağla">×</button><span className="eyebrow mono">Karabakh passport</span><h2 id="auth-title">{mode === 'login' ? 'Yenidən xoş gəldin.' : 'Səyahətini başlat.'}</h2><p className="auth-subtitle">Marşrutlarını, bonuslarını və sevdiyin məkanları bir yerdə saxla.</p><div className="auth-switch" role="tablist" aria-label="Auth mode"><button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')} type="button">Giriş</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')} type="button">Qeydiyyat</button></div><form className="auth-form" onSubmit={submit}><label>E-poçt<input name="email" type="email" placeholder="sən@example.com" required /></label><label>Şifrə<input name="password" type="password" placeholder="••••••••" minLength="6" required /></label><button className="button button-primary" type="submit">{mode === 'login' ? 'Hesaba daxil ol ↗' : 'Hesab yarat ↗'}</button></form>{notice && <motion.div className="auth-notice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status">{notice}</motion.div>}<div className="auth-coins" aria-hidden="true">{coins.map((coin) => <motion.span key={coin.id} initial={{ opacity: 0, x: '50vw', y: '38vh', scale: .2, rotate: 0 }} animate={{ opacity: [1, 1, 0], x: `${coin.x}vw`, y: `${coin.y}vh`, scale: [1, 1.25, .75], rotate: coin.rotate + 540 }} transition={{ duration: 1.7, delay: coin.delay, ease: 'easeOut' }}>G</motion.span>)}</div></motion.div></motion.div>}</AnimatePresence>;
}