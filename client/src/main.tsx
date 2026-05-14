// Expose THREE as a browser global BEFORE any Phaser/enable3d imports run.
// @enable3d/phaser-extension and stage-js expect window.THREE to exist.
import * as THREE from "three";
(window as any).THREE = THREE;

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
