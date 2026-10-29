# Adding a Hero

## Recommended file layout

```txt
plugins/<entry>/
├── config.lua
├── <entry>.lua                 # register the hero
├── templates.lua               # hero and sub-entity templates
├── data/animations.lua
└── assets/
    ├── images/
    ├── sounds/
    ├── exoskeletons/
    └── strings/
```

## Registration

```lua
local HEROES = require("heroes.registry")
local NS = require("heroes.name_style")
local ENTRY = "my_hero_plugin"

function hook:init(plugin_data)
	HEROES:register({
        -- template name of the hero
		name = "hero_x",
		room = {
            -- level that unlocks the hero
			available_level = 1,
            -- stats shown in the hero room
			stats = {5, 5, 5, 5},
            -- portrait texture (optional)
			portrait_image = "my_hero_plugin_portrait",
            -- hero-room button texture
			thumb_image = "my_hero_plugin_thumb",
            -- portrait shown inside the hero-room frame when selected
			icon_image = "my_hero_plugin_icon"
		},
        -- display order of skill details; values are i18n suffixes
		room_special_order = {"SKILL_A", "ULTIMATE"},
        -- template file
		templates = {ENTRY .. ".templates"},
        -- animation file
		animations = {ENTRY .. ".data.animations"},
        -- sound file
		sounds = {ENTRY .. ".assets.sounds.sounds"},
        -- sound group file
		groups = {ENTRY .. ".assets.sounds.groups"},
        -- base-game textures used in a match
		required_textures = {},
        -- plugin textures used in a match
		plugin_required_textures = {
			["go_hero_x"] = {
				use_bytecode = false,
				path = ENTRY .. "/assets/images"
			}
		},
        -- sounds used in a match
		required_sounds = {},
        -- plugin sounds used in a match
		plugin_required_sounds = {ENTRY .. "_hero_sounds"},
        -- base-game exoskeletons used in a match
		required_exoskeletons = {},
        -- plugin exoskeletons used in a match
		plugin_required_exoskeletons = {
			["hero_x"] = {path = ENTRY .. "/assets/exoskeletons"}
		},
        -- base-game textures used on the world map
		screen_map_required_textures = {},
        -- plugin textures used on the world map
		screen_map_plugin_required_textures = {
			["hero_x_ui"] = {
				use_bytecode = false,
				path = ENTRY .. "/assets/images"
			}
		},
        -- base-game sounds used on the world map
		screen_map_required_sounds = {},
        -- plugin sounds used on the world map
		screen_map_plugin_required_sounds = {},
        -- hero-name style in the hero room
		name_style = {
			margin = 0,
			p1 = NS.p11,
			p2 = NS.p12,
			c1 = {0, 0, 0, 255},
			c2 = {182, 232, 255, 255},
			c3 = {65, 178, 229, 255},
			outline = {0, 69, 100, 255},
			outline_thickness = 2.5,
			glow = {0, 69, 100, 255},
			glow_thickness = 1
		}
	})
end
```

## templates.lua

Write the template file normally. It is loaded only when a match is about to start with this hero selected. Put the scripts here too; do not pollute `scripts.lua`.

## Text

```lua
HERO_X_NAME = "Hero name",
HERO_X_DESCRIPTION = "Hero description.",
HERO_ROOM_X_SKILL_A_NAME = "Skill name",
HERO_ROOM_X_SKILL_A_DESC = "Skill description.",
HERO_ROOM_X_ULTIMATE_NAME = "Ultimate",
HERO_ROOM_X_ULTIMATE_DESC = "...",
```

Every entry in `room_special_order` needs matching `_NAME/_DESC` keys. Merge the language table as described in the language section of [Asset Management](/wiki/plugin_guide/assets).
