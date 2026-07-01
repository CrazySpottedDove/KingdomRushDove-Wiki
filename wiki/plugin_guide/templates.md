# 修改模板

王国保卫战 Dove 版中，防御塔、士兵、敌人、子弹、特效等实体，都属于模板。对模板的修改，直接影响到游戏中实体的表现。

在本章节，我们将介绍，如何在插件中修改模板。

## 基础篇：数值修改

首先，介绍王国保卫战 Dove 版的模板目录结构：

- `all/templates.lua`: 公共模板文件，存放多处被继承的基础模板。
- `kr1/archer_towers.lua`: 存放高级箭塔。
- `kr1/engineer_towers.lua`: 存放高级炮塔。
- `kr1/mage_towers.lua`: 存放高级法塔。
- `kr1/barrack_towers.lua`: 存放高级兵营。
- `kr1/foundamental_towers.lua`: 存放基础防御塔。
- `kr1/heroes.lua`: 存放英雄。
- `kr1/enemy.lua`: 存放敌人。
- `kr1/boss.lua`: 存放 boss。
- `kr1/game_templates.lua`: 铁皮原版的模板存放模式，所有模板被一股脑地存放在这里。对于 Dove 版，这里存放了无逻辑性质的各种特效实体模板，各种关卡独占的特殊实体模板，以及各种还没来得及移动到以上文件分类的模板。
- `kr1/hero_boss.lua`: 存放作为敌人的一些友方单位。由于一些历史性问题，这个文件一开始制作出来没有考虑持久使用，因此可维护性较差，在重构的 TODO list 中。

如果不知道怎么写模板，可以直接进入这些文件进行阅读，了解模板的大致书写方法。

在插件中，我们推荐这样编辑模板：

### 添加模板文件

在插件目录下建立 `templates.lua`，用于存放插件独有的模板定义、模板编辑。

为了使这个模板文件生效，我们需要利用钩子把它挂在 `entity_db:load()` 中。

```lua
-- 建立钩子
function hook.E.load(next, self)
	next(self)
	require("${entry}.templates")

	-- Clear up
	package.loaded["${entry}.templates"] = nil
end

-- 在 hook:init() 中
do
	local E = require("entity_db")
	hook_utils.HOOK(E, "load", hook.E.load)
end
```

需要注意的是，dove 版通过独特的编译机制，对脚本的性能进行了优化。如果不使用上面的标准写法，可能导致插件定义的脚本跳过了编译过程，从而导致一些难以排查的问题。

### 编辑模板文件

每一个 `.lua` 文件都是一段可执行的脚本。调用 `require()`，实际上就是执行脚本的过程。所以，我们可以把对模板的编辑操作都放到这个文件里，以让代码结构更加清晰。

下面给出一个最小的修改场景：

> 我想要提升小公主的攻击力！

首先，你可能不知道小公主的代码名称。但是，你知道她的中文名为艾莉瑞雅。那么，你可以用 vscode 打开 `KingdomRushDove` 文件夹，然后 Ctrl Shift F 全局搜索 `艾莉瑞雅`。此时，你会在 `zh-Hans.lua` 中找到：

```lua
	HERO_ALLERIA_NAME = "艾莉瑞雅·迅风",
```

那么，我们就知道了她的代码名称为 `hero_alleria`。再全局搜索 `hero_alleria`，我们可以在 `heroes.lua` 中找到她的模板定义：

```lua
-- 艾莉瑞亚
tt = RT("hero_alleria", "hero")
AC(tt, "melee", "ranged", "timed_attacks")
anchor_y = 0.14
anchor_x = 0.5
image_y = 76
image_x = 60
tt.hero.level_stats.armor = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
tt.hero.level_stats.hp_max = {200, 220, 240, 260, 280, 300, 320, 350, 380, 410}
tt.hero.level_stats.melee_damage_max = {5, 7, 9, 12, 15, 18, 22, 26, 30, 34}
tt.hero.level_stats.melee_damage_min = {3, 5, 7, 9, 11, 13, 15, 17, 19, 21}
tt.hero.level_stats.ranged_damage_max = {16, 19, 24, 27, 30, 36, 41, 47, 50, 55}
tt.hero.level_stats.ranged_damage_min = {4, 5, 6, 7, 8, 9, 10, 11, 12, 13}
```

这里可以简单地阅读代码来确定字段的含义。很容易想到，`ranged_damage_max` 指远程普攻的最大伤害。于是，在我们的 `templates.lua` 中，就可以这么做：

```lua
-- 导入实体数据库
local E = require("entity_db")

-- 引用艾莉瑞雅的模板
local tt = E:get_template("hero_alleria")
tt.hero.level_stats.ranged_damage_max = {160, 190, 240, 270, 300, 360, 410, 470, 500, 550}
```

这样，我们就有一个逆天数值的小公主了。

## 进阶篇：逻辑修改

如果你不满足于只是调整数值，那么你就要开始自己写逻辑脚本了。在王国保卫战 Dove 版中，实体的行为逻辑由脚本驱动。每个实体模板可以通过 `main_script` 字段引用脚本函数，在运行时驱动实体的行为。

游戏的脚本系统采用链式加载：

- `all/scripts.lua` — 基础脚本，创建 `scripts` 表
- `kr1/endless_scripts.lua` — 无尽模式脚本
- `kr1/hero_scripts.lua` — 英雄脚本
- `kr1/tower_scripts.lua` — 防御塔脚本
- `kr1/boss_scripts.lua` — Boss 脚本
- `kr1/game_scripts.lua` — 总游戏脚本，整合以上所有脚本

每个文件通过 `local scripts = require(...)` 拿到上一级的 `scripts` 表，然后继续往里面添加新的脚本函数。模板文件通过 `local scripts = require("game_scripts")` 引用这个表，然后用 `tt.main_script.update = scripts.some_entity.update` 将脚本函数挂载到模板上。

### 添加逻辑脚本文件

在插件目录下建立 `scripts.lua`，用于存放插件自有的脚本定义。同样，我们需要在钩子中加载它。

```lua
-- ${entry}.lua
function hook.E.load(next, self)
	next(self)

	-- 先加载脚本，再加载模板（模板需要引用脚本）
	require("${entry}.scripts")
	require("${entry}.templates")

	-- Clear up
	package.loaded["${entry}.templates"] = nil
end

-- 在 hook:init() 中
do
	local E = require("entity_db")
	hook_utils.HOOK(E, "load", hook.E.load)
end
```

在插件的 `scripts.lua` 中，通过 `require("game_scripts")` 拿到游戏现有的 `scripts` 表，然后修改它：

```lua
-- ${entry}/scripts.lua
local scripts = require("game_scripts")
-- 后续的修改会直接作用在全局 scripts 表上
-- ...
return scripts
```

- 如果你的逻辑完全不依赖 `game_scripts`，更推荐不 require，自行建表，减少耦合！
- 这里不给出具体写法介绍，但是我们推荐，如果对 `game_scripts` 进行追加，新加的表项要以 `${entry}` 为开头，避免冲突。

