# Kingdom Rush Dove Wiki

Welcome to the KingdomRushDove Wiki! Here you will find detailed information about the game's towers, tech, heroes and custom levels.

---

## 📖 Sections

- [🏰 Towers](/wiki/towers) — data and balance changes for every tower in the series
- [⚗️ Tech](/wiki/tech) — the tech tree and upgrades explained
- [🦸 Heroes](/wiki/heroes) — hero abilities and guides
- [🔌 Plugin Development](/wiki/plugin_guide) — plugin development, hot reload and map making

---

# Kingdom Rush Dove

Kingdom Rush Dove is a multi-generation port that aims to improve balance, controls and extensibility, and to raise performance. It is the first Chinese Kingdom Rush mod with an official server, automatic updates and a plugin store.

## Port

Dove ports most of the playable content of KR 1, 2, 3 and 5, including every hero, tower and map. You can use every ported tower in any level.

![alt text](mdPaste/changelog/image.webp)

Heroes unlock once you beat their level.

![alt text](mdPaste/changelog/image-1.webp)

## Balance

Dove rebalances almost every tower and hero. To keep the difficulty without nerfing anything, enemy stats were raised instead.

- On Veteran, gold is tighter, heroes level more slowly and enemies spawn faster in the late game.
- On Impossible, enemy stats are higher, units with a lot of HP that would be instantly killed by a non-transforming execute take damage equal to their max HP instead, and their stats keep growing in the late game.

Example of the changes:

![alt text](mdPaste/changelog/image-2.webp)

## Tech

- Tech level 6 is unlocked, with two tech lines, and smart rain of fire.

## Controls

- Reinforcements can be rallied.
- Many summons can be rallied.
- Custom key bindings.

![alt text](mdPaste/changelog/image-13.webp)

## Extensibility

- A large number of custom settings are exposed.

![alt text](mdPaste/changelog/image-3.webp)

- A plugin system.

![alt text](mdPaste/changelog/image-4.webp)

## New maps

A taste of the original custom levels:

### Glacier Rift

General, the war is not over yet!

A band of bandits escaped our sweep and joined forces with the last troll clans of the glacier - and the northern spiders have found their way here too, spinning new nests across this land!

Strong enemies gather and dark clouds are closing in, but this is a chance to make your name! Soldiers — pack your winter clothes, your mead and your weapons, and march into the Glacier Rift, before the evil forces return!

![alt text](mdPaste/changelog/image-6.webp)

### Sleepless Barrow

General! Blackburn's soul is gone, but the evil spirits of this land linger!

In the Sleepless Barrow the border between the world of the dead and the world of the living blurs on every full moon, werewolf howls drift between twisted trees, and wicked mages who never gave up are brewing a new conspiracy. We must stop them, or all of Linirea will fall into darkness!

![alt text](mdPaste/changelog/image-7.webp)

### Night of the Storm Atoll

The leviathan has been subdued, but the tide has not receded! The priests of the Sea Temple send word that the sacred breath of the Storm Atoll has grown faint!

Our old friend Blackbeard sent news through the tavern: undead figures now wander the Storm Atoll, and cruel deep-sea demons lick their wounds in the endless night. General, we must gather our army and drive this evil out!

![alt text](mdPaste/changelog/image-5.webp)

### Jungle Abyss Spider Nest

General! Our Amazon allies report that the spiders of the rainforest have gone mad! Some forest elves living there say they found traces of both northern and southern spiders in the jungle at the same time! I can feel it: a huge conspiracy is brewing... General, we need you and your brave soldiers to go to the jungle depths, find out what is going on, and wipe out these wicked arthropods!

![alt text](mdPaste/changelog/image-8.webp)

### Earthshaker Valley

General! The latest reports say a strange force is echoing through the valley of the jungle abyss. Our scouts report barbarian shamans using ancient forbidden rites to disturb the earth, causing inexplicable gravity anomalies — boulders float, cannonballs fly wild, even arrows bend in flight! It is said these shamans want to use that power to wake something ancient that has slept far too long. If they finish the ritual, the whole rainforest will be torn apart, fall and be destroyed! General, lead your army deep into Earthshaker Valley, shatter their sorcery and restore order to the land!

![alt text](mdPaste/changelog/image-9.webp)

### Howling Sandgrave

General! Our herders report a most unusual "sandstorm"!

Poisonous insects step out of the flying sand, bandits descend from the whirlwind — the ancient sorcery of the desert people has returned, and some unknown plot must be buried with it!

Let us gather our troops and find out what is happening in the howling desert!

![alt text](mdPaste/changelog/image-10.webp)

### Lost Garden

General!

On the last full moon our mages detected a strong surge of magic. A day later the sentries stationed at the Bloodstone Mine reported an ancient garden deep inside the mine. It looks much like our royal garden, yet everything about it is decayed and eerie. We sent our finest sword-singers to explore further, and none of them came back...

General, we need you and your brave men to go to this lost garden and find out the truth!

![alt text](mdPaste/changelog/image-11.webp)

## Cricket Fights

This mod lets players define their own cricket fights (creep battles).

The `patches` folder contains `criket_template.lua` as a reference template.

```lua
-- Sample file for editing cricket fight spawns
-- Create a new file named criket.lua in the same folder to define your own waves
-- Any setting missing from your criket file falls back to this file
return {
	on = false, -- Enable cricket fights: set to true when needed
	cash = 50000, -- Starting gold
	groups = {
		{ -- Spawn group 1
			path_index = 1, -- Spawn path 1 (must be at least 1)
			delay = 5, -- Delay before this group starts, in seconds
			spawns = {
				{ -- Spawn 1
					creep = "enemy_goblin", -- Enemy: goblin
					max = 100, -- Total count
					interval = 0.1, -- One goblin every 0.1 s
					fixed_sub_path = 0, -- Sub path; 0 means random
					interval_next = 5, -- 5 s after this spawn finishes, the next one starts
				},
				{ -- Spawn 2
					creep = "enemy_fat_orc", -- Enemy: orc
					max = 50, -- Total count
					interval = 0.2, -- One orc every 0.2 s
					fixed_sub_path = 0, -- Sub path; 0 means random
					interval_next = 0,
				},
			},
		},
		{ -- Spawn group 2
			path_index = 1, -- Spawn path 1
			delay = 0, -- Delay before this group starts, in seconds
			spawns = {
				{ -- Spawn 1
					creep = "enemy_goblin", -- Enemy: goblin
					max = 100, -- Total count
					interval = 0.1, -- One goblin every 0.1 s
					fixed_sub_path = 0, -- Sub path; 0 means random
					interval_next = 5, -- 5 s after this spawn finishes, the next one starts
				},
			},
		},
	},
	required_textures = { -- Enabled atlases
		"go_enemies_acaroth",
		"go_enemies_ancient_metropolis",
		"go_enemies_bandits",
		"go_enemies_bittering_rancor",
		"go_enemies_blackburn",
		"go_enemies_desert",
		"go_enemies_elven_woods",
		"go_enemies_faerie_grove",
		"go_enemies_forgotten_treasures",
		"go_enemies_grass",
		"go_enemies_halloween",
		"go_enemies_hulking_rage",
		"go_enemies_ice",
		"go_enemies_jungle",
		"go_enemies_mactans_malicia",
		"go_enemies_rising_tides",
		"go_enemies_rotten",
		"go_enemies_sarelgaz",
		"go_enemies_storm",
		"go_enemies_torment",
		"go_enemies_underground",
		"go_enemies_wastelands",
	},
	required_sounds = { -- Enabled sounds
		"hero_gerald", -- e.g. a special hero boss such as Gerald may need his sounds
	},
}
```

You can find `criket.lua` in your **save location** and edit it to customise cricket fight spawns. The file only takes effect when `on` is `true`.

- Note: your save can be found through the `存档位置` (save location) shortcut provided in the `KingdomRushDove` folder.

On the level select screen you can press `f2` to open the cricket fight configuration and decide whether to start cricket fight mode.

## Performance

- Art assets are partly upscaled to HD and almost all converted to DDS: in-level texture memory is only 300 MB.
- Android uses ASTC textures throughout, with an installer of only 400-600 MB.
- Original engine code was optimised with C structs, the targeting module was rewritten, redundant code checks were removed and the frame rate cap was opened up to 144. Tested on an AMD Ryzen 9 7945HX + NVIDIA GeForce RTX 4060 Laptop GPU, the game holds 144 FPS at 1024x speed.
- Careful GC management and a cached entity database greatly speed up entering and leaving levels.
- Configurable launch options let you start the game immediately, skipping every unnecessary step.
