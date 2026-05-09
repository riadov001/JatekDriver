/**
 * Production static server for the Admin Dashboard (Vite build).
 * Serves dist/public/ and falls back to index.html for SPA routing.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATIC_ROOT = path.resolve(__dirname, "..", "dist", "public");
const PORT = parseInt(process.env.PORT || "8081", 10);
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".webp": "image/webp",
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  res.end(content);
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = req.url.split("?")[0];

    // Strip base path prefix
    if (BASE_PATH && urlPath.startsWith(BASE_PATH)) {
      urlPath = urlPath.slice(BASE_PATH.length) || "/";
    }
    if (!urlPath.startsWith("/")) urlPath = "/" + urlPath;

    const candidate = path.join(STATIC_ROOT, urlPath);

    // Direct file match
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return serveFile(res, candidate);
    }

    // index.html in that directory
    const indexCandidate = path.join(candidate, "index.html");
    if (fs.existsSync(indexCandidate)) {
      return serveFile(res, indexCandidate);
    }

    // SPA fallback
    const fallback = path.join(STATIC_ROOT, "index.html");
    if (fs.existsSync(fallback)) {
      return serveFile(res, fallback);
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Admin Dashboard serving ${STATIC_ROOT} on port ${PORT}`);
});
