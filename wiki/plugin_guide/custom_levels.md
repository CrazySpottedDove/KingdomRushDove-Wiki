# 自制关卡地图制作

Dove 版的自制关卡以**地图插件**的形式分发：只要把地图数据打包成一个 `category = "level"` 的插件，游戏就会在选关界面的「自制关卡」中展示并允许游玩。

本章以社区地图插件 **demon_valley（恶魔山谷）** 为范例，讲解一个地图插件的完整结构与制作方法。范例插件位于存档目录的 `plugins/demon_valley/`。

## 目录结构

```tree
demon_valley/
├── config.lua                        # 插件元数据（category = "level"）
├── demon_valley.lua                  # 插件入口（保持最简即可）
├── README.md                         # 地图介绍（管理器详情页展示）
├── cover.png                         # 商店封面（可选）
├── assets/images/                    # 插件自带纹理
│   ├── demon_valley_bg.dds
│   ├── demon_valley_bg.astc
│   └── go_demon_valley.lua           # 纹理组描述文件
└── data/
    ├── levels/
    │   ├── demon_valley.lua          # 关卡脚本（init / update）
    │   ├── demon_valley_data.lua     # 关卡数据（实体、地形、规则）
    │   ├── demon_valley_metadata.lua # 关卡元数据（缩略图、音乐、分类）
    │   ├── demon_valley_grid.lua     # 建造网格
    │   └── demon_valley_paths.lua    # 敌人路径
    ├── waves/
    │   ├── demon_valley_waves_campaign.lua  # 战役出怪（必需）
    │   ├── demon_valley_waves_heroic.lua    # 英雄模式出怪（可选）
    │   └── demon_valley_waves_iron.lua      # 铁人模式出怪（可选）
    └── waveconfigs/
        ├── demon_valley_waves_campaign_config.lua
        ├── demon_valley_waves_heroic_config.lua
        └── demon_valley_waves_iron_config.lua
```

## 一、插件元数据 config.lua

```lua
return {
	name = "恶魔山谷",
	entry = "demon_valley", -- 唯一标识，也是地图代码名
	version = "1.3",
	desc = "将军！我们的哨兵发现，维兹南的一支残部在恶魔山谷中集结……",
	url = "",
	by = "时间滴答",
	category = "level", -- 关卡类插件，自制关卡列表以此识别
	enabled = true,     -- 必须启用才会被扫描
	priority = 0,
}
```

要点：

- `category` 必须为 `"level"`，否则不会出现在「自制关卡」中。
- 插件列表在**游戏启动时**扫描（`plugin_db` 快照），因此地图插件需要在启动时处于启用状态；通过热重载新启用的地图插件，需要重启后才会出现在自制关卡列表中。

## 二、插件入口 demon_valley.lua

地图插件几乎不需要钩子，入口文件保持最简即可（地图逻辑都在关卡脚本里）：

```lua
local hook = require("hook_utils"):new()

function hook:init(plugin_data)
	self.plugin_data = plugin_data
end

return hook
```

## 三、关卡脚本 data/levels/demon_valley.lua

关卡脚本定义 `init` 与 `update` 两个方法：

- `level:init(store)`：关卡加载时调用。可以做本图特有的调整，比如恶魔山谷在这里强化了恶魔军团的敌人模板；也可以插入自定义实体。注意：对模板的修改只作用于本次对局（每次进入关卡实体库都会重新加载）。
- `level:update(store)`：以协程运行的标准循环——插入选中的英雄，并等待所有波次结束、敌人清空。

```lua
local LU = require("level_utils")
local level = {}

function level:init(store)
	local E = require("entity_db")

	-- 示例：强化本图的敌人（恶魔山谷实际修改了更多敌人）
	local tt = E:get_template("enemy_demon_wolf")
	tt.dodge.chance = 0.75
end

function level:update(store)
	if store.selected_hero then
		LU.insert_hero(store)
	end
	while not store.waves_finished or LU.has_alive_enemies(store) do
		coroutine.yield()
	end
end

return level
```

## 四、关卡数据 demon_valley_data.lua

```lua
--（节选，完整内容见插件实际文件）
return {
	entities_list = {
		-- 塔位：template 为塔座样式，pos 为世界坐标
		{ pos = v(713, 195), template = "tower_holder_wasteland",
		  ["tower.default_rally_pos"] = v(801, 255), ["tower.holder_id"] = "170",
		  ["tower.terrain_style"] = "tower_holder_wasteland", ["ui.nav_mesh_id"] = "170" },
		-- 出怪点：path_id 关联路径编号
		{ pos = v(-85, 608), template = "editor_wave_flag", ["editor.path_id"] = 1, ["editor.r"] = 3.14, ["editor.len"] = 180 },
		-- 防守点（敌方终点）
		{ pos = v(1120, 499), template = "decal_defend_point", ["editor.exit_id"] = 1 },
		-- 背景图：render.sprites[1].name 指向插件纹理组中的精灵
		{ pos = v(512, 384), template = "decal_background",
		  ["render.sprites[1].name"] = "demon_valley_bg", ["render.sprites[1].z"] = 1000 },
	},
	invalid_path_ranges = {},
	level_mode_overrides = {
		{},
		{},
		{ locked_towers = { "tower_build_barrack" } }, -- 铁人模式锁兵营
	},
	level_terrain_style = "tower_holder_wasteland",
	locked_hero = false,
	max_upgrade_level = 6,
	nav_mesh = {
		[160] = {}, [162] = {}, -- 塔位导航网格（地图编辑器生成）
	},
	plugin_required_textures = {
		go_demon_valley = { path = "demon_valley/assets/images", use_bytecode = false },
	},
	plugin_required_sounds = {},
	required_textures = { "go_enemies_wastelands", "go_enemies_torment", "go_stages_rotten_torment" },
	required_sounds = { "music_stage20" },
	required_exoskeletons = {},
}
```

主要字段：

| 字段 | 说明 |
| ---- | ---- |
| `entities_list` | 关卡实体列表：塔位（`tower_holder_*`）、出怪点（`editor_wave_flag`）、防守点（`decal_defend_point`）、旗帜（`decal_defense_flag`）、背景（`decal_background`）等。每个实体由 `template` + `pos` + 若干带点号的覆盖属性组成 |
| `level_terrain_style` | 塔座样式，如 `tower_holder_wasteland`（荒原）、`tower_holder_grass`（草地） |
| `max_upgrade_level` | 科技上限（恶魔山谷为 6） |
| `locked_hero` | 是否禁用英雄 |
| `level_mode_overrides` | 各模式覆盖：`[2]` 英雄模式、`[3]` 铁人模式；铁人模式可 `locked_towers` 锁塔 |
| `nav_mesh` | 塔位导航网格（由地图编辑器生成） |
| `required_textures` / `required_sounds` | 引用的本体资源组（敌人贴图、场景、音乐等） |
| `plugin_required_textures` | 插件自带纹理组注册：`组名 = { path = "<entry>/assets/images", use_bytecode = false }` |
| `plugin_required_sounds` | 插件自带音效组注册 |

## 五、关卡元数据 demon_valley_metadata.lua

```lua
return {
	thumbnail_sprite = nil,                    -- 缩略图：本体精灵名（与 thumbnail 二选一）
	thumbnail = "assets/images/demon_valley_bg.dds", -- 缩略图：插件内文件路径（相对插件根目录）
	battle_music = "MusicBattle_20",           -- 战斗音乐
	battle_prep_music = "MusicBattlePrep_20",  -- 备战音乐
	category = "normal",                       -- 分类：normal（常规）/ challenge（挑战）/ creative（整活）
}
```

缩略图会在自制关卡卡片与选关界面展示，支持 `.dds` / `.astc` / `.png` / `.jpg`。

## 六、建造网格与敌人路径

- `demon_valley_grid.lua`：建造网格（地形值矩阵 + 原点），决定哪里可以造塔。
- `demon_valley_paths.lua`：敌人行进路线（贝塞尔曲线 + 连接关系），包含 `connections` / `curves` / `paths` / `active` 四个部分。

这两个文件强烈建议通过**游戏内置的地图编辑器**绘制生成（主界面 → 选项面板 → 「地图编辑器」），不要手写。

## 七、波次与波次配置

- `data/waves/<entry>_waves_campaign.lua`：实际出怪数据（游戏运行时读取）。`campaign` 文件是**必需**的——自制关卡列表要求存在该文件；`heroic` / `iron` 文件可选，存在时选关界面会显示对应模式标签。
- `data/waveconfigs/<entry>_waves_<mode>_config.lua`：波次策划配置，地图编辑器的波次工具用它生成具体的出怪文件。

```lua
-- data/waves/demon_valley_waves_campaign.lua（节选）
return {
	cash = 1000, -- 初始金币
	groups = {
		{
			interval = 990, -- 本组与下一组出怪的间隔（帧）
			waves = {
				{
					delay = 0,          -- 组内延迟（帧）
					path_index = 1,     -- 出怪路径编号
					spawns = {
						{
							creep = "enemy_demon", -- 敌人模板名
							max = 6,              -- 数量
							interval = 43,        -- 出怪间隔（帧）
							interval_next = 15,   -- 本组出完后的间隔（帧）
							path = 1,
							fixed_sub_path = 0,   -- 子路径，0 为随机
						},
					},
				},
			},
		},
	},
}
```

## 八、纹理资源

地图背景等自用图片放在 `assets/images/` 下（推荐 `.dds` / `.astc` 格式），并用一个纹理组文件描述：

```lua
-- assets/images/go_demon_valley.lua
return {
	demon_valley_bg = {
		a_name = "demon_valley_bg.dds", -- 图集文件名
		size = { 1920, 1080 },
		trim = { 0, 0, 0, 0 },
		a_size = { 1920, 1080 },
		f_quad = { 0, 0, 1920, 1080 },
		alias = {},
	},
}
```

然后在关卡数据的 `plugin_required_textures` 中注册该组（见第四节），背景实体用 `["render.sprites[1].name"] = "demon_valley_bg"` 引用。

## 九、制作流程总结

1. 主界面 → 选项面板 → 打开「地图编辑器」，使用「创建插件地图」输入 entry 生成骨架（会自动生成上述全部文件与最简内容）。
2. 在地图编辑器中绘制：建造网格、敌人路径、放置塔位 / 出怪点 / 防守点 / 背景，编辑波次。
3. 保存：编辑器会把关卡数据直接写入 `plugins/<entry>/` 下的插件目录。
4. 在插件管理器中确认插件已启用（`category = "level"` 会自动归入「关卡」分类），重启游戏后即可在「自制关卡」中看到并游玩。
5. 想分享给其他玩家：开启开发者模式（存档目录下建立 `developer.lua` 填写账号密码），在插件管理器中选中自己的插件点击「上传」；玩家即可在插件商店的「关卡」分类下载安装。

## 注意事项

- 自制关卡的进度（星星）单独记录，删除地图插件不会影响本体存档。
- 关卡列表在启动时扫描，安装 / 启用地图插件后需要重启游戏才会出现在「自制关卡」中。
- 若地图脚本修改了模板，修改只作用于本次对局，不会永久改变游戏。
