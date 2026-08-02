import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const trainingVideoDirectory = fileURLToPath(new URL("../../Bilibili下载", import.meta.url));
const supportedVideoExtensions = new Set([".mp4", ".mov", ".webm", ".m4v"]);

function localTrainingVideoMiddleware() {
  const middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (requestUrl.pathname === "/api/training-videos") {
      const files = existsSync(trainingVideoDirectory)
        ? readdirSync(trainingVideoDirectory, { withFileTypes: true })
            .filter((entry) => entry.isFile() && supportedVideoExtensions.has(extname(entry.name).toLowerCase()))
            .map((entry) => ({
              id: entry.name,
              title: entry.name.replace(/\.[^.]+$/, ""),
              url: `/local-training-videos/${encodeURIComponent(entry.name)}`
            }))
            .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"))
        : [];
      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.end(JSON.stringify(files));
      return;
    }

    const routePrefix = "/local-training-videos/";
    if (!requestUrl.pathname.startsWith(routePrefix)) {
      next();
      return;
    }

    const requestedName = decodeURIComponent(requestUrl.pathname.slice(routePrefix.length));
    if (!requestedName || requestedName !== basename(requestedName)) {
      response.statusCode = 400;
      response.end("Invalid video path");
      return;
    }

    const videoPath = join(trainingVideoDirectory, requestedName);
    if (!existsSync(videoPath) || !supportedVideoExtensions.has(extname(videoPath).toLowerCase())) {
      response.statusCode = 404;
      response.end("Video not found");
      return;
    }

    const { size } = statSync(videoPath);
    const contentTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".m4v": "video/mp4",
      ".mov": "video/quicktime",
      ".webm": "video/webm"
    };
    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("Content-Type", contentTypes[extname(videoPath).toLowerCase()] ?? "application/octet-stream");
    response.setHeader("Cache-Control", "no-cache");

    const range = request.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
        response.statusCode = 416;
        response.setHeader("Content-Range", `bytes */${size}`);
        response.end();
        return;
      }
      response.statusCode = 206;
      response.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      response.setHeader("Content-Length", String(end - start + 1));
      if (request.method === "HEAD") response.end();
      else createReadStream(videoPath, { start, end }).pipe(response);
      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Length", String(size));
    if (request.method === "HEAD") response.end();
    else createReadStream(videoPath).pipe(response);
  };

  return {
    name: "local-training-videos",
    configureServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), localTrainingVideoMiddleware()],
  server: {
    host: "127.0.0.1",
    port: 4182,
  },
});
