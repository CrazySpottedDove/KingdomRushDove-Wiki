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

## 动画资源

## 语言资源

