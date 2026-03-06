import { useRef, useCallback, useEffect } from 'react';
import {
  CameraState,
  ViewportSize,
  WorldPosition,
  clampCamera,
  screenToWorld,
  createDefaultCamera,
  WORLD_BOUNDS
} from './islandCamera';

export interface CameraTarget {
  id: string;
  position: WorldPosition;
  priority: number;
}

export interface CameraControllerConfig {
  smoothingFactor: number;
  zoomSmoothing: number;
  minZoom: number;
  maxZoom: number;
  panSpeed: number;
  keyboardPanSpeed: number;
  autoFocusEnabled: boolean;
  autoFocusDelay: number;
  bounceBack: boolean;
  cinematicMode: boolean;
}

const DEFAULT_CONFIG: CameraControllerConfig = {
  smoothingFactor: 0.12,
  zoomSmoothing: 0.15,
  minZoom: 0.4,
  maxZoom: 3.5,
  panSpeed: 1.0,
  keyboardPanSpeed: 300,
  autoFocusEnabled: true,
  autoFocusDelay: 3000,
  bounceBack: true,
  cinematicMode: false
};

export interface CameraControllerState {
  current: CameraState;
  target: CameraState;
  velocity: { x: number; y: number; zoom: number };
  isDragging: boolean;
  lastInteraction: number;
  focusedTargets: CameraTarget[];
  isAnimating: boolean;
}

export function createCameraControllerState(): CameraControllerState {
  const defaultCamera = createDefaultCamera();
  return {
    current: { ...defaultCamera },
    target: { ...defaultCamera },
    velocity: { x: 0, y: 0, zoom: 0 },
    isDragging: false,
    lastInteraction: Date.now(),
    focusedTargets: [],
    isAnimating: false
  };
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.min(1, Math.max(0, t));
}

export function smoothDamp(
  current: number,
  target: number,
  velocityRef: { value: number },
  smoothTime: number,
  deltaTime: number,
  maxSpeed: number = Infinity
): number {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  
  let change = current - target;
  const maxChange = maxSpeed * smoothTime;
  change = Math.max(-maxChange, Math.min(maxChange, change));
  
  const temp = (velocityRef.value + omega * change) * deltaTime;
  velocityRef.value = (velocityRef.value - omega * temp) * exp;
  
  let result = target + (change + temp) * exp;
  
  if ((target - current > 0) === (result > target)) {
    result = target;
    velocityRef.value = 0;
  }
  
  return result;
}

export function calculateBoundingBox(targets: CameraTarget[]): { center: WorldPosition; size: { width: number; height: number } } {
  if (targets.length === 0) {
    return { center: { x: 50, y: 50 }, size: { width: 100, height: 100 } };
  }
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const target of targets) {
    minX = Math.min(minX, target.position.x);
    maxX = Math.max(maxX, target.position.x);
    minY = Math.min(minY, target.position.y);
    maxY = Math.max(maxY, target.position.y);
  }
  
  const padding = 15;
  return {
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    },
    size: {
      width: Math.max(30, maxX - minX + padding * 2),
      height: Math.max(30, maxY - minY + padding * 2)
    }
  };
}

export function calculateOptimalZoom(
  boundingBox: { width: number; height: number },
  viewport: ViewportSize,
  config: CameraControllerConfig
): number {
  const worldWidth = 100;
  const worldHeight = 100;
  
  const zoomForWidth = worldWidth / boundingBox.width;
  const zoomForHeight = worldHeight / boundingBox.height;
  
  const optimalZoom = Math.min(zoomForWidth, zoomForHeight) * 0.8;
  
  return Math.max(config.minZoom, Math.min(config.maxZoom, optimalZoom));
}

export function useCameraController(
  setCamera: (camera: CameraState | ((prev: CameraState) => CameraState)) => void,
  viewport: ViewportSize,
  config: Partial<CameraControllerConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const stateRef = useRef<CameraControllerState>(createCameraControllerState());
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: { value: 0 }, y: { value: 0 }, zoom: { value: 0 } });
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(Date.now());
  
  const animate = useCallback(() => {
    const now = Date.now();
    const deltaTime = Math.min((now - lastFrameTimeRef.current) / 1000, 0.1);
    lastFrameTimeRef.current = now;
    
    const state = stateRef.current;
    const smoothTime = 0.2;
    
    const newX = smoothDamp(state.current.x, state.target.x, velocityRef.current.x, smoothTime, deltaTime);
    const newY = smoothDamp(state.current.y, state.target.y, velocityRef.current.y, smoothTime, deltaTime);
    const newZoom = smoothDamp(state.current.zoom, state.target.zoom, velocityRef.current.zoom, smoothTime * 0.8, deltaTime);
    
    const threshold = 0.001;
    const isSettled = 
      Math.abs(newX - state.target.x) < threshold &&
      Math.abs(newY - state.target.y) < threshold &&
      Math.abs(newZoom - state.target.zoom) < threshold * 0.1;
    
    if (!isSettled || state.isAnimating) {
      state.current = { x: newX, y: newY, zoom: newZoom };
      setCamera(state.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      state.current = { ...state.target };
      setCamera(state.current);
      state.isAnimating = false;
      animationFrameRef.current = null;
    }
  }, [setCamera]);
  
  const startAnimation = useCallback(() => {
    if (animationFrameRef.current === null) {
      stateRef.current.isAnimating = true;
      lastFrameTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);
  
  const setTargetPosition = useCallback((x: number, y: number, immediate = false) => {
    const clamped = clampCamera({ x, y, zoom: stateRef.current.target.zoom });
    stateRef.current.target.x = clamped.x;
    stateRef.current.target.y = clamped.y;
    
    if (immediate) {
      stateRef.current.current.x = clamped.x;
      stateRef.current.current.y = clamped.y;
      velocityRef.current.x.value = 0;
      velocityRef.current.y.value = 0;
      setCamera(stateRef.current.current);
    } else {
      startAnimation();
    }
    
    stateRef.current.lastInteraction = Date.now();
  }, [setCamera, startAnimation]);
  
  const setTargetZoom = useCallback((zoom: number, immediate = false) => {
    const clampedZoom = Math.max(mergedConfig.minZoom, Math.min(mergedConfig.maxZoom, zoom));
    stateRef.current.target.zoom = clampedZoom;
    
    if (immediate) {
      stateRef.current.current.zoom = clampedZoom;
      velocityRef.current.zoom.value = 0;
      setCamera(stateRef.current.current);
    } else {
      startAnimation();
    }
    
    stateRef.current.lastInteraction = Date.now();
  }, [mergedConfig.minZoom, mergedConfig.maxZoom, setCamera, startAnimation]);
  
  const focusOnTargets = useCallback((targets: CameraTarget[], immediate = false) => {
    if (targets.length === 0) return;
    
    stateRef.current.focusedTargets = targets;
    const bbox = calculateBoundingBox(targets);
    const optimalZoom = calculateOptimalZoom(bbox.size, viewport, mergedConfig);
    
    setTargetPosition(bbox.center.x, bbox.center.y, immediate);
    setTargetZoom(optimalZoom, immediate);
  }, [viewport, mergedConfig, setTargetPosition, setTargetZoom]);
  
  const focusOnPosition = useCallback((pos: WorldPosition, zoom?: number, immediate = false) => {
    setTargetPosition(pos.x, pos.y, immediate);
    if (zoom !== undefined) {
      setTargetZoom(zoom, immediate);
    }
  }, [setTargetPosition, setTargetZoom]);
  
  const panBy = useCallback((deltaX: number, deltaY: number) => {
    const visibleWidth = 100 / stateRef.current.current.zoom;
    const visibleHeight = 100 / stateRef.current.current.zoom;
    
    const worldDeltaX = (deltaX / viewport.width) * visibleWidth * mergedConfig.panSpeed;
    const worldDeltaY = (deltaY / viewport.height) * visibleHeight * mergedConfig.panSpeed;
    
    setTargetPosition(
      stateRef.current.target.x + worldDeltaX,
      stateRef.current.target.y + worldDeltaY
    );
  }, [viewport, mergedConfig.panSpeed, setTargetPosition]);
  
  const zoomAtPoint = useCallback((delta: number, screenPoint: { x: number; y: number }) => {
    const state = stateRef.current;
    const worldBefore = screenToWorld(screenPoint, state.current, viewport);
    
    const newZoom = Math.max(
      mergedConfig.minZoom,
      Math.min(mergedConfig.maxZoom, state.target.zoom + delta)
    );
    
    const zoomRatio = newZoom / state.current.zoom;
    const newX = worldBefore.x - (worldBefore.x - state.current.x) / zoomRatio;
    const newY = worldBefore.y - (worldBefore.y - state.current.y) / zoomRatio;
    
    setTargetPosition(newX, newY);
    setTargetZoom(newZoom);
  }, [viewport, mergedConfig.minZoom, mergedConfig.maxZoom, setTargetPosition, setTargetZoom]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      stateRef.current.isDragging = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!stateRef.current.isDragging) return;
    
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    
    panBy(-deltaX, -deltaY);
  }, [panBy]);
  
  const handleMouseUp = useCallback(() => {
    stateRef.current.isDragging = false;
  }, []);
  
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = -e.deltaY * 0.001;
    zoomAtPoint(delta, { x: mouseX, y: mouseY });
  }, [zoomAtPoint]);
  
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    const speed = mergedConfig.keyboardPanSpeed / 60;
    
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        panBy(0, -speed);
        e.preventDefault();
        break;
      case 's':
      case 'arrowdown':
        panBy(0, speed);
        e.preventDefault();
        break;
      case 'a':
      case 'arrowleft':
        panBy(-speed, 0);
        e.preventDefault();
        break;
      case 'd':
      case 'arrowright':
        panBy(speed, 0);
        e.preventDefault();
        break;
      case 'home':
        focusOnPosition({ x: 50, y: 50 }, 1);
        e.preventDefault();
        break;
    }
  }, [mergedConfig.keyboardPanSpeed, panBy, focusOnPosition]);
  
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return {
    state: stateRef.current,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onWheel: handleWheel
    },
    actions: {
      focusOnTargets,
      focusOnPosition,
      panBy,
      zoomAtPoint,
      setTargetPosition,
      setTargetZoom
    },
    keyboard: {
      handleKeyboard
    },
    isDragging: stateRef.current.isDragging
  };
}

export type CameraController = ReturnType<typeof useCameraController>;
