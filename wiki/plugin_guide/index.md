# 插件开发文档

欢迎进入插件开发的世界！

## 插件的位置

Dove 版的插件保存在存档目录下的 `plugins/` 目录中。每一个插件需要有一个独有的 entry 名称，用来避免和其他插件发生冲突。

一个典型的插件目录结构如下：

- `${entry}.lua`: 插件入口文件。
- `config.lua`: 插件元数据文件。
- (可选) `README.md`: 插件介绍文件。
- (可选) `${entry}_config.lua`: 插件配置文件。

## 插件元数据文件

以下为插件元数据的基本格式：

```lua
return {
	name = "插件的名称",
	entry = "插件的entry名称，必须唯一，也就是 ${entry} 的值。",
	version = "插件的版本",
	desc = "插件功能的简短描述",
	url = "插件仓库的地址，若没有，可给空字符串",
	by = "作者账号名称",
	category = "other", -- 插件类型。可选项："gameplay"（玩法）, "cosmetic"（美化）, "display"（显示）, "tower"（防御塔）, "hero"（英雄）, "enemy"（敌人）, "level"（关卡）, "other"（其它）,
	enabled = true, -- 启用状态，关闭则不加载此 mod
	priority = 0, -- 插件启用优先级，若不知道可填 0
	min_version = "2.0.7.8", -- 可选：运行本插件所需的最低本体版本。省略或留空表示不限制
}
```

除可选的 `min_version` 外，每一条插件元数据都不可为 `nil`。

### min_version：限制本体最低版本

`min_version` 是一个**可选**字段，用于声明「本插件必须在哪个本体版本及以上才能运行」。它的值是一个点分版本号字符串，与本体 `version.lua` 中的 `id` 字段（例如 `2.0.7.7`）比较。

当玩家在插件管理器中尝试**下载或更新**该插件时，本体版本会与 `min_version` 逐段比较：

- 本体版本 **大于等于** `min_version`：正常下载/安装。
- 本体版本 **严格小于** `min_version`：拒绝下载/更新，并弹窗提示玩家「`插件名(插件版本)` 需要 `min_version` 版本本体才可运行，请先更新本体」。

省略 `min_version`、或将其写成空字符串时，表示不限制本体版本，行为与旧插件完全一致。

因此，只要你的插件用到了新版本本体才有的接口、资源或字段，就应该填上 `min_version`，避免老版本玩家装上后无法运行。

## 插件入口文件

最小化的插件入口文件示例：

```lua
local hook_utils = require("hook_utils")
-- hook: 也就是插件本身
local hook = hook_utils:new()

-- 所有插件在游戏的启动阶段，调用 init 方法，以起到应用插件功能的效果。
function hook:init(mod_data)
	self.mod_data = mod_data
end

-- 记得返回插件，否则无法识别！
return hook
```

## 插件介绍文档

在 `README.md` 中写插件介绍，即可作为详情内容，在插件管理器中点击查看。

一般来说，`README.md` 的内容不宜过多，它的根本功能应当是补充对插件效果的介绍，当然也可以放上插件更新的日志。过多的技术实现细节，不建议在 `REAEDME.md` 中书写，避免篇幅过长，使人缺乏耐心阅读。

## 插件配置文件

除元数据文件 `config.lua` 外，插件还可以提供一个**可选**的配置文件 `${entry}_config.lua`，用于让玩家在插件管理器中点击「配置」按钮调整插件的参数。省略该文件时，插件没有任何可调参数，插件管理器中也不会出现配置按钮。

```lua
-- ${entry}_config.lua
return {
	attack_cooldown = 1,
	use_damage_true = false,
	key_label_map = {
		attack_cooldown = "普攻冷却时间(秒)",
		use_damage_true = "造成真实伤害",
	},
}
```

完整写法、保留字段与更新时的合并规则，见 [⚙️ 插件配置](config) 章节。

在你的插件中，应当这样引入插件配置文件：

```lua
-- 不是真写 ${entry}，实际写的时候替换成你的插件的 entry 名称。
local config = require("${entry}.${entry}_config")
```

为了命名空间隔离，任何插件目录中独有的文件，在进行 `require` 时，都应该添加 `${entry}.` 前缀。否则，当多个插件中出现同名文件时，可能出现冲突。

## 章节

- [🔌 开发者模式](/wiki/plugin_guide/developer) — 开启上传功能，在游戏内直接上传/更新插件
- [🛠️ 修改模板](/wiki/plugin_guide/templates) — 在插件中修改防御塔、英雄、敌人等实体模板
- [🎨 资源管理](/wiki/plugin_guide/assets) — 纹理、音乐、语言、数据资源的导入与注册
- [⚙️ 插件配置](/wiki/plugin_guide/config) — `${entry}_config.lua` 的写法、保留字段与更新合并规则
- [🔥 热重载](/wiki/plugin_guide/hot_reload) — 不重启游戏应用插件修改（reload / unload / on_config_change）
- [🗺️ 自制关卡地图制作](/wiki/plugin_guide/custom_levels) — 以恶魔山谷为范例，讲解地图插件的完整结构与制作方法