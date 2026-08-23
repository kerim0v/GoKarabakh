import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import VanillaTilt from "vanilla-tilt";
import AuthModal from "./components/AuthModal.jsx";

const destination = { lat: 40.1431, lng: 47.5769, altitude: 0.72 };
const photos = [
  [
    "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1100&q=85",
    "Misty green mountains in Karabakh",
    "@aysel.travels",
    "Tartar / 06:42",
  ],
  [
    "https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=800&q=85",
    "Ancient stone architecture",
    "@nadirnorth",
    "Shusha",
  ],
  [
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=85",
    "Hiking trail through a green valley",
    "@leyla.frames",
    "Lachin",
  ],
  [
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=85",
    "Sunlight over a valley",
    "@safar.notes",
    "Kalbajar",
  ],
  [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85",
    "Snowy mountain ridge beneath clouds",
    "@samir.road",
    "Murovdag",
  ],
];

function Header({ active }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("isLoggedIn") === "true",
  );
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const syncAuth = () =>
      setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    window.addEventListener("auth:changed", syncAuth);
    return () => window.removeEventListener("auth:changed", syncAuth);
  }, []);

  const handleAuthClick = () => {
    if (isLoggedIn) setAccountOpen((open) => !open);
    else window.dispatchEvent(new CustomEvent("auth:open"));
  };

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("karabakhUser");
    setAccountOpen(false);
    window.dispatchEvent(new CustomEvent("auth:changed"));
  };

  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-mark" style={{ background: "#38bdf8" }}>
          G
        </span>
        <span>GOKARABAKH</span>
      </a>
      <nav className="nav" aria-label="Primary navigation">
        <a className={active === "explore" ? "active" : ""} href="/">
          Explore
        </a>
        <a className={active === "trip" ? "active" : ""} href="/dashboard">
          Trip
        </a>
      </nav>
      <div className="header-actions">
        {active === "explore" ? (
          <span className="mono">01 / 03</span>
        ) : (
          isLoggedIn && (
            <div className="wallet">
              <span className="wallet-icon" style={{ color: "#38bdf8" }}>
                ◈
              </span>
              <b>1,240</b>
              <span className="mono">coins</span>
            </div>
          )
        )}
        <div className="account-control">
          <button
            className="auth-trigger"
            type="button"
            onClick={handleAuthClick}
            aria-expanded={isLoggedIn ? accountOpen : undefined}
            aria-label={
              isLoggedIn ? "Open account menu" : "Open sign in or sign up"
            }
            title={isLoggedIn ? "Account" : "Sign in or sign up"}
          >
            <img
              src="/lacin/khari-bulbul1.png"
              alt={isLoggedIn ? "Account" : "Sign In"}
              className="khari-bulbul-icon"
            />
          </button>
          {isLoggedIn && accountOpen && (
            <div className="account-menu">
              <button type="button" onClick={logout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function AuthShell({ children }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  useEffect(() => {
    const openAuth = (event) => {
      setPendingAction(() => event.detail?.onSuccess || null);
      setAuthOpen(true);
    };
    window.addEventListener("auth:open", openAuth);
    return () => window.removeEventListener("auth:open", openAuth);
  }, []);
  const authenticated = () => {
    const action = pendingAction;
    setPendingAction(null);
    setAuthOpen(false);
    action?.();
  };
  return (
    <>
      {children}
      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingAction(null);
        }}
        onAuthenticated={authenticated}
      />
    </>
  );
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
      const phi = Math.acos(Math.random() * 2 - 1);
      const offset = index * 3;
      positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      positions[offset + 1] = radius * Math.cos(phi);
      positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
      color.setHSL(
        0.55 + Math.random() * 0.12,
        0.68,
        0.55 + Math.random() * 0.3,
      );
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { pointSize: { value: 1.5 } },
      vertexShader:
        "attribute vec3 color; varying vec3 pointColor; uniform float pointSize; void main(){ pointColor=color; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_PointSize=pointSize*(260.0/-mvPosition.z); gl_Position=projectionMatrix*mvPosition; }",
      fragmentShader:
        "varying vec3 pointColor; void main(){ float distanceFromCenter=distance(gl_PointCoord,vec2(.5)); if(distanceFromCenter>.5) discard; float glow=1.0-smoothstep(.05,.5,distanceFromCenter); gl_FragColor=vec4(pointColor,glow*.62); }",
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    let frame;
    const animate = () => {
      particles.rotation.y += 0.00018;
      particles.rotation.x = Math.sin(Date.now() * 0.00012) * 0.025;
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      scene.remove(particles);
      geometry.dispose();
      material.dispose();
    };
  }, [globe]);
  return null;
}

function Landing() {
  const mount = useRef(null);
  const [globe, setGlobe] = useState(null);
  const [departing, setDeparting] = useState(false);
  useEffect(() => {
    if (!mount.current) return undefined;
    const instance = Globe()(mount.current)
      .backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-night.jpg",
      )
      .bumpImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-topology.png",
      )
      .showAtmosphere(true)
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.16)
      .pointOfView({ lat: 22, lng: 20, altitude: 2.35 });
    instance.controls().autoRotate = true;
    instance.controls().autoRotateSpeed = 0.28;
    instance.controls().enableDamping = true;
    instance.controls().dampingFactor = 0.08;
    setGlobe(() => instance);
    return () => instance._destructor?.();
  }, []);
  const enter = () => {
    if (!globe || departing) return;
    setDeparting(true);
    globe.controls().autoRotate = false;
    globe.pointOfView(destination, 1800);
    window.setTimeout(() => {
      window.location.hash = "#community";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, 180);
  };
  return (
    <main className="landing">
      <div className="page-shell">
        <Header active="explore" />
      </div>
      <section className="globe-stage" aria-label="Interactive globe explorer">
        <div id="globe" ref={mount} />
        {globe && <ParticleField globe={globe} />}
        <div className="stage-copy reveal">
          <span className="eyebrow mono" style={{ color: "#38bdf8" }}>
            A new latitude
          </span>
          <h1>
            Find the
            <br />
            <span>untold.</span>
          </h1>
          <p>
            A living atlas of mountain air, ancient routes and the people who
            make Karabakh unforgettable.
          </p>
        </div>
        <div className="stage-control glass reveal delay-2">
          <p
            className="mono"
            style={{
              marginBottom: "6px",
              color: "#7dd3fc",
              letterSpacing: "0.14em",
            }}
          >
            Inter Karabakh
          </p>
          <p>Drag the earth, or follow the signal into Azerbaijan.</p>
          <button
            className="button button-primary"
            onClick={enter}
            type="button"
            title="Inter Karabakh community"
            aria-label="Inter Karabakh community"
            style={{ background: "#38bdf8", color: "#000" }}
          >
            Enter Karabakh <span>↗</span>
          </button>
        </div>
        <span className="corner-note mono">40°08' N&nbsp;&nbsp; 47°34' E</span>
      </section>
      {departing && <div className="modal-backdrop open" aria-hidden="true" />}
    </main>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState("stays");
  const [searchQuery, setSearchQuery] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [activeRegionTab, setActiveRegionTab] = useState("all");
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const cidirImages = [
    "/shusha/shusha.JPG",
    "/kelbecer/kelbecer.jpg",
    "/khankendi/khankendi.jpeg",
  ];

  // Window scroll-u birbaşa izləyən funksiya (Bu 100% işləyəcək)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const maxScroll = scrollHeight - clientHeight;

      const scrollFraction = maxScroll > 0 ? scrollTop / maxScroll : 0;

      if (scrollFraction < 0.33) {
        setBgIndex(0);
      } else if (scrollFraction < 0.66) {
        setBgIndex(1);
      } else {
        setBgIndex(2);
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Cleanup funksiyası
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const karabakhRegions = [
    {
      slug: "shusha",
      label: "Shusha",
      image: "/map/map-shusha.png",
      fact: "Cultural capital",
      narrative:
        "A storied hilltop city of music, poetry, and panoramic limestone cliffs.",
    },
    {
      slug: "kalbajar",
      label: "Kalbajar",
      image: "/map/map-kalbajar.png",
      fact: "Highland escape",
      narrative:
        "Hot springs, alpine passes, and ancient stone sanctuaries in the high Caucasus.",
    },
    {
      slug: "lachin",
      label: "Lachin",
      image: "/map/map-lachin.png",
      fact: "Forest corridor",
      narrative:
        "Deep green valleys and river routes opening toward the mountain frontier.",
    },
    {
      slug: "khankendi",
      label: "Khankendi",
      image: "/map/map-khankendi.png",
      fact: "Valley centre",
      narrative:
        "A welcoming city base set among the gentle folds of the Karabakh range.",
    },
    {
      slug: "aghdam",
      label: "Aghdam",
      image: "/map/map-aghdam.png",
      fact: "Heritage plains",
      narrative:
        "An expansive district of cultural landmarks, open plains, and renewed connections.",
    },
    {
      slug: "khojaly",
      label: "Khojaly",
      image: "/map/map-khojaly.png",
      fact: "Ancient landscape",
      narrative:
        "Rolling uplands where archaeological traces meet wide, quiet horizons.",
    },
    {
      slug: "khojavend",
      label: "Khojavend",
      image: "/map/map-khojavend.png",
      fact: "Wild viewpoints",
      narrative:
        "Wooded slopes, hidden trails, and a landscape shaped for slow exploration.",
    },
    {
      slug: "qubadli",
      label: "Qubadli",
      image: "/map/map-qubadli.png",
      fact: "Riverside routes",
      narrative:
        "A lush southern gateway framed by rivers, ridges, and village pathways.",
    },
    {
      slug: "zangilan",
      label: "Zangilan",
      image: "/map/map-zangilan.png",
      fact: "Nature reserve",
      narrative:
        "Wetlands, plane forests, and an unhurried route through the Aras valley.",
    },
  ];

  const regionTabs = [
    { slug: "all", label: "All Regions" },
    ...karabakhRegions.map(({ slug, label }) => ({ slug, label })),
  ];

  const visibleRegions = karabakhRegions;
  const activeMapRegion = karabakhRegions.find(
    (region) => region.slug === hoveredRegion,
  );
  const mapPositions = {
    kalbajar: { top: "1%", left: "5%", width: "38%" },
    khojaly: { top: "2%", left: "42%", width: "28%" },
    aghdam: { top: "19%", left: "61%", width: "29%" },
    lachin: { top: "29%", left: "18%", width: "30%" },
    khankendi: { top: "35%", left: "45%", width: "19%" },
    shusha: { top: "47%", left: "40%", width: "24%" },
    khojavend: { top: "46%", left: "61%", width: "29%" },
    qubadli: { top: "61%", left: "21%", width: "29%" },
    zangilan: { top: "76%", left: "37%", width: "25%" },
  };

  return (
    <div
      className="page-shell"
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "relative",
        zIndex: 0,
        isolation: "isolate",
      }}
    >
      {/* Sabit Arxa Plan Şəkli */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: `url(${cidirImages[bgIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 0.8s ease-in-out",
          zIndex: -2,
        }}
      />

      {/* Sabit Qara Pərdə */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(5, 10, 16, 0.82)",
          zIndex: -1,
        }}
      />

      {/* Sürüşən məzmun */}
      <div style={{ position: "relative", zIndex: 1, paddingBottom: "100px" }}>
        <div
          style={{ width: "min(1400px, calc(100% - 72px))", margin: "0 auto" }}
        >
          <Header active="trip" />
        </div>

        <main
          className="dashboard-main"
          style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 20px" }}
        >
          <section
            className="page-title reveal"
            style={{
              maxWidth: "720px",
              textAlign: "center",
              margin: "36px auto 0",
            }}
          >
            <span className="eyebrow mono" style={{ color: "#38bdf8" }}>
              Plan your expedition / 02
            </span>
            <h1
              style={{
                color: "#ffffff",
                fontSize: "2.4rem",
                fontWeight: 700,
                lineHeight: 1.1,
                margin: "8px 0 0",
              }}
            >
              Your next take-off awaits.
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                maxWidth: "600px",
                margin: "8px auto 0",
              }}
            >
              Handpicked mountain stays, ancient routes, and local guides for an
              unhurried journey through Karabakh.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "4px 14px",
                marginTop: "8px",
                color: "rgba(255,255,255,0.78)",
                fontSize: "13px",
              }}
            >
              <span>✔ Reliable support</span>
              <span>⚡ Booking guarantee</span>
              <span>🏆 Great savings</span>
            </div>
          </section>

          {/* Axtarış Paneli */}
          <div
            style={{
              maxWidth: "920px",
              margin: "18px auto 0",
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(16px)",
              borderRadius: "20px",
              padding: "20px 28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              color: "#1a1a1a",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "32px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "0px",
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("stays")}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: activeTab === "stays" ? "700" : "500",
                  color: activeTab === "stays" ? "#0284c7" : "#64748b",
                  borderBottom:
                    activeTab === "stays"
                      ? "3px solid #0284c7"
                      : "3px solid transparent",
                  paddingBottom: "12px",
                  marginBottom: "-1px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                🏠 Stays & Cabins
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("routes")}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: activeTab === "routes" ? "700" : "500",
                  color: activeTab === "routes" ? "#0284c7" : "#64748b",
                  borderBottom:
                    activeTab === "routes"
                      ? "3px solid #0284c7"
                      : "3px solid transparent",
                  paddingBottom: "12px",
                  marginBottom: "-1px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                🏔️ Mountain Routes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("guides")}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: activeTab === "guides" ? "700" : "500",
                  color: activeTab === "guides" ? "#0284c7" : "#64748b",
                  borderBottom:
                    activeTab === "guides"
                      ? "3px solid #0284c7"
                      : "3px solid transparent",
                  paddingBottom: "12px",
                  marginBottom: "-1px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                🚩 Local Guides
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: "14px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "#f4f5f7",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "#64748b",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Destination
                </span>
                <input
                  type="text"
                  placeholder="Shusha, Lachin, Kalbajar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginTop: "2px",
                  }}
                />
              </div>

              <div
                style={{
                  background: "#f4f5f7",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "#64748b",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Dates & Guests
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginTop: "2px",
                  }}
                >
                  Next weekend • 2 Guests
                </span>
              </div>

              <button
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  padding: "13px 24px",
                  borderRadius: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "15px",
                }}
              >
                Search Trip ↗
              </button>
            </div>
          </div>

          {/* Region explorer */}
          <div
            style={{
              width: "calc(100% + 20px)",
              marginTop: "60px",
              marginLeft: "-20px",
              marginRight: 0,
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "100vw",
                display: "flex",
                alignItems: "end",
                justifyContent: "flex-start",
                gap: "20px",
                padding: "0 36px",
                marginLeft: "calc(50% - 50vw)",
                marginBottom: "20px",
              }}
            >
              <div>
                <span className="eyebrow mono" style={{ color: "#38bdf8" }}>
                  Interactive district atlas
                </span>
                <h2
                  style={{ color: "#fff", margin: "8px 0 0", fontSize: "28px" }}
                >
                  Explore Karabakh Regions
                </h2>
              </div>
              <span
                style={{
                  marginLeft: "auto",
                  color: "rgba(255,255,255,0.62)",
                  fontSize: "13px",
                }}
              >
                {visibleRegions.length} regions to explore
              </span>
            </div>
            <nav
              aria-label="Karabakh map regions"
              style={{
                width: "100vw",
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                padding: "0 36px 4px",
                marginLeft: "calc(50% - 50vw)",
                marginBottom: "18px",
              }}
            >
              {regionTabs.map((tab) => {
                const isActive = activeRegionTab === tab.slug;
                return (
                  <button
                    key={tab.slug}
                    type="button"
                    onClick={() => setActiveRegionTab(tab.slug)}
                    style={{
                      flex: "0 0 auto",
                      border: isActive
                        ? "1px solid #38bdf8"
                        : "1px solid rgba(255,255,255,0.16)",
                      borderRadius: "999px",
                      padding: "9px 14px",
                      background: isActive
                        ? "#0284c7"
                        : "rgba(255,255,255,0.08)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: isActive ? "700" : "500",
                      transition:
                        "background 0.2s ease, border-color 0.2s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            <div
              style={{
                position: "relative",
                width: "calc(100vw - 72px)",
                minHeight: "680px",
                overflow: "hidden",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "24px",
                backgroundColor: "rgba(2, 132, 199, 0.15)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
                marginLeft: "calc(50% - 50vw + 36px)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.22,
                  backgroundImage:
                    "linear-gradient(rgba(125,211,252,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.16) 1px, transparent 1px)",
                  backgroundSize: "42px 42px",
                  pointerEvents: "none",
                }}
              />
              {visibleRegions.map((region) => {
                const isHovered = hoveredRegion === region.slug;
                const isFocused =
                  activeRegionTab === "all" || activeRegionTab === region.slug;
                const position = mapPositions[region.slug];
                return (
                  <button
                    key={region.slug}
                    type="button"
                    aria-label={`Explore ${region.label}`}
                    onMouseEnter={() => setHoveredRegion(region.slug)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onFocus={() => setHoveredRegion(region.slug)}
                    onBlur={() => setHoveredRegion(null)}
                    onClick={() => {
                      window.location.href = `/district/${region.slug}`;
                    }}
                    style={{
                      position: "absolute",
                      ...position,
                      aspectRatio: "1 / 1",
                      border: "none",
                      padding: 0,
                      background: "transparent",
                      cursor: "pointer",
                      opacity: isFocused ? 1 : 0.3,
                      filter: isHovered
                        ? "drop-shadow(0 0 18px rgba(125,211,252,0.9)) saturate(1.25)"
                        : "drop-shadow(0 7px 10px rgba(0,0,0,0.42)) saturate(0.95)",
                      transform: isHovered
                        ? "scale(1.06)"
                        : activeRegionTab === region.slug
                          ? "scale(1.03)"
                          : "scale(1)",
                      transition:
                        "opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease",
                      zIndex:
                        isHovered || activeRegionTab === region.slug ? 3 : 1,
                    }}
                  >
                    <img
                      src={region.image}
                      alt=""
                      aria-hidden="true"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        pointerEvents: "none",
                      }}
                    />
                  </button>
                );
              })}
              <div
                style={{
                  position: "absolute",
                  right: "20px",
                  bottom: "20px",
                  left: "20px",
                  minHeight: "132px",
                  padding: "18px 20px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "16px",
                  backgroundColor: activeMapRegion
                    ? "rgba(5, 12, 20, 0.85)"
                    : "rgba(5, 12, 20, 0.66)",
                  backdropFilter: "blur(12px)",
                  color: "#fff",
                  opacity: activeMapRegion ? 1 : 0.86,
                  transition: "background-color 0.3s ease, opacity 0.3s ease",
                  pointerEvents: activeMapRegion ? "auto" : "none",
                  zIndex: 4,
                }}
              >
                {activeMapRegion ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: "#7dd3fc",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        {activeMapRegion.fact}
                      </span>
                      <h3 style={{ margin: "5px 0 7px", fontSize: "25px" }}>
                        {activeMapRegion.label}
                      </h3>
                      <p
                        style={{
                          maxWidth: "580px",
                          margin: 0,
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "13px",
                          lineHeight: 1.5,
                        }}
                      >
                        {activeMapRegion.narrative}
                      </p>
                    </div>
                    <a
                      href={`/district/${activeMapRegion.slug}`}
                      style={{
                        flex: "0 0 auto",
                        padding: "10px 14px",
                        border: "1px solid rgba(125,211,252,0.68)",
                        borderRadius: "9px",
                        background: "rgba(2,132,199,0.28)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "700",
                      }}
                    >
                      Explore Region ↗
                    </a>
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(255,255,255,0.72)",
                      fontSize: "14px",
                    }}
                  >
                    Hover a district to reveal its story and plan your route.
                  </p>
                )}
              </div>
            </div>

            {/* Scroll etmək üçün böyük boşluq */}
            <div style={{ height: "700px" }}></div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CommunityArchive() {
  const [shared, setShared] = useState(false);
  const [caption, setCaption] = useState("");
  const [coins, setCoins] = useState([]);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [worldTilt, setWorldTilt] = useState({ x: 0, y: 0 });
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  const memories = photos.map(([src, alt, author, place], index) => ({
    id: src,
    src,
    alt,
    author,
    place,
    type: ["PHOTO", "STORY", "PLACE", "HERITAGE", "COMMUNITY MEMORY"][index],
    position: [
      { left: "21%", top: "27%" },
      { left: "47%", top: "20%" },
      { left: "72%", top: "34%" },
      { left: "34%", top: "61%" },
      { left: "66%", top: "67%" },
    ][index],
  }));
  const clusters = Object.values(
    memories.reduce((groups, memory) => {
      const cluster = groups[memory.place] || {
        id: memory.place,
        place: memory.place,
        memories: [],
      };
      cluster.memories.push(memory);
      groups[memory.place] = cluster;
      return groups;
    }, {}),
  );
  const visibleMemories = activeCluster
    ? activeCluster.memories.slice(0, 5)
    : [];

  const moveThroughWorld = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setWorldTilt({
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
    });
  };

  const openAuthIfGuest = (event) => {
    if (event && typeof event.preventDefault === "function")
      event.preventDefault();
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      return true;
    }
    return false;
  };

  const share = (event) => {
    event.preventDefault();
    if (!caption.trim()) return;
    if (!isLoggedIn) {
      window.dispatchEvent(
        new CustomEvent("auth:open", {
          detail: { onSuccess: () => share(event) },
        }),
      );
      return;
    }
    setShared(true);
    setCoins(
      Array.from({ length: 34 }, (_, index) => ({
        id: `${Date.now()}-${index}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        drift: (Math.random() - 0.5) * 180,
      })),
    );
    window.setTimeout(() => setCoins([]), 2800);
  };

  return (
    <div className="page-shell memory-page">
      <Header active="community" />
      <main className="memory-world-shell">
        <section
          className={`memory-world${selectedMemory ? " has-focus" : ""}`}
          onMouseMove={moveThroughWorld}
          style={{
            "--world-x": `${worldTilt.x * -12}px`,
            "--world-y": `${worldTilt.y * -8}px`,
          }}
          aria-label="Inter Karabakh living memory world"
        >
          <div className="memory-sky" aria-hidden="true" />
          <div
            className="memory-mountains memory-mountains-far"
            aria-hidden="true"
          />
          <div
            className="memory-mountains memory-mountains-near"
            aria-hidden="true"
          />
          <div className="memory-valley" aria-hidden="true">
            <span className="memory-path" />
          </div>
          <div className="memory-intro">
            <span className="eyebrow mono">
              Inter Karabakh / living archive
            </span>
            <h1>
              Where memory
              <br />
              <em>takes root.</em>
            </h1>
            <p>
              Move through the traces left across Karabakh. Approach a light,
              and a story comes closer.
            </p>
          </div>
          <div className="memory-guide" aria-hidden="true">
            <img src="/lacin/khari-bulbul1.png" alt="" />
            <span />
          </div>
          <div
            className="memory-traces"
            style={{
              transform: `translate3d(var(--world-x), var(--world-y), 0)`,
            }}
          >
            {!activeCluster &&
              clusters.map((cluster, index) => (
                <button
                  className="memory-cluster"
                  key={cluster.id}
                  style={{
                    left: `${22 + index * 18}%`,
                    top: `${29 + (index % 2) * 25}%`,
                  }}
                  type="button"
                  onClick={() => {
                    setActiveCluster(cluster);
                    setSelectedMemory(null);
                  }}
                >
                  <span className="cluster-trace" />
                  <span className="trace-label mono">{cluster.place}</span>
                  <small>{cluster.memories.length} memory</small>
                </button>
              ))}
            {activeCluster && (
              <button
                className="cluster-back mono"
                type="button"
                onClick={() => {
                  setActiveCluster(null);
                  setSelectedMemory(null);
                }}
              >
                ← All traces
              </button>
            )}
            {visibleMemories.map((memory, index) => (
              <button
                className={`memory-trace memory-trace-${memory.type.toLowerCase().replaceAll(" ", "-")}${selectedMemory?.id === memory.id ? " is-selected" : ""}`}
                key={memory.id}
                style={memory.position}
                type="button"
                onClick={() => setSelectedMemory(memory)}
                onMouseEnter={() => setSelectedMemory(memory)}
              >
                <span className="trace-object">
                  {memory.type === "PHOTO" ? (
                    <img src={memory.src} alt="" loading="lazy" />
                  ) : (
                    <span className="trace-mark">
                      {index === 1
                        ? "◫"
                        : index === 2
                          ? "⌖"
                          : index === 3
                            ? "✦"
                            : "·"}
                    </span>
                  )}
                </span>
                <span className="trace-label mono">{memory.type}</span>
              </button>
            ))}
          </div>
          {selectedMemory && (
            <div className="memory-info" key={selectedMemory.src}>
              <span className="mono">
                {selectedMemory.type} / {selectedMemory.place}
              </span>
              <h2>{selectedMemory.place}</h2>
              <p>“{selectedMemory.alt}.”</p>
              <div>
                <span>{selectedMemory.author}</span>
                <span className="mono">2 days ago</span>
              </div>
              <button type="button" onClick={() => setSelectedMemory(null)}>
                Close memory ×
              </button>
            </div>
          )}
          <div className="memory-title-note mono">
            40°08' N&nbsp;&nbsp; 47°34' E / archive 03
          </div>
          <button
            className={`trace-entry ${traceOpen ? "is-open" : ""}`}
            type="button"
            onClick={() => setTraceOpen((open) => !open)}
          >
            <span className="trace-entry-dot" />
            Leave a trace <b>{traceOpen ? "×" : "↗"}</b>
          </button>
          {traceOpen && (
            <aside className="trace-form-space glass">
              <span className="eyebrow mono">Add to the atlas</span>
              <h3>Leave a trace.</h3>
              <p>
                {isLoggedIn
                  ? "Share one frame from your route and receive 50 GoKarabakh coins."
                  : "Share one frame from your route with the community."}
              </p>
              <div className="trace-types">
                <button type="button" onClick={openAuthIfGuest}>
                  Memory
                </button>
                <button type="button" onClick={openAuthIfGuest}>
                  Photo
                </button>
                <button type="button" onClick={openAuthIfGuest}>
                  Story
                </button>
                <button type="button" onClick={openAuthIfGuest}>
                  Sound
                </button>
                <button type="button" onClick={openAuthIfGuest}>
                  Place
                </button>
              </div>
              <form className="share-form" onSubmit={share}>
                <label
                  className="upload-drop"
                  htmlFor="photo-input"
                  onClick={openAuthIfGuest}
                >
                  <span>＋</span>
                  <span>Choose a field note</span>
                </label>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  disabled={!isLoggedIn}
                  onClick={openAuthIfGuest}
                />
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  type="text"
                  placeholder="A short caption"
                  aria-label="A short caption"
                  required
                  disabled={!isLoggedIn}
                  onClick={openAuthIfGuest}
                />
                <button
                  className="button button-primary"
                  type="submit"
                  onClick={openAuthIfGuest}
                >
                  {shared
                    ? "Shared"
                    : isLoggedIn
                      ? "Share / earn 50 ↗"
                      : "Sign in to share ↗"}
                </button>
              </form>
            </aside>
          )}
        </section>
      </main>
      <div className="coin-rain" aria-hidden="true">
        {coins.map((coin) => (
          <span
            className="falling-coin"
            style={{
              left: `${coin.left}%`,
              animationDelay: `${coin.delay}s`,
              "--drift": `${coin.drift}px`,
              color: "#38bdf8",
            }}
            key={coin.id}
          >
            G
          </span>
        ))}
      </div>
    </div>
  );
}

function Community() {
  const [shared, setShared] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  const openAuthIfGuest = (event) => {
    if (!isLoggedIn) {
      if (event && typeof event.preventDefault === "function")
        event.preventDefault();
      window.dispatchEvent(new CustomEvent("auth:open"));
    }
  };

  const share = (event) => {
    event.preventDefault();
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent("auth:open"));
      return;
    }
    if (!selectedFile && !caption.trim()) return;
    if (selectedFile)
      setUploadedImage({
        src: URL.createObjectURL(selectedFile),
        caption: caption.trim() || "A new field note",
      });
    setShared(true);
  };

  const cards = [
    ...photos.map(([src, alt, author, place], index) => ({
      src,
      alt,
      author,
      place,
      className: `community-memory-card card-${index + 1}`,
    })),
    ...(uploadedImage
      ? [
          {
            ...uploadedImage,
            alt: uploadedImage.caption,
            author: "You",
            place: "New memory",
            className: "community-memory-card card-uploaded",
          },
        ]
      : []),
  ];

  return (
    <div className="page-shell community-memory-page">
      <Header active="community" />
      <main className="community-memory-main">
        <section className="community-memory-intro">
          <span className="eyebrow mono" style={{ color: "#38bdf8" }}>
            Inter Karabakh / living archive
          </span>
          <h1>
            Leave a trace.
            <br />
            <em>Keep it alive.</em>
          </h1>
          <p>
            Real moments from the road, held in a quiet space for the next
            traveller to discover.
          </p>
        </section>
        <section
          className="community-memory-stage"
          aria-label="Community memories"
        >
          {cards.map((card) => (
            <article
              className={card.className}
              key={`${card.src}-${card.author}`}
            >
              <div className="community-card-string" aria-hidden="true" />
              <div className="community-card-image">
                <img src={card.src} alt={card.alt} loading="lazy" />
              </div>
              <div className="community-card-meta">
                <span>{card.author}</span>
                <span className="mono">{card.place}</span>
              </div>
              <p className="community-card-comment">
                “{card.caption || card.alt}”
              </p>
            </article>
          ))}
          <span className="community-stage-line" />
          <span className="community-stage-light" />
        </section>
        {isLoggedIn && <button className="community-trace-trigger" type="button" onClick={() => setTraceOpen((open) => !open)} aria-label="Open photo upload" title="Upload a photo">
          <span>{traceOpen ? "×" : "+"}</span>
        </button>}
        {isLoggedIn && traceOpen && <aside className="community-trace-panel">
          <h2>Share one moment.</h2>
          <p>
            {isLoggedIn
              ? "Your field note will join the memory wall."
              : "Sign in to add your own field note."}
          </p>
          <form onSubmit={share}>
            <label
              className="community-upload"
              htmlFor="community-photo-input"
              onClick={openAuthIfGuest}
            >
              <span className="community-upload-icon">+</span>
              <span>{selectedFile ? selectedFile.name : "Choose a photo"}</span>
            </label>
            <input
              id="community-photo-input"
              type="file"
              accept="image/*"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
              onClick={openAuthIfGuest}
              disabled={!isLoggedIn}
            />
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="A short caption"
              aria-label="A short caption"
              onClick={openAuthIfGuest}
              disabled={!isLoggedIn}
            />
            <button type="submit" onClick={openAuthIfGuest}>
              {shared
                ? "Added to the archive"
                : isLoggedIn
                  ? "Leave a trace ↗"
                  : "Sign in to contribute ↗"}
            </button>
          </form>
        </aside>}
      </main>
    </div>
  );
}

function DistrictPage({ slug }) {
  const districts = {
    shusha: {
      name: "Shusha",
      image: "/shusha/shusha.JPG",
      tagline: "The cultural heart of Karabakh, poised above the plateau.",
    },
    kalbajar: {
      name: "Kalbajar",
      image: "/kelbecer/kelbecer.jpg",
      tagline: "A highland escape of alpine passes, springs, and wild trails.",
    },
    lachin: {
      name: "Lachin",
      image: "/lacin/lacin.jpg",
      tagline:
        "Forested valleys and quiet river routes at the mountain frontier.",
    },
    khankendi: {
      name: "Khankendi",
      image: "/khankendi/khankendi.jpeg",
      tagline: "A welcoming valley base for an unhurried Karabakh journey.",
    },
    aghdam: {
      name: "Aghdam",
      image: "/agdam/agdam.jpg",
      tagline: "Heritage plains, cultural landmarks, and open horizons.",
    },
    khojaly: {
      name: "Khojaly",
      image: "/khocali/khocali.jpg",
      tagline: "Ancient landscapes and wide, rolling uplands to explore.",
    },
    khojavend: {
      name: "Khojavend",
      image: "/xocavend/xocavend.jpeg",
      tagline: "Wooded slopes, hidden trails, and striking viewpoints.",
    },
    qubadli: {
      name: "Qubadli",
      image: "/qubadli/qubadli.jpg",
      tagline: "Riverside routes and lush southern mountain landscapes.",
    },
    zangilan: {
      name: "Zangilan",
      image: "/zengilan/zengilan.jpeg",
      tagline: "Nature reserves and the tranquil Aras valley.",
    },
  };
  const district = districts[slug] || {
    name: slug,
    image: "/shusha/shusha.JPG",
    tagline: "Discover the landscapes, stays, and stories of Karabakh.",
  };
  const [activeCategory, setActiveCategory] = useState("Hotels");
  const categories = [
    { name: "Hotels", icon: "🏨" },
    { name: "Attractions", icon: "🏛️" },
    { name: "Restaurants", icon: "🍽️" },
    { name: "The Most Popular", icon: "🔥" },
  ];
  const categoryCopy = {
    Hotels:
      "Handpicked stays with mountain views, local character, and easy access to the region.",
    Attractions:
      "Essential landmarks, viewpoints, and cultural sites for your route.",
    Restaurants:
      "Local tables, regional flavours, and welcoming places to pause between discoveries.",
    "The Most Popular":
      "The most-loved stays, sights, and local experiences in this region.",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#08131d", color: "#fff" }}>
      <section
        style={{
          position: "relative",
          minHeight: "500px",
          overflow: "hidden",
          backgroundImage: `url(${district.image})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(4,12,20,0.9), rgba(4,12,20,0.45) 55%, rgba(4,12,20,0.68)), linear-gradient(0deg, rgba(4,12,20,0.78), transparent 52%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "min(1400px, calc(100% - 72px))",
            margin: "0 auto",
          }}
        >
          <Header active="trip" />
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "min(1100px, calc(100% - 72px))",
            margin: "110px auto 0",
          }}
        >
          <p className="mono" style={{ margin: 0, color: "#7dd3fc" }}>
            Trip / Karabakh / {district.name}
          </p>
          <h1
            style={{
              maxWidth: "680px",
              margin: "14px 0 12px",
              fontSize: "clamp(44px, 7vw, 76px)",
              letterSpacing: "-0.075em",
              lineHeight: 0.95,
            }}
          >
            {district.name}
          </h1>
          <p
            style={{
              maxWidth: "560px",
              margin: 0,
              color: "rgba(255,255,255,0.82)",
              fontSize: "17px",
              lineHeight: 1.6,
            }}
          >
            {district.tagline}
          </p>
          <span
            style={{
              display: "inline-flex",
              marginTop: "20px",
              padding: "8px 11px",
              border: "1px solid rgba(255,255,255,0.28)",
              borderRadius: "8px",
              background: "rgba(5,12,20,0.48)",
              fontSize: "13px",
            }}
          >
            ✦ Plan a 2–4 day stay
          </span>
        </div>
      </section>

      <main
        style={{
          width: "min(1100px, calc(100% - 72px))",
          margin: "0 auto",
          padding: "30px 0 80px",
        }}
      >
        <nav
          aria-label={`${district.name} travel categories`}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "28px",
            overflowX: "auto",
            padding: "6px 10px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.13)",
          }}
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.name;
            return (
              <button
                key={category.name}
                type="button"
                onClick={() => setActiveCategory(category.name)}
                style={{
                  flex: "0 0 auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: isActive ? "#7dd3fc" : "rgba(255,255,255,0.8)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: isActive ? "800" : "600",
                }}
              >
                <span
                  style={{
                    display: "grid",
                    width: "84px",
                    height: "84px",
                    placeItems: "center",
                    border: isActive
                      ? "2px solid #38bdf8"
                      : "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "50%",
                    background: isActive ? "#e0f2fe" : "#ffffff",
                    boxShadow: isActive
                      ? "0 12px 28px rgba(56,189,248,0.35)"
                      : "0 10px 24px rgba(0,0,0,0.24)",
                    color: "#0284c7",
                    fontSize: "34px",
                    transform: isActive ? "translateY(-4px)" : "translateY(0)",
                    transition:
                      "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
                  }}
                >
                  {category.icon}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>{category.name}</span>
              </button>
            );
          })}
        </nav>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(240px, 0.7fr)",
            gap: "22px",
            marginTop: "28px",
          }}
        >
          <article
            style={{
              padding: "28px",
              border: "1px solid rgba(125,211,252,0.2)",
              borderRadius: "18px",
              background: "rgba(16,35,49,0.72)",
            }}
          >
            <span className="eyebrow mono" style={{ color: "#38bdf8" }}>
              {activeCategory}
            </span>
            <h2 style={{ margin: "14px 0 10px", fontSize: "28px" }}>
              Discover {district.name}
            </h2>
            <p
              style={{
                maxWidth: "620px",
                margin: 0,
                color: "rgba(255,255,255,0.72)",
                fontSize: "15px",
                lineHeight: 1.7,
              }}
            >
              {categoryCopy[activeCategory]}
            </p>
            <button
              type="button"
              style={{
                marginTop: "22px",
                padding: "11px 15px",
                border: "none",
                borderRadius: "9px",
                background: "#38bdf8",
                color: "#07111a",
                cursor: "pointer",
                fontWeight: "800",
              }}
            >
              Browse {activeCategory} ↗
            </button>
          </article>
          <aside
            style={{
              padding: "24px",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <span className="mono" style={{ color: "#7dd3fc" }}>
              Local tip
            </span>
            <p
              style={{
                margin: "12px 0 0",
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.65,
              }}
            >
              Build your route around daylight viewpoints, then leave time for
              an unplanned local stop.
            </p>
            <a
              href="/dashboard"
              style={{
                display: "inline-block",
                marginTop: "18px",
                color: "#7dd3fc",
                fontWeight: "700",
              }}
            >
              ← Back to the map
            </a>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const getRoute = () => {
    const path = window.location.pathname.replace(/\/$/, "");
    const hash = (window.location.hash || "").toLowerCase();
    if (hash === "#community" || hash === "#inter-karabakh") return "community";
    if (path === "/dashboard" || path === "/dashboard.html") return "dashboard";
    if (path === "/community" || path === "/community.html") return "community";
    if (path.startsWith("/district/")) return "district";
    return "landing";
  };

  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute());
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  let page = <Landing />;
  if (route === "dashboard") page = <Dashboard />;
  if (route === "community") page = <Community />;
  if (route === "district")
    page = (
      <DistrictPage slug={window.location.pathname.replace("/district/", "")} />
    );
  return <AuthShell>{page}</AuthShell>;
}
