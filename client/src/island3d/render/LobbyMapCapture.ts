/** Lobby map capture helpers — no-op stubs for production barrel. */

export function captureOrthographicPng(
  _renderer?: unknown,
  _scene?: unknown,
  _camera?: unknown,
): string {
  return "";
}

export function renderHeightMapPng(_data?: unknown): string {
  return "";
}

export function renderClassifiedMapPng(_data?: unknown): string {
  return "";
}

export function downloadDataUrl(dataUrl: string, filename = "map.png"): void {
  if (typeof document === "undefined" || !dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
