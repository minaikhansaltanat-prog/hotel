const fs = require("fs");
const path = require("path");

function extractDefaults() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const m = html.match(/var STRINGS\s*=\s*(\{[\s\S]*?\n\s*\});/);
  if (!m) return {};
  return new Function("return " + m[1])();
}

module.exports = { STRINGS_DEFAULTS: extractDefaults() };
