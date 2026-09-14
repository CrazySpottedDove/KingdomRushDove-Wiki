# Editing Templates

In Kingdom Rush Dove, towers, soldiers, enemies, projectiles, effects and other entities are all templates. Editing a template directly changes how that entity behaves in game.

This chapter explains how to edit templates from a plugin.

## Basics: changing numbers

First, the template directory layout of Kingdom Rush Dove:

- `all/templates.lua`: shared templates that are inherited in several places.
- `kr1/archer_towers.lua`: advanced archer towers.
- `kr1/engineer_towers.lua`: advanced artillery towers.
- `kr1/mage_towers.lua`: advanced mage towers.
- `kr1/barrack_towers.lua`: advanced barracks.
- `kr1/foundamental_towers.lua`: basic towers.
- `kr1/heroes.lua`: heroes.
- `kr1/enemy.lua`: enemies.
- `kr1/boss.lua`: bosses.
- `kr1/game_templates.lua`: the original Ironhide layout, where everything used to live. In Dove it holds logic-free effect templates, special entities exclusive to a level, and anything not yet moved to the files above.
- `kr1/hero_boss.lua`: friendly units that appear as enemies. For historical reasons this file was never meant to be long-lived, so it is hard to maintain and is on the refactor TODO list.

If you do not know how to write a template, read those files first to get a feel for the style.

From a plugin, the recommended way to edit templates is this:

### Add a template file

Create `templates.lua` inside your plugin directory for the plugin's own template definitions and edits.

For it to take effect, hook it into `entity_db:load()`:

```lua
-- Create the hook
function hook.E.load(next, self)
	next(self)
	require("${entry}.templates")

	-- Clear up
	package.loaded["${entry}.templates"] = nil
end

-- Inside hook:init()
do
	local E = require("entity_db")
	hook_utils.HOOK(E, "load", hook.E.load)
end
```

Note that Dove optimises script performance with its own compilation mechanism. If you do not use the standard form above, scripts defined by your plugin may skip compilation, which leads to hard-to-diagnose problems.

### Edit the template file

Every `.lua` file is an executable script; calling `require()` simply runs it. So all template edits can live in that file, which keeps the code well organised.

Here is a minimal example:

> I want to raise the Little Princess's attack power!

You may not know her code name, but you do know her name is Alleria. Open the `KingdomRushDove` folder in VS Code, press Ctrl+Shift+F and search for `艾莉瑞雅` (or `Alleria` in `en.lua`). You will find in `zh-Hans.lua`:

```lua
	HERO_ALLERIA_NAME = "艾莉瑞雅·迅风",
```

So her code name is `hero_alleria`. Search for `hero_alleria` and you will find her template in `heroes.lua`:

```lua
-- Alleria
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

The field names are fairly self-explanatory: `ranged_damage_max` is the maximum ranged attack damage. So in our `templates.lua` we can write:

```lua
-- Import the entity database
local E = require("entity_db")

-- Grab Alleria's template
local tt = E:get_template("hero_alleria")
tt.hero.level_stats.ranged_damage_max = {160, 190, 240, 270, 300, 360, 410, 470, 500, 550}
```

Now you have an absurdly strong Little Princess.

## Advanced: editing logic

If tweaking numbers is not enough, it is time to write logic scripts. In Kingdom Rush Dove an entity's behaviour is driven by scripts: every template can point at script functions through its `main_script` field, which drive the entity at runtime.

The script system loads in a chain:

- `all/scripts.lua` — base scripts, creates the `scripts` table
- `kr1/endless_scripts.lua` — endless mode scripts
- `kr1/hero_scripts.lua` — hero scripts
- `kr1/tower_scripts.lua` — tower scripts
- `kr1/boss_scripts.lua` — boss scripts
- `kr1/game_scripts.lua` — the master game script that merges all of the above

Each file gets the previous `scripts` table with `local scripts = require(...)` and keeps adding script functions to it. Template files require that table with `local scripts = require("game_scripts")` and attach functions with `tt.main_script.update = scripts.some_entity.update`.

### Add a logic script file

Create `scripts.lua` inside your plugin directory for the plugin's own script definitions, and load it from the hook as well.

```lua
-- ${entry}.lua
function hook.E.load(next, self)
	next(self)

	-- Load scripts first, then templates (templates reference the scripts)
	require("${entry}.scripts")
	require("${entry}.templates")

	-- Clear up
	package.loaded["${entry}.templates"] = nil
end

-- Inside hook:init()
do
	local E = require("entity_db")
	hook_utils.HOOK(E, "load", hook.E.load)
end
```

In the plugin's `scripts.lua`, get the game's existing `scripts` table with `require("game_scripts")` and modify it:

```lua
-- ${entry}/scripts.lua
local scripts = require("game_scripts")
-- Later edits apply directly to the global scripts table
-- ...
return scripts
```

- If your logic does not depend on `game_scripts` at all, prefer not requiring it and build your own table instead — less coupling!
- The concrete style is not covered here, but when appending to `game_scripts` we recommend prefixing new entries with `${entry}` to avoid clashes.
