/**
 * Wallet Helper Service for Grudge Builder
 * 
 * Automatically creates Crossmint custodial wallets for new accounts
 * Generates Grudge IDs for cross-game identity
 * Manages server-side wallet operations
 */

import type { Account, User } from "@shared/schema";
import { crossmintWalletService } from "./crossmintWallet";

/**
 * Generate Grudge ID from user ID
 * Format: GRUDGE_<12_UPPERCASE_CHARS>
 */
export function generateGrudgeId(userId: string): string {
  // Remove dashes and take first 12 chars, uppercase
  const cleanId = userId.replace(/-/g, '').substring(0, 12).toUpperCase();
  return `GRUDGE_${cleanId}`;
}

/** Strip Puter keys and invalid chars so Crossmint accepts the email local-part. */
export function sanitizeWalletEmailLocalPart(input: string): string {
  const cleaned = input
    .replace(/^puter:/i, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "user";
}

/**
 * Generate email for wallet creation if user doesn't have one.
 * Real emails pass through; Puter usernames are sanitized.
 */
export function generateWalletEmail(userId: string, username?: string): string {
  if (username && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) && !username.includes(":")) {
    return username.trim().toLowerCase();
  }
  const local = username
    ? sanitizeWalletEmailLocalPart(username)
    : `user-${userId.substring(0, 8)}`;
  return `${local}@grudgewarlords.com`;
}

/**
 * Create or get wallet for account
 */
export async function getOrCreateAccountWallet(
  account: Account,
  user?: User
): Promise<{ walletAddress: string; walletId: string; grudgeId: string } | null> {
  try {
    // Generate Grudge ID
    const grudgeId = generateGrudgeId(account.userId);
    
    // If account already has wallet, return it
    if (account.walletAddress) {
      console.log(`[WalletHelper] Account ${account.id} already has wallet:`, account.walletAddress);
      return {
        walletAddress: account.walletAddress,
        walletId: account.crossmintWalletId || '',
        grudgeId,
      };
    }

    // Determine email for wallet creation
    const email = account.crossmintEmail || 
                  (user?.email) || 
                  generateWalletEmail(account.userId, user?.username);

    console.log(`[WalletHelper] Creating wallet for account ${account.id} with email:`, email);

    // Create Crossmint custodial wallet
    const wallet = await crossmintWalletService.getOrCreateWallet(email);

    if (!wallet) {
      console.error('[WalletHelper] Failed to create wallet for account:', account.id);
      return null;
    }

    console.log(`[WalletHelper] ✅ Created wallet ${wallet.address} for account ${account.id}`);
    console.log(`[WalletHelper] ✅ Grudge ID: ${grudgeId}`);

    return {
      walletAddress: wallet.address,
      walletId: wallet.id,
      grudgeId,
    };
  } catch (error) {
    console.error('[WalletHelper] Error creating account wallet:', error);
    return null;
  }
}

/**
 * Initialize wallet for new user during account creation
 */
export async function initializeUserWallet(
  userId: string,
  username?: string,
  email?: string
): Promise<{ 
  grudgeId: string; 
  walletAddress?: string; 
  walletId?: string;
  crossmintEmail?: string;
} | null> {
  try {
    // Always generate Grudge ID
    const grudgeId = generateGrudgeId(userId);
    
    // Determine email
    const walletEmail = email || generateWalletEmail(userId, username);
    
    console.log(`[WalletHelper] Initializing wallet for user ${userId}`);
    console.log(`[WalletHelper] Grudge ID: ${grudgeId}`);
    console.log(`[WalletHelper] Email: ${walletEmail}`);

    // Try to create wallet, but don't fail if it doesn't work
    const wallet = await crossmintWalletService.getOrCreateWallet(walletEmail);

    if (wallet) {
      console.log(`[WalletHelper] ✅ Wallet created: ${wallet.address}`);
      return {
        grudgeId,
        walletAddress: wallet.address,
        walletId: wallet.id,
        crossmintEmail: walletEmail,
      };
    } else {
      console.warn('[WalletHelper] ⚠️ Wallet creation failed, but continuing with Grudge ID');
      return {
        grudgeId,
        crossmintEmail: walletEmail,
      };
    }
  } catch (error) {
    console.error('[WalletHelper] Error initializing user wallet:', error);
    // Return at least the Grudge ID
    return {
      grudgeId: generateGrudgeId(userId),
    };
  }
}

/**
 * Create wallet during character creation if account doesn't have one
 */
export async function ensureCharacterAccountWallet(
  accountId: string,
  userId: string,
  username?: string
): Promise<{ walletAddress: string; walletId: string } | null> {
  try {
    console.log(`[WalletHelper] Ensuring wallet for character creation (account: ${accountId})`);
    
    // This will be called after we fetch the account from storage
    // For now, just create a wallet with the user info
    const email = generateWalletEmail(userId, username);
    const wallet = await crossmintWalletService.getOrCreateWallet(email);

    if (wallet) {
      console.log(`[WalletHelper] ✅ Ensured wallet: ${wallet.address}`);
      return {
        walletAddress: wallet.address,
        walletId: wallet.id,
      };
    }

    return null;
  } catch (error) {
    console.error('[WalletHelper] Error ensuring character account wallet:', error);
    return null;
  }
}
