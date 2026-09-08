const fs = require("fs");
const path = require("path");
const { MEDIA_SLOTS } = require("./manifest");
const { toPublicUrl } = require("./media-url");

const TEMPLATE_PATH = path.join(__dirname, "..", "index.html");
let rawTemplate = null;

function loadTemplate() {
  if (!rawTemplate) rawTemplate = fs.readFileSync(TEMPLATE_PATH, "utf8");
  return rawTemplate;
}

// Only used in dev to pick up hand-edits to index.html without restarting.
function reloadTemplate() {
  rawTemplate = fs.readFileSync(TEMPLATE_PATH, "utf8");
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function replaceBetween(html, startMarker, endMarker, replacement) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error("Template markers not found: " + startMarker + " / " + endMarker);
  }
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  return before + replacement + after;
}

function replaceMediaSlot(html, key, url) {
  const safeUrl = url.replace(/'/g, "%27").replace(/"/g, "%22");
  const imgRe = new RegExp('(<img[^>]*data-media-key="' + key + '"[^>]*?\\ssrc=")[^"]*(")', "g");
  if (imgRe.test(html)) {
    return html.replace(imgRe, function (m, pre, post) { return pre + safeUrl + post; });
  }
  const bgRe = new RegExp('(data-media-key="' + key + '"[^>]*style="background-image:url\\(\')[^\']*(\'\\))', "g");
  return html.replace(bgRe, function (m, pre, post) { return pre + safeUrl + post; });
}

function renderGalleryItems(items) {
  return items.map(function (item) {
    const caption = escapeHtml(item.caption || "");
    const url = escapeHtml(toPublicUrl(item.url));
    return '<button class="img-tone rounded-xl overflow-hidden aspect-square reveal" data-lightbox data-caption="' + caption + '"><img src="' + url + '" class="w-full h-full object-cover" alt="' + caption + '" loading="lazy"></button>';
  }).join("\n        ");
}

function renderVideoReviews(items) {
  return items.map(function (item) {
    const name = escapeHtml(item.name || "Гость отеля");
    const thumbUrl = escapeHtml(toPublicUrl(item.thumb_url || item.thumbUrl));
    const videoUrl = item.video_url || item.videoUrl;
    const videoAttr = videoUrl ? ' data-lightbox data-video-src="' + escapeHtml(toPublicUrl(videoUrl)) + '"' : "";
    return '<article class="card w-[240px] shadow-elevated overflow-hidden"' + videoAttr + '>\n' +
      '                <div class="aspect-[9/16] relative bg-[var(--off-white)] flex items-center justify-center">\n' +
      '                  <img src="' + thumbUrl + '" class="absolute inset-0 w-full h-full object-cover" alt="Видео-отзыв">\n' +
      '                  <span class="relative w-14 h-14 rounded-full bg-[var(--red)] flex items-center justify-center text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>\n' +
      '                </div>\n' +
      '                <div class="p-4"><p class="font-semibold text-sm">' + name + '</p><p class="text-xs text-[var(--text-dim)]" data-i18n="rev.videoNote">Видео-отзыв</p></div>\n' +
      '              </article>';
  }).join("\n              ");
}

function renderPage(data) {
  const strings = data.strings;
  const media = data.media;
  const gallery = data.gallery;
  const videoReviews = data.videoReviews;

  let html = loadTemplate();

  const stringsJson = JSON.stringify(strings).replace(/<\/script/gi, "<\\/script");
  html = replaceBetween(html, "/* @@STRINGS_START@@ */", "/* @@STRINGS_END@@ */", "\n  var STRINGS = " + stringsJson + ";\n  ");

  const defaultLang = "zh";
  const metaTitle = (strings["meta.title"] && strings["meta.title"][defaultLang]) || "";
  const metaDesc = (strings["meta.description"] && strings["meta.description"][defaultLang]) || "";
  html = replaceBetween(html, "<!-- @@META_TITLE_START@@ -->", "<!-- @@META_TITLE_END@@ -->", "<title>" + escapeHtml(metaTitle) + "</title>");
  html = replaceBetween(html, "<!-- @@META_DESC_START@@ -->", "<!-- @@META_DESC_END@@ -->", '<meta name="description" content="' + escapeHtml(metaDesc) + '">');

  for (let i = 0; i < MEDIA_SLOTS.length; i++) {
    const slot = MEDIA_SLOTS[i];
    const raw = media[slot.key] || slot.default;
    html = replaceMediaSlot(html, slot.key, toPublicUrl(raw));
  }

  html = replaceBetween(
    html,
    "<!-- @@GALLERY_ITEMS_START@@ -->",
    "<!-- @@GALLERY_ITEMS_END@@ -->",
    "\n        " + renderGalleryItems(gallery) + "\n        "
  );

  html = replaceBetween(
    html,
    "<!-- @@VIDEO_REVIEWS_START@@ -->",
    "<!-- @@VIDEO_REVIEWS_END@@ -->",
    "\n              " + renderVideoReviews(videoReviews) + "\n              "
  );

  return html;
}

module.exports = { renderPage: renderPage, reloadTemplate: reloadTemplate };
