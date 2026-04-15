/**
 * Crossmint Wallet Service — re-export from canonical location.
 *
 * The single source of truth lives in server/services/crossmintWallet.ts.
 * This file exists so that imports from the spriteGeneration directory
 * continue to resolve without changing every import path.
 */
export {
  CrossmintWalletService,
  crossmintWalletService,
} from '../../services/crossmintWallet';
