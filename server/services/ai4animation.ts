import fs from "node:fs";
import path from "node:path";

/**
 * AI4Animation Integration Service
 * 
 * References the AI4Animation project (https://github.com/sebastianstarke/AI4Animation)
 * for neural network-based character animation systems:
 * - PFNN (Phase-Functioned Neural Networks) for locomotion
 * - Motion Matching for responsive animation transitions
 * - DeepPhase for periodic motion generation
 * - Local Motion Phases for character control
 * 
 * Since the full repo requires ~3GB (LFS), this service works with:
 * 1. A local shallow clone if available (E:\GrudgeDefense\AI4Animation-code)
 * 2. Remote GitHub API references for model metadata
 * 3. Cached model descriptions for the launcher UI
 */

export interface AnimationModel {
  id: string;
  name: string;
  paper: string;
  year: number;
  description: string;
  category: "locomotion" | "interaction" | "phase" | "style" | "general";
  framework: "tensorflow" | "pytorch" | "unity";
  dataFiles: string[];
  demoAvailable: boolean;
  repoPath: string;
  githubUrl: string;
}

export interface AI4AnimationStatus {
  localRepoAvailable: boolean;
  localRepoPath: string | null;
  models: AnimationModel[];
  totalModels: number;
  githubUrl: string;
}

// Known AI4Animation models catalog (from published papers)
const AI4ANIMATION_MODELS: AnimationModel[] = [
  {
    id: "pfnn",
    name: "Phase-Functioned Neural Networks",
    paper: "SIGGRAPH 2017",
    year: 2017,
    description:
      "Real-time character locomotion using phase-functioned neural networks. Generates natural walking, running, and terrain-adaptive movement with a compact neural network that uses phase as a cycling variable.",
    category: "locomotion",
    framework: "tensorflow",
    dataFiles: ["W0_000.bin", "W1_000.bin", "W2_000.bin", "b0_000.bin", "b1_000.bin", "b2_000.bin"],
    demoAvailable: true,
    repoPath: "AI4Animation/SIGGRAPH_2017",
    githubUrl: "https://github.com/sebastianstarke/AI4Animation/tree/master/AI4Animation/SIGGRAPH_2017",
  },
  {
    id: "mode-adaptive",
    name: "Mode-Adaptive Neural Networks",
    paper: "SIGGRAPH 2018",
    year: 2018,
    description:
      "Character animation using mode-adaptive neural networks that automatically learns to combine different motion modes. Supports complex character-scene interactions like sitting, climbing, and carrying objects.",
    category: "interaction",
    framework: "tensorflow",
    dataFiles: [],
    demoAvailable: true,
    repoPath: "AI4Animation/SIGGRAPH_2018",
    githubUrl: "https://github.com/sebastianstarke/AI4Animation/tree/master/AI4Animation/SIGGRAPH_2018",
  },
  {
    id: "nss",
    name: "Neural State Machine",
    paper: "SIGGRAPH 2019",
    year: 2019,
    description:
      "Neural state machine for character-scene interactions. Generates animations that adapt to dynamic environments with different objects, enabling complex multi-character and object interactions.",
    category: "interaction",
    framework: "tensorflow",
    dataFiles: [],
    demoAvailable: true,
    repoPath: "AI4Animation/SIGGRAPH_2019",
    githubUrl: "https://github.com/sebastianstarke/AI4Animation/tree/master/AI4Animation/SIGGRAPH_2019",
  },
  {
    id: "local-motion-phases",
    name: "Local Motion Phases",
    paper: "SIGGRAPH 2020",
    year: 2020,
    description:
      "Per-joint phase computation for local motion control. Each body part has its own phase channel, enabling more natural asynchronous movements like walking while gesturing.",
    category: "phase",
    framework: "pytorch",
    dataFiles: [],
    demoAvailable: true,
    repoPath: "AI4Animation/SIGGRAPH_2020",
    githubUrl: "https://github.com/sebastianstarke/AI4Animation/tree/master/AI4Animation/SIGGRAPH_2020",
  },
  {
    id: "periodic-autoencoder",
    name: "Periodic Autoencoder",
    paper: "SIGGRAPH 2022",
    year: 2022,
    description:
      "Discovers periodic structure in motion data using autoencoders. Learns multi-dimensional phase manifolds that capture the rhythmic patterns in character motion for more natural locomotion and style transfer.",
    category: "phase",
    framework: "pytorch",
    dataFiles: [],
    demoAvailable: true,
    repoPath: "AI4Animation/SIGGRAPH_2022",
    githubUrl: "https://github.com/sebastianstarke/AI4Animation/tree/master/AI4Animation/SIGGRAPH_2022",
  },
  {
    id: "deep-phase",
    name: "DeepPhase",
    paper: "SIGGRAPH 2024",
    year: 2024,
    description:
      "Advanced phase-based motion generation with deep learning. Combines learned periodic structures with neural network-based motion synthesis for real-time character animation in games.",
    category: "phase",
    framework: "pytorch",
    dataFiles: [],
    demoAvailable: true,
    repoPath: "AI4Animation/SIGGRAPH_2024",
    githubUrl: "https://github.com/sebastianstarke/AI4Animation/tree/master/AI4Animation/SIGGRAPH_2024",
  },
];

// Grudge Warlords animation mapping
export interface GrudgeAnimationMapping {
  grudgeAction: string;
  ai4animModel: string;
  description: string;
  applicableClasses: string[];
}

export const GRUDGE_ANIMATION_MAPPINGS: GrudgeAnimationMapping[] = [
  {
    grudgeAction: "locomotion",
    ai4animModel: "pfnn",
    description: "Natural terrain-adaptive movement for all characters traversing islands",
    applicableClasses: ["warrior", "mage", "ranger", "shapeshifter"],
  },
  {
    grudgeAction: "combat-melee",
    ai4animModel: "local-motion-phases",
    description: "Per-joint phase for Warriors wielding swords, shields, and 2H weapons",
    applicableClasses: ["warrior"],
  },
  {
    grudgeAction: "combat-ranged",
    ai4animModel: "local-motion-phases",
    description: "Asynchronous aiming + movement for Rangers with bows, crossbows, guns",
    applicableClasses: ["ranger"],
  },
  {
    grudgeAction: "spellcasting",
    ai4animModel: "mode-adaptive",
    description: "Mode-adaptive casting animations for Mages (staffs, tomes, wands)",
    applicableClasses: ["mage"],
  },
  {
    grudgeAction: "shapeshifting",
    ai4animModel: "periodic-autoencoder",
    description: "Phase-based form transitions for Worge (Bear, Raptor, Large Bird forms)",
    applicableClasses: ["shapeshifter"],
  },
  {
    grudgeAction: "crew-interaction",
    ai4animModel: "nss",
    description: "Neural state machine for AI crew members interacting with environment",
    applicableClasses: ["warrior", "mage", "ranger", "shapeshifter"],
  },
  {
    grudgeAction: "parry-counter",
    ai4animModel: "local-motion-phases",
    description: "Precise per-joint timing for Ranger RMB+LMB parry and counter mechanics",
    applicableClasses: ["ranger", "warrior"],
  },
  {
    grudgeAction: "stamina-sprint",
    ai4animModel: "pfnn",
    description: "Phase-functioned sprint, charge, and double-jump animations for Warriors",
    applicableClasses: ["warrior"],
  },
];

const LOCAL_REPO_PATHS = [
  "E:\\GrudgeDefense\\AI4Animation-code",
  "E:\\GrudgeDefense\\AI4Animation",
];

function findLocalRepo(): string | null {
  for (const p of LOCAL_REPO_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function scanLocalModels(repoPath: string): string[] {
  const found: string[] = [];
  try {
    const entries = fs.readdirSync(path.join(repoPath, "AI4Animation"), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("SIGGRAPH")) {
        found.push(entry.name);
      }
    }
  } catch {
    // repo structure may differ
  }
  return found;
}

export function getAI4AnimationStatus(): AI4AnimationStatus {
  const localRepo = findLocalRepo();
  const localModels = localRepo ? scanLocalModels(localRepo) : [];

  const models = AI4ANIMATION_MODELS.map((m) => ({
    ...m,
    demoAvailable: localModels.some((lm) => m.repoPath.includes(lm)),
  }));

  return {
    localRepoAvailable: !!localRepo,
    localRepoPath: localRepo,
    models,
    totalModels: models.length,
    githubUrl: "https://github.com/sebastianstarke/AI4Animation",
  };
}

export function getAnimationMappings(): GrudgeAnimationMapping[] {
  return GRUDGE_ANIMATION_MAPPINGS;
}

export function getModelById(id: string): AnimationModel | undefined {
  return AI4ANIMATION_MODELS.find((m) => m.id === id);
}

export function getModelsForClass(classId: string): GrudgeAnimationMapping[] {
  return GRUDGE_ANIMATION_MAPPINGS.filter((m) =>
    m.applicableClasses.includes(classId.toLowerCase())
  );
}
