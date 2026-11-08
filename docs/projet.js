/* VISION · page projet : ruban de la chaîne, chiffres vivants et parc, lus dans la copie publique (chaine/). */
(() => {
  'use strict';
  const fr = new Intl.NumberFormat('fr-FR');
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, texte) => { const n = document.createElement(tag); if (cls) n.className = cls; if (texte != null) n.textContent = texte; return n; };
  const go = (mo) => `${Math.round((mo || 0) / 1024)} Go`;
  const heure = (iso) => { try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }); } catch { return iso || ''; } };

  function chiffre(libelle, valeur, cls) {
    const li = el('li'); li.append(el('b', cls || '', String(valeur)), el('span', null, libelle)); return li;
  }

  function parc(e) {
    const parNom = Object.fromEntries((e.reseau.noeuds || []).map((n) => [n.nom, n]));
    const t = el('table'); const tete = el('tr');
    ['Nœud', 'État', 'Matériel partagé', 'Reçu (VISION-essai)'].forEach((c) => tete.append(el('th', null, c)));
    const th = el('thead'); th.append(tete); t.append(th);
    const tb = el('tbody');
    for (const n of e.inscrits) {
      const r = parNom[n.noeud] || {}; const m = r.materiel;
      const l = el('tr');
      l.append(el('td', null, n.noeud));
      const td = el('td'); td.append(el('span', `etat ${r.actif ? 'actif' : 'hors'}`, r.actif ? 'en ligne' : 'hors ligne')); l.append(td);
      l.append(el('td', null, m ? `${m.gpus.map((g) => `${g.nom.replace('NVIDIA GeForce ', '')} ${go(g.vram_mo)}`).join(', ') || 'sans carte graphique'} ; ${m.cpu_coeurs} cœurs ; ${go(m.ram_mo)} de mémoire` : 'publié en total seulement'));
      l.append(el('td', 'num c-sarcelle', fr.format(e.soldes[`noeud:${n.noeud}`] || 0)));
      tb.append(l);
    }
    t.append(tb);
    $('parc').replaceChildren(e.inscrits.length ? t : el('p', 'vide', 'Aucun nœud inscrit pour l’instant.'));
  }

  Promise.all([fetch('chaine/blocs.json', { cache: 'no-store' }).then((r) => r.json()),
    fetch('chaine/etat.json', { cache: 'no-store' }).then((r) => r.json())]).then(([b, e]) => {
    const blocs = b.blocs;
    const tete = blocs[blocs.length - 1];
    window.VisionRuban.dessiner($('ruban'), blocs, { lien: (x) => `explorateur/#${x.hauteur}` });
    window.VisionRuban.legende($('legende'));
    $('ruban-info').textContent = `${blocs.length} blocs signés, dernier bloc ${tete.empreinte.slice(0, 12)}, scellé le ${heure(tete.horodatage)}.`;
    const t = e.reseau.total;
    $('chiffres').replaceChildren(
      chiffre('machines en ligne', t.machines, 'c-sarcelle'), chiffre('cartes graphiques', t.gpus),
      chiffre('de mémoire graphique', `${String(t.vram_go).replace('.', ',')} Go`), chiffre('nœuds inscrits', e.inscrits.length),
      chiffre('transactions', e.transactions), chiffre('unités détruites', fr.format(e.soldes.detruit || 0), 'c-corail'));
    $('date-mesure').textContent = `Copie publiée par le nœud producteur le ${heure(e.genere_le)}. Une machine hors ligne n'est pas comptée.`;
    parc(e);
  }).catch(() => {
    $('ruban-info').textContent = 'Copie publique illisible pour le moment.';
    $('parc').replaceChildren(el('p', 'vide', 'Parc indisponible pour le moment.'));
  });
})();
