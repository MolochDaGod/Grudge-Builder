export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraConfig {
  worldWidth: number;
  worldHeight: number;
  minZoom: number;
  maxZoom: number;
  panSpeed?: number;
  zoomSpeed?: number;
}

export class CameraController {
  private state: CameraState;
  private config: CameraConfig;
  private targetState: CameraState | null = null;
  private smoothing: number = 0.1;

  constructor(config: CameraConfig) {
    this.config = {
      panSpeed: 1,
      zoomSpeed: 0.1,
      ...config,
    };
    
    this.state = {
      x: config.worldWidth / 2,
      y: config.worldHeight / 2,
      zoom: 1,
    };
  }

  getState(): CameraState {
    return { ...this.state };
  }

  pan(dx: number, dy: number): void {
    const scaledDx = dx / this.state.zoom;
    const scaledDy = dy / this.state.zoom;
    
    this.state.x = this.clampX(this.state.x - scaledDx);
    this.state.y = this.clampY(this.state.y - scaledDy);
  }

  zoom(delta: number, centerX?: number, centerY?: number): void {
    const oldZoom = this.state.zoom;
    const newZoom = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, this.state.zoom + delta * this.config.zoomSpeed!)
    );
    
    if (centerX !== undefined && centerY !== undefined) {
      const zoomRatio = newZoom / oldZoom;
      this.state.x = centerX - (centerX - this.state.x) * zoomRatio;
      this.state.y = centerY - (centerY - this.state.y) * zoomRatio;
    }
    
    this.state.zoom = newZoom;
    this.state.x = this.clampX(this.state.x);
    this.state.y = this.clampY(this.state.y);
  }

  centerOn(x: number, y: number, animate: boolean = true): void {
    if (animate) {
      this.targetState = { x, y, zoom: this.state.zoom };
    } else {
      this.state.x = this.clampX(x);
      this.state.y = this.clampY(y);
      this.targetState = null;
    }
  }

  update(): void {
    if (this.targetState) {
      const dx = this.targetState.x - this.state.x;
      const dy = this.targetState.y - this.state.y;
      const dz = this.targetState.zoom - this.state.zoom;
      
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dz) < 0.01) {
        this.state.x = this.targetState.x;
        this.state.y = this.targetState.y;
        this.state.zoom = this.targetState.zoom;
        this.targetState = null;
      } else {
        this.state.x += dx * this.smoothing;
        this.state.y += dy * this.smoothing;
        this.state.zoom += dz * this.smoothing;
      }
    }
  }

  screenToWorld(
    screenX: number,
    screenY: number,
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number } {
    const visibleWidth = viewportWidth / this.state.zoom;
    const visibleHeight = viewportHeight / this.state.zoom;
    
    const worldLeft = this.state.x - visibleWidth / 2;
    const worldTop = this.state.y - visibleHeight / 2;
    
    return {
      x: worldLeft + (screenX / viewportWidth) * visibleWidth,
      y: worldTop + (screenY / viewportHeight) * visibleHeight,
    };
  }

  worldToScreen(
    worldX: number,
    worldY: number,
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number; visible: boolean } {
    const visibleWidth = viewportWidth / this.state.zoom;
    const visibleHeight = viewportHeight / this.state.zoom;
    
    const worldLeft = this.state.x - visibleWidth / 2;
    const worldTop = this.state.y - visibleHeight / 2;
    
    const screenX = ((worldX - worldLeft) / visibleWidth) * viewportWidth;
    const screenY = ((worldY - worldTop) / visibleHeight) * viewportHeight;
    
    const padding = 100;
    const visible = 
      screenX >= -padding && 
      screenX <= viewportWidth + padding &&
      screenY >= -padding && 
      screenY <= viewportHeight + padding;
    
    return { x: screenX, y: screenY, visible };
  }

  getTransformMatrix(viewportWidth: number, viewportHeight: number): DOMMatrix {
    const matrix = new DOMMatrix();
    matrix.translateSelf(viewportWidth / 2, viewportHeight / 2);
    matrix.scaleSelf(this.state.zoom, this.state.zoom);
    matrix.translateSelf(-this.state.x, -this.state.y);
    return matrix;
  }

  private clampX(x: number): number {
    const halfVisible = (this.config.worldWidth / this.state.zoom) / 2;
    const minX = halfVisible;
    const maxX = this.config.worldWidth - halfVisible;
    return Math.max(minX, Math.min(maxX, x));
  }

  private clampY(y: number): number {
    const halfVisible = (this.config.worldHeight / this.state.zoom) / 2;
    const minY = halfVisible;
    const maxY = this.config.worldHeight - halfVisible;
    return Math.max(minY, Math.min(maxY, y));
  }
}
