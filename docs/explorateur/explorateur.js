/* VISION · explorateur public de la chaîne d'essai. Lit ../chaine/*.json ; texte toujours par textContent. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fr = new Intl.NumberFormat('fr-FR');
  const ADRESSE = /^te1[0-9a-f]{40}$/;
  const DESTRUCTION = 20;
  const TYPES = { allocation: 'Allocation', achat: 'Crédit d’essai (facture ESSAI-)', depense: 'Dépense', recompense: 'Récompense', inscription: 'Inscription',
    regles: 'Règles', epoque: 'Clôture d’époque', catalogue: 'Catalogue', forfait: 'Forfait d’essai', consommation: 'Consommation',
    cle_producteur: 'Clé des blocs' };
  let blocs = [], etat = null, delta = new Map();

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
  const heure = (iso) => { try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso || ''; } };
  const go = (mo) => `${Math.round((mo || 0) / 1024)} Go`;
  const materiel = (m) => (m ? `${m.gpus.map((g) => `${g.nom.replace('NVIDIA GeForce ', '')} ${go(g.vram_mo)}`).join(', ') || 'sans carte graphique'} ; ${m.cpu_coeurs} cœurs ; ${go(m.ram_mo)}` : 'publié en total seulement');  // #2295 : le miroir ne publie plus le matériel par nœud
  const chiffre = (lib, val, cls) => el('li', {}, el('b', { class: cls || '' }, String(val)), el('span', {}, lib));
  const couleurType = (t) => window.VisionRuban.GROUPES[window.VisionRuban.groupeDe(t)].couleur;

  function tableau(colonnes, lignes, vide) {
    if (!lignes.length) return el('p', { class: 'vide' }, vide || 'Rien pour l’instant.');
    return el('div', { class: 'table-boite' }, el('table', {}, el('thead', {}, el('tr', {}, colonnes.map((c) => el('th', {}, c[0])))),
      el('tbody', {}, lignes.map((l) => el('tr', {}, colonnes.map((c) => { const v = c[1](l); return el('td', { class: c[2] || '' }, v); }))))));
  }

  function detailTx(t) {
    return t.service || (t.type === 'forfait' ? `forfait ${t.offre}` : '') || t.motif || (t.mission ? `${t.mission} / ${t.etape}` : '')
      || (t.type === 'epoque' ? `époque ${t.numero}` : '') || (t.type === 'inscription' ? `nœud ${t.noeud}` : '') || t.facture || '';
  }

  function puces(b) {
    const n = {};
    for (const t of b.transactions) n[t.type] = (n[t.type] || 0) + 1;
    return el('span', { class: 'puces' }, Object.entries(n).map(([t, k]) => {
      const p = el('span', { class: 'puce' }, `${TYPES[t] || t}${k > 1 ? ` ×${k}` : ''}`); p.style.setProperty('--c', couleurType(t)); return p;
    }));
  }

  function ligneBloc(b) {
    const detail = el('div', { class: 'detail' }, tableau([
      ['Type', (t) => TYPES[t.type] || t.type], ['Compte ou nœud', (t) => el('span', { class: 'mono' }, t.compte || t.noeud || '')],
      ['Unités', (t) => (t.unites != null ? fr.format(t.unites) : ''), 'num'], ['Détail', detailTx],
      ['Identifiant', (t) => el('code', {}, court(t.id, 12))]], b.transactions));
    detail.hidden = true;
    const d = delta.get(b.hauteur);
    const tete = el('button', { class: 'ligne-tete', type: 'button', 'aria-expanded': 'false' },
      el('span', { class: 'h' }, `#${b.hauteur}`), puces(b), el('span', { class: 'emp' }, b.empreinte),
      el('span', { class: 'detruit-bloc' }, d ? `−${fr.format(d)} détruites` : ''), el('span', { class: 'quand' }, heure(b.horodatage)));
    const ligne = el('div', { class: 'ligne', id: `bloc-${b.hauteur}` }, tete, detail);
    tete.addEventListener('click', () => ouvrirBloc(b.hauteur, !detail.hidden));
    return ligne;
  }

  function ouvrirBloc(h, fermer) {
    const ligne = document.getElementById(`bloc-${h}`); if (!ligne) return false;
    const det = ligne.querySelector('.detail'); const tete = ligne.querySelector('.ligne-tete');
    det.hidden = !!fermer; ligne.classList.toggle('ouverte', !fermer); tete.setAttribute('aria-expanded', String(!fermer));
    if (!fermer) ligne.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
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
    $('compte-titre').textContent = c.noeuds.some((n) => n.lien === 'clé du nœud') ? `Nœud ${c.noeuds[0].noeud}` : 'Portefeuille';
    $('compte-adresse').textContent = adresse;
    $('compte-solde').textContent = fr.format(c.solde);
    if (!c.connu) message('Adresse valide, encore inconnue de la chaîne : aucune opération, aucun nœud rattaché.', true);
    const ab = c.forfaits[0];
    vider($('compte-chiffres'), chiffre('forfait d’essai', ab ? ab.offre : 'aucun', ab ? 'c-sarcelle' : ''),
      chiffre('unités dépensées', fr.format(c.depense), 'c-ambre'), chiffre('détruites par ses dépenses', fr.format(c.detruit), 'c-corail'),
      chiffre('nœuds rattachés', c.noeuds.length), chiffre('reçu par ses nœuds', fr.format(c.gains), 'c-sarcelle'));
    vider($('compte-forfaits'), tableau([['Offre', (f) => f.offre], ['Unités', (f) => `+${fr.format(f.unites)}`, 'num c-sarcelle'],
      ['Bloc', (f) => `#${f.hauteur}`], ['Quand', (f) => heure(f.horodatage)]], c.forfaits, 'Aucun forfait. La vente est fermée pendant l’essai.'));
    vider($('compte-noeuds'), tableau([['Nœud', (n) => el('b', {}, n.noeud)],
      ['État', (n) => el('span', { class: `etat ${n.actif ? 'actif' : 'hors'}` }, n.actif ? 'en ligne' : 'hors ligne')],
      ['Matériel partagé', (n) => materiel(n.materiel)], ['Reçu', (n) => fr.format(n.gains), 'num c-sarcelle']],
    c.noeuds, 'Aucun nœud rattaché à cette adresse.'));
    vider($('compte-historique'), tableau([['Bloc', (t) => `#${t.hauteur}`], ['Quand', (t) => heure(t.horodatage)], ['Type', (t) => TYPES[t.type] || t.type],
      ['Unités', (t) => el('span', { class: t.sens === '+' ? 'c-sarcelle' : 'c-ambre' }, `${t.sens === '+' ? '+' : '−'}${fr.format(t.unites)}`), 'num'],
      ['Détail', (t) => t.detail], ['Nœud servi', (t) => t.noeud || '']], c.historique, 'Aucune opération pour cette adresse.'));
    $('compte').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function chercher(q) {
    q = (q || '').trim();
    $('message').hidden = true; $('compte').hidden = true;
    if (!q) return null;
    try { history.replaceState(null, '', `#${encodeURIComponent(q)}`); } catch { /* sans importance */ }
    if (ADRESSE.test(q)) return afficherCompte(q);
    const ins = etat.inscrits.find((n) => n.noeud === q);
    if (ins) return afficherCompte(ins.adresse);
    if (/^\d+$/.test(q)) return ouvrirBloc(Number(q)) ? null : message(`Aucun bloc ${q} : la chaîne compte ${blocs.length} blocs.`, false);
    if (/^[0-9a-f]{6,64}$/.test(q)) {
      for (const b of blocs) {
        if (b.empreinte.startsWith(q)) { ouvrirBloc(b.hauteur); return null; }
        const t = b.transactions.find((x) => (x.id || '').startsWith(q));
        if (t) { ouvrirBloc(b.hauteur); return message(`Transaction ${court(t.id, 16)} trouvée dans le bloc ${b.hauteur} (${TYPES[t.type] || t.type}).`, true); }
      }
    }
    return message('Rien trouvé. Une adresse commence par te1, suivie de 40 caractères hexadécimaux.', false);
  }

  function rendre() {
    delta = window.VisionRuban.detruitsParBloc(blocs);
    const tete = blocs[blocs.length - 1];
    window.VisionRuban.dessiner($('ruban'), blocs, { clic: (b) => ouvrirBloc(b.hauteur) });
    window.VisionRuban.legende($('legende'));
    $('ruban-info').textContent = `${blocs.length} blocs, dernier ${tete.empreinte.slice(0, 12)}, scellé le ${heure(tete.horodatage)}.`;
    const t = etat.reseau.total;
    vider($('chiffres'), chiffre('machines en ligne', t.machines, 'c-sarcelle'), chiffre(`nœuds actifs sur ${t.noeuds_connus}`, t.noeuds_actifs),
      chiffre('cartes graphiques', t.gpus), chiffre('de mémoire graphique', `${String(t.vram_go).replace('.', ',')} Go`),
      chiffre('transactions', etat.transactions), chiffre('unités détruites', fr.format(etat.soldes.detruit || 0), 'c-corail'));
    $('date').textContent = `Copie publiée le ${heure(etat.genere_le)} par le nœud producteur. Unité affichée VISION-essai.`;

    const parNom = Object.fromEntries((etat.reseau.noeuds || []).map((n) => [n.nom, n]));
    const ouvrirAdresse = (a) => (ev) => { ev.preventDefault(); $('q').value = a; chercher(a); };
    vider($('noeuds'), tableau([['Nœud', (n) => el('a', { href: `#${n.adresse}`, onclick: ouvrirAdresse(n.adresse) }, n.noeud)],
      ['État', (n) => el('span', { class: `etat ${(parNom[n.noeud] || {}).actif ? 'actif' : 'hors'}` }, (parNom[n.noeud] || {}).actif ? 'en ligne' : 'hors ligne')],
      ['Matériel', (n) => materiel((parNom[n.noeud] || {}).materiel)], ['Reçu', (n) => fr.format(etat.soldes[`noeud:${n.noeud}`] || 0), 'num c-sarcelle']],
    etat.inscrits, 'Aucun nœud inscrit.'));

    const adresseNoeud = Object.fromEntries(etat.inscrits.map((n) => [n.noeud, n.adresse]));
    const comptes = Object.entries(etat.soldes).filter(([k]) => k.startsWith('compte:') || k.startsWith('noeud:'))
      .map(([k, v]) => { const [genre, nom] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
        return { genre, nom, solde: v, adresse: genre === 'noeud' ? adresseNoeud[nom] : (ADRESSE.test(nom) ? nom : null) }; })
      .sort((a, b) => b.solde - a.solde);
    vider($('comptes'), tableau([['Genre', (c) => (c.genre === 'noeud' ? 'Nœud' : 'Portefeuille')],
      ['Compte', (c) => (c.adresse ? el('a', { href: `#${c.adresse}`, class: 'mono', onclick: ouvrirAdresse(c.adresse) }, c.genre === 'noeud' ? c.nom : court(c.nom, 18)) : el('span', { class: 'mono' }, c.nom))],
      ['Solde (VISION-essai)', (c) => fr.format(c.solde), 'num']], comptes, 'Aucun compte.'));

    const ep = etat.epoque.courante;
    const debut = new Date(ep.debut), fin = new Date(ep.fin);
    const part = Math.min(1, Math.max(0, (Date.now() - debut) / (fin - debut)));
    $('epoque-fenetre').textContent = `Époque ${ep.numero}, du ${heure(ep.debut)} au ${heure(ep.fin)}. Budget de ${fr.format(ep.budget)} unités, divisé par deux chaque année.`;
    $('epoque-barre').style.width = `${Math.round(part * 100)}%`;
    const reste = Math.max(0, fin - Date.now());
    $('epoque-reste').textContent = reste ? `Clôture dans ${Math.floor(reste / 864e5)} j ${Math.floor((reste % 864e5) / 36e5)} h.` : 'Clôture en cours.';
    vider($('epoque'), ep.scores ? tableau([['Nœud', (x) => x[0]], ['Points vérifiés', (x) => fr.format(x[1]), 'num'],
      ['Part projetée', (x) => fr.format((ep.attributions_projetees || {})[x[0]] || 0), 'num c-sarcelle']], Object.entries(ep.scores), 'Aucune contribution vérifiée.')
      : el('p', { class: 'vide' }, 'Projection indisponible.'));

    vider($('blocs'), [...blocs].reverse().map(ligneBloc));
  }

  Promise.all([fetch('../chaine/blocs.json', { cache: 'no-store' }).then((r) => r.json()),
    fetch('../chaine/etat.json', { cache: 'no-store' }).then((r) => r.json())]).then(([b, e]) => {
    blocs = b.blocs; etat = e; rendre();
    const q = decodeURIComponent(location.hash.slice(1));
    if (q) { $('q').value = q; chercher(q); }
  }).catch((err) => message(`Copie publique illisible : ${err.message}`, false));
  $('form').addEventListener('submit', (ev) => { ev.preventDefault(); chercher($('q').value); });
})();
