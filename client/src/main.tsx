import "./index.css";

// No static React / THREE / App / Sentry imports. Those pulled r3f-vendor +
// three-vendor + Rapier into index.js and #root never mounted.
const rootEl = document.getElementById("root");
if (rootEl && !rootEl.childElementCount) {
  const boot = document.createElement("div");
  boot.style.minHeight = "100vh";
  boot.style.background = "#0b0d12";
  rootEl.appendChild(boot);
}

void import("./bootApp.tsx");
