// Island Camera System - World-to-Screen Coordinate Transforms
// Ensures entities stay in correct positions during zoom/pan

export interface CameraState {
  x: number;        // Camera center X in world units (0-100)
  y: number;        // Camera center Y in world units (0-100)
  zoom: number;     // Zoom level (0.5 = zoomed out, 2.0 = zoomed in)
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface WorldPosition {
  x: number;  // World X (0-100 representing island width)
  y: number;  // World Y (0-100 representing island height)
}

export interface ScreenPosition {
  x: number;  // Screen X in pixels
  y: number;  // Screen Y in pixels
  visible: boolean; // Whether position is within viewport
}

// Convert world coordinates to screen pixels
export function worldToScreen(
  world: WorldPosition,
  camera: CameraState,
  viewport: ViewportSize
): ScreenPosition {
  // World size in "units" (we treat 100 units as the full island)
  const worldWidth = 100;
  const worldHeight = 100;
  
  // Calculate the visible world area based on zoom
  // At zoom 1.0, we see the full 100x100 world
  // At zoom 2.0, we see 50x50 centered on camera
  const visibleWorldWidth = worldWidth / camera.zoom;
  const visibleWorldHeight = worldHeight / camera.zoom;
  
  // Calculate world bounds visible in viewport
  const worldLeft = camera.x - visibleWorldWidth / 2;
  const worldTop = camera.y - visibleWorldHeight / 2;
  
  // Convert world position to screen position
  const normalizedX = (world.x - worldLeft) / visibleWorldWidth;
  const normalizedY = (world.y - worldTop) / visibleWorldHeight;
  
  const screenX = normalizedX * viewport.width;
  const screenY = normalizedY * viewport.height;
  
  // Check if visible (with some padding for off-screen sprites)
  const padding = 100;
  const visible = 
    screenX >= -padding && 
    screenX <= viewport.width + padding &&
    screenY >= -padding && 
    screenY <= viewport.height + padding;
  
  return { x: screenX, y: screenY, visible };
}

// Convert screen pixels to world coordinates
export function screenToWorld(
  screen: { x: number; y: number },
  camera: CameraState,
  viewport: ViewportSize
): WorldPosition {
  const worldWidth = 100;
  const worldHeight = 100;
  
  const visibleWorldWidth = worldWidth / camera.zoom;
  const visibleWorldHeight = worldHeight / camera.zoom;
  
  const worldLeft = camera.x - visibleWorldWidth / 2;
  const worldTop = camera.y - visibleWorldHeight / 2;
  
  const normalizedX = screen.x / viewport.width;
  const normalizedY = screen.y / viewport.height;
  
  const worldX = worldLeft + normalizedX * visibleWorldWidth;
  const worldY = worldTop + normalizedY * visibleWorldHeight;
  
  return { x: worldX, y: worldY };
}

// World bounds - extended ocean to avoid black edges
export const WORLD_BOUNDS = {
  minX: -50,  // Extended left (ocean)
  maxX: 150,  // Extended right (ocean)
  minY: -50,  // Extended top (ocean)
  maxY: 150,  // Extended bottom (ocean)
  islandMinX: 0,
  islandMaxX: 100,
  islandMinY: 0,
  islandMaxY: 100
};

// Clamp camera to world bounds (extended for ocean)
export function clampCamera(camera: CameraState): CameraState {
  const visibleWidth = 100 / camera.zoom;
  const visibleHeight = 100 / camera.zoom;
  
  // Allow camera to pan into extended ocean area
  const worldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
  const worldHeight = WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY;
  
  const minX = WORLD_BOUNDS.minX + visibleWidth / 2;
  const maxX = WORLD_BOUNDS.maxX - visibleWidth / 2;
  const minY = WORLD_BOUNDS.minY + visibleHeight / 2;
  const maxY = WORLD_BOUNDS.maxY - visibleHeight / 2;
  
  return {
    x: Math.max(minX, Math.min(maxX, camera.x)),
    y: Math.max(minY, Math.min(maxY, camera.y)),
    zoom: camera.zoom
  };
}

// Pan camera by delta (in screen pixels)
export function panCamera(
  camera: CameraState,
  deltaX: number,
  deltaY: number,
  viewport: ViewportSize
): CameraState {
  const visibleWidth = 100 / camera.zoom;
  const visibleHeight = 100 / camera.zoom;
  
  // Convert pixel delta to world delta
  const worldDeltaX = (deltaX / viewport.width) * visibleWidth;
  const worldDeltaY = (deltaY / viewport.height) * visibleHeight;
  
  return clampCamera({
    x: camera.x - worldDeltaX,
    y: camera.y - worldDeltaY,
    zoom: camera.zoom
  });
}

// Zoom camera centered on a point
export function zoomCamera(
  camera: CameraState,
  zoomDelta: number,
  centerScreen: { x: number; y: number },
  viewport: ViewportSize
): CameraState {
  const newZoom = Math.max(0.5, Math.min(3, camera.zoom + zoomDelta));
  
  // Get world position under cursor before zoom
  const worldUnderCursor = screenToWorld(centerScreen, camera, viewport);
  
  // Create new camera with updated zoom
  const newCamera = { ...camera, zoom: newZoom };
  
  // Get where the cursor world position would be on screen after zoom
  const newScreenPos = worldToScreen(worldUnderCursor, newCamera, viewport);
  
  // Adjust camera to keep cursor position stable
  const visibleWidth = 100 / newZoom;
  const visibleHeight = 100 / newZoom;
  
  const screenDeltaX = centerScreen.x - newScreenPos.x;
  const screenDeltaY = centerScreen.y - newScreenPos.y;
  
  const worldDeltaX = (screenDeltaX / viewport.width) * visibleWidth;
  const worldDeltaY = (screenDeltaY / viewport.height) * visibleHeight;
  
  return clampCamera({
    x: newCamera.x - worldDeltaX,
    y: newCamera.y - worldDeltaY,
    zoom: newZoom
  });
}

// Center camera on a world position
export function centerCameraOn(
  worldPos: WorldPosition,
  currentZoom: number = 1
): CameraState {
  return clampCamera({
    x: worldPos.x,
    y: worldPos.y,
    zoom: currentZoom
  });
}

// Default camera state (centered, no zoom)
export function createDefaultCamera(): CameraState {
  return {
    x: 50,
    y: 50,
    zoom: 1
  };
}

// Get background transform style (for CSS)
// This transforms a 100% sized element to show the correct portion of the world
// CSS transforms: scale is applied first, then translate is applied in scaled coordinates
export function getBackgroundTransform(camera: CameraState): React.CSSProperties {
  // Calculate offset from center of world (50,50)
  // When camera.x=50 and camera.y=50, we should see the center (no translation)
  // When camera.x=0, we should shift right to see the left edge
  // Divide by zoom to compensate for the scale applied first
  const translateX = (50 - camera.x) / camera.zoom;
  const translateY = (50 - camera.y) / camera.zoom;
  
  return {
    transform: `scale(${camera.zoom}) translate(${translateX}%, ${translateY}%)`,
    transformOrigin: 'center center'
  };
}

// Get ocean background style (for infinite scrolling GIF)
export function getOceanBackgroundStyle(camera: CameraState): React.CSSProperties {
  // Ocean covers much larger area than island
  const oceanScale = 3; // Ocean is 3x larger than viewport
  const translateX = (50 - camera.x) * camera.zoom * 0.5; // Slower parallax for ocean
  const translateY = (50 - camera.y) * camera.zoom * 0.5;
  
  return {
    transform: `scale(${camera.zoom * oceanScale}) translate(${translateX}%, ${translateY}%)`,
    transformOrigin: 'center center'
  };
}
