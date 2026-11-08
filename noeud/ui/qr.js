/* VISION · qr.js : encodeur QR Code sans dépendance (modèle 2, mode octet, correction M, versions 1 à 10).
   Sert seulement à montrer l'adresse publique du portefeuille : aucun appel réseau, rien n'est transmis.
   Vérifié module par module contre la bibliothèque Python « qrcode » (outils/verifier-qr.cjs et outils/ref-qr.py). */
(function (racine) {
  'use strict';
  const ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];   // mots de correction par bloc, niveau M
  const BLOCS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];           // nombre de blocs, niveau M

  function modulesBruts(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  const motsDonnees = (v) => Math.floor(modulesBruts(v) / 8) - ECC_M[v] * BLOCS_M[v];

  function mul(x, y) {   // multiplication dans GF(256), polynôme 0x11D
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function diviseur(degre) {
    const r = new Array(degre).fill(0);
    r[degre - 1] = 1;
    let racineGen = 1;
    for (let i = 0; i < degre; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = mul(r[j], racineGen);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      racineGen = mul(racineGen, 0x02);
    }
    return r;
  }
  function reste(donnees, div) {
    const r = new Array(div.length).fill(0);
    for (const b of donnees) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => { r[i] ^= mul(c, f); });
    }
    return r;
  }

  const MASQUES = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0,
  ];

  function penalite(m, n) {
    let p = 0;
    for (let a = 0; a < n; a++) {
      for (const lire of [(b) => m[a][b], (b) => m[b][a]]) {
        let suite = 1;
        for (let b = 1; b <= n; b++) {
          if (b < n && lire(b) === lire(b - 1)) suite++;
          else { if (suite >= 5) p += suite - 2; suite = 1; }
        }
        for (let b = 0; b + 11 <= n; b++) {
          let s = '';
          for (let k = 0; k < 11; k++) s += lire(b + k) ? '1' : '0';
          if (s === '10111010000' || s === '00001011101') p += 40;
        }
      }
    }
    let sombres = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (m[y][x]) sombres++;
        if (y < n - 1 && x < n - 1) {
          const c = m[y][x];
          if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
        }
      }
    }
    return p + Math.floor(Math.abs(sombres * 20 - n * n * 10) / (n * n)) * 10;
  }

  function encoder(texte, masqueImpose) {
    const octets = Array.from(new TextEncoder().encode(texte));
    let v = 1;
    for (; v <= 10; v++) if (4 + (v < 10 ? 8 : 16) + octets.length * 8 <= motsDonnees(v) * 8) break;
    if (v > 10) throw new Error('texte trop long pour ce QR');

    const bits = [];
    const pousser = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    pousser(0b0100, 4);
    pousser(octets.length, v < 10 ? 8 : 16);
    octets.forEach((o) => pousser(o, 8));
    const capacite = motsDonnees(v) * 8;
    pousser(0, Math.min(4, capacite - bits.length));
    pousser(0, (8 - (bits.length % 8)) % 8);
    for (let rembourrage = 0xec; bits.length < capacite; rembourrage ^= 0xec ^ 0x11) pousser(rembourrage, 8);
    const donnees = [];
    for (let i = 0; i < bits.length; i += 8) donnees.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

    const nb = BLOCS_M[v], lgEcc = ECC_M[v], brut = Math.floor(modulesBruts(v) / 8);
    const courts = nb - (brut % nb), lgCourt = Math.floor(brut / nb);
    const div = diviseur(lgEcc), blocs = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = donnees.slice(k, k + lgCourt - lgEcc + (i < courts ? 0 : 1));
      k += dat.length;
      const ecc = reste(dat, div);
      if (i < courts) dat.push(0);
      blocs.push(dat.concat(ecc));
    }
    const mots = [];
    for (let i = 0; i < blocs[0].length; i++) {
      blocs.forEach((b, j) => { if (i !== lgCourt - lgEcc || j >= courts) mots.push(b[i]); });
    }

    const n = v * 4 + 17;
    const mod = Array.from({ length: n }, () => new Array(n).fill(false));
    const fonc = Array.from({ length: n }, () => new Array(n).fill(false));
    const poser = (x, y, d) => { mod[y][x] = d; fonc[y][x] = true; };

    for (let i = 0; i < n; i++) { poser(6, i, i % 2 === 0); poser(i, 6, i % 2 === 0); }
    const repere = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x >= n || y < 0 || y >= n) continue;
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          poser(x, y, dist !== 2 && dist !== 4);
        }
      }
    };
    repere(3, 3); repere(n - 4, 3); repere(3, n - 4);
    if (v > 1) {
      const na = Math.floor(v / 7) + 2;
      const pas = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2;
      const pos = [6];
      for (let p = n - 7; pos.length < na; p -= pas) pos.splice(1, 0, p);
      pos.forEach((x, i) => pos.forEach((y, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) poser(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }));
    }
    const format = (masque) => {   // niveau M = 00
      const d = masque;
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      const bit = (i) => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) poser(8, i, bit(i));
      poser(8, 7, bit(6)); poser(8, 8, bit(7)); poser(7, 8, bit(8));
      for (let i = 9; i < 15; i++) poser(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) poser(n - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) poser(8, n - 15 + i, bit(i));
      poser(8, n - 8, true);
    };
    format(0);
    if (v >= 7) {
      let r = v;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) {
        const d = ((b >>> i) & 1) === 1, a = n - 11 + (i % 3), c = Math.floor(i / 3);
        poser(a, c, d); poser(c, a, d);
      }
    }

    let i = 0;
    for (let droite = n - 1; droite >= 1; droite -= 2) {
      if (droite === 6) droite = 5;
      for (let vert = 0; vert < n; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = droite - j, monte = ((droite + 1) & 2) === 0, y = monte ? n - 1 - vert : vert;
          if (!fonc[y][x] && i < mots.length * 8) { mod[y][x] = ((mots[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
        }
      }
    }

    const appliquer = (m) => {
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fonc[y][x] && MASQUES[m](x, y)) mod[y][x] = !mod[y][x];
    };
    let masque = masqueImpose;
    if (masque == null) {
      let min = Infinity;
      for (let m = 0; m < 8; m++) {
        appliquer(m); format(m);
        const p = penalite(mod, n);
        if (p < min) { min = p; masque = m; }
        appliquer(m);
      }
    }
    appliquer(masque); format(masque);
    return { version: v, taille: n, masque, modules: mod };
  }

  function svg(texte, titre) {
    const q = encoder(texte), marge = 4, t = q.taille + marge * 2, NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', `0 0 ${t} ${t}`);
    s.setAttribute('shape-rendering', 'crispEdges');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', titre || 'QR code');
    const fond = document.createElementNS(NS, 'rect');
    fond.setAttribute('width', String(t)); fond.setAttribute('height', String(t)); fond.setAttribute('fill', '#ffffff');
    let d = '';
    q.modules.forEach((ligne, y) => ligne.forEach((sombre, x) => { if (sombre) d += `M${x + marge} ${y + marge}h1v1h-1z`; }));
    const chemin = document.createElementNS(NS, 'path');
    chemin.setAttribute('d', d); chemin.setAttribute('fill', '#0d1526');
    s.append(fond, chemin);
    return s;
  }

  const api = { encoder, svg };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else racine.VisionQR = api;
})(typeof window !== 'undefined' ? window : globalThis);
