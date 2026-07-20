export interface LobbyHeightMapData {
  width: number;
  height: number;
  minY: number;
  maxY: number;
  samples: Float32Array | number[];
}

export class LobbyHeightMap {
  data: LobbyHeightMapData;
  constructor(data?: Partial<LobbyHeightMapData>) {
    this.data = {
      width: data?.width ?? 0,
      height: data?.height ?? 0,
      minY: data?.minY ?? 0,
      maxY: data?.maxY ?? 0,
      samples: data?.samples ?? [],
    };
  }
  sample(_x: number, _z: number): number {
    return this.data.minY;
  }
}
