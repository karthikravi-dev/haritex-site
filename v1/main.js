/* Hari Tex v1 — loom, navigation and quote form. No dependencies. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     HEADER + MENU
  ------------------------------------------------------------ */
  var header = document.querySelector('.site-header');
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Highlight the section currently in view
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]:not(.btn)'));
  if ('IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && byId[en.target.id]) {
          links.forEach(function (a) { a.classList.remove('is-current'); });
          byId[en.target.id].classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------
     THE LOOM — plain weave drawn thread by thread
  ------------------------------------------------------------ */
  var canvas = document.getElementById('loomCanvas');
  if (canvas && canvas.getContext) initLoom(canvas);

  function initLoom(canvas) {
    var ctx = canvas.getContext('2d');
    var C = {
      indigo: '#2a3a72', indigoLight: '#3e5590', ecru: '#efe9dc', madder: '#9b2f28',
      turmeric: '#d49a1e', white: '#f4f1ea', chambrayWeft: '#e9e6df'
    };
    var PATTERNS = {
      check: {
        warp: function (i) { return (i % 14) < 8 ? C.indigo : C.ecru; },
        weft: function (j) { return (j % 14) < 8 ? C.indigo : C.ecru; }
      },
      chambray: {
        warp: function () { return C.indigoLight; },
        weft: function () { return C.chambrayWeft; }
      },
      stripe: {
        warp: function (i) {
          var seq = [C.ecru, C.ecru, C.ecru, C.ecru, C.ecru, C.ecru, C.madder, C.madder, C.ecru, C.indigo, C.ecru, C.ecru, C.turmeric, C.ecru, C.ecru, C.ecru, C.madder, C.madder];
          return seq[i % seq.length];
        },
        weft: function () { return C.ecru; }
      }
    };

    var state = {
      pattern: 'check', W: 0, H: 0, dpr: 1, t: 8,
      cols: 0, rows: 0, x0: 0, clothBottom: 0, beamH: 0, breastH: 0,
      done: 0, rowProgress: 0, raf: 0, last: 0, cloth: null, sprites: {}
    };

    /* sprites: one shaded cell per colour + orientation */
    function shade(hex, amt) {
      var n = parseInt(hex.slice(1), 16);
      var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      var f = function (c) { return Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))); };
      return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
    }
    function sprite(color, vertical) {
      var key = color + (vertical ? 'v' : 'h');
      if (state.sprites[key]) return state.sprites[key];
      var t = state.t, d = state.dpr;
      var c = document.createElement('canvas');
      c.width = c.height = Math.ceil(t * d);
      var g = c.getContext('2d');
      g.scale(d, d);
      var inset = t * 0.12;
      // thickness gradient (round yarn)
      var grad = vertical ? g.createLinearGradient(inset, 0, t - inset, 0) : g.createLinearGradient(0, inset, 0, t - inset);
      grad.addColorStop(0, shade(color, -0.28));
      grad.addColorStop(0.38, shade(color, 0.18));
      grad.addColorStop(0.62, color);
      grad.addColorStop(1, shade(color, -0.32));
      g.fillStyle = grad;
      if (vertical) g.fillRect(inset, 0, t - inset * 2, t); else g.fillRect(0, inset, t, t - inset * 2);
      // ends dive under the crossing thread
      var end = vertical ? g.createLinearGradient(0, 0, 0, t) : g.createLinearGradient(0, 0, t, 0);
      end.addColorStop(0, 'rgba(0,0,0,.30)');
      end.addColorStop(0.22, 'rgba(0,0,0,0)');
      end.addColorStop(0.78, 'rgba(0,0,0,0)');
      end.addColorStop(1, 'rgba(0,0,0,.30)');
      g.fillStyle = end;
      if (vertical) g.fillRect(inset, 0, t - inset * 2, t); else g.fillRect(0, inset, t, t - inset * 2);
      // fibre twist hint
      g.strokeStyle = 'rgba(255,255,255,.10)';
      g.lineWidth = 0.6;
      g.beginPath();
      if (vertical) { g.moveTo(inset + 1, t * 0.2); g.lineTo(t - inset - 1, t * 0.55); }
      else { g.moveTo(t * 0.2, inset + 1); g.lineTo(t * 0.55, t - inset - 1); }
      g.stroke();
      state.sprites[key] = c;
      return c;
    }

    function layout() {
      var rect = canvas.getBoundingClientRect();
      state.W = Math.max(200, rect.width);
      state.H = Math.max(200, rect.height);
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(state.W * state.dpr);
      canvas.height = Math.round(state.H * state.dpr);
      state.t = state.W < 420 ? 7 : 8;
      state.sprites = {};
      state.cols = Math.floor((state.W - 8) / state.t);
      state.x0 = (state.W - state.cols * state.t) / 2;
      state.beamH = Math.round(state.H * 0.055) + 6;
      state.breastH = Math.round(state.H * 0.06) + 6;
      state.clothBottom = state.H - state.breastH;
      var usable = state.clothBottom - state.beamH;
      state.rows = Math.floor((usable * 0.74) / state.t);
      state.cloth = document.createElement('canvas');
      state.cloth.width = canvas.width;
      state.cloth.height = canvas.height;
    }

    function cellY(r) { return state.clothBottom - (r + 1) * state.t; }

    function drawCell(g, i, r, pat) {
      var t = state.t, x = state.x0 + i * t, y = cellY(r);
      var warpC = pat.warp(i), weftC = pat.weft(r);
      var warpOnTop = ((i + r) & 1) === 0;
      g.fillStyle = shade(warpOnTop ? weftC : warpC, -0.28);
      g.fillRect(x, y, t, t);
      g.drawImage(sprite(warpOnTop ? warpC : weftC, warpOnTop), x, y, t, t);
    }

    function drawRowInto(g, r, upToCol, pat) {
      for (var i = 0; i < upToCol; i++) drawCell(g, i, r, pat);
    }

    function wood(g, y, h) {
      var grd = g.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, '#8a5d3d');
      grd.addColorStop(0.35, '#a7754e');
      grd.addColorStop(1, '#4e311f');
      g.fillStyle = grd;
      g.fillRect(0, y, state.W, h);
      g.fillStyle = 'rgba(255,255,255,.08)';
      for (var k = 0; k < 4; k++) g.fillRect(0, y + h * (0.25 + k * 0.17), state.W, 0.7);
    }

    function render() {
      var g = ctx, d = state.dpr, t = state.t, pat = PATTERNS[state.pattern];
      g.setTransform(d, 0, 0, d, 0, 0);
      g.clearRect(0, 0, state.W, state.H);

      var fellY = state.clothBottom - state.done * t;
      var reedY = Math.max(state.beamH + 6, fellY - t * 2.2);

      // shadowed backdrop behind the open warp, for depth
      var back = g.createLinearGradient(0, state.beamH, 0, fellY);
      back.addColorStop(0, 'rgba(60,45,30,.28)');
      back.addColorStop(1, 'rgba(60,45,30,.10)');
      g.fillStyle = back;
      g.fillRect(0, state.beamH, state.W, fellY - state.beamH);

      // open warp: beam to fell
      for (var i = 0; i < state.cols; i++) {
        var x = state.x0 + i * t, c = pat.warp(i);
        var w = t * 0.62, ox = x + (t - w) / 2;
        var grd = g.createLinearGradient(ox, 0, ox + w, 0);
        grd.addColorStop(0, shade(c, -0.3)); grd.addColorStop(0.45, shade(c, 0.12)); grd.addColorStop(1, shade(c, -0.35));
        g.fillStyle = grd;
        // raised and lowered sheds: alternate warps sit slightly apart near the reed
        g.fillRect(ox + ((i & 1) ? 0.3 : -0.3), state.beamH, w, fellY - state.beamH);
      }

      // finished cloth
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(state.cloth, 0, 0);
      g.setTransform(d, 0, 0, d, 0, 0);

      // row in progress
      var shuttleX = null;
      if (state.done < state.rows) {
        var r = state.done;
        var p = state.rowProgress;
        var ltr = (r & 1) === 0;
        var n = Math.floor(p * state.cols);
        for (var k = 0; k < n; k++) drawCell(g, ltr ? k : state.cols - 1 - k, r, pat);
        shuttleX = ltr ? state.x0 + p * state.cols * t : state.x0 + (1 - p) * state.cols * t;
      }

      // reed (beater) with dents
      g.fillStyle = 'rgba(46,42,38,.82)';
      g.fillRect(0, reedY, state.W, 4);
      g.fillRect(0, reedY + t * 1.4, state.W, 3);
      g.fillStyle = 'rgba(200,196,188,.55)';
      for (var dnt = 0; dnt <= state.cols; dnt++) g.fillRect(state.x0 + dnt * t - 0.3, reedY + 4, 0.6, t * 1.4 - 4);

      // shuttle
      if (shuttleX !== null) drawShuttle(g, shuttleX, cellY(state.done) + t / 2, pat.weft(state.done), (state.done & 1) === 0);

      // beams
      wood(g, 0, state.beamH);
      wood(g, state.clothBottom, state.breastH);
      // soft light from top-left
      var light = g.createRadialGradient(state.W * 0.2, state.H * 0.1, 10, state.W * 0.3, state.H * 0.3, state.W * 1.1);
      light.addColorStop(0, 'rgba(255,248,230,.10)');
      light.addColorStop(1, 'rgba(20,16,10,.16)');
      g.fillStyle = light;
      g.fillRect(0, 0, state.W, state.H);
    }

    function drawShuttle(g, x, y, yarn, ltr) {
      var L = 58, Hh = 13;
      g.save();
      g.translate(x, y);
      if (!ltr) g.scale(-1, 1);
      g.translate(-L * 0.35, 0);
      g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3;
      g.beginPath();
      g.moveTo(L / 2, 0);
      g.quadraticCurveTo(L * 0.28, -Hh / 2, 0, -Hh / 2);
      g.lineTo(-L * 0.3, -Hh / 2);
      g.quadraticCurveTo(-L * 0.48, -Hh / 2, -L / 2, 0);
      g.quadraticCurveTo(-L * 0.48, Hh / 2, -L * 0.3, Hh / 2);
      g.lineTo(0, Hh / 2);
      g.quadraticCurveTo(L * 0.28, Hh / 2, L / 2, 0);
      var grd = g.createLinearGradient(0, -Hh / 2, 0, Hh / 2);
      grd.addColorStop(0, '#c08a5c'); grd.addColorStop(0.5, '#93633f'); grd.addColorStop(1, '#5a3a23');
      g.fillStyle = grd;
      g.fill();
      g.shadowColor = 'transparent';
      // pirn of yarn in the slot
      g.fillStyle = '#3a2416';
      g.fillRect(-L * 0.24, -Hh * 0.24, L * 0.42, Hh * 0.48);
      g.fillStyle = yarn;
      g.fillRect(-L * 0.21, -Hh * 0.18, L * 0.36, Hh * 0.36);
      g.fillStyle = 'rgba(0,0,0,.18)';
      for (var s = 0; s < 6; s++) g.fillRect(-L * 0.21 + s * L * 0.06, -Hh * 0.18, 0.7, Hh * 0.36);
      g.restore();
    }

    function commitRow(r) {
      var g = state.cloth.getContext('2d');
      g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      drawRowInto(g, r, state.cols, PATTERNS[state.pattern]);
    }

    function finishAll() {
      while (state.done < state.rows) { commitRow(state.done); state.done++; }
      state.rowProgress = 0;
      render();
    }

    var ROW_MS = 52;
    function tick(now) {
      if (!state.last) state.last = now;
      var dt = Math.min(64, now - state.last);
      state.last = now;
      state.rowProgress += dt / ROW_MS;
      while (state.rowProgress >= 1 && state.done < state.rows) {
        commitRow(state.done);
        state.done++;
        state.rowProgress -= 1;
      }
      render();
      if (state.done < state.rows) state.raf = requestAnimationFrame(tick);
      else { state.rowProgress = 0; render(); state.raf = 0; }
    }

    function weave(animate) {
      cancelAnimationFrame(state.raf);
      state.raf = 0; state.last = 0;
      layout();
      state.done = 0; state.rowProgress = 0;
      if (!animate || reduceMotion) { finishAll(); return; }
      // a few rows already on the loom, so it never starts blank
      for (var k = 0; k < 6; k++) { commitRow(state.done); state.done++; }
      state.raf = requestAnimationFrame(tick);
    }

    // start when the loom is visible
    var started = false;
    function start() { if (!started) { started = true; weave(true); } }
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { start(); obs.disconnect(); } }, { threshold: 0.25 });
      obs.observe(canvas);
    } else start();
    // draw a still frame immediately, in case animation is delayed
    layout();
    if (reduceMotion) finishAll();
    else { for (var k0 = 0; k0 < 6; k0++) { commitRow(state.done); state.done++; } render(); }

    // resize: redraw finished cloth without animating
    var rT, lastW = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        var w = canvas.getBoundingClientRect().width;
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        if (started) weave(false);
      }, 150);
    });
    lastW = canvas.getBoundingClientRect().width;

    // pattern buttons
    Array.prototype.forEach.call(document.querySelectorAll('.pat'), function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.pat').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        state.pattern = btn.dataset.pattern;
        started = true;
        weave(true);
      });
    });
  }

  /* ------------------------------------------------------------
     QUOTE FORM — composes an email or WhatsApp message
     (works on static hosting, no server needed)
  ------------------------------------------------------------ */
  var form = document.getElementById('quoteForm');
  if (!form) return;
  var errBox = document.getElementById('formError');
  var doneBox = document.getElementById('formDone');
  var lastVia = 'email';
  form.querySelectorAll('button[type="submit"]').forEach(function (b) {
    b.addEventListener('click', function () { lastVia = b.dataset.via; });
  });

  var LABELS = {
    'q-company': 'company name', 'q-person': 'contact person', 'q-email': 'business email',
    'q-fabric': 'fabric type', 'q-qty': 'required quantity'
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var via = (e.submitter && e.submitter.dataset.via) || lastVia;
    var missing = [], firstBad = null;

    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) { missing.push(LABELS[el.id] || el.name); if (!firstBad) firstBad = el; }
    });

    if (missing.length) {
      var list = missing.length > 1 ? missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1] : missing[0];
      errBox.textContent = 'Add your ' + list + ' so we can prepare a quote.';
      errBox.hidden = false;
      doneBox.hidden = true;
      firstBad.focus();
      return;
    }
    errBox.hidden = true;

    var lines = [];
    var certs = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === 'submit') return;
      if (el.type === 'checkbox') { if (el.checked) certs.push(el.value); return; }
      var v = el.value.trim();
      if (!v) return;
      lines.push(el.name + ': ' + v);
    });
    if (certs.length) {
      var idx = lines.findIndex(function (l) { return l.indexOf('Fabric type:') === 0; });
      lines.splice(idx + 1, 0, 'Certification requirement: ' + certs.join(', '));
    }

    var company = document.getElementById('q-company').value.trim();
    var fabric = document.getElementById('q-fabric').value.trim();
    var intro = 'Hello Hari Tex,\n\nI would like a quote for the following:\n\n';
    var outro = '\n\n(Spec sheets / photos attached if available.)';
    var body = intro + lines.join('\n') + outro;

    if (via === 'whatsapp') {
      window.open('https://wa.me/919362244660?text=' + encodeURIComponent(body), '_blank', 'noopener');
    } else {
      var subject = 'Quote request: ' + fabric + ' – ' + company;
      window.location.href = 'mailto:haritexwoven@gmail.com?cc=hariprasad@haritex.net&subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }
    doneBox.textContent = via === 'whatsapp'
      ? 'Your enquiry is ready in WhatsApp. Press send there to reach us.'
      : 'Your enquiry is ready in your email app. Attach any spec sheets and press send.';
    doneBox.hidden = false;
  });

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false');
  });
})();
