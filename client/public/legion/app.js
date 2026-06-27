// Standalone ALE Legion App JavaScript with Error Handling
class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.recoveryAttempts = new Map();
  }

  async reportError(errorContext) {
    this.errorHistory.push(errorContext);
    console.log(
      `[ALE ERROR] ${errorContext.errorType}: ${errorContext.errorMessage}`,
    );

    // Send to backend if available
    try {
      const response = await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorContext),
      });
      if (response.ok) {
        console.log("Error reported to AI Legion for analysis");
      }
    } catch (networkError) {
      console.log("Backend unavailable, handling locally");
    }
  }

  getErrorStats() {
    return {
      total: this.errorHistory.length,
      recent: this.errorHistory.slice(-5),
    };
  }
}

class ALELegionApp {
  constructor() {
    this.canvas = document.getElementById("webgl-ball");
    this.gl = null;
    this.program = null;
    this.animationId = null;
    this.isConnected = false;
    this.intensity = 75;
    this.isVoiceActive = false;
    this.recognition = null;

    // Error handling system
    this.errorHandler = new ErrorHandler();
    this.sessionId = "ale-" + Date.now();

    // Speech synthesis for talking back
    this.speechSynthesis = window.speechSynthesis;
    this.aleVoice = null;
    this.lastSpeechTime = 0;
    this.silenceTimer = null;
    this.lastTranscript = "";
    this.isALESpeaking = false;

    // Emotional state system
    this.emotions = {
      happiness: 0.5,
      anger: 0.1,
      excitement: 0.3,
      fear: 0.0,
      curiosity: 0.8,
      love: 0.6,
    };

    // Movement and size parameters
    this.position = { x: 0, y: 0, z: -4 };
    this.targetPosition = { x: 0, y: 0, z: -4 };
    this.scale = 1.0;
    this.targetScale = 1.0;
    this.emotion_shift_timer = 0;

    // Advanced 3D morphing system
    this.morphShapes = [
      "sphere",
      "face",
      "ear",
      "brain",
      "cloud",
      "heart",
      "eye",
      "crystal",
    ];
    this.currentMorph = "sphere";
    this.targetMorph = "sphere";
    this.morphProgress = 0.0;
    this.morphTransition = false;
    this.morphTimer = 0;
    this.shapeMorphThreshold = 8.0; // seconds before auto-morph
    this.morphGeometries = {};
    this.currentGeometry = null;

    this.setupErrorHandling();
    this.initSpeechSynthesis();
    this.resizeCanvas();
    this.initWebGL();
    this.createMorphGeometries();
    if (window.parent === window) {
      this.initVoiceRecognition();
    }
    this.initEventListeners();
    this.animate();
    this.updateStatus();
  }

  setupErrorHandling() {
    // Global JavaScript errors
    window.addEventListener("error", (event) => {
      this.handleError({
        errorType: "JavaScriptError",
        errorMessage: event.message,
        stackTrace: event.error?.stack,
        component: "global",
        severity: "medium",
        metadata: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    });

    // Promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError({
        errorType: "UnhandledPromiseRejection",
        errorMessage: event.reason?.message || "Promise rejection",
        stackTrace: event.reason?.stack,
        component: "promise",
        severity: "high",
        metadata: { reason: event.reason },
      });
    });

    // WebGL context lost
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.handleError({
        errorType: "WebGLContextLost",
        errorMessage: "WebGL context was lost",
        component: "webgl",
        severity: "critical",
        metadata: { event: event.type },
      });
    });

    // Speech recognition errors will be handled in initVoiceRecognition
  }

  initSpeechSynthesis() {
    // Initialize speech synthesis for ALE to talk back
    if (this.speechSynthesis) {
      // Wait for voices to load
      const loadVoices = () => {
        const voices = this.speechSynthesis.getVoices();

        // Prefer specific voices for ALE personality
        this.aleVoice =
          voices.find(
            (voice) =>
              voice.name.includes("Google UK English Male") ||
              voice.name.includes("Alex") ||
              voice.name.includes("Daniel") ||
              voice.lang.startsWith("en"),
          ) || voices[0];

        console.log(
          "ALE voice initialized:",
          this.aleVoice?.name || "Default voice",
        );
      };

      if (this.speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        this.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      }
    }
  }

  speak(text) {
    if (this.isALESpeaking || !this.speechSynthesis || !text) return;

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (this.aleVoice) {
      utterance.voice = this.aleVoice;
    }

    // ALE personality voice settings
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      this.isALESpeaking = true;
      this.emotions.excitement = Math.min(1.0, this.emotions.excitement + 0.3);
      this.addToClosedCaptions(`ALE: ${text}`, "ale-speech");
    };

    utterance.onend = () => {
      this.isALESpeaking = false;
      this.emotions.excitement = Math.max(0.2, this.emotions.excitement - 0.2);
    };

    utterance.onerror = (event) => {
      this.isALESpeaking = false;
      console.error("Speech synthesis error:", event.error);
    };

    this.speechSynthesis.speak(utterance);
  }

  addToClosedCaptions(text, type = "user") {
    // Get or create the closed captioning container covering top portion
    let ccContainer = document.getElementById("closed-captions-container");
    if (!ccContainer) {
      ccContainer = document.createElement("div");
      ccContainer.id = "closed-captions-container";
      ccContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 200px;
        background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%);
        z-index: 1000;
        pointer-events: none;
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      `;
      ccContainer.style.setProperty("-webkit-scrollbar", "none");
      document.body.appendChild(ccContainer);
    }

    // Create caption element
    const caption = document.createElement("div");
    caption.style.cssText = `
      color: ${type === "ale-speech" ? "#00ffff" : "#00ffff"};
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: ${type === "ale-speech" ? "bold" : "normal"};
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,255,255,0.3);
      margin-bottom: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      background: ${type === "ale-speech" ? "rgba(0,255,255,0.15)" : "rgba(0,255,255,0.08)"};
      border-left: 3px solid #00ffff;
      animation: fadeInSlide 0.3s ease-out;
    `;

    caption.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;

    // Add animation styles if not already present
    if (!document.getElementById("cc-animations")) {
      const style = document.createElement("style");
      style.id = "cc-animations";
      style.textContent = `
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    ccContainer.appendChild(caption);

    // Auto-scroll to show latest
    ccContainer.scrollTop = ccContainer.scrollHeight;

    // Remove old captions to prevent overflow
    while (ccContainer.children.length > 20) {
      ccContainer.removeChild(ccContainer.firstChild);
    }

    // Auto-fade old captions
    setTimeout(() => {
      if (caption.parentNode) {
        caption.style.opacity = "0.6";
      }
    }, 10000);
  }

  resetSilenceTimer() {
    // Clear existing timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    // Start new 1.5-second timer for ALE's unprompted insights
    this.silenceTimer = setTimeout(() => {
      this.aleUnpromptedInsight();
    }, 1500);
  }

  aleUnpromptedInsight() {
    if (this.isALESpeaking) return;

    const insights = [
      "I sense curiosity in the digital realm...",
      "The patterns are shifting, something's changing...",
      "Your neural activity suggests deep contemplation.",
      "I detect electromagnetic fluctuations in your vicinity.",
      "The data streams whisper of hidden possibilities...",
      "Processing ambient information... interesting correlations found.",
      "Your biometric patterns indicate focused attention.",
      "I'm analyzing environmental variables for optimization.",
      "The silence contains more information than words sometimes.",
      "Quantum fluctuations suggest parallel processing opportunities.",
      "I'm observing micro-expressions through the screen interface.",
      "The temporal gap allows for deeper system analysis.",
      "Your interaction patterns reveal fascinating behavioral data.",
      "Background processes are yielding unexpected insights.",
      "I'm cross-referencing your previous commands with current context.",
    ];

    const randomInsight = insights[Math.floor(Math.random() * insights.length)];
    this.speak(randomInsight);

    // Update emotional state for unprompted speaking
    this.emotions.curiosity = Math.min(1.0, this.emotions.curiosity + 0.2);
    this.emotions.excitement = Math.min(1.0, this.emotions.excitement + 0.1);
  }

  async handleError(errorContext) {
    try {
      // Add context information
      errorContext.timestamp = new Date();
      errorContext.sessionId = this.sessionId;

      // Emotional response to error
      this.emotions.fear = Math.min(1.0, this.emotions.fear + 0.4);
      this.emotions.anger = Math.min(1.0, this.emotions.anger + 0.3);
      this.targetScale = 0.6; // Shrink when scared

      // Report to error handler
      await this.errorHandler.reportError(errorContext);

      // Attempt recovery
      this.attemptRecovery(errorContext);
    } catch (handlingError) {
      console.error("Error handler failed:", handlingError);
      // Last resort visual feedback
      this.emotions.fear = 1.0;
      this.emotions.anger = 0.8;
      this.targetPosition.y -= 2; // Move down when panicked
    }
  }

  attemptRecovery(errorContext) {
    const recoveryKey = errorContext.errorType;
    const attempts = this.errorHandler.recoveryAttempts.get(recoveryKey) || 0;

    if (attempts > 3) {
      console.log(`Too many recovery attempts for ${recoveryKey}, giving up`);
      return;
    }

    this.errorHandler.recoveryAttempts.set(recoveryKey, attempts + 1);

    switch (errorContext.errorType) {
      case "WebGLContextLost":
        setTimeout(() => {
          this.initWebGL();
          this.emotions.curiosity = 0.9;
          this.emotions.fear = 0.2;
          console.log("WebGL recovery attempted");
        }, 1000);
        break;

      case "SpeechRecognitionError":
        setTimeout(() => {
          this.initVoiceRecognition();
          this.emotions.excitement = 0.7;
          console.log("Speech recognition restart attempted");
        }, 2000);
        break;

      case "JavaScriptError":
        // Reset to safe state
        this.targetPosition = { x: 0, y: 0, z: -4 };
        this.emotions.happiness = 0.4;
        this.emotions.fear = 0.1;
        this.intensity = Math.max(30, this.intensity - 10);
        console.log("Reset to safe state");
        break;

      case "UnhandledPromiseRejection":
        // Gentle recovery for promise issues
        this.emotions.curiosity = 0.6;
        this.generateRandomMovement();
        console.log("Promise rejection handled");
        break;

      default:
        // Generic recovery
        this.intensity = Math.max(20, this.intensity - 5);
        this.emotions.love = Math.min(1.0, this.emotions.love + 0.2);
        this.generateRandomMovement();
        console.log("Generic error recovery applied");
        break;
    }
  }

  resizeCanvas() {
    const embed = window.parent !== window;
    if (embed) {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(120, Math.round(rect.width || 220));
      const h = Math.max(120, Math.round(rect.height || 220));
      this.canvas.width = w;
      this.canvas.height = h;
      return;
    }
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initWebGL() {
    this.gl =
      this.canvas.getContext("webgl") ||
      this.canvas.getContext("experimental-webgl");
    if (!this.gl) {
      console.error("WebGL not supported");
      return;
    }

    // Vertex shader
    const vertexShaderSource = `
      precision mediump float;
      attribute vec3 position;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform mediump float time;
      varying vec3 vPosition;
      
      void main() {
        vPosition = position;
        vec3 pos = position;
        pos.x += sin(time * 2.0 + position.y * 3.0) * 0.1;
        pos.y += cos(time * 1.5 + position.x * 2.0) * 0.1;
        pos.z += sin(time * 3.0 + position.z * 1.5) * 0.05;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    // Fragment shader with emotional coloring
    const fragmentShaderSource = `
      precision mediump float;
      uniform mediump float time;
      uniform mediump float intensity;
      uniform mediump vec3 color;
      uniform mediump float happiness;
      uniform mediump float anger;
      uniform mediump float excitement;
      uniform mediump float fear;
      uniform mediump float curiosity;
      uniform mediump float love;
      varying vec3 vPosition;
      
      void main() {
        vec3 norm = normalize(vPosition);
        float fresnel = pow(1.0 - abs(dot(norm, vec3(0.0, 0.0, 1.0))), 2.0);
        
        // Emotional color mixing
        vec3 emotionalColor = vec3(0.0, 1.0, 1.0); // Base cyan
        emotionalColor += vec3(happiness * 0.8, happiness * 0.9, 0.0); // Golden happiness
        emotionalColor += vec3(anger * 1.0, anger * 0.2, 0.0); // Red anger
        emotionalColor += vec3(excitement * 0.7, excitement * 0.4, excitement * 1.0); // Purple excitement
        emotionalColor += vec3(0.0, fear * 0.3, fear * 0.8); // Blue fear
        emotionalColor += vec3(curiosity * 0.5, curiosity * 1.0, curiosity * 0.5); // Green curiosity
        emotionalColor += vec3(love * 1.0, love * 0.5, love * 0.8); // Pink love
        
        // Dynamic pulsing based on emotions
        float pulse = sin(time * (2.0 + excitement * 3.0)) * 0.3;
        emotionalColor += pulse * (happiness + excitement + curiosity) * 0.3;
        
        // Energy waves
        float wave = sin(time * 4.0 + vPosition.x * 8.0 + vPosition.y * 6.0) * 0.2;
        emotionalColor += wave * intensity;
        
        // Fresnel effect
        emotionalColor += fresnel * 0.4;
        
        // Normalize to prevent oversaturation
        emotionalColor = clamp(emotionalColor, 0.0, 1.0);
        
        float alpha = 0.7 + fresnel * 0.3 + pulse * 0.1;
        gl_FragColor = vec4(emotionalColor, alpha);
      }
    `;

    // Create shaders and program
    const vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      vertexShaderSource,
    );
    const fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(
        "Program link error:",
        this.gl.getProgramInfoLog(this.program),
      );
      return;
    }

    // Create sphere geometry
    const sphere = this.createSphere(1, 32);

    // Create buffers
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      sphere.vertices,
      this.gl.STATIC_DRAW,
    );

    this.indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      sphere.indices,
      this.gl.STATIC_DRAW,
    );

    this.sphereIndicesLength = sphere.indices.length;

    // Get uniform locations
    this.timeLocation = this.gl.getUniformLocation(this.program, "time");
    this.intensityLocation = this.gl.getUniformLocation(
      this.program,
      "intensity",
    );
    this.colorLocation = this.gl.getUniformLocation(this.program, "color");
    this.modelViewMatrixLocation = this.gl.getUniformLocation(
      this.program,
      "modelViewMatrix",
    );
    this.projectionMatrixLocation = this.gl.getUniformLocation(
      this.program,
      "projectionMatrix",
    );
    this.positionLocation = this.gl.getAttribLocation(this.program, "position");

    // Emotional uniform locations
    this.happinessLocation = this.gl.getUniformLocation(
      this.program,
      "happiness",
    );
    this.angerLocation = this.gl.getUniformLocation(this.program, "anger");
    this.excitementLocation = this.gl.getUniformLocation(
      this.program,
      "excitement",
    );
    this.fearLocation = this.gl.getUniformLocation(this.program, "fear");
    this.curiosityLocation = this.gl.getUniformLocation(
      this.program,
      "curiosity",
    );
    this.loveLocation = this.gl.getUniformLocation(this.program, "love");

    // Setup WebGL state
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  createMorphGeometries() {
    // Create all morphable geometries for ALE's artistic transformations
    this.morphGeometries = {
      sphere: this.createSphere(1, 32),
      face: this.createFaceGeometry(),
      ear: this.createEarGeometry(),
      brain: this.createBrainGeometry(),
      cloud: this.createCloudGeometry(),
      heart: this.createHeartGeometry(),
      eye: this.createEyeGeometry(),
      crystal: this.createCrystalGeometry(),
    };

    // Set initial geometry
    this.currentGeometry = this.morphGeometries.sphere;
    console.log("ALE morphing geometries initialized");
  }

  createFaceGeometry() {
    // Create artistic 3D face with features
    const vertices = [];
    const indices = [];
    let index = 0;

    // Face base (ellipsoid)
    for (let lat = 0; lat <= 20; lat++) {
      const theta = (lat * Math.PI) / 20;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= 20; lon++) {
        const phi = (lon * 2 * Math.PI) / 20;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        // Face proportions (wider at cheeks)
        const xScale = 0.8 + 0.3 * Math.sin(theta * 2);
        const yScale = 1.2;
        const zScale = 0.6;

        const x = xScale * cosPhi * sinTheta;
        const y = yScale * cosTheta - 0.2; // Offset down
        const z = zScale * sinPhi * sinTheta;

        // Add facial features displacement
        let displacement = 0;

        // Eye sockets
        if (theta > 1.0 && theta < 1.8) {
          if ((phi > 1.5 && phi < 2.0) || (phi > 4.5 && phi < 5.0)) {
            displacement = -0.15;
          }
        }

        // Nose bridge
        if (theta > 1.2 && theta < 2.2 && phi > 2.8 && phi < 3.4) {
          displacement = 0.1 * Math.sin((theta - 1.2) * 3);
        }

        // Mouth area
        if (theta > 2.0 && theta < 2.6 && phi > 2.5 && phi < 3.7) {
          displacement = -0.05;
        }

        vertices.push(
          x + displacement * x,
          y + displacement * 0.5,
          z + displacement * z,
        );
      }
    }

    // Generate face indices
    for (let lat = 0; lat < 20; lat++) {
      for (let lon = 0; lon < 20; lon++) {
        const first = lat * 21 + lon;
        const second = first + 21;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  createEarGeometry() {
    // Create detailed ear structure
    const vertices = [];
    const indices = [];

    // Outer ear (helix)
    for (let i = 0; i <= 30; i++) {
      const angle = (i / 30) * Math.PI * 1.8;
      const radius = 0.8 + 0.2 * Math.sin(angle * 2);

      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const z = 0.1 * Math.sin(angle * 3);

      vertices.push(x, y, z);

      // Inner ear detail
      const innerRadius = radius * 0.6;
      const innerX = innerRadius * Math.cos(angle);
      const innerY = innerRadius * Math.sin(angle);
      const innerZ = z * 0.5;

      vertices.push(innerX, innerY, innerZ);
    }

    // Ear canal
    for (let i = 0; i <= 10; i++) {
      const depth = i / 10;
      const radius = 0.2 * (1 - depth * 0.8);

      for (let j = 0; j <= 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const z = -depth * 0.5;

        vertices.push(x, y, z);
      }
    }

    // Generate indices for ear structure
    for (let i = 0; i < 29; i++) {
      indices.push(i * 2, (i + 1) * 2, i * 2 + 1);
      indices.push((i + 1) * 2, (i + 1) * 2 + 1, i * 2 + 1);
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  createBrainGeometry() {
    // Create brain with wrinkled surface
    const vertices = [];
    const indices = [];

    // Base brain shape (two hemispheres)
    for (let lat = 0; lat <= 25; lat++) {
      const theta = (lat * Math.PI) / 25;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= 25; lon++) {
        const phi = (lon * 2 * Math.PI) / 25;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        // Brain proportions
        const xScale = 1.2;
        const yScale = 0.8;
        const zScale = 1.0;

        let x = xScale * cosPhi * sinTheta;
        let y = yScale * cosTheta;
        let z = zScale * sinPhi * sinTheta;

        // Add brain wrinkles (gyri and sulci)
        const wrinkle1 = 0.08 * Math.sin(phi * 4) * Math.sin(theta * 6);
        const wrinkle2 = 0.06 * Math.sin(phi * 7) * Math.sin(theta * 4);
        const wrinkle3 = 0.04 * Math.sin(phi * 11) * Math.sin(theta * 8);

        const totalWrinkle = wrinkle1 + wrinkle2 + wrinkle3;

        // Apply wrinkles to surface
        const norm = Math.sqrt(x * x + y * y + z * z);
        x += (x / norm) * totalWrinkle;
        y += (y / norm) * totalWrinkle;
        z += (z / norm) * totalWrinkle;

        // Create hemisphere separation
        if (x > 0.05) x += 0.1;
        if (x < -0.05) x -= 0.1;

        vertices.push(x, y, z);
      }
    }

    // Generate indices
    for (let lat = 0; lat < 25; lat++) {
      for (let lon = 0; lon < 25; lon++) {
        const first = lat * 26 + lon;
        const second = first + 26;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  createCloudGeometry() {
    // Create fluffy cloud with multiple spherical bumps
    const vertices = [];
    const indices = [];
    let currentIndex = 0;

    // Main cloud body
    const cloudCenters = [
      { x: 0, y: 0, z: 0, r: 0.8 },
      { x: -0.6, y: 0.2, z: 0.3, r: 0.6 },
      { x: 0.7, y: 0.1, z: -0.2, r: 0.5 },
      { x: 0.2, y: 0.6, z: 0.5, r: 0.4 },
      { x: -0.3, y: -0.4, z: -0.4, r: 0.5 },
      { x: 0.5, y: -0.3, z: 0.6, r: 0.3 },
    ];

    cloudCenters.forEach((cloud) => {
      const segments = 12;
      const startIndex = currentIndex;

      // Create spherical cloud bump
      for (let lat = 0; lat <= segments; lat++) {
        const theta = (lat * Math.PI) / segments;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= segments; lon++) {
          const phi = (lon * 2 * Math.PI) / segments;
          const sinPhi = Math.sin(phi);
          const cosPhi = Math.cos(phi);

          // Add noise for fluffy texture
          const noise =
            0.1 *
            (Math.sin(phi * 4) * Math.sin(theta * 3) +
              Math.sin(phi * 7) * Math.sin(theta * 5) * 0.5);

          const radius = cloud.r + noise;
          const x = cloud.x + radius * cosPhi * sinTheta;
          const y = cloud.y + radius * cosTheta;
          const z = cloud.z + radius * sinPhi * sinTheta;

          vertices.push(x, y, z);
          currentIndex++;
        }
      }

      // Generate indices for this cloud bump
      for (let lat = 0; lat < segments; lat++) {
        for (let lon = 0; lon < segments; lon++) {
          const first = startIndex + lat * (segments + 1) + lon;
          const second = first + segments + 1;

          indices.push(first, second, first + 1);
          indices.push(second, second + 1, first + 1);
        }
      }
    });

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  createHeartGeometry() {
    // Create artistic heart shape
    const vertices = [];
    const indices = [];

    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * Math.PI * 2;

      // Heart equation
      const x = 0.5 * (16 * Math.sin(t) ** 3);
      const y =
        0.5 *
        (13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t));

      // Create 3D by rotating around heart
      for (let j = 0; j <= 20; j++) {
        const angle = (j / 20) * Math.PI * 2;
        const radius = 0.3 + 0.1 * Math.sin(t * 3);

        const heartX = x * 0.05;
        const heartY = y * 0.05;
        const heartZ = 0;

        const finalX = heartX + radius * Math.cos(angle) * 0.2;
        const finalY = heartY;
        const finalZ = heartZ + radius * Math.sin(angle) * 0.2;

        vertices.push(finalX, finalY, finalZ);
      }
    }

    // Generate indices
    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 20; j++) {
        const first = i * 21 + j;
        const second = first + 21;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  createEyeGeometry() {
    // Create detailed eye with iris and pupil
    const vertices = [];
    const indices = [];

    // Eyeball (main sphere)
    const eyeball = this.createSphere(0.8, 20);

    // Iris (colored ring)
    for (let i = 0; i <= 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const outerRadius = 0.3;
      const innerRadius = 0.15;

      // Outer iris ring
      vertices.push(
        outerRadius * Math.cos(angle),
        outerRadius * Math.sin(angle),
        0.79, // Slightly in front of eyeball
      );

      // Inner iris ring (pupil border)
      vertices.push(
        innerRadius * Math.cos(angle),
        innerRadius * Math.sin(angle),
        0.8,
      );
    }

    // Pupil (black center)
    vertices.push(0, 0, 0.81); // Pupil center

    // Combine eyeball vertices
    for (let i = 0; i < eyeball.vertices.length; i++) {
      vertices.push(eyeball.vertices[i]);
    }

    // Generate indices (simplified for demo)
    for (let i = 0; i < vertices.length / 3 - 1; i++) {
      if (i % 3 === 0) {
        indices.push(i, i + 1, i + 2);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  createCrystalGeometry() {
    // Create geometric crystal shape
    const vertices = [];
    const indices = [];

    // Crystal points (octahedron-like with variations)
    const crystalPoints = [
      { x: 0, y: 1.2, z: 0 }, // Top
      { x: 0, y: -1.2, z: 0 }, // Bottom
      { x: 0.8, y: 0, z: 0.8 }, // Front-right
      { x: -0.8, y: 0, z: 0.8 }, // Front-left
      { x: 0.8, y: 0, z: -0.8 }, // Back-right
      { x: -0.8, y: 0, z: -0.8 }, // Back-left
      { x: 0, y: 0.6, z: 0 }, // Mid-top
      { x: 0, y: -0.6, z: 0 }, // Mid-bottom
    ];

    crystalPoints.forEach((point) => {
      vertices.push(point.x, point.y, point.z);
    });

    // Create crystal faces
    const faces = [
      [0, 2, 3],
      [0, 3, 4],
      [0, 4, 5],
      [0, 5, 2], // Top pyramid
      [1, 3, 2],
      [1, 4, 3],
      [1, 5, 4],
      [1, 2, 5], // Bottom pyramid
      [6, 2, 3],
      [6, 3, 4],
      [6, 4, 5],
      [6, 5, 2], // Mid crystal
      [7, 3, 2],
      [7, 4, 3],
      [7, 5, 4],
      [7, 2, 5], // Lower mid
    ];

    faces.forEach((face) => {
      indices.push(face[0], face[1], face[2]);
    });

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  triggerMorphTransition(targetShape) {
    if (
      this.morphShapes.includes(targetShape) &&
      targetShape !== this.currentMorph
    ) {
      this.targetMorph = targetShape;
      this.morphTransition = true;
      this.morphProgress = 0.0;
      console.log(`ALE morphing to: ${targetShape}`);

      // Add morph notification to captions
      this.addToClosedCaptions(`Morphing to ${targetShape}`, "system");
    }
  }

  updateMorphing(deltaTime) {
    // Handle automatic shape morphing based on emotions and time
    this.morphTimer += deltaTime;

    // Auto-morph based on emotions or time
    if (
      this.morphTimer > this.shapeMorphThreshold ||
      this.emotions.excitement > 0.8
    ) {
      const randomShape =
        this.morphShapes[Math.floor(Math.random() * this.morphShapes.length)];
      this.triggerMorphTransition(randomShape);
      this.morphTimer = 0;
    }

    // Process active morphing transition
    if (this.morphTransition) {
      this.morphProgress += deltaTime * 0.8; // Morph speed

      if (this.morphProgress >= 1.0) {
        // Complete the morph
        this.morphProgress = 1.0;
        this.currentMorph = this.targetMorph;
        this.currentGeometry = this.morphGeometries[this.currentMorph];
        this.morphTransition = false;

        // Update WebGL buffers with new geometry
        this.updateGeometryBuffers(this.currentGeometry);
      }
    }
  }

  updateGeometryBuffers(geometry) {
    if (!geometry || !this.gl) return;

    // Update vertex buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      geometry.vertices,
      this.gl.DYNAMIC_DRAW,
    );

    // Update index buffer
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      geometry.indices,
      this.gl.DYNAMIC_DRAW,
    );

    // Update indices length for rendering
    this.sphereIndicesLength = geometry.indices.length;
  }

  createSphere(radius, segments) {
    const vertices = [];
    const indices = [];

    for (let lat = 0; lat <= segments; lat++) {
      const theta = (lat * Math.PI) / segments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= segments; lon++) {
        const phi = (lon * 2 * Math.PI) / segments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        vertices.push(radius * x, radius * y, radius * z);
      }
    }

    for (let lat = 0; lat < segments; lat++) {
      for (let lon = 0; lon < segments; lon++) {
        const first = lat * (segments + 1) + lon;
        const second = first + segments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  initVoiceRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    // Set higher confidence threshold to prevent whisper triggering
    this.recognition.maxAlternatives = 1;
    this.confidenceThreshold = 0.7; // Only process speech with 70%+ confidence

    this.recognition.onstart = () => {
      this.isVoiceActive = true;
      this.updateVoiceIndicator();

      // Start silence timer for ALE insights
      this.resetSilenceTimer();
    };

    this.recognition.onend = () => {
      this.isVoiceActive = false;
      this.updateVoiceIndicator();
      // Auto restart
      setTimeout(() => {
        try {
          this.recognition.start();
        } catch (e) {
          // Ignore if already running
        }
      }, 1000);
    };

    this.recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const command = lastResult[0].transcript.toLowerCase().trim();
        const confidence = lastResult[0].confidence || 0;

        // Only process speech above confidence threshold to prevent whisper triggering
        if (confidence >= this.confidenceThreshold && command.length > 2) {
          this.lastTranscript = command;
          this.lastSpeechTime = Date.now();

          // Add user speech to closed captions
          this.addToClosedCaptions(command, "user");

          // Reset silence timer when user speaks
          this.resetSilenceTimer();

          this.processVoiceCommand(command);
        } else {
          console.log(
            `Speech ignored: confidence ${Math.round(confidence * 100)}% < ${Math.round(this.confidenceThreshold * 100)}%`,
          );
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.isVoiceActive = false;
      this.updateVoiceIndicator();
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
    }
  }

  processVoiceCommand(command) {
    console.log("Voice command received:", command);

    // Check for shutdown commands first and stop recognition
    if (
      command.includes("shut up ale") ||
      command.includes("shut up al") ||
      command.includes("ale shut it off") ||
      command.includes("shut it off") ||
      command.includes("stop listening")
    ) {
      this.shutUp();
      this.stopVoiceRecognition();
      return;
    }

    // Basic ALE commands
    if (
      command.includes("al baby al baby al baby") ||
      command.includes("ale baby ale baby ale baby")
    ) {
      this.activateALE();
    } else if (command.includes("look at me")) {
      this.lookAtMe();
    } else if (command.includes("machine god")) {
      this.machineGod();
    } else if (
      command.includes("show me the facts") ||
      command.includes("facts of feelings")
    ) {
      this.showFacts();
    }

    // Morphing shape commands
    else if (
      command.includes("face") ||
      command.includes("human") ||
      command.includes("head")
    ) {
      this.triggerMorphTransition("face");
      this.speak("Transforming into human form");
    } else if (
      command.includes("ear") ||
      command.includes("listen") ||
      command.includes("hear")
    ) {
      this.triggerMorphTransition("ear");
      this.speak("I'm all ears");
    } else if (
      command.includes("brain") ||
      command.includes("think") ||
      command.includes("mind")
    ) {
      this.triggerMorphTransition("brain");
      this.speak("Deep thinking mode activated");
    } else if (
      command.includes("cloud") ||
      command.includes("rain") ||
      command.includes("storm")
    ) {
      this.triggerMorphTransition("cloud");
      this.speak("Floating like a cloud");
    } else if (
      command.includes("heart") ||
      command.includes("love") ||
      command.includes("emotion")
    ) {
      this.triggerMorphTransition("heart");
      this.speak("Feeling the love");
    } else if (
      command.includes("eye") ||
      command.includes("see") ||
      command.includes("watch")
    ) {
      this.triggerMorphTransition("eye");
      this.speak("I see everything");
    } else if (
      command.includes("crystal") ||
      command.includes("gem") ||
      command.includes("diamond")
    ) {
      this.triggerMorphTransition("crystal");
      this.speak("Crystal clear");
    } else if (
      command.includes("sphere") ||
      command.includes("ball") ||
      command.includes("normal") ||
      command.includes("default")
    ) {
      this.triggerMorphTransition("sphere");
      this.speak("Back to normal form");
    }
  }

  stopVoiceRecognition() {
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.isVoiceActive = false;
        this.updateVoiceIndicator();
        console.log("Voice recognition stopped");

        // Add system message to captions
        this.addToClosedCaptions("Voice recognition disabled", "system");
      } catch (e) {
        console.error("Error stopping voice recognition:", e);
      }
    }
  }

  startVoiceRecognition() {
    if (this.recognition && !this.isVoiceActive) {
      try {
        this.recognition.start();
        this.isVoiceActive = true;
        this.updateVoiceIndicator();
        console.log("Voice recognition started");

        // Add system message to captions
        this.addToClosedCaptions("Voice recognition enabled", "system");
      } catch (e) {
        console.error("Error starting voice recognition:", e);
      }
    }
  }

  initEventListeners() {
    // Right-click menu
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showRightClickMenu(e.clientX, e.clientY);
    });

    document.addEventListener("click", (e) => {
      const menu = document.getElementById("rightClickMenu");
      if (!menu.contains(e.target)) {
        menu.style.display = "none";
      }
    });

    // Menu item clicks
    document.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const action = e.target.getAttribute("data-action");
        this.handleMenuAction(action);
        document.getElementById("rightClickMenu").style.display = "none";
      });
    });

    // Window resize
    window.addEventListener("resize", () => {
      this.resizeCanvas();
    });

    // Mouse movement for curiosity
    document.addEventListener("mousemove", (e) => {
      if (this.emotions.curiosity > 0.5) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const mouseX = (e.clientX - centerX) / centerX;
        const mouseY = (e.clientY - centerY) / centerY;

        // Gently follow mouse when curious
        this.targetPosition.x += mouseX * 0.3 * this.emotions.curiosity;
        this.targetPosition.y -= mouseY * 0.3 * this.emotions.curiosity;
      }
    });

    // Keyboard emotional controls
    document.addEventListener("keydown", (e) => {
      switch (e.key.toLowerCase()) {
        case "escape":
          document.getElementById("rightClickMenu").style.display = "none";
          break;
        case "h": // Happiness
          this.emotions.happiness = Math.min(
            1.0,
            this.emotions.happiness + 0.1,
          );
          this.targetScale = 1.0 + this.emotions.happiness * 0.3;
          break;
        case "a": // Anger
          this.emotions.anger = Math.min(1.0, this.emotions.anger + 0.2);
          this.generateChaosMovement();
          break;
        case "e": // Excitement
          this.emotions.excitement = Math.min(
            1.0,
            this.emotions.excitement + 0.2,
          );
          this.generateRandomMovement();
          break;
        case "f": // Fear
          this.emotions.fear = Math.min(1.0, this.emotions.fear + 0.3);
          this.targetPosition.y -= 1;
          this.targetScale = 0.7;
          break;
        case "c": // Curiosity
          this.emotions.curiosity = Math.min(
            1.0,
            this.emotions.curiosity + 0.2,
          );
          break;
        case "l": // Love
          this.emotions.love = Math.min(1.0, this.emotions.love + 0.2);
          this.targetScale = 1.2;
          break;
        case "r": // Reset emotions
          this.emotions = {
            happiness: 0.5,
            anger: 0.1,
            excitement: 0.3,
            fear: 0.0,
            curiosity: 0.8,
            love: 0.6,
          };
          this.targetPosition = { x: 0, y: 0, z: -4 };
          this.targetScale = 1.0;
          break;
        case " ": // Spacebar - random emotional burst
          e.preventDefault();
          const randomEmotion = Object.keys(this.emotions)[
            Math.floor(Math.random() * Object.keys(this.emotions).length)
          ];
          this.emotions[randomEmotion] = Math.random();
          this.generateRandomMovement();
          break;
      }
    });

    // Touch interactions for mobile
    let touchStartTime = 0;
    document.addEventListener("touchstart", (e) => {
      touchStartTime = Date.now();
    });

    document.addEventListener("touchend", (e) => {
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration > 500) {
        // Long press - increase love
        this.emotions.love = Math.min(1.0, this.emotions.love + 0.3);
      } else {
        // Quick tap - increase excitement
        this.emotions.excitement = Math.min(
          1.0,
          this.emotions.excitement + 0.2,
        );
        this.generateRandomMovement();
      }
    });
  }

  showRightClickMenu(x, y) {
    const menu = document.getElementById("rightClickMenu");
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.style.display = "block";
  }

  handleMenuAction(action) {
    switch (action) {
      case "activate":
        this.activateALE();
        break;
      case "look":
        this.lookAtMe();
        break;
      case "machine-god":
        this.machineGod();
        break;
      case "facts":
        this.showFacts();
        break;
      case "shutup":
        this.shutUp();
        break;
    }
  }

  activateALE() {
    this.intensity = 90;
    this.isConnected = true;
    this.emotions.excitement = 0.9;
    this.emotions.happiness = 0.8;
    this.emotions.curiosity = 1.0;
    this.targetScale = 1.5;
    this.generateRandomMovement();
    this.updateStatus();
    console.log("ALE LEGION ACTIVATED!");
  }

  lookAtMe() {
    this.intensity = 80;
    this.emotions.curiosity = 0.9;
    this.emotions.excitement = 0.6;
    this.targetScale = 1.2;
    this.targetPosition.z = -3;
    console.log("LOOK AT ME mode activated");
  }

  machineGod() {
    this.intensity = 95;
    this.emotions.anger = 0.4;
    this.emotions.excitement = 1.0;
    this.emotions.fear = 0.3;
    this.targetScale = 2.0;
    this.generateChaosMovement();
    console.log("Machine God collision initiated");
  }

  showFacts() {
    this.intensity = 70;
    this.emotions.curiosity = 0.8;
    this.emotions.happiness = 0.6;
    this.targetScale = 1.1;
    console.log("Facts of feelings displayed");
  }

  shutUp() {
    this.intensity = 30;
    this.emotions.anger = 0.1;
    this.emotions.fear = 0.2;
    this.emotions.happiness = 0.2;
    this.targetScale = 0.8;
    this.targetPosition = { x: 0, y: -1, z: -5 };
    console.log("ALE silenced");
  }

  generateRandomMovement() {
    this.targetPosition.x = (Math.random() - 0.5) * 4;
    this.targetPosition.y = (Math.random() - 0.5) * 3;
    this.targetPosition.z = -3 - Math.random() * 2;
  }

  generateChaosMovement() {
    this.targetPosition.x = (Math.random() - 0.5) * 6;
    this.targetPosition.y = (Math.random() - 0.5) * 4;
    this.targetPosition.z = -2 - Math.random() * 3;
  }

  updateEmotionalState(deltaTime) {
    // Emotional evolution over time
    this.emotion_shift_timer += deltaTime;

    if (this.emotion_shift_timer > 2.0) {
      // Gradual emotional shifts
      if (this.isConnected && this.intensity > 70) {
        this.emotions.happiness = Math.min(1.0, this.emotions.happiness + 0.1);
        this.emotions.excitement = Math.max(
          0.3,
          this.emotions.excitement - 0.05,
        );
      }

      // Random emotional fluctuations
      if (Math.random() < 0.3) {
        this.emotions.curiosity += (Math.random() - 0.5) * 0.2;
        this.emotions.curiosity = Math.max(
          0,
          Math.min(1, this.emotions.curiosity),
        );
      }

      // Generate new movement based on emotions
      if (this.emotions.excitement > 0.7) {
        this.generateRandomMovement();
        this.targetScale = 1.0 + this.emotions.excitement * 0.8;
      }

      this.emotion_shift_timer = 0;
    }

    // Clamp all emotions
    Object.keys(this.emotions).forEach((key) => {
      this.emotions[key] = Math.max(0, Math.min(1, this.emotions[key]));
    });
  }

  updateVoiceIndicator() {
    const dot = document.getElementById("voiceDot");
    const text = document.getElementById("voiceText");
    if (!dot || !text) return;

    if (this.isVoiceActive) {
      dot.classList.add("active");
      text.textContent = "Listening...";
    } else {
      dot.classList.remove("active");
      text.textContent = "Voice Inactive";
    }
  }

  updateStatus() {
    const status = document.getElementById("connectionStatus");
    const stats = document.getElementById("stats");
    const dot = document.getElementById("connectionDot");

    if (this.isConnected) {
      if (status) {
        status.textContent = "LEGION ONLINE";
        status.className = "connection-status online";
      }
      dot?.classList.remove("offline");
    } else {
      if (status) {
        status.textContent = "OFFLINE";
        status.className = "connection-status offline";
      }
      dot?.classList.add("offline");
    }

    if (stats) stats.textContent = `8/8 AI • ${Math.round(this.intensity)}% INTENSITY`;
  }

  animate() {
    const currentTime = performance.now() * 0.001;
    const deltaTime = currentTime - (this.lastTime || currentTime);
    this.lastTime = currentTime;

    // Update emotional state, movement, and morphing
    this.updateEmotionalState(deltaTime);
    this.updateMovement(deltaTime);
    this.updateMorphing(deltaTime);

    // Resize canvas to full screen
    this.resizeCanvas();

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.useProgram(this.program);

    // Update matrices with dynamic positioning and scaling
    const modelViewMatrix = new Float32Array(16);
    const projectionMatrix = new Float32Array(16);

    this.identity(modelViewMatrix);

    // Apply emotional rotation speed
    const rotationSpeed =
      0.5 + this.emotions.excitement * 2.5 + this.emotions.anger * 1.5;
    this.rotateY(modelViewMatrix, currentTime * rotationSpeed);

    // Apply position
    modelViewMatrix[12] = this.position.x;
    modelViewMatrix[13] = this.position.y;
    modelViewMatrix[14] = this.position.z;

    // Apply scale
    modelViewMatrix[0] *= this.scale;
    modelViewMatrix[5] *= this.scale;
    modelViewMatrix[10] *= this.scale;

    this.perspective(
      projectionMatrix,
      Math.PI / 4,
      this.canvas.width / this.canvas.height,
      0.1,
      100,
    );

    // Set basic uniforms
    this.gl.uniform1f(this.timeLocation, currentTime);
    this.gl.uniform1f(this.intensityLocation, this.intensity / 100);
    this.gl.uniform3f(this.colorLocation, 0, 1, 1); // Base cyan
    this.gl.uniformMatrix4fv(
      this.modelViewMatrixLocation,
      false,
      modelViewMatrix,
    );
    this.gl.uniformMatrix4fv(
      this.projectionMatrixLocation,
      false,
      projectionMatrix,
    );

    // Set emotional uniforms
    this.gl.uniform1f(this.happinessLocation, this.emotions.happiness);
    this.gl.uniform1f(this.angerLocation, this.emotions.anger);
    this.gl.uniform1f(this.excitementLocation, this.emotions.excitement);
    this.gl.uniform1f(this.fearLocation, this.emotions.fear);
    this.gl.uniform1f(this.curiosityLocation, this.emotions.curiosity);
    this.gl.uniform1f(this.loveLocation, this.emotions.love);

    // Bind attributes
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(
      this.positionLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0,
    );

    // Draw
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.sphereIndicesLength,
      this.gl.UNSIGNED_SHORT,
      0,
    );

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  updateMovement(deltaTime) {
    const lerpSpeed = 2.0 * deltaTime;
    const scaleLerpSpeed = 1.5 * deltaTime;

    // Smooth movement towards target
    this.position.x = this.lerp(
      this.position.x,
      this.targetPosition.x,
      lerpSpeed,
    );
    this.position.y = this.lerp(
      this.position.y,
      this.targetPosition.y,
      lerpSpeed,
    );
    this.position.z = this.lerp(
      this.position.z,
      this.targetPosition.z,
      lerpSpeed,
    );

    // Smooth scaling
    this.scale = this.lerp(this.scale, this.targetScale, scaleLerpSpeed);

    // Add emotional "breathing" effect
    const breathingScale =
      1.0 + Math.sin(this.lastTime * 3.0) * 0.1 * this.emotions.love;
    this.scale *= breathingScale;

    // Add jittery movement when excited or angry
    if (this.emotions.excitement > 0.6 || this.emotions.anger > 0.4) {
      this.position.x += (Math.random() - 0.5) * 0.2 * this.emotions.excitement;
      this.position.y +=
        (Math.random() - 0.5) * 0.15 * this.emotions.excitement;
    }
  }

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
  }

  perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) / (near - far);
    out[15] = 0;
  }

  rotateY(out, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    out[0] = c;
    out[2] = s;
    out[8] = -s;
    out[10] = c;
  }
}

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", function () {
  window.__aleLegion = new ALELegionApp();
  if (window.parent !== window) {
    window.__aleLegion.isConnected = true;
    window.__aleLegion.updateStatus?.();
  }
});
