/**
 * Kouř z popelníku na ilustrovaném stole — měkké částice na canvasu
 * (organičtější než CSS gradienty). Spustí se jen při přítomnosti canvasu.
 */
(function () {
  const host = document.querySelector('.desk-scene-smoke');
  const canvas = host && host.querySelector('.desk-scene-smoke-canvas');
  if (!host || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const particles = [];
  const MAX = 64;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let running = true;

  function resize() {
    const r = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
    return t * t * (3 - 2 * t);
  }

  /** Měkký útlum u horního a bočního okraje canvasu (žádný ostrý řez). */
  function edgeFadeMul(px, py, pr) {
    if (w < 8 || h < 8) return 1;
    let m = 1;
    const r = Math.max(pr, 4);
    const yTop = py - r * 0.92;
    const topStart = h * 0.58;
    const topEnd = h * 0.2;
    if (yTop < topStart) {
      m *= smoothstep(topEnd, topStart, yTop);
    }
    const xl = px - r * 0.92;
    const leftIn = w * 0.22;
    if (xl < leftIn) {
      m *= smoothstep(-r * 1.2, leftIn, xl);
    }
    const xr = px + r * 0.92;
    const rightOut = w * 0.78;
    if (xr > rightOut) {
      m *= 1 - smoothstep(rightOut, w + r * 1.1, xr);
    }
    return Math.max(0, Math.min(1, m));
  }

  function spawn() {
    if (particles.length >= MAX) return;
    if (Math.random() > 0.88) return;

    const thin = Math.random() < 0.42;
    particles.push({
      x: w * 0.5 + (Math.random() - 0.5) * (thin ? 6 : 12),
      y: h - 1 - Math.random() * 5,
      vx: (Math.random() - 0.5) * (thin ? 0.038 : 0.085),
      vy: thin ? (-0.15 - Math.random() * 0.2) : (-0.065 - Math.random() * 0.12),
      r: thin ? 0.9 + Math.random() * 1.4 : 1.8 + Math.random() * 2.8,
      life: thin ? 1.15 + Math.random() * 0.6 : 1.35 + Math.random() * 0.6,
      decay: thin ? 0.00125 + Math.random() * 0.00175 : 0.0007 + Math.random() * 0.0011,
      growth: thin ? 0.009 + Math.random() * 0.012 : 0.014 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      wobble: 0.004 + Math.random() * 0.009,
      wobbleAmp: thin ? 0.32 : 0.58
    });
  }

  function drawParticle(p, edge) {
    if (edge < 0.008) return;

    const t = Math.min(1, p.life * 1.25);
    const a = t * 0.38 * edge;

    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, `rgba(236, 234, 230, ${a * 0.42})`);
    g.addColorStop(0.28, `rgba(198, 195, 190, ${a * 0.26})`);
    g.addColorStop(0.58, `rgba(165, 162, 158, ${a * 0.12})`);
    g.addColorStop(1, 'rgba(130, 128, 125, 0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function tick() {
    if (!running) return;
    raf = requestAnimationFrame(tick);

    if (w < 2 || h < 2) resize();

    spawn();
    if (Math.random() > 0.84) spawn();

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.phase += p.wobble;
      p.x += p.vx + Math.sin(p.phase) * p.wobbleAmp * (0.038 + p.life * 0.038);
      p.y += p.vy;
      p.vy *= 0.99975;
      p.vx += (Math.random() - 0.5) * 0.0025;
      p.vx *= 0.9994;
      p.r += p.growth * (0.38 + p.life * 0.48);
      p.life -= p.decay;

      const edge = edgeFadeMul(p.x, p.y, p.r);
      if (p.life <= 0 || p.y < -p.r * 2.5 || edge < 0.012) {
        particles.splice(i, 1);
        continue;
      }

      drawParticle(p, edge);
    }
  }

  function startLoop() {
    if (raf) cancelAnimationFrame(raf);
    running = true;
    raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
  } else {
    window.addEventListener('resize', resize);
  }

  resize();
  startLoop();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopLoop();
    else startLoop();
  });
})();
