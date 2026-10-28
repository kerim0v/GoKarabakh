// The nine districts. Names, taglines and stories are translated in i18n under `regions.<slug>`.
export const REGIONS = [
  { slug: "shusha", map: "/map/map-shusha.png", hero: "/shusha/shusha.JPG", photos: ["/shusha/shusha.JPG", "/shusha/shusha2.JPG", "/shusha/shusha3.JPG"], mapPosition: { top: "47%", left: "40%", width: "24%" } },
  { slug: "kalbajar", map: "/map/map-kalbajar.png", hero: "/kelbecer/kelbecer.jpg", photos: ["/kelbecer/kelbecer.jpg", "/kelbecer/kelbecer2.jpeg", "/kelbecer/kelbecer3.jpeg"], mapPosition: { top: "1%", left: "5%", width: "38%" } },
  { slug: "lachin", map: "/map/map-lachin.png", hero: "/lacin/lacin.jpg", photos: ["/lacin/lacin.jpg", "/lacin/lacin2.jpeg", "/lacin/lacin3.jpg"], mapPosition: { top: "29%", left: "18%", width: "30%" } },
  { slug: "khankendi", map: "/map/map-khankendi.png", hero: "/khankendi/khankendi.jpeg", photos: ["/khankendi/khankendi.jpeg", "/khankendi/khankendi2.jpg", "/khankendi/khankendi.jpeg"], mapPosition: { top: "35%", left: "45%", width: "19%" } },
  { slug: "aghdam", map: "/map/map-aghdam.png", hero: "/agdam/agdam.jpg", photos: ["/agdam/agdam.jpg", "/agdam/agdam2.jpg", "/agdam/agdam3.jpg"], mapPosition: { top: "19%", left: "61%", width: "29%" } },
  { slug: "khojaly", map: "/map/map-khojaly.png", hero: "/khocali/khocali.jpg", photos: ["/khocali/khocali.jpg", "/khocali/khocali3.jpg", "/khocali/khocali.jpg"], mapPosition: { top: "2%", left: "42%", width: "28%" } },
  { slug: "khojavend", map: "/map/map-khojavend.png", hero: "/xocavend/xocavend.jpeg", photos: ["/xocavend/xocavend.jpeg", "/xocavend/xocavend2.jpeg", "/xocavend/xocavend.jpeg"], mapPosition: { top: "46%", left: "61%", width: "29%" } },
  { slug: "qubadli", map: "/map/map-qubadli.png", hero: "/qubadli/qubadli.jpg", photos: ["/qubadli/qubadli.jpg", "/qubadli/qubadli2.jpg", "/qubadli/qubadli3.jpg"], mapPosition: { top: "61%", left: "21%", width: "29%" } },
  { slug: "zangilan", map: "/map/map-zangilan.png", hero: "/zengilan/zengilan.jpeg", photos: ["/zengilan/zengilan.jpeg", "/zengilan/zengilan2.jpeg", "/zengilan/zengilan.jpeg"], mapPosition: { top: "76%", left: "37%", width: "25%" } },
];

export const REGION_SLUGS = REGIONS.map((r) => r.slug);
export const findRegion = (slug) => REGIONS.find((r) => r.slug === slug);

export const CATEGORIES = ["hotel", "restaurant", "attraction", "tour"];
export const BOOKABLE = ["hotel", "restaurant", "tour"];

// Shown on the community page until travellers share their own photos
export const CURATED_PHOTOS = [
  { src: "/shusha/shusha.JPG", region: "shusha" },
  { src: "/khocali/khocali3.jpg", region: "khojaly" },
  { src: "/lacin/lacin.jpg", region: "lachin" },
  { src: "/kelbecer/kelbecer.jpg", region: "kalbajar" },
  { src: "/xocavend/xocavend.jpeg", region: "khojavend" },
];
