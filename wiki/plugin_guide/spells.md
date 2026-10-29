# 添加法术

## 推荐文件结构

```txt
plugins/<entry>/
├── <entry>.lua                 # 注册法术、声音组、UI 图集
├── spell_my_plugin.lua         # 法术模块
├── data/animations.lua
└── assets/
    ├── images/
    ├── sounds/
    ├── exoskeletons/
    └── strings/
```

## 注册

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

## 模块元数据

```lua
local M = {}

M.id = "spell_my_plugin"
M.i18n = "POWER_MY_PLUGIN_SPELL"
M.control = "power_my_plugin_spell_control"
-- 法术的按钮图片纹理
M.button_icon = "in_game_icon_power_my_plugin_spell"
-- 局内法术指针样式
M.pointer_icon = "pointer_power_my_plugin_spell"
-- 法术海报
M.portrait = "power_portraits_big_my_plugin_spell"
-- 法术名字样式
M.name_style = {
	font_name = "h",
	font_size = 30,
	color = {255, 255, 255, 255},
	shaders = {"p_outline", "p_glow"},
	shader_margin = 16
}
-- 局内引用的本体美术资源
M.required_textures = {}
-- 局内引用的插件美术资源
M.plugin_required_textures = {
	["go_power_my_plugin_spell"] = {
		use_bytecode = false,
		path = "my_plugin/assets/images"
	}
}
-- 局内引用的声音资源
M.required_sounds = {}
-- 局内引用的插件声音资源
M.plugin_required_sounds = {"my_plugin_spell_sounds"}
-- 局内引用的骨骼动画资源
M.required_exoskeletons = {}
-- 局内引用的插件骨骼动画资源
M.plugin_required_exoskeletons = {
	["my_plugin_spell_exo"] = {path = "my_plugin/assets/exoskeletons"}
}

return M
```

## 注册模板

```lua
function M.register_templates(E)
	local GR = require("grid_db")
	local bit = require("bit")
	local tt = E:register_t(M.control, "power_control_custom")

	tt.main_script.insert = function(this, store)
		-- 生成士兵、弹道、decal、modifier
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

模板名加插件前缀，避免和本体冲突。

## 等级

等级由火雨和援兵科技平均后计算，范围 1–6：

```lua
level = clamp(1, 6, ceil((UP.levels.rain + UP.levels.reinforcements) / 2))
```

`M.apply(level)` 在 `UP:patch_templates` 之前执行，只改数值和开关，不重新注册模板：

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

## 资源

按钮、指针、大图如果放在插件 UI 图集里，在 `init` 中补：

```lua
local screen_map = require("screen_map")

screen_map.plugin_required_textures["my_plugin_ui"] = {
	use_bytecode = false,
	path = ENTRY .. "/assets/images"
}
```

## 文案

```lua
POWER_MY_PLUGIN_SPELL_NAME = "法术名",
POWER_MY_PLUGIN_SPELL_DESCRIPTION = "风味文案。",
POWER_MY_PLUGIN_SPELL_LARGE_DESCRIPTION = "冷却40秒。造成120点伤害，并眩晕2秒。",
```

`_LARGE_DESCRIPTION` 写 6 级的具体效果，和 `apply(6)` 对得上。语言表按[资源管理](/wiki/plugin_guide/assets)合并。
