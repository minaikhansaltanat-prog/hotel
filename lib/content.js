const { pool } = require("./db");

async function getAllStrings(defaults) {
  const { rows } = await pool.query("SELECT key, ru, kz, en, zh FROM content_strings");
  const merged = Object.assign({}, defaults);
  for (const row of rows) {
    merged[row.key] = { ru: row.ru, kz: row.kz, en: row.en, zh: row.zh };
  }
  return merged;
}

async function setString(key, values) {
  await pool.query(
    `INSERT INTO content_strings (key, ru, kz, en, zh, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (key) DO UPDATE SET ru=$2, kz=$3, en=$4, zh=$5, updated_at=now()`,
    [key, values.ru || "", values.kz || "", values.en || "", values.zh || ""]
  );
}

async function getAllMedia() {
  const { rows } = await pool.query("SELECT slot_key, value FROM media_slots");
  const map = {};
  for (const row of rows) map[row.slot_key] = row.value;
  return map;
}

async function setMediaSlot(slotKey, value) {
  await pool.query(
    `INSERT INTO media_slots (slot_key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (slot_key) DO UPDATE SET value=$2, updated_at=now()`,
    [slotKey, value]
  );
}

async function getMediaSlotOldValue(slotKey) {
  const { rows } = await pool.query("SELECT value FROM media_slots WHERE slot_key=$1", [slotKey]);
  return rows[0] ? rows[0].value : null;
}

async function deleteMediaSlot(slotKey) {
  await pool.query("DELETE FROM media_slots WHERE slot_key=$1", [slotKey]);
}

async function getGallery() {
  const { rows } = await pool.query("SELECT id, url, caption, sort_order FROM gallery_items ORDER BY sort_order ASC, id ASC");
  return rows;
}

async function addGalleryItem(url, caption) {
  const { rows } = await pool.query(
    `INSERT INTO gallery_items (url, caption, sort_order)
     VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM gallery_items), 0))
     RETURNING id, url, caption, sort_order`,
    [url, caption || ""]
  );
  return rows[0];
}

async function deleteGalleryItem(id) {
  const { rows } = await pool.query("DELETE FROM gallery_items WHERE id=$1 RETURNING url", [id]);
  return rows[0] ? rows[0].url : null;
}

async function reorderGallery(orderedIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query("UPDATE gallery_items SET sort_order=$1 WHERE id=$2", [i, orderedIds[i]]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function updateGalleryCaption(id, caption) {
  await pool.query("UPDATE gallery_items SET caption=$1 WHERE id=$2", [caption, id]);
}

async function getVideoReviews() {
  const { rows } = await pool.query("SELECT id, name, thumb_url, video_url, sort_order FROM video_reviews ORDER BY sort_order ASC, id ASC");
  return rows;
}

async function addVideoReview(name, thumbUrl) {
  const { rows } = await pool.query(
    `INSERT INTO video_reviews (name, thumb_url, sort_order)
     VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM video_reviews), 0))
     RETURNING id, name, thumb_url, video_url, sort_order`,
    [name || "Гость отеля", thumbUrl]
  );
  return rows[0];
}

async function updateVideoReview(id, fields) {
  const sets = [];
  const values = [];
  let i = 1;
  if (fields.name !== undefined) { sets.push(`name=$${i++}`); values.push(fields.name); }
  if (fields.thumb_url !== undefined) { sets.push(`thumb_url=$${i++}`); values.push(fields.thumb_url); }
  if (fields.video_url !== undefined) { sets.push(`video_url=$${i++}`); values.push(fields.video_url); }
  if (!sets.length) return;
  values.push(id);
  await pool.query(`UPDATE video_reviews SET ${sets.join(", ")} WHERE id=$${i}`, values);
}

async function deleteVideoReview(id) {
  const { rows } = await pool.query("DELETE FROM video_reviews WHERE id=$1 RETURNING thumb_url, video_url", [id]);
  return rows[0] || null;
}

module.exports = {
  getAllStrings, setString,
  getAllMedia, setMediaSlot, getMediaSlotOldValue, deleteMediaSlot,
  getGallery, addGalleryItem, deleteGalleryItem, reorderGallery, updateGalleryCaption,
  getVideoReviews, addVideoReview, updateVideoReview, deleteVideoReview,
};
