import { useEffect, useRef } from "react";

export const NODE_POSITIONS = [
  [31, 24],
  [68, 26],
  [78, 48],
  [63, 67],
  [38, 73],
  [23, 49],
  [76, 74],
  [45, 39],
  [84, 34],
  [27, 67],
  [49, 17],
];
export function nodePosition(index) {
  if (index < NODE_POSITIONS.length) return NODE_POSITIONS[index];
  const angle = (index - NODE_POSITIONS.length) * 2.399;
  return [50 + Math.cos(angle) * 40, 48 + Math.sin(angle) * 37];
}

// A deterministic two-hemisphere point mesh. No image or remote rendering service.
function createBrain() {
  const points = [];
  let seed = 71;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (const side of [-1, 1]) {
    for (let ring = 1; ring < 62; ring++) {
      const phi = (ring / 62) * Math.PI;
      for (let step = 0; step < 70; step++) {
        const theta = (step / 69) * Math.PI - Math.PI / 2;
        const ripple =
          1 +
          0.055 * Math.sin(theta * 13 + phi * 12) * Math.sin(phi * 8) +
          0.022 * Math.cos(theta * 23 - phi * 9);
        const x =
          side *
          (0.014 +
            Math.pow(Math.sin(phi), 0.72) * Math.cos(theta) * 0.74 * ripple);
        const y = Math.cos(phi) * 0.62 * ripple;
        const z = Math.sin(phi) * Math.sin(theta) * 0.49 * ripple;
        points.push({ x, y, z, glow: random(), ring, step, side });
      }
    }
  }
  return points;
}
const BRAIN = createBrain();

export default function BrainGraph({
  spheres,
  selected,
  onSelect,
  zoom,
  paused,
  children,
}) {
  const canvasRef = useRef(null);
  const surfaceRef = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0,
      height = 0,
      frame = 0,
      last = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    function size() {
      const rect = surfaceRef.current.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(0);
    }
    function render(time) {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const motion = !paused && !reduced.matches;
      const yaw =
        -0.24 +
        (motion
          ? Math.sin(time * 0.00015) * 0.055 + pointer.current.x * 0.055
          : 0);
      const tilt = 0.16 + (motion ? pointer.current.y * 0.03 : 0);
      const scale = Math.min(width * 0.57, height * 0.54) * zoom;
      const cy = height * 0.48;
      const ambient = ctx.createRadialGradient(
        width / 2,
        cy,
        0,
        width / 2,
        cy,
        scale * 1.1,
      );
      ambient.addColorStop(0, "#93e5bc0c");
      ambient.addColorStop(0.6, "#a0dc9c06");
      ambient.addColorStop(1, "#00000000");
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, width, height);
      const projected = BRAIN.map((p) => {
        const rx = p.x * Math.cos(yaw) + p.z * Math.sin(yaw);
        const rz = -p.x * Math.sin(yaw) + p.z * Math.cos(yaw);
        const ry = p.y * Math.cos(tilt) - rz * Math.sin(tilt);
        const depth = p.y * Math.sin(tilt) + rz * Math.cos(tilt);
        const perspective = 2.9 / (2.9 - depth);
        return {
          x: width / 2 + rx * scale * perspective,
          y: cy + ry * scale * perspective,
          z: depth,
          p,
        };
      });
      // Thin curved cortical fibers make the brain's volume and folds readable.
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i],
          b = projected[i + 1];
        if (!b || a.p.side !== b.p.side || a.p.ring !== b.p.ring) continue;
        const front = (a.z + 0.65) / 1.3;
        ctx.strokeStyle = `rgba(165,203,171,${0.025 + front * 0.22})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (a.p.step % 3 === 0 && projected[i + 70]?.p.side === a.p.side) {
          const c = projected[i + 70];
          ctx.strokeStyle = `rgba(160,194,164,${0.025 + front * 0.07})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      }
      for (const a of projected) {
        if (a.p.glow < 0.3) continue;
        const front = (a.z + 0.65) / 1.3;
        const pulse = motion
          ? 0.8 + Math.sin(time * 0.001 + a.p.glow * 20) * 0.2
          : 1;
        ctx.fillStyle = `rgba(${a.p.glow > 0.94 ? "234,226,163" : "185,218,188"},${(0.12 + front * 0.55) * pulse})`;
        ctx.beginPath();
        ctx.arc(
          a.x,
          a.y,
          (a.p.glow > 0.94 ? 1.05 : 0.55) * Math.max(0.7, zoom),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      spheres.forEach((sphere, i) => {
        const [x, y] = nodePosition(i);
        const [nx, ny] = nodePosition((i + 1) % spheres.length);
        const ax = width / 2 + ((x / 100) * width - width / 2) * zoom;
        const ay = height / 2 + ((y / 100) * height - height / 2) * zoom;
        const bx = width / 2 + ((nx / 100) * width - width / 2) * zoom;
        const by = height / 2 + ((ny / 100) * height - height / 2) * zoom;
        ctx.strokeStyle =
          selected === sphere.id ? sphere.color + "a0" : "#cad6b330";
        ctx.lineWidth = selected === sphere.id ? 1.3 : 0.7;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(width / 2, cy, bx, by);
        ctx.stroke();
        if (motion) {
          const t = (time * 0.000045 + i * 0.17) % 1;
          const px =
            (1 - t) ** 2 * ax + (2 * (1 - t) * t * width) / 2 + t * t * bx;
          const py = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by;
          ctx.fillStyle = "#e4e9b9";
          ctx.shadowColor = "#e4e9b9";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }
    function tick(time) {
      frame = requestAnimationFrame(tick);
      if (document.hidden || paused || reduced.matches || time - last < 40)
        return;
      last = time;
      render(time);
    }
    const observer = new ResizeObserver(size);
    observer.observe(surfaceRef.current);
    size();
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [spheres, selected, zoom, paused]);

  return (
    <div
      className="brain-surface"
      ref={surfaceRef}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = {
          x: (e.clientX - r.left) / r.width - 0.5,
          y: (e.clientY - r.top) / r.height - 0.5,
        };
      }}
      onPointerLeave={() => {
        pointer.current = { x: 0, y: 0 };
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="neuron-layer" style={{ transform: `scale(${zoom})` }}>
        {spheres.map((sphere, index) => {
          const [x, y] = nodePosition(index);
          return (
            <button
              key={sphere.id}
              className={`neuron ${selected === sphere.id ? "selected" : ""}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                "--node-color": sphere.color,
              }}
              aria-label={`Открыть сферу ${sphere.name}`}
              aria-pressed={selected === sphere.id}
              onClick={() => onSelect(sphere.id)}
            >
              <span className="neuron-core">
                <span />
              </span>
              <span className="neuron-label">{sphere.name}</span>
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
