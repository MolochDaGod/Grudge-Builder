-- ========================================================================
-- GRUDA GEAR DATABASE SCHEMA - SQLite/MySQL Compatible
-- Complete schema for GRUDA equipment system with sprites and metadata
-- ========================================================================

-- Part 1: Core GRUDA Gear Table
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_gear (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    item_id VARCHAR(256) NOT NULL UNIQUE,
    display_name VARCHAR(256) NOT NULL,
    description TEXT,
    
    -- Equipment Type
    equipment_slot VARCHAR(50) NOT NULL,  -- Head, Chest, Arms, Hands, Waist, Legs, Feet, MainHand, OffHand, Accessory1-3
    weapon_type VARCHAR(50),   -- Sword, Axe, Mace, Spear, Bow, Staff, Wand, Dagger, Hammer, Scythe
    
 -- Rarity System
    rarity_tier INT NOT NULL DEFAULT 1,  -- 1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary
rarity_level INT DEFAULT 1,
    rarity_multiplier FLOAT DEFAULT 1.0,
    
    -- Base Stats
    base_armor INT DEFAULT 0,
    base_damage INT DEFAULT 0,
    base_health INT DEFAULT 0,
    base_mana INT DEFAULT 0,
    base_strength INT DEFAULT 0,
    base_intelligence INT DEFAULT 0,
    base_vitality INT DEFAULT 0,
    base_speed INT DEFAULT 0,
    
    -- Requirements
    required_level INT DEFAULT 1,
    required_class VARCHAR(50),     -- Empty = any class
    required_faction INT DEFAULT 0, -- 0 = any faction
    
    -- GRUDA Properties
    is_gruda_tier BOOLEAN DEFAULT FALSE,
    is_soulbound BOOLEAN DEFAULT FALSE,
    is_craftable BOOLEAN DEFAULT TRUE,
    is_quest_reward BOOLEAN DEFAULT FALSE,
    nft_contract_address VARCHAR(256),
    token_standard VARCHAR(50) DEFAULT 'SPL',  -- Solana Program Library
    
    -- Pricing
    buy_price BIGINT DEFAULT 0,
    sell_price BIGINT DEFAULT 0,
    marketplace_value BIGINT DEFAULT 0,
    
 -- Enhancement System
    can_be_enhanced BOOLEAN DEFAULT TRUE,
    max_enhancement_level INT DEFAULT 20,
    enhancement_cost_base BIGINT DEFAULT 1000,
    enhancement_cost_multiplier FLOAT DEFAULT 1.5,
    damage_per_enhancement INT DEFAULT 0,
    armor_per_enhancement INT DEFAULT 0,
    health_per_enhancement INT DEFAULT 0,
    
    -- Special Properties
    special_ability_name VARCHAR(256),
    special_ability_power FLOAT DEFAULT 1.0,
    special_ability_cooldown FLOAT DEFAULT 0,
    is_unique BOOLEAN DEFAULT FALSE,
    is_tradeable BOOLEAN DEFAULT TRUE,
    is_destroyable BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    database_id INT,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(256) DEFAULT 'System',
    
    -- Indexes
    INDEX idx_item_id (item_id),
    INDEX idx_equipment_slot (equipment_slot),
    INDEX idx_rarity_tier (rarity_tier),
    INDEX idx_required_level (required_level),
    INDEX idx_is_gruda_tier (is_gruda_tier),
    INDEX idx_is_active (is_active)
);

-- Part 2: Sprite Storage Table
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_gear_sprites (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    gear_id VARCHAR(256) NOT NULL,
    
    -- Sprite References (asset paths)
    inventory_sprite_path VARCHAR(512),
    equipment_slot_sprite_path VARCHAR(512),
    world_prefab_path VARCHAR(512),
    
    -- Alternative Sprites (for different visual themes)
    alt_sprite_1_path VARCHAR(512),
    alt_sprite_2_path VARCHAR(512),
    alt_sprite_3_path VARCHAR(512),
 
    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(256),
    
    FOREIGN KEY (gear_id) REFERENCES gruda_gear(item_id) ON DELETE CASCADE,
    UNIQUE KEY unique_gear_sprites (gear_id),
    INDEX idx_gear_id (gear_id)
);

-- Part 3: Gear Rarity Bonuses Table
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_rarity_bonuses (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    rarity_tier INT NOT NULL UNIQUE,
    rarity_name VARCHAR(50) NOT NULL,
    multiplier FLOAT NOT NULL,
    
    -- Drop Rates
    drop_rate_percent FLOAT,
    
    -- Market Info
    average_price BIGINT,
    price_multiplier FLOAT,
    
    -- Display Color (for UI)
    color_hex VARCHAR(7),
    
    -- Description
    description TEXT,
    
    INDEX idx_rarity_tier (rarity_tier)
);

-- Part 4: Equipment Slot Table
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_equipment_slots (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    slot_name VARCHAR(50) NOT NULL UNIQUE,
    slot_order INT,
    max_items INT DEFAULT 1,
    is_armor BOOLEAN DEFAULT TRUE,
    is_accessory BOOLEAN DEFAULT FALSE,
    description TEXT,
    
    INDEX idx_slot_name (slot_name)
);

-- Part 5: Gear in Inventory (Instance Data)
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_inventory_items (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_account VARCHAR(256) NOT NULL,
    character_id INT NOT NULL,
    
  -- Item Reference
    gear_item_id VARCHAR(256) NOT NULL,
    
    -- Instance Data
    acquisition_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enhancement_level INT DEFAULT 0,
    
    -- Soulbound Info
    is_soulbound BOOLEAN DEFAULT FALSE,
    soulbound_to_account VARCHAR(256),
    
    -- NFT Info (if applicable)
    nft_token_id VARCHAR(256),
    nft_owner_wallet VARCHAR(256),
    blockchain_tx_hash VARCHAR(256),
    
    -- Status
  is_equipped BOOLEAN DEFAULT FALSE,
    equipped_slot VARCHAR(50),
    is_available_for_trade BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    date_acquired TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_last_used TIMESTAMP,
    
    FOREIGN KEY (gear_item_id) REFERENCES gruda_gear(item_id),
    INDEX idx_player_account (player_account),
    INDEX idx_character_id (character_id),
    INDEX idx_gear_item_id (gear_item_id),
 INDEX idx_is_equipped (is_equipped),
    INDEX idx_nft_token_id (nft_token_id)
);

-- Part 6: Gear Compatibility (What gear works with what)
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_gear_compatibility (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    gear_id_1 VARCHAR(256) NOT NULL,
    gear_id_2 VARCHAR(256) NOT NULL,
    
    -- Compatibility
    is_compatible BOOLEAN DEFAULT TRUE,
    bonus_when_paired VARCHAR(256),  -- e.g., "Lifesteal +5%"
 bonus_percentage FLOAT,
    
FOREIGN KEY (gear_id_1) REFERENCES gruda_gear(item_id),
  FOREIGN KEY (gear_id_2) REFERENCES gruda_gear(item_id),
    INDEX idx_gear_1 (gear_id_1),
 INDEX idx_gear_2 (gear_id_2)
);

-- Part 7: Upgrade Paths
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_upgrade_paths (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    base_gear_id VARCHAR(256) NOT NULL,
    upgraded_gear_id VARCHAR(256) NOT NULL,
    upgrade_level INT,
    
    -- Upgrade Cost
    cost_type VARCHAR(50),  -- 'gold', 'gruda_token', 'materials'
    cost_amount BIGINT,
    
    -- Materials Required
    material_requirements TEXT,  -- JSON format
    
    -- Success Rate
    success_rate_percent INT DEFAULT 100,
    
    FOREIGN KEY (base_gear_id) REFERENCES gruda_gear(item_id),
    FOREIGN KEY (upgraded_gear_id) REFERENCES gruda_gear(item_id),
    INDEX idx_base_gear (base_gear_id),
    INDEX idx_upgraded_gear (upgraded_gear_id)
);

-- Part 8: Gear Special Effects
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_special_effects (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    gear_id VARCHAR(256) NOT NULL,
  
    -- Effect Properties
    effect_name VARCHAR(256) NOT NULL,
    effect_type VARCHAR(100),  -- 'passive', 'on_hit', 'on_equip', 'cooldown_ability'
    effect_power FLOAT,
    effect_cooldown FLOAT DEFAULT 0,
    
    -- Description
  description TEXT,
  
    -- Proc Rate (for passive effects)
    proc_rate_percent INT,
    
    FOREIGN KEY (gear_id) REFERENCES gruda_gear(item_id) ON DELETE CASCADE,
    INDEX idx_gear_id (gear_id),
    INDEX idx_effect_type (effect_type)
);

-- Part 9: Drop Rates & Loot Tables
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_loot_drops (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    gear_id VARCHAR(256) NOT NULL,
    
    -- Where it drops
    mob_id INT,
    dungeon_id INT,
  boss_name VARCHAR(256),
    
    -- Drop Rate
    drop_rate_percent FLOAT,
    
    -- Rarity of drop
    drop_rarity_tier INT,
    
    FOREIGN KEY (gear_id) REFERENCES gruda_gear(item_id),
    INDEX idx_gear_id (gear_id),
    INDEX idx_mob_id (mob_id),
    INDEX idx_boss_name (boss_name)
);

-- Part 10: Gear Trading History
-- ========================================================================

CREATE TABLE IF NOT EXISTS gruda_trading_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    inventory_item_id BIGINT,
    from_account VARCHAR(256),
    to_account VARCHAR(256),
    
    -- Trade Details
    trade_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 trade_price BIGINT,
  
    -- NFT Info (if applicable)
  blockchain_tx_hash VARCHAR(256),
    
    FOREIGN KEY (inventory_item_id) REFERENCES gruda_inventory_items(id),
    INDEX idx_from_account (from_account),
    INDEX idx_to_account (to_account),
    INDEX idx_trade_date (trade_date)
);

-- ========================================================================
-- INSERT DEFAULT RARITY TIERS
-- ========================================================================

INSERT IGNORE INTO gruda_rarity_bonuses (rarity_tier, rarity_name, multiplier, color_hex) VALUES
    (1, 'Common', 1.0, '#FFFFFF'),
    (2, 'Uncommon', 1.1, '#00FF00'),
    (3, 'Rare', 1.25, '#0070DD'),
    (4, 'Epic', 1.5, '#A335EE'),
 (5, 'Legendary', 2.0, '#FF8000');

-- ========================================================================
-- INSERT DEFAULT EQUIPMENT SLOTS
-- ========================================================================

INSERT IGNORE INTO gruda_equipment_slots (slot_name, slot_order, max_items, is_armor) VALUES
    ('Head', 1, 1, TRUE),
    ('Chest', 2, 1, TRUE),
('Arms', 3, 1, TRUE),
    ('Hands', 4, 1, TRUE),
 ('Waist', 5, 1, TRUE),
    ('Legs', 6, 1, TRUE),
    ('Feet', 7, 1, TRUE),
    ('MainHand', 8, 1, FALSE),
    ('OffHand', 9, 1, FALSE),
    ('Accessory1', 10, 1, FALSE),
    ('Accessory2', 11, 1, FALSE),
  ('Accessory3', 12, 1, FALSE);

-- ========================================================================
-- VIEWS FOR EASY QUERYING
-- ========================================================================

-- View: All GRUDA Tier Gear
CREATE VIEW IF NOT EXISTS gruda_nft_gear AS
SELECT * FROM gruda_gear WHERE is_gruda_tier = TRUE AND is_active = TRUE;

-- View: All Common Rarity Gear
CREATE VIEW IF NOT EXISTS gruda_common_gear AS
SELECT * FROM gruda_gear WHERE rarity_tier = 1 AND is_active = TRUE;

-- View: All Epic+ Gear
CREATE VIEW IF NOT EXISTS gruda_epic_plus AS
SELECT * FROM gruda_gear WHERE rarity_tier >= 4 AND is_active = TRUE;

-- View: All Weapons
CREATE VIEW IF NOT EXISTS gruda_weapons AS
SELECT * FROM gruda_gear 
WHERE equipment_slot IN ('MainHand', 'OffHand') AND is_active = TRUE;

-- View: All Armor
CREATE VIEW IF NOT EXISTS gruda_armor AS
SELECT * FROM gruda_gear 
WHERE equipment_slot NOT IN ('MainHand', 'OffHand') AND is_active = TRUE;

-- View: Player Gear Inventory
CREATE VIEW IF NOT EXISTS player_gear_inventory AS
SELECT 
    ii.id,
    ii.player_account,
    gg.display_name,
    gg.equipment_slot,
    gg.rarity_tier,
    ii.enhancement_level,
    ii.is_equipped,
    ii.is_soulbound,
    ii.nft_token_id
FROM gruda_inventory_items ii
JOIN gruda_gear gg ON ii.gear_item_id = gg.item_id;

-- ========================================================================
-- INDEXES FOR COMMON QUERIES
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_gear_level_rarity ON gruda_gear(required_level, rarity_tier);
CREATE INDEX IF NOT EXISTS idx_inventory_account_equipped ON gruda_inventory_items(player_account, is_equipped);
CREATE INDEX IF NOT EXISTS idx_inventory_enhancement ON gruda_inventory_items(enhancement_level);

-- ========================================================================
-- END OF SCHEMA
-- ========================================================================
