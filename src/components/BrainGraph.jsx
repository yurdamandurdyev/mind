import { memo, useEffect, useId, useRef, useState } from "react";
import {
  BRAIN_VIEWBOX,
  HEMISPHERE,
  SULCI,
  NODES_PER_PAGE,
  nodePosition,
} from "./brainGeometry.js";

const Anatomy = memo(function Anatomy({ prefix }) {
  return (
    <>
      <defs>
        <radialGradient id={`${prefix}-tissue`} cx="42%" cy="35%" r="70%">
          <stop offset="0" stopColor="#71958b" />
          <stop offset=".42" stopColor="#466d64" />
          <stop offset=".8" stopColor="#294b43" />
          <stop offset="1" stopColor="#152f29" />
        </radialGradient>
        <linearGradient id={`${prefix}-ridge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ccdfcc" stopOpacity=".65" />
          <stop offset=".45" stopColor="#8eafa0" stopOpacity=".45" />
          <stop offset="1" stopColor="#33564b" stopOpacity=".4" />
        </linearGradient>
        <clipPath id={`${prefix}-clip`}>
          <path d={HEMISPHERE} />
          <path d={HEMISPHERE} transform="translate(600 0) scale(-1 1)" />
        </clipPath>
      </defs>
      <g className="brain-anatomy" aria-hidden="true">
        {[false, true].map((mirror) => (
          <g
            key={String(mirror)}
            transform={mirror ? "translate(600 0) scale(-1 1)" : undefined}
          >
            <path
              d={HEMISPHERE}
              fill="#000"
              opacity=".3"
              transform="translate(0 6)"
            />
            <path
              d={HEMISPHERE}
              fill={`url(#${prefix}-tissue)`}
              stroke="#a9c7b5"
              strokeWidth="1.3"
            />
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Broad ridges give the gyri volume; dark grooves remain recessed. */}
              {SULCI.map((d, i) => (
                <g key={i}>
                  <path d={d} stroke="#1b342e" strokeWidth="13" opacity=".65" />
                  <path
                    d={d}
                    stroke={`url(#${prefix}-ridge)`}
                    strokeWidth="8"
                    transform="translate(-3 -3)"
                  />
                  <path d={d} stroke="#102923" strokeWidth="3.5" />
                  <path
                    d={d}
                    stroke="#203f35"
                    strokeWidth="1"
                    transform="translate(1 1)"
                  />
                </g>
              ))}
            </g>
            <path
              d={HEMISPHERE}
              fill="none"
              stroke="#c0d6bc"
              strokeWidth="3"
              strokeOpacity=".22"
              transform="translate(-1 -1)"
            />
          </g>
        ))}
        <path
          d="M 300,40 C 304,110 296,160 302,210 S 295,315 302,370 S 297,457 300,505"
          fill="none"
          stroke="#9bbf9e"
          strokeOpacity=".35"
          strokeWidth="1"
        />
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
      className="brain-surface anatomical"
      ref={surfaceRef}
      data-motion={paused || !visible ? "paused" : "playing"}
    >
      <svg
        className="brain-scene"
        viewBox={`0 0 ${BRAIN_VIEWBOX.width} ${BRAIN_VIEWBOX.height}`}
        aria-label="Мозг: вид сверху, два полушария с извилинами"
        style={{ transform: `scale(${zoom})` }}
      >
        <Anatomy prefix={prefix} />
        <g
          className="brain-connections"
          clipPath={`url(#${prefix}-clip)`}
          aria-hidden="true"
        >
          {shown.map((sphere, i) => {
            const [x, y] = nodePosition(i),
              [nx, ny] = nodePosition((i + 2) % shown.length);
            const curve = `M ${x} ${y - 8} Q ${300 + (i % 2 ? 40 : -40)} ${(y + ny) / 2} ${nx} ${ny - 8}`;
            return (
              <g key={sphere.id}>
                <path
                  d={curve}
                  fill="none"
                  stroke={sphere.color}
                  strokeWidth={selected === sphere.id ? 2 : 1}
                  opacity={selected === sphere.id ? 0.9 : 0.3}
                />
                {i < 3 && (
                  <path
                    className="neural-impulse"
                    d={curve}
                    fill="none"
                    stroke="#eeffd3"
                    strokeWidth="2"
                    pathLength="100"
                    strokeDasharray="2 98"
                    style={{ animationDelay: `${-i * 2}s` }}
                  />
                )}
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
