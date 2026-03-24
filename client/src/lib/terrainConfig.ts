import { assetUrl } from "@/lib/assetConfig";
export interface TerrainTexture {
  id: string;
  name: string;
  diffuse: string;
  normal?: string;
  displacement?: string;
  tileSize: number;
}

export interface TerrainSet {
  grass: TerrainTexture[];
  dirt: TerrainTexture[];
  ground: TerrainTexture[];
  lava: TerrainTexture[];
  control: string[];
  splat: string[];
  tiles: { iso32: string; iso64: string };
}

export const TERRAIN_TEXTURES: TerrainSet = {
  grass: [
    {
      id: "grass_01",
      name: "Lush Grass",
      diffuse: assetUrl("/images/terrain/grass/Grass_01.png"),
      normal: assetUrl("/images/terrain/grass/Grass_01_Nrm.png"),
      tileSize: 4
    },
    {
      id: "grass_02",
      name: "Clover Grass",
      diffuse: assetUrl("/images/terrain/grass/Grass_02.png"),
      normal: assetUrl("/images/terrain/grass/Grass_02_Nrm.png"),
      displacement: assetUrl("/images/terrain/grass/Grass_02_Disp.png"),
      tileSize: 4
    },
    {
      id: "grass_03",
      name: "Wild Grass",
      diffuse: assetUrl("/images/terrain/grass/Grass_03.png"),
      normal: assetUrl("/images/terrain/grass/Grass_03_Nrm.png"),
      tileSize: 4
    },
    {
      id: "grass_04",
      name: "Flowered Grass",
      diffuse: assetUrl("/images/terrain/grass/Grass_04.png"),
      normal: assetUrl("/images/terrain/grass/Grass_04_Nrm.png"),
      tileSize: 4
    }
  ],
  dirt: [
    {
      id: "dirt_01",
      name: "Brown Dirt",
      diffuse: assetUrl("/images/terrain/dirt/Dirt_01.png"),
      normal: assetUrl("/images/terrain/dirt/Dirt_01_Nrm.png"),
      tileSize: 4
    },
    {
      id: "dirt_02",
      name: "Forest Floor",
      diffuse: assetUrl("/images/terrain/dirt/Dirt_02.png"),
      normal: assetUrl("/images/terrain/dirt/Dirt_02_Nrm.png"),
      tileSize: 4
    },
    {
      id: "dirt_04",
      name: "Autumn Leaves",
      diffuse: assetUrl("/images/terrain/dirt/Dirt_04.png"),
      normal: assetUrl("/images/terrain/dirt/Dirt_04_Nrm.png"),
      tileSize: 4
    },
    {
      id: "dirt_05",
      name: "Cracked Earth",
      diffuse: assetUrl("/images/terrain/dirt/Dirt_05.jpg"),
      displacement: assetUrl("/images/terrain/dirt/Dirt_05_Disp.png"),
      tileSize: 4
    },
    {
      id: "dirt_06",
      name: "Volcanic Rock",
      diffuse: assetUrl("/images/terrain/dirt/Dirt_06.jpg"),
      tileSize: 4
    },
    {
      id: "dirt_07",
      name: "Rocky Ground",
      diffuse: assetUrl("/images/terrain/dirt/Dirt_07.jpg"),
      tileSize: 4
    }
  ],
  ground: [
    {
      id: "ground_01",
      name: "Cobblestone",
      diffuse: assetUrl("/images/terrain/ground/Ground_01.png"),
      normal: assetUrl("/images/terrain/ground/Ground_01_Nrm.png"),
      tileSize: 4
    },
    {
      id: "ground_02",
      name: "Stone Tiles",
      diffuse: assetUrl("/images/terrain/ground/Ground_02.png"),
      normal: assetUrl("/images/terrain/ground/Ground_02_Nrm.png"),
      tileSize: 4
    },
    {
      id: "ground_03",
      name: "Mossy Stone",
      diffuse: assetUrl("/images/terrain/ground/Ground_03.png"),
      normal: assetUrl("/images/terrain/ground/Ground_03_Nrm.png"),
      tileSize: 4
    },
    {
      id: "ground_04",
      name: "Pebble Path",
      diffuse: assetUrl("/images/terrain/ground/Ground_04.png"),
      normal: assetUrl("/images/terrain/ground/Ground_04_Nrm.png"),
      tileSize: 4
    }
  ],
  lava: [
    {
      id: "lava_01",
      name: "Molten Lava",
      diffuse: assetUrl("/images/terrain/lava/Lava_01.jpg"),
      tileSize: 4
    }
  ],
  control: [
    assetUrl("/images/terrain/control/Control.png"),
    assetUrl("/images/terrain/control/Control_02.png")
  ],
  splat: [
    assetUrl("/images/terrain/splat/Splat_01.png")
  ],
  tiles: {
    iso32: assetUrl("/images/terrain/tiles/terrain_32.png"),
    iso64: assetUrl("/images/terrain/tiles/terrain_64.png")
  }
};

export const getTerrainTexture = (id: string): TerrainTexture | undefined => {
  const allTextures = [
    ...TERRAIN_TEXTURES.grass,
    ...TERRAIN_TEXTURES.dirt,
    ...TERRAIN_TEXTURES.ground,
    ...TERRAIN_TEXTURES.lava
  ];
  return allTextures.find(t => t.id === id);
};

export const getRandomGrass = (): TerrainTexture => {
  const idx = Math.floor(Math.random() * TERRAIN_TEXTURES.grass.length);
  return TERRAIN_TEXTURES.grass[idx];
};

export const getRandomDirt = (): TerrainTexture => {
  const idx = Math.floor(Math.random() * TERRAIN_TEXTURES.dirt.length);
  return TERRAIN_TEXTURES.dirt[idx];
};

export const getRandomGround = (): TerrainTexture => {
  const idx = Math.floor(Math.random() * TERRAIN_TEXTURES.ground.length);
  return TERRAIN_TEXTURES.ground[idx];
};
