# 热重载

早期版本的插件管理器，插件的一切修改都必须重启游戏才能生效。现在，支持热重载的插件可以在游戏运行中直接应用修改，无需重启。

插件是否支持热重载，取决于插件是否实现了对应的**可选接口**。点击插件管理器的「应用」按钮时，管理器会先检查本次所有修改能否热重载；只要有一项修改无法热重载（涉及到的插件缺少对应接口），就会整体回退为原来的「保存并重启」逻辑，保证修改一定生效。

## 接口一览

| 接口 | 必需 | 调用时机 | 说明 |
| ---- | ---- | -------- | ---- |
| `init(plugin_data)` | ✅ | 游戏启动 | 原有的启动加载入口 |
| `reload(plugin_data)` | ❌ | 热加载 | 游戏运行中，插件由「未启用」切换为「启用」并点击「应用」时调用。此时插件模块是全新加载的实例 |
| `unload(plugin_data)` | ❌ | 热卸载 | 游戏运行中，插件由「启用」切换为「未启用」并点击「应用」时调用。应撤销 `init` 中注册的一切钩子 |
| `on_config_change(plugin_data)` | ❌ | 配置热加载 | 插件配置（`<entry>_config.lua`）修改并点击「应用」时调用。此时新配置已写入磁盘，插件自行读取并应用 |

## 完整示例

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK
local UNHOOK = hook_utils.UNHOOK
local hook = hook_utils:new()

-- 必需：启动时加载
function hook:init(plugin_data)
	self.plugin_data = plugin_data
	HOOK(simulation, "do_tick", hook.simulation.do_tick)
end

-- 可选：热加载。模块是全新实例，通常直接复用 init 即可
function hook:reload(plugin_data)
	self:init(plugin_data)
end

-- 可选：热卸载。必须与 init 中注册的钩子成对撤销
function hook:unload(plugin_data)
	UNHOOK(simulation, "do_tick", hook.simulation.do_tick)
end

-- 可选：配置热加载。新配置已写盘，重新读取并应用即可
function hook:on_config_change(plugin_data)
	package.loaded[plugin_data.entry .. "." .. plugin_data.entry .. "_config"] = nil
	local config = require(plugin_data.entry .. "." .. plugin_data.entry .. "_config")
	-- ... 用新配置更新运行中的逻辑
end

function hook.simulation.do_tick(next, self, ...)
	-- 自定义逻辑
	next(self, ...)
end

return hook
```

## 插件管理器的行为约定

- **修改只在「应用」后生效**：插件开闭状态、插件配置的修改都会被记忆，点「应用」后才落盘并调用上述接口。没有点「应用」直接退出管理器时，会弹出确认框，可选择「应用」或「直接退出」。
- **配置延迟写盘**：在配置面板点「完成」只是记录修改，点「应用」才会真正写入 `<entry>_config.lua` 并触发 `on_config_change`。选择「直接退出」会丢弃未应用的配置修改。
- **可行性检查与回退**：点「应用」时先检查所有修改能否热重载，任何一项无法热重载（插件缺少 `reload` / `unload` / `on_config_change` 接口）都会回退为保存并重启。
- **总开关纳入热应用**：「插件管理器总开关」的变化视作对所有受影响插件的启用/禁用切换，同样参与热应用。
- **按最终状态去重**：同一插件多次切换开闭状态，只按最终状态处理（例如先开启、后关闭等于没有变化，不会先 `reload` 再 `unload`）。
- **部分失败不中断**：热应用过程中，某个插件的回调报错不会中断其余插件，错误会显示在管理器状态栏并写入日志。
- **应用成功后自动关闭**：全部应用成功后管理器自动关闭；存在失败时保持打开，便于查看错误提示。

## 编写建议

- `init` / `reload` / `unload` 应保持对称：`init` 注册了什么，`unload` 就要撤销什么（HOOK / UNHOOK 成对）。
- 插件模块在热加载时是**全新执行**的，因此 `reload` 可以直接复用 `init` 的逻辑。
- 插件通过 `require` 加载的子模块会留在缓存中，热加载不会自动清理；如需让子模块重新执行，请在 `reload` 中自行清除 `package.loaded`。
- `on_config_change` 触发时新配置已写盘，注意先清理配置模块的 `package.loaded` 缓存再读取，避免拿到旧值。
- 关卡类插件（`category = "level"`）即使实现了热重载，重启后才会出现在「自制关卡」列表中（列表在启动时扫描），属于预期行为。
