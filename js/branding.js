/**
 * branding.js — cesty k logům hry a studia.
 *
 * Soubory vlož do assets/branding/:
 *   in-dubio-wordmark.png  — pouze název (horní lišta + úvodní obrazovka)
 *   in-dubio-logo-main.png — hlavní logo (epilog + kredity po epilogu)
 *   in-dubio-logo-menu.png — menu varianta bez dlouhého klíče
 *   legio-ultima.png         — logo studia Legio Ultima (kredity)
 *
 * PNG na průhledném nebo černém pozadí; bez souboru zůstane textový fallback.
 */

const Branding = (() => {

  const SOUBORY = {
    wordmark: 'assets/branding/in-dubio-wordmark.png',
    logoMain: 'assets/branding/in-dubio-logo-main.png',
    logoMenu: 'assets/branding/in-dubio-logo-menu.png',
    studio:   'assets/branding/legio-ultima.png'
  };

  function napojFallback(img, fallback) {
    if (!img || !fallback) return;
    if (img.dataset.brandingNapojeno === '1') {
      _syncFallback(img, fallback);
      return;
    }
    img.dataset.brandingNapojeno = '1';

    const ukazText = () => {
      if (img.id === 'menu-logo-main-img' && img.getAttribute('src') !== SOUBORY.logoMain) {
        img.setAttribute('src', SOUBORY.logoMain);
        return;
      }
      img.classList.add('skryto');
      fallback.classList.remove('skryto');
    };

    const ukazObrazek = () => {
      img.classList.remove('skryto');
      fallback.classList.add('skryto');
    };

    img.onerror = ukazText;
    img.onload = () => {
      if (img.naturalWidth > 0) ukazObrazek();
      else ukazText();
    };

    _syncFallback(img, fallback, ukazObrazek, ukazText);
  }

  function _syncFallback(img, fallback, ukazObrazek, ukazText) {
    const ukazO = ukazObrazek || (() => {
      img.classList.remove('skryto');
      fallback.classList.add('skryto');
    });
    const ukazT = ukazText || (() => {
      img.classList.add('skryto');
      fallback.classList.remove('skryto');
    });
    if (img.complete) {
      if (img.naturalWidth > 0) ukazO();
      else ukazT();
    }
  }

  function inicializuj() {
    napojFallback(
      document.getElementById('logo-hry-wordmark-img'),
      document.getElementById('logo-hry-wordmark-fallback')
    );
    napojFallback(
      document.getElementById('uvod-wordmark-img'),
      document.getElementById('uvod-wordmark-fallback')
    );
    napojFallback(
      document.getElementById('menu-logo-main-img'),
      document.getElementById('menu-logo-main-fallback')
    );
    napojFallback(
      document.getElementById('konec-kredity-hra-img'),
      document.getElementById('konec-kredity-hra-fallback')
    );
    napojFallback(
      document.getElementById('konec-kredity-studio-img'),
      document.getElementById('konec-kredity-studio-fallback')
    );
  }

  return {
    SOUBORY,
    napojFallback,
    inicializuj
  };

})();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Branding !== 'undefined' && Branding.inicializuj) {
    Branding.inicializuj();
  }
});
