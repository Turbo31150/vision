/* VISION · presentation.js : couche de présentation de la version retenue (base « poche », greffes « instrument »,
   « coffre » et « réseau »).
   Aucune logique de portefeuille ici : aucun appel réseau, aucune écriture, aucune signature. Les boutons qui signent
   restent ceux d'app.js. Ce fichier observe ce qu'app.js affiche et l'habille : onglets accessibles au clavier,
   navigation basse au pouce, adresse groupée et copiable (sélection si la copie est refusée), QR de réception,
   parcours recevoir et dépenser en deux étapes, frise d'époque lue dans le DOM d'app.js, tableaux en fiches sur
   mobile, blocs dépliés conservés pendant les rafraîchissements, thème mémorisé. Texte toujours par textContent. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const racine = document.documentElement;
  racine.classList.add('poche-js');
  const fr = new Intl.NumberFormat('fr-FR');
  const RE_ADRESSE = /^te1[0-9a-f]{40}$/;
  const RE_EMPREINTE = /^[0-9a-f]{64}$/;
  const MENTION = 'Réseau d’essai VISION — unités d’essai sans valeur, rien en vente';

  function el(tag, cls, texte) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texte != null) n.textContent = texte;
    return n;
  }
  function bouton(texte, cls, action) {
    const b = el('button', cls, texte);
    b.type = 'button';
    if (action) b.addEventListener('click', action);
    return b;
  }
  const lireNombre = (t) => {
    const s = String(t || '').trim();
    const chiffres = s.replace(/[^\d]/g, '');
    if (!chiffres) return null;
    return (/^[-−]/.test(s) ? -1 : 1) * Number(chiffres);
  };
  const groupes = (a) => { const g = [a.slice(0, 3)]; for (let i = 3; i < a.length; i += 4) g.push(a.slice(i, i + 4)); return g; };
  const courte = (a) => `${a.slice(0, 7)}…${a.slice(-6)}`;
  const visible = (n) => !!n && n.getClientRects().length > 0;
  const ecrire = (n, t) => { if (n && n.textContent !== t) n.textContent = t; };   // n'écrit que ce qui change (pas de boucle d'observateurs)
  function vueGroupee(a, cls) {
    const n = el('span', `adresse-groupes${cls ? ` ${cls}` : ''}`);
    n.setAttribute('aria-hidden', 'true');
    n.replaceChildren(...(RE_ADRESSE.test(a) ? groupes(a) : [a]).map((g) => el('span', null, g)));
    return n;
  }

  /* ── Thème : automatique (système), clair ou sombre, mémorisé dans ce navigateur ── */
  const CLE_THEME = 'vision-theme';
  const NOMS_THEME = { auto: 'automatique', clair: 'clair', sombre: 'sombre' };
  const btnTheme = $('btn-theme');
  let theme = 'auto';
  if (racine.hasAttribute('data-theme')) {   // imposé par la page (aperçu, captures) : on le respecte
    theme = /^(sombre|dark)$/.test(racine.dataset.theme) ? 'sombre' : 'clair';
  } else {
    try { const v = localStorage.getItem(CLE_THEME); if (v === 'clair' || v === 'sombre') theme = v; } catch { /* stockage indisponible */ }
    if (theme !== 'auto') racine.dataset.theme = theme;
  }
  const majBoutonTheme = () => { btnTheme.textContent = `Thème : ${NOMS_THEME[theme]}`; };
  btnTheme.addEventListener('click', () => {
    theme = { auto: 'clair', clair: 'sombre', sombre: 'auto' }[theme];
    if (theme === 'auto') racine.removeAttribute('data-theme'); else racine.dataset.theme = theme;
    try { if (theme === 'auto') localStorage.removeItem(CLE_THEME); else localStorage.setItem(CLE_THEME, theme); } catch { /* sans importance */ }
    majBoutonTheme();
    signaler(`Thème ${NOMS_THEME[theme]}`);
  });
  majBoutonTheme();

  /* ── Presse-papiers : app.js appelle aussi writeText sans attraper le refus ; ce refus est traité ici ── */
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason;
    if (r && r.name === 'NotAllowedError' && /writeText|clipboard|focused/i.test(`${r.message} ${r.stack || ''}`)) ev.preventDefault();
  });

  /* ── Annonces et retour visuel (toast) ─────────────────────────────────── */
  const annonce = el('div', 'sr-only');
  annonce.setAttribute('role', 'status');
  annonce.setAttribute('aria-live', 'polite');
  const toast = el('div', 'toast');
  toast.hidden = true;
  toast.setAttribute('aria-hidden', 'true');
  document.body.append(annonce, toast);
  let minuteurToast = 0;
  function signaler(texte, ms = 2600) {
    fermerTiroir();   // le toast ne doit jamais masquer une entrée du tiroir « Plus »
    annonce.textContent = '';
    setTimeout(() => { annonce.textContent = texte; }, 30);
    toast.textContent = texte;
    toast.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => { toast.hidden = true; }, ms);
  }
  async function ecrirePressePapiers(texte) {
    try {
      if (!navigator.clipboard) throw new Error('presse-papiers absent');
      await navigator.clipboard.writeText(texte);
      return true;
    } catch { return false; }
  }
  /* copie d'une adresse ; si le navigateur refuse, l'adresse brute s'affiche et se sélectionne (Ctrl+C suffit) */
  async function copierAdresse(a, zone, btn, lib) {
    if (!RE_ADRESSE.test(a)) return;
    const libelle = lib || btn;
    const initial = libelle.dataset.initial || (libelle.dataset.initial = libelle.textContent);
    clearTimeout(btn._minuteur);
    if (await ecrirePressePapiers(a)) {
      zone.classList.remove('brute');
      btn.classList.remove('selection'); btn.classList.add('fait');
      libelle.textContent = 'Copiée';
      signaler('Adresse copiée');
      btn._minuteur = setTimeout(() => { btn.classList.remove('fait'); libelle.textContent = initial; }, 2200);
      return;
    }
    let brute = zone.querySelector(':scope > .adresse-brute');
    if (!brute) { brute = el('code', 'adresse-brute'); const g = zone.querySelector(':scope > .adresse-groupes'); if (g) g.after(brute); else zone.append(brute); }
    brute.textContent = a;
    zone.classList.add('brute');
    const r = document.createRange();
    r.selectNodeContents(brute);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
    btn.classList.remove('fait'); btn.classList.add('selection');
    libelle.textContent = 'Sélectionnée';
    signaler('Copie refusée par le navigateur : l’adresse est sélectionnée, copiez-la avec Ctrl+C', 4200);
    const depuis = Date.now();
    const finir = () => { zone.classList.remove('brute'); btn.classList.remove('selection'); libelle.textContent = initial; document.removeEventListener('selectionchange', surveiller); };
    const surveiller = () => {
      if (Date.now() - depuis < 600) return;
      const s = window.getSelection();
      if (!s.rangeCount || !brute.contains(s.anchorNode)) finir();
    };
    document.addEventListener('selectionchange', surveiller);
    btn._minuteur = setTimeout(finir, 20000);
  }
  document.addEventListener('click', async (ev) => {
    const puce = ev.target.closest('.puce[data-copie]');
    if (!puce) return;
    const v = puce.dataset.copie, quoi = RE_ADRESSE.test(v) ? 'Adresse' : 'Empreinte';
    signaler(await ecrirePressePapiers(v) ? `${quoi} copiée` : `Copie refusée par le navigateur : la valeur complète est dans l’info-bulle (${courte(v)})`);
  });

  /* ── Carte : adresse groupée par quatre, début et fin en évidence ──────── */
  const adresseEl = $('adresse');
  const souche = adresseEl.parentElement;
  const adresseCourante = () => adresseEl.textContent.trim();
  function majAdresse() {   // app.js réécrit #adresse toutes les 5 s : les groupes ne sont refaits que si l'adresse change
    const a = adresseCourante();
    const actuel = souche.querySelector(':scope > .adresse-groupes');
    if (actuel && actuel.dataset.a === a) return;
    const neuf = vueGroupee(a);
    neuf.dataset.a = a;
    if (actuel) actuel.replaceWith(neuf); else adresseEl.after(neuf);
  }
  new MutationObserver(majAdresse).observe(adresseEl, { childList: true, characterData: true, subtree: true });
  majAdresse();
  const btnCopier = $('copier');
  btnCopier.addEventListener('click', () => copierAdresse(adresseCourante(), souche, btnCopier, btnCopier.querySelector('.copier-lib')));

  /* ── Onglets : tablist au clavier (flèches, Début, Fin), tiroir « Plus », ancre ── */
  const barre = document.querySelector('.barre');
  const plus = $('btn-autres');
  const tiroir = $('tiroir');
  const onglets = [...document.querySelectorAll('#onglets button')];
  function fermerTiroir() {
    if (!barre.classList.contains('tiroir-ouvert')) return;
    barre.classList.remove('tiroir-ouvert');
    plus.setAttribute('aria-expanded', 'false');
  }
  function majOnglets() {
    let actif = null;
    for (const b of onglets) {
      const oui = b.classList.contains('actif');
      b.setAttribute('aria-selected', String(oui));
      b.tabIndex = oui ? 0 : -1;
      if (oui) actif = b;
    }
    const dansTiroir = !!actif && tiroir.contains(actif);
    plus.classList.toggle('actif', dansTiroir);
    const nom = dansTiroir ? actif.querySelector('.lib-court').textContent : 'Plus';
    ecrire(plus.querySelector('.lib-autres'), nom);
    plus.setAttribute('aria-label', dansTiroir ? `${nom}, section ouverte : autres sections` : 'Plus : Réseau, Blocs, Nœud, Assistant');
  }
  plus.addEventListener('click', () => {
    const ouvert = !barre.classList.contains('tiroir-ouvert');
    barre.classList.toggle('tiroir-ouvert', ouvert);
    plus.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) { toast.hidden = true; (tiroir.querySelector('button.actif') || tiroir.querySelector('button')).focus(); }
  });
  document.addEventListener('click', (ev) => { if (!barre.contains(ev.target)) fermerTiroir(); });
  onglets.forEach((b) => b.addEventListener('click', () => {   // app.js a déjà basculé .actif (son écouteur passe avant)
    const etaitDansTiroir = barre.classList.contains('tiroir-ouvert') && tiroir.contains(b);
    fermerTiroir();
    majOnglets();
    if (etaitDansTiroir) plus.focus({ preventScroll: true });
    const vue = b.dataset.vue;
    if (!(vue === 'compte' && location.hash.startsWith('#compte='))) {
      try { history.replaceState(null, '', `#${vue}`); } catch { /* sans importance */ }
    }
    window.scrollTo(0, 0);
  }));
  $('onglets').addEventListener('keydown', (ev) => {
    const i = onglets.indexOf(ev.target);
    if (i < 0) return;
    const n = onglets.length;
    const j = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[ev.key];
    if (j == null) return;
    ev.preventDefault();
    const cible = onglets[j];
    cible.click();
    if (visible(cible)) cible.focus(); else plus.focus();   // téléphone : section rangée sous « Plus »
  });
  majOnglets();
  window.addEventListener('hashchange', () => {   // retour arrière et liens #vue : app.js ne lit l'ancre qu'au chargement
    const [onglet, valeur] = decodeURIComponent(location.hash.slice(1)).split('=');
    const b = document.querySelector(`#onglets button[data-vue="${CSS.escape(onglet || '')}"]`);
    if (b && !b.classList.contains('actif')) b.click();
    const saisieA = $('saisie-adresse');
    if (onglet === 'compte' && valeur && saisieA.value !== valeur) { saisieA.value = valeur; $('form-compte').requestSubmit(); }
  });
  /* raccourcis de l'accueil vers les sections rangées sous « Plus » */
  for (const r of document.querySelectorAll('[data-aller]')) {
    r.addEventListener('click', () => {
      const b = document.querySelector(`#onglets button[data-vue="${CSS.escape(r.dataset.aller)}"]`);
      if (!b) return;
      b.click();
      const titre = document.querySelector(`#vue-${r.dataset.aller} .titre-vue`);
      if (titre) { titre.tabIndex = -1; titre.focus({ preventScroll: true }); }
    });
  }

  /* hauteur de l'en-tête : la feuille d'action s'arrête dessous, la mention d'essai reste lisible */
  const haut = $('haut');
  new ResizeObserver(() => racine.style.setProperty('--haut-h', `${Math.ceil(haut.getBoundingClientRect().height)}px`)).observe(haut);

  /* ── État : mots à côté du voyant, âge du dernier bloc, provenance du solde ── */
  const puceEtat = document.querySelector('.reseau');
  const pied = document.querySelector('.etat');
  const ageEnTete = $('poche-age');
  const agePied = el('span', 'etat-age');
  pied.insertBefore(agePied, pied.querySelector('.etat-essai'));
  const MOTS = { ok: 'À jour', attente: 'Synchronisation', ko: 'Nœud injoignable', inconnu: 'Connexion…' };
  function dateDuBloc() {
    const t = document.querySelector('#blocs .bloc .bloc-tete .vide, #apercu-blocs .bloc .bloc-tete .vide');
    const m = t && /(\d{2})\/(\d{2})\/(\d{4})\D+(\d{2}):(\d{2}):(\d{2})/.exec(t.textContent);
    return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) : null;
  }
  function duree(ms) {
    const min = Math.max(0, Math.round(ms / 60000));
    if (min < 1) return 'moins d’une minute';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h ${String(min % 60).padStart(2, '0')} min`;
    return `${Math.floor(h / 24)} j ${h % 24} h`;
  }
  function majEtat() {
    const c = $('pastille-synchro').className;
    const etat = /\bko\b/.test(c) ? 'ko' : /\bok\b/.test(c) ? 'ok' : /\battente\b/.test(c) ? 'attente' : 'inconnu';
    if (puceEtat.dataset.etat !== etat) puceEtat.dataset.etat = etat;
    if (etat === 'ko' && $('pastille-reseau').className !== 'pastille ko') $('pastille-reseau').className = 'pastille ko';   // app.js ne passe que la pastille du pied en panne
    const h = ($('etat-hauteur').textContent.match(/\d+/) || [])[0];
    ecrire($('poche-etat'), h && etat !== 'ko' ? `${MOTS[etat]}, bloc ${h}` : MOTS[etat]);
    const d = dateDuBloc();
    const age = d ? `dernier bloc il y a ${duree(Date.now() - d)}` : '';
    ecrire(ageEnTete, age);
    ecrire(agePied, age);
    puceEtat.title = `${MOTS[etat]}${h ? `, hauteur ${h}` : ''}${age ? `, ${age}` : ''}`;
    ecrire($('p-provenance'), h && etat !== 'ko' ? `Lu sur la chaîne de ce nœud, à la hauteur ${h}.` : '');
    const pairs = $('etat-pairs');
    if (/^0\/0 pair/.test(pairs.textContent) && /producteur/.test($('etat-role').textContent)) ecrire(pairs, 'aucun pair requis (producteur)');
  }
  new MutationObserver(majEtat).observe(pied, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ── Tableaux : libellés pour l'affichage en fiches, colonnes numériques ─ */
  function raccourcir(cellule) {
    if (cellule.children.length) return;
    const v = cellule.textContent.trim();
    const estAdresse = RE_ADRESSE.test(v);
    if (!estAdresse && !RE_EMPREINTE.test(v)) return;
    const b = bouton(courte(v), 'puce');
    b.title = v;
    b.dataset.copie = v;
    b.setAttribute('aria-label', `${estAdresse ? 'Adresse' : 'Empreinte'} ${courte(v)}, copier en entier`);
    cellule.replaceChildren(b);
  }
  function passeTableaux(zone) {
    for (const t of zone.querySelectorAll('table')) {
      const ths = t.tHead ? [...t.tHead.rows[0].cells] : [];
      if (!t.classList.contains('cartes') && ths.length >= 4) t.classList.add('cartes');
      const corps = t.tBodies[0];
      if (!corps) continue;
      for (const tr of corps.rows) {
        [...tr.cells].forEach((td, i) => {
          if (ths[i] && !td.dataset.l) td.dataset.l = ths[i].textContent;
          if (!td.children.length && td.firstChild && !td.textContent.trim()) td.replaceChildren();   // cellule vide : :empty la masque en fiche
          const montant = td.querySelector(':scope > .plus, :scope > .moins');
          if (montant && !td.classList.contains('montant')) {
            td.classList.add('num', 'montant');
            if (montant.textContent.startsWith('-')) montant.textContent = `−${montant.textContent.slice(1)}`;
          }
          raccourcir(td);
        });
      }
      const premiere = corps.rows[0];
      ths.forEach((th, i) => { if (premiere && premiere.cells[i] && premiere.cells[i].classList.contains('num')) th.classList.add('num'); });
    }
    for (const dd of zone.querySelectorAll('.cv dd')) raccourcir(dd);
  }

  /* solde après chaque opération, seulement si l'historique explique tout le solde (sinon rien n'est inventé) */
  function soldesApres() {
    const t = $('historique').querySelector('table');
    if (!t || !t.tBodies[0] || t.querySelector('.apres')) return;
    const solde = lireNombre($('solde').textContent);
    if (solde == null) return;
    const lignes = [...t.tBodies[0].rows];
    const deltas = lignes.map((tr) => { const s = tr.querySelector('.plus, .moins'); return s ? lireNombre(s.textContent) : null; });
    if (!deltas.length || deltas.some((d) => d == null) || deltas.reduce((a, b) => a + b, 0) !== solde) return;
    let courant = solde;
    lignes.forEach((tr, i) => {
      const td = tr.querySelector('td.montant');
      if (td) td.append(el('span', 'apres', `solde ${fr.format(courant)}`));
      courant -= deltas[i];
    });
  }

  /* ── Blocs : clavier, aria-expanded, état conservé entre deux rendus ───── */
  const etatsBlocs = new Map();
  let cibleH = null;
  let teteFocus = null;
  function passeBlocs() {
    for (const conteneur of [$('blocs'), $('apercu-blocs')]) {
      for (const b of conteneur.querySelectorAll('.bloc[data-h]')) {
        const tete = b.querySelector('.bloc-tete'), det = b.querySelector('.bloc-detail');
        if (!tete || !det) continue;
        const cle = `${conteneur.id}:${b.dataset.h}`;
        if (!tete.hasAttribute('role')) {
          if (etatsBlocs.has(cle)) det.hidden = !etatsBlocs.get(cle);
          if (conteneur.id === 'blocs' && cibleH === b.dataset.h) b.classList.add('cible');
          det.id = `detail-${cle.replace(':', '-')}`;
          tete.setAttribute('role', 'button');
          tete.tabIndex = 0;
          tete.setAttribute('aria-controls', det.id);
          tete.dataset.cle = cle;
        }
        tete.setAttribute('aria-expanded', String(!det.hidden));
      }
    }
    if (teteFocus && (document.activeElement === document.body || !document.activeElement)) {
      const t = document.querySelector(`.bloc-tete[data-cle="${CSS.escape(teteFocus)}"]`);
      if (t) t.focus({ preventScroll: true });
    }
  }
  document.addEventListener('click', (ev) => {
    const tete = ev.target.closest('.bloc-tete');
    if (!tete || !tete.dataset.cle) return;
    const det = tete.parentElement.querySelector('.bloc-detail');
    etatsBlocs.set(tete.dataset.cle, !det.hidden);
    tete.setAttribute('aria-expanded', String(!det.hidden));
  });
  document.addEventListener('keydown', (ev) => {
    const tete = ev.target.closest && ev.target.closest('.bloc-tete');
    if (tete && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); tete.click(); }
  });
  document.addEventListener('focusin', (ev) => { teteFocus = ev.target.classList && ev.target.classList.contains('bloc-tete') ? ev.target.dataset.cle : null; });

  /* ── Ruban : reste calé sur le dernier bloc ; fondu et bouton quand des blocs sont cachés à gauche ── */
  const ruban = $('ruban-apercu');
  const cadreRuban = $('ruban-cadre');
  const precedents = $('ruban-prec');
  let rubanAuBout = true;
  function majRuban() {
    const cache = ruban.scrollLeft > 4;
    cadreRuban.classList.toggle('cache-debut', cache);
    precedents.hidden = !cache;
  }
  ruban.addEventListener('scroll', () => { rubanAuBout = ruban.scrollLeft + ruban.clientWidth >= ruban.scrollWidth - 4; majRuban(); }, { passive: true });
  new ResizeObserver(() => { if (rubanAuBout) ruban.scrollLeft = ruban.scrollWidth; majRuban(); }).observe(ruban);
  precedents.addEventListener('click', () => ruban.scrollBy({ left: -Math.max(160, ruban.clientWidth * 0.8), behavior: 'smooth' }));
  ruban.addEventListener('click', () => {   // app.js vient d'ouvrir le bloc visé : on retient la cible
    const c = document.querySelector('#blocs .bloc.cible');
    if (!c) return;
    cibleH = c.dataset.h;
    etatsBlocs.set(`blocs:${cibleH}`, true);
    passeBlocs();
  });

  /* ── Époque : frise lue dans le DOM d'app.js (aucun appel réseau), clôture en UTC et en heure locale ── */
  const zoneEpoque = $('p-epoque');
  const fmtUTC = (d, o) => d.toLocaleString('fr-FR', { ...o, timeZone: 'UTC' });
  const fmtLoc = (d, o) => d.toLocaleString('fr-FR', o);
  function lireEpoque() {
    const z = $('epoque');
    const dt = [...z.querySelectorAll('dl dt')].find((x) => x.textContent.trim() === 'Fenêtre');
    if (!dt || !dt.nextElementSibling) return null;
    const ds = [...dt.nextElementSibling.textContent.matchAll(/(\d{2})\/(\d{2})\/(\d{4})\D+(\d{1,2}):(\d{2}):(\d{2})/g)]
      .map((m) => new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]));
    if (ds.length !== 2 || !(ds[1] > ds[0])) return null;
    const scores = [];
    const t = z.querySelector('table');
    if (t && t.tBodies[0]) {
      for (const tr of t.tBodies[0].rows) {
        const c = [...tr.cells].map((x) => x.textContent.trim());
        if (c.length >= 2 && lireNombre(c[1]) != null) scores.push({ nom: c[0], points: lireNombre(c[1]), part: c[2] || '' });
      }
    }
    return { debut: ds[0], fin: ds[1], scores };
  }
  function dessinerEpoque() {
    const e = lireEpoque();
    if (!e) { zoneEpoque.hidden = true; return; }
    zoneEpoque.hidden = false;
    const total = e.fin - e.debut, maintenant = Date.now();
    const part = Math.min(1, Math.max(0, (maintenant - e.debut) / total));
    $('p-frise-plein').style.width = `${(part * 100).toFixed(2)}%`;
    $('p-frise-aiguille').style.left = `${(part * 100).toFixed(2)}%`;
    const frise = $('p-frise');
    frise.setAttribute('aria-valuenow', String(Math.round(part * 100)));
    frise.setAttribute('aria-valuetext', `${Math.round(part * 100)} % de l’époque écoulés`);
    /* jours calendaires locaux, de minuit à minuit : le jour mis en gras est bien aujourd'hui */
    const jours = $('p-frise-jours');
    const cle = `${+e.debut}:${+e.fin}`;
    if (jours.dataset.cle !== cle) {
      jours.dataset.cle = cle;
      const segs = [];
      for (let a = e.debut; a < e.fin;) {
        const minuit = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
        const b = minuit < e.fin ? minuit : e.fin;
        segs.push([a, b]);
        a = b;
      }
      jours.replaceChildren(...segs.map(([a, b]) => {
        const li = el('li', null, fmtLoc(a, { weekday: 'short' }).replace('.', ''));
        li.style.width = `${((b - a) / total) * 100}%`;
        li.dataset.a = String(+a); li.dataset.b = String(+b);
        li.title = fmtLoc(a, { weekday: 'long', day: 'numeric', month: 'long' });
        return li;
      }));
    }
    for (const li of jours.children) {
      li.classList.toggle('aujourdhui', maintenant >= +li.dataset.a && maintenant < +li.dataset.b);
      li.classList.toggle('etroit', li.getBoundingClientRect().width < 30);
    }
    const hUTC = fmtUTC(e.fin, { hour: '2-digit', minute: '2-digit' });
    const hLoc = fmtLoc(e.fin, { hour: '2-digit', minute: '2-digit' });
    const jourUTC = fmtUTC(e.fin, { weekday: 'long', day: 'numeric', month: 'long' });
    const jourLoc = fmtLoc(e.fin, { weekday: 'long', day: 'numeric', month: 'long' });
    const local = hUTC === hLoc && jourUTC === jourLoc ? '' : `, soit ${hLoc} heure locale${jourLoc !== jourUTC ? ` (${jourLoc})` : ''}`;
    const reste = e.fin - maintenant;
    const cloture = $('p-epoque-cloture');
    const ligne1 = `Clôture le ${jourUTC} à ${hUTC} UTC${local}`;
    const ligne2 = `Ouverte le ${fmtUTC(e.debut, { weekday: 'long', day: 'numeric', month: 'long' })} à ${fmtUTC(e.debut, { hour: '2-digit', minute: '2-digit' })} UTC · ${reste > 0 ? `clôture dans ${duree(reste)}` : 'terminée : la clôture s’inscrit au prochain passage du producteur'}`;
    if (cloture.dataset.s !== `${ligne1}|${ligne2}`) {
      cloture.dataset.s = `${ligne1}|${ligne2}`;
      cloture.replaceChildren(ligne1, el('span', 'reste', ligne2));
    }
    ecrire($('p-heure-locale'), hUTC === hLoc ? '' : `, soit ${hLoc} heure locale cette semaine`);
    const zp = $('p-points-zone');
    zp.hidden = !e.scores.length;
    if (e.scores.length) {
      const max = Math.max(1, ...e.scores.map((s) => s.points));
      const signature = JSON.stringify(e.scores);
      const liste = $('p-points');
      if (liste.dataset.s !== signature) {
        liste.dataset.s = signature;
        liste.replaceChildren(...[...e.scores].sort((a, b) => b.points - a.points).map((s) => {
          const li = el('li'), jauge = el('span', 'jauge'), rempli = el('span');
          rempli.style.width = `${(s.points / max) * 100}%`;
          jauge.append(rempli);
          li.append(el('span', 'nom', s.nom), jauge, el('span', 'n', `${fr.format(s.points)} pts${s.part ? ` · part ${s.part}` : ''}`));
          return li;
        }));
      }
    }
  }
  new ResizeObserver(() => { for (const li of $('p-frise-jours').children) li.classList.toggle('etroit', li.getBoundingClientRect().width < 30); }).observe($('p-frise'));

  /* ── Passe générale après chaque rendu d'app.js ────────────────────────── */
  const zone = document.querySelector('main');
  let prevue = false;
  function passe() {
    prevue = false;
    passeTableaux(zone);
    soldesApres();
    passeBlocs();
    majEtat();
    dessinerEpoque();
    observateur.takeRecords();
  }
  const observateur = new MutationObserver(() => { if (!prevue) { prevue = true; queueMicrotask(passe); } });
  observateur.observe(zone, { childList: true, subtree: true });
  passe();
  setInterval(() => { majEtat(); dessinerEpoque(); }, 30000);

  /* ── Feuille d'action : ouverture, fermeture, focus gardé dedans ───────── */
  const formulaire = $('formulaire');
  const voile = el('div', 'voile');
  voile.hidden = true;
  formulaire.before(voile);
  formulaire.setAttribute('role', 'dialog');
  formulaire.setAttribute('aria-modal', 'true');
  formulaire.setAttribute('aria-labelledby', 'feuille-titre');
  let ouvreur = null;
  function fermerFeuille() {
    if (formulaire.hidden) return;
    const fermer = [...formulaire.querySelectorAll('button')].find((b) => /^(Annuler|Fermer)$/.test(b.textContent.trim()) && !b.closest('[hidden]'));
    if (fermer) fermer.click(); else formulaire.hidden = true;
  }
  voile.addEventListener('click', fermerFeuille);
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (barre.classList.contains('tiroir-ouvert')) { fermerTiroir(); plus.focus(); return; }
    fermerFeuille();
  });
  document.addEventListener('focusin', (ev) => {   // tant que la feuille est ouverte, le focus reste dedans
    if (formulaire.hidden || formulaire.contains(ev.target)) return;
    const premier = formulaire.querySelector('#feuille-titre') || formulaire.querySelector('button');
    if (premier) premier.focus({ preventScroll: true });
  });
  new MutationObserver(() => {
    const ouvert = !formulaire.hidden;
    voile.hidden = !ouvert;
    document.body.classList.toggle('feuille-ouverte', ouvert);
    if (!ouvert && ouvreur && document.contains(ouvreur)) { ouvreur.focus({ preventScroll: true }); ouvreur = null; }
  }).observe(formulaire, { attributes: true, attributeFilter: ['hidden'] });

  function entete(titre, etapes) {
    const h = el('h2', 'feuille-titre', titre);
    h.id = 'feuille-titre';
    h.tabIndex = -1;
    const mention = el('p', 'mention-feuille', MENTION);
    const ol = el('ol', 'etapes');
    ol.setAttribute('aria-label', 'Étapes');
    etapes.forEach((e) => ol.append(el('li', null, e)));
    return { h, mention, ol };
  }
  function marquerEtape(ol, n) {
    [...ol.children].forEach((li, i) => {
      li.classList.toggle('faite', i < n - 1);
      if (i === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  /* Dépenser : 1. choisir le service, 2. vérifier le récapitulatif puis signer (bouton d'app.js).
     Si le texte du service n'est pas reconnu, « Signer » n'apparaît pas : aucune signature sans « Solde après ». */
  function parcoursDepense() {
    const f = formulaire;
    const sel = f.querySelector('select');
    const actionsApp = f.querySelector(':scope > .actions');
    if (!sel || !actionsApp || f.dataset.parcours === 'depense') return;
    f.dataset.parcours = 'depense';
    const lab = f.querySelector(':scope > label');
    const rep = f.querySelector(':scope > .repartition');
    sel.id = 'choix-service';
    if (lab) lab.htmlFor = 'choix-service';
    const leg = f.querySelector(':scope > .legende');
    const signer = actionsApp.querySelector('button.primaire');
    const { h, mention, ol } = entete('Dépenser des unités d’essai', ['Choisir le service', 'Vérifier et signer']);
    const recap = el('dl', 'cv recap');
    const indispo = el('p', 'indispo', 'Récapitulatif indisponible : vérifiez le service. La signature n’est pas proposée sans le solde après dépense.');
    const rappel = el('p', 'rappel', 'La signature utilise la clé gardée sur cette machine. Unités d’essai sans valeur : rien n’est payé ni vendu.');
    const suite = el('div', 'actions');
    const annulerApp = [...actionsApp.querySelectorAll('button')].find((b) => b !== signer);
    suite.append(bouton('Continuer', 'primaire', () => aller(2)), bouton('Annuler', null, () => annulerApp && annulerApp.click()));
    const retour = bouton('Retour', null, () => aller(1));
    actionsApp.append(retour);
    f.prepend(h, mention, ol);
    actionsApp.before(recap, indispo, rappel, suite);
    function remplir() {
      const opt = sel.selectedOptions[0];
      const m = opt && /^(.*) — (\d+) unités \(nœud (.+)\)$/.exec(opt.textContent);
      const solde = lireNombre($('solde').textContent);
      if (!m || solde == null) return false;
      const prix = +m[2], d = Math.floor(prix * 20 / 100);
      const lignes = [['Service', m[1]], ['Nœud qui sert', m[3]], ['Prix', `${fr.format(prix)} unités d’essai`, 'chiffre'],
        ['Détruites (20 %)', fr.format(d), 'chiffre detruit'], ['Le reste (80 %)', leg && leg.children[1] ? leg.children[1].textContent : fr.format(prix - d), 'chiffre'],
        ['Solde après', `${fr.format(solde - prix)} unités d’essai`, solde - prix < 0 ? 'total alerte' : 'total']];
      recap.replaceChildren(...lignes.flatMap(([k, v, cls]) => {
        const dt = el('dt', null, k), dd = el('dd', null, v);
        if (cls && /total/.test(cls)) { const w = el('div', cls); w.append(dt, dd); return [w]; }
        if (cls) dd.className = cls;
        return [dt, dd];
      }));
      if (solde - prix < 0) recap.append(el('p', 'note', 'Solde insuffisant : le nœud refusera cette dépense.'));
      return true;
    }
    function aller(n) {
      marquerEtape(ol, n);
      const un = n === 1;
      [lab, sel, rep, leg].forEach((x) => { if (x) x.hidden = !un; });
      suite.hidden = !un;
      const pret = !un && remplir();
      recap.hidden = un || !pret;
      indispo.hidden = un || pret;
      rappel.hidden = un;
      actionsApp.hidden = un;
      if (signer) signer.hidden = !pret;
      h.focus({ preventScroll: true });   // jamais sur « Signer » : une touche Entrée ne doit pas signer par mégarde
    }
    aller(1);
  }

  /* Recevoir : 1. comprendre ce qui peut arriver puis montrer l'adresse (QR, groupes, copie), 2. suivre l'arrivée */
  function parcoursRecevoir() {
    const f = formulaire;
    const code = f.querySelector(':scope > code');
    const a = code ? code.textContent.trim() : '';
    if (!RE_ADRESSE.test(a) || f.dataset.parcours === 'recevoir') return;
    f.dataset.parcours = 'recevoir';
    const pApp = [...f.querySelectorAll(':scope > p')];
    const actionsApp = f.querySelector(':scope > .actions');
    const fermerApp = actionsApp && actionsApp.querySelector('button');
    pApp.filter((p) => !p.classList.contains('note')).forEach((p) => { p.hidden = true; });
    code.hidden = true;
    const noteApp = pApp.find((p) => p.classList.contains('note'));
    const { h, mention, ol } = entete('Recevoir des unités d’essai', ['Montrer l’adresse', 'Suivre l’arrivée']);
    const un = el('div', 'etape-montrer');
    if (noteApp) { noteApp.classList.add('rappel', 'rappel-neutre'); un.append(noteApp); }   // avant le QR : on sait ce qui peut arriver
    const cadre = el('div', 'qr-cadre');
    try { cadre.append(window.VisionQR.svg(a, `QR code de l’adresse ${courte(a)}`)); } catch { cadre.hidden = true; }
    const legende = el('p', 'qr-legende', 'Le QR contient seulement l’adresse publique. Aucun envoi entre comptes pendant l’essai.');
    const groupesG = vueGroupee(a, 'claire grande');
    const copierG = bouton('Copier l’adresse', 'copier-grand');
    copierG.addEventListener('click', () => copierAdresse(a, un, copierG));
    const suite = el('div', 'actions');
    suite.append(bouton('Continuer', 'primaire', () => aller(2)), bouton('Fermer', null, () => fermerApp && fermerApp.click()));
    un.append(cadre, legende, groupesG, copierG, suite);
    const deux = el('div', 'etape-suivre');
    const explication = el('p', null, 'Les unités créditées (forfait d’essai pour un compte, partage de puissance pour un nœud) apparaissent d’abord dans « En attente d’un bloc », puis dans l’historique dès que le bloc est scellé.');
    const voir = bouton('Voir l’historique', 'primaire', () => {
      ouvreur = null;   // le focus va à l'historique, pas au bouton « Recevoir »
      if (fermerApp) fermerApp.click();
      const p = $('panneau-historique');
      p.scrollIntoView({ block: 'start' });
      p.focus({ preventScroll: true });
    });
    const retour = bouton('Retour', null, () => aller(1));
    deux.append(explication);
    if (actionsApp) { actionsApp.prepend(voir); actionsApp.append(retour); deux.append(actionsApp); }
    f.prepend(h, mention, ol);
    f.append(un, deux);
    function aller(n) {
      marquerEtape(ol, n);
      un.hidden = n !== 1;
      deux.hidden = n !== 2;
      (n === 1 ? copierG : voir).focus({ preventScroll: true });
    }
    aller(1);
    h.focus({ preventScroll: true });
  }

  /* Forfait d'essai : rien n'est vendu ni encaissé ; prix d'étude affichés comme tels */
  function parcoursForfait() {
    const f = formulaire;
    if (f.dataset.parcours === 'forfait') return;
    f.dataset.parcours = 'forfait';
    const { h, mention } = entete('Forfait d’essai', []);
    const rappel = el('p', 'rappel', 'Essai : rien n’est vendu ni encaissé. Les prix sont des prix d’étude, non décidés ; le forfait crédite seulement des unités d’usage sans valeur, non cessibles.');
    f.prepend(h, mention, rappel);
    for (const p of f.querySelectorAll('.forfait .prix')) if (!p.nextElementSibling || !p.nextElementSibling.classList.contains('etude')) p.after(el('span', 'etude', 'prix d’étude, rien encaissé'));
    const ok = f.querySelector(':scope > .actions button.primaire');
    if (ok) ok.textContent = 'Enregistrer ce forfait d’essai';
    const lab = f.querySelector(':scope > label');
    if (lab) lab.textContent = 'Choisissez un forfait d’essai';
    const coche = f.querySelector('input[name=offre]:checked') || f.querySelector('input[name=offre]');
    (coche || h).focus({ preventScroll: true });
  }

  const PARCOURS = { 'btn-depenser': parcoursDepense, 'btn-recevoir': parcoursRecevoir, 'btn-acheter': parcoursForfait };
  for (const [id, fn] of Object.entries(PARCOURS)) {
    $(id).addEventListener('click', () => {   // app.js a déjà rempli #formulaire (son écouteur passe avant)
      ouvreur = $(id);
      delete formulaire.dataset.parcours;
      fn();
    });
  }

  /* bouton de forfait désactivé : l'explication est visible, pas seulement au survol */
  const btnAcheter = $('btn-acheter');
  const noteAcheter = $('note-acheter');
  const majAcheter = () => { noteAcheter.hidden = !btnAcheter.disabled; noteAcheter.textContent = btnAcheter.disabled ? btnAcheter.title : ''; };
  new MutationObserver(majAcheter).observe(btnAcheter, { attributes: true, attributeFilter: ['disabled', 'title'] });
  majAcheter();

  /* ── Mon compte : vérification de l'adresse pendant la saisie ──────────── */
  const saisie = $('saisie-adresse');
  const aide = $('aide-adresse');
  const apercuSaisie = $('apercu-saisie');
  const AIDE = 'Commence par te1, puis 40 caractères de 0 à 9 et de a à f.';
  function verifierSaisie() {
    const v = saisie.value.trim();
    aide.className = 'aide';
    saisie.removeAttribute('aria-invalid');
    if (!v) { aide.textContent = AIDE; apercuSaisie.replaceChildren(); return; }
    if (RE_ADRESSE.test(v)) { aide.textContent = 'Adresse bien formée.'; aide.classList.add('ok'); }
    else if (!'te1'.startsWith(v.slice(0, 3)) || (v.length >= 3 && v.slice(0, 3) !== 'te1')) { aide.textContent = 'Une adresse commence par te1.'; aide.classList.add('ko'); saisie.setAttribute('aria-invalid', 'true'); }
    else if (/[^0-9a-f]/.test(v.slice(3))) { aide.textContent = 'Après te1, seuls les chiffres 0 à 9 et les lettres a à f sont admis.'; aide.classList.add('ko'); saisie.setAttribute('aria-invalid', 'true'); }
    else aide.textContent = `${v.length} caractères sur 43.`;
    apercuSaisie.replaceChildren(vueGroupee(v, 'claire'));
  }
  saisie.addEventListener('input', verifierSaisie);
  $('btn-mon-adresse').addEventListener('click', verifierSaisie);
  verifierSaisie();
})();
