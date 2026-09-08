// A media row's `value` is either:
//  - a bundled default path like "images/hero-exterior-1.jpg" (served by express.static), or
//  - a bucket object key like "uploads/1699999999-abc123.jpg" (served via /media/:key)
// This tells them apart and returns the URL to put in the page.
function toPublicUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith("uploads/")) return "/media/" + value;
  if (value.startsWith("images/") || value.startsWith("/")) return "/" + value.replace(/^\/+/, "");
  return value;
}

module.exports = { toPublicUrl };
