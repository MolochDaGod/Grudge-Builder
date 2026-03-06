# 🎨 GRUDGE Character Selection - Visual Implementation Guide

## 📋 Based on Your Images

This guide recreates the **exact character selection layout** from your images with faction-colored borders and 3D character previews.

---

## 🎯 Layout Specifications

### **Screen Resolution:** 1920x1080

### **Grid Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                     CHARACTER SELECTION                              │
│                                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │   HUMAN     │    │  BARBARIAN  │    │   UNDEAD    │            │
│  │  [Crusade]  │    │  [Crusade]  │    │   [Legion]  │            │
│  │   BLUE      │    │    BLUE     │    │     RED     │            │
│  │             │    │             │    │             │            │
│  │   [3D       │    │   [3D       │    │   [3D       │            │
│  │   Model]    │    │   Model]    │    │   Model]    │            │
│  │             │    │             │    │             │            │
│  │ Description │    │ Description │    │ Description │            │
│  └─────────────┘    └─────────────┘    └─────────────┘            │
│                                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │    ORC      │    │     ELF     │    │    DWARF    │            │
│  │  [Legion]   │    │  [Fabled]   │    │  [Fabled]   │            │
│  │    RED      │    │    GREEN    │    │    GREEN    │            │
│  │             │    │             │    │             │            │
│  │   [3D       │    │   [3D       │    │   [3D       │            │
│  │   Model]    │    │   Model]    │    │   Model]    │            │
│  │             │    │             │    │             │            │
│  │ Description │    │ Description │    │ Description │            │
│  └─────────────┘    └─────────────┘    └─────────────┘            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Exact Positions and Sizes

### **Card Dimensions:**
- **Width:** 400px
- **Height:** 550px
- **Border Width:** 6px
- **Corner Radius:** 8px

### **Card Positions (X, Y):**

**Top Row:**
- **Human:** X=260, Y=250
- **Barbarian:** X=760, Y=250
- **Undead:** X=1260, Y=250

**Bottom Row:**
- **Orc:** X=260, Y=850
- **Elf:** X=760, Y=850
- **Dwarf:** X=1260, Y=850

### **Spacing:**
- **Horizontal Gap:** 100px between cards
- **Vertical Gap:** 50px between rows
- **Top Margin:** 150px from screen top
- **Side Margins:** 160px from screen edges

---

## 🎨 Card Component Layout

### **Each Card Contains (from top to bottom):**

```
┌────────────────────────────────────┐
│ [Icon]  RACE NAME    [Badge]       │ ← Header (60px height)
├────────────────────────────────────┤
│                                    │
│                                    │
│         3D CHARACTER               │ ← Character Preview (350px height)
│            MODEL                   │
│                                    │
│                                    │
├────────────────────────────────────┤
│ "Race description text goes        │ ← Description (140px height)
│  here with lore and faction        │
│  information..."                   │
└────────────────────────────────────┘
```

### **Component Positions (relative to card):**

**Header Section (Y=0 to Y=60):**
- **Race Icon:** X=10, Y=10, Size=48x48
- **Race Name:** X=70, Y=15, Font=28px Bold
- **Faction Badge:** X=340, Y=10, Size=48x48

**Character Preview (Y=60 to Y=410):**
- **3D Model Sprite:** X=50, Y=80, Size=300x330
- **Centered in card**

**Description Section (Y=410 to Y=550):**
- **Description Text:** X=20, Y=420, Width=360px, Font=16px
- **Line Height:** 20px
- **Max Lines:** 6

---

## 🎨 Faction-Specific Styling

### **Crusade (Blue) - Human & Barbarian:**

**Border:**
```
Color: #2E5C8A (RGB: 46, 92, 138)
Glow: #4A90E2 (RGB: 74, 144, 226)
Width: 6px
Style: Solid with outer glow
```

**Badge:**
```
Icon: Blue shield with cross
Position: Top-right corner
Size: 48x48
```

**Text Colors:**
```
Race Name: #FFFFFF (White)
Faction Name: #4A90E2 (Light Blue)
Description: #CCCCCC (Light Gray)
```

---

### **Legion (Red) - Orc & Undead:**

**Border:**
```
Color: #8A2E2E (RGB: 138, 46, 46)
Glow: #E24A4A (RGB: 226, 74, 74)
Width: 6px
Style: Solid with outer glow
```

**Badge:**
```
Icon: Red skull
Position: Top-right corner
Size: 48x48
```

**Text Colors:**
```
Race Name: #FFFFFF (White)
Faction Name: #E24A4A (Light Red)
Description: #CCCCCC (Light Gray)
```

---

### **Fabled (Green) - Elf & Dwarf:**

**Border:**
```
Color: #2E8A4F (RGB: 46, 138, 79)
Glow: #4AE27A (RGB: 74, 226, 122)
Width: 6px
Style: Solid with outer glow
```

**Badge:**
```
Icon: Green leaf/tree
Position: Top-right corner
Size: 48x48
```

**Text Colors:**
```
Race Name: #FFFFFF (White)
Faction Name: #4AE27A (Light Green)
Description: #CCCCCC (Light Gray)
```

---

## 📝 Race Descriptions (from your images)

### **Human (Crusade):**
```
"Noble warriors of honor and chivalry, the Humans form the 
backbone of the Crusade's disciplined armies."
```

### **Barbarian (Crusade):**
```
"Fierce tribal warriors who fight alongside the Humans, the 
Barbarians bring raw strength to the Crusade."
```

### **Undead (Legion):**
```
"Risen from death itself, the Undead serve the Legion with 
unwavering loyalty and dark magic."
```

### **Orc (Legion):**
```
"Brutal and savage, the Orcs crush their enemies with 
overwhelming force for the glory of the Legion."
```

### **Elf (Fabled):**
```
"Ancient and wise, the Elves wield nature's power and arcane 
arts in defense of the Fabled lands."
```

### **Dwarf (Fabled):**
```
"Master craftsmen and resilient fighters, the Dwarves stand as 
the Fabled faction's mountain stronghold."
```

---

## 🎮 GDevelop Object Setup

### **For Each Race Card:**

**1. Create Card Background:**
```
Object Type: Sprite
Name: CardBG_[RaceName]
Image: Dark panel (400x550)
Color: #1A1A1A (Very Dark Gray)
Position: See positions above
Layer: Cards
```

**2. Create Card Border:**
```
Object Type: Sprite
Name: CardBorder_[RaceName]
Image: Border frame (412x556)
Color: Faction color (Blue/Red/Green)
Position: Card position - 6px offset
Layer: Cards
Effect: Glow (faction color)
```

**3. Add Race Icon:**
```
Object Type: Sprite
Name: RaceIcon_[RaceName]
Image: [RaceName]Icon.png (64x64)
Position: Card X + 10, Card Y + 10
Layer: Cards
```

**4. Add Race Name Text:**
```
Object Type: Text
Name: RaceName_[RaceName]
Text: "[RACE NAME]"
Font: Arial Bold, 28px
Color: #FFFFFF (White)
Position: Card X + 70, Card Y + 15
Layer: Cards
```

**5. Add Faction Badge:**
```
Object Type: Sprite
Name: FactionBadge_[RaceName]
Image: [Faction]Badge.png (48x48)
Color: Faction color
Position: Card X + 340, Card Y + 10
Layer: Cards
```

**6. Add Character Preview:**
```
Object Type: Sprite
Name: CharPreview_[RaceName]
Image: [RaceName]_3D_Model.png (300x330)
Position: Card X + 50, Card Y + 80
Layer: Cards
Animation: Idle animation (optional)
```

**7. Add Faction Name Text:**
```
Object Type: Text
Name: FactionName_[RaceName]
Text: "[FACTION NAME]"
Font: Arial, 20px
Color: Faction color (Light Blue/Red/Green)
Position: Card X + 70, Card Y + 40
Layer: Cards
```

**8. Add Description Text:**
```
Object Type: Text
Name: Description_[RaceName]
Text: "[Race description]"
Font: Arial, 16px
Color: #CCCCCC (Light Gray)
Position: Card X + 20, Card Y + 420
Max Width: 360px
Layer: Cards
```

---

## 🎯 Hover and Selection Effects

### **Hover Effect:**
```
Event: Cursor is on CardBG_Human
Actions:
  - Change CardBorder_Human scale to 1.02
  - Increase glow effect intensity
  - Play sound "hover.wav"
```

### **Selection Effect:**
```
Event: CardBG_Human is clicked
Actions:
  - Change CardBorder_Human glow to maximum
  - Add pulsing animation to border
  - Highlight character preview
  - Play sound "select.wav"
  - Set variable SelectedRace to "Human"
```

### **Deselection Effect:**
```
Event: Another card is clicked
Actions:
  - Reset CardBorder_Human to normal glow
  - Remove pulsing animation
  - Reset character preview
```

---

## 📊 Asset Requirements

### **Images Needed:**

**Race Icons (64x64):**
- HumanIcon.png
- BarbarianIcon.png
- UndeadIcon.png
- OrcIcon.png
- ElfIcon.png
- DwarfIcon.png

**Faction Badges (48x48):**
- CrusadeBadge.png (Blue shield)
- LegionBadge.png (Red skull)
- FabledBadge.png (Green leaf)

**Character Previews (300x330):**
- Human_3D_Model.png
- Barbarian_3D_Model.png
- Undead_3D_Model.png
- Orc_3D_Model.png
- Elf_3D_Model.png
- Dwarf_3D_Model.png

**UI Elements:**
- CardBackground.png (400x550, dark panel)
- CardBorder.png (412x556, transparent with border)

**Sounds:**
- hover.wav (card hover sound)
- select.wav (card selection sound)

---

## ✅ Implementation Checklist

- [ ] Create 6 card backgrounds
- [ ] Create 6 faction-colored borders
- [ ] Add 6 race icons
- [ ] Add 6 character preview sprites
- [ ] Add 3 faction badges
- [ ] Add race name texts (6)
- [ ] Add faction name texts (6)
- [ ] Add description texts (6)
- [ ] Implement hover effects
- [ ] Implement selection effects
- [ ] Add sound effects
- [ ] Test all 6 race selections
- [ ] Verify faction colors match

---

**Status:** ✅ **READY FOR IMPLEMENTATION**
**Based on:** Your character selection images
**Faction System:** 3 factions with color-coded borders
**Layout:** 2x3 grid with exact positioning

**Your GRUDGE character selection visual guide is complete!** 🎮⚔️🏰✨

