# 资源管理

插件的资源可分为纹理资源、音乐资源、语言资源、数据资源。

在本章节，我们讲解如何规范地导入、注册插件资源。

在介绍之前，先推荐一个目录结构，之后的讲解也以此为基础。

- `assets/images`: 存放纹理资源。
- `assets/sounds`: 存放音乐资源。
- `assets/strings`: 存放语言资源。
- `data/`: 存放数据资源，其中包含动画资源。

## 纹理资源

- 图集：一个文件，常用的格式有 `.png`,`.dds`,`.astc`。
- 纹理：加载到内存中后的图集，变成了适合 GPU 处理的对象。
- 精灵：纹理中的一个区域。一个可渲染对象通常拥有多个精灵，将这些精灵进行一定顺序的渲染，就完成了对可渲染对象的渲染。

在 Dove 版中，纹理通过组来定义、加载。每一个组对应一个 `.lua` 文件，用于描述这个组中包含了哪些精灵。

以下是一个纹理组文件的示例：

```lua
-- ${entry_group1.lua}
return {
	hero_barracks_0001 = {
		-- 包含该 sprite 的图集名称。
		a_name = "go_hero_gerald-1.png",
		-- 该 sprite 矩形的大小
		size = { 184, 220 },
		-- 该 sprite 在矩形中裁剪的边距。
		-- trim[1]: 从左向右裁剪的像素数
		-- trim[2]: 从上往下裁剪的像素数
		trim = { 50, 98, 50, 18 },
		-- 图集的尺寸
		a_size = { 2048, 2048 },
		-- sprite 矩形的实际位置，以及 sprite 的实际大小
		-- f_quad[1]: sprite 矩形左上角的横坐标
		-- f_quad[2]: sprite 矩形左上角的纵坐标
		-- f_quad[3]: sprite 的实际横向大小
		-- f_quad[4]: sprite 的实际纵向大小
		f_quad = { 106, 520, 84, 104 },
		-- sprite 的别名，用于多个 sprite 为同一内容的情况
		alias = { "hero_barracks_0029", "hero_barracks_0030", "hero_barracks_0031" },
		-- sprite 渲染时的缩放比例
		ref_scale = 0.5,
	},
	hero_barracks_0002 = {
		a_name = "go_hero_gerald-1.png",
		size = { 184, 220 },
		trim = { 46, 100, 50, 18 },
		a_size = { 2048, 2048 },
		f_quad = { 197, 1659, 88, 102 },
		alias = {},
		ref_scale = 0.5,
	},
}
```

一些专门的图集打包工具可以将多张图集合并成一个大图集，从而减小渲染时纹理切换的开销。不过，如果不想了解这些的话，每一张图片作为一个图集也是可以接受的。此时，可以简单地让 `size`, `a_size`, `{f_quad[3], f_quad[4]}` 相同。如：

```lua
holy_nuclear_tower_icon = {
	a_name = "achievement_icons_0015.png",
	size = { 64, 64 },
	trim = { 0, 0, 0, 0 },
	a_size = { 64, 64 },
	f_quad = { 0, 0, 64, 64 },
	alias = {},
}
```

不同格式的图集在不同的平台有不同的支持度。为了保证插件在安卓端和电脑端都可以使用，一个简单的方法是，使用 `.png` 格式的图集。

在插件初始化时，我们应当将纹理资源注册到游戏纹理资源的加载周期中。下面是一个示例：

```lua
-- 在 hook:init() 中
do
	-- 选择需求这些纹理资源的场景。
	-- game: 游戏对局
	-- screen_map: 大地图
	local game = require("game")

	-- 注册插件自己管理的纹理资源
	game.plugin_required_textures["${entry}_group1"] = {
		-- 不使用 bytecode 方式加载，也就是说，你的纹理组文件是个人类可读的 .lua 文件
		use_bytecode = false,
		-- 加载路径，末尾不应有 "/"，该路径下需要能够找到 ${entry_group1}
		path = "${entry}/assets/images",
	}

	-- 如果选择直接加载游戏本体的纹理资源，则可直接这么做：
	-- 这里要求加载了杰拉尔德的纹理资源
	table.arrayensure(game.required_textures, "go_hero_gerald")
end
```

## 音乐资源

Dove 版的音乐资源也通过组(`groups.lua`)来管理。不同的是，音乐资源的组只负责描述需要加载的音乐，而音效的定义在单独的文件中(`sounds.lua`)。

```lua
-- groups.lua 的结构
return {
	-- 键名为声音组名称。为了防止冲突，建议声音组名称添加插件 entry 前缀
	${entry}_tower_spirit_mausoleum = {
		-- 定义这个组需要的文件
		files = {
			"kr4_fallen_ones_spirit_mausoleum_taunt_1.ogg",
			"kr4_fallen_ones_spirit_mausoleum_taunt_2.ogg",
			"kr4_fallen_ones_spirit_mausoleum_taunt_3.ogg",
			"kr4_fallen_ones_spirit_mausoleum_taunt_4.ogg",
			"kr4_fallen_ones_spirit_mausoleum_communion_upg.ogg",
			"kr4_fallen_ones_spirit_mausoleum_possesion_upg.ogg",
			"kr4_fallen_ones_spirit_mausoleum_gargoyles_upg.ogg",
			"kr4_fallen_ones_spirit_mausoleum_attack_preload.ogg",
			"kr4_fallen_ones_spirit_mausoleum_attack.ogg",
			"kr4_fallen_ones_spirit_mausoleum_possession_cast.ogg",
			"kr4_fallen_ones_spirit_mausoleum_possession_hit.ogg",
		},
		-- 插件声音组独有，用于指定插件声音组的路径
		parent_dir = "${entry}/assets/sounds",
	},
}
```

```lua
-- sounds.lua 的结构
return {
	-- 音效的名称。为了防止冲突，建议音效名称添加插件 entry 前缀
	${entry}_ShiningHolyNuclearBuild = {
		-- 音效对应播放的文件
		files = { "hero_priest_healing.ogg" },
		-- 音量百分比
		gain = 1,
		-- 是否循环播放
		loop = false,
		-- 属于哪一类音效
		source_group = "TAUNTS",
	},
	${entry}_ShiningHolyNuclearHolyBlastUp = {
		files = { "hero_priest_consecrate.ogg" },
		gain = 1,
		loop = false,
		source_group = "TAUNTS",
	},
	${entry}_ShiningHolyNuclearNuclearUp = {
		files = { "hero_priest_teleport.ogg" },
		gain = 1,
		loop = false,
		source_group = "TAUNTS",
	},
}
```

这里附上所有的声音类型:

```lua
return {
	source_groups = {
		-- 子弹
		BULLETS = {
			max_sources = 9,
		},
		-- 死亡
		DEATH = {
			max_sources = 3,
		},
		DEFAULT = {
			max_sources = 1,
		},
		-- 爆炸
		EXPLOSIONS = {
			max_sources = 3,
		},
		-- UI
		GUI = {
			max_sources = 4,
		},
		-- 背景音乐
		MUSIC = {
			max_sources = 1,
		},
		-- 特效音效
		SFX = {
			max_sources = 5,
		},
		SPECIALS = {
			max_sources = 5,
		},
		-- 近战
		SWORDS = {
			max_sources = 1,
		},
		-- 类似于防御塔升级、技能升级的音效
		TAUNTS = {
			max_sources = 2,
		},
		REFCOUNTED = {
			max_sources = 1000000,
		},
	},
}
```

一个在插件中加载音乐资源的案例如下：

需求场景：

- 需要在对局中加载 `hero_lilith` 这个声音组。
- 需要自定义一些音效，音效定义文件为 `assets/sounds/sounds.lua`。
- 需要自定义一些声音组，并在对局中加载。声音组文件为 `assets/sounds/groups.lua`。

```lua
-- 在 hook:init() 中
do
	-- 选择需求这些音乐资源的场景。
	-- game: 游戏对局
	-- screen_map: 大地图
	local game = require("game")

	-- 加载本体的音乐资源
	table.arrayensure(game.required_sounds, "hero_lilith")

	-- 追加插件自管理的声音组和音效定义
	local S = require("sound_db")
	local groups = require("${entry}.assets.sounds.groups")
	local sounds = require("${entry}.assets.sounds.sounds")

	S:register_groups(groups)
	S:register_sounds(sounds)

	-- 释放这两个表的内存，减少 gc 压力
	package.loaded["${entry}.assets.sounds.groups"] = nil
	package.loaded["${entry}.assets.sounds.sounds"] = nil

	-- 要求在局内加载的插件的声音组
	table.arrayensure(game.plugin_required_sounds, "${entry}_some_group_name")
end
```

## 动画资源

动画资源负责定义动画数据。常见的动画数据定义如下：

```lua
return {
	-- 动画的名称。为了避免冲突，建议动画名称添加 entry 前缀。
	${entry}_Amalgam_Attack1_run = {
		-- 对应 sprite 的前缀。
		prefix = "Amalgam_Attack1",
		from = 1,
		to = 24,
		-- 该动画对应从 Amalgam_Attack1_0001 到 Amalgam_Attack_0024 的全部 sprite
	},
	${entry}_Amalgam_Attack2_run = {
		prefix = "Amalgam_Attack2",
		from = 1,
		to = 25,
	},
}
```

我们建议将动画数据的定义放在 `data/animations.lua` 中。

动画资源的加载通过钩子实现：

首先定义钩子：

```lua
function hook.A.load(next, self)
    next(self)

    -- 在 animation_db:load() 调用后，我们追加我们的动画定义
    local animations = require("${entry}.data.animations")
    self:register_animations(animations)

    -- 释放内存
    package.loaded["${entry}.data.animations"]
end
```

然后在 `hook:init()` 中：

```lua
do
	local A = require("animation_db")
	hook_utils.HOOK(A, "load", self.A.load)
end
```

## 语言资源

语言资源以 `.lua` 文件的形式存放在 `assets/strings/` 目录下。文件以语言名称命名，例如中文简体为 `zh-Hans.lua`。

语言文件的格式如下：

```lua
-- ${entry}/assets/strings/zh-Hans.lua
return {
	["${entry}_TOWER_NAME"] = "神圣核子塔",
	["${entry}_TOWER_DESCRIPTION"] = "一座融合了神圣与核子科技的防御塔。",
	["${entry}_ABILITY_HOLY_BLAST_NAME"] = "神圣冲击",
	["${entry}_ABILITY_HOLY_BLAST_DESC"] = "释放神圣能量冲击敌人。",
}
```

为了防止键名冲突，建议所有语言键名添加 `${entry}_` 前缀。

在插件初始化时，需要将语言资源合并到游戏的国际化系统中。这里区分两个场景。

首先，我们定义一个函数，用于将我们的语言资源合并进本体语言资源中。

```lua
local function merge_locales(locale)
	local strings = require("${entry}.assets.strings." .. locale)
	for k, v in pairs(strings) do
		i18n.msgs[locale][k] = v
	end
	package.loaded["${entry}.assets.strings." .. locale] = nil
end
```

然后，我们需要分别在钩子中和 `hook:init()` 中调用这个函数。这是因为， i18n 模块的 `load_locale` 事件在插件初始化前就已经触发，所以需要插件初始化时手动应用一次。

```lua
function hook.i18n.load_locale(next, locale)
	next(locale)
	merge_locales(locale)
end

-- 在 hook:init() 中
do
	merge_locales()
	local i18n = require("i18n")
	hook_utils.HOOK(i18n, "load_locale", hook.i18n.load_locale)
end
```

注意插件中其他使用这些语言资源的地方，其调用应在语言资源合并之后。
