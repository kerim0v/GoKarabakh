// The nine districts. Names, taglines and stories are translated in i18n under `regions.<slug>`.
export const REGIONS = [
  { slug: "shusha", hero: "/shusha/shusha.JPG", photos: ["/shusha/shusha.JPG", "/shusha/shusha2.JPG", "/shusha/shusha3.JPG"] },
  { slug: "kalbajar", hero: "/kelbecer/kelbecer.jpg", photos: ["/kelbecer/kelbecer.jpg", "/kelbecer/kelbecer2.jpeg", "/kelbecer/kelbecer3.jpeg"] },
  { slug: "lachin", hero: "/lacin/lacin.jpg", photos: ["/lacin/lacin.jpg", "/lacin/lacin2.jpeg", "/lacin/lacin3.jpg"] },
  { slug: "khankendi", hero: "/khankendi/khankendi.jpeg", photos: ["/khankendi/khankendi.jpeg", "/khankendi/khankendi2.jpg", "/khankendi/khankendi.jpeg"] },
  { slug: "aghdam", hero: "/agdam/agdam.jpg", photos: ["/agdam/agdam.jpg", "/agdam/agdam2.jpg", "/agdam/agdam3.jpg"] },
  { slug: "khojaly", hero: "/khocali/khocali.jpg", photos: ["/khocali/khocali.jpg", "/khocali/khocali3.jpg", "/khocali/khocali.jpg"] },
  { slug: "khojavend", hero: "/xocavend/xocavend.jpeg", photos: ["/xocavend/xocavend.jpeg", "/xocavend/xocavend2.jpeg", "/xocavend/xocavend.jpeg"] },
  { slug: "qubadli", hero: "/qubadli/qubadli.jpg", photos: ["/qubadli/qubadli.jpg", "/qubadli/qubadli2.jpg", "/qubadli/qubadli3.jpg"] },
  { slug: "zangilan", hero: "/zengilan/zengilan.jpeg", photos: ["/zengilan/zengilan.jpeg", "/zengilan/zengilan2.jpeg", "/zengilan/zengilan.jpeg"] },
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
