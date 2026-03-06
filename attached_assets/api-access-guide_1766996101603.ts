/**
 * GRUDGE Warlords API Access Guide
 * Copy this file to your other Replit project to access data via API
 * 
 * Set YOUR_APP_URL as a secret in your Replit project with your deployed app URL
 * (e.g., https://your-repl-name.replit.app)
 */

const API_BASE = process.env.YOUR_APP_URL || '';

// ============================================
// GOOGLE SHEETS DATA (Read-only, cached 5 min)
// ============================================

export async function fetchWeapons() {
  const res = await fetch(`${API_BASE}/api/sheets/weapons`);
  return res.json();
}

export async function fetchArmor() {
  const res = await fetch(`${API_BASE}/api/sheets/armor`);
  return res.json();
}

export async function fetchChefRecipes() {
  const res = await fetch(`${API_BASE}/api/sheets/chef`);
  return res.json();
}

export async function fetchItems() {
  const res = await fetch(`${API_BASE}/api/sheets/items`);
  return res.json();
}

export async function fetchCraftingRecipes() {
  const res = await fetch(`${API_BASE}/api/sheets/crafting`);
  return res.json();
}

// ============================================
// CHARACTER DATA
// ============================================

export async function getCharacters() {
  const res = await fetch(`${API_BASE}/api/characters`);
  return res.json();
}

export async function getCharacter(id: string) {
  const res = await fetch(`${API_BASE}/api/characters/${id}`);
  return res.json();
}

export async function createCharacter(data: {
  userId: string;
  name: string;
  profession: string;
}) {
  const res = await fetch(`${API_BASE}/api/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ============================================
// SHOP / TRADING POST
// ============================================

export async function buyRecipe(characterId: string, recipeId: string, price: number) {
  const res = await fetch(`${API_BASE}/api/shop/buy-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, recipeId, price }),
  });
  return res.json();
}

export async function buyMaterial(characterId: string, materialName: string, quantity: number, pricePerUnit: number) {
  const res = await fetch(`${API_BASE}/api/shop/buy-material`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, materialName, quantity, pricePerUnit }),
  });
  return res.json();
}

export async function sellMaterial(characterId: string, materialName: string, quantity: number, pricePerUnit: number) {
  const res = await fetch(`${API_BASE}/api/shop/sell-material`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, materialName, quantity, pricePerUnit }),
  });
  return res.json();
}

export async function getTransactionHistory(characterId: string) {
  const res = await fetch(`${API_BASE}/api/shop/transactions/${characterId}`);
  return res.json();
}

// ============================================
// SKILLS
// ============================================

export async function getUnlockedSkills(characterId: string) {
  const res = await fetch(`${API_BASE}/api/skills/${characterId}`);
  return res.json();
}

export async function unlockSkill(characterId: string, nodeId: string, profession: string, cost: number) {
  const res = await fetch(`${API_BASE}/api/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, nodeId, profession, cost }),
  });
  return res.json();
}
