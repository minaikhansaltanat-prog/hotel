const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || "auto",
  endpoint: process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME;

function safeExt(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

async function uploadBuffer(buffer, originalName, mimeType) {
  const key = `uploads/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt(originalName)}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType || "application/octet-stream",
  }));
  return key;
}

async function getObjectStream(key) {
  const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return out; // { Body, ContentType, ContentLength, ... }
}

async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadBuffer, getObjectStream, deleteObject };
