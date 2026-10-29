# Adding a Tech Line (Plugin)

A tech line is a module returning `{techs = ..., patch = ...}`. It reuses the six base-game tech columns:

`archers` / `barracks` / `mages` / `engineers` / `rain` / `reinforcements`

## Tech line module

Place it at `plugins/<entry>/tech_line.lua`:

```lua
local H = require("kr1.upgrades.upgrade_utils")
local base_line = require("kr1.upgrades.line1")
local T = H.T

local techs = {
	demo_archer_range = {
		class = "archers",
		icon = 14,
		level = 1,
		price = 1,
		range_factor = 1.05,
		patch = function(UP, u)
			H.scale_tower_attack_range(UP.archer_towers, u.range_factor)
		end
	},
	demo_rain_cooldown = {
		class = "rain",
		icon = 21,
		level = 3,
		price = 2,
		cooldown_reduction = 3,
		patch = function(UP, u)
			local ctrl = T("power_fireball_control")

			ctrl.cooldown = ctrl.cooldown - u.cooldown_reduction
		end
	}
}

return {
	techs = techs,
	-- Runs whenever this line is selected. Use it for special effects, or for
	-- content that must apply even at tech level 0.
	patch = base_line.patch
}
```

Fields:

| Field | Description |
|---|---|
| `class` | Required; one of the six columns above; decides which column's level unlocks it |
| `level` | Required; 1–6, the tech tier |
| `price` | Required; purchase price, included in the total star cost |
| `icon` | Required; atlas frame `Upgrades_Icons_XXXX`; other generations use `from_kr` to switch the prefix |
| `patch` | Runs after purchase; signature `(UP, u)`, where `u` is this tech |

`patch` only runs when `u.level <= UP.levels[u.class]` and the level does not exceed `UP.max_level`. Custom fields live directly on the tech table; read them as `u.xxx` inside `patch`.

## Registration

In the plugin entry's `init`:

```lua
local UP = require("kr1.upgrades")
local ENTRY = "my_plugin"

function hook:init(plugin_data)
	UP.list[ENTRY] = require(ENTRY .. ".tech_line")
end
```

The tech-line dropdown on the world map enumerates `UP.list` automatically; the title comes from `UPGRADES_$ENTRY`. Add it to the plugin text:

```lua
UPGRADES_ENTRY = "Tech $ENTRY",
```

## Tip

Use the base-game `kr1/upgrades/line*.lua` files as direct references.
