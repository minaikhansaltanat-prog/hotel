const bcrypt = require("bcryptjs");

// Password comes from the ADMIN_PASSWORD env var (plaintext in the env, hashed
// in-memory once at boot — never stored anywhere else, never logged).
let passwordHash = null;
function getPasswordHash() {
  if (!passwordHash) {
    const raw = process.env.ADMIN_PASSWORD || "";
    passwordHash = bcrypt.hashSync(raw, 10);
  }
  return passwordHash;
}

function checkCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  if (username !== expectedUser) return false;
  return bcrypt.compareSync(password || "", getPasswordHash());
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  if (req.path.startsWith("/admin/api/")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.redirect("/admin/login");
}

module.exports = { checkCredentials, requireAuth };
