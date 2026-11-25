/* Worge F-forms from Spawn @1c52dfb0cf72809b6fe429e2d9a67543fac4c9dc
 * scripts/lib/data/grimoire-forms.js (ALE copy: /workspace/skill-tree/grimoire-forms.js).
 * FORMS and SPELLS are copied as written. No forms are created or changed.
 * FORM_SKILLS, BEAR_FORM, and the worge-forms.js import are not included
 * (those need the game's model clips; this page only links the F-form book).
 */
window.GRUDGE_WORGE_GRIMOIRE = {
  source: {
    file: "grimoire-forms.js",
    spawnCommit: "1c52dfb0cf72809b6fe429e2d9a67543fac4c9dc",
    note: "FORMS and SPELLS as written. No forms created or changed."
  },
  name: "Grimoire of Forms",
  maxLevel: 20,
  bookLead: "the worge's class book (creator 2026-09-28): 10 animals to learn and 10 spells, through 20 levels; bear first.",
  fChanges: "F changes form. In a form, R and 1-4 are that animal's five moves, each riding one of its own clips.",
  FORMS: [
 {id:'bear',name:'Bear',level:1,role:'Tank · taunts and soaks',ready:true},
 {id:'wolf',name:'Wolf',level:3,role:'Pack hunter · speed and bleeds'},
 {id:'boar',name:'Boar',level:5,role:'Charger · knockdowns'},
 {id:'owl',name:'Owl',level:7,role:'Scout · glide and sight'},
 {id:'panther',name:'Panther',level:9,role:'Stalker · stealth and pounce'},
 {id:'stag',name:'Stag',level:11,role:'Herald · heals the herd'},
 {id:'serpent',name:'Serpent',level:13,role:'Venom · poisons and coils'},
 {id:'raven',name:'Raven',level:15,role:'Omen · curses from the air'},
 {id:'tiger',name:'White Tiger',level:17,role:'Apex · pounce and stun'},
 {id:'dragon',name:'Drake',level:19,role:'Ancient · fire and flight'},
],
  SPELLS: [
 {id:'fightingPlant',name:'Fighting Plant',level:2,text:'Drops a snapping plant that heals allies and taunts foes'},
 {id:'thornskin',name:'Thornskin',level:4,text:'Attackers take thorn damage for 8 s'},
 {id:'rootGrasp',name:'Root Grasp',level:6,text:'Roots hold a target in place for 3 s'},
 {id:'mendingHowl',name:'Mending Howl',level:8,text:'Heals you and nearby allies over time'},
 {id:'feralSpirit',name:'Spirit Pack',level:10,text:'A spirit wolf fights beside you for 20 s'},
 {id:'moonfall',name:'Moonfall',level:12,text:'A falling light strikes an area'},
 {id:'barkward',name:'Barkward',level:14,text:'A bark shield absorbs damage'},
 {id:'swarm',name:'Swarm',level:16,text:'Stinging insects chase your target'},
 {id:'wildGrowth',name:'Verdant Surge',level:18,text:'The ground blooms and heals everyone standing on it'},
 {id:'primalAwakening',name:'Primal Awakening',level:20,text:'All forms stronger for 30 s'},
]
};
