(function () {
  "use strict";

  function toast(msg, isError) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast" + (isError ? " error" : "");
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 3000);
  }

  async function api(url, opts) {
    opts = opts || {};
    var res = await fetch(url, opts);
    if (!res.ok) {
      var body = {};
      try { body = await res.json(); } catch (e) {}
      throw new Error(body.error || ("HTTP " + res.status));
    }
    var ct = res.headers.get("content-type") || "";
    return ct.indexOf("application/json") !== -1 ? res.json() : null;
  }

  // ---------- Tabs ----------
  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });

  var LANGS = [["ru", "RU"], ["kz", "KZ"], ["en", "EN"], ["zh", "ZH"]];

  // ---------- Text tab ----------
  async function loadText() {
    var container = document.getElementById("text-sections");
    container.innerHTML = "Жүктелуде…";
    var manifest = await api("/admin/api/manifest");
    var content = await api("/admin/api/content");
    container.innerHTML = "";

    manifest.sections.forEach(function (sectionLabel, idx) {
      var keys = manifest.grouped[sectionLabel];
      var block = document.createElement("div");
      block.className = "section-block";

      var head = document.createElement("div");
      head.className = "section-head";
      head.innerHTML = "<span>" + sectionLabel + " (" + keys.length + ")</span><span class=\"toggle\">" + (idx === 0 ? "▾" : "▸") + "</span>";
      block.appendChild(head);

      var body = document.createElement("div");
      body.className = "section-body" + (idx === 0 ? "" : " collapsed");

      keys.forEach(function (key) {
        var row = document.createElement("div");
        row.className = "key-row";
        var vals = content[key] || { ru: "", kz: "", en: "", zh: "" };

        var nameEl = document.createElement("div");
        nameEl.className = "key-name";
        nameEl.textContent = key;
        row.appendChild(nameEl);

        var grid = document.createElement("div");
        grid.className = "lang-grid";
        var textareas = {};
        LANGS.forEach(function (pair) {
          var code = pair[0], label = pair[1];
          var field = document.createElement("div");
          field.className = "lang-field";
          var lab = document.createElement("label");
          lab.textContent = label;
          var ta = document.createElement("textarea");
          ta.value = vals[code] || "";
          ta.addEventListener("input", function () { row.classList.add("dirty"); });
          field.appendChild(lab);
          field.appendChild(ta);
          grid.appendChild(field);
          textareas[code] = ta;
        });
        row.appendChild(grid);

        var saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-primary btn-sm";
        saveBtn.textContent = "Сақтау";
        saveBtn.addEventListener("click", async function () {
          var payload = {
            ru: textareas.ru.value, kz: textareas.kz.value,
            en: textareas.en.value, zh: textareas.zh.value,
          };
          try {
            await api("/admin/api/content/" + encodeURIComponent(key), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            row.classList.remove("dirty");
            toast("Сақталды: " + key);
          } catch (e) { toast("Қате: " + e.message, true); }
        });
        row.appendChild(saveBtn);

        body.appendChild(row);
      });

      head.addEventListener("click", function () { body.classList.toggle("collapsed"); head.querySelector(".toggle").textContent = body.classList.contains("collapsed") ? "▸" : "▾"; });

      block.appendChild(body);
      container.appendChild(block);
    });
  }

  // ---------- Media tab ----------
  async function loadMedia() {
    var grid = document.getElementById("media-grid");
    grid.innerHTML = "Жүктелуде…";
    var items = await api("/admin/api/media");
    grid.innerHTML = "";
    items.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "media-card";
      card.innerHTML =
        '<img src="' + item.url + '" alt="">' +
        '<div class="media-card-body">' +
        '<div class="media-card-label">' + item.label + "</div>" +
        '<div class="media-card-section">' + item.section + "</div>" +
        '<input type="file" accept="image/*,video/*">' +
        '<button class="btn btn-ghost btn-sm" data-act="reset" style="margin-top:.5rem;width:100%">Әдепкіге қайтару</button>' +
        "</div>";
      var fileInput = card.querySelector("input[type=file]");
      var img = card.querySelector("img");
      fileInput.addEventListener("change", async function () {
        if (!fileInput.files[0]) return;
        var fd = new FormData();
        fd.append("file", fileInput.files[0]);
        try {
          var out = await api("/admin/api/media/" + item.key, { method: "POST", body: fd });
          img.src = out.url + "?t=" + Date.now();
          toast("Ауыстырылды: " + item.label);
        } catch (e) { toast("Қате: " + e.message, true); }
      });
      card.querySelector('[data-act="reset"]').addEventListener("click", async function () {
        if (!confirm("Әдепкі фотоға қайтару керек пе?")) return;
        try {
          var out = await api("/admin/api/media/" + item.key, { method: "DELETE" });
          img.src = out.url + "?t=" + Date.now();
          toast("Әдепкіге қайтарылды: " + item.label);
        } catch (e) { toast("Қате: " + e.message, true); }
      });
      grid.appendChild(card);
    });
  }

  // ---------- Gallery tab ----------
  async function loadGallery() {
    var list = document.getElementById("gallery-list");
    list.innerHTML = "Жүктелуде…";
    var items = await api("/admin/api/gallery");
    list.innerHTML = "";
    items.forEach(function (item) { list.appendChild(galleryCard(item)); });
  }

  function galleryCard(item) {
    var card = document.createElement("div");
    card.className = "gallery-card";
    card.dataset.id = item.id;
    card.innerHTML =
      '<img src="' + item.url + '" alt="">' +
      '<div class="gallery-card-body">' +
      '<input type="text" value="' + (item.caption || "").replace(/"/g, "&quot;") + '" placeholder="Атауы">' +
      '<div class="gallery-card-actions">' +
      '<button class="btn btn-ghost btn-sm" data-act="up">↑</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="down">↓</button>' +
      '<button class="btn btn-danger btn-sm" data-act="del">Өшіру</button>' +
      "</div></div>";

    var captionInput = card.querySelector("input[type=text]");
    captionInput.addEventListener("change", async function () {
      try {
        await api("/admin/api/gallery/" + item.id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: captionInput.value }),
        });
        toast("Сақталды");
      } catch (e) { toast("Қате: " + e.message, true); }
    });

    card.querySelector('[data-act="del"]').addEventListener("click", async function () {
      if (!confirm("Осы фотоны өшіру керек пе?")) return;
      try {
        await api("/admin/api/gallery/" + item.id, { method: "DELETE" });
        card.remove();
        toast("Өшірілді");
      } catch (e) { toast("Қате: " + e.message, true); }
    });

    card.querySelector('[data-act="up"]').addEventListener("click", function () {
      var prev = card.previousElementSibling;
      if (prev) card.parentNode.insertBefore(card, prev);
      persistGalleryOrder();
    });
    card.querySelector('[data-act="down"]').addEventListener("click", function () {
      var next = card.nextElementSibling;
      if (next) card.parentNode.insertBefore(next, card);
      persistGalleryOrder();
    });

    return card;
  }

  async function persistGalleryOrder() {
    var ids = Array.prototype.map.call(document.querySelectorAll(".gallery-card"), function (c) { return Number(c.dataset.id); });
    try {
      await api("/admin/api/gallery-reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ids }),
      });
    } catch (e) { toast("Қате: " + e.message, true); }
  }

  document.getElementById("gallery-add-btn").addEventListener("click", async function () {
    var fileInput = document.getElementById("gallery-file");
    var captionInput = document.getElementById("gallery-caption");
    if (!fileInput.files[0]) { toast("Файл таңдаңыз", true); return; }
    var fd = new FormData();
    fd.append("file", fileInput.files[0]);
    fd.append("caption", captionInput.value || "");
    try {
      var item = await api("/admin/api/gallery", { method: "POST", body: fd });
      document.getElementById("gallery-list").appendChild(galleryCard(item));
      fileInput.value = "";
      captionInput.value = "";
      toast("Қосылды");
    } catch (e) { toast("Қате: " + e.message, true); }
  });

  // ---------- Video reviews tab ----------
  async function loadVideoReviews() {
    var list = document.getElementById("video-list");
    list.innerHTML = "Жүктелуде…";
    var items = await api("/admin/api/video-reviews");
    list.innerHTML = "";
    items.forEach(function (item) { list.appendChild(videoCard(item)); });
  }

  function videoCard(item) {
    var card = document.createElement("div");
    card.className = "video-card";
    card.dataset.id = item.id;
    card.innerHTML =
      '<img src="' + item.thumbUrl + '" alt="">' +
      '<span class="video-badge' + (item.videoUrl ? "" : " empty") + '">' + (item.videoUrl ? "Видео жүктелген" : "Видео жоқ (тек сурет)") + "</span>" +
      '<input type="text" value="' + (item.name || "").replace(/"/g, "&quot;") + '" placeholder="Қонақтың аты">' +
      '<label class="field-label">Thumbnail (сурет)</label>' +
      '<input type="file" accept="image/*" data-role="thumb">' +
      '<label class="field-label">Видео файл</label>' +
      '<input type="file" accept="video/*" data-role="video">' +
      '<button class="btn btn-danger btn-sm" data-act="del" style="margin-top:.4rem">Өшіру</button>';

    var nameInput = card.querySelector("input[type=text]");
    nameInput.addEventListener("change", async function () {
      try {
        await api("/admin/api/video-reviews/" + item.id + "/name", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nameInput.value }),
        });
        toast("Сақталды");
      } catch (e) { toast("Қате: " + e.message, true); }
    });

    var img = card.querySelector("img");
    card.querySelector('[data-role="thumb"]').addEventListener("change", async function (e) {
      if (!e.target.files[0]) return;
      var fd = new FormData();
      fd.append("thumb", e.target.files[0]);
      try {
        var out = await api("/admin/api/video-reviews/" + item.id + "/thumb", { method: "POST", body: fd });
        img.src = out.url + "?t=" + Date.now();
        toast("Сурет ауыстырылды");
      } catch (e2) { toast("Қате: " + e2.message, true); }
    });

    var badge = card.querySelector(".video-badge");
    card.querySelector('[data-role="video"]').addEventListener("change", async function (e) {
      if (!e.target.files[0]) return;
      var fd = new FormData();
      fd.append("video", e.target.files[0]);
      try {
        await api("/admin/api/video-reviews/" + item.id + "/video", { method: "POST", body: fd });
        badge.textContent = "Видео жүктелген";
        badge.classList.remove("empty");
        toast("Видео жүктелді");
      } catch (e2) { toast("Қате: " + e2.message, true); }
    });

    card.querySelector('[data-act="del"]').addEventListener("click", async function () {
      if (!confirm("Осы карточканы өшіру керек пе?")) return;
      try {
        await api("/admin/api/video-reviews/" + item.id, { method: "DELETE" });
        card.remove();
        toast("Өшірілді");
      } catch (e) { toast("Қате: " + e.message, true); }
    });

    return card;
  }

  document.getElementById("video-add-btn").addEventListener("click", async function () {
    var name = prompt("Қонақтың аты (міндетті емес):", "Гость отеля") || "Гость отеля";
    var fd = new FormData();
    fd.append("name", name);
    // 1x1 transparent placeholder is required by the API; ask for a real thumbnail via the card afterwards.
    var res = await fetch("https://placehold.co/400x700/F4F2EF/F4F2EF");
    var blob = await res.blob();
    fd.append("thumb", blob, "placeholder.png");
    try {
      var item = await api("/admin/api/video-reviews", { method: "POST", body: fd });
      document.getElementById("video-list").prepend(videoCard(item));
      toast("Карточка қосылды — енді сурет пен видео жүктеңіз");
    } catch (e) { toast("Қате: " + e.message, true); }
  });

  // ---------- Init ----------
  loadText();
  loadMedia();
  loadGallery();
  loadVideoReviews();
})();
