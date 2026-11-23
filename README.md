# retrotitles

Your titles, right where you left them.

retrotitles is a browser-based launcher for running personal title files and small web titles. Files are selected in the browser and are not uploaded by the launcher. Large files and multi-file titles can be streamed locally through a service worker when the page is served from HTTPS or localhost.

## Features

- Open a single file, a folder, or a ZIP/RAR archive; drag and drop a single title file.
- Run HTML/HTM, JavaScript canvas, and Python titles, plus SWF files through Ruffle. Stream RPG Maker MV/MZ browser exports from their project folder or ZIP, including compatible `www/` exports inside some desktop installs. Stream Unity WebGL and Unreal Engine browser builds from a folder or ZIP; native desktop/console builds are not supported.
- Run systems in the EmulatorJS 4.2.3 bundle: NES, SNES, Game Boy, GBA, N64, DS, Sega consoles, Atari 2600/5200/7800, PlayStation, PSP, Saturn, 3DO, Jaguar, PC Engine, WonderSwan, Neo Geo Pocket, ColecoVision, Amiga, Commodore, DOS, ZX Spectrum/ZX81, Amstrad CPC, CD-i, and arcade/MAME cores.
- Select a system manually for ambiguous formats such as `.bin`, `.cue`, `.iso`, `.chd`, and arcade `.zip` files; automatic extension detection is best-effort.
- Stream large ROMs and multi-file ZIP/folder titles on demand, subject to browser and service-worker support. Unity and Unreal browser builds use streaming so their separate and compressed assets can load correctly.
- Check RPG Maker MV/MZ browser exports for their required start page, system data, core script, and referenced scripts before streaming. Large ROMs and web builds are streamed when supported, without an app-imposed file-size confirmation; actual playback remains subject to browser, device, storage, and game-runtime capabilities.
- Add configurable touch controls, restart, use fullscreen, and export supported titles as a standalone HTML file.
- Use EmulatorJS's built-in keyboard, gamepad, and touch controls for emulated systems; other titles can show on-screen controls on touch devices. Configure launcher keyboard mappings by system or game in Controls; EmulatorJS gamepad remapping remains in its in-game menu.
- Keep files added from the picker, folders, ZIP/RAR archives, file handles, and drag-and-drop in one IndexedDB-backed file manager. Archive contents join the same path-based list, duplicate paths are de-duplicated, and folders stay collapsed until opened (or expanded by search).
- Navigate Library, Files, Play, and Controls from the tab bar. Settings open separately with grouped General, Emulation, Controls, Display / Upscaling, Storage, Advanced, and Danger Zone sections.
- Open Game settings from Play to adjust supported EmulatorJS shader, VSync, FPS, renderer, audio, and touch controls during a session; renderer changes require a restart. Standard media audio is adjustable for other titles, while some web titles manage their own sound.
- Reopen supported titles, download stored files, search and filter the unified list, rebuild its index, or delete selected files in Files. Danger Zone can clear runtime cache or, after confirmation, delete all RetroTitles browser data including indexed files, handles, saves, settings, and EmulatorJS caches. Files on the user's computer and deployed runtime assets are not deleted.
- Persist EmulatorJS shader defaults and per-system shader overrides. Shader choices load from EmulatorJS at runtime when available, with a custom-key fallback; VSync, FPS overlay, WebGL2, upscaling filter, display size, aspect ratio, and pause/mute-on-hide preferences are passed to supported player sessions. Integer scaling and aspect-ratio controls use browser canvas scaling and may differ by emulator core.
- Use browser gamepads and the embedded emulator menu for controller mapping and save states where supported by that core. The launcher lists browser-stored EmulatorJS states and can save, load, import, download, or remove them. Browser storage can be cleared; download important saves as backups.
- Keep the page structure and styles in `index.html` and `launcher.css`. Launcher behavior is split across `launcher.js`, `compatibility.js`, and `save-manager.js`; bundled runtime/vendor code remains separate.
- Use the full locally hosted emulator runtimes for offline playback; this workspace has the EmulatorJS 4.2.3, Ruffle 0.7.1, Pyodide 0.26.4, and JSZip 3.10.1 assets installed under the ignored `runtime/` directory.
- Keep title files local to the browser. Emulator runtimes and some player dependencies are loaded from third-party CDNs, so internet access may be required.

## Completed Goals

- [x] Make selecting the same file or folder again work without requiring an unrelated selection in between.
- [x] Give clear feedback when a drop contains multiple files instead of silently choosing one.
- [x] Document supported title types and the HTTPS/localhost requirement for streaming.
- [x] Add an IndexedDB title library that stores local file handles and requests permission when reopening.
- [x] Expose the embedded emulator's supported gamepad, controller-mapping, and save-state workflows.
- [x] Add an opt-in local-runtime mode for supported formats without relying on third-party runtime CDNs.

## Run Locally

Serve this directory from `localhost` to enable folder and large-file streaming. PSP and DOS cores that require threads need cross-origin isolation; `_headers` configures COOP/COEP, and runtime resources include a cross-origin resource policy for Cloudflare Pages/Workers deployments. Opening `index.html` directly does not provide these headers. The launcher warns and offers a copyable diagnostic if a thread-requiring system is selected without isolation.

Systems that need firmware are checked before launch. Place the expected BIOS in `runtime/bios/<system>/`: `psx/scph5501.bin`, `segaCD/bios_CD_U.bin`, `segaSaturn/sega_101.bin`, or `3do/panafz10.bin`. The launcher reports the expected filename when it is missing. BIOS files remain local and should only be obtained from sources you are authorized to use.

## Deploy to Cloudflare Workers

Use the repository root as the static assets directory. The root `.assetsignore` excludes Git metadata and Wrangler's local state while keeping `runtime/` available to the deployed site. Cloudflare limits each uploaded static asset to 25 MiB.

## Offline Runtime Assets

The **Local runtimes** option loads these assets from `runtime/`. Runtime assets are ignored by Git and are not part of a source checkout. Obtain them from official upstream releases and follow their licenses.

```text
runtime/
	jszip.min.js
	ruffle/
		ruffle.js
		(the remaining files from the Ruffle web distribution)
	pyodide/
		pyodide.js
		(the complete Pyodide distribution, including its WASM and package files)
	emulatorjs/
		data/
			loader.js
			emulator.min.js
			emulator.min.css
			src/
			cores/
```

Use JSZip 3.10.1, Ruffle 0.7.1, and Pyodide 0.26.4 to match the online defaults. EmulatorJS 4.2.3 is available from its [official releases](https://github.com/EmulatorJS/EmulatorJS/releases); the archive is about 300 MB and expands to roughly 296 MB because it includes many cores. Copy the full `data/` directory, not just `loader.js`. Local runtime mode still requires `localhost` or HTTPS for service-worker streaming, and Python titles that import extra packages need those packages included in the local Pyodide distribution.

Large ROMs are streamed to the emulator in ranges, but each core may still load the game into memory. The file manager stores local copies in IndexedDB and archive extraction may still require substantial temporary memory (especially RAR). Browser capabilities, device memory, available storage, core, format, and BIOS availability can affect playback; no browser emulator can guarantee support for every game or arbitrary file size. Steam desktop executables and RGSS builds cannot be launched in the browser. Some RPG Maker MV/MZ installs include a separate browser-compatible `www/` project; selecting the install folder or archive will use that export when it contains the required files and scripts.

Browser graphics options are emulator shaders, not AMD FSR or native graphics drivers. Native DLL injection and hardware frame-generation APIs are not available to content running in an iframe. True support for these requires a native game/runtime and compatible hardware.
