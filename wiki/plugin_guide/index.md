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
}
```

每一条插件元数据都不可为 `nil`。

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

插件配置文件是一个 Dove 版本体约定的文件，用于允许玩家在插件管理器中点击配置按钮来调整插件的参数。其内容格式如下：

```lua
return {
	-- 一些可配置字段，支持数字、布尔值、扁平数组，下面是一些字段示例
	attack_cooldown = 1,
	use_damage_true = false,
	attack_damages = {
		50,
		100,
		150,
	},
	-- key_label_map 负责给出这些可配置字段的名称
	key_label_map = {
		attack_cooldown = "普攻冷却时间(秒)",
		use_damage_true = "造成真实伤害",
		attack_damages = "普攻各级伤害",
	},
}
```

在你的插件中，应当这样引入插件配置文件：

```lua
-- 不是真写 ${entry}，实际写的时候替换成你的插件的 entry 名称。
local config = require("${entry}.${entry}_config")
```

为了命名空间隔离，任何插件目录中独有的文件，在进行 `require` 时，都应该添加 `${entry}.` 前缀。否则，当多个插件中出现同名文件时，可能出现冲突。