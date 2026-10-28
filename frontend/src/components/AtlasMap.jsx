import { MAP } from "../data/azerbaijanMap.js";
import { useI18n } from "../i18n/index.jsx";

// Small regions get a dot and a label moved off the shape so it doesn't cover the neighbour
const LABEL_OFFSET = { khankendi: [62, 4], khojaly: [-6, -22] };
const DOT = new Set(["khankendi"]);

export default function AtlasMap({ focus, hovered, onHover, onSelect }) {
  const { t } = useI18n();
  const isDimmed = (slug) => focus !== "all" && focus !== slug;

  const keyDown = (event, slug) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(slug);
    }
  };

  return (
    <div className="atlas-svg-wrap">
      <svg className="atlas-svg" viewBox={`0 0 ${MAP.width} ${MAP.height}`} role="group" aria-label={t("trip.atlasTitle")}>
        <path className="atlas-context" d={MAP.districts} aria-hidden="true" />
        {MAP.regions.map(({ slug, d }) => (
          <path
            key={slug}
            d={d}
            className={`atlas-shape${hovered === slug ? " is-hovered" : ""}${focus === slug ? " is-selected" : ""}${isDimmed(slug) ? " is-dimmed" : ""}`}
            tabIndex={0}
            role="link"
            aria-label={t("trip.exploreRegion", { name: t(`regions.${slug}.label`) })}
            onMouseEnter={() => onHover(slug)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(slug)}
            onBlur={() => onHover(null)}
            onClick={() => onSelect(slug)}
            onKeyDown={(event) => keyDown(event, slug)}
          />
        ))}
        {MAP.regions.map(({ slug, labelAt }) => {
          const [dx, dy] = LABEL_OFFSET[slug] || [0, 0];
          return (
            <g key={slug} className={`atlas-label${isDimmed(slug) ? " is-dimmed" : ""}`} aria-hidden="true">
              {DOT.has(slug) && <circle cx={labelAt[0]} cy={labelAt[1]} r="6" />}
              <text x={labelAt[0] + dx} y={labelAt[1] + dy}>{t(`regions.${slug}.label`)}</text>
            </g>
          );
        })}
      </svg>
      <svg className="atlas-inset" viewBox={`0 0 ${MAP.inset.width} ${MAP.inset.height}`} aria-hidden="true">
        <path d={MAP.inset.d} />
        <rect x={MAP.inset.frame[0]} y={MAP.inset.frame[1]} width={MAP.inset.frame[2]} height={MAP.inset.frame[3]} />
      </svg>
      <small className="atlas-credit">{t("trip.mapCredit")}</small>
    </div>
  );
}
