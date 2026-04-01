// electron/preload.ts
// Secure bridge between main process and renderer.
// Exposes ONLY the IPC calls the UI needs — nothing else is accessible.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("snaplive", {
  pickFolder: (): Promise<string | null> =>
    ipcRenderer.invoke("pick-folder"),

  startWatcher: (config: {
    folder: string;
    eventId: string;
    serverUrl: string;
    sessionToken: string;
  }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("start-watcher", config),

  stopWatcher: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke("stop-watcher"),

  onPhotoStatus: (
    callback: (data: { fileName: string; status: string }) => void
  ): void => {
    ipcRenderer.on("photo-status", (_event, data) => callback(data));
  },

  onLog: (callback: (message: string) => void): void => {
    ipcRenderer.on("log", (_event, message) => callback(message));
  },

  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners("photo-status");
    ipcRenderer.removeAllListeners("log");
  },
});