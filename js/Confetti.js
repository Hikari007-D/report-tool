/**
 * Tiny canvas confetti — no dependencies, ~60 particles
 */

const COLORS = [
  "#007bff", "#28a745", "#ffc107", "#dc3545",
  "#6f42c1", "#fd7e14", "#20c997", "#e83e8c",
];

export function burst(originX, originY, count = 80) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: fixed; left: 0; top: 0; pointer-events: none;
    width: 100vw; height: 100vh; z-index: 9999;
  `;
  document.body.appendChild(canvas);

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const x0 = originX ?? window.innerWidth / 2;
  const y0 = originY ?? window.innerHeight / 2;

  const particles = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 6;
    return {
      x: x0,
      y: y0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 60 + Math.random() * 40,
    };
  });

  const gravity = 0.25;
  const drag = 0.985;

  let raf;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    for (const p of particles) {
      if (p.life >= p.maxLife) continue;
      alive++;

      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life++;

      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (alive > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  tick();
}
