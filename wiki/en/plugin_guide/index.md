# Plugin Development Guide

Welcome to the world of plugin development! This chapter also covers core extensions: adding heroes, tech lines and spells.

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
	branch = "master", -- Optional: release channel, "master" stable / "dev" developer preview
	min_version = "2.0.7.8", -- Optional: minimum game version required to run this plugin. Omit or leave empty for no restriction
}
```

Except for the optional `min_version` and `branch`, none of the metadata fields may be `nil`.

### min_version: requiring a minimum game version

`min_version` is an **optional** field that declares "this plugin only runs on this game version or newer". Its value is a dotted version string, compared against the `id` field of the game's own `version.lua` (for example `2.0.7.7`).

When a player tries to **download or update** the plugin from the plugin manager, the game version is compared against `min_version` segment by segment:

- Game version **greater than or equal to** `min_version`: download/install proceeds normally.
- Game version **strictly lower than** `min_version`: the download/update is refused, and the player sees a popup saying "`plugin name (plugin version)` requires game version `min_version` or newer. Please update the game first."

Omitting `min_version`, or setting it to an empty string, means no version restriction at all — identical to how older plugins behave.

So if your plugin uses interfaces, assets or fields that only exist in newer game builds, set `min_version` so players on older builds are not left with a plugin that cannot run.

### branch: release channel

The default game build follows `master`; the developer preview follows `dev`. Plugin channels map one-to-one; `branch` only decides which store channel the plugin is uploaded to and which clients can see it. It does **not** affect local loading; that is still controlled by `enabled` and the plugin manager.

| Value | Meaning |
|---|---|
| `"master"` (default) | Stable channel: visible to every client and counted in download/hot rankings. |
| `"dev"` | Preview channel: only visible to developer-preview builds (`version.branch == "dev"`); the entry is marked `[dev]`. |

Rules:

- The server keeps separate master/dev namespaces; the same `entry` does not overwrite the other channel.
- A developer-preview store receives both master and dev releases: the dev release is shown when its version is not lower than master, otherwise master is shown. If one side declares a `min_version` the current game does not satisfy, the compatible side wins.
- A dev release always reports 0 downloads. When a master entry with the same name exists, its comments, likes and cover are reused.
- Only `branch = "master"` uploads ask about a `cover.*` file.

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

Besides the metadata file `config.lua`, a plugin may ship an **optional** configuration file `${entry}_config.lua` that lets players tune plugin parameters from the config button in the plugin manager. Without that file the plugin simply has no tunable parameters and no config button appears.

```lua
-- ${entry}_config.lua
return {
	attack_cooldown = 1,
	use_damage_true = false,
	key_label_map = {
		attack_cooldown = "Attack cooldown (s)",
		use_damage_true = "Deal true damage",
	},
}
```

For the full format, the reserved fields and the merge rules applied on update, see the [⚙️ Plugin Configuration](/wiki/plugin_guide/config) chapter.

Inside your plugin, require the config file like this:

```lua
-- Do not literally write ${entry}; replace it with your plugin's entry name.
local config = require("${entry}.${entry}_config")
```

For namespace isolation, any file that belongs to a plugin directory should be required with the `${entry}.` prefix. Otherwise files with the same name in different plugins can clash.

## Chapters

- [🔌 Developer Mode](/wiki/plugin_guide/developer) — enable uploads and manage plugins straight from the game
- [🛠️ Editing Templates](/wiki/plugin_guide/templates) — modify tower, hero, enemy and other entity templates
- [🎨 Asset Management](/wiki/plugin_guide/assets) — import and register textures, music, languages and data
- [⚙️ Plugin Configuration](/wiki/plugin_guide/config) — `${entry}_config.lua`, its reserved fields and update merge rules
- [🔥 Hot Reload](/wiki/plugin_guide/hot_reload) — apply plugin changes without restarting (reload / unload / on_config_change)
- [🗺️ Custom Level Maps](/wiki/plugin_guide/custom_levels) — the full structure of a map plugin, using Demon Valley as the example
- [🦸 Adding a Hero](/wiki/plugin_guide/heroes) — registry declaration through textures, animations, sounds and i18n
- [⚗️ Adding a Tech Line](/wiki/plugin_guide/tech_lines) — new `lineN.lua`, dropdown registration, tech patches
- [✨ Adding a Spell](/wiki/plugin_guide/spells) — SPELL module, templates, assets and level scaling
