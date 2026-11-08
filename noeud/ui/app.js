/* Turbo · Portefeuille — interface du nœud (servie par vision-noeud sur 127.0.0.1). Texte toujours par textContent. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fr = new Intl.NumberFormat('fr-FR');
  let vue = 'apercu', donnees = {}, dernierRuban = null;
  const TYPES = { allocation: 'Allocation', achat: 'Achat d’essai', depense: 'Dépense', recompense: 'Récompense', inscription: 'Inscription',
    regles: 'Règles', epoque: 'Clôture d’époque', catalogue: 'Catalogue', forfait: 'Forfait d’essai', consommation: 'Consommation',
    cle_producteur: 'Clé des blocs' };

  function el(tag, attrs, ...enfants) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const e of enfants.flat()) if (e != null) n.append(e instanceof Node ? e : document.createTextNode(String(e)));
    return n;
  }
  const vider = (n, ...e) => { n.replaceChildren(...e.flat().filter((x) => x != null)); };
  const court = (h, n = 12) => (h ? `${h.slice(0, n)}…` : '—');
  const heure = (iso) => { try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso || ''; } };

  // Le passe local arrive par le fragment de l'adresse, qui n'est jamais envoyé au serveur, puis quitte aussitôt la barre d'adresse.
  const passe = (() => {
    const m = /^#passe=([\w-]+)$/.exec(location.hash);
    try {
      if (m) { sessionStorage.setItem('vision-passe', m[1]); history.replaceState(null, '', location.pathname); }
      return sessionStorage.getItem('vision-passe') || '';
    } catch (_) { return m ? m[1] : ''; }
  })();
  if (!passe) addEventListener('DOMContentLoaded', () => message('message', 'Lecture seule : pour dépenser ou vous inscrire, ouvrez le portefeuille par son icône ou par la commande ouvrir-portefeuille.', false));

  async function api(chemin, corps) {
    const r = await fetch(chemin, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vision-Passe': passe }, body: JSON.stringify(corps) } : {});
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw new Error(d.erreur || `HTTP ${r.status}`);
    return d;
  }

  function message(cible, texte, ok) {
    const m = $(cible); m.hidden = false; m.className = `message ${ok ? 'ok' : 'ko'}`; m.textContent = texte;
  }

  function jauge(valeur, max = 100, etiquette = '') {
    const v = Math.max(0, Math.min(max, Number(valeur) || 0));
    const p = el('progress', { class: 'jauge', value: String(v), max: String(max) });
    return el('div', { class: 'jauge-zone' }, p, etiquette ? el('small', {}, etiquette) : null);
  }

  function copierTexte(btn, texte) {
    if (!navigator.clipboard || !texte) return;
    const init = btn.textContent;
    navigator.clipboard.writeText(texte).then(() => {
      btn.textContent = 'Copié ✓';
      setTimeout(() => { btn.textContent = init; }, 1400);
    }).catch(() => {});
  }

  function tableau(colonnes, lignes, vide) {
    if (!lignes.length) return el('div', { class: 'vide' }, vide || 'Rien pour l’instant.');
    return el('div', { class: 'table-boite' }, el('table', {}, el('thead', {}, el('tr', {}, colonnes.map((c) => el('th', {}, c[0])))),
      el('tbody', {}, lignes.map((l) => el('tr', {}, colonnes.map((c) => {
        const v = c[1](l); return v instanceof Node ? el('td', {}, v) : el('td', { class: c[2] || '' }, v);
      }))))));
  }

  function bloc(b, ouvert) {
    const detail = el('div', { class: 'bloc-detail' }, tableau([
      ['Type', (t) => TYPES[t.type] || t.type], ['Compte / nœud', (t) => t.compte || t.noeud || t.source || ''],
      ['Unités', (t) => (t.unites != null ? fr.format(t.unites) : ''), 'num'],
      ['Détail', (t) => t.service || t.facture || t.motif || (t.mission ? `${t.mission} / ${t.etape}` : '') || t.adresse || ''],
      ['Id', (t) => el('code', {}, court(t.id, 10))]], b.transactions));
    detail.hidden = !ouvert;
    return el('div', { class: 'bloc', 'data-h': String(b.hauteur) },
      el('div', { class: 'bloc-tete', onclick: () => { detail.hidden = !detail.hidden; } },
        el('span', { class: 'h' }, `#${b.hauteur}`), el('code', {}, court(b.empreinte, 16)),
        el('span', {}, `${b.transactions.length} tx`), el('span', { class: 'detruit' }, `${fr.format(b.detruit || 0)} détruites (cumul)`),
        el('span', { class: 'vide' }, heure(b.horodatage))), detail);
  }

  function rendreEtat(e) {
    const ok = e.synchro === 'à jour';
    $('pastille-synchro').className = `pastille ${ok ? 'ok' : 'attente'}`;
    $('pastille-reseau').className = `pastille ${ok ? 'ok' : 'attente'}`;
    $('nom-reseau').textContent = e.nom_reseau ? `${e.nom_reseau}-essai` : e.reseau;
    $('etat-synchro').textContent = ok ? 'Synchronisé' : `Synchronisation (${e.hauteur}/${e.hauteur_pairs})`;
    $('etat-hauteur').textContent = `hauteur ${e.hauteur}`;
    $('etat-pairs').textContent = `${e.pairs.filter((p) => p.vu && !p.erreur).length}/${e.pairs.length} pair(s)`;
    $('etat-role').textContent = `nœud ${e.nom} · ${e.role}`;
    $('etat-version').textContent = `v${e.version}`;
    vider($('infos-noeud'), ...[['Nom', e.nom], ['Rôle', e.role], ['Réseau', e.reseau], ['Hauteur', e.hauteur],
      ['Tête', e.tete || '—'], ['Bloc 0 épinglé', e.bloc0], ['Pair-à-pair', e.p2p], ['Portefeuille', `http://${e.api}/`],
      ['Clé des blocs', e.cle_blocs ? `${e.cle_blocs.empreinte}…${e.cle_blocs.declaree_au_bloc ? ` · déclarée au bloc ${e.cle_blocs.declaree_au_bloc}` : ' · clé d’origine'}` : '—'],
      ['Inscrit au registre', e.inscrit ? 'oui' : 'non'], ['En attente (producteur)', e.attente ?? '—']]
      .flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))]));
    vider($('pairs'), tableau([['Pair', (p) => el('code', {}, p.url)], ['Nom', (p) => p.nom || '—'],
      ['Hauteur', (p) => p.hauteur ?? '—', 'num'],
      ['État', (p) => el('span', { class: `badge ${p.erreur ? 'ko' : (p.vu ? 'ok' : '')}` }, p.erreur || (p.vu ? 'joignable' : 'jamais vu'))]],
    e.pairs, e.role === 'producteur' ? 'Producteur : il sert les autres nœuds, il n’a pas besoin de pair.' : 'Aucun pair configuré.'));
    $('journal').textContent = (e.journal || []).join('\n');
    $('btn-inscrire').disabled = e.inscrit;
    $('btn-inscrire').textContent = e.inscrit ? 'Nœud inscrit au registre' : 'Inscrire ce nœud au registre';
  }

  function rendreApercu() {
    const e = donnees.etat || {}, p = donnees.portefeuille || {};
    vider($('kpis'), [['Solde du portefeuille', fr.format(p.solde ?? 0), 'cyan'], ['Hauteur de la chaîne', e.hauteur ?? '—', ''],
      ['Transactions', e.transactions ?? '—', ''], ['Unités détruites', fr.format(e.detruit ?? 0), 'rouge'],
      ['Réserve usage restante', e.usage_restant != null ? fr.format(e.usage_restant) : '—', 'vert'],
      ['Nœuds inscrits', (e.noeuds || []).length, '']].map(([l, v, c]) => el('div', { class: `kpi ${c}` },
      el('div', { class: 'val' }, String(v)), el('div', { class: 'lib' }, l))));
    vider($('apercu-blocs'), (donnees.blocs || []).slice(0, 4).map((b) => bloc(b, false)));
    const teteRuban = (donnees.blocs || [])[0]?.empreinte;
    if (window.VisionRuban && teteRuban && teteRuban !== dernierRuban) {   // redessiné seulement quand un bloc arrive
      dernierRuban = teteRuban;
      window.VisionRuban.dessiner($('ruban-apercu'), donnees.blocs, { clic: (x) => ouvrirBloc(x.hauteur) });
      window.VisionRuban.legende($('legende-apercu'));
    }
  }

  function ouvrirBloc(h) {
    document.querySelector('#onglets button[data-vue="blocs"]')?.click();
    const f = $('filtre-blocs');
    if (f && f.value) { f.value = ''; rendreBlocs(); }
    const cible = document.querySelector(`#blocs .bloc[data-h="${CSS.escape(String(h))}"]`);
    if (!cible) return;
    document.querySelectorAll('#blocs .bloc.cible').forEach((x) => x.classList.remove('cible'));
    cible.classList.add('cible');
    const det = cible.querySelector('.bloc-detail'); if (det) det.hidden = false;
    cible.scrollIntoView({ block: 'center' });
  }

  function rendrePortefeuille() {
    const p = donnees.portefeuille; if (!p) return;
    $('solde').textContent = fr.format(p.solde);
    $('adresse').textContent = p.adresse;
    $('fichier-cle').textContent = p.fichier_cle || '—';
    vider($('attente'), p.en_attente.length ? tableau([['Type', (t) => t.type], ['Unités', (t) => t.unites ?? '', 'num'],
      ['Service', (t) => t.service || ''], ['Id', (t) => el('code', {}, court(t.id, 10))]], p.en_attente) : el('div', { class: 'vide' }, 'Rien en attente.'));
    vider($('historique'), tableau([['Bloc', (t) => `#${t.hauteur}`], ['Quand', (t) => heure(t.horodatage)], ['Type', (t) => TYPES[t.type] || t.type],
      ['Unités', (t) => el('span', { class: t.sens === '+' ? 'plus' : 'moins' }, `${t.sens}${fr.format(t.unites)}`)],
      ['Détail', (t) => t.detail || ''], ['Nœud servi', (t) => t.noeud || '']], p.historique, 'Aucune opération : commencez par un achat d’essai.'));
  }

  function rendrePuissance() {
    const z = donnees.puissance; if (!z) return;
    vider($('gpus'), z.gpus.length ? z.gpus.map((g) => el('div', { class: 'gpu' },
      el('div', { class: 'gpu-ligne' }, el('b', {}, g.nom), el('span', { class: 'mono' }, `${g.memoire_mo} Mo · ${g.utilisation_pct} % · ${g.temperature} °C`)),
      jauge(g.utilisation_pct, 100, `Charge GPU ${g.utilisation_pct} %`)))
      : el('div', { class: 'vide' }, 'Aucune carte NVIDIA détectée sur cette machine.'));
    $('regle-puissance').textContent = `Règle : ${z.regle}.`;
    $('solde-noeud').textContent = `${fr.format(z.solde_noeud)} VISION-essai`;
    const ORIGINE = { recompense: 'reçu de vérification (v1)', depense: 'dépense servie (v1)', epoque: 'fin d’époque' };
    vider($('gains'), tableau([['Bloc', (g) => `#${g.hauteur}`], ['Origine', (g) => ORIGINE[g.type] || g.type],
      ['Unités', (g) => `+${fr.format(g.unites)}`, 'num plus'], ['Détail', (g) => g.detail || ''], ['Voie', (g) => g.voie || '']], z.gains,
    'Aucune unité reçue pour ce nœud.'));
    vider($('classement'), tableau([['Nœud', (x) => x[0]], ['Unités reçues', (x) => fr.format(x[1]), 'num']], z.classement, 'Aucun nœud rémunéré.'));
    rendreEpoque();
  }

  function rendreEpoque() {
    const ep = donnees.epoque; if (!ep) return;
    const c = ep.courante;
    const tDebut = new Date(c.debut).getTime(), tFin = new Date(c.fin).getTime(), tNow = Date.now();
    const reste = Math.max(0, tFin - tNow);
    const pct = tFin > tDebut ? Math.max(0, Math.min(100, Math.round(((tNow - tDebut) / (tFin - tDebut)) * 100))) : 100;
    const j = Math.floor(reste / 864e5), h = Math.floor((reste % 864e5) / 36e5);
    $('epoque-badge').textContent = `n° ${c.numero} · ${reste ? `fin dans ${j} j ${h} h (${pct} %)` : 'terminée, clôture au prochain passage'}`;
    const lignes = [['Fenêtre', `${heure(c.debut)} → ${heure(c.fin)}`], ['Budget de l’époque', fr.format(c.budget)],
      ['Règles', c.regles_v2 ? 'v2 : rétribution par époque' : 'v1 : récompense immédiate (v2 pas encore active)']];
    if (c.justifie != null) lignes.push(['Points justifiés à ce jour', fr.format(c.justifie)], ['Émission projetée', fr.format(c.emis_projete)]);
    if (c.erreur) lignes.push(['Projection', c.erreur]);
    const dl = el('dl', { class: 'cv' }, lignes.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
    const barreEpoque = jauge(pct, 100, `${pct} % de la fenêtre écoulée`);
    const proj = c.scores ? tableau([['Nœud', (x) => x[0]], ['Points', (x) => fr.format(x[1]), 'num'],
      ['Part projetée', (x) => fr.format((c.attributions_projetees || {})[x[0]] || 0), 'num plus']], Object.entries(c.scores), 'Aucune contribution vérifiée dans cette époque.')
      : el('p', { class: 'note' }, 'La projection se calcule sur le nœud producteur, qui lit les reçus de vérification ; ce nœud verra le résultat à la clôture.');
    vider($('epoque'), barreEpoque, dl, proj);
    vider($('epoques-closes'), tableau([['Époque', (e) => `n° ${e.numero}`], ['Bloc', (e) => `#${e.hauteur}`],
      ['Contributions', (e) => e.contributions, 'num'], ['Points', (e) => fr.format(e.justifie), 'num'], ['Émis', (e) => fr.format(e.emis), 'num plus'],
      ['Parts', (e) => Object.entries(e.attributions).map(([n, u]) => `${n} ${fr.format(u)}`).join(' · ')]], ep.closes,
    'Aucune époque close : la première fin d’époque est le mercredi 04/11/2026 à 12:00 UTC.'));
  }

  function formulaireDepense() {
    const p = donnees.portefeuille, f = $('formulaire');
    if (!p.services.length) { vider(f, el('p', { class: 'note' }, 'Aucun service publié sur ce réseau d’essai.')); f.hidden = false; return; }
    const sel = el('select', {}, p.services.map((s, i) => el('option', { value: String(i) }, `${s.titre} — ${s.prix} unités (nœud ${s.noeud})`)));
    const barre = el('div', { class: 'repartition' }, el('div', { class: 'd' }), el('div', { class: 'n' }));
    const leg = el('div', { class: 'legende' });
    const maj = () => {
      const s = p.services[+sel.value]; const d = Math.floor(s.prix * 20 / 100);
      const v2 = (donnees.etat || {}).regles === 2;
      vider(leg, el('span', { class: 'detruit' }, `${d} détruites`),
        el('span', { class: 'plus' }, v2 ? `${s.prix - d} recyclées dans la réserve des époques` : `${s.prix - d} au nœud ${s.noeud}`));
    };
    sel.addEventListener('change', maj);
    const ok = el('button', { class: 'primaire', onclick: async () => {
      const s = p.services[+sel.value]; ok.disabled = true;
      try { const r = await api('/api/depenser', { unites: s.prix, service: s.titre, noeud: s.noeud });
        message('message', `Dépense signée par votre clé et transmise : ${r.statut} (${court(r.id, 10)}).`, true); f.hidden = true; rafraichir();
      } catch (e) { message('message', `Refusé : ${e.message}`, false); } finally { ok.disabled = false; }
    } }, 'Signer et dépenser');
    vider(f, el('label', {}, 'Service du catalogue (barème d’essai, non décidé)'), sel, barre, leg,
      el('div', { class: 'actions' }, ok, el('button', { onclick: () => { f.hidden = true; } }, 'Annuler')));
    maj(); f.hidden = false;
  }

  function recevoir() {
    vider($('formulaire'), el('p', {}, 'Votre adresse :'), el('code', {}, donnees.portefeuille.adresse),
      el('p', { class: 'note' }, 'Il n’y a pas de transfert entre comptes : un compte reçoit par un achat (crédits internes) et un nœud par le partage de puissance.'),
      el('div', { class: 'actions' }, el('button', { onclick: () => { $('formulaire').hidden = true; } }, 'Fermer')));
    $('formulaire').hidden = false;
  }

  function rendreReseau() {
    const r = donnees.reseau; if (!r) return;
    const t = r.total, go = (v) => `${String(v).replace('.', ',')} Go`;
    vider($('kpis-reseau'), [['Machines', t.machines, 'cyan'], ['Nœuds actifs', `${t.noeuds_actifs}/${t.noeuds_connus}`, ''],
      ['GPU', t.gpus, 'vert'], ['VRAM cumulée', go(t.vram_go), 'vert'], ['VRAM libre', go(t.vram_libre_go), ''],
      ['Cœurs CPU', t.cpu_coeurs, ''], ['RAM cumulée', go(t.ram_go), ''],
      ['Synchronisés', `${t.synchronises}/${t.noeuds_actifs} à la hauteur ${t.hauteur}`, t.synchronises === t.noeuds_actifs ? 'vert' : 'rouge']]
      .map(([l, v, c]) => el('div', { class: `kpi ${c}` }, el('div', { class: 'val' }, String(v)), el('div', { class: 'lib' }, l))));
    $('reseau-badge').textContent = t.gpu_utilisation_pct != null ? `GPU occupés à ${t.gpu_utilisation_pct} % en moyenne` : '';
    vider($('reseau-noeuds'), tableau([
      ['Nœud', (n) => el('span', {}, el('b', {}, n.nom || '?'), n.ici ? ' (ici)' : '')],
      ['Machine', (n) => (n.capacite ? n.capacite.machine : '—')],
      ['Rôle', (n) => n.role || '—'],
      ['État', (n) => el('span', { class: `badge ${n.actif ? 'ok' : 'ko'}` }, n.actif ? 'actif' : (n.erreur || 'muet'))],
      ['Hauteur', (n) => (n.hauteur ?? '—'), 'num'],
      ['GPU', (n) => (n.capacite ? n.capacite.gpus.map((g) => `${g.nom.replace('NVIDIA GeForce ', '')} ${Math.round(g.vram_mo / 1024)} Go · ${g.utilisation_pct} %`).join(' / ') || 'aucun' : '—')],
      ['CPU · RAM', (n) => (n.capacite ? `${n.capacite.cpu_coeurs} cœurs · ${Math.round((n.capacite.ram_mo || 0) / 1024)} Go · charge ${n.capacite.charge}` : '—')],
      ['Reçu', (n) => fr.format((r.gains || {})[n.nom] || 0), 'num plus'],
      ['Cockpit', (n) => (n.cockpit ? el('a', { href: n.cockpit, target: '_blank', rel: 'noopener' }, 'ouvrir') : '—')]], r.noeuds));
  }

  async function ouvrirCompte(adresse) {
    const a = (adresse || '').trim();
    $('message-compte').hidden = true;
    try {
      const c = await api(`/api/compte?adresse=${encodeURIComponent(a)}`);
      donnees.compte = c; rendreCompte();
      try { history.replaceState(null, '', `#compte=${a}`); } catch { /* sans importance */ }
    } catch (e) { $('compte').hidden = true; message('message-compte', `Connexion impossible : ${e.message}`, false); }
  }

  function rendreCompte() {
    const c = donnees.compte; if (!c) return;
    $('compte').hidden = false;
    if (!c.connu) message('message-compte', 'Adresse valide, mais encore inconnue de la chaîne : aucune opération, aucun nœud rattaché.', true);
    const ab = c.abonnement;
    vider($('kpis-compte'), [['Solde', fr.format(c.solde), 'cyan'], ['Forfait d’essai', ab ? `${ab.offre}` : 'aucun', ab ? 'vert' : ''],
      ['Unités dépensées', fr.format(c.depense), ''], ['Détruites par ses dépenses', fr.format(c.detruit_par_ses_depenses), 'rouge'],
      ['Nœuds rattachés', c.noeuds.length, ''], ['Reçu par ses nœuds', fr.format(c.gains_total), 'vert']]
      .map(([l, v, k]) => el('div', { class: `kpi ${k}` }, el('div', { class: 'val' }, String(v)), el('div', { class: 'lib' }, l))));
    vider($('compte-forfaits'), tableau([['Offre', (f) => f.offre], ['Unités', (f) => `+${fr.format(f.unites)}`, 'num plus'],
      ['Bloc', (f) => `#${f.hauteur}`], ['Quand', (f) => heure(f.horodatage)], ['Facture', (f) => el('code', {}, f.facture || '')]],
    c.forfaits, 'Aucun forfait : les unités d’usage viennent d’un forfait d’essai.'));
    vider($('compte-noeuds'), tableau([['Nœud', (n) => el('b', {}, n.noeud)],
      ['État', (n) => el('span', { class: `badge ${n.actif ? 'ok' : ''}` }, n.actif ? 'actif' : 'hors ligne ou hors de vue')],
      ['Matériel partagé', (n) => (n.materiel ? `${n.materiel.gpus.map((g) => `${g.nom.replace('NVIDIA GeForce ', '')} ${Math.round(g.vram_mo / 1024)} Go`).join(' / ') || 'sans GPU'} · ${n.materiel.cpu_coeurs} cœurs · ${Math.round((n.materiel.ram_mo || 0) / 1024)} Go` : '—')],
      ['Reçu', (n) => fr.format(n.gains), 'num plus'], ['Inscrit au bloc', (n) => `#${n.hauteur}`], ['Lien', (n) => n.lien]],
    c.noeuds, 'Aucun nœud rattaché à cette adresse.'));
    vider($('compte-historique'), tableau([['Bloc', (t) => `#${t.hauteur}`], ['Quand', (t) => heure(t.horodatage)], ['Type', (t) => TYPES[t.type] || t.type],
      ['Unités', (t) => el('span', { class: t.sens === '+' ? 'plus' : 'moins' }, `${t.sens}${fr.format(t.unites)}`)],
      ['Détail', (t) => t.detail || ''], ['Nœud servi', (t) => t.noeud || ''], ['Id', (t) => el('code', {}, court(t.id, 10))]],
    c.historique, 'Aucune opération pour cette adresse.'));
  }

  function rendreMiroirs(e) {
    vider($('miroirs'), tableau([['Miroir', (m) => el('code', {}, m.url)], ['Hauteur', (m) => m.hauteur ?? '—', 'num'],
      ['État', (m) => el('span', { class: `badge ${m.erreur ? 'ko' : (m.vu ? 'ok' : '')}` }, m.erreur || (m.vu ? 'lu' : 'pas encore lu'))]],
    e.miroirs || [], 'Aucun miroir configuré : ce nœud se synchronise par ses pairs.'));
    $('btn-demande').disabled = e.inscrit;
  }

  function rendreBlocs() {
    const tous = donnees.blocs || [];
    const q = (($('filtre-blocs') || {}).value || '').trim().toLowerCase();
    const filtres = !q ? tous : tous.filter((b) => {
      if (`#${b.hauteur}`.includes(q) || String(b.hauteur) === q || (b.empreinte || '').toLowerCase().includes(q)) return true;
      return (b.transactions || []).some((t) => [t.type, TYPES[t.type], t.compte, t.noeud, t.service, t.facture, t.motif, t.mission, t.etape, t.adresse, t.id]
        .some((x) => x && String(x).toLowerCase().includes(q)));
    });
    if ($('blocs-compte')) $('blocs-compte').textContent = q ? `${filtres.length}/${tous.length}` : `${tous.length} blocs`;
    vider($('blocs'), filtres.length ? filtres.map((b, i) => bloc(b, i === 0 || Boolean(q))) : el('div', { class: 'vide' }, 'Aucun bloc ne correspond à ce filtre.'));
  }

  async function rafraichir() {
    try {
      const [etat, portefeuille, puissance, blocs, epoque, reseau] = await Promise.all([api('/api/etat'), api('/api/portefeuille'),
        api('/api/puissance'), api('/api/blocs'), api('/api/epoque').catch(() => null), api('/api/reseau').catch(() => null)]);
      donnees = { etat, portefeuille, puissance, blocs, epoque, reseau };
      rendreReseau();
      rendreEtat(etat); rendreMiroirs(etat); rendreApercu(); rendrePortefeuille(); rendrePuissance();
      rendreBlocs();
    } catch (e) {
      $('pastille-synchro').className = 'pastille ko'; $('etat-synchro').textContent = `nœud injoignable (${e.message})`;
    }
  }

  document.querySelectorAll('#onglets button').forEach((b) => b.addEventListener('click', () => {
    vue = b.dataset.vue;
    document.querySelectorAll('#onglets button').forEach((x) => x.classList.toggle('actif', x === b));
    document.querySelectorAll('.vue').forEach((v) => v.classList.toggle('actif', v.id === `vue-${vue}`));
  }));
  $('btn-depenser').addEventListener('click', formulaireDepense);
  $('btn-recevoir').addEventListener('click', recevoir);
  // Portefeuille v2 : le retour visuel de la copie (libellé, repli par sélection) appartient à presentation.js ;
  // copierTexte() réécrirait textContent et effacerait l'icône et le span .copier-lib du bouton.
  $('copier').addEventListener('click', () => navigator.clipboard?.writeText($('adresse').textContent).catch(() => {}));
  $('btn-rafraichir')?.addEventListener('click', () => rafraichir());
  $('filtre-blocs')?.addEventListener('input', () => rendreBlocs());
  $('btn-inscrire').addEventListener('click', async () => {
    try { const r = await api('/api/inscrire', {}); message('message-inscription', `Inscription signée et transmise : ${r.statut}.`, true); rafraichir(); }
    catch (e) { message('message-inscription', `Refusé : ${e.message}`, false); }
  });
  $('btn-synchro').addEventListener('click', async () => { await api('/api/synchroniser', {}).catch(() => {}); rafraichir(); });
  // assistant (02/11) : question → réponse lue sur le nœud ; dépense facultative en unités d'essai
  $('btn-assistant').addEventListener('click', async () => {
    const q = $('assistant-question').value.trim();
    if (!q) return;
    const etat = $('assistant-etat'), rep = $('assistant-reponse');
    $('btn-assistant').disabled = true; etat.textContent = 'L\u2019assistant lit le nœud et réfléchit…'; rep.hidden = true;
    try {
      const r = await api('/api/assistant', { question: q, payer: $('assistant-payer').checked });
      if (!r.ok) throw new Error(r.erreur || 'refus');
      rep.textContent = r.reponse; rep.hidden = false;
      const bouts = [];
      if (r.relance) bouts.push(r.coupee ? 'réponse coupée par la limite de jetons, incomplète' : 'réponse relancée une fois après une coupure');
      if (r.cout) bouts.push(r.depense ? `dépense de ${r.cout} unité(s) d\u2019essai signée, en attente d\u2019un bloc` : `dépense refusée : ${r.erreur_depense}`);
      etat.textContent = bouts.join(' · ');
      if (r.cout) rafraichir();
    } catch (e) { etat.textContent = 'Échec : ' + e.message; }
    finally { $('btn-assistant').disabled = false; }
  });
  $('form-compte').addEventListener('submit', (ev) => { ev.preventDefault(); ouvrirCompte($('saisie-adresse').value); });
  $('btn-mon-adresse').addEventListener('click', () => {
    const a = (donnees.portefeuille || {}).adresse; if (a) { $('saisie-adresse').value = a; ouvrirCompte(a); }
  });
  $('btn-demande').addEventListener('click', async () => {
    const d = $('demande');
    try {
      const r = await api('/api/demande-inscription', {});
      const zone = el('textarea', { class: 'demande-json', readonly: 'readonly', rows: '12' }); zone.value = r.corps;
      const btnCopier = el('button', { onclick: (ev) => copierTexte(ev.currentTarget, r.corps) }, 'Copier');
      vider(d, el('p', { class: 'note' }, 'Transaction signée par la clé de ce nœud, prête à déposer. Elle ne contient ni clé privée ni secret.'), zone,
        el('div', { class: 'actions' },
          btnCopier,
          r.ticket ? el('a', { class: 'bouton primaire', href: r.ticket, target: '_blank', rel: 'noopener' }, 'Déposer la demande sur GitHub') : null));
      d.hidden = false;
    } catch (e) { vider(d, el('div', { class: 'message ko' }, `Refusé : ${e.message}`)); d.hidden = false; }
  });
  const ancre = decodeURIComponent(location.hash.slice(1));
  const [onglet, valeur] = ancre.split('=');
  if (onglet) document.querySelector(`#onglets button[data-vue="${CSS.escape(onglet)}"]`)?.click();
  if (onglet === 'compte' && valeur) { $('saisie-adresse').value = valeur; ouvrirCompte(valeur); }
  rafraichir();
  setInterval(rafraichir, 5000);
})();
