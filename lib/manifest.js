// Fixed single-image slots. `key` matches the data-media-key attribute in index.html.
// `default` is the bundled fallback path served as-is until an admin uploads a replacement.
// `labelKey`/`sectionId` are stable ids resolved to localized text client-side via
// admin/assets/admin-i18n.js (ADMIN_I18N["media.<labelKey>"] / ADMIN_I18N["section.<sectionId>"]).
const MEDIA_SLOTS = [
  { key: "logo-emblem", labelKey: "logoEmblem", sectionId: "general", default: "images/logo-emblem.png" },
  { key: "hero-bg", labelKey: "heroBg", sectionId: "hero", default: "images/hero-exterior-1.jpg" },
  { key: "about-photo-1", labelKey: "aboutPhoto1", sectionId: "about", default: "images/lobby-reception-1.jpg" },
  { key: "about-reception", labelKey: "aboutReception", sectionId: "about", default: "images/reception-staff-1.jpg" },
  { key: "room-r1", labelKey: "roomR1", sectionId: "rooms", default: "images/room-twin-new-1.jpg" },
  { key: "room-r2", labelKey: "roomR2", sectionId: "rooms", default: "images/room-twin-new-2.jpg" },
  { key: "room-r3", labelKey: "roomR3", sectionId: "rooms", default: "images/room-twin-new-3.jpg" },
  { key: "room-r4", labelKey: "roomR4", sectionId: "rooms", default: "images/room-king-new-1.jpg" },
  { key: "room-r5", labelKey: "roomR5", sectionId: "rooms", default: "images/room-king-new-2.jpg" },
  { key: "room-r6", labelKey: "roomR6", sectionId: "rooms", default: "images/room-suite-new-1.jpg" },
  { key: "room-r7", labelKey: "roomR7", sectionId: "rooms", default: "images/room-family-new-1.jpg" },
  { key: "room-r8", labelKey: "roomR8", sectionId: "rooms", default: "images/room-family-new-2.jpg" },
  { key: "conference-photo", labelKey: "conferencePhoto", sectionId: "conference", default: "images/conference-hall-2.jpg" },
  { key: "banquet-photo", labelKey: "banquetPhoto", sectionId: "banquet", default: "images/banquet-hall-2.jpg" },
  { key: "karaoke-photo", labelKey: "karaokePhoto", sectionId: "karaoke", default: "images/karaoke-club.jpg" },
  { key: "restaurant-photo-1", labelKey: "restaurantPhoto1", sectionId: "services", default: "images/restaurant-entrance-1.jpg" },
  { key: "restaurant-photo-2", labelKey: "restaurantPhoto2", sectionId: "services", default: "images/restaurant-entrance-2.jpg" },
  { key: "location-photo", labelKey: "locationPhoto", sectionId: "location", default: "images/exterior-facade-1.jpg" },
];

// Section ids for grouping the i18n text keys in the admin dashboard.
// Order controls display order; unmatched key prefixes fall into "other".
// Localized labels live in admin/assets/admin-i18n.js as ADMIN_I18N["section.<id>"].
const TEXT_SECTIONS = [
  { prefix: "brand.", id: "brand" },
  { prefix: "header.", id: "header" },
  { prefix: "nav.", id: "nav" },
  { prefix: "hero.", id: "hero" },
  { prefix: "about.", id: "about" },
  { prefix: "rooms.", id: "rooms" },
  { prefix: "conference.", id: "conference" },
  { prefix: "banquet.", id: "banquet" },
  { prefix: "karaoke.", id: "karaoke" },
  { prefix: "services.", id: "services" },
  { prefix: "gal.", id: "gallery" },
  { prefix: "rev.", id: "reviews" },
  { prefix: "book.", id: "booking" },
  { prefix: "loc.", id: "location" },
  { prefix: "foot.", id: "footer" },
  { prefix: "meta.", id: "meta" },
];

function sectionFor(key) {
  const hit = TEXT_SECTIONS.find((s) => key.startsWith(s.prefix));
  return hit ? hit.id : "other";
}

module.exports = { MEDIA_SLOTS, TEXT_SECTIONS, sectionFor };
