/* VISION · ruban de la chaîne : les vrais blocs en tuiles, segmentées par type de transaction.
   Partagé par le site, l'explorateur et le portefeuille. Texte toujours par textContent, aucune dépendance. */
(() => {
  'use strict';
  const GROUPES = {
    depense: { nom: 'Dépense', couleur: 'var(--ambre)', types: ['depense', 'consommation'] },
    recompense: { nom: 'Récompense ou clôture', couleur: 'var(--sarcelle)', types: ['recompense', 'epoque'] },
    registre: { nom: 'Registre et règles', couleur: 'var(--pervenche)', types: ['inscription', 'allocation', 'regles', 'catalogue', 'cle_producteur'] },
    credit: { nom: 'Crédit d’essai', couleur: 'var(--credit)', types: ['achat', 'forfait'] },
  };
  const groupeDe = (type) => Object.keys(GROUPES).find((g) => GROUPES[g].types.includes(type)) || 'registre';

  function el(tag, cls, texte) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texte != null) n.textContent = texte;
    return n;
  }

  /* Détruit propre à chaque bloc : différence avec le bloc précédent connu (le champ « detruit » est cumulé). */
  function detruitsParBloc(blocs) {
    const tries = [...blocs].sort((a, b) => a.hauteur - b.hauteur);
    const r = new Map();
    let prec = null;
    for (const b of tries) {
      r.set(b.hauteur, prec && prec.hauteur === b.hauteur - 1 ? (b.detruit || 0) - (prec.detruit || 0) : (b.hauteur === 1 ? b.detruit || 0 : null));
      prec = b;
    }
    return r;
  }

  function dessiner(conteneur, blocs, options = {}) {
    const tous = [...blocs].sort((a, b) => a.hauteur - b.hauteur);
    const delta = detruitsParBloc(tous);
    const tries = tous.slice(-(options.max || 30));   // les 30 derniers blocs : l'explorateur garde le registre complet
    const tete = tries.length ? tries[tries.length - 1].hauteur : null;
    const maillons = tries.map((b, i) => {
      const comptes = {};
      for (const t of b.transactions || []) { const g = groupeDe(t.type); comptes[g] = (comptes[g] || 0) + 1; }
      const total = (b.transactions || []).length || 1;
      const lien = options.lien ? options.lien(b) : null;
      const tuile = el(lien ? 'a' : 'button', `tuile${b.hauteur === tete ? ' tete' : ''}`);
      if (lien) tuile.href = lien; else tuile.type = 'button';
      if (options.clic) tuile.addEventListener('click', (ev) => { if (!lien) ev.preventDefault(); options.clic(b); });
      const nbTx = (b.transactions || []).length;
      const d = delta.get(b.hauteur);
      tuile.setAttribute('aria-label', `Bloc ${b.hauteur}, ${nbTx} transaction${nbTx > 1 ? 's' : ''}${d ? `, ${d} unités détruites` : ''}${b.hauteur === tete ? ', dernier bloc' : ''}`);
      tuile.title = `Bloc ${b.hauteur} : ${Object.entries(comptes).map(([g, n]) => `${n} ${GROUPES[g].nom.toLowerCase()}`).join(', ')}`;
      const barre = el('span', 'barre');
      for (const g of Object.keys(GROUPES)) {
        if (!comptes[g]) continue;
        const s = el('span');
        s.style.width = `${(comptes[g] / total) * 100}%`;
        s.style.background = GROUPES[g].couleur;
        barre.append(s);
      }
      tuile.append(barre, el('span', 'h', String(b.hauteur)), el('span', 'e', (b.empreinte || '').slice(0, 7)),
        el('span', 'd', d ? `−${d}` : ''));
      const m = el('div', 'maillon');
      m.setAttribute('role', 'listitem');
      m.style.setProperty('--i', String(i));
      m.append(tuile);
      return m;
    });
    conteneur.replaceChildren(...maillons);
    const fin = () => { conteneur.scrollLeft = conteneur.scrollWidth; };   // le dernier bloc visible quand le ruban défile
    fin(); requestAnimationFrame(fin); setTimeout(fin, 150);
    if (options.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) conteneur.classList.add('anime');

  }

  function legende(conteneur) {
    const items = Object.values(GROUPES).map((g) => { const s = el('span', null, g.nom); s.style.setProperty('--c', g.couleur); return s; });
    const d = el('span', null, 'Unités détruites dans le bloc'); d.style.setProperty('--c', 'var(--corail)');
    conteneur.replaceChildren(...items, d);
  }

  window.VisionRuban = { dessiner, legende, groupeDe, GROUPES, detruitsParBloc };
})();
