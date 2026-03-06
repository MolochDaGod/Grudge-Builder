# 🎮 GRUDGE GDevelop Character Creation Scene - Complete Implementation

## 📋 Overview

This guide shows how to build the **Character Creation Scene** in GDevelop using your Unity character selection system as the foundation.

**Based on:** `GenesisGrudge/Scripts/Character/GRUDGE_CharacterCreationHelper.cs`

---

## 🎯 Scene Structure

### **Scene Name:** `CharacterCreationScene`

### **Layers (bottom to top):**
1. **Background** - Background image/gradient
2. **UI** - All UI elements (fixed on screen)
3. **Preview** - Character preview (3D or sprite)

---

## 🖼️ UI Objects to Create

### **1. Race Selection Buttons (6 Total)**

Create 6 sprite buttons using your race icons:

```
Race Buttons:
├── Button_Barbarian (BarbarianIcon.png)
├── Button_Dwarf (DwarfIcon.png)
├── Button_Elf (ElfIcon.png)
├── Button_Human (HumanIcon.png)
├── Button_Orc (OrcIcon.png)
└── Button_Undead (UndeadIcon.png)
```

**Position:** Horizontal row at Y=200
**Size:** 128x128 pixels each
**Spacing:** 20 pixels between buttons

### **2. Class Selection Dropdown**

Create a dropdown/list with 4 classes:
```
Classes:
├── Worg Shapeshifter (Tank)
├── Warrior (Versatile)
├── Mage Priest (Healer)
└── Ranger Scout (DPS)
```

**Position:** X=400, Y=400
**Size:** 300x50 pixels

### **3. Character Name Input**

Create a text input field:
```
Name Input:
├── Placeholder: "Enter character name"
├── Max length: 20 characters
└── Validation: Letters and spaces only
```

**Position:** X=400, Y=500
**Size:** 300x50 pixels

### **4. Character Preview**

Create a sprite object to show selected race:
```
Preview Sprite:
├── Object name: CharacterPreview
├── Animations: Idle animation for each race
└── Size: 256x256 pixels
```

**Position:** X=200, Y=300 (center-left)

### **5. Stats Display**

Create text objects to show race stats:
```
Stats Panel:
├── Health: [value]
├── Mana: [value]
├── Strength: [value]
├── Intelligence: [value]
├── Agility: [value]
└── Vitality: [value]
```

**Position:** X=600, Y=300
**Font:** 18px, white color

### **6. Race Description**

Create a text object for race lore:
```
Description Text:
├── Multi-line text area
├── Font: 16px
└── Max width: 400px
```

**Position:** X=400, Y=600

### **7. Create Character Button**

Create a button to finalize character:
```
Create Button:
├── Text: "Create Character"
├── Size: 200x60 pixels
└── Color: Green (#00FF00)
```

**Position:** X=400, Y=700

### **8. Back Button**

Create a button to return to login:
```
Back Button:
├── Text: "Back to Login"
├── Size: 150x50 pixels
└── Color: Red (#FF0000)
```

**Position:** X=50, Y=50

---

## 🎬 Scene Events

### **Event 1: Initialize Scene**

```
Condition: At the beginning of the scene
Actions:
  - Set variable SelectedRace to "Human" (default)
  - Set variable SelectedClass to "Warrior" (default)
  - Set variable CharacterName to ""
  - Highlight Button_Human (change color to yellow)
  - Update CharacterPreview animation to "Human_Idle"
  - Update stats display for Human race
```

### **Event 2: Race Button Clicks**

**For each race button (Barbarian, Dwarf, Elf, Human, Orc, Undead):**

```
Condition: Button_Barbarian is clicked
Actions:
  - Set variable SelectedRace to "Barbarian"
  - Reset all race button colors to white
  - Change Button_Barbarian color to yellow (selected)
  - Change CharacterPreview animation to "Barbarian_Idle"
  - Update stats display:
    * Health: 110
    * Mana: 30
    * Strength: 20
    * Intelligence: 5
    * Agility: 12
    * Vitality: 14
  - Update description text: "Wild warriors who channel rage into devastating attacks."
  - Play sound: "selectionSound.wav"
```

**Repeat for all 6 races with their respective stats:**

| Race | Health | Mana | Str | Int | Agi | Vit |
|------|--------|------|-----|-----|-----|-----|
| Barbarian | 110 | 30 | 20 | 5 | 12 | 14 |
| Dwarf | 120 | 40 | 18 | 8 | 8 | 16 |
| Elf | 90 | 70 | 10 | 16 | 15 | 10 |
| Human | 100 | 50 | 15 | 12 | 12 | 12 |
| Orc | 115 | 35 | 19 | 6 | 10 | 15 |
| Undead | 95 | 60 | 14 | 14 | 11 | 11 |

### **Event 3: Class Dropdown Selection**

```
Condition: ClassDropdown value changed
Actions:
  - Set variable SelectedClass to ClassDropdown.SelectedText()
  - Update class description based on selection:
    * Worg Shapeshifter: "Primary Tank - Shapeshifts into Bear/Raptor forms"
    * Warrior: "Versatile Fighter - Can adapt to any role"
    * Mage Priest: "Primary Healer - Powerful magic and healing"
    * Ranger Scout: "Primary DPS - Ranged and melee specialist"
```

### **Event 4: Character Name Input**

```
Condition: NameInput text changed
Actions:
  - Set variable CharacterName to NameInput.Text()
  - Validate name (letters and spaces only)
  - If invalid: Show error message "Invalid name"
  - If valid: Hide error message
```

### **Event 5: Create Character Button**

```
Condition: CreateButton is clicked
Condition: CharacterName length > 2
Condition: CharacterName length < 21
Actions:
  - Call GRUDGE_MMO_PlayerCharacter::InitializePlayerCharacter(
      Player,
      Variable(SelectedRace),
      Variable(SelectedClass),
      1
    )
  - Call GRUDGE_MMO_FactionGuild::SetFaction(
      Player,
      "Faction1",
      Variable(SelectedRace)
    )
  - Save character data to global variables:
    * GlobalVariable(PlayerName) = Variable(CharacterName)
    * GlobalVariable(PlayerRace) = Variable(SelectedRace)
    * GlobalVariable(PlayerClass) = Variable(SelectedClass)
  - Change scene to "StartingInstanceScene"
```

### **Event 6: Back Button**

```
Condition: BackButton is clicked
Actions:
  - Change scene to "LoginScene"
```

### **Event 7: Character Preview Animation**

```
Condition: Always (every frame)
Actions:
  - If CharacterPreview animation is "Idle":
    * Do nothing (idle animation loops)
  - If mouse is over CharacterPreview:
    * Play "Wave" animation (emote)
```

---

## 📊 Scene Variables

### **Scene Variables:**
```
SelectedRace (string) = "Human"
SelectedClass (string) = "Warrior"
CharacterName (string) = ""
IsValidName (boolean) = false
```

### **Global Variables (saved for next scene):**
```
PlayerName (string)
PlayerRace (string)
PlayerClass (string)
PlayerLevel (number) = 1
```

---

## 🎨 Visual Design

### **Background:**
- Dark gradient (top: #1a1a2e, bottom: #0f0f1e)
- Optional: Animated particles or stars

### **Race Buttons:**
- Default: White border, 80% opacity
- Hover: Yellow border, 100% opacity
- Selected: Yellow border, 100% opacity, glow effect

### **Text Colors:**
- Headers: Gold (#FFD700)
- Stats: White (#FFFFFF)
- Description: Light gray (#CCCCCC)
- Error messages: Red (#FF0000)

### **Fonts:**
- Headers: 24px, bold
- Stats: 18px, regular
- Description: 16px, regular
- Buttons: 20px, bold

---

## 🔊 Sound Effects

### **Sounds to Add:**
```
selectionSound.wav - When clicking race button
confirmSound.wav - When creating character
errorSound.wav - When validation fails
hoverSound.wav - When hovering over buttons
```

---

## 🎯 Integration with Extensions

### **Use GRUDGE_MMO_PlayerCharacter Extension:**

```
// Initialize player after character creation
GRUDGE_MMO_PlayerCharacter::InitializePlayerCharacter(
  Player,
  Variable(SelectedRace),
  Variable(SelectedClass),
  1
)

// Get player race later
Variable(CurrentRace) = GRUDGE_MMO_PlayerCharacter::GetPlayerRace(Player)
```

### **Use GRUDGE_MMO_FactionGuild Extension:**

```
// Set faction based on race
GRUDGE_MMO_FactionGuild::SetFaction(
  Player,
  "Faction1",
  Variable(SelectedRace)
)
```

---

## 🧪 Testing Checklist

- [ ] All 6 race buttons are clickable
- [ ] Race selection updates character preview
- [ ] Race selection updates stats display
- [ ] Race selection updates description text
- [ ] Class dropdown shows all 4 classes
- [ ] Class selection updates description
- [ ] Name input accepts valid characters
- [ ] Name input rejects invalid characters
- [ ] Create button is disabled if name is invalid
- [ ] Create button creates character and changes scene
- [ ] Back button returns to login scene
- [ ] Sound effects play on interactions
- [ ] Character data is saved to global variables

---

## 📝 Example Event Sheet Structure

```
// Group: Scene Initialization
Event: At the beginning of the scene
  └─ Actions: Initialize default selections

// Group: Race Selection
Event: Button_Barbarian is clicked
  └─ Actions: Select Barbarian race
Event: Button_Dwarf is clicked
  └─ Actions: Select Dwarf race
Event: Button_Elf is clicked
  └─ Actions: Select Elf race
Event: Button_Human is clicked
  └─ Actions: Select Human race
Event: Button_Orc is clicked
  └─ Actions: Select Orc race
Event: Button_Undead is clicked
  └─ Actions: Select Undead race

// Group: Class Selection
Event: ClassDropdown value changed
  └─ Actions: Update class description

// Group: Name Input
Event: NameInput text changed
  └─ Actions: Validate name

// Group: Character Creation
Event: CreateButton is clicked
  └─ Condition: Name is valid
    └─ Actions: Create character and change scene

// Group: Navigation
Event: BackButton is clicked
  └─ Actions: Return to login scene
```

---

## 🚀 Next Steps

1. **Create the scene** in GDevelop
2. **Import race icons** (6 PNG files)
3. **Add UI objects** (buttons, text, input)
4. **Implement events** (race selection, validation)
5. **Test character creation** flow
6. **Connect to StartingInstanceScene**

---

**Status:** ✅ **READY FOR IMPLEMENTATION**
**Complexity:** Medium
**Estimated Time:** 2-3 hours
**Dependencies:** GRUDGE_MMO_PlayerCharacter extension, GRUDGE_MMO_FactionGuild extension

Your character creation scene is now fully designed and ready to build in GDevelop! 🎮✨

