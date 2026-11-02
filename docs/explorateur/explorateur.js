/* Explorateur public de la chaîne d'essai VISION-essai. Lit ../chaine/*.json ; texte toujours par textContent. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fr = new Intl.NumberFormat('fr-FR');
  const ADRESSE = /^te1[0-9a-f]{40}$/;
  const DESTRUCTION = 20;
  const TYPES = { allocation: 'Allocation', achat: 'Achat d’essai', depense: 'Dépense', recompense: 'Récompense', inscription: 'Inscription',
    regles: 'Règles', epoque: 'Clôture d’époque', catalogue: 'Catalogue', forfait: 'Forfait d’essai', consommation: 'Consommation',
    cle_producteur: 'Clé des blocs' };
  let blocs = [], etat = null;

  function el(tag, attrs, ...enfants) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    }
    for (const e of enfants.flat()) if (e != null) n.append(e instanceof Node ? e : document.createTextNode(String(e)));
    return n;
  }
  const vider = (n, ...e) => n.replaceChildren(...e.flat().filter((x) => x != null));
  const court = (h, n = 12) => (h ? `${h.slice(0, n)}…` : '—');
  const heure = (iso) => { try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso || ''; } };
  const kpi = (lib, val, cls) => el('div', { class: `kpi ${cls || ''}` }, el('div', { class: 'val' }, String(val)), el('div', { class: 'lib' }, lib));
  const go = (mo) => `${Math.round((mo || 0) / 1024)} Go`;
  const materiel = (m) => (m ? `${m.gpus.map((g) => `${g.nom.replace('NVIDIA GeForce ', '')} ${go(g.vram_mo)}`).join(' / ') || 'sans GPU'} · ${m.cpu_coeurs} cœurs · ${go(m.ram_mo)}` : '—');

  function tableau(colonnes, lignes, vide) {
    if (!lignes.length) return el('div', { class: 'vide' }, vide || 'Rien pour l’instant.');
    return el('div', { class: 'table-boite' }, el('table', {}, el('thead', {}, el('tr', {}, colonnes.map((c) => el('th', {}, c[0])))),
      el('tbody', {}, lignes.map((l) => el('tr', {}, colonnes.map((c) => {
        const v = c[1](l); return v instanceof Node ? el('td', { class: c[2] || '' }, v) : el('td', { class: c[2] || '' }, v);
      }))))));
  }

  function detailTx(t) {
    return t.service || (t.type === 'forfait' ? `forfait ${t.offre}` : '') || t.motif || (t.mission ? `${t.mission} / ${t.etape}` : '')
      || (t.type === 'epoque' ? `époque ${t.numero}` : '') || (t.type === 'inscription' ? `nœud ${t.noeud}` : '') || t.facture || '';
  }

  function bloc(b, ouvert) {
    const detail = el('div', { class: 'bloc-detail' }, tableau([
      ['Type', (t) => TYPES[t.type] || t.type], ['Compte / nœud', (t) => t.compte || t.noeud || ''],
      ['Unités', (t) => (t.unites != null ? fr.format(t.unites) : ''), 'num'], ['Détail', detailTx],
      ['Id', (t) => el('code', {}, court(t.id, 12))]], b.transactions));
    detail.hidden = !ouvert;
    return el('div', { class: 'bloc', id: `bloc-${b.hauteur}` },
      el('div', { class: 'bloc-tete', onclick: () => { detail.hidden = !detail.hidden; } },
        el('span', { class: 'h' }, `#${b.hauteur}`), el('code', {}, court(b.empreinte, 20)),
        el('span', {}, `${b.transactions.length} tx`), el('span', { class: 'detruit' }, `${fr.format(b.detruit || 0)} détruites (cumul)`),
        el('span', { class: 'vide' }, `${heure(b.horodatage)} · producteur ${b.producteur}`)), detail);
  }

  function message(texte, ok) { const m = $('message'); m.hidden = false; m.className = `message ${ok ? 'ok' : 'ko'}`; m.textContent = texte; }

  function compte(adresse) {
    const hist = [], forfaits = [], noeuds = {};
    let depense = 0, detruit = 0;
    for (const b of blocs) for (const t of b.transactions) {
      if (t.type === 'inscription' && (t.adresse === adresse || t.portefeuille === adresse)) {
        noeuds[t.noeud] = { noeud: t.noeud, hauteur: b.hauteur, lien: t.adresse === adresse ? 'clé du nœud' : 'portefeuille rattaché' };
      }
      if (t.compte !== adresse) continue;
      const sens = ['achat', 'forfait'].includes(t.type) ? '+' : '-';
      if (sens === '-') { depense += t.unites; detruit += Math.floor(t.unites * DESTRUCTION / 100); }
      if (t.type === 'forfait') forfaits.push({ offre: t.offre, unites: t.unites, hauteur: b.hauteur, horodatage: t.horodatage || b.horodatage });
      hist.push({ hauteur: b.hauteur, horodatage: t.horodatage || b.horodatage, type: t.type, unites: t.unites, sens, detail: detailTx(t), noeud: t.noeud, id: t.id });
    }
    const parNom = Object.fromEntries((etat.reseau.noeuds || []).map((n) => [n.nom, n]));
    const liste = Object.values(noeuds).map((n) => ({ ...n, gains: etat.soldes[`noeud:${n.noeud}`] || 0,
      actif: (parNom[n.noeud] || {}).actif || false, materiel: (parNom[n.noeud] || {}).materiel || null }));
    return { adresse, connu: hist.length > 0 || liste.length > 0, solde: etat.soldes[`compte:${adresse}`] || 0, forfaits: forfaits.reverse(),
      depense, detruit, historique: hist.reverse(), noeuds: liste, gains: liste.reduce((s, n) => s + n.gains, 0) };
  }

  function afficherCompte(adresse) {
    const c = compte(adresse);
    $('compte').hidden = false;
    $('compte-titre').textContent = c.noeuds.some((n) => n.lien === 'clé du nœud') ? 'Nœud' : 'Compte';
    $('compte-adresse').textContent = adresse;
    if (!c.connu) message('Adresse valide, mais encore inconnue de la chaîne : aucune opération, aucun nœud rattaché.', true);
    const ab = c.forfaits[0];
    vider($('compte-kpis'), kpi('Solde', fr.format(c.solde), 'cyan'), kpi('Forfait d’essai', ab ? ab.offre : 'aucun', ab ? 'vert' : ''),
      kpi('Unités dépensées', fr.format(c.depense), ''), kpi('Détruites par ses dépenses', fr.format(c.detruit), 'rouge'),
      kpi('Nœuds rattachés', c.noeuds.length, ''), kpi('Reçu par ses nœuds', fr.format(c.gains), 'vert'));
    vider($('compte-forfaits'), tableau([['Offre', (f) => f.offre], ['Unités', (f) => `+${fr.format(f.unites)}`, 'num plus'],
      ['Bloc', (f) => `#${f.hauteur}`], ['Quand', (f) => heure(f.horodatage)]], c.forfaits, 'Aucun forfait (vente fermée pendant l’essai).'));
    vider($('compte-noeuds'), tableau([['Nœud', (n) => el('b', {}, n.noeud)],
      ['État', (n) => el('span', { class: `badge ${n.actif ? 'ok' : ''}` }, n.actif ? 'actif' : 'hors ligne')],
      ['Matériel partagé', (n) => materiel(n.materiel)], ['Reçu', (n) => fr.format(n.gains), 'num plus'], ['Inscrit', (n) => `#${n.hauteur}`]],
    c.noeuds, 'Aucun nœud rattaché à cette adresse.'));
    vider($('compte-historique'), tableau([['Bloc', (t) => `#${t.hauteur}`], ['Quand', (t) => heure(t.horodatage)], ['Type', (t) => TYPES[t.type] || t.type],
      ['Unités', (t) => el('span', { class: t.sens === '+' ? 'plus' : 'moins' }, `${t.sens}${fr.format(t.unites)}`)],
      ['Détail', (t) => t.detail], ['Nœud servi', (t) => t.noeud || ''], ['Id', (t) => el('code', {}, court(t.id, 10))]], c.historique,
    'Aucune opération pour cette adresse.'));
    $('compte').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function chercher(q) {
    q = (q || '').trim();
    $('message').hidden = true; $('compte').hidden = true;
    if (!q) return;
    try { history.replaceState(null, '', `#${encodeURIComponent(q)}`); } catch { /* sans importance */ }
    if (ADRESSE.test(q)) return afficherCompte(q);
    const ins = etat.inscrits.find((n) => n.noeud === q);
    if (ins) return afficherCompte(ins.adresse);
    if (/^\d+$/.test(q)) {
      const b = document.getElementById(`bloc-${q}`);
      if (b) { b.querySelector('.bloc-detail').hidden = false; b.scrollIntoView({ behavior: 'smooth' }); return null; }
      return message(`Aucun bloc ${q} : la chaîne est à la hauteur ${blocs.length}.`, false);
    }
    if (/^[0-9a-f]{6,64}$/.test(q)) {
      for (const b of blocs) {
        if (b.empreinte.startsWith(q)) { const n = document.getElementById(`bloc-${b.hauteur}`); n.querySelector('.bloc-detail').hidden = false; n.scrollIntoView({ behavior: 'smooth' }); return null; }
        const t = b.transactions.find((x) => (x.id || '').startsWith(q));
        if (t) { const n = document.getElementById(`bloc-${b.hauteur}`); n.querySelector('.bloc-detail').hidden = false; n.scrollIntoView({ behavior: 'smooth' });
          return message(`Transaction ${court(t.id, 16)} trouvée dans le bloc ${b.hauteur} (${TYPES[t.type] || t.type}).`, true); }
      }
    }
    return message('Rien trouvé : une adresse commence par te1 suivi de 40 caractères hexadécimaux.', false);
  }

  function rendre() {
    const t = etat.reseau.total;
    vider($('kpis'), kpi('Machines en ligne', t.machines, 'cyan'), kpi('Nœuds actifs', `${t.noeuds_actifs}/${t.noeuds_connus}`, ''),
      kpi('GPU', t.gpus, 'vert'), kpi('VRAM cumulée', `${String(t.vram_go).replace('.', ',')} Go`, 'vert'), kpi('Cœurs CPU', t.cpu_coeurs, ''),
      kpi('Hauteur', etat.hauteur, ''), kpi('Transactions', etat.transactions, ''), kpi('Unités détruites', fr.format(etat.soldes.detruit || 0), 'rouge'));
    $('date').textContent = `Copie publiée le ${heure(etat.genere_le)} par le nœud producteur.`;
    const parNom = Object.fromEntries((etat.reseau.noeuds || []).map((n) => [n.nom, n]));
    vider($('noeuds'), tableau([['Nœud', (n) => el('a', { href: `#${n.adresse}`, onclick: (ev) => { ev.preventDefault(); $('q').value = n.adresse; chercher(n.adresse); } }, n.noeud)],
      ['État', (n) => el('span', { class: `badge ${(parNom[n.noeud] || {}).actif ? 'ok' : ''}` }, (parNom[n.noeud] || {}).actif ? 'actif' : 'hors ligne')],
      ['Matériel partagé', (n) => materiel((parNom[n.noeud] || {}).materiel)], ['Reçu', (n) => fr.format(etat.soldes[`noeud:${n.noeud}`] || 0), 'num plus'],
      ['Inscrit au bloc', (n) => `#${n.hauteur}`]], etat.inscrits, 'Aucun nœud inscrit.'));
    const c = etat.epoque.courante;
    const reste = Math.max(0, new Date(c.fin) - Date.now());
    $('epoque-badge').textContent = `n° ${c.numero} · ${reste ? `fin dans ${Math.floor(reste / 864e5)} j ${Math.floor((reste % 864e5) / 36e5)} h` : 'clôture en cours'}`;
    vider($('epoque'), el('p', {}, `Du ${heure(c.debut)} au ${heure(c.fin)} · budget ${fr.format(c.budget)} unités (divisé par deux chaque année)`),
      c.scores ? tableau([['Nœud', (x) => x[0]], ['Points vérifiés', (x) => fr.format(x[1]), 'num'],
        ['Part projetée', (x) => fr.format((c.attributions_projetees || {})[x[0]] || 0), 'num plus']], Object.entries(c.scores), 'Aucune contribution vérifiée.')
        : el('p', { class: 'vide' }, 'Projection indisponible.'));
    vider($('blocs'), [...blocs].reverse().map((b, i) => bloc(b, i === 0)));
  }

  Promise.all([fetch('../chaine/blocs.json', { cache: 'no-store' }).then((r) => r.json()),
    fetch('../chaine/etat.json', { cache: 'no-store' }).then((r) => r.json())]).then(([b, e]) => {
    blocs = b.blocs; etat = e; rendre();
    const q = decodeURIComponent(location.hash.slice(1));
    if (q) { $('q').value = q; chercher(q); }
  }).catch((err) => message(`Chaîne illisible : ${err.message}`, false));
  $('form').addEventListener('submit', (ev) => { ev.preventDefault(); chercher($('q').value); });
})();
