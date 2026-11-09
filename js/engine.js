/* ==========================================================================
   MON CHANTIER — moteur de dessin
   Deux canvas superposés : le plan (dessous) et l'encre des fluos (dessus,
   en mode "multiply" via CSS, comme un vrai surligneur).
   Suit en direct la part du contour repassée (couverture) et la précision.
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});

  function distPointSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    var cx = ax + dx * t - px, cy = ay + dy * t - py;
    return Math.sqrt(cx * cx + cy * cy);
  }

  function Engine(planCanvas, inkCanvas, hooks) {
    var self = this, CELL = 24;
    var planCtx = planCanvas.getContext('2d');
    var inkCtx = inkCanvas.getContext('2d');
    var plan = null, strokes = [], cur = null, st = null, lastPt = null;
    var covered = null, coveredCount = 0, grid = null, nearLen = 0, totalLen = 0, dpr = 1;
    hooks = hooks || {};

    function setupSize(W, H) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      [planCanvas, inkCanvas].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
      planCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildGrid() {
      grid = {};
      plan.samples.forEach(function (s, i) {
        var k = Math.floor(s.x / CELL) + ',' + Math.floor(s.y / CELL);
        (grid[k] = grid[k] || []).push(i);
      });
    }

    /* indices des échantillons proches d'un segment (via la grille) */
    function candidates(ax, ay, bx, by, r) {
      var x0 = Math.floor((Math.min(ax, bx) - r) / CELL), x1 = Math.floor((Math.max(ax, bx) + r) / CELL);
      var y0 = Math.floor((Math.min(ay, by) - r) / CELL), y1 = Math.floor((Math.max(ay, by) + r) / CELL);
      var out = [];
      for (var gx = x0; gx <= x1; gx++) for (var gy = y0; gy <= y1; gy++) {
        var cell = grid[gx + ',' + gy];
        if (cell) for (var i = 0; i < cell.length; i++) out.push(cell[i]);
      }
      return out;
    }

    function tol(f, scale) {
      var P = FS.CONFIG.plan;
      return Math.max(12, P.tolerance * 0.6 + f.w * scale * 0.45);
    }

    function track(f, scale, a, b) {
      if (!plan) return;
      var r = tol(f, scale), s = plan.samples, i, c;
      c = candidates(a.x, a.y, b.x, b.y, r);
      for (i = 0; i < c.length; i++) {
        var idx = c[i];
        if (!covered[idx] && distPointSeg(s[idx].x, s[idx].y, a.x, a.y, b.x, b.y) <= r) { covered[idx] = 1; coveredCount++; }
      }
      var len = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
      if (len > 0) {
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, near = false, r2 = r * 1.6;
        c = candidates(mx, my, mx, my, r2);
        for (i = 0; i < c.length; i++) {
          var dx = s[c[i]].x - mx, dy = s[c[i]].y - my;
          if (dx * dx + dy * dy <= r2 * r2) { near = true; break; }
        }
        totalLen += len; if (near) nearLen += len;
      }
    }

    function resetTracking() {
      covered = new Uint8Array(plan ? plan.samples.length : 0);
      coveredCount = 0; nearLen = 0; totalLen = 0;
    }

    function notify() { if (hooks.onProgress) hooks.onProgress(self.coverage(), self.precision()); }

    function redrawAll() {
      inkCtx.clearRect(0, 0, plan.W, plan.H);
      resetTracking();
      strokes.forEach(function (s) {
        var f = FS.fluoById(s.id);
        FS.Strokes.drawPath(inkCtx, f, s.pts, s.scale);
        for (var i = 1; i < s.pts.length; i++) track(f, s.scale, s.pts[i - 1], s.pts[i]);
        if (s.pts.length === 1) track(f, s.scale, s.pts[0], s.pts[0]);
      });
    }

    /* ---------- API publique ---------- */
    this.setPlan = function (p) {
      plan = p; strokes = []; cur = null;
      setupSize(p.W, p.H);
      FS.Plans.render(planCtx, p);
      buildGrid(); resetTracking();
      inkCtx.clearRect(0, 0, p.W, p.H);
      notify();
    };
    this.plan = function () { return plan; };
    this.coverage = function () { return plan && plan.samples.length ? coveredCount / plan.samples.length : 0; };
    this.precision = function () { return totalLen > 0 ? nearLen / totalLen : 0; };
    this.strokeCount = function () { return strokes.length; };
    this.undo = function () { if (!strokes.length) return false; strokes.pop(); redrawAll(); notify(); if (hooks.onStroke) hooks.onStroke(); return true; };
    this.clear = function () { strokes = []; redrawAll(); notify(); if (hooks.onStroke) hooks.onStroke(); };
    this.getStrokes = function () { return strokes; };
    this.restore = function (arr) { strokes = arr || []; redrawAll(); notify(); };

    this.toBlob = function (cb) {
      var c = document.createElement('canvas');
      c.width = planCanvas.width; c.height = planCanvas.height;
      var x = c.getContext('2d');
      x.drawImage(planCanvas, 0, 0);
      x.globalCompositeOperation = 'multiply';
      x.drawImage(inkCanvas, 0, 0);
      c.toBlob(cb, 'image/png');
    };

    /* ---------- pointeur (souris, doigt, stylet) ---------- */
    function toPlan(e) {
      var r = inkCanvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * plan.W) / r.width, y: ((e.clientY - r.top) * plan.H) / r.height };
    }

    inkCanvas.addEventListener('pointerdown', function (e) {
      if (!plan || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      try { inkCanvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var f = FS.fluoById(FS.State.get().selected), scale = FS.State.get().brush;
      cur = { id: f.id, scale: scale, pts: [] };
      st = FS.Strokes.begin();
      var p = toPlan(e);
      cur.pts.push(p); lastPt = p;
      FS.Strokes.segment(inkCtx, f, p, p, st, scale);
      track(f, scale, p, p);
      notify();
    });

    inkCanvas.addEventListener('pointermove', function (e) {
      if (!cur) return;
      e.preventDefault();
      var f = FS.fluoById(cur.id), evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!evs.length) evs = [e];
      for (var i = 0; i < evs.length; i++) {
        var p = toPlan(evs[i]), dx = p.x - lastPt.x, dy = p.y - lastPt.y;
        if (dx * dx + dy * dy < 2.25) continue;           // ignore < 1,5 px
        cur.pts.push(p);
        FS.Strokes.segment(inkCtx, f, lastPt, p, st, cur.scale);
        track(f, cur.scale, lastPt, p);
        lastPt = p;
      }
      notify();
    });

    function end() {
      if (!cur) return;
      FS.Strokes.finish(inkCtx, FS.fluoById(cur.id), st);
      strokes.push(cur); cur = null;
      if (hooks.onStroke) hooks.onStroke();
      notify();
    }
    inkCanvas.addEventListener('pointerup', end);
    inkCanvas.addEventListener('pointercancel', end);
    inkCanvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  FS.Engine = Engine;
})();
