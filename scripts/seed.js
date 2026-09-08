const fs = require("fs");
const path = require("path");
const { pool } = require("../lib/db");
const { MEDIA_SLOTS } = require("../lib/manifest");

function extractStrings(html) {
  const m = html.match(/var STRINGS\s*=\s*(\{[\s\S]*?\n\s*\});/);
  if (!m) throw new Error("STRINGS block not found");
  return new Function("return " + m[1])();
}

function extractGalleryItems(html) {
  const start = html.indexOf("<!-- @@GALLERY_ITEMS_START@@ -->");
  const end = html.indexOf("<!-- @@GALLERY_ITEMS_END@@ -->");
  const block = html.slice(start, end);
  const items = [];
  const re = /data-caption="([^"]*)"[^>]*><img src="([^"]*)"/g;
  let mm;
  while ((mm = re.exec(block))) {
    items.push({ caption: mm[1], url: mm[2] });
  }
  return items;
}

async function main() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const strings = extractStrings(html);
  const galleryItems = extractGalleryItems(html);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let stringCount = 0;
    for (const key of Object.keys(strings)) {
      const { rows } = await client.query("SELECT 1 FROM content_strings WHERE key=$1", [key]);
      if (rows.length) continue; // never overwrite an existing (possibly admin-edited) row
      const v = strings[key];
      await client.query(
        "INSERT INTO content_strings (key, ru, kz, en, zh) VALUES ($1,$2,$3,$4,$5)",
        [key, v.ru || "", v.kz || "", v.en || "", v.zh || ""]
      );
      stringCount++;
    }

    let mediaCount = 0;
    for (const slot of MEDIA_SLOTS) {
      const { rows } = await client.query("SELECT 1 FROM media_slots WHERE slot_key=$1", [slot.key]);
      if (rows.length) continue;
      await client.query("INSERT INTO media_slots (slot_key, value) VALUES ($1,$2)", [slot.key, slot.default]);
      mediaCount++;
    }

    const { rows: existingGallery } = await client.query("SELECT COUNT(*)::int AS n FROM gallery_items");
    let galleryCount = 0;
    if (existingGallery[0].n === 0) {
      for (let i = 0; i < galleryItems.length; i++) {
        const item = galleryItems[i];
        await client.query(
          "INSERT INTO gallery_items (url, caption, sort_order) VALUES ($1,$2,$3)",
          [item.url, item.caption, i]
        );
        galleryCount++;
      }
    }

    const { rows: existingVideo } = await client.query("SELECT COUNT(*)::int AS n FROM video_reviews");
    let videoCount = 0;
    if (existingVideo[0].n === 0) {
      for (let i = 0; i < 3; i++) {
        await client.query(
          "INSERT INTO video_reviews (name, thumb_url, sort_order) VALUES ($1,$2,$3)",
          ["Гость отеля", "https://placehold.co/400x700/F4F2EF/F4F2EF", i]
        );
        videoCount++;
      }
    }

    await client.query("COMMIT");
    console.log(`Seed complete: ${stringCount} strings, ${mediaCount} media slots, ${galleryCount} gallery items, ${videoCount} video review placeholders inserted.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
