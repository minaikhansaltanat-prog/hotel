const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const multer = require("multer");

const { pool } = require("./lib/db");
const { checkCredentials, requireAuth } = require("./lib/auth");
const { renderPage } = require("./lib/render");
const { MEDIA_SLOTS, TEXT_SECTIONS, sectionFor } = require("./lib/manifest");
const { toPublicUrl } = require("./lib/media-url");
const { uploadBuffer, getObjectStream, deleteObject } = require("./lib/s3");
const content = require("./lib/content");

const STRINGS_DEFAULTS = require("./lib/defaults").STRINGS_DEFAULTS;

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(session({
  store: new pgSession({ pool, tableName: "admin_sessions", createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  name: "sico_admin_sid",
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 12, // 12h
  },
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB (covers short video clips)
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype) || /^video\//.test(file.mimetype)) return cb(null, true);
    cb(new Error("Тек фото немесе видео файлдарын жүктеуге болады"));
  },
});

// ---------- Public media proxy (streams bucket-hosted uploads) ----------
app.get("/media/uploads/*", async (req, res) => {
  const key = "uploads/" + req.params[0];
  try {
    const obj = await getObjectStream(key);
    res.setHeader("Content-Type", obj.ContentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    obj.Body.pipe(res);
  } catch (e) {
    res.status(404).send("Not found");
  }
});

// ---------- Admin: login ----------
app.get("/admin/login", (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect("/admin");
  res.sendFile(path.join(__dirname, "admin", "login.html"));
});

app.post("/admin/login", express.urlencoded({ extended: true }), (req, res) => {
  const { username, password } = req.body;
  if (checkCredentials(username, password)) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.redirect("/admin/login?error=1");
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// ---------- Admin: protected dashboard + API ----------
app.use("/admin", (req, res, next) => {
  if (req.path === "/login") return next();
  requireAuth(req, res, next);
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});
app.use("/admin/assets", express.static(path.join(__dirname, "admin", "assets")));

app.get("/admin/api/manifest", async (req, res) => {
  const strings = await content.getAllStrings(STRINGS_DEFAULTS);
  const grouped = {};
  for (const key of Object.keys(strings)) {
    const section = sectionFor(key);
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(key);
  }
  const order = TEXT_SECTIONS.map((s) => s.label).concat(["Басқа"]);
  res.json({ sections: order.filter((s) => grouped[s]), grouped });
});

app.get("/admin/api/content", async (req, res) => {
  try {
    const strings = await content.getAllStrings(STRINGS_DEFAULTS);
    res.json(strings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/admin/api/content/:key", async (req, res) => {
  try {
    await content.setString(req.params.key, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/admin/api/media", async (req, res) => {
  try {
    const stored = await content.getAllMedia();
    const out = MEDIA_SLOTS.map((slot) => ({
      key: slot.key,
      label: slot.label,
      section: slot.section,
      url: toPublicUrl(stored[slot.key] || slot.default),
    }));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/admin/api/media/:key", upload.single("file"), async (req, res) => {
  try {
    const slot = MEDIA_SLOTS.find((s) => s.key === req.params.key);
    if (!slot) return res.status(404).json({ error: "unknown slot" });
    if (!req.file) return res.status(400).json({ error: "no file" });
    const oldValue = await content.getMediaSlotOldValue(slot.key);
    const objectKey = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    await content.setMediaSlot(slot.key, objectKey);
    if (oldValue && oldValue.startsWith("uploads/")) {
      deleteObject(oldValue).catch(() => {});
    }
    res.json({ ok: true, url: toPublicUrl(objectKey) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/admin/api/media/:key", async (req, res) => {
  try {
    const slot = MEDIA_SLOTS.find((s) => s.key === req.params.key);
    if (!slot) return res.status(404).json({ error: "unknown slot" });
    const oldValue = await content.getMediaSlotOldValue(slot.key);
    await content.deleteMediaSlot(slot.key);
    if (oldValue && oldValue.startsWith("uploads/")) deleteObject(oldValue).catch(() => {});
    res.json({ ok: true, url: toPublicUrl(slot.default) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/admin/api/gallery", async (req, res) => {
  try {
    const items = await content.getGallery();
    res.json(items.map((i) => ({ id: i.id, caption: i.caption, url: toPublicUrl(i.url), sortOrder: i.sort_order })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/admin/api/gallery", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no file" });
    const objectKey = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    const row = await content.addGalleryItem(objectKey, req.body.caption || "");
    res.json({ id: row.id, caption: row.caption, url: toPublicUrl(row.url), sortOrder: row.sort_order });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/admin/api/gallery/:id", async (req, res) => {
  try {
    await content.updateGalleryCaption(req.params.id, req.body.caption || "");
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/admin/api/gallery-reorder", async (req, res) => {
  try {
    await content.reorderGallery(req.body.orderedIds || []);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/admin/api/gallery/:id", async (req, res) => {
  try {
    const oldUrl = await content.deleteGalleryItem(req.params.id);
    if (oldUrl && oldUrl.startsWith("uploads/")) deleteObject(oldUrl).catch(() => {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/admin/api/video-reviews", async (req, res) => {
  try {
    const items = await content.getVideoReviews();
    res.json(items.map((i) => ({
      id: i.id, name: i.name,
      thumbUrl: toPublicUrl(i.thumb_url),
      videoUrl: i.video_url ? toPublicUrl(i.video_url) : null,
      sortOrder: i.sort_order,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/admin/api/video-reviews", upload.single("thumb"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no thumbnail" });
    const objectKey = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    const row = await content.addVideoReview(req.body.name, objectKey);
    res.json({ id: row.id, name: row.name, thumbUrl: toPublicUrl(row.thumb_url), videoUrl: null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/admin/api/video-reviews/:id/name", async (req, res) => {
  try {
    await content.updateVideoReview(req.params.id, { name: req.body.name || "" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/admin/api/video-reviews/:id/thumb", upload.single("thumb"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no file" });
    const objectKey = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    await content.updateVideoReview(req.params.id, { thumb_url: objectKey });
    res.json({ ok: true, url: toPublicUrl(objectKey) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/admin/api/video-reviews/:id/video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no file" });
    const objectKey = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    await content.updateVideoReview(req.params.id, { video_url: objectKey });
    res.json({ ok: true, url: toPublicUrl(objectKey) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/admin/api/video-reviews/:id", async (req, res) => {
  try {
    const old = await content.deleteVideoReview(req.params.id);
    if (old) {
      if (old.thumb_url && old.thumb_url.startsWith("uploads/")) deleteObject(old.thumb_url).catch(() => {});
      if (old.video_url && old.video_url.startsWith("uploads/")) deleteObject(old.video_url).catch(() => {});
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Public site (server-rendered from DB content) ----------
async function servePublicPage(req, res) {
  try {
    const [strings, media, gallery, videoReviews] = await Promise.all([
      content.getAllStrings(STRINGS_DEFAULTS),
      content.getAllMedia(),
      content.getGallery(),
      content.getVideoReviews(),
    ]);
    const html = renderPage({ strings, media, gallery, videoReviews });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    console.error("Render error:", e);
    res.status(500).send("Site temporarily unavailable");
  }
}

app.get("/", servePublicPage);
app.get("/index.html", servePublicPage);

// Static assets (images, sitemap, robots, etc). `index:false` so this never
// short-circuits "/" before our dynamic handler above runs.
app.use(express.static(path.join(__dirname), { index: false }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SICO Hotel server listening on :${PORT}`);
});
