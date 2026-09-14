# Developer Mode

Create `developer.lua` in your save directory and put this inside:

```lua
return {
	account = "your username",
	password = "your password",
}
```

That activates developer mode for the plugin manager.

Now open the game: the local plugin view can be filtered down to the plugins you developed. Those plugin cards get an upload button - click it to upload the plugin directly. Upload rules:

1. If the plugin root contains `cover.*`, you will be asked whether to upload the cover image.
2. `.git/`, `.backup/`, `cover.*` and `.tmp/` in the plugin root are excluded from the package so it does not bloat.

Uploading through the plugin manager gives you incremental updates, so you avoid re-uploading huge art assets.
