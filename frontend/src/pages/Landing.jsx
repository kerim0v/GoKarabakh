import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import Header from "../components/Header.jsx";
import ParticleField from "../components/ParticleField.jsx";
import { useI18n } from "../i18n/index.jsx";
import { navigate } from "../lib/router.jsx";

const destination = { lat: 40.1431, lng: 47.5769, altitude: 0.72 };

export default function Landing() {
  const { t } = useI18n();
  const mount = useRef(null);
  const [globe, setGlobe] = useState(null);
  const [departing, setDeparting] = useState(false);

  useEffect(() => {
    if (!mount.current) return undefined;
    const instance = Globe()(mount.current)
      .backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl("/globe/earth-night.jpg")
      .bumpImageUrl("/globe/earth-topology.png")
      .showAtmosphere(true)
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.16)
      .pointOfView({ lat: 22, lng: 20, altitude: 2.35 });
    const controls = instance.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.28;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    setGlobe(() => instance);
    return () => instance._destructor?.();
  }, []);

  const enter = () => {
    if (!globe || departing) return;
    setDeparting(true);
    globe.pointOfView(destination, 1800);
    window.setTimeout(() => navigate("/community"), 1800);
  };

  return (
    <main className="landing">
      <div className="page-shell">
        <Header active="explore" />
      </div>
      <section className="globe-stage" aria-label={t("landing.globeLabel")}>
        <div id="globe" ref={mount} />
        {globe && <ParticleField globe={globe} />}
        <div className="stage-copy reveal">
          <span className="eyebrow mono eyebrow-sky">{t("landing.eyebrow")}</span>
          <h1>
            {t("landing.titleTop")}
            <br />
            <span>{t("landing.titleAccent")}</span>
          </h1>
          <p>{t("landing.text")}</p>
        </div>
        <div className="stage-control glass reveal delay-2">
          <p className="mono stage-control-kicker">{t("landing.kicker")}</p>
          <p>{t("landing.hint")}</p>
          <button className="button button-primary button-sky" onClick={enter} type="button">
            {t("landing.enter")} <span>↗</span>
          </button>
        </div>
        <span className="corner-note mono">40°08' N&nbsp;&nbsp; 47°34' E</span>
      </section>
    </main>
  );
}
