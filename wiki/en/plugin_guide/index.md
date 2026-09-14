# Plugin Development Guide

Welcome to the world of plugin development!

## Where plugins live

Dove keeps plugins in the `plugins/` directory inside your save directory. Every plugin needs a unique entry name so it cannot clash with other plugins.

A typical plugin directory looks like this:

- `${entry}.lua`: the plugin entry file.
- `config.lua`: the plugin metadata file.
- (optional) `README.md`: the plugin introduction.
- (optional) `${entry}_config.lua`: the plugin configuration file.

## Plugin metadata file

The basic format of the metadata file:

```lua
return {
	name = "Plugin name",
	entry = "Unique plugin entry name, i.e. the value of ${entry}.",
	version = "Plugin version",
	desc = "Short description of what the plugin does",
	url = "Plugin repository URL, or an empty string",
	by = "Author account name",
	category = "other", -- Plugin type. One of: "gameplay", "cosmetic", "display", "tower", "hero", "enemy", "level", "other",
	enabled = true, -- Enabled state; when false the mod is not loaded
	priority = 0, -- Load priority; use 0 if unsure
}
```

None of the metadata fields may be `nil`.

## Plugin entry file

A minimal plugin entry file:

```lua
local hook_utils = require("hook_utils")
-- hook: the plugin itself
local hook = hook_utils:new()

-- Every plugin gets init called during game startup, which is where the plugin
-- applies its changes.
function hook:init(mod_data)
	self.mod_data = mod_data
end

-- Remember to return the plugin, otherwise it cannot be recognised!
return hook
```

## Plugin readme

Write the plugin introduction in `README.md`; it becomes the detail content you can open from the plugin manager.

`README.md` should generally not be too long: its job is to complement the description of what the plugin does, and it may also contain the plugin's changelog. Deep technical details are better kept out of `README.md` so the page stays readable.

## Plugin configuration file

The configuration file is a Dove convention that lets players adjust plugin parameters from the config button in the plugin manager. Its format:

```lua
return {
	-- Configurable fields: numbers, booleans and flat arrays are supported
	attack_cooldown = 1,
	use_damage_true = false,
	attack_damages = {
		50,
		100,
		150,
	},
	-- key_label_map gives the display name of each configurable field
	key_label_map = {
		attack_cooldown = "Attack cooldown (s)",
		use_damage_true = "Deal true damage",
		attack_damages = "Attack damage per level",
	},
}
```

Inside your plugin, require the config file like this:

```lua
-- Do not literally write ${entry}; replace it with your plugin's entry name.
local config = require("${entry}.${entry}_config")
```

For namespace isolation, any file that belongs to a plugin directory should be required with the `${entry}.` prefix. Otherwise files with the same name in different plugins can clash.

## Chapters

- [🔌 Developer Mode](developer) — enable uploads and manage plugins straight from the game
- [🛠️ Editing Templates](templates) — modify tower, hero, enemy and other entity templates
- [🎨 Asset Management](assets) — import and register textures, music, languages and data
- [🔥 Hot Reload](hot_reload) — apply plugin changes without restarting (reload / unload / on_config_change)
- [🗺️ Custom Level Maps](custom_levels) — the full structure of a map plugin, using Demon Valley as the example
