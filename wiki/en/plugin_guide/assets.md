# Asset Management

Plugin assets fall into four kinds: textures, music, languages and data.

This chapter explains how to import and register plugin assets properly.

Before we start, here is the recommended directory layout, which the rest of the chapter assumes:

- `assets/images`: textures.
- `assets/sounds`: music and sound effects.
- `assets/strings`: language files.
- `data/`: data assets, including animations.

## Textures

- Atlas: a single file, commonly `.png`, `.dds` or `.astc`.
- Texture: an atlas loaded into memory as an object the GPU can work with.
- Sprite: a region inside a texture. A renderable object usually owns several sprites, and rendering those sprites in order renders the object.

In Dove, textures are defined and loaded through groups. Each group is a `.lua` file describing which sprites the group contains.

Example of a texture group file:

```lua
-- ${entry_group1.lua}
return {
	hero_barracks_0001 = {
		-- Name of the atlas that contains this sprite.
		a_name = "go_hero_gerald-1.png",
		-- Size of the sprite rectangle
		size = { 184, 220 },
		-- Trim margins of the sprite inside the rectangle.
		-- trim[1]: pixels trimmed from the left
		-- trim[2]: pixels trimmed from the top
		trim = { 50, 98, 50, 18 },
		-- Atlas size
		a_size = { 2048, 2048 },
		-- Actual position of the sprite rectangle and the sprite's real size
		-- f_quad[1]: x of the sprite rectangle's top-left corner
		-- f_quad[2]: y of the sprite rectangle's top-left corner
		-- f_quad[3]: real width of the sprite
		-- f_quad[4]: real height of the sprite
		f_quad = { 106, 520, 84, 104 },
		-- Sprite aliases, for several sprites that share the same content
		alias = { "hero_barracks_0029", "hero_barracks_0030", "hero_barracks_0031" },
		-- Scale applied when the sprite is rendered
		ref_scale = 0.5,
	},
	hero_barracks_0002 = {
		a_name = "go_hero_gerald-1.png",
		size = { 184, 220 },
		trim = { 46, 100, 50, 18 },
		a_size = { 2048, 2048 },
		f_quad = { 197, 1659, 88, 102 },
		alias = {},
		ref_scale = 0.5,
	},
}
```

Dedicated packing tools can merge many atlases into one big atlas to cut the cost of switching textures while rendering. If you do not want to bother with that, using one image per atlas is perfectly fine: just make `size`, `a_size` and `{f_quad[3], f_quad[4]}` all equal, for example:

```lua
holy_nuclear_tower_icon = {
	a_name = "achievement_icons_0015.png",
	size = { 64, 64 },
	trim = { 0, 0, 0, 0 },
	a_size = { 64, 64 },
	f_quad = { 0, 0, 64, 64 },
	alias = {},
}
```

Different atlas formats are supported to different degrees on each platform. For the best performance and the smallest download, ship the right format per platform.

Preferred texture format per platform:

| Platform | Recommended | Notes |
|------|---------|------|
| Windows / Linux / macOS | `.dds` (BC3) | Desktop only, small VRAM footprint, fast to load |
| Android | `.astc` (ASTC 4x4) | Mobile only, good compatibility |

### Multi-platform textures

Plugin authors only maintain one package, containing texture files in several formats. After upload the server automatically splits it into platform-specific packages.

Example layout:

```
${entry}/
  config.lua
  ${entry}.lua
  _assets/images/
    texture.lua           <- descriptor, a_name points at the ".dds" file
    texture.dds           <- desktop (Windows/Linux/macOS)
    texture.astc          <- Android
  .backup/
    texture.png           <- local debugging only, never uploaded
```

> `.png` files should not be uploaded, to save bandwidth. For local debugging keep them in `.backup/`; the plugin manager skips `.backup/` when uploading.

Key rules:

- **Descriptor**: `a_name` should point at the `.dds` file (desktop prefers DDS, and the Android engine falls back from `.dds` to `.astc` automatically).
- **Server split**: after upload the server generates per-platform zips by extension - the desktop zip excludes `.astc`/`.pkm`, the Android zip excludes `.dds`.
- **Old plugins**: plugins without platform-specific textures are unaffected; the server falls back to the complete package when a client downloads.

While initialising the plugin we must register textures in the game's loading cycle. Example:

```lua
-- Inside hook:init()
do
	-- Pick the scene that needs these textures.
	-- game: an actual match
	-- screen_map: the world map
	local game = require("game")

	-- Register textures managed by the plugin itself
	game.plugin_required_textures["${entry}_group1"] = {
		-- Do not load bytecode, i.e. your texture group file is a human-readable .lua
		use_bytecode = false,
		-- Load path, relative to the save directory's plugins/ folder - no "plugins/"
		-- prefix; must not end with "/", and ${entry_group1} must be found under it
		path = "${entry}/assets/images",
	}

	-- To load base-game textures directly, do this:
	-- This asks for Gerald's textures
	table.arrayensure(game.required_textures, "go_hero_gerald")
end
```

## Music and sounds

Dove also manages audio through groups (`groups.lua`). The difference is that an audio group only describes which files to load, while sound effects are defined in a separate file (`sounds.lua`).

```lua
-- Structure of groups.lua
return {
	-- The key is the group name. To avoid clashes, prefix it with the plugin entry
	${entry}_tower_spirit_mausoleum = {
		-- Files this group needs
		files = {
			"kr4_fallen_ones_spirit_mausoleum_taunt_1.ogg",
			"kr4_fallen_ones_spirit_mausoleum_taunt_2.ogg",
			"kr4_fallen_ones_spirit_mausoleum_taunt_3.ogg",
			"kr4_fallen_ones_spirit_mausoleum_taunt_4.ogg",
			"kr4_fallen_ones_spirit_mausoleum_communion_upg.ogg",
			"kr4_fallen_ones_spirit_mausoleum_possesion_upg.ogg",
			"kr4_fallen_ones_spirit_mausoleum_gargoyles_upg.ogg",
			"kr4_fallen_ones_spirit_mausoleum_attack_preload.ogg",
			"kr4_fallen_ones_spirit_mausoleum_attack.ogg",
			"kr4_fallen_ones_spirit_mausoleum_possession_cast.ogg",
			"kr4_fallen_ones_spirit_mausoleum_possession_hit.ogg",
		},
		-- Specific to plugin sound groups: the path of the plugin's sound group
		-- Also relative to the save directory's plugins/ folder; no "plugins/" prefix
		parent_dir = "${entry}/assets/sounds",
	},
}
```

```lua
-- Structure of sounds.lua
return {
	-- Sound name. To avoid clashes, prefix it with the plugin entry
	${entry}_ShiningHolyNuclearBuild = {
		-- File played by this sound
		files = { "hero_priest_healing.ogg" },
		-- Volume percentage
		gain = 1,
		-- Whether it loops
		loop = false,
		-- Which sound category it belongs to
		source_group = "TAUNTS",
	},
	${entry}_ShiningHolyNuclearHolyBlastUp = {
		files = { "hero_priest_consecrate.ogg" },
		gain = 1,
		loop = false,
		source_group = "TAUNTS",
	},
	${entry}_ShiningHolyNuclearNuclearUp = {
		files = { "hero_priest_teleport.ogg" },
		gain = 1,
		loop = false,
		source_group = "TAUNTS",
	},
}
```

For reference, these are all the sound categories:

```lua
return {
	source_groups = {
		-- Bullets
		BULLETS = {
			max_sources = 9,
		},
		-- Death
		DEATH = {
			max_sources = 3,
		},
		DEFAULT = {
			max_sources = 1,
		},
		-- Explosions
		EXPLOSIONS = {
			max_sources = 3,
		},
		-- UI
		GUI = {
			max_sources = 4,
		},
		-- Background music
		MUSIC = {
			max_sources = 1,
		},
		-- Effect sounds
		SFX = {
			max_sources = 5,
		},
		SPECIALS = {
			max_sources = 5,
		},
		-- Melee
		SWORDS = {
			max_sources = 1,
		},
		-- Sounds similar to tower or skill upgrades
		TAUNTS = {
			max_sources = 2,
		},
		REFCOUNTED = {
			max_sources = 1000000,
		},
	},
}
```

An example of loading audio assets from a plugin:

Requirements:

- Load the `hero_lilith` sound group during a match.
- Define custom sound effects in `assets/sounds/sounds.lua`.
- Define custom sound groups in `assets/sounds/groups.lua` and load them during a match.

```lua
-- Inside hook:init()
do
	-- Pick the scene that needs these assets.
	-- game: an actual match
	-- screen_map: the world map
	local game = require("game")

	-- Load base-game audio
	table.arrayensure(game.required_sounds, "hero_lilith")

	-- Add the plugin's own sound groups and sound definitions
	local S = require("sound_db")
	local groups = require("${entry}.assets.sounds.groups")
	local sounds = require("${entry}.assets.sounds.sounds")

	S:register_groups(groups)
	S:register_sounds(sounds)

	-- Release these two tables to reduce GC pressure
	package.loaded["${entry}.assets.sounds.groups"] = nil
	package.loaded["${entry}.assets.sounds.sounds"] = nil

	-- Sound groups that must be loaded in a match
	table.arrayensure(game.plugin_required_sounds, "${entry}_some_group_name")
end
```

## Animations

Animation assets define animation data. A common definition looks like this:

```lua
return {
	-- Animation name. To avoid clashes, prefix it with the entry.
	${entry}_Amalgam_Attack1_run = {
		-- Prefix of the matching sprites.
		prefix = "Amalgam_Attack1",
		from = 1,
		to = 24,
		-- This animation covers every sprite from Amalgam_Attack1_0001 to Amalgam_Attack1_0024
	},
	${entry}_Amalgam_Attack2_run = {
		prefix = "Amalgam_Attack2",
		from = 1,
		to = 25,
	},
}
```

We recommend putting animation data in `data/animations.lua`.

Animations are loaded through a hook:

First define the hook:

```lua
function hook.A.load(next, self)
    next(self)

    -- After animation_db:load() runs, append our animation definitions
    local animations = require("${entry}.data.animations")
    self:register_animations(animations)

    -- Release memory
    package.loaded["${entry}.data.animations"]
end
```

Then inside `hook:init()`:

```lua
do
	local A = require("animation_db")
	hook_utils.HOOK(A, "load", self.A.load)
end
```

## Language assets

Language files live in `assets/strings/` as `.lua` files named after the locale, for example `zh-Hans.lua` for Simplified Chinese.

A language file looks like this:

```lua
-- ${entry}/assets/strings/zh-Hans.lua
return {
	["${entry}_TOWER_NAME"] = "神圣核子塔",
	["${entry}_TOWER_DESCRIPTION"] = "一座融合了神圣与核子科技的防御塔。",
	["${entry}_ABILITY_HOLY_BLAST_NAME"] = "神圣冲击",
	["${entry}_ABILITY_HOLY_BLAST_DESC"] = "释放神圣能量冲击敌人。",
}
```

To avoid key clashes, prefix every language key with `${entry}_`.

During plugin initialisation the language assets must be merged into the game's i18n system. There are two cases.

First, define a function that merges our language assets into the base ones:

```lua
local function merge_locales(locale)
	local strings = require("${entry}.assets.strings." .. locale)
	for k, v in pairs(strings) do
		i18n.msgs[locale][k] = v
	end
	package.loaded["${entry}.assets.strings." .. locale] = nil
end
```

Then call it both from a hook and from `hook:init()`. This is needed because the i18n module's `load_locale` event fires before the plugin is initialised, so the plugin must apply it once by hand.

```lua
function hook.i18n.load_locale(next, locale)
	next(locale)
	merge_locales(locale)
end

-- Inside hook:init()
do
	merge_locales()
	local i18n = require("i18n")
	hook_utils.HOOK(i18n, "load_locale", hook.i18n.load_locale)
end
```

Note that anywhere else in the plugin that uses these language assets must run after the merge.
