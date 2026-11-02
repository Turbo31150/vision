/* Chiffres vivants et parc de la page projet, lus dans chaine/etat.json (miroir public). Texte toujours par textContent. */
(() => {
  'use strict';
  const fr = new Intl.NumberFormat('fr-FR');
  const el = (tag, cls, texte) => { const n = document.createElement(tag); if (cls) n.className = cls; if (texte != null) n.textContent = texte; return n; };
  const kpi = (lib, val, cls) => { const d = el('div', `kpi ${cls || ''}`); d.append(el('div', 'val', val), el('div', 'lib', lib)); return d; };
  const go = (mo) => `${Math.round((mo || 0) / 1024)} Go`;

  function parc(e) {
    const actifs = Object.fromEntries((e.reseau.noeuds || []).map((n) => [n.nom, n]));
    const t = el('table'); const th = el('thead'); const tr = el('tr');
    ['Nœud', 'État', 'Matériel partagé', 'Reçu'].forEach((c) => tr.append(el('th', null, c)));
    th.append(tr); t.append(th);
    const tb = el('tbody');
    for (const n of e.inscrits) {
      const r = actifs[n.noeud] || {}; const m = r.materiel;
      const l = el('tr');
      l.append(el('td', null, n.noeud));
      const td = el('td'); td.append(el('span', `badge ${r.actif ? 'ok' : ''}`, r.actif ? 'actif' : 'hors ligne')); l.append(td);
      l.append(el('td', null, m ? `${m.gpus.map((g) => `${g.nom.replace('NVIDIA GeForce ', '')} ${go(g.vram_mo)}`).join(' / ') || 'sans GPU'} · ${m.cpu_coeurs} cœurs · ${go(m.ram_mo)}` : '—'));
      l.append(el('td', 'num plus', fr.format(e.soldes[`noeud:${n.noeud}`] || 0)));
      tb.append(l);
    }
    t.append(tb);
    document.getElementById('parc').replaceChildren(e.inscrits.length ? t : el('p', 'vide', 'Aucun nœud inscrit pour l’instant.'));
  }

  fetch('chaine/etat.json', { cache: 'no-store' }).then((r) => r.json()).then((e) => {
    const t = e.reseau.total;
    document.getElementById('kpis').replaceChildren(
      kpi('Machines en ligne', t.machines, 'cyan'), kpi('GPU partagés', t.gpus, 'vert'),
      kpi('VRAM cumulée', `${String(t.vram_go).replace('.', ',')} Go`, 'vert'), kpi('Nœuds inscrits', e.inscrits.length, ''),
      kpi('Hauteur de la chaîne', e.hauteur, ''), kpi('Unités détruites', fr.format(e.soldes.detruit || 0), 'rouge'));
    document.getElementById('kpis-date').textContent = `Mesuré par le nœud producteur le ${new Date(e.genere_le).toLocaleString('fr-FR')}.`;
    parc(e);
  }).catch(() => {
    document.getElementById('kpis-date').textContent = 'Chiffres indisponibles pour le moment.';
    document.getElementById('parc').replaceChildren(el('p', 'vide', 'Parc indisponible pour le moment.'));
  });
})();
