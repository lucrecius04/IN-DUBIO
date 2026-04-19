/**
 * Hover nad ilustrovanými složkami jen tam, kde má PNG alfa (ne v průhledném lemu).
 * Přidává/odebírá třídu slozka--hover na #slozka-* (CSS místo :hover).
 * Grafika je CSS background na .folder — raster z offscreen Image (stejná URL jako data-art).
 * Ze stejného rastru spočítá ohraničení papíru a nastaví --folder-label-* na .folder (štítek sedí na papíře).
 */
(function () {
  const root = document.querySelector('#stul.desk-scene-root');
  if (!root) return;

  const ALPHA_MIN = 28;
  const ALPHA_BOUNDS = 18;

  function clearLabelVars(folder) {
    folder.style.removeProperty('--folder-label-top');
    folder.style.removeProperty('--folder-label-left');
    folder.style.removeProperty('--folder-label-width');
  }

  /**
   * Min. obdélník pixelů s alfa > cut (v souřadnicích rastru).
   * Krok 2 — rychlejší; pro layout stačí.
   */
  function computeOpaqueBounds(ctx, w, h, alphaCut) {
    let img;
    try {
      img = ctx.getImageData(0, 0, w, h);
    } catch (_e) {
      return null;
    }
    const d = img.data;
    const step = 2;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y += step) {
      const row = y * w * 4;
      for (let x = 0; x < w; x += step) {
        if (d[row + x * 4 + 3] > alphaCut) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    return { minX, minY, maxX, maxY };
  }

  function applyLabelLayoutFromRaster(folder, ctx, w, h) {
    const b = computeOpaqueBounds(ctx, w, h, ALPHA_BOUNDS);
    if (!b) {
      clearLabelVars(folder);
      return;
    }
    const bw = b.maxX - b.minX + 1;
    const bh = b.maxY - b.minY + 1;
    if (bw < w * 0.08 || bh < h * 0.08) {
      clearLabelVars(folder);
      return;
    }
    const padX = bw * 0.10;
    const padY = bh * 0.08;
    /* Jemný posun od okrajů papíru (doprava / dolů) */
    const nudgeX = bw * 0.07;
    const nudgeY = bh * 0.09;
    const x0 = Math.max(0, b.minX + padX + nudgeX);
    const x1 = Math.min(w - 1, b.maxX - padX);
    const y0 = Math.max(0, b.minY + padY + nudgeY);
    if (x1 <= x0 || y0 >= h - 2) {
      clearLabelVars(folder);
      return;
    }
    const leftPct = (x0 / w) * 100;
    const widthPct = ((x1 - x0) / w) * 100;
    const topPct = (y0 / h) * 100;
    folder.style.setProperty('--folder-label-top', topPct.toFixed(3) + '%');
    folder.style.setProperty('--folder-label-left', leftPct.toFixed(3) + '%');
    folder.style.setProperty('--folder-label-width', widthPct.toFixed(3) + '%');
  }

  function bindSlozka(slozka) {
    const folder = slozka.querySelector('.folder');
    if (!folder) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rasterImg = new Image();
    let ready = false;

    function rasterize() {
      ready = false;
      clearLabelVars(folder);
      if (!rasterImg.naturalWidth || !rasterImg.naturalHeight) return;
      canvas.width = rasterImg.naturalWidth;
      canvas.height = rasterImg.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try {
        ctx.drawImage(rasterImg, 0, 0);
        ready = true;
        applyLabelLayoutFromRaster(folder, ctx, canvas.width, canvas.height);
      } catch (_e) {
        ready = false;
      }
    }

    function loadArtUrl(url) {
      ready = false;
      clearLabelVars(folder);
      if (!url) return;
      rasterImg.onload = rasterize;
      rasterImg.onerror = function () {
        ready = false;
        clearLabelVars(folder);
      };
      rasterImg.src = url;
      if (rasterImg.complete) rasterize();
    }

    loadArtUrl(folder.dataset.art || '');

    const obs = new MutationObserver(function () {
      loadArtUrl(folder.dataset.art || '');
    });
    obs.observe(folder, { attributes: true, attributeFilter: ['data-art'] });

    function setHover(on) {
      if (slozka.classList.contains('slozka--ceka')) {
        slozka.classList.remove('slozka--hover');
        return;
      }
      slozka.classList.toggle('slozka--hover', on);
    }

    function sample(e) {
      slozka.style.pointerEvents = 'none';
      folder.style.pointerEvents = 'auto';
      if (!ready || slozka.classList.contains('slozka--ceka')) {
        setHover(false);
        return;
      }
      const rect = folder.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        setHover(false);
        return;
      }
      const scaleX = rect.width / folder.offsetWidth;
      const scaleY = rect.height / folder.offsetHeight;
      const rx = (e.clientX - rect.left) / folder.offsetWidth;
      const ry = (e.clientY - rect.top) / folder.offsetHeight;
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

    folder.addEventListener('mousemove', sample);
    folder.addEventListener('mouseleave', function () {
      setHover(false);
    });
    folder.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });
  }

  root.querySelectorAll('#plocha-stred .slozka').forEach(bindSlozka);
})();
