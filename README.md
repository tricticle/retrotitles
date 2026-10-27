# retrotitles

Your titles, right where you left them.

retrotitles is a browser-based launcher for running personal game files and small web titles. Files are selected in the browser and are not uploaded by the launcher. Large files and multi-file titles can be streamed locally through a service worker when the page is served from HTTPS or localhost.

## Features

- Open a single file, a folder, or a ZIP/RAR archive; drag and drop a single title file.
- Run HTML/HTM, JavaScript canvas, and Python titles, plus SWF files through Ruffle.
- Run NES/FDS, SNES, Game Boy/Color/Advance, Nintendo 64, Sega Genesis/Mega Drive, Master System, Game Gear, Nintendo DS, Atari 2600, and PC Engine ROM extensions supported by the configured EmulatorJS cores.
- Stream large ROMs and multi-file ZIP/folder titles on demand, subject to browser and service-worker support.
- Add configurable touch controls, restart, use fullscreen, and export supported titles as a standalone HTML file.
- Save local file handles to a title library and reopen them after granting browser permission.
- Use browser gamepads and the embedded emulator menu for controller mapping and save states where supported by that core.
- Choose locally hosted emulator runtimes for offline playback after installing the runtime assets below.
- Keep title files local to the browser. Emulator runtimes and some player dependencies are loaded from third-party CDNs, so internet access may be required.

## Completed Goals

- [x] Make selecting the same file or folder again work without requiring an unrelated selection in between.
- [x] Give clear feedback when a drop contains multiple files instead of silently choosing one.
- [x] Document supported title types and the HTTPS/localhost requirement for streaming.
- [x] Add an IndexedDB title library that stores local file handles and requests permission when reopening.
- [x] Expose the embedded emulator's supported gamepad, controller-mapping, and save-state workflows.
- [x] Add an opt-in local-runtime mode for supported formats without relying on third-party runtime CDNs.

## Run Locally

Serve this directory from `localhost` to enable folder and large-file streaming. Opening `index.html` directly still allows supported single-file titles, but service-worker-backed features require a secure context.

## Offline Runtime Assets

The **Local runtimes** option expects these files under `runtime/`. The project does not redistribute emulator runtimes or cores; obtain them from their official upstream releases and follow their licenses.

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

Use JSZip 3.10.1, Ruffle 0.7.1, and Pyodide 0.26.4 to match the online defaults. EmulatorJS's stable data bundle is available from its [official releases](https://github.com/EmulatorJS/EmulatorJS/releases); it is large (about 300 MB) because it includes many cores. Copy the full `data/` directory, not just `loader.js`. Local runtime mode still requires `localhost` or HTTPS for service-worker streaming, and Python titles that import extra packages need those packages included in the local Pyodide distribution.
