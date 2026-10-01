import {
  app,
  BrowserWindow,
  Menu,
  dialog,
  net,
  protocol,
  shell,
  powerMonitor,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "metalens",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
const smoke = process.argv.includes("--smoke-test");
const smokeDir = process.env.META_LENS_SMOKE_DIR;
if (smoke && !smokeDir)
  throw new Error("Smoke tests require an isolated META_LENS_SMOKE_DIR.");
if (smoke) app.setPath("userData", path.resolve(smokeDir));
app.setAppUserModelId("com.metalens.desktop");
const lock = app.requestSingleInstanceLock();
let window, backend;
if (!lock) app.quit();
else {
  app.on("second-instance", () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => backend?.server.close());
  app.whenReady().then(async () => {
    try {
      process.env.META_LENS_DATA_DIR = path.join(
        app.getPath("userData"),
        "data",
      );
      const { startServer } = await import("../server/index.mjs");
      backend = await startServer({
        port: 0,
        automatic: !smoke,
        desktopOrigin: "metalens://app",
      });
      protocol.handle("metalens", async (request) => {
        const url = new URL(request.url);
        if (url.hostname !== "app")
          return new Response("Not found", { status: 404 });
        const headers = new Headers(request.headers);
        headers.delete("host");
        headers.set("origin", "metalens://app");
        const response = await fetch(backend.url + url.pathname + url.search, {
          method: request.method,
          headers,
          signal: request.signal,
          ...(request.method !== "GET" && request.method !== "HEAD"
            ? { body: await request.arrayBuffer() }
            : {}),
        });
        const resultHeaders = new Headers(response.headers);
        resultHeaders.set(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'",
        );
        return new Response(response.body, {
          status: response.status,
          headers: resultHeaders,
        });
      });
      window = new BrowserWindow({
        title: "Meta Lens",
        width: 1500,
        height: 1000,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: "#f6f7f1",
        show: false,
        icon: path.join(app.getAppPath(), "desktop/icon.png"),
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });
      const openLink = (url) => {
        try {
          if (new URL(url).protocol === "https:") void shell.openExternal(url);
        } catch {}
      };
      window.webContents.setWindowOpenHandler(({ url }) => {
        openLink(url);
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith("metalens://app/")) {
          event.preventDefault();
          openLink(url);
        }
      });
      window.webContents.session.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      window.webContents.session.setPermissionCheckHandler(() => false);
      window.webContents.session.on("will-download", (_event, item) => {
        item.setSaveDialogOptions({
          title: "Save Meta Lens export",
          defaultPath: path.join(app.getPath("downloads"), item.getFilename()),
        });
      });
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: "File",
            submenu: [
              {
                label: "Check data now",
                click: async () => {
                  const data = await (
                    await net.fetch(`${backend.url}/api/data`)
                  ).json();
                  await net.fetch(`${backend.url}/api/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data?.config || {}),
                  });
                },
              },
              { type: "separator" },
              { role: "quit" },
            ],
          },
          {
            label: "Edit",
            submenu: [
              { role: "undo" },
              { role: "redo" },
              { type: "separator" },
              { role: "cut" },
              { role: "copy" },
              { role: "paste" },
              { role: "selectAll" },
            ],
          },
          {
            label: "View",
            submenu: [
              { role: "reload" },
              { role: "resetZoom" },
              { role: "zoomIn" },
              { role: "zoomOut" },
              { role: "togglefullscreen" },
            ],
          },
          {
            label: "Help",
            submenu: [
              {
                label: "Releases & updates",
                click: () =>
                  openLink(
                    "https://github.com/manudella/vgc-meta-lens/releases/latest",
                  ),
              },
              {
                label: "Open data folder",
                click: () => {
                  void shell.openPath(process.env.META_LENS_DATA_DIR);
                },
              },
              {
                label: "About Meta Lens",
                click: () => {
                  void dialog.showMessageBox(window, {
                    title: "Meta Lens",
                    message: `Meta Lens ${app.getVersion()}`,
                    detail:
                      "Pokémon Champions matchup lab. Data checks on launch and every 6 hours while open.\n\nUnofficial fan project. Pokémon belongs to its respective owners.",
                  });
                },
              },
            ],
          },
        ]),
      );
      powerMonitor.on("resume", () => {
        void backend.checkForDataUpdates();
      });
      window.once("ready-to-show", () => {
        if (!smoke) window.show();
      });
      await window.loadURL("metalens://app/");
      if (smoke) {
        // Exercise packaged resources, the calculator and its worker, without touching a real profile.
        const catalog = await (
          await net.fetch(`${backend.url}/api/catalog`)
        ).json();
        const imported = await (
          await net.fetch(`${backend.url}/api/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: "Rillaboom @ Miracle Seed\nAbility: Grassy Surge\nAdamant Nature\nSPs: 32 HP / 32 Atk / 2 Spe\n- Wood Hammer",
            }),
          })
        ).json();
        if (!imported.team?.length) throw new Error(JSON.stringify(imported));
        const response = await net.fetch(`${backend.url}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team: imported.team,
            opponentTeam: imported.team,
          }),
        });
        const rows = await response.json();
        if (!response.ok || !Array.isArray(rows) || !rows.length)
          throw new Error(JSON.stringify(rows));
        await fs.writeFile(
          path.join(smokeDir, "smoke-result.json"),
          JSON.stringify({
            ok: true,
            version: app.getVersion(),
            packaged: app.isPackaged,
            loaded: window.webContents.getURL(),
            catalog: Object.keys(catalog),
            rows: rows.length,
          }),
        );
        app.quit();
      }
    } catch (error) {
      if (smoke) {
        await fs.mkdir(smokeDir, { recursive: true });
        await fs.writeFile(
          path.join(smokeDir, "smoke-result.json"),
          JSON.stringify({ ok: false, error: error.stack }),
        );
      } else dialog.showErrorBox("Meta Lens could not start", error.message);
      app.exit(1);
    }
  });
}
