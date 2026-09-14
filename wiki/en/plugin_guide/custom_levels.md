# Making Custom Level Maps

Custom levels in Dove are distributed as **map plugins**: package the map data as a plugin with `category = "level"` and the game shows it under "Custom Levels" in the level select screen, ready to play.

This chapter uses the community map plugin **demon_valley** as the example and walks through the complete structure of a map plugin. The example plugin lives in `plugins/demon_valley/` inside your save directory.

## Directory structure

```tree
demon_valley/
├── config.lua                        # plugin metadata (category = "level")
├── demon_valley.lua                  # plugin entry (keep it minimal)
├── README.md                         # map description (shown in the manager detail page)
├── cover.png                         # store cover (optional)
├── assets/images/                    # textures shipped with the plugin
│   ├── demon_valley_bg.dds
│   ├── demon_valley_bg.astc
│   └── go_demon_valley.lua           # texture group description file
└── data/
    ├── levels/
    │   ├── demon_valley.lua          # level script (init / update)
    │   ├── demon_valley_data.lua     # level data (entities, terrain, rules)
    │   ├── demon_valley_metadata.lua # level metadata (thumbnail, music, category)
    │   ├── demon_valley_grid.lua     # build grid
    │   └── demon_valley_paths.lua    # enemy paths
    ├── waves/
    │   ├── demon_valley_waves_campaign.lua  # campaign waves (required)
    │   ├── demon_valley_waves_heroic.lua    # heroic waves (optional)
    │   └── demon_valley_waves_iron.lua      # iron waves (optional)
    └── waveconfigs/
        ├── demon_valley_waves_campaign_config.lua
        ├── demon_valley_waves_heroic_config.lua
        └── demon_valley_waves_iron_config.lua
```

## 1. Plugin metadata: config.lua

```lua
return {
	name = "Demon Valley",
	entry = "demon_valley", -- unique id, also the map code name
	version = "1.3",
	desc = "General! Our scouts report that a remnant of Vez'nan's forces is massing in Demon Valley...",
	url = "",
	by = "ShiJianDiDa",
	category = "level", -- level plugin; the custom level list identifies maps by this
	enabled = true,     -- must be enabled to be scanned
	priority = 0,
}
```

Key points:

- `category` must be `"level"`, otherwise the map never shows up under "Custom Levels".
- The custom level list reflects the plugins **loaded at runtime**: with hot reload interfaces, clicking "Apply" makes the map appear (and a hot unload removes it) immediately; plugins without those interfaces need a restart.

## 2. Plugin entry: demon_valley.lua

Map plugins need almost no hooks, so the entry file stays minimal (all map logic lives in the level script). To support hot load / hot unload (appearing in or disappearing from "Custom Levels" right after "Apply"), the entry provides `reload` and `unload` (the same template the in-game map editor generates for "Create plugin map"):

```lua
local hook = require("hook_utils"):new()

function hook:init(plugin_data)
	self.plugin_data = plugin_data
end

-- Hot load: the module is a fresh instance, so reusing init is enough
hook.reload = hook.init

-- Hot unload: a map plugin has no hooks to undo, so an empty body is fine
function hook:unload(plugin_data)
end

return hook
```

## 3. Level script: data/levels/demon_valley.lua

The level script defines `init` and `update`:

- `level:init(store)`: called while the level loads. Use it for map-specific tweaks - Demon Valley buffs the demon enemies here - or to insert custom entities. Note that template edits only affect the current match (the entity database is reloaded every time a level is entered).
- `level:update(store)`: the standard coroutine loop - insert the selected hero, then wait until every wave is finished and all enemies are gone.

```lua
local LU = require("level_utils")
local level = {}

function level:init(store)
	local E = require("entity_db")

	-- Example: buff this map's enemies (Demon Valley actually changes many more)
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

## 4. Level data: demon_valley_data.lua

```lua
-- (excerpt; see the plugin for the full file)
return {
	entities_list = {
		-- tower spot: template is the holder style, pos is a world coordinate
		{ pos = v(713, 195), template = "tower_holder_wasteland",
		  ["tower.default_rally_pos"] = v(801, 255), ["tower.holder_id"] = "170",
		  ["tower.terrain_style"] = "tower_holder_wasteland", ["ui.nav_mesh_id"] = "170" },
		-- spawn point: path_id links it to a path number
		{ pos = v(-85, 608), template = "editor_wave_flag", ["editor.path_id"] = 1, ["editor.r"] = 3.14, ["editor.len"] = 180 },
		-- defence point (enemy exit)
		{ pos = v(1120, 499), template = "decal_defend_point", ["editor.exit_id"] = 1 },
		-- background: render.sprites[1].name points at a sprite in the plugin texture group
		{ pos = v(512, 384), template = "decal_background",
		  ["render.sprites[1].name"] = "demon_valley_bg", ["render.sprites[1].z"] = 1000 },
	},
	invalid_path_ranges = {},
	level_mode_overrides = {
		{},
		{},
		{ locked_towers = { "tower_build_barrack" } }, -- iron mode locks the barracks
	},
	level_terrain_style = "tower_holder_wasteland",
	locked_hero = false,
	max_upgrade_level = 6,
	nav_mesh = {
		[160] = {}, [162] = {}, -- tower navigation mesh (generated by the map editor)
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

Main fields:

| Field | Description |
| ---- | ---- |
| `entities_list` | Level entities: tower spots (`tower_holder_*`), spawn points (`editor_wave_flag`), defence points (`decal_defend_point`), flags (`decal_defense_flag`), background (`decal_background`) and more. Every entity is a `template` + `pos` plus dotted override properties |
| `level_terrain_style` | Holder style, e.g. `tower_holder_wasteland`, `tower_holder_grass` |
| `max_upgrade_level` | Tech level cap (6 in Demon Valley) |
| `locked_hero` | Whether heroes are disabled |
| `level_mode_overrides` | Per-mode overrides: `[2]` heroic, `[3]` iron; iron mode can lock towers with `locked_towers` |
| `nav_mesh` | Tower navigation mesh (generated by the map editor) |
| `required_textures` / `required_sounds` | Base-game resource groups the map uses (enemy atlases, stages, music...) |
| `plugin_required_textures` | Registers texture groups shipped with the plugin: `group = { path = "<entry>/assets/images", use_bytecode = false }` |
| `plugin_required_sounds` | Registers sound groups shipped with the plugin |

## 5. Level metadata: demon_valley_metadata.lua

```lua
return {
	thumbnail_sprite = nil,                    -- thumbnail: base-game sprite name (or use thumbnail)
	thumbnail = "assets/images/demon_valley_bg.dds", -- thumbnail: file path inside the plugin (relative to its root)
	battle_music = "MusicBattle_20",           -- battle music
	battle_prep_music = "MusicBattlePrep_20",  -- preparation music
	category = "normal",                       -- normal / challenge / creative
}
```

The thumbnail is shown on the custom level card and in the level select screen; `.dds`, `.astc`, `.png` and `.jpg` are supported.

## 6. Build grid and enemy paths

- `demon_valley_grid.lua`: the build grid (terrain value matrix + origin) that decides where towers may be built.
- `demon_valley_paths.lua`: the enemy route (bezier curves + connections), made of `connections` / `curves` / `paths` / `active`.

Both files are meant to be produced by the **in-game map editor** (main menu → options panel → "Map Editor") rather than written by hand.

## 7. Waves and wave configs

- `data/waves/<entry>_waves_campaign.lua`: the actual spawn data read at runtime. The `campaign` file is **required** - the custom level list needs it. The `heroic` / `iron` files are optional; when present the level select screen shows the matching mode tab.
- `data/waveconfigs/<entry>_waves_<mode>_config.lua`: wave planning data used by the map editor's wave tool to generate the concrete spawn files.

```lua
-- data/waves/demon_valley_waves_campaign.lua (excerpt)
return {
	cash = 1000, -- starting gold
	groups = {
		{
			interval = 990, -- frames between this group and the next
			waves = {
				{
					delay = 0,          -- delay inside the group (frames)
					path_index = 1,     -- path number
					spawns = {
						{
							creep = "enemy_demon", -- enemy template name
							max = 6,              -- count
							interval = 43,        -- frames between spawns
							interval_next = 15,   -- frames after this spawn finishes
							path = 1,
							fixed_sub_path = 0,   -- sub path, 0 means random
						},
					},
				},
			},
		},
	},
}
```

## 8. Textures

Map backgrounds and other private images go into `assets/images/` (`.dds` / `.astc` recommended) and are described by a texture group file:

```lua
-- assets/images/go_demon_valley.lua
return {
	demon_valley_bg = {
		a_name = "demon_valley_bg.dds", -- atlas file name
		size = { 1920, 1080 },
		trim = { 0, 0, 0, 0 },
		a_size = { 1920, 1080 },
		f_quad = { 0, 0, 1920, 1080 },
		alias = {},
	},
}
```

Then register that group in `plugin_required_textures` of the level data (see section 4) and point the background entity at it with `["render.sprites[1].name"] = "demon_valley_bg"`.

## 9. Workflow summary

1. Main menu → options panel → open "Map Editor" and use "Create plugin map" with an entry to generate the skeleton (all of the files above with minimal content).
2. Draw in the map editor: build grid, enemy paths, tower spots / spawn points / defence points / background, and edit waves.
3. Save: the editor writes the level data straight into the plugin directory under `plugins/<entry>/`.
4. In the plugin manager, make sure the plugin is enabled (`category = "level"` puts it under the "Levels" category), then click "Apply" - the map appears under "Custom Levels" and is playable (restart the game if the plugin has no hot reload interfaces).
5. To share it: enable developer mode (create `developer.lua` in your save directory with your account and password) and click "Upload" on your plugin in the plugin manager; other players can then download it from the "Levels" category of the plugin store.

## Notes

- Custom level progress (stars) is stored separately, so deleting a map plugin never affects your main save.
- When the map plugin implements the hot reload interfaces, clicking "Apply" makes it appear in "Custom Levels" instantly (and removing it takes it away instantly); without them, installing or enabling requires a game restart.
- If the map script edits templates, those edits only affect the current match and do not change the game permanently.
