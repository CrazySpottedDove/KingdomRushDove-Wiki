# Plugin Configuration

This chapter covers `${entry}_config.lua`, the plugin configuration file, and its reserved fields.

## Two kinds of config

A plugin directory contains two files whose names include `config`, with completely different jobs:

| File | Location | Purpose | Who edits it |
|------|----------|---------|--------------|
| `config.lua` | plugin root | Plugin metadata: name, version, author, category, etc. | The plugin author; players never touch it |
| `${entry}_config.lua` | plugin root | Plugin parameters: numbers and toggles players can tune | Players, from the plugin manager |

- For metadata fields see the "Plugin metadata file" section of the [Plugin Development Guide](/wiki/plugin_guide).
- The configuration file is **optional**: without `${entry}_config.lua` there is no config button in the plugin manager.
- The file name must be `${entry}_config.lua` (replace `${entry}` with your own entry), otherwise the game will not find it.

## Basic format

The configuration file is simply a Lua file returning a table:

```lua
-- ${entry}_config.lua
return {
	-- Tunable parameters: numbers, booleans, strings, flat arrays
	attack_cooldown = 1,
	use_damage_true = false,
	damage_type = "physical",
	attack_damages = {
		50,
		100,
		150,
	},

	-- Reserved field: parameter name → display label
	key_label_map = {
		attack_cooldown = "Attack cooldown (s, 0.1-5)",
		use_damage_true = "Deal true damage",
		damage_type = "Damage type",
		attack_damages = "Attack damage per level",
	},

	-- Reserved field: display order (optional)
	key_order_list = {
		"attack_cooldown",
		"attack_damages",
		"damage_type",
		"use_damage_true",
	},
}
```

Supported value types:

| Type | Editor | Example |
|------|--------|---------|
| `number` | numeric input | `attack_cooldown = 1` |
| `boolean` | toggle | `use_damage_true = false` |
| `string` | text input | `damage_type = "physical"` |
| flat array | one input row per element | `attack_damages = { 50, 100, 150 }` |

Arrays must be **contiguous and one-dimensional**, with number, boolean or string elements. Nested tables are not supported and will not be rendered as editable rows.

## Reserved fields

The three field names below are **reserved** by the game. They only describe the configuration; they are not shown in the config panel and are never read as plugin parameters:

- `key_label_map` (**required**): maps parameter names to display labels.
  **A parameter that is not registered here does not appear in the config panel at all**, so players cannot change it. Every tunable parameter needs a matching entry here.
  Putting the valid range straight into the label — for example `attack_cooldown = "Attack cooldown (s, 0.1-5)"` — saves players from hunting through docs.

- `key_order_list` (optional): an array of strings giving the top-to-bottom display order.
  Without it the game sorts entries by label text. When present it wins outright, and parameters missing from the list are not shown (even if they are registered in `key_label_map`).
  With only a handful of parameters you can omit it and let the game sort for you.

- `__default_config` (**reserved, do not write it by hand**): a snapshot of default values that the game writes on first read.
  The plugin manager uses it to tell "values the player changed" apart from "defaults the author wrote", and therefore which values to keep and which to follow the new version when a plugin updates. Writing it yourself corrupts that decision; let the game maintain it.

## Reading the config inside your plugin

The configuration file sits in the plugin root, and since `plugins/?.lua` is on the require path you load it with the `${entry}.` prefix:

```lua
local config = require("${entry}.${entry}_config")

function hook:init(mod_data)
	self.attack_cooldown = config.attack_cooldown
end
```

The `${entry}.` prefix is mandatory: every file unique to a plugin directory must be required with it, otherwise identically named files in different plugins collide.

## Merge rules on update

After a player has customised the configuration, a plugin update will **not** wipe their settings:

- The new version's `${entry}_config.lua` is merged with the player's local configuration.
- Fields the player changed keep the player's values.
- Fields the player never touched (still equal to the old defaults) take the new version's defaults.
- Fields the player added locally, but which the new version lacks, are kept.
- Fields newly added by the new version are merged in.
- Deciding whether a player "changed" a field relies on `__default_config`; for older plugins without that record the game falls back to "keep local values, only add new fields".

## Conventions and gotchas

- Put **only player-facing tunables** in the configuration file. Implementation constants — tier thresholds, special-case name lists, size caps — belong at the top of your plugin module, not in the player's face.
- Use `snake_case` names and keep `key_label_map` in sync with them; forget a label and the parameter simply disappears.
- If a field's type changes (say from a number to an array), the old value is replaced by the new default.
- Configuration edits are only written to disk when "Apply" is pressed in the plugin manager; that is also when the game calls the plugin's `on_config_change`. See [🔥 Hot Reload](/wiki/plugin_guide/hot_reload).
