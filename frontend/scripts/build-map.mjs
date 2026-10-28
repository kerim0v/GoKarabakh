// Turns the district boundaries (scripts/data/azerbaijan-districts.geojson, from geoBoundaries,
// CC BY 4.0) into compact SVG paths for the trip atlas: src/data/azerbaijanMap.js.
// Run after changing the source or the regions:  node scripts/build-map.mjs
import fs from "node:fs";

const SOURCE = new URL("./data/azerbaijan-districts.geojson", import.meta.url);
const OUTPUT = new URL("../src/data/azerbaijanMap.js", import.meta.url);

// Our region slug -> district names in the source file
const REGIONS = {
  shusha: ["Shusha District", "Shusha City"],
  kalbajar: ["Kalbajar District"],
  lachin: ["Lachin District"],
  khankendi: ["Khankendi City"],
  aghdam: ["Agdam District"],
  khojaly: ["Khojaly District"],
  khojavend: ["Khojavend District"],
  qubadli: ["Qubadli District"],
  zangilan: ["Zangilan District"],
};

const geo = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const regionOf = (name) => Object.keys(REGIONS).find((slug) => REGIONS[slug].includes(name)) || null;
const polygons = (geometry) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates);

// Equirectangular projection, corrected for the latitude of Azerbaijan
const LAT0 = 40.2;
const KX = Math.cos((LAT0 * Math.PI) / 180);
const project = ([lon, lat]) => [lon * KX, -lat];

function bounds(features) {
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features) for (const poly of polygons(f.geometry)) for (const [x, y] of poly[0].map(project)) {
    box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y);
    box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
  }
  return box;
}

// Map projected coordinates into a viewBox of the given width, dropping points closer than `minStep`
function makePath(features, box, width, minStep) {
  const scale = width / (box[2] - box[0]);
  const toView = (p) => {
    const [x, y] = project(p);
    return [(x - box[0]) * scale, (y - box[1]) * scale];
  };
  return (feature) => {
    let d = "";
    for (const poly of polygons(feature.geometry)) {
      for (const ring of poly) {
        const points = [];
        for (const p of ring.map(toView)) {
          const last = points[points.length - 1];
          if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minStep) points.push(p);
        }
        if (points.length < 3) continue;
        d += "M" + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
      }
    }
    return { d, scale };
  };
}

// Label point: area-weighted centroid of the largest outer ring
function centroid(feature, box, scale) {
  let best = null;
  for (const poly of polygons(feature.geometry)) {
    const ring = poly[0].map(project).map(([x, y]) => [(x - box[0]) * scale, (y - box[1]) * scale]);
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
      const cross = x1 * y2 - x2 * y1;
      area += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
    }
    if (!best || Math.abs(area) > Math.abs(best.area)) best = { area, x: cx / (3 * area), y: cy / (3 * area) };
  }
  return [Number(best.x.toFixed(1)), Number(best.y.toFixed(1))];
}

// Main map: the nine regions plus a margin of neighbouring districts for context
const targets = geo.features.filter((f) => regionOf(f.properties.shapeName));
const [x0, y0, x1, y1] = bounds(targets);
const padX = (x1 - x0) * 0.14, padY = (y1 - y0) * 0.08;
const box = [x0 - padX, y0 - padY, x1 + padX, y1 + padY];
const WIDTH = 1000;
const mainPath = makePath(geo.features, box, WIDTH, 0.8);
const height = Number(((box[3] - box[1]) * (WIDTH / (box[2] - box[0]))).toFixed(1));
const inView = (f) => {
  const [a, b, c, e] = bounds([f]);
  return c > box[0] && a < box[2] && e > box[1] && b < box[3];
};

const districts = [];
const regionShapes = {};
for (const feature of geo.features.filter(inView)) {
  const slug = regionOf(feature.properties.shapeName);
  const { d, scale } = mainPath(feature);
  if (slug) {
    regionShapes[slug] = regionShapes[slug] || { slug, d: "", labelAt: null };
    regionShapes[slug].d += d;
    // Label each region at its biggest piece (Shusha District, not Shusha City)
    if (feature.properties.shapeName === REGIONS[slug][0]) regionShapes[slug].labelAt = centroid(feature, box, scale);
  } else {
    districts.push(d);
  }
}

// Inset: the whole country, small and simplified, with the main map's frame drawn on it
const countryBox = bounds(geo.features);
const INSET_WIDTH = 200;
const insetPath = makePath(geo.features, countryBox, INSET_WIDTH, 1.2);
const insetScale = INSET_WIDTH / (countryBox[2] - countryBox[0]);
const inset = {
  width: INSET_WIDTH,
  height: Number(((countryBox[3] - countryBox[1]) * insetScale).toFixed(1)),
  d: geo.features.map((f) => insetPath(f).d).join(""),
  frame: [box[0], box[1], box[2] - box[0], box[3] - box[1]].map((v, i) =>
    Number(((v - (i === 0 ? countryBox[0] : i === 1 ? countryBox[1] : 0)) * insetScale).toFixed(1))),
};

const output = `// Generated by scripts/build-map.mjs - do not edit by hand.
// District boundaries: geoBoundaries (www.geoboundaries.org), CC BY 4.0.
export const MAP = ${JSON.stringify({ width: WIDTH, height, districts: districts.join(""), regions: Object.values(regionShapes), inset })};
`;
fs.writeFileSync(OUTPUT, output);
console.log(`wrote ${OUTPUT.pathname} (${(output.length / 1024).toFixed(0)} kB, ${Object.keys(regionShapes).length} regions)`);
