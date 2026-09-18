/* Palette Forge — palette generation, locking, copying, saving */
(function () {
  "use strict";

  var SWATCH_COUNT = 5;
  var STORAGE_KEY = "palette-forge:saved";

  var swatchesEl = document.getElementById("swatches");
  var regenBtn = document.getElementById("regenBtn");
  var saveForm = document.getElementById("saveForm");
  var paletteNameInput = document.getElementById("paletteName");
  var savedListEl = document.getElementById("savedList");
  var emptyNoteEl = document.getElementById("emptyNote");
  var toastEl = document.getElementById("toast");

  // Current palette state: array of { hex, locked }
  var palette = [];

  /* ---------- Color math ---------- */

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    function toHex(v) {
      var n = Math.round((v + m) * 255);
      return (n < 16 ? "0" : "") + n.toString(16);
    }
    return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  }

  // Hue offset patterns for each scheme; index i -> hue delta for swatch i
  var SCHEMES = [
    { name: "analogous", offsets: [0, 28, -28, 55, -55] },
    { name: "analogous-wide", offsets: [0, 40, -40, 75, -75] },
    { name: "complementary", offsets: [0, 180, 30, 210, -30] },
    { name: "split", offsets: [0, 150, 210, 30, -30] },
    { name: "triadic", offsets: [0, 120, 240, 60, 300] },
    { name: "monotone", offsets: [0, 12, -12, 24, -24] }
  ];

  function generatePalette() {
    var base = rand(0, 360);
    var scheme = SCHEMES[Math.floor(Math.random() * SCHEMES.length)];
    // Lightness ramp keeps the set readable and varied: dark anchors to light accents
    var lightnessPlan = shuffle([rand(22, 34), rand(34, 48), rand(48, 60), rand(58, 70), rand(68, 80)]);
    var out = [];
    for (var i = 0; i < SWATCH_COUNT; i++) {
      var hue = base + scheme.offsets[i] + rand(-8, 8);
      var sat = scheme.name === "monotone" ? rand(25, 55) : rand(38, 82);
      var light = Math.max(14, Math.min(88, lightnessPlan[i] + rand(-6, 6)));
      out.push(hslToHex(hue, sat, light));
    }
    return out;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Readable text color for a swatch background (WCAG-ish contrast)
  function textOn(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#1a1d26" : "#f5f7fb";
  }

  /* ---------- Rendering ---------- */

  function render() {
    swatchesEl.innerHTML = "";
    palette.forEach(function (color, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch" + (color.locked ? " locked" : "");
      btn.style.backgroundColor = color.hex;
      btn.style.color = textOn(color.hex);
      btn.setAttribute("aria-label", "Copy " + color.hex + (color.locked ? " (locked)" : ""));

      var hexLabel = document.createElement("span");
      hexLabel.className = "hex";
      hexLabel.textContent = color.hex;
      btn.appendChild(hexLabel);

      var lockBtn = document.createElement("button");
      lockBtn.type = "button";
      lockBtn.className = "lock-btn";
      lockBtn.textContent = color.locked ? "\uD83D\uDD12" : "\uD83D\uDD13";
      lockBtn.setAttribute("aria-label", color.locked ? "Unlock color " + color.hex : "Lock color " + color.hex);
      lockBtn.setAttribute("aria-pressed", color.locked ? "true" : "false");
      lockBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleLock(i);
      });
      btn.appendChild(lockBtn);

      btn.addEventListener("click", function () {
        copyHex(color.hex);
      });

      swatchesEl.appendChild(btn);
    });
  }

  function toggleLock(i) {
    palette[i].locked = !palette[i].locked;
    render();
  }

  function regenerate() {
    var fresh = generatePalette();
    for (var i = 0; i < SWATCH_COUNT; i++) {
      if (!palette[i] || !palette[i].locked) {
        palette[i] = { hex: fresh[i], locked: false };
      }
    }
    render();
  }

  /* ---------- Clipboard ---------- */

  function copyHex(hex) {
    function done() {
      showToast("Copied " + hex);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hex).then(done, function () {
        fallbackCopy(hex, done);
      });
    } else {
      fallbackCopy(hex, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand("copy")) {
        done();
      } else {
        showToast("Copy failed — " + text);
      }
    } catch (e) {
      showToast("Copy failed — " + text);
    }
    document.body.removeChild(ta);
  }

  /* ---------- Toast ---------- */

  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 1800);
  }

  /* ---------- Saved palettes ---------- */

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function persistSaved(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      showToast("Could not save — storage unavailable");
    }
  }

  function renderSaved() {
    var list = loadSaved();
    savedListEl.innerHTML = "";
    emptyNoteEl.style.display = list.length ? "none" : "";

    list.forEach(function (entry, idx) {
      var li = document.createElement("li");
      li.className = "saved-item";

      var strip = document.createElement("div");
      strip.className = "saved-strip";
      entry.colors.forEach(function (hex) {
        var s = document.createElement("span");
        s.style.backgroundColor = hex;
        s.title = hex;
        strip.appendChild(s);
      });
      li.appendChild(strip);

      var name = document.createElement("span");
      name.className = "saved-name";
      name.textContent = entry.name;
      li.appendChild(name);

      var actions = document.createElement("div");
      actions.className = "saved-actions";

      var applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "link-btn";
      applyBtn.textContent = "Apply";
      applyBtn.setAttribute("aria-label", "Apply palette " + entry.name);
      applyBtn.addEventListener("click", function () {
        applyPalette(entry);
      });
      actions.appendChild(applyBtn);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "link-btn danger";
      delBtn.textContent = "Delete";
      delBtn.setAttribute("aria-label", "Delete palette " + entry.name);
      delBtn.addEventListener("click", function () {
        deletePalette(idx);
      });
      actions.appendChild(delBtn);

      li.appendChild(actions);
      savedListEl.appendChild(li);
    });
  }

  function saveCurrent(name) {
    var list = loadSaved();
    list.unshift({
      name: name,
      colors: palette.map(function (c) { return c.hex; }),
      savedAt: Date.now()
    });
    persistSaved(list);
    renderSaved();
    showToast("Saved “" + name + "”");
  }

  function applyPalette(entry) {
    for (var i = 0; i < SWATCH_COUNT; i++) {
      palette[i] = { hex: entry.colors[i] || "#000000", locked: false };
    }
    render();
    showToast("Applied “" + entry.name + "”");
  }

  function deletePalette(idx) {
    var list = loadSaved();
    var removed = list.splice(idx, 1)[0];
    persistSaved(list);
    renderSaved();
    if (removed) showToast("Deleted “" + removed.name + "”");
  }

  /* ---------- Events ---------- */

  regenBtn.addEventListener("click", regenerate);

  saveForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = paletteNameInput.value.trim();
    if (!name) {
      showToast("Give the palette a name first");
      paletteNameInput.focus();
      return;
    }
    saveCurrent(name);
    paletteNameInput.value = "";
  });

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || (e.target && e.target.isContentEditable);
    if (e.code === "Space" && !typing) {
      e.preventDefault(); // avoid scrolling / button re-trigger
      regenerate();
    }
  });

  /* ---------- Init ---------- */

  palette = generatePalette().map(function (hex) {
    return { hex: hex, locked: false };
  });
  render();
  renderSaved();
})();
