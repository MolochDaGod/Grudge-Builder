/**
 * NFT Minting Service — canonical re-export.
 *
 * The implementation lives in spriteGeneration/services/nftMinting.ts
 * (which has direct access to the DB schema and Crossmint wallet service).
 * This module re-exports everything so that routes.ts can import from
 * "./services/nftMinting" as expected.
 */
export {
  nftMintingService,
  NFTMintingService,
  type MintCharacterResult,
  type NFTStatus,
  type EnrichedNFTStatus,
} from '../spriteGeneration/services/nftMinting';
