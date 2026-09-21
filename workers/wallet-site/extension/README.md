# Gruda Wallet — Chrome extension (unpacked)

This is **not** a seed-phrase wallet. It opens the live Gruda bag so Play (Crossmint) and linked wallets stay the same as [wallet.grudge-studio.com](https://wallet.grudge-studio.com).

## Load unpacked (fastest)

1. Chrome → `chrome://extensions`
2. Developer mode on
3. Load unpacked → this folder
4. Pin Gruda Wallet. Click it: 420×780 window, same session as the site if you are already signed in on that profile.

## What this is / is not

| This | Not this |
|------|----------|
| Shortcut to the production web wallet | Phantom clone with keys in chrome.storage |
| Same Grudge ID + Play address | A new on-chain account |
| Ready for Chrome Web Store as a companion | Wallet Standard inject (`window.solana`) |

Injecting Wallet Standard (so dApps show “Gruda”) needs Crossmint `submitSerializedSolanaTx` in a content script. Do that after the web bag numbers are stable. Do not store a mnemonic here.
