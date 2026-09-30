import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { Worker } from "node:worker_threads";
import { catalog, calculatePair } from "./engine.mjs";
import { parsePaste } from "./paste.mjs";
import { sweep } from "./analysis.mjs";
import { selectThreats } from "./matrix-view.mjs";
import { exactThreats } from "./team-comparison.mjs";
import { state, restore, refresh, pasteFromUrl } from "./sources.mjs";
const app = express(),
  port = Number(process.env.PORT) || 4783;
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    ![
      "http://127.0.0.1:5173",
      `http://127.0.0.1:${port}`,
      `http://localhost:${port}`,
    ].includes(origin)
  )
    return res.status(403).json({ error: "Local app requests only." });
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use(express.json({ limit: "1mb" }));
app.get("/api/catalog", (_req, res) => res.json(catalog()));
app.get("/api/state", (_req, res) =>
  res.json({
    running: state.running,
    progress: state.progress,
    done: state.done,
    total: state.total,
    error: state.error,
    updatedAt: state.data?.updatedAt,
  }),
);
app.get("/api/data", (_req, res) => res.json(state.data));
app.post("/api/refresh", (req, res) => {
  if (state.running) return res.json({ running: true });
  void refresh(req.body).catch((e) => {
    state.error = e.message;
  });
  res.json({ running: true });
});
app.post("/api/import", async (req, res) => {
  const text = req.body.url ? await pasteFromUrl(req.body.url) : req.body.text;
  res.json({ team: parsePaste(text), text });
});
const analysisCache = new Map();
let cacheDataset;
app.post("/api/analyze", async (req, res) => {
  if (!state.data && !req.body.opponentTeam)
    throw new Error("Wait for data refresh first.");
  if (cacheDataset !== state.data?.updatedAt) {
    analysisCache.clear();
    cacheDataset = state.data?.updatedAt;
  }
  const datasetVersion = cacheDataset;
  const threats = req.body.opponentTeam
    ? exactThreats(req.body.opponentTeam)
    : selectThreats(state.data.threats, req.body.view);
  const cacheKey = JSON.stringify([
    req.body.team,
    req.body.options,
    req.body.opponentTeam,
    threats.map((t) => t.species),
  ]);
  if (analysisCache.has(cacheKey)) return res.json(analysisCache.get(cacheKey));
  const worker = new Worker(new URL("./analysis-worker.mjs", import.meta.url), {
    workerData: {
      team: req.body.team,
      threats,
      options: req.body.options,
    },
  });
  res.on("close", () => {
    void worker.terminate();
  });
  const rows = await new Promise((resolve, reject) => {
    worker.once("message", (result) =>
      result.error ? reject(new Error(result.error)) : resolve(result.rows),
    );
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error("Analysis cancelled."));
    });
  });
  if (!res.destroyed) {
    if (datasetVersion === state.data?.updatedAt) {
      if (analysisCache.size >= 8)
        analysisCache.delete(analysisCache.keys().next().value);
      analysisCache.set(cacheKey, rows);
    }
    res.json(rows);
  }
});
app.post("/api/investment", async (req, res) => {
  const worker = new Worker(new URL("./analysis-worker.mjs", import.meta.url), {
    workerData: { task: "investment", input: req.body },
  });
  res.on("close", () => {
    void worker.terminate();
  });
  const result = await new Promise((resolve, reject) => {
    worker.once("message", (r) =>
      r.error ? reject(new Error(r.error)) : resolve(r.rows),
    );
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error("Investment scan cancelled."));
    });
  });
  if (!res.destroyed) res.json(result);
});
app.post("/api/calculate", (req, res) =>
  res.json(calculatePair(req.body.team, req.body.opponent, req.body.options)),
);
app.post("/api/sweep", (req, res) => res.json(sweep(req.body)));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.use(express.static(path.join(root, "dist")));
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.join(root, "dist/index.html")),
);
app.use((err, _req, res, _next) =>
  res.status(400).json({ error: err.message || "Request failed" }),
);
await restore();
app.listen(port, "127.0.0.1", () => {
  console.log(`Meta Lens running at http://127.0.0.1:${port}`);
  if (
    !state.data ||
    state.data.version !== 3 ||
    Date.now() - Date.parse(state.data.updatedAt) > 24 * 3600 * 1000
  )
    void refresh(
      state.data?.version >= 2
        ? state.data.config
        : {
            format: "M-C",
            limit: state.data?.config?.limit || 40,
            spreadLimit: state.data?.config?.spreadLimit || 8,
            publishedLimit: 1000,
          },
    );
  if (process.argv.includes("--open")) {
    const url = `http://127.0.0.1:${port}`;
    if (process.platform === "win32")
      spawn("rundll32", ["url.dll,FileProtocolHandler", url], {
        windowsHide: true,
      });
    else spawn(process.platform === "darwin" ? "open" : "xdg-open", [url]);
  }
});
