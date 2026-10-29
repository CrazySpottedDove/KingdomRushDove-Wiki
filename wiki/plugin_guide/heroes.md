# 添加英雄

## 推荐文件结构

```txt
plugins/<entry>/
├── config.lua
├── <entry>.lua                 # 注册英雄
├── templates.lua               # 英雄与子实体模板
├── data/animations.lua
└── assets/
    ├── images/
    ├── sounds/
    ├── exoskeletons/
    └── strings/
```

## 注册

```lua
local HEROES = require("heroes.registry")
local NS = require("heroes.name_style")
local ENTRY = "my_hero_plugin"

function hook:init(plugin_data)
	HEROES:register({
        -- 英雄的模板名
		name = "hero_x",
		room = {
            -- 第几关解锁
			available_level = 1,
            -- 英雄殿堂中的属性
			stats = {5, 5, 5, 5},
            -- 海报纹理（选填）
			portrait_image = "my_hero_plugin_portrait",
            -- 英雄殿堂按钮纹理
			thumb_image = "my_hero_plugin_thumb",
            -- 选中后英雄殿堂框内出现的头像纹理
			icon_image = "my_hero_plugin_icon"
		},
        -- 技能详情中展示的顺序，值为其 i18n 后缀
		room_special_order = {"SKILL_A", "ULTIMATE"},
        -- 模板文件
		templates = {ENTRY .. ".templates"},
        -- 动画文件
		animations = {ENTRY .. ".data.animations"},
        -- 声音文件
		sounds = {ENTRY .. ".assets.sounds.sounds"},
        -- 声音组文件
		groups = {ENTRY .. ".assets.sounds.groups"},
        -- 局内引用的本体纹理资源
		required_textures = {},
        -- 局内引用的插件纹理资源
		plugin_required_textures = {
			["go_hero_x"] = {
				use_bytecode = false,
				path = ENTRY .. "/assets/images"
			}
		},
        -- 局内引用的声音资源
		required_sounds = {},
        -- 局内引用的插件声音资源
		plugin_required_sounds = {ENTRY .. "_hero_sounds"},
        -- 局内引用的本体骨骼动画资源
		required_exoskeletons = {},
        -- 局内引用的插件骨骼动画资源
		plugin_required_exoskeletons = {
			["hero_x"] = {path = ENTRY .. "/assets/exoskeletons"}
		},
        -- 在大地图引用的本体美术资源
		screen_map_required_textures = {},
        -- 在大地图引用的插件美术资源
		screen_map_plugin_required_textures = {
			["hero_x_ui"] = {
				use_bytecode = false,
				path = ENTRY .. "/assets/images"
			}
		},
        -- 在大地图引用的本体声音资源
		screen_map_required_sounds = {},
        -- 在大地图引用的插件声音资源
		screen_map_plugin_required_sounds = {},
        -- 英雄殿堂中英雄名称的样式
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

正常写模板文件。该文件只会在将要进入局内，且携带了该英雄时被加载。建议脚本也写在这里，且不要污染 `scripts.lua`。

## 文案

```lua
HERO_X_NAME = "英雄名",
HERO_X_DESCRIPTION = "英雄简介。",
HERO_ROOM_X_SKILL_A_NAME = "技能名",
HERO_ROOM_X_SKILL_A_DESC = "技能描述。",
HERO_ROOM_X_ULTIMATE_NAME = "终极技",
HERO_ROOM_X_ULTIMATE_DESC = "...",
```

`room_special_order` 的每项都要有对应 `_NAME/_DESC`。语言表按[资源管理](/wiki/plugin_guide/assets)的语言资源一节合并。
