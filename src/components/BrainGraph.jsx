import { memo, useEffect, useId, useRef, useState } from "react";
import {
  BRAIN_VIEWBOX,
  BRAIN_OUTLINE,
  FIBERS,
  NODES_PER_PAGE,
  nodePosition,
} from "./brainGeometry.js";

const Hologram = memo(function Hologram({ prefix }) {
  return (
    <>
      <defs>
        <radialGradient id={`${prefix}-volume`} cx="42%" cy="38%" r="66%">
          <stop offset="0" stopColor="#204b9c" stopOpacity=".22" />
          <stop offset=".65" stopColor="#347bd1" stopOpacity=".12" />
          <stop offset="1" stopColor="#86eaff" stopOpacity=".25" />
        </radialGradient>
        <radialGradient id={`${prefix}-aura`}>
          <stop stopColor="#7ddcff" stopOpacity=".28" />
          <stop offset=".6" stopColor="#5272ff" stopOpacity=".08" />
          <stop offset="1" stopColor="#5272ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${prefix}-star`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset=".12" stopColor="#e9faff" stopOpacity=".98" />
          <stop offset=".26" stopColor="#8ce4ff" stopOpacity=".75" />
          <stop offset=".55" stopColor="#8990ff" stopOpacity=".3" />
          <stop offset="1" stopColor="#bc8cff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${prefix}-clip`}>
          <path d={BRAIN_OUTLINE} />
        </clipPath>
      </defs>
      <g className="brain-anatomy" aria-hidden="true">
        <ellipse
          cx="380"
          cy="285"
          rx="365"
          ry="280"
          fill={`url(#${prefix}-aura)`}
        />
        <path
          d={BRAIN_OUTLINE}
          fill={`url(#${prefix}-volume)`}
          stroke="#8bddff"
          strokeOpacity=".18"
          strokeWidth="9"
        />
        <path
          d={BRAIN_OUTLINE}
          fill="none"
          stroke="#a2f0ff"
          strokeOpacity=".75"
          strokeWidth="1.3"
        />
        <g clipPath={`url(#${prefix}-clip)`}>
          {FIBERS.bundles.map((d, i) => (
            <g key={i} className="fiber-bundle">
              <g
                className="fiber-sway"
                style={{
                  "--sway-duration": `${8 + (i % 7)}s`,
                  "--fiber-delay": `${-i * 0.71}s`,
                }}
              >
                <path
                  className="fiber-halo"
                  d={d}
                  fill="none"
                  stroke="#528cff"
                  strokeWidth="3"
                  opacity=".16"
                />
                <path
                  className="fiber-thread"
                  d={d}
                  fill="none"
                  stroke={i % 3 === 0 ? "#beabff" : "#7ddaff"}
                  strokeWidth=".65"
                  opacity=".58"
                />
                <path
                  className="neural-impulse fiber-current"
                  d={d}
                  fill="none"
                  stroke="#c1f4ff"
                  strokeWidth=".9"
                  strokeDasharray="3 29"
                  style={{
                    "--flow-duration": `${3 + (i % 5) * 0.6}s`,
                    "--fiber-delay": `${-i * 0.61}s`,
                  }}
                />
              </g>
            </g>
          ))}
          {FIBERS.points.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i % 4 === 0 ? 1.6 : 0.8}
              fill="#c4f7ff"
              opacity={i % 4 === 0 ? 0.9 : 0.4}
            />
          ))}
          {/* Curved cortical and cerebellar strands retain the anatomical profile. */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={BRAIN_OUTLINE}
              transform={`translate(${380 * i * 0.018} ${275 * i * 0.018}) scale(${1 - i * 0.018})`}
              fill="none"
              stroke="#88ddff"
              strokeWidth=".6"
              opacity=".25"
            />
          ))}
          <path
            d="M 639 326 C 583 327 568 385 501 393 C 448 405 427 376 381 379 C 326 391 259 365 239 331"
            fill="none"
            stroke="#a5beff"
            strokeWidth="1.3"
            opacity=".5"
          />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M ${520 + i * 2} ${405 + i * 5} Q ${585 + i * 3} ${380 + i * 10} ${650 - i * 3} ${385 + i * 8}`}
              fill="none"
              stroke="#98c9ff"
              strokeWidth=".8"
              opacity=".5"
            />
          ))}
        </g>
      </g>
    </>
  );
});

function useVisible(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let intersecting = true;
    const sync = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      sync();
    });
    observer.observe(ref.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref]);
  return visible;
}

export default memo(function BrainGraph({
  spheres,
  selected,
  onSelect,
  zoom,
  paused,
  children,
}) {
  const prefix = useId().replace(/:/g, "");
  const surfaceRef = useRef(null);
  const visible = useVisible(surfaceRef);
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(spheres.length / NODES_PER_PAGE);
  const safePage = Math.min(page, pageCount - 1);
  useEffect(() => {
    const index = spheres.findIndex((s) => s.id === selected);
    if (index >= 0) setPage(Math.floor(index / NODES_PER_PAGE));
  }, [selected, spheres]);
  const shown = spheres.slice(
    safePage * NODES_PER_PAGE,
    (safePage + 1) * NODES_PER_PAGE,
  );

  return (
    <div
      className="brain-surface anatomical holographic"
      ref={surfaceRef}
      data-motion={paused || !visible ? "paused" : "playing"}
    >
      <svg
        className="brain-scene"
        viewBox={`0 0 ${BRAIN_VIEWBOX.width} ${BRAIN_VIEWBOX.height}`}
        aria-label="Светящийся нейронный мозг: вид сбоку"
        style={{ transform: `scale(${zoom})` }}
      >
        <Hologram prefix={prefix} />
        <g
          className="brain-connections"
          clipPath={`url(#${prefix}-clip)`}
          aria-hidden="true"
        >
          {shown.map((sphere, i) => {
            const [x, y] = nodePosition(i),
              [nx, ny] = nodePosition((i + 2) % shown.length);
            const curve = `M ${x} ${y - 8} Q ${380 + (i % 2 ? 40 : -40)} ${(y + ny) / 2} ${nx} ${ny - 8}`;
            return (
              <g key={sphere.id}>
                <path
                  d={curve}
                  fill="none"
                  stroke={sphere.color}
                  strokeWidth={selected === sphere.id ? 2 : 1}
                  opacity={selected === sphere.id ? 0.9 : 0.3}
                />
                {
                  <path
                    className="neural-impulse"
                    d={curve}
                    fill="none"
                    stroke="#d5f8ff"
                    strokeWidth="2"
                    pathLength="100"
                    strokeDasharray="2 98"
                    style={{ animationDelay: `${-i * 2}s` }}
                  />
                }
              </g>
            );
          })}
        </g>
        <g
          className="neuron-stars"
          clipPath={`url(#${prefix}-clip)`}
          aria-hidden="true"
        >
          {shown.map((sphere, i) => {
            const [x, y] = nodePosition(i);
            return (
              <g key={sphere.id} transform={`translate(${x} ${y - 10})`}>
                <g
                  className="neuron-flare"
                  style={{ "--fiber-delay": `${-i * 0.7}s` }}
                >
                  <circle
                    r={selected === sphere.id ? 54 : 42}
                    fill={`url(#${prefix}-star)`}
                  />
                  <path
                    d="M -17,0 H 17 M 0,-17 V 17"
                    stroke="#beeaff"
                    strokeWidth=".7"
                    opacity=".6"
                  />
                  <circle r="2.4" fill="#fff" />
                </g>
              </g>
            );
          })}
        </g>
        {shown.map((sphere, i) => {
          const [x, y] = nodePosition(i);
          return (
            <foreignObject
              key={sphere.id}
              x={x - 67}
              y={y - 25}
              width="134"
              height="50"
              className="brain-node-area"
              data-node-x={x}
              data-node-y={y}
            >
              <button
                className={`neuron ${selected === sphere.id ? "selected" : ""}`}
                style={{ "--node-color": sphere.color }}
                aria-label={`Открыть сферу ${sphere.name}`}
                aria-pressed={selected === sphere.id}
                onClick={() => onSelect(sphere.id)}
              >
                <span className="neuron-core">
                  <span />
                </span>
                <span className="neuron-label" title={sphere.name}>
                  {sphere.name}
                </span>
              </button>
            </foreignObject>
          );
        })}
      </svg>
      {children}
      {pageCount > 1 && (
        <div className="brain-pagination" aria-label="Страницы сфер">
          <button
            disabled={safePage === 0}
            aria-label="Предыдущие сферы"
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button
            disabled={safePage === pageCount - 1}
            aria-label="Следующие сферы"
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
});
