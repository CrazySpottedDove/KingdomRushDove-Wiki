# 模组（Mod）开发文档

KingdomRushDove · 最后更新：2026

## 1. 概述

KingdomRushDove 内置了一套轻量级的模组系统，允许开发者在不修改游戏源码的前提下，通过覆盖资产、修改模板数据、拦截函数调用等方式对游戏内容进行扩展或修改。

模组系统由以下核心模块组成：

- `mod_main.lua` — 模组管理器，负责发现、加载和初始化所有模组
- `mod_db.lua` — 模组数据库，扫描并维护可用模组列表
- `mod_hook.lua` — 内置系统级钩子（图像、声音、关卡、波次资产覆盖）
- `hook_utils.lua` — 钩子工具库，供模组使用
- `mod_utils.lua` — 通用工具函数库
- `mod_globals.lua` — 注入模组可用的全局变量

## 2. 目录结构

所有模组均放置在 `mods/local/` 目录下，每个模组占据一个独立的子目录：

```tree
mods/local/
└── my_mod/                          ← 模组根目录（名称即模组 ID）
    ├── config.lua                   ← 必须，模组元信息
    ├── my_mod.lua                   ← 必须，模组入口（文件名与目录名相同）
    ├── scripts/                     ← 可选，脚本文件（自动加入 require 路径）
    ├── data/                        ← 可选，数据文件
    │   ├── levels/                  ← 覆盖关卡数据
    │   └── waves/                   ← 覆盖波次数据
    └── _assets/                     ← 可选，资产覆盖
        ├── images/                  ← 覆盖图像图集（atlas）
        └── sounds/                  ← 覆盖声音资源
            ├── settings.lua
            ├── sounds.lua
            ├── groups.lua
            ├── extra.lua
            └── files/               ← 覆盖声音文件
```

<div class="callout info">
<b>模组 ID</b>：模组的目录名即为模组 ID，也是入口文件名（不含 <code>.lua</code>）。模组 ID 必须全局唯一，且只能包含字母、数字和下划线。
</div>

`data/` 下的子目录会被特殊处理：`data/kui_templates` 会自动以最高优先级注册到 KUI 模板路径，其他子目录则加入 `require` 路径。`_assets/` 目录不会加入 `require` 路径（由系统忽略）。

## 3. 配置文件 config.lua

每个模组的根目录下必须有一个 `config.lua`，返回一个配置表：

```lua
return {
    name         = "我的模组",           -- 显示名称（可含中文）
    entry        = "my_mod",            -- 模组唯一标识符，只能含字母/数字/下划线
    version      = "1.0.0",
    game_version = {"kr5", "kr3", "kr2", "kr1"}, -- 支持的游戏版本，必须为字符串数组
    desc         = "模组描述",
    url          = "https://example.com", -- 发布链接，可为空字符串
    by           = "作者名",             -- 必须与插件商店账户名相同
    category     = "other",             -- 插件类型，详见下表
    enabled      = true,                -- false 则跳过加载
    priority     = 0                    -- 数值越大优先级越低，不确定填 0
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 模组显示名称（可含中文） |
| `entry` | string | 模组唯一标识符，也是模组目录名和入口文件名（不含 `.lua`）。只能包含字母、数字和下划线。上传到插件商店时以此命名 zip 文件，zip 内必须能直接找到同名 `.lua` 文件。 |
| `version` | string | 模组版本号 |
| `game_version` | string[] | 兼容的游戏版本，用于在加载前校验。可选值：`"kr1"` `"kr2"` `"kr3"` `"kr5"` |
| `desc` | string | 模组描述 |
| `url` | string | 模组发布页链接 |
| `by` | string | 作者名。上传到插件商店时，此字段必须与登录账户的用户名完全一致。 |
| `category` | string | 插件类型。可选项："gameplay"（玩法）, "cosmetic"（美化）, "display"（显示）, "tower"（防御塔）, "hero"（英雄）, "enemy"（敌人）, "level"（关卡）, "other"（其它） |
| `enabled` | boolean | `false` 时跳过加载 |
| `priority` | number | 优先级，数值越小越先初始化（覆盖力越强），默认 `0` |

<div class="callout info">
<b>上传到插件商店的要求：</b> zip 内顶层必须同时包含 <code>config.lua</code> 和 <code>$entry.lua</code>（即 entry 字段值加 <code>.lua</code>）两个文件。zip 文件本身的名称不限，可以使用中文。上传需要先在插件商店注册账户并登录，且 <code>by</code> 字段必须与登录用户名相同。
</div>

### 优先级说明

模组按 `priority` 升序排列。**数值小的模组最后初始化**，因此其钩子会覆盖数值大的模组。多个模组同时存在时，优先级越小（数值越低）的模组"胜出"。

## 4. 模组入口文件

入口文件名必须与模组目录名相同（如目录为 `my_mod/`，入口文件为 `my_mod.lua`）。文件必须返回一个 **table**，且该 table 必须包含 `init` 方法。

### 最小结构

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK

local hook = hook_utils:new()

-- 必须实现：模组初始化入口
function hook:init(mod_data)
    self.mod_data = mod_data
    -- 在此注册钩子、修改模板数据等
    HOOK(E, "load", self.E.load)
end

function hook.E.load(load, self)
    load(self)  -- 先调用原函数
    require("my_mod_templates")
end

return hook
```

### init 方法参数

`mod_data` 是由系统传入的模组数据表，常用字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `mod_data.name` | string | 模组目录名（即模组 ID） |
| `mod_data.path` | string | 模组根目录的完整路径 |
| `mod_data.config` | table | config.lua 返回的配置表 |
| `mod_data.priority` | number | 模组优先级 |
| `mod_data.check_paths` | table | 检测到的资产覆盖路径映射表 |

## 5. 钩子系统（hook_utils）

钩子系统允许模组拦截并扩展任意对象上的函数，而无需直接替换它。多个模组可以对同一函数注册多个钩子，系统会以链式方式依次调用。

### HOOK — 注册钩子

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK

-- HOOK(对象, 函数名, 处理器函数 [, 优先级])
HOOK(SomeObj, "some_method", function(original_fn, self, arg1, arg2)
    -- 可在调用原函数前执行逻辑
    local result = original_fn(self, arg1, arg2)  -- 调用原函数（或下一个钩子）
    -- 可在调用原函数后执行逻辑
    return result
end)
```

处理器函数的签名：`function(next_fn, self_or_first_arg, ...)`

- `next_fn` — 调用下一个钩子（或原函数）的函数，**必须调用**以维持调用链
- 其余参数与原函数一致
- 优先级（第四个参数）默认为 `0`，数值越小越先执行

### 在实例上使用钩子（推荐写法）

推荐使用 `hook_utils:new()` 创建实例，将处理器存放在实例的命名空间下，便于管理：

```lua
local hook = hook_utils:new()

function hook:init(mod_data)
    HOOK(E, "load", self.E.load)    -- 钩子处理器定义在 hook.E.load
    HOOK(S, "play", self.S.play)
end

-- 处理器：self.E.load（使用嵌套命名空间隔离）
function hook.E.load(load, self)
    load(self)
    -- 自定义逻辑
end
```

<div class="callout warn">
<b>注意命名空间</b>：<code>hook_utils:new()</code> 使用了自动创建子表的元表，访问不存在的键会自动创建空表，因此可以直接写 <code>hook.E.load = function(...) end</code> 而不会报错。
</div>

### UNHOOK — 移除钩子

```lua
hook_utils.UNHOOK(SomeObj, "some_method", handler_function)
```

传入与注册时相同的函数引用即可移除对应钩子。

### CALL_ORIGINAL — 直接调用原函数

```lua
hook_utils.CALL_ORIGINAL(SomeObj, "some_method", arg1, arg2)
```

绕过所有钩子，直接调用被钩住前的原始函数。

### 钩子执行顺序

注册时 `priority` 越小，越先被执行（越外层包装）。最后注册且优先级最高的钩子最先被调用，最终才调用原始函数。模组 `priority` 越小（数值低），其 `init` 越晚执行，注册的钩子也越靠外。

## 6. 资产覆盖

系统在加载图像、声音、关卡数据、波次数据时会自动检测模组目录下对应路径是否存在覆盖文件，若存在则以模组版本替换原始资源。无需手动注册，只需按规定目录放置文件即可。

### 图像图集覆盖

路径：`_assets/images/<atlas_name>.lua`

当游戏加载名为 `atlas_name` 的图集时，若模组在对应路径存在同名 `.lua` 文件，则图集会被模组版本覆盖。图集文件格式与原始游戏一致。

### 声音资源覆盖

| 路径 | 作用 |
|---|---|
| `_assets/sounds/settings.lua` | 覆盖声音源分组设置（`source_groups`） |
| `_assets/sounds/sounds.lua` | 完全替换声音定义表 |
| `_assets/sounds/groups.lua` | 完全替换声音分组表 |
| `_assets/sounds/extra.lua` | 增量追加声音与分组（推荐，不破坏其他模组） |
| `_assets/sounds/files/` | 覆盖声音文件（实际音频） |

#### extra.lua 格式（推荐）

```lua
return {
    sounds = {
        my_sound = { files = {"my_sound.ogg"} }
    },
    groups = {
        -- append = true 表示追加到现有分组
        existing_group = { append = true, files = {"extra.ogg"} },
        -- alias 表示复用另一分组
        another_group  = { alias = "existing_group" },
        -- 直接赋值则替换整个分组
        new_group = { files = {"new.ogg"} }
    }
}
```

### 关卡数据覆盖

路径：`data/levels/<level_name>.lua`

覆盖关卡的 `data` 和 `locations` 字段，其余字段保持原样。

### 波次数据覆盖

路径：`data/waves/<level_name>.lua`

完全替换指定关卡的波次路径数据。

## 7. 全局工具函数

以下函数和变量由 `mod_globals.lua` 注入，在模组代码中可直接使用：

### 全局变量

| 变量 | 说明 |
|---|---|
| `IS_KR5` | 当前是否运行 kr5 版本 |
| `IS_LOVE_11` | 是否使用 LÖVE 11+ |
| `E` | entity_db 实例，管理实体模板 |
| `UPGR` | upgrades 模块 |
| `SH` | shader_db 实例 |
| `V` | vector 工具库（`V.v`, `V.vv`） |
| `signal` | 信号/事件系统 |
| `class` | middleclass OOP 库 |
| `km` | 宏工具（klua.macros） |
| `bit / band / bor / bnot` | 位运算 |
| `copy` | `table.deepclone` 的别名 |
| `clone` | `table.clone` 的别名 |
| `storage` | all.storage 持久化存储 |
| `SU` | script_utils 脚本工具 |
| `U` | utils 通用工具 |

### 实体与模板操作

```lua
-- 注册新模板（name: 模板名, ref: 派生自哪个已有模板）
RT("my_tower", "base_tower")

-- 获取已有模板的引用（可直接修改其字段）
local t = T("hero_alleria")
t.motion.max_speed = 3.5 * FPS

-- 为模板添加组件
AC("my_tower", "comp_health", "comp_armor")

-- 深拷贝一个组件（避免多个模板共享同一表）
local c = CC("comp_health")

-- 创建实体实例
local e = create_entity("my_tower")

-- 将实体加入插入队列
queue_insert(store, e)

-- 将实体加入移除队列
queue_remove(store, e)

-- 将伤害实体加入伤害队列
queue_damage(store, damage_entity)
```

### 数学工具

```lua
-- 帧数转秒数（基于当前 FPS）
local seconds = fts(30)   -- 30 帧 → 对应秒数

-- 角度转弧度
local rad = d2r(90)       -- 90° → π/2
```

## 8. mod_utils 工具函数

通过 `require("mod_utils")` 获取。

### mod_utils.a_db_reset(t)

批量更新动画数据库。传入一个动画定义表，函数会将其合并/删除到全局动画数据库 `A.db` 中。

```lua
mod_utils.a_db_reset({
    -- 修改现有动画（合并）
    hero_idle = { fps = 12 },
    -- 删除动画
    hero_run = { removed = true },
    -- 图层展开（layerX 会被展开为 layer1, layer2, ...）
    effect_layerX = {
        layer_from = 1, layer_to = 3,
        layer_prefix = "effect_%d_",
        fps = 24, group = "effects"
    }
})
```

### mod_utils.apply_factor(t, k, factor [, is_int])

对表中某字段乘以 `factor`。若字段是数组则逐元素乘。`is_int` 为 `true` 时向上取整。

```lua
-- 将绿兵的血量 * 1.5
mod_utils.apply_factor(T("soldier_forest").health, "max", 1.5, true)
```

### mod_utils.mixed_apply_factor(t, k, factor)

对实体的所有近战攻击（`melee.attacks`）、远程攻击（`ranged.attacks`）、定时攻击（`timed_attacks.list`）的 `k` 字段统一乘以 `factor`。

```lua
-- 将所有攻击冷却时间减半
mod_utils.mixed_apply_factor(T("enemy_orc"), "cooldown", 0.5)
```

## 9. 示例：从零开发一个基础模组

本节通过一个完整的示例，带你由浅入深地了解模组开发的全流程。示例模组名为 `stronger_archers`，将逐步增强游戏中的弓箭手防御塔单位，演示模板修改、钩子使用、配置文件分离和新模板注册四个核心能力。

<div class="callout info">
<b>示例说明</b>：本示例使用的实体名称（如 <code>tower_archer_1</code>、<code>arrow_1</code>）仅供演示，实际开发时请替换为游戏中真实的模板名称。可通过查阅游戏数据文件确认正确的名称。对于 dove 版，可查阅 kr1 目录里面的 <code>game_templates.lua</code>, <code>archer_towers.lua</code>, <code>mage_towers.lua</code>, <code>engineer_towers.lua</code>, <code>barrack_towers.lua</code>, <code>enemies.lua</code>, <code>boss.lua</code>, <code>heroes.lua</code>。
</div>

### 第一步：创建最小骨架

一个合法的模组只需两个文件：`config.lua` 和与目录同名的入口文件。先把骨架搭起来，确认模组可以被系统识别和加载。

目录结构：

```tree
mods/local/
└── stronger_archers/
    ├── config.lua              ← 模组元信息
    └── stronger_archers.lua    ← 模组入口
```

#### config.lua

```lua
return {
    name         = "强化弓箭手",
    entry        = "stronger_archers"
    version      = "1.0.0",
    game_version = {"kr1"},
    desc         = "提升弓箭手的攻击力与射程。",
    url          = "",
    by           = "你的名字",
    category     = "tower"
    enabled      = true,
    priority     = 0,
}
```

#### stronger_archers.lua

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK
local hook = hook_utils:new()

function hook:init(mod_data)
    self.mod_data = mod_data
    -- 目前什么都不做，只验证加载流程正常
end

return hook
```

将上面两个文件放入 `mods/local/stronger_archers/`，启动游戏后若没有报错，则模组骨架已正常工作。

### 第二步：修改模板数据

游戏中所有单位、子弹、特效都以"模板"的形式存储在 `E`（entity_db）中。使用全局函数 `T("模板名")` 可以获取并直接修改任意模板的字段。

修改模板的代码必须在游戏数据加载完成后才能运行，否则模板尚不存在。标准做法是在 `init` 里注册一个 `E.load` 钩子，在钩子内部（调用原始 `load` 之后）执行修改逻辑。

#### stronger_archers.lua（修改后）

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK
local hook = hook_utils:new()

function hook:init(mod_data)
    self.mod_data = mod_data
    HOOK(E, "load", self.E.load)
end

-- E.load 钩子：在原始加载完成后修改模板
function hook.E.load(load, self)
    load(self)  -- 必须先调用原始加载

    local archer = T("tower_archer_1")
    if archer then
        -- 射程 + 50
        archer.attacks.range = archer.attacks.range + 50
    end
end

return hook
```

<div class="callout tip">
<b>技巧</b>：用 <code>if archer then ... end</code> 做保护判断是个好习惯。当模组跨版本运行时，某些模板可能并不存在，保护判断能防止加载时报错。
</div>

### 第三步：将数值提取到配置文件

把所有可调整的数值硬编码在入口文件里不便于维护。推荐将它们放在独立的 Lua 文件中，使用者只需修改配置文件而无需接触主逻辑。

新增 `config_archer.lua`：

```tree
stronger_archers/
├── config.lua
├── stronger_archers.lua
└── config_archer.lua          ← 新增：可调参数
```

#### config_archer.lua

```lua
return {
    range_bonus   = 50,    -- 射程加成
}
```

#### stronger_archers.lua（使用配置文件）

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK
local hook = hook_utils:new()

function hook:init(mod_data)
    self.mod_data = mod_data
    HOOK(E, "load", self.E.load)
end

function hook.E.load(load, self)
    load(self)

    -- 每次游戏加载时重新 require，确保热重载时配置也刷新
    package.loaded.config_archer = nil
    local cfg = require("config_archer")

    local archer = T("archer")
    if archer then
        archer.attacks.range = archer.attacks.range + cfg.range_bonus
    end
end

return hook
```

<div class="callout warn">
<b>注意</b>：在 <code>E.load</code> 钩子内 <code>require</code> 其他模块前，先将其从 <code>package.loaded</code> 中清除（置为 <code>nil</code>），可以确保每次调用都重新加载最新内容，避免游戏重载时使用到旧的缓存数据。
</div>

### 第四步：注册新模板

如果只修改现有模板字段，所有使用该模板的实体都会受到影响。当你只想让*部分*实体使用修改后的参数时，可以用 `E:register_t("新模板名", "父模板名")`（即全局 `RT`）注册一个派生模板，再把它分配给指定实体。

下面的例子将弓箭手的普通箭矢替换为一个伤害更高的新子弹模板：

#### stronger_archers.lua（注册新模板）

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK
local hook = hook_utils:new()

function hook:init(mod_data)
    self.mod_data = mod_data
    HOOK(E, "load", self.E.load)
end

function hook.E.load(load, self)
    load(self)

    package.loaded.config_archer = nil
    local cfg = require("config_archer")

    -- 注册一个派生自 arrow_archer 的新箭矢模板
    local tt = RT("__strongeer_archers__arrow_archer_enhanced", "arrow_1")
    tt.bullet.damage_min = math.ceil(tt.bullet.damage_min * cfg.damage_factor)
    tt.bullet.damage_max = math.ceil(tt.bullet.damage_max * cfg.damage_factor)

    -- 让弓箭手使用新的箭矢模板，并扩大射程
    local archer = T("tower_archer_1")
    if archer then
        archer.attacks.list[1].bullet = "__stronger_archers__arrow_archer_enhanced"
        archer.attacks.range = archer.attacks.range + cfg.range_bonus
    end
end

return hook
```

#### config_archer.lua（更新）

```lua
return {
    damage_factor = 1.5,   -- 箭矢伤害倍率
    range_bonus   = 50,    -- 射程加成（像素）
}
```

<div class="callout tip">
<b>为什么要用派生模板而不是直接改原模板？</b><br>
直接修改 <code>arrow_1</code> 会影响所有使用它的实体。注册派生模板后，只有明确指定了 <code>"__stronger_archers__arrow_archer_enhanced"</code> 的实体才会使用新行为，对其余实体无副作用。
</div>

<div class="callout tip">
<b>为什么派生模板要加一个<code>__插件名称__</code>的前缀？</b><br>
不同插件中可能意外定义了相同名称的模板，当他们同时加载时就会发生冲突。加上模组名称前缀后，就可以保证冲突不发生了。
</div>

### 第五步：添加说明

一份说明可以让玩家更好地理解你的插件在做什么事情。于是，我们可以创建 README.md，在里面添加详细的说明。

比如说，对于我们这个简单的示例而言，README.md 的内容可能为：

```markdown
# 强化弓箭手 (Stronger Archers)

一个简单的 **kr1** 模组，提升弓箭手防御塔的攻击力与射程。

## 效果

- 弓箭手射程 +50 像素
- 弓箭手箭矢伤害 ×1.5

## 安装

将 `stronger_archers/` 文件夹放入游戏的 `mods/local/` 目录，重启游戏即可生效。

## 配置

编辑 `config_archer.lua` 可调整数值：

| 参数 | 默认值 | 说明 |
|---|---|---|
| `range_bonus` | `50` | 射程加成（像素） |
| `damage_factor` | `1.5` | 箭矢伤害倍率 |

## 作者

你的名字 · v1.0.0
```

### 最终文件结构

```tree
mods/local/
└── stronger_archers/
    ├── config.lua                        ← 模组元信息（名称、版本、作者等）
    ├── stronger_archers.lua              ← 入口：注册钩子、组装逻辑
    ├── config_archer.lua                 ← 用户可调数值配置
    └── README.md                         ← 可选，说明文档
```

### 完整开发流程回顾

| 步骤 | 做了什么 | 涉及 API |
|---|---|---|
| 第一步 | 创建 config.lua + 空入口文件，验证加载流程 | `hook_utils:new()`, `hook:init()` |
| 第二步 | 注册 `E.load` 钩子，在数据加载后修改模板字段 | `HOOK(E, "load", ...)`, `T("...")` |
| 第三步 | 将数值提取到 config_archer.lua，在钩子内 require | `package.loaded[k] = nil`, `require(...)` |
| 第四步 | 注册派生模板，将其指定给具体实体，避免副作用 | `RT("新名", "父名")` |
| 第五步 | 编写 README.md，向玩家说明模组用途与参数配置 | — |
