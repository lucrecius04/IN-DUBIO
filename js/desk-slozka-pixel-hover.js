/**
 * Hover nad ilustrovanými složkami jen tam, kde má PNG alfa (ne v průhledném lemu).
 * Přidává/odebírá třídu slozka--hover na #slozka-* (CSS místo :hover).
 */
(function () {
  const root = document.querySelector('#stul.desk-scene-root');
  if (!root) return;

  const ALPHA_MIN = 28;

  function bindSlozka(slozka) {
    const img = slozka.querySelector('.slozka-img');
    if (!img) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let ready = false;

    function rasterize() {
      ready = false;
      if (!img.naturalWidth || !img.naturalHeight) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try {
        ctx.drawImage(img, 0, 0);
        ready = true;
      } catch (_e) {
        ready = false;
      }
    }

    img.addEventListener('load', rasterize);
    if (img.complete) rasterize();

    function setHover(on) {
      if (slozka.classList.contains('slozka--ceka')) {
        slozka.classList.remove('slozka--hover');
        return;
      }
      slozka.classList.toggle('slozka--hover', on);
    }

    function sample(e) {
      if (!ready || slozka.classList.contains('slozka--ceka')) {
        setHover(false);
        return;
      }
      const rect = img.getBoundingClientRect();
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

    img.addEventListener('mousemove', sample);
    img.addEventListener('mouseleave', function () {
      setHover(false);
    });
    img.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });
  }

  root.querySelectorAll('#plocha-stred .slozka').forEach(bindSlozka);
})();
