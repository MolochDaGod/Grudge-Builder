/**
 * Browser adapter for ONE TRUTH probes — logic lives in @shared/fleet/truthProbes.
 */

export {
  GRUDGE_TRUTH_LAYERS,
  buildTruthProbes,
  probeTruthEndpoint,
  runTruthAudit,
  detectSplitBrain,
  scoreTruthProbes,
  TRUTH_PROBE_SPECS,
  TRUTH_DEPRECATED_HOSTS,
  type TruthProbe,
  type TruthProbeRole,
  type TruthProbeSpec,
} from "@shared/fleet/truthProbes";