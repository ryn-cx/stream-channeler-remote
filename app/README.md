# Stream Channeler Remote (TV app)

An Android TV, Google TV and Fire TV app that runs the Stream Channeler Remote userscript inside [GeckoView](https://mozilla.github.io/geckoview/), Firefox's engine. Pages load in desktop mode, and the remote's D-pad drives an on-screen mouse cursor.

## Build

You need the Android SDK, JDK 17 or newer, and Node. On Windows, run:

```powershell
.\compile.ps1          # release APKs
.\compile.ps1 debug    # debug APKs
```

It installs the userscript's dependencies if needed, uses the SDK from `ANDROID_HOME`, `local.properties` or the default `%LOCALAPPDATA%\Android\Sdk`, and prints the paths of the APKs it built. Elsewhere, run `npm install` in the repository root and then `./gradlew assembleRelease` here.

This rebuilds the userscript (`npm run build`), wraps it in the small built-in extension in [extension](extension), and writes one APK per CPU type to `build/outputs/apk/release/`:

| APK | Devices |
| --- | --- |
| `*-armeabi-v7a-release.apk` | Most Fire TV sticks, and older Android TV boxes running 32-bit Android |
| `*-arm64-v8a-release.apk` | Recent Google TV and Android TV devices |
| `*-x86_64-release.apk` | The Android emulator |

If you're unsure which one a device needs, run `adb shell getprop ro.product.cpu.abi`.

Without a signing key, release builds are signed with the debug key. To sign with your own key, set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. Android won't update an installed app in place if its signature changes.

## How the userscript runs

GeckoView can't install a userscript manager, so the app ships a minimal built-in extension instead. Its content script runs the userscript in every frame of the pages its `@match` lines list (read from the built userscript at build time), which is every site. It also provides the `GM_*` functions it uses: values live in extension storage, `GM_xmlhttpRequest` goes through the background script, and menu commands are kept so the remote's Menu button can run **Settings**. The add-to-channel tools are turned off in the app.

## Install

1. Turn on developer options and ADB debugging on the TV.
2. Run `adb connect <tv-ip>`.
3. Run `adb install -r build/outputs/apk/release/<apk>`.

The app shows up on the home screen as **Stream Channeler Remote**.

## Remote controls

| Button | Action |
| --- | --- |
| D-pad | Move the cursor. It speeds up while held. Pushing against an edge scrolls the page. |
| Select | Click. Holding Select while moving drags. |
| Back | Close the settings panel, close the guide (if it was opened with the Guide button), go back a page, or close a tab that the userscript opened. |
| Menu, or long-press Back | Open or close the settings panel, the same as choosing **Settings** from a userscript manager's menu. |
| Guide | Toggle the Stream Channeler guide, the same as pressing **G**. |
| Play/Pause, Fast Forward, Rewind | Control the playing video. |

## Debugging

Debug builds turn on Gecko remote debugging. Forward the socket with:

```sh
adb forward tcp:6000 localabstract:com.streamchanneler.remote/firefox-debugger-socket
```

Then connect from desktop Firefox at `about:debugging`. To open any URL in the app, run:

```sh
adb shell am start -a android.intent.action.VIEW -d <url> -n com.streamchanneler.remote/.MainActivity
```
