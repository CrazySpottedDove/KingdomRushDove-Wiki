# 添加英雄（registry）

本体英雄默认由 `kr1/heroes/registry.lua` 管理。新增英雄时，不要再往 `kr1/heroes.lua` / `kr1/hero_scripts.lua` 里堆模板和脚本。

registry 会按需加载模板、动画和音效，并把这些声明聚合成英雄殿堂、选人界面和局内资源列表。

## 目录

在 `kr1/heroes/<hero>/` 下建立：

```txt
kr1/heroes/hero_x/
├── init.lua        # 声明：room / 资源路径 / 音效组 / 名称样式
├── templates.lua   # 副作用模块：直接 RT(...) 注册模板
├── animations.lua  # 只放这个英雄的动画 key
├── sounds.lua      # 只放这个英雄的音效 id
└── groups.lua      # 只放这个英雄的音效组
```

然后在 `kr1/heroes/registry.lua` 的 `HEROES.module_names` 里加一行：

```lua
"heroes.hero_x",
```

插件新增英雄不要改 `HEROES.module_names`，在插件 `init` 中调用 `HEROES:register(module)`。

## init.lua

```lua
local NS = require("heroes.name_style")

return {
	name = "hero_x",
	room = {
		available_level = 1,
		starting_level = 1,
		from_kr = 1,
		stats = {5, 5, 5, 5}, -- 生命 / 伤害 / 范围 / 速度
		portrait = 1,
		thumb = 1,
		icon = 1,
		portrait_image = "portrait_notxt_0001",
		thumb_image = "hero_room_thumbs_0001",
		icon_image = "mapButtons_portrait_hero_0001"
	},
	room_special_order = {"SKILL_A", "ULTIMATE"},
	required_textures = {"go_hero_x"},
	plugin_required_textures = {},
	required_sounds = {"hero_x"},
	plugin_required_sounds = {},
	required_exoskeletons = {},
	plugin_required_exoskeletons = {},
	screen_map_required_textures = {},
	screen_map_plugin_required_textures = {},
	screen_map_required_sounds = {},
	screen_map_plugin_required_sounds = {},
	templates = {"heroes.hero_x.templates"},
	animations = {"heroes.hero_x.animations"},
	sounds = {"heroes.hero_x.sounds"},
	groups = {"heroes.hero_x.groups"},
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
}
```

- `required_*` 是局内资源，只在选中该英雄时加载。
- `screen_map_*` 是地图和英雄殿堂资源，进入地图时加载。
- `room.portrait` / `thumb` / `icon` 是数字编号，`*_image` 是真实帧名；新英雄以 `*_image` 为准。
- 没有内容的 `animations` / `sounds` / `groups` 路径直接省略，不要写空表。

## templates.lua

模板模块是副作用模块：执行到 `RT(...)` 就完成注册，不要返回函数。

```lua
local HU = require("hero_utils")
local V = require("lib.klua.vector")
require("all.constants")

local function hero_x_level_up(this)
	local hl, ls = HU.level_up_basic(this)

	this.melee.attacks[1].damage_min = ls.melee_damage_min[hl]
	this.melee.attacks[1].damage_max = ls.melee_damage_max[hl]

	HU.upgrade_skill(this, "skill_a", function(this, s)
		this.melee.attacks[1].damage_min = this.melee.attacks[1].damage_min + s.bonus_damage
		this.melee.attacks[1].damage_max = this.melee.attacks[1].damage_max + s.bonus_damage
	end)
end

local function hero_x_update(this, store)
	-- 主循环：从同定位英雄复制 SU.y_hero_* / SU.soldier_* 结构，再改技能逻辑
end

local tt = RT("hero_x", "hero")

AC(tt, "melee", "timed_attacks")
tt.hero.skills.skill_a = CC("hero_skill")
tt.hero.skills.skill_a.xp_gain = {60, 120, 180}
tt.hero.skills.skill_a.xp_level_steps = {[2] = 1, [5] = 2, [8] = 3}
tt.hero.skills.skill_a.bonus_damage = {3, 6, 9}
tt.hero.skills.ultimate = CC("hero_skill")
tt.hero.skills.ultimate.xp_level_steps = {[1] = 1, [4] = 2, [7] = 3, [10] = 4}
tt.ultimate = {ts = 0, cooldown = 60}
tt.hero.level_stats.hp_max = {200, 220, 240, 260, 280, 300, 320, 340, 360, 380}
tt.hero.level_stats.melee_damage_min = {5, 6, 7, 8, 9, 10, 11, 12, 13, 14}
tt.hero.level_stats.melee_damage_max = {10, 11, 12, 13, 14, 15, 16, 17, 18, 19}
tt.hero.fn_level_up = hero_x_level_up
tt.main_script.update = hero_x_update
tt.motion.max_speed = 2.7 * FPS

tt.info.hero_portrait = "hero_portraits_0001"
tt.info.portrait = "info_portraits_heroes_0001"

tt.render.sprites[1].prefix = "hero_x"
tt.render.sprites[1].name = "idle"
tt.render.sprites[1].anchor = V.v(0.5, 0.04)
tt.render.sprites[1].offset = V.v(0, -27)
```

要点：

- 每个技能都必须有 `xp_level_steps`，否则 `upgrade_skill` 不工作。
- 终极技还要加 `tt.ultimate = {ts = 0, cooldown = ...}`。
- 有 `melee` 组件的英雄，`level_up` 里必须显式写回 `melee.attacks[n].damage_min/max`。
- `info.fn` 由基础 `hero` 模板继承 `scripts.hero_basic.get_info`，不要自定义。
- 技能、召唤物、弹道、命中特效只被这个英雄使用时，全部注册在本模块里；被塔、敌人或其它英雄复用的模板留在全局文件。

## 资源类型

| 资源 | 放哪 | 声明 | 生成或检查 |
|---|---|---|---|
| 英雄图集 | `_assets/kr1-desktop/images/fullhd/go_hero_x.lua` + 分页 `.dds` + 仓库根 `.images/go_hero_x-1.png` | `required_textures = {"go_hero_x"}` | 单文件编译图集 |
| 殿堂三图 | 往 `hero_room.lua` 加 `portrait_notxt_XXXX`、`hero_room_thumbs_XXXX`、`mapButtons_portrait_hero_XXXX` | `room.portrait_image / thumb_image / icon_image` | 单文件编译 `hero_room` |
| 信息面板头像 | 往 `gui_portraits.lua` 加 `hero_portraits_XXXX` 和 `info_portraits_heroes_XXXX` | `tt.info.hero_portrait` / `tt.info.portrait` | 单文件编译 `gui_portraits` |
| 骨骼 | `kr1/data/exoskeletons/<name>.lua`，可保留同名 `.exo3` | `required_exoskeletons = {"<name>"}`；sprite 设 `prefix = "<name>"`、`exo = true` | `make compile_exos` |
| 动画 | `kr1/heroes/hero_x/animations.lua` | `animations = {"heroes.hero_x.animations"}` | `make compile_animations` |
| 音效 | `_assets/kr1-desktop/sounds/files/*.ogg`；id 写 `sounds.lua`，组写 `groups.lua` | `required_sounds = {"hero_x"}`；模板里用 `tt.sound_events.*` 引用 id | 检查 id 和组名一致 |
| 文案 | `_assets/kr1-desktop/strings/zh-Hans.lua` 与 `en.lua` | 见下方 i18n | `make organize_strings` |
| 资源索引 | `_assets/assets_index.lua` | 增删资源文件后重建 | `make index` |

图集只编译本次新增或修改的页：

```sh
luajit scripts/compile_image_atlas.lua _assets/kr1-desktop/images/fullhd go_hero_x.lua
luajit scripts/compile_image_atlas.lua _assets/kr1-desktop/images/fullhd hero_room.lua
luajit scripts/compile_image_atlas.lua _assets/kr1-desktop/images/fullhd gui_portraits.lua

make compile_animations
make compile_exos
make index
```

## animations.lua

key 是逻辑动作名，`prefix` 必须等于图集帧或骨骼的前缀：

```lua
return {
	hero_x_idle = {prefix = "hero_x", from = 1, to = 1},
	hero_x_running = {prefix = "hero_x", from = 2, to = 6},
	hero_x_attack = {prefix = "hero_x", from = 7, to = 17},
	hero_x_levelup = {prefix = "hero_x", from = 18, to = 40}
}
```

## sounds.lua / groups.lua

`sounds.lua` 注册音效 id：

```lua
return {
	hero_x_death = {
		files = {"hero_x_death.ogg"},
		gain = 1,
		loop = false,
		source_group = "TAUNTS"
	}
}
```

`groups.lua` 注册局内加载的组，组名必须和 `required_sounds` 一致：

```lua
return {
	hero_x = {
		files = {"hero_x_death.ogg", "hero_x_taunt.ogg"}
	}
}
```

## i18n

键前缀是模板名大写：

```lua
HERO_X_NAME = "英雄名",
HERO_X_DESCRIPTION = "英雄简介。",
HERO_ROOM_X_SKILL_A_NAME = "技能名",
HERO_ROOM_X_SKILL_A_DESC = "技能描述，可用 %$ ... %$ 表达式。",
HERO_ROOM_X_ULTIMATE_NAME = "终极技",
HERO_ROOM_X_ULTIMATE_DESC = "...",
```

- `room_special_order` 里的每项都要有对应的 `HERO_ROOM_X_<项>_NAME/_DESC`。
- 不再维护 `HERO_X_SPECIAL`，殿堂技能摘要按 `room_special_order` 拼接。
- 如果模板设置了 `tt.info.i18n_key`，前缀改用它的值去掉 `HERO_` 前缀后的部分。
- 中英文都要补。

## 英雄殿堂

registry 英雄的殿堂数据全部写在 `init.lua`，以下旧位置不要再改：

- `kr1-desktop/data/map_data.lua` 的 `hero_data` / `hero_shaders`
- `kr1-desktop/data/kui_templates/hero_room_view.lua` 的大图项
- `_assets/kr1-desktop/strings/hero_room_special.lua`（已不存在）

需要补的只有 `room`、`room_special_order`、`name_style`，以及对应图集和 i18n。

## 验证

```sh
luajit -e 'assert(loadfile("kr1/heroes/hero_x/init.lua"))'
luajit -e 'assert(loadfile("kr1/heroes/hero_x/templates.lua"))'

make compile_animations
make compile_exos
make index
python3 scripts/check_i18n_shadowing.py
make check-text

love . -autoplay 1
```

进游戏后确认：英雄殿堂有头像、大图、技能列表；选中后能出场、升级、放技能、死亡复活；音效和图集不缺帧。
