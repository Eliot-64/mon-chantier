/* ==========================================================================
   MON CHANTIER — moteur de traces
   Chaque fluo a un "mode" : sa façon de laisser une trace sur le papier.
   Les tracés sont déterministes (pas de hasard pur) pour pouvoir être redessinés
   à l'identique après un "Annuler".
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});

  /* ---------- couleurs ---------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function toHex(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
  function mix(h1, h2, t) {
    var a = hexToRgb(h1), b = hexToRgb(h2);
    return '#' + toHex(a[0] + (b[0] - a[0]) * t) + toHex(a[1] + (b[1] - a[1]) * t) + toHex(a[2] + (b[2] - a[2]) * t);
  }
  function tint(h, t) { return mix(h, '#ffffff', t); }
  function shade(h, t) { return mix(h, '#000000', t); }
  function hexToHue(h) {
    var c = hexToRgb(h), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, hh;
    if (d === 0) return 0;
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    return hh < 0 ? hh + 360 : hh;
  }

  /* ---------- aléatoire déterministe ---------- */
  function rnd(x, y, k) {
    var s = Math.sin(x * 12.9898 + y * 78.233 + (k || 0) * 37.719) * 43758.5453;
    return s - Math.floor(s);
  }

  /* ---------- petits outils ---------- */
  function line(ctx, a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

  /* Pose des "tampons" à intervalle régulier le long d'un segment */
  function walk(a, b, st, spacing, cb) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
    var d = st.next;
    if (len === 0) {
      if (d <= 0) { cb(a.x, a.y, st.ang || 0, st.count++); st.next = spacing; }
      return;
    }
    var ang = Math.atan2(dy, dx);
    st.ang = ang;
    while (d <= len) {
      var t = d / len;
      cb(a.x + dx * t, a.y + dy * t, ang, st.count++);
      d += spacing;
    }
    st.next = d - len;
  }

  /* Comme walk(), mais le tampon n'est dessiné qu'une fois le trait passé plus loin :
     sinon la suite du trait (le surligneur) le recouvrirait. */
  function later(a, b, st, spacing, lag, cb) {
    st.lag = Math.max(st.lag || 0, lag);
    walk(a, b, st, spacing, function (x, y, ang, i) {
      var dx = x - a.x, dy = y - a.y;
      st.q.push({ x: x, y: y, ang: ang, i: i, at: st.dist + Math.sqrt(dx * dx + dy * dy), cb: cb });
    });
  }
  function flush(ctx, st, all) {
    if (!st.q.length) return;
    var limit = st.dist - st.lag, keep = [];
    for (var k = 0; k < st.q.length; k++) {
      var it = st.q[k];
      if (all || it.at <= limit) {
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        it.cb(it.x, it.y, it.ang, it.i);
        ctx.restore();
      } else keep.push(it);
    }
    st.q = keep;
  }

  function heart(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.9, y - s * 0.1, x - s * 0.45, y - s * 0.75, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.75, x + s * 0.9, y - s * 0.1, x, y + s * 0.35);
    ctx.closePath(); ctx.fill();
  }
  function star(ctx, x, y, r, rot, n) {
    n = n || 5;
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var rr = i % 2 ? r * 0.45 : r, an = rot + (i * Math.PI) / n - Math.PI / 2;
      ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  function flame(ctx, x, y, h, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.bezierCurveTo(x + r * 1.4, y - h * 0.3, x + r, y + r * 0.9, x, y + r * 0.9);
    ctx.bezierCurveTo(x - r, y + r * 0.9, x - r * 1.4, y - h * 0.3, x, y - h);
    ctx.closePath(); ctx.fill();
  }

  /* ---------- les modes ---------- */
  var M = {};

  /* ===== communs ===== */
  M.classic = function (ctx, f, a, b, st, w) {
    ctx.strokeStyle = f.hex; ctx.lineWidth = w; line(ctx, a, b);
  };

  M.chisel = function (ctx, f, a, b, st, w) {
    /* pointe biseautée : un rectangle plat incliné à 45° */
    var th = -Math.PI / 4, hx = Math.cos(th) * w * 0.55, hy = Math.sin(th) * w * 0.55;
    ctx.fillStyle = f.hex; ctx.strokeStyle = f.hex; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(a.x - hx, a.y - hy); ctx.lineTo(a.x + hx, a.y + hy);
    ctx.lineTo(b.x + hx, b.y + hy); ctx.lineTo(b.x - hx, b.y - hy);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };

  M.dashed = function (ctx, f, a, b, st, w) {
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.75;
    walk(a, b, st, w * 2.3, function (x, y, ang) {
      var c = Math.cos(ang) * w * 0.7, s = Math.sin(ang) * w * 0.7;
      line(ctx, { x: x - c, y: y - s }, { x: x + c, y: y + s });
    });
  };

  M.dotted = function (ctx, f, a, b, st, w) {
    ctx.fillStyle = f.hex;
    walk(a, b, st, w * 1.15, function (x, y) {
      ctx.beginPath(); ctx.arc(x, y, w * 0.5, 0, 6.2832); ctx.fill();
    });
  };

  M.double = function (ctx, f, a, b, st, w) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = (-dy / len) * w * 0.34, ny = (dx / len) * w * 0.34;
    if (len === 0) { nx = 0; ny = w * 0.34; }
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.32;
    line(ctx, { x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny });
    line(ctx, { x: a.x - nx, y: a.y - ny }, { x: b.x - nx, y: b.y - ny });
  };

  M.wavy = function (ctx, f, a, b, st, w) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.5;
    if (len === 0) { ctx.fillStyle = f.hex; ctx.beginPath(); ctx.arc(a.x, a.y, w * 0.3, 0, 6.2832); ctx.fill(); return; }
    var nx = -dy / len, ny = dx / len, step = 2;
    var prev = st.p || { x: a.x, y: a.y + 0 };
    for (var s = step; s <= len + 0.001; s += step) {
      var d = st.dist + s, o = Math.sin(d / (w * 0.7)) * w * 0.5;
      var px = a.x + (dx / len) * s + nx * o, py = a.y + (dy / len) * s + ny * o;
      line(ctx, prev, { x: px, y: py });
      prev = { x: px, y: py };
    }
    st.p = prev;
  };

  M.zigzag = function (ctx, f, a, b, st, w) {
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.38;
    walk(a, b, st, w * 0.75, function (x, y, ang, i) {
      var sg = i % 2 ? 1 : -1;
      var p = { x: x + -Math.sin(ang) * sg * w * 0.5, y: y + Math.cos(ang) * sg * w * 0.5 };
      if (st.p) line(ctx, st.p, p);
      st.p = p;
    });
  };

  M.pixel = function (ctx, f, a, b, st, w) {
    var s = Math.max(4, Math.round(w * 0.55));
    walk(a, b, st, s * 0.7, function (x, y, ang, i) {
      var gx = Math.round(x / s) * s, gy = Math.round(y / s) * s;
      ctx.fillStyle = i % 3 === 0 ? tint(f.hex, 0.3) : f.hex;
      ctx.fillRect(gx - s, gy - s, s * 1.6, s * 1.6);
    });
  };

  /* ===== rares ===== */
  M.glow = function (ctx, f, a, b, st, w) {
    ctx.shadowColor = f.hex; ctx.shadowBlur = w * 0.9;
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.7; line(ctx, a, b);
  };

  M.neon = function (ctx, f, a, b, st, w) {
    ctx.shadowColor = f.hex; ctx.shadowBlur = w * 0.7;
    ctx.strokeStyle = tint(f.hex, 0.55); ctx.lineWidth = w; line(ctx, a, b);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.38; line(ctx, a, b);
  };

  M.sparkle = function (ctx, f, a, b, st, w) {
    ctx.strokeStyle = tint(f.hex, 0.45); ctx.lineWidth = w * 0.55; line(ctx, a, b);
    walk(a, b, st, w * 0.8, function (x, y, ang, i) {
      var r = w * (0.28 + 0.4 * rnd(x, y, i)), ox = (rnd(x, y, 3) - 0.5) * w * 0.6, oy = (rnd(x, y, 5) - 0.5) * w * 0.6;
      ctx.fillStyle = shade(f.hex, 0.15);
      star(ctx, x + ox, y + oy, r, rnd(x, y, 7), 4);
    });
  };

  M.rainbow = function (ctx, f, a, b, st, w) {
    var h = (hexToHue(f.hex) + st.dist * 1.1) % 360;
    ctx.strokeStyle = 'hsl(' + h.toFixed(0) + ',100%,55%)'; ctx.lineWidth = w; line(ctx, a, b);
  };

  M.bubbles = function (ctx, f, a, b, st, w) {
    walk(a, b, st, w * 0.65, function (x, y, ang, i) {
      var r = w * (0.22 + 0.3 * rnd(x, y, i)), o = (rnd(x, y, 2) - 0.5) * w * 0.5;
      var px = x + -Math.sin(ang) * o, py = y + Math.cos(ang) * o;
      ctx.fillStyle = tint(f.hex, 0.45); ctx.strokeStyle = f.hex; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill(); ctx.stroke();
    });
  };

  M.hatch = function (ctx, f, a, b, st, w) {
    ctx.strokeStyle = tint(f.hex, 0.55); ctx.lineWidth = w * 0.4; line(ctx, a, b);
    ctx.strokeStyle = f.hex; ctx.lineWidth = 2.6;
    walk(a, b, st, w * 0.5, function (x, y, ang) {
      var nx = -Math.sin(ang) * w * 0.55, ny = Math.cos(ang) * w * 0.55;
      line(ctx, { x: x - nx, y: y - ny }, { x: x + nx, y: y + ny });
    });
  };

  M.spray = function (ctx, f, a, b, st, w) {
    var len = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
    var n = Math.max(3, Math.round(len * w * 0.1));
    ctx.fillStyle = f.hex;
    for (var k = 0; k < n; k++) {
      var t = rnd(a.x, a.y, k), an = rnd(b.x, b.y, k + 11) * 6.2832, rad = Math.sqrt(rnd(a.x + k, b.y, 4)) * w * 0.62;
      var px = a.x + (b.x - a.x) * t + Math.cos(an) * rad, py = a.y + (b.y - a.y) * t + Math.sin(an) * rad;
      ctx.beginPath(); ctx.arc(px, py, 0.8 + rnd(px, py, 9) * 1.9, 0, 6.2832); ctx.fill();
    }
  };

  M.hearts = function (ctx, f, a, b, st, w) {
    ctx.strokeStyle = tint(f.hex, 0.55); ctx.lineWidth = w * 0.4; line(ctx, a, b);
    later(a, b, st, w * 1.0, w * 0.7, function (x, y, ang, i) { ctx.fillStyle = f.hex; heart(ctx, x, y, w * (0.5 + 0.2 * rnd(x, y, i))); });
  };

  M.stars = function (ctx, f, a, b, st, w) {
    ctx.strokeStyle = tint(f.hex, 0.55); ctx.lineWidth = w * 0.4; line(ctx, a, b);
    later(a, b, st, w * 0.95, w * 0.8, function (x, y, ang, i) { ctx.fillStyle = f.hex; star(ctx, x, y, w * 0.58, rnd(x, y, i), 5); });
  };

  /* ===== exclusifs ===== */
  M.flames = function (ctx, f, a, b, st, w) {   // Fluo Diego
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.45; line(ctx, a, b);
    walk(a, b, st, w * 0.75, function (x, y, ang, i) {
      var h = w * (0.7 + 0.8 * rnd(x, y, i)), r = w * 0.34;
      ctx.fillStyle = '#FF3B00'; flame(ctx, x, y, h, r);
      ctx.fillStyle = '#FFD500'; flame(ctx, x, y + r * 0.2, h * 0.55, r * 0.55);
    });
  };

  M.crowns = function (ctx, f, a, b, st, w) {   // Fluo Reine
    ctx.strokeStyle = tint(f.hex, 0.25); ctx.lineWidth = w * 0.5; line(ctx, a, b);
    later(a, b, st, w * 1.5, w * 0.75, function (x, y) {
      var s = w * 0.95;
      ctx.beginPath();
      ctx.moveTo(x - s / 2, y + s * 0.4); ctx.lineTo(x - s / 2, y - s * 0.15); ctx.lineTo(x - s / 4, y + s * 0.1);
      ctx.lineTo(x, y - s * 0.45); ctx.lineTo(x + s / 4, y + s * 0.1); ctx.lineTo(x + s / 2, y - s * 0.15);
      ctx.lineTo(x + s / 2, y + s * 0.4); ctx.closePath();
      ctx.fillStyle = '#FFC400'; ctx.fill();
      ctx.strokeStyle = shade(f.hex, 0.35); ctx.lineWidth = 1.8; ctx.stroke();
    });
  };

  M.flowers = function (ctx, f, a, b, st, w) {  // Fluo Chloé
    ctx.strokeStyle = tint(f.hex, 0.5); ctx.lineWidth = w * 0.4; line(ctx, a, b);
    walk(a, b, st, w * 1.15, function (x, y, ang, i) {
      var rot = rnd(x, y, i) * 6.2832;
      ctx.fillStyle = f.hex;
      for (var k = 0; k < 5; k++) {
        var an = rot + (k * 6.2832) / 5;
        ctx.beginPath(); ctx.arc(x + Math.cos(an) * w * 0.3, y + Math.sin(an) * w * 0.3, w * 0.27, 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = '#FFE600'; ctx.beginPath(); ctx.arc(x, y, w * 0.19, 0, 6.2832); ctx.fill();
    });
  };

  M.numbers = function (ctx, f, a, b, st, w) {  // Fluo 41 ans
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.85; line(ctx, a, b);
    later(a, b, st, w * 2.0, w * 1.1, function (x, y, ang) {
      ctx.save();
      ctx.translate(x, y);
      var an = ang; if (an > Math.PI / 2 || an < -Math.PI / 2) an += Math.PI;
      ctx.rotate(an);
      ctx.fillStyle = '#C25E00'; ctx.font = '800 ' + Math.round(w * 0.95) + 'px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('41', 0, 1);
      ctx.restore();
    });
  };

  M.slash = function (ctx, f, a, b, st, w) {    // Fluo SNK
    ctx.strokeStyle = shade(f.hex, 0.5); ctx.lineWidth = w * 0.3; line(ctx, a, b);
    ctx.strokeStyle = f.hex; ctx.lineWidth = 3.6;
    walk(a, b, st, w * 0.9, function (x, y, ang) {
      var l = w * 0.75;
      [0.62, -0.62].forEach(function (d) {
        var c = Math.cos(ang + d) * l, s = Math.sin(ang + d) * l;
        line(ctx, { x: x - c, y: y - s }, { x: x + c, y: y + s });
      });
    });
  };

  M.aura = function (ctx, f, a, b, st, w) {     // Fluo Super Saiyen Claudo
    ctx.shadowColor = '#FF8A00'; ctx.shadowBlur = w * 1.6;
    ctx.strokeStyle = '#FFB000'; ctx.lineWidth = w * 1.1; line(ctx, a, b);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFE600'; ctx.lineWidth = w * 0.55; line(ctx, a, b);
    ctx.strokeStyle = '#FFF59D'; ctx.lineWidth = w * 0.2; line(ctx, a, b);
    /* éclairs dorés */
    var len = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
    var before = Math.floor(st.dist / 55), after = Math.floor((st.dist + len) / 55);
    if (after > before) {
      var x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, ang = rnd(x, y, 1) * 6.2832;
      ctx.strokeStyle = '#FF9500'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (var k = 1; k <= 4; k++) {
        var r = k * w * 0.42, j = (rnd(x, y, k + 4) - 0.5) * w * 0.7;
        ctx.lineTo(x + Math.cos(ang) * r + -Math.sin(ang) * j, y + Math.sin(ang) * r + Math.cos(ang) * j);
      }
      ctx.stroke();
    }
  };

  M.heist = function (ctx, f, a, b, st, w) {    // Fluo Pompier-Cambrioleur
    ctx.strokeStyle = '#FF2A2A'; ctx.lineWidth = w * 0.7; line(ctx, a, b);
    later(a, b, st, w * 1.05, w * 0.8, function (x, y, ang, i) {
      if (i % 2 === 0) {                          // le pompier : une flamme
        ctx.fillStyle = '#FF7A00'; flame(ctx, x, y, w * 0.9, w * 0.3);
        ctx.fillStyle = '#FFE600'; flame(ctx, x, y + w * 0.06, w * 0.48, w * 0.17);
      } else {                                    // le cambrioleur : un masque
        var mw = w * 0.85, mh = w * 0.34;
        ctx.fillStyle = '#1F2937'; ctx.fillRect(x - mw / 2, y - mh / 2, mw, mh);
        ctx.fillStyle = '#FFE600';
        ctx.beginPath(); ctx.arc(x - mw * 0.22, y, mh * 0.28, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(x + mw * 0.22, y, mh * 0.28, 0, 6.2832); ctx.fill();
      }
    });
  };


  /* ===== exclusifs : la bande ===== */
  function upright(an) { return an > Math.PI / 2 || an < -Math.PI / 2 ? an + Math.PI : an; }

  M.veil = function (ctx, f, a, b, st, w) {      // Fluo 25 : on se voile la face
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.8; line(ctx, a, b);
    later(a, b, st, w * 2.2, w * 1.1, function (x, y, ang) {
      ctx.translate(x, y); ctx.rotate(upright(ang));
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.beginPath(); ctx.moveTo(-w, -w * 0.5);
      ctx.quadraticCurveTo(0, -w * 0.75, w, -w * 0.5);
      ctx.quadraticCurveTo(w * 1.1, 0, w, w * 0.55);
      ctx.quadraticCurveTo(0, w * 0.8, -w, w * 0.55);
      ctx.quadraticCurveTo(-w * 1.1, 0, -w, -w * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(f.hex, 0.25); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = shade(f.hex, 0.45); ctx.font = '900 ' + Math.round(w * 0.85) + 'px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('25', 0, 1);
    });
  };

  M.cashew = function (ctx, f, a, b, st, w) {    // Fluo Cajoux : noix de cajou
    ctx.strokeStyle = tint(f.hex, 0.45); ctx.lineWidth = w * 0.55; line(ctx, a, b);
    later(a, b, st, w * 0.95, w * 0.7, function (x, y, ang, i) {
      ctx.translate(x, y); ctx.rotate(rnd(x, y, i) * 6.2832);
      var k = w * 1.1;
      ctx.beginPath();
      ctx.moveTo(-k * 0.4, -k * 0.05);
      ctx.bezierCurveTo(-k * 0.35, -k * 0.45, k * 0.35, -k * 0.45, k * 0.42, 0);
      ctx.bezierCurveTo(k * 0.46, k * 0.25, k * 0.2, k * 0.3, k * 0.14, k * 0.1);
      ctx.bezierCurveTo(k * 0.04, -k * 0.02, -k * 0.2, k * 0.08, -k * 0.24, k * 0.3);
      ctx.bezierCurveTo(-k * 0.4, k * 0.36, -k * 0.46, k * 0.1, -k * 0.4, -k * 0.05);
      ctx.closePath();
      ctx.fillStyle = f.hex; ctx.fill();
      ctx.strokeStyle = shade(f.hex, 0.35); ctx.lineWidth = 1.6; ctx.stroke();
    });
  };

  M.rugby = function (ctx, f, a, b, st, w) {     // Fluo Fisi'ihoi : des ballons de rugby
    ctx.strokeStyle = tint(f.hex, 0.55); ctx.lineWidth = w * 0.45; line(ctx, a, b);
    later(a, b, st, w * 1.25, w * 0.9, function (x, y, ang) {
      ctx.translate(x, y); ctx.rotate(ang);
      var rx = w * 0.66, ry = w * 0.4;
      ctx.beginPath();                                   // ballon ovale, pointu aux deux bouts
      ctx.moveTo(-rx, 0);
      ctx.bezierCurveTo(-rx * 0.6, -ry * 1.45, rx * 0.6, -ry * 1.45, rx, 0);
      ctx.bezierCurveTo(rx * 0.6, ry * 1.45, -rx * 0.6, ry * 1.45, -rx, 0);
      ctx.closePath();
      ctx.fillStyle = f.hex; ctx.fill();
      ctx.strokeStyle = shade(f.hex, 0.45); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8;  // lacets
      ctx.beginPath(); ctx.moveTo(-rx * 0.3, 0); ctx.lineTo(rx * 0.3, 0); ctx.stroke();
      for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * rx * 0.13, -ry * 0.3); ctx.lineTo(k * rx * 0.13, ry * 0.3); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;   // bandes blanches
      [-0.62, 0.62].forEach(function (d) { ctx.beginPath(); ctx.moveTo(d * rx, -ry * 0.62); ctx.quadraticCurveTo(d * rx * 1.08, 0, d * rx, ry * 0.62); ctx.stroke(); });
    });
  };

  M.coat = function (ctx, f, a, b, st, w) {      // Fluo Manteau volé : des manteaux sur cintre
    ctx.strokeStyle = shade(f.hex, 0.4); ctx.lineWidth = 3; line(ctx, a, b);
    later(a, b, st, w * 1.3, w * 0.9, function (x, y) {
      var k = w;
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - k * 0.58, k * 0.13, Math.PI * 0.15, Math.PI * 1.75); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - k * 0.62, y - k * 0.05); ctx.lineTo(x - k * 0.26, y - k * 0.4); ctx.lineTo(x + k * 0.26, y - k * 0.4);
      ctx.lineTo(x + k * 0.62, y - k * 0.05); ctx.lineTo(x + k * 0.5, y + k * 0.6); ctx.lineTo(x - k * 0.5, y + k * 0.6);
      ctx.closePath();
      ctx.fillStyle = f.hex; ctx.fill();
      ctx.strokeStyle = shade(f.hex, 0.45); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - k * 0.4); ctx.lineTo(x, y + k * 0.6); ctx.stroke();
      ctx.fillStyle = '#FFE600';
      [0.0, 0.25].forEach(function (d) { ctx.beginPath(); ctx.arc(x + k * 0.1, y + k * d, k * 0.045, 0, 6.2832); ctx.fill(); });
    });
  };

  M.pasta = function (ctx, f, a, b, st, w) {     // Fluo Coquillette : des coquillettes
    ctx.strokeStyle = tint(f.hex, 0.55); ctx.lineWidth = w * 0.45; line(ctx, a, b);
    later(a, b, st, w * 0.85, w * 0.7, function (x, y, ang, i) {
      var rot = rnd(x, y, i) * 6.2832;
      ctx.strokeStyle = shade(f.hex, 0.18); ctx.lineWidth = w * 0.4;
      ctx.beginPath(); ctx.arc(x, y, w * 0.3, rot, rot + 4.3); ctx.stroke();
      ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.3;
      ctx.beginPath(); ctx.arc(x, y, w * 0.3, rot, rot + 4.3); ctx.stroke();
      ctx.strokeStyle = tint(f.hex, 0.6); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, w * 0.3, rot + 0.3, rot + 3.9); ctx.stroke();
    });
  };

  M.siuu = function (ctx, f, a, b, st, w) {      // Fluo Cristiano Ronaldo : SIUUU
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.75; line(ctx, a, b);
    later(a, b, st, w * 1.35, w * 0.9, function (x, y, ang, i) {
      if (i % 2 === 0) {
        ctx.fillStyle = '#FFD500'; ctx.strokeStyle = '#8A0019'; ctx.lineWidth = 2;
        ctx.font = '900 ' + Math.round(w * 1.05) + 'px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText('7', x, y + 1); ctx.fillText('7', x, y + 1);
      } else { ctx.fillStyle = '#00A651'; star(ctx, x, y, w * 0.55, 0, 5); }
    });
  };

  M.car = function (ctx, f, a, b, st, w) {       // Fluo P'tite clito : une vieille Clio blanche
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.4; line(ctx, a, b);
    later(a, b, st, w * 2.7, w * 1.6, function (x, y, ang) {
      ctx.translate(x, y); ctx.rotate(upright(ang));
      var k = w;
      ctx.beginPath();
      ctx.moveTo(-k * 0.85, k * 0.22); ctx.lineTo(-k * 0.85, -k * 0.08); ctx.lineTo(-k * 0.5, -k * 0.14); ctx.lineTo(-k * 0.32, -k * 0.5);
      ctx.lineTo(k * 0.28, -k * 0.5); ctx.lineTo(k * 0.52, -k * 0.14); ctx.lineTo(k * 0.85, -k * 0.06); ctx.lineTo(k * 0.85, k * 0.22);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#4B5563'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#8EC5E8';
      ctx.beginPath(); ctx.moveTo(-k * 0.4, -k * 0.12); ctx.lineTo(-k * 0.27, -k * 0.4); ctx.lineTo(-k * 0.02, -k * 0.4); ctx.lineTo(-k * 0.02, -k * 0.12); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(k * 0.06, -k * 0.12); ctx.lineTo(k * 0.06, -k * 0.4); ctx.lineTo(k * 0.25, -k * 0.4); ctx.lineTo(k * 0.44, -k * 0.12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#B4621F';                                   // un peu de rouille : elle est vieille
      ctx.beginPath(); ctx.arc(-k * 0.62, k * 0.1, k * 0.07, 0, 6.2832); ctx.arc(k * 0.7, k * 0.14, k * 0.05, 0, 6.2832); ctx.fill();
      [-0.5, 0.5].forEach(function (d) {
        ctx.fillStyle = '#1F2937'; ctx.beginPath(); ctx.arc(k * d, k * 0.26, k * 0.2, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#C7CDD6'; ctx.beginPath(); ctx.arc(k * d, k * 0.26, k * 0.08, 0, 6.2832); ctx.fill();
      });
    });
  };

  M.wizard = function (ctx, f, a, b, st, w) {    // Fluo Gandalf : chapeaux pointus et étoiles
    ctx.strokeStyle = f.hex; ctx.lineWidth = w * 0.6; line(ctx, a, b);
    later(a, b, st, w * 1.0, w * 0.9, function (x, y, ang, i) {
      var k = w;
      if (i % 2 === 0) {
        ctx.fillStyle = '#6B7280';
        ctx.beginPath(); ctx.moveTo(x - k * 0.38, y + k * 0.15); ctx.quadraticCurveTo(x - k * 0.1, y - k * 0.3, x + k * 0.22, y - k * 0.82);
        ctx.quadraticCurveTo(x + k * 0.5, y - k * 0.5, x + k * 0.38, y + k * 0.15); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, y + k * 0.15, k * 0.65, k * 0.15, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#374151'; ctx.fillRect(x - k * 0.38, y + k * 0.02, k * 0.76, k * 0.1);
      } else { ctx.fillStyle = '#FFD54F'; star(ctx, x, y, k * 0.42, 0.2, 5); }
    });
  };

  M.bricks = function (ctx, f, a, b, st, w) {    // Fluo Batibat : briques de chantier
    ctx.strokeStyle = tint(f.hex, 0.6); ctx.lineWidth = w * 0.85; line(ctx, a, b);
    later(a, b, st, w * 0.7, w * 0.8, function (x, y, ang, i) {
      ctx.translate(x, y); ctx.rotate(ang);
      var off = i % 2 ? -w * 0.22 : w * 0.22;
      ctx.fillStyle = i % 3 === 0 ? shade(f.hex, 0.15) : f.hex;
      ctx.fillRect(-w * 0.62, off - w * 0.19, w * 1.24, w * 0.38);
      ctx.strokeStyle = shade(f.hex, 0.45); ctx.lineWidth = 1.4;
      ctx.strokeRect(-w * 0.62, off - w * 0.19, w * 1.24, w * 0.38);
    });
  };

  /* ---------- API ---------- */
  function begin() { return { next: 0, count: 0, dist: 0, p: null, ang: 0, q: [], lag: 0 }; }

  function segment(ctx, f, a, b, st, scale) {
    var w = f.w * (scale || 1);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (M[f.mode] || M.classic)(ctx, f, a, b, st, w);
    ctx.restore();
    st.dist += Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
    flush(ctx, st, false);
  }

  /* fin du trait : dessine les derniers tampons en attente */
  function finish(ctx, f, st) { flush(ctx, st, true); }

  function drawPath(ctx, f, pts, scale) {
    var st = begin();
    if (!pts.length) return;
    if (pts.length === 1) { segment(ctx, f, pts[0], pts[0], st, scale); finish(ctx, f, st); return; }
    for (var i = 1; i < pts.length; i++) segment(ctx, f, pts[i - 1], pts[i], st, scale);
    finish(ctx, f, st);
  }

  /* Petit aperçu de la trace d'un fluo dans un canvas (cartes, collection, plateau) */
  function preview(canvas, f) {
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var k = (H * 0.4) / f.w, pts = [];
    for (var x = W * 0.1; x <= W * 0.9; x += 3) {
      pts.push({ x: x, y: H / 2 + Math.sin(((x - W * 0.1) / (W * 0.8)) * 6.2832) * H * 0.13 });
    }
    drawPath(ctx, f, pts, k);
  }

  FS.Strokes = { begin: begin, segment: segment, finish: finish, drawPath: drawPath, preview: preview, mix: mix, tint: tint, shade: shade, hexToHue: hexToHue, modes: M };
})();
