import chokidar, { FSWatcher } from "chokidar";
import fs from "fs";
import path from "path";

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".heic", ".heif",
  ".tiff", ".tif", ".webp", ".cr2", ".nef", ".arw",
]);

export type WatcherConfig = {
  folder: string;
  eventId: string;
  serverUrl: string;
  sessionToken: string;
  onPhoto: (fileName: string, status: "uploading" | "done" | "error") => void;
  onLog: (message: string) => void;
};

let activeWatcher: FSWatcher | null = null;
let uploadChain: Promise<void> = Promise.resolve();

export async function startWatcher(config: WatcherConfig): Promise<void> {
  if (activeWatcher) await stopWatcher();

  const { folder, onLog } = config;

  if (!fs.existsSync(folder)) {
    throw new Error(`Folder not found: ${folder}`);
  }

  onLog(`Watching: ${folder}`);
  onLog(`Event ID: ${config.eventId}`);
  onLog(`Server: ${config.serverUrl}`);

  activeWatcher = chokidar.watch(folder, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 800,
      pollInterval: 100,
    },
    // NOTE: "recursive" removed — chokidar v3 watches subdirectories by default
    // when given a directory path. The option doesn't exist in v3 TS types.
    ignored: /(^|[/\\])\../,
    depth: 5, // Watch up to 5 levels deep (handles date-based camera subfolders)
  });

  activeWatcher.on("add", (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) return;

    const fileName = path.basename(filePath);
    onLog(`Detected: ${fileName}`);
    config.onPhoto(fileName, "uploading");

    uploadChain = uploadChain.then(() =>
      uploadFile(filePath, fileName, config)
    );
  });

  activeWatcher.on("error", (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    onLog(`Watcher error: ${message}`);
  });

  onLog("Ready — waiting for new photos...");
}

export async function stopWatcher(): Promise<void> {
  if (activeWatcher) {
    await activeWatcher.close();
    activeWatcher = null;
  }
}

async function uploadFile(
  filePath: string,
  fileName: string,
  config: WatcherConfig
): Promise<void> {
  const { serverUrl, eventId, sessionToken: apiKey, onPhoto, onLog } = config;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString("base64");
    const mimeType = getMimeType(filePath);

    onLog(`Uploading: ${fileName}`);

    const res = await fetch(`${serverUrl}/api/electron-upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ fileName, mimeType, base64, eventId }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server responded ${res.status}: ${text}`);
    }

    onPhoto(fileName, "done");
    onLog(`Done: ${fileName}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onPhoto(fileName, "error");
    onLog(`Error uploading ${fileName}: ${message}`);
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".webp": "image/webp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
  };
  return map[ext] ?? "application/octet-stream";
}