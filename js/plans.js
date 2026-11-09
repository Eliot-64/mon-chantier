/* ==========================================================================
   MON CHANTIER — générateur de plans de bâtiment (style bureau d'études)
   generate(W, H, seed) -> plan   |   render(ctx, plan) dessine le plan
   Les murs (plan.walls) sont les "contours" à repasser au fluo.
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});

  var MM_PER_PX = 15; // 1 px logique = 15 mm (échelle 1/100 fictive)

  function rngFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function snap(v) { return Math.round(v / 10) * 10; }
  function isH(w) { return w.y1 === w.y2; }
  function segLen(w) { return Math.abs(w.x2 - w.x1) + Math.abs(w.y2 - w.y1); }
  function norm(x1, y1, x2, y2, kind) {
    return { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2), kind: kind };
  }
  function pointInPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  /* Coupe un mur en deux autour d'une ouverture centrée à "c" (distance depuis le début) */
  function withGap(w, c, width) {
    var out = [], h = isH(w);
    var a = (h ? w.x1 : w.y1) + c - width / 2, b = (h ? w.x1 : w.y1) + c + width / 2;
    var s = h ? w.x1 : w.y1, e = h ? w.x2 : w.y2;
    if (a - s > 1) out.push(h ? norm(s, w.y1, a, w.y1, w.kind) : norm(w.x1, s, w.x1, a, w.kind));
    if (e - b > 1) out.push(h ? norm(b, w.y1, e, w.y1, w.kind) : norm(w.x1, b, w.x1, e, w.kind));
    return out;
  }

  var PROJECTS = ['Villa Les Calots', 'Maison du Surligneur', 'Résidence Fluo', 'Pavillon Diego', 'Loft Claudo', 'Atelier Chloé',
    'Chalet Super Saiyen', 'Villa Reine', 'Résidence des 41 Ans', 'Mas du Métreur', 'Maison Néon', 'Pavillon Jaune Citron',
    'Immeuble Les Cotes', 'Bastide du Concepteur'];
  var ROOM_NAMES = ['Séjour', 'Chambre', 'Cuisine', 'Chambre 2', 'Bureau', 'SdB', 'Buanderie', 'WC', 'Cellier', 'Entrée'];

  function generate(W, H, seed) {
    var R = rngFrom(seed);
    var bx0 = snap(W * 0.13), bx1 = snap(W - W * 0.09), by0 = snap(H * 0.14), by1 = snap(H - H * 0.2);
    var bw = bx1 - bx0, bh = by1 - by0;

    /* ---- forme extérieure ---- */
    var r = R(), shape = r < 0.4 ? 'rect' : r < 0.75 ? 'L' : 'T';
    var blocks, poly;
    if (shape === 'rect') {
      blocks = [{ x0: bx0, y0: by0, x1: bx1, y1: by1 }];
      poly = [{ x: bx0, y: by0 }, { x: bx1, y: by0 }, { x: bx1, y: by1 }, { x: bx0, y: by1 }];
    } else if (shape === 'L') {
      var ya = snap(by0 + bh * (0.5 + R() * 0.15)), xb = snap(bx0 + bw * (0.5 + R() * 0.15));
      blocks = [{ x0: bx0, y0: by0, x1: bx1, y1: ya }, { x0: bx0, y0: ya, x1: xb, y1: by1 }];
      poly = [{ x: bx0, y: by0 }, { x: bx1, y: by0 }, { x: bx1, y: ya }, { x: xb, y: ya }, { x: xb, y: by1 }, { x: bx0, y: by1 }];
    } else {
      var yt = snap(by0 + bh * (0.38 + R() * 0.1)), s0 = snap(bx0 + bw * (0.25 + R() * 0.08)), s1 = snap(bx1 - bw * (0.25 + R() * 0.08));
      blocks = [{ x0: bx0, y0: by0, x1: bx1, y1: yt }, { x0: s0, y0: yt, x1: s1, y1: by1 }];
      poly = [{ x: bx0, y: by0 }, { x: bx1, y: by0 }, { x: bx1, y: yt }, { x: s1, y: yt }, { x: s1, y: by1 },
        { x: s0, y: by1 }, { x: s0, y: yt }, { x: bx0, y: yt }];
    }
    var fx = R() < 0.5, fy = R() < 0.5;
    function FX(x) { return fx ? bx0 + bx1 - x : x; }
    function FY(y) { return fy ? by0 + by1 - y : y; }
    blocks = blocks.map(function (b) {
      return { x0: Math.min(FX(b.x0), FX(b.x1)), x1: Math.max(FX(b.x0), FX(b.x1)), y0: Math.min(FY(b.y0), FY(b.y1)), y1: Math.max(FY(b.y0), FY(b.y1)) };
    });
    poly = poly.map(function (p) { return { x: FX(p.x), y: FY(p.y) }; });

    /* ---- murs extérieurs ---- */
    var outer = [];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      outer.push(norm(p.x, p.y, q.x, q.y, 'outer'));
    }

    /* ---- cloisons : découpage récursif de chaque bloc ---- */
    var inner = [], rooms = [], minPart = 130;
    function bsp(rc, depth) {
      var w = rc.x1 - rc.x0, h = rc.y1 - rc.y0;
      var canV = w >= 2 * minPart, canH = h >= 2 * minPart;
      if ((!canV && !canH) || depth >= 3 || (depth >= 1 && R() < 0.25)) { rooms.push(rc); return; }
      var vertical = canV && canH ? (w > h ? R() < 0.75 : R() < 0.25) : canV;
      if (vertical) {
        var x = snap(rc.x0 + w * (0.35 + R() * 0.3));
        x = Math.max(rc.x0 + minPart, Math.min(rc.x1 - minPart, x));
        inner.push(norm(x, rc.y0, x, rc.y1, 'inner'));
        bsp({ x0: rc.x0, y0: rc.y0, x1: x, y1: rc.y1 }, depth + 1);
        bsp({ x0: x, y0: rc.y0, x1: rc.x1, y1: rc.y1 }, depth + 1);
      } else {
        var y = snap(rc.y0 + h * (0.35 + R() * 0.3));
        y = Math.max(rc.y0 + minPart, Math.min(rc.y1 - minPart, y));
        inner.push(norm(rc.x0, y, rc.x1, y, 'inner'));
        bsp({ x0: rc.x0, y0: rc.y0, x1: rc.x1, y1: y }, depth + 1);
        bsp({ x0: rc.x0, y0: y, x1: rc.x1, y1: rc.y1 }, depth + 1);
      }
    }
    blocks.forEach(function (b) { bsp(b, 0); });
    if (blocks.length === 2) {          // mur mitoyen entre les deux ailes
      var A = blocks[0], B = blocks[1], yy = null;
      if (A.y1 === B.y0) yy = A.y1; else if (B.y1 === A.y0) yy = B.y1;
      var ox0 = Math.max(A.x0, B.x0), ox1 = Math.min(A.x1, B.x1);
      if (yy !== null && ox1 - ox0 > 20) inner.push(norm(ox0, yy, ox1, yy, 'inner'));
    }

    /* ---- ouvertures ---- */
    var everything = outer.concat(inner);
    function junctions(w) {
      var out = [];
      everything.forEach(function (o) {
        if (o === w) return;
        if (isH(w) && !isH(o)) {
          if (o.x1 >= w.x1 - 1 && o.x1 <= w.x2 + 1 && (Math.abs(o.y1 - w.y1) < 1 || Math.abs(o.y2 - w.y1) < 1)) out.push(o.x1 - w.x1);
        } else if (!isH(w) && isH(o)) {
          if (o.y1 >= w.y1 - 1 && o.y1 <= w.y2 + 1 && (Math.abs(o.x1 - w.x1) < 1 || Math.abs(o.x2 - w.x1) < 1)) out.push(o.y1 - w.y1);
        }
      });
      return out;
    }
    function placeGap(w, dw) {
      var L = segLen(w);
      if (L < dw + 60) return null;
      var junc = junctions(w);
      for (var t = 0; t < 12; t++) {
        var c = snap(dw / 2 + 25 + R() * (L - dw - 50));
        if (junc.every(function (j) { return Math.abs(j - c) > dw / 2 + 14; })) return c;
      }
      return null;
    }
    function center(w, c) { return isH(w) ? { x: w.x1 + c, y: w.y1 } : { x: w.x1, y: w.y1 + c }; }

    var doors = [], walls = [];
    inner.forEach(function (w) {
      var c = placeGap(w, 46);
      if (c === null) { walls.push(w); return; }
      var m = center(w, c), h = isH(w);
      doors.push({ x: m.x, y: m.y, h: h, dw: 46, hingeStart: R() < 0.5, side: R() < 0.5 ? 1 : -1 });
      withGap(w, c, 46).forEach(function (s) { walls.push(s); });
    });

    /* porte d'entrée sur un mur extérieur */
    var outerPieces = [], eligible = outer.filter(function (w) { return segLen(w) >= 150; });
    var entrance = eligible.length ? eligible[Math.floor(R() * eligible.length)] : null;
    outer.forEach(function (w) {
      if (w !== entrance) { outerPieces.push(w); return; }
      var c = placeGap(w, 54);
      if (c === null) { outerPieces.push(w); return; }
      var m = center(w, c), h = isH(w), mid = { x: m.x, y: m.y };
      var inward = h ? (pointInPoly(mid.x, mid.y + 6, poly) ? 1 : -1) : (pointInPoly(mid.x + 6, mid.y, poly) ? 1 : -1);
      doors.push({ x: m.x, y: m.y, h: h, dw: 54, hingeStart: R() < 0.5, side: inward, entrance: true });
      withGap(w, c, 54).forEach(function (s) { outerPieces.push(s); });
    });
    outerPieces.forEach(function (w) { walls.push(w); });

    /* fenêtres sur les murs extérieurs */
    var windows = [];
    outerPieces.forEach(function (w) {
      var L = segLen(w);
      if (L < 150) return;
      var n = L > 300 ? 2 : 1, junc = junctions(w);
      for (var k = 1; k <= n; k++) {
        var ww = snap(60 + R() * 30), c = snap((L * k) / (n + 1));
        if (!junc.every(function (j) { return Math.abs(j - c) > ww / 2 + 12; })) continue;
        var m = center(w, c);
        windows.push({ x: m.x, y: m.y, h: isH(w), len: ww });
      }
    });

    /* ---- noms de pièces + escalier ---- */
    rooms.sort(function (a, b) { return (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0); });
    rooms.forEach(function (rm, i) {
      rm.name = ROOM_NAMES[Math.min(i, ROOM_NAMES.length - 1)];
      rm.area = ((rm.x1 - rm.x0) * MM_PER_PX / 1000) * ((rm.y1 - rm.y0) * MM_PER_PX / 1000);
    });
    var stairs = null;
    for (var ri = 0; ri < rooms.length; ri++) {
      var rm = rooms[ri];
      if (ri > 0 && rm.x1 - rm.x0 >= 160 && rm.y1 - rm.y0 >= 130) {
        stairs = { x: rm.x0 + 16, y: rm.y0 + 16, w: 56, h: 96, roomIndex: ri };
        break;
      }
    }

    /* ---- échantillons de contour (pour mesurer ce qui a été repassé) ---- */
    var samples = [], total = 0, step = FS.CONFIG.plan.sampleStep;
    walls.forEach(function (w) {
      var L = segLen(w); total += L;
      var n = Math.max(1, Math.round(L / step));
      for (var k = 0; k <= n; k++) {
        var t = k / n;
        samples.push({ x: w.x1 + (w.x2 - w.x1) * t, y: w.y1 + (w.y2 - w.y1) * t });
      }
    });

    return {
      seed: seed, W: W, H: H, shape: shape,
      bounds: { x0: bx0, y0: by0, x1: bx1, y1: by1 },
      poly: poly, walls: walls, doors: doors, windows: windows, rooms: rooms, stairs: stairs,
      samples: samples, totalLength: total,
      title: PROJECTS[Math.floor(R() * PROJECTS.length)],
      number: ('000' + (seed % 10000)).slice(-4)
    };
  }

  /* =======================  DESSIN DU PLAN  ======================= */
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function dimLine(ctx, x1, y1, x2, y2, label, vertical) {
    ctx.save();
    ctx.strokeStyle = '#6B7A90'; ctx.fillStyle = '#6B7A90'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    [[x1, y1], [x2, y2]].forEach(function (p) {
      ctx.beginPath();
      ctx.moveTo(p[0] - 5, p[1] + 5); ctx.lineTo(p[0] + 5, p[1] - 5); ctx.stroke();
      ctx.beginPath();
      if (vertical) { ctx.moveTo(p[0] - 8, p[1]); ctx.lineTo(p[0] + 14, p[1]); } else { ctx.moveTo(p[0], p[1] - 8); ctx.lineTo(p[0], p[1] + 14); }
      ctx.stroke();
    });
    ctx.font = '12px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (vertical) { ctx.translate(mx - 4, my); ctx.rotate(-Math.PI / 2); ctx.fillText(label, 0, 0); } else ctx.fillText(label, mx, my - 3);
    ctx.restore();
  }

  function bubble(ctx, x, y, text) {
    ctx.save();
    ctx.strokeStyle = '#6B7A90'; ctx.fillStyle = '#6B7A90'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.2832); ctx.stroke();
    ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  function render(ctx, plan) {
    var W = plan.W, H = plan.H, b = plan.bounds;
    ctx.save();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

    /* quadrillage papier millimétré */
    ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 20) { ctx.strokeStyle = x % 100 === 0 ? '#DCE6F4' : '#EEF3FA'; ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (var y = 0; y <= H; y += 20) { ctx.strokeStyle = y % 100 === 0 ? '#DCE6F4' : '#EEF3FA'; ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

    /* axes + bulles */
    var xs = {}, ys = {};
    plan.poly.forEach(function (p) { xs[p.x] = 1; ys[p.y] = 1; });
    plan.walls.forEach(function (w) { if (!isH(w)) xs[w.x1] = 1; else ys[w.y1] = 1; });
    var ax = Object.keys(xs).map(Number).sort(function (a, c) { return a - c; });
    var ay = Object.keys(ys).map(Number).sort(function (a, c) { return a - c; });
    function thin(arr) {            // évite deux bulles d'axes qui se chevauchent
      var o = [];
      arr.forEach(function (v) { if (!o.length || v - o[o.length - 1] >= 44) o.push(v); });
      while (o.length > 6) o.splice(1, 1);
      return o;
    }
    ax = thin(ax); ay = thin(ay);
    ctx.setLineDash([14, 4, 2, 4]); ctx.strokeStyle = '#B7C4D8'; ctx.lineWidth = 1;
    ax.forEach(function (v) { ctx.beginPath(); ctx.moveTo(v, b.y0 - 52); ctx.lineTo(v, b.y1 + 24); ctx.stroke(); });
    ay.forEach(function (v) { ctx.beginPath(); ctx.moveTo(b.x0 - 52, v); ctx.lineTo(b.x1 + 24, v); ctx.stroke(); });
    ctx.setLineDash([]);
    ax.forEach(function (v, i) { bubble(ctx, v, b.y0 - 64, String.fromCharCode(65 + i)); });
    ay.forEach(function (v, i) { bubble(ctx, b.x0 - 64, v, String(i + 1)); });

    /* noms de pièces */
    ctx.fillStyle = '#8591A5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    plan.rooms.forEach(function (rm, ri) {
      var cx = (rm.x0 + rm.x1) / 2, cy = (rm.y0 + rm.y1) / 2;
      if (plan.stairs && plan.stairs.roomIndex === ri) cx += 34;   // le nom évite l'escalier
      ctx.font = 'bold 13px Arial, sans-serif'; ctx.fillText(rm.name, cx, cy - 7);
      ctx.font = '11px Arial, sans-serif'; ctx.fillText(rm.area.toFixed(1).replace('.', ',') + ' m²', cx, cy + 8);
    });

    /* escalier */
    if (plan.stairs) {
      var s = plan.stairs;
      ctx.strokeStyle = '#8A97AB'; ctx.lineWidth = 1.2; ctx.strokeRect(s.x, s.y, s.w, s.h);
      for (var yy = s.y + 10; yy < s.y + s.h; yy += 10) { ctx.beginPath(); ctx.moveTo(s.x, yy); ctx.lineTo(s.x + s.w, yy); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(s.x + s.w / 2, s.y + s.h - 6); ctx.lineTo(s.x + s.w / 2, s.y + 8);
      ctx.moveTo(s.x + s.w / 2 - 5, s.y + 15); ctx.lineTo(s.x + s.w / 2, s.y + 7); ctx.lineTo(s.x + s.w / 2 + 5, s.y + 15); ctx.stroke();
    }

    /* murs */
    ctx.lineCap = 'square'; ctx.strokeStyle = '#1F2937';
    plan.walls.forEach(function (w) {
      ctx.lineWidth = w.kind === 'outer' ? 7 : 4;
      ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
    });
    ctx.lineCap = 'butt';

    /* fenêtres */
    plan.windows.forEach(function (o) {
      var dx = o.h ? o.len / 2 : 0, dy = o.h ? 0 : o.len / 2;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(o.x - dx, o.y - dy); ctx.lineTo(o.x + dx, o.y + dy); ctx.stroke();
      ctx.strokeStyle = '#4C8BD6'; ctx.lineWidth = 1.4;
      [-3, 0, 3].forEach(function (off) {
        ctx.beginPath();
        ctx.moveTo(o.x - dx + (o.h ? 0 : off), o.y - dy + (o.h ? off : 0));
        ctx.lineTo(o.x + dx + (o.h ? 0 : off), o.y + dy + (o.h ? off : 0));
        ctx.stroke();
      });
    });

    /* portes (battant + arc) */
    plan.doors.forEach(function (d) {
      var u0 = d.h ? { x: 1, y: 0 } : { x: 0, y: 1 };
      var v = d.h ? { x: 0, y: d.side } : { x: d.side, y: 0 };
      var hinge = { x: d.x - u0.x * (d.dw / 2) * (d.hingeStart ? 1 : -1), y: d.y - u0.y * (d.dw / 2) * (d.hingeStart ? 1 : -1) };
      var u = d.hingeStart ? u0 : { x: -u0.x, y: -u0.y };
      ctx.strokeStyle = '#4B5667'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hinge.x, hinge.y); ctx.lineTo(hinge.x + v.x * d.dw, hinge.y + v.y * d.dw); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath();
      for (var k = 0; k <= 14; k++) {
        var t = (k / 14) * (Math.PI / 2);
        var px = hinge.x + d.dw * (u.x * Math.cos(t) + v.x * Math.sin(t)), py = hinge.y + d.dw * (u.y * Math.cos(t) + v.y * Math.sin(t));
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    /* cotes */
    dimLine(ctx, b.x0, b.y0 - 34, b.x1, b.y0 - 34, fmt((b.x1 - b.x0) * MM_PER_PX), false);
    dimLine(ctx, b.x0 - 34, b.y0, b.x0 - 34, b.y1, fmt((b.y1 - b.y0) * MM_PER_PX), true);

    /* cartouche du métreur */
    var cx0 = 30, cy0 = H - 96, cw = W - 60, ch = 66;
    ctx.strokeStyle = '#1F2937'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(cx0, cy0, cw, ch); ctx.strokeRect(cx0, cy0, cw, ch);
    var c1 = cx0 + cw * 0.5, c2 = cx0 + cw * 0.75;
    ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(c1, cy0); ctx.lineTo(c1, cy0 + ch); ctx.moveTo(c2, cy0); ctx.lineTo(c2, cy0 + ch);
    ctx.moveTo(c1, cy0 + ch / 2); ctx.lineTo(cx0 + cw, cy0 + ch / 2); ctx.stroke();
    ctx.fillStyle = '#6B7A90'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '9px Arial, sans-serif';
    ctx.fillText('PROJET', cx0 + 8, cy0 + 6); ctx.fillText('PLAN N°', c1 + 8, cy0 + 6); ctx.fillText('ÉCHELLE', c2 + 8, cy0 + 6);
    ctx.fillText('MÉTREUR-CONCEPTEUR', c1 + 8, cy0 + ch / 2 + 6);
    ctx.fillStyle = '#1F2937'; ctx.font = 'bold ' + (cw < 520 ? 14 : 18) + 'px Arial, sans-serif';
    ctx.fillText(plan.title, cx0 + 8, cy0 + 24);
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText(plan.number, c1 + 8, cy0 + 19); ctx.fillText('1/100', c2 + 8, cy0 + 19);
    ctx.fillText((FS.CONFIG.dedicace.nom || ''), c1 + 8, cy0 + ch / 2 + 20);
    ctx.restore();
  }

  FS.Plans = {
    generate: generate, render: render,
    newSeed: function () { return Math.floor(Math.random() * 900000) + 1000; },
    MM_PER_PX: MM_PER_PX
  };
})();
