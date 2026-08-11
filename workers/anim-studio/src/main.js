import "./styles.css";
import { mountApp } from "./app.js";

const boot = document.getElementById("boot");
const app = document.getElementById("app");

try {
  app.hidden = false;
  if (boot) boot.remove();
  mountApp(app);
} catch (err) {
  if (boot) {
    boot.textContent = `Failed to start: ${err.message || err}`;
    boot.style.color = "#f07178";
  }
  console.error(err);
}
