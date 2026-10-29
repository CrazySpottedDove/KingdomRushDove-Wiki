# 添加科技线（插件）

一条科技线就是一个返回 `{techs = ..., patch = ...}` 的模块，复用本体的 6 个科技列：

`archers` / `barracks` / `mages` / `engineers` / `rain` / `reinforcements`

## 科技线模块

放在 `plugins/<entry>/tech_line.lua`：

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
	-- 选中该科技线就一定会执行的 patch 逻辑，用于处理特殊效果，或科技等级为0时也应当生效的内容。
	patch = base_line.patch
}
```

字段：

| 字段 | 说明 |
|---|---|
| `class` | 必填，必须是上面 6 列之一；决定买哪一列才生效 |
| `level` | 必填，1–6，决定是几级科技 |
| `price` | 必填，购买价格，会计入总星星数 |
| `icon` | 必填，对应图集帧 `Upgrades_Icons_XXXX`；其它代用 `from_kr` 切前缀 |
| `patch` | 购买后执行，参数是 `(UP, u)`，`u` 就是这条科技自身 |

`patch` 只在满足 `u.level <= UP.levels[u.class]` 且不超过 `UP.max_level` 时执行。科技自定义字段直接挂在表上，在 `patch` 里用 `u.xxx` 取。

## 注册

在插件入口的 `init` 里：

```lua
local UP = require("kr1.upgrades")
local ENTRY = "my_plugin"

function hook:init(plugin_data)
	UP.list[ENTRY] = require(ENTRY .. ".tech_line")
end
```

地图界面的科技线下拉会自动枚举 `UP.list`，标题取 `UPGRADES_$ENTRY`。在插件文案里补：

```lua
UPGRADES_ENTRY = "科技$ENTRY",
```

## 建议：

直接参考本体的 `kr1/upgrades/line*.lua` 书写。