/**
 * Hover nad zápisníkem jen tam, kde má PNG/SVG alfa (ne v prázdném lemu tlačítka).
 * Přidává/odebírá třídu desk-notebook--pixel-hover na #desk-notebook (CSS místo :hover).
 */
(function () {
  const root = document.querySelector('#stul.desk-scene-root');
  if (!root) return;

  const btn = document.getElementById('desk-notebook');
  const inner = btn && btn.querySelector('.desk-notebook-inner');
  const img = inner && inner.querySelector('img');
  const svg = inner && inner.querySelector('.desk-notebook-svg');
  if (!btn || !inner || !img || !svg) return;

  const ALPHA_MIN = 28;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let ready = false;

  function _pouzitSvg() {
    return btn.classList.contains('desk-notebook--fallback');
  }

  function rasterize() {
    ready = false;
    try {
      if (_pouzitSvg()) {
        const vb = svg.viewBox && svg.viewBox.baseVal;
        const w = vb && vb.width ? vb.width : 56;
        const h = vb && vb.height ? vb.height : 72;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(svg, 0, 0, w, h);
        ready = true;
        return;
      }
      if (!img.naturalWidth || !img.naturalHeight) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ready = true;
    } catch (_e) {
      ready = false;
    }
  }

  img.addEventListener('load', rasterize);
  img.addEventListener('error', rasterize);
  img.addEventListener('dragstart', (e) => e.preventDefault());
  if (img.complete) rasterize();

  new MutationObserver(() => rasterize()).observe(btn, {
    attributes: true,
    attributeFilter: ['class']
  });

  function setHover(on) {
    btn.classList.toggle('desk-notebook--pixel-hover', on);
  }

  function sample(e) {
    if (!ready) {
      setHover(false);
      return;
    }
    const rect = inner.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      setHover(false);
      return;
    }
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    if (rx < 0 || ry < 0 || rx > 1 || ry > 1) {
      setHover(false);
      return;
    }
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(rx * canvas.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(ry * canvas.height)));
    let alpha;
    try {
      alpha = ctx.getImageData(x, y, 1, 1).data[3];
    } catch (_e) {
      setHover(false);
      return;
    }
    setHover(alpha > ALPHA_MIN);
  }

  inner.addEventListener('mousemove', sample);
  inner.addEventListener('mouseleave', () => setHover(false));
})();
