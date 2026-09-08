// Fixed single-image slots. `key` matches the data-media-key attribute in index.html.
// `default` is the bundled fallback path served as-is until an admin uploads a replacement.
const MEDIA_SLOTS = [
  { key: "logo-emblem", label: "Логотип (эмблема)", section: "Жалпы", default: "images/logo-emblem.png" },
  { key: "hero-bg", label: "Басты бет — фон суреті", section: "Басты бет (Hero)", default: "images/hero-exterior-1.jpg" },
  { key: "about-photo-1", label: "Біз туралы — 1-фото (ресепшн)", section: "Біз туралы", default: "images/lobby-reception-1.jpg" },
  { key: "about-reception", label: "Біз туралы — ресепшн қызметкері", section: "Біз туралы", default: "images/reception-staff-1.jpg" },
  { key: "room-r1", label: "Бөлме 1 — Стандарт Твин", section: "Нөмірлер", default: "images/room-twin-new-1.jpg" },
  { key: "room-r2", label: "Бөлме 2 — Делюкс Твин", section: "Нөмірлер", default: "images/room-twin-new-2.jpg" },
  { key: "room-r3", label: "Бөлме 3 — Твин с балконом", section: "Нөмірлер", default: "images/room-twin-new-3.jpg" },
  { key: "room-r4", label: "Бөлме 4 — Делюкс үлкен төсекпен", section: "Нөмірлер", default: "images/room-king-new-1.jpg" },
  { key: "room-r5", label: "Бөлме 5 — Балконды қос бөлме", section: "Нөмірлер", default: "images/room-king-new-2.jpg" },
  { key: "room-r6", label: "Бөлме 6 — Кинг Сьют", section: "Нөмірлер", default: "images/room-suite-new-1.jpg" },
  { key: "room-r7", label: "Бөлме 7 — Семейный люкс", section: "Нөмірлер", default: "images/room-family-new-1.jpg" },
  { key: "room-r8", label: "Бөлме 8 — Делюкс семейный люкс", section: "Нөмірлер", default: "images/room-family-new-2.jpg" },
  { key: "conference-photo", label: "Конференц-зал фотосы", section: "Конференц-залдар", default: "images/conference-hall-2.jpg" },
  { key: "banquet-photo", label: "Банкет залы фотосы", section: "Банкет залы", default: "images/banquet-hall-2.jpg" },
  { key: "karaoke-photo", label: "Karaoke Club фотосы", section: "Karaoke Club", default: "images/karaoke-club.jpg" },
  { key: "restaurant-photo-1", label: "Ресторан — фото 1", section: "Қызметтер", default: "images/restaurant-entrance-1.jpg" },
  { key: "restaurant-photo-2", label: "Ресторан — фото 2", section: "Қызметтер", default: "images/restaurant-entrance-2.jpg" },
  { key: "location-photo", label: "Байланыс бөлімі — фото", section: "Байланыс", default: "images/exterior-facade-1.jpg" },
];

// Section labels for grouping the i18n text keys in the admin dashboard.
// Order controls display order; unmatched key prefixes fall into "Басқа".
const TEXT_SECTIONS = [
  { prefix: "brand.", label: "Бренд атауы" },
  { prefix: "header.", label: "Header (жоғарғы панель)" },
  { prefix: "nav.", label: "Навигация" },
  { prefix: "hero.", label: "Басты бет (Hero)" },
  { prefix: "about.", label: "Біз туралы" },
  { prefix: "rooms.", label: "Нөмірлер" },
  { prefix: "conference.", label: "Конференц-залдар" },
  { prefix: "banquet.", label: "Банкет залы" },
  { prefix: "karaoke.", label: "Karaoke Club" },
  { prefix: "services.", label: "Қызметтер" },
  { prefix: "gal.", label: "Галерея (тақырып)" },
  { prefix: "rev.", label: "Пікірлер" },
  { prefix: "book.", label: "Брондау" },
  { prefix: "loc.", label: "Байланыс" },
  { prefix: "foot.", label: "Footer (астыңғы бөлік)" },
  { prefix: "meta.", label: "SEO (мета-тегтер)" },
];

function sectionFor(key) {
  const hit = TEXT_SECTIONS.find((s) => key.startsWith(s.prefix));
  return hit ? hit.label : "Басқа";
}

module.exports = { MEDIA_SLOTS, TEXT_SECTIONS, sectionFor };
