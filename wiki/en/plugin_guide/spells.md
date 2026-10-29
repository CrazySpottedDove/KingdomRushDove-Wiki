# Adding a Spell

## Recommended file layout

```txt
plugins/<entry>/
├── <entry>.lua                 # register the spell, sound groups, UI atlas
├── spell_my_plugin.lua         # spell module
├── data/animations.lua
└── assets/
    ├── images/
    ├── sounds/
    ├── exoskeletons/
    └── strings/
```

## Registration

```lua
local SPELLS = require("kr1.spell_system")
local S = require("sound_db")
local ENTRY = "my_plugin"

function hook:init(plugin_data)
	table.arrayensure(SPELLS.module_names, ENTRY .. ".spell_my_plugin")

	S:register_groups(require(ENTRY .. ".assets.sounds.groups"))
	S:register_sounds(require(ENTRY .. ".assets.sounds.sounds"))
end
```

## Module metadata

```lua
local M = {}

M.id = "spell_my_plugin"
M.i18n = "POWER_MY_PLUGIN_SPELL"
M.control = "power_my_plugin_spell_control"
-- Button texture for the spell
M.button_icon = "in_game_icon_power_my_plugin_spell"
-- In-match pointer style
M.pointer_icon = "pointer_power_my_plugin_spell"
-- Spell portrait
M.portrait = "power_portraits_big_my_plugin_spell"
-- Spell-name style
M.name_style = {
	font_name = "h",
	font_size = 30,
	color = {255, 255, 255, 255},
	shaders = {"p_outline", "p_glow"},
	shader_margin = 16
}
-- Base-game textures used in a match
M.required_textures = {}
-- Plugin textures used in a match
M.plugin_required_textures = {
	["go_power_my_plugin_spell"] = {
		use_bytecode = false,
		path = "my_plugin/assets/images"
	}
}
-- Sounds used in a match
M.required_sounds = {}
-- Plugin sounds used in a match
M.plugin_required_sounds = {"my_plugin_spell_sounds"}
-- Exoskeletons used in a match
M.required_exoskeletons = {}
-- Plugin exoskeletons used in a match
M.plugin_required_exoskeletons = {
	["my_plugin_spell_exo"] = {path = "my_plugin/assets/exoskeletons"}
}

return M
```

## Registering templates

```lua
function M.register_templates(E)
	local GR = require("grid_db")
	local bit = require("bit")
	local tt = E:register_t(M.control, "power_control_custom")

	tt.main_script.insert = function(this, store)
		-- Spawn soldiers, bullets, decals, modifiers
		return true
	end

	tt.main_script.update = function(this, store)
		coroutine.yield()
		simulation:queue_remove_entity(this)
	end

	tt.user_selection.can_select_point_fn = function(this, x, y, store)
		return GR:cell_is(x, y, bit.bor(TERRAIN_LAND, TERRAIN_ICE))
			and not GR:cell_is(x, y, TERRAIN_NOWALK)
	end

	tt.cooldown = 40

	E:set_template("user_power_3", tt)
end
```

Prefix template names with the plugin name to avoid clashing with the base game.

## Level

The level is derived from the average of the rain and reinforcements techs, clamped to 1–6:

```lua
level = clamp(1, 6, ceil((UP.levels.rain + UP.levels.reinforcements) / 2))
```

`M.apply(level)` runs before `UP:patch_templates`. Only change values and switches; do not register templates again:

```lua
function M.apply(level)
	local E = require("entity_db")
	local ctrl = E:get_template(M.control)

	ctrl.cooldown = 40

	if level >= 2 then
		ctrl.cooldown = 36
	end

	if level >= 4 then
		ctrl.cooldown = 30
	end

	if level >= 6 then
		ctrl.cooldown = 24
	end
end
```

## Assets

If the button, pointer and portrait live in a plugin UI atlas, add this in `init`:

```lua
local screen_map = require("screen_map")

screen_map.plugin_required_textures["my_plugin_ui"] = {
	use_bytecode = false,
	path = ENTRY .. "/assets/images"
}
```

## Text

```lua
POWER_MY_PLUGIN_SPELL_NAME = "Spell name",
POWER_MY_PLUGIN_SPELL_DESCRIPTION = "Flavour text.",
POWER_MY_PLUGIN_SPELL_LARGE_DESCRIPTION = "Cooldown 40s. Deals 120 damage and stuns for 2s.",
```

`_LARGE_DESCRIPTION` must describe the level-6 effect and match `apply(6)`. Merge the language table as described in [Asset Management](/wiki/plugin_guide/assets).
