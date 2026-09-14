# Hot Reload

In early versions of the plugin manager every change required a restart. Plugins that support hot reload can now apply their changes while the game is running, with no restart.

Whether a plugin supports hot reload depends on whether it implements the corresponding **optional interfaces**. When you click "Apply" in the plugin manager, it first checks whether all pending changes can be hot reloaded; if even one change cannot (the plugin involved lacks the interface), everything falls back to the original "save and restart" flow, so the changes are guaranteed to take effect.

## Interfaces

| Interface | Required | When it is called | Notes |
| ---- | ---- | -------- | ---- |
| `init(plugin_data)` | ✅ | Game startup | The original startup entry point |
| `reload(plugin_data)` | ❌ | Hot load | Called while the game runs, when a plugin goes from disabled to enabled and you click "Apply". The plugin module is a freshly loaded instance |
| `unload(plugin_data)` | ❌ | Hot unload | Called while the game runs, when a plugin goes from enabled to disabled and you click "Apply". It must undo everything registered in `init` |
| `on_config_change(new_config)` | ❌ | Hot config reload | Called when the plugin config (`<entry>_config.lua`) changes and you click "Apply". **The argument is the new config data** (already written to disk), so just apply it |

## Complete example

```lua
local hook_utils = require("hook_utils")
local HOOK = hook_utils.HOOK
local UNHOOK = hook_utils.UNHOOK
local hook = hook_utils:new()

-- Required: load at startup
function hook:init(plugin_data)
	self.plugin_data = plugin_data
	HOOK(simulation, "do_tick", hook.simulation.do_tick)
end

-- Optional: hot load. The module is a fresh instance, so reusing init is usually enough
function hook:reload(plugin_data)
	self:init(plugin_data)
end

-- Optional: hot unload. Must undo exactly the hooks registered in init
function hook:unload(plugin_data)
	UNHOOK(simulation, "do_tick", hook.simulation.do_tick)
end

-- Optional: hot config reload. The argument is the new config (already on disk)
function hook:on_config_change(new_config)
	self.config = new_config
	-- ... apply the new config to the running logic
end

function hook.simulation.do_tick(next, self, ...)
	-- custom logic
	next(self, ...)
end

return hook
```

## How the plugin manager behaves

- **Changes only take effect after "Apply"**: plugin enabled state and config edits are remembered and only written to disk (and passed to the interfaces above) when you click "Apply". If you leave the manager without applying, a confirmation dialog lets you "Apply" or "Exit without saving".
- **Config is written late**: clicking "Done" in the config panel only records the change; "Apply" writes `<entry>_config.lua` and triggers `on_config_change`. "Exit without saving" discards unapplied config changes. Merely opening the config panel without changing anything (or restoring the original values) produces no pending change, so closing the manager shows no prompt.
- **Feasibility check and fallback**: on "Apply" the manager checks that every change can be hot reloaded; any change that cannot (the plugin lacks `reload` / `unload` / `on_config_change`) falls back to save-and-restart.
- **The master switch joins hot apply**: toggling the plugin manager master switch counts as enabling/disabling every affected plugin and takes part in hot apply too.
- **Deduplicated by final state**: toggling a plugin several times only counts by its final state (enabling and then disabling means no change, so it will not `reload` and then `unload`).
- **Partial failures do not stop the rest**: if one plugin's callback errors during hot apply, the other plugins still run; the error appears in the manager status bar and in the log.
- **Updating or deleting a running plugin restarts directly**: the files have already been replaced or removed, and a hot unload cannot undo every side effect (such as template registration), so it cannot be applied safely; if a running plugin is involved when you click "Apply", the manager saves and restarts. Updating or deleting a plugin that is not running needs no restart (the new files are loaded the next time it is enabled).
- **The manager closes after a successful apply**: it stays open when something failed, so you can read the error.

## Authoring tips

- Keep `init` / `reload` / `unload` symmetric: whatever `init` registers, `unload` must undo (HOOK / UNHOOK in pairs).
- A plugin module is **executed from scratch** on hot load, so `reload` can reuse `init` directly.
- Submodules loaded through `require` stay in the cache; hot load does not clear them. Clear `package.loaded` yourself in `reload` if they must run again.
- The argument of `on_config_change` is the new config (already on disk), so apply it directly without re-reading the file; if you need the plugin metadata, use `self.plugin_data` saved in `init`.
- Level plugins (`category = "level"`) behave like any other plugin: after a hot apply they appear in the custom level list immediately, and they disappear immediately after a hot unload. No restart needed.
