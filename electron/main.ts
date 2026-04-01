// electron/main.ts
// Entry point. Creates the window, sets up IPC handlers and system tray.

import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } from "electron";
import path from "path";
import { startWatcher, stopWatcher } from "./watcher";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    // hiddenInset only works on macOS — use default on other platforms
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      // preload.js is the compiled output of preload.ts
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "SnapLive Watcher",
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Open devtools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => { mainWindow = null; });

  // Minimize to tray on close instead of quitting
  mainWindow.on("close", (e) => {
    if (!getIsQuitting()) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  // Use a 16x16 empty image — cross-platform safe
  // In production you would bundle a real icon file
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGBgAAAABQABXvMqOgAAAABJRU5ErkJggg=="
  );

  tray = new Tray(icon);
  tray.setToolTip("SnapLive — Photo Watcher");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open SnapLive Watcher", click: () => mainWindow?.show() },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        setIsQuitting(true);
        void stopWatcher();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", () => mainWindow?.show());
}

// ── Quitting flag — avoids module augmentation which causes TS errors ─────────

let _isQuitting = false;
function getIsQuitting(): boolean { return _isQuitting; }
function setIsQuitting(v: boolean): void { _isQuitting = v; }

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select your tethered camera output folder",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(
  "start-watcher",
  async (_event, config: { folder: string; eventId: string; serverUrl: string; sessionToken: string }) => {
    try {
      await startWatcher({
        ...config,
        onPhoto: (fileName, status) => {
          mainWindow?.webContents.send("photo-status", { fileName, status });
        },
        onLog: (message) => {
          mainWindow?.webContents.send("log", message);
        },
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
);

ipcMain.handle("stop-watcher", async () => {
  await stopWatcher();
  return { success: true };
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void stopWatcher();
});