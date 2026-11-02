// Page « Installer » : onglets accessibles (flèches, Début, Fin) et système détecté au chargement.
// Sans JavaScript, les quatre sections restent visibles l'une sous l'autre et les onglets servent d'ancres.
(() => {
  const onglets = [...document.querySelectorAll('.onglets [role="tab"]')];
  const panneaux = onglets.map((o) => document.getElementById(o.getAttribute('aria-controls')));
  if (!onglets.length || panneaux.some((p) => !p)) return;

  function choisir(i, focus) {
    onglets.forEach((o, j) => {
      const actif = i === j;
      o.setAttribute('aria-selected', String(actif));
      o.tabIndex = actif ? 0 : -1;
      panneaux[j].hidden = !actif;
    });
    if (focus) onglets[i].focus();
    history.replaceState(null, '', '#' + panneaux[i].id);
  }

  function detecter() {
    const ua = navigator.userAgent || '';
    const plateforme = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/android/i.test(ua)) return 'android';
    if (/win/i.test(plateforme) || /windows/i.test(ua)) return 'windows';
    if (/mac/i.test(plateforme) && !/iphone|ipad/i.test(ua)) return 'macos';
    return 'linux';
  }

  onglets.forEach((o, i) => {
    o.addEventListener('click', (e) => { e.preventDefault(); choisir(i, false); });
    o.addEventListener('keydown', (e) => {
      const n = onglets.length;
      const cible = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (cible !== undefined) { e.preventDefault(); choisir(cible, true); }
    });
  });

  const voulu = location.hash.slice(1);
  const depart = panneaux.findIndex((p) => p.id === voulu);
  choisir(depart >= 0 ? depart : panneaux.findIndex((p) => p.id === detecter()), false);
})();
