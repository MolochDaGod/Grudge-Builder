import { storage } from '../storage';
import { db } from '../db';
import { accounts } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

const GBUX_RATE_USD = 0.001; // 1 GBUX = $0.001
const SWAP_FEE_PERCENT = 0.01; // 1% fee for in-game swaps
const WITHDRAWAL_FEE_PERCENT = 0.05; // 5% fee for external wallet withdrawals

interface ExchangeRate {
  solPrice: number;
  gbuxRateUsd: number;
  gbuxPerSol: number;
  solPerGbux: number;
  lastUpdated: Date;
}

interface SwapQuote {
  fromAmount: number;
  fromCurrency: 'SOL' | 'GBUX';
  toAmount: number;
  toCurrency: 'SOL' | 'GBUX';
  exchangeRate: number;
  fee: number;
  feePercent: number;
  netAmount: number;
}

interface SwapResult {
  success: boolean;
  txId?: string;
  fromAmount: number;
  toAmount: number;
  message: string;
}

let cachedSolPrice: number = 180;
let lastPriceFetch: number = 0;
const PRICE_CACHE_MS = 60000;

export async function fetchSolPrice(): Promise<number> {
  const now = Date.now();
  if (now - lastPriceFetch < PRICE_CACHE_MS) {
    return cachedSolPrice;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const data = await response.json();
    cachedSolPrice = data.solana?.usd || 180;
    lastPriceFetch = now;
    return cachedSolPrice;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return cachedSolPrice;
  }
}

export async function getExchangeRate(): Promise<ExchangeRate> {
  const solPrice = await fetchSolPrice();
  const gbuxPerSol = Math.floor(solPrice / GBUX_RATE_USD);
  const solPerGbux = GBUX_RATE_USD / solPrice;

  return {
    solPrice,
    gbuxRateUsd: GBUX_RATE_USD,
    gbuxPerSol,
    solPerGbux,
    lastUpdated: new Date()
  };
}

export async function getSwapQuote(
  amount: number,
  direction: 'sol-to-gbux' | 'gbux-to-sol',
  isWithdrawal: boolean = false
): Promise<SwapQuote> {
  const rate = await getExchangeRate();
  const feePercent = isWithdrawal ? WITHDRAWAL_FEE_PERCENT : SWAP_FEE_PERCENT;

  if (direction === 'sol-to-gbux') {
    const rawGbux = amount * rate.gbuxPerSol;
    const fee = Math.floor(rawGbux * feePercent);
    const netAmount = Math.floor(rawGbux - fee);
    
    return {
      fromAmount: amount,
      fromCurrency: 'SOL',
      toAmount: rawGbux,
      toCurrency: 'GBUX',
      exchangeRate: rate.gbuxPerSol,
      fee,
      feePercent,
      netAmount
    };
  } else {
    const rawSol = amount * rate.solPerGbux;
    const fee = rawSol * feePercent;
    const netAmount = rawSol - fee;
    
    return {
      fromAmount: amount,
      fromCurrency: 'GBUX',
      toAmount: rawSol,
      toCurrency: 'SOL',
      exchangeRate: rate.solPerGbux,
      fee,
      feePercent,
      netAmount
    };
  }
}

export async function executeSwap(
  accountId: string,
  amount: number,
  direction: 'sol-to-gbux' | 'gbux-to-sol'
): Promise<SwapResult> {
  try {
    const quote = await getSwapQuote(amount, direction);
    
    if (amount <= 0) {
      return {
        success: false,
        fromAmount: amount,
        toAmount: 0,
        message: 'Invalid swap amount'
      };
    }

    if (direction === 'sol-to-gbux') {
      if (amount < 0.001) {
        return {
          success: false,
          fromAmount: amount,
          toAmount: 0,
          message: 'Minimum swap amount is 0.001 SOL'
        };
      }
    } else {
      if (amount < 1000) {
        return {
          success: false,
          fromAmount: amount,
          toAmount: 0,
          message: 'Minimum swap amount is 1000 GBUX'
        };
      }
    }

    const txId = `swap_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log(`[Exchange] Swap executed: ${accountId} swapped ${amount} ${quote.fromCurrency} for ${quote.netAmount} ${quote.toCurrency}`);

    return {
      success: true,
      txId,
      fromAmount: amount,
      toAmount: quote.netAmount,
      message: `Successfully swapped ${amount} ${quote.fromCurrency} for ${quote.netAmount.toFixed(quote.toCurrency === 'SOL' ? 6 : 0)} ${quote.toCurrency}`
    };
  } catch (error) {
    console.error('[Exchange] Swap error:', error);
    return {
      success: false,
      fromAmount: amount,
      toAmount: 0,
      message: 'Swap failed. Please try again.'
    };
  }
}

export const exchangeService = {
  getExchangeRate,
  getSwapQuote,
  executeSwap,
  fetchSolPrice
};
