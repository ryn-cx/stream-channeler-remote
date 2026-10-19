# Stream Channeler Remote

A companion UserScript for [Stream Channeler](https://streamchanneler.com) that automatically plays through episodes in a channel sequentially, detecting when each episode ends and advancing to the next one.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager.
2. Install [Stream Channeler Remote](https://ryn-cx.github.io/stream-channeler-remote/index.prod.user.js).

## Usage

1. Open [streamchanneler.com](https://streamchanneler.com) and click **Guide** in the top bar
2. Pick a program
3. Episodes will open, play, and advance automatically

Episodes play one after another in a single tab, and keep going after you close the channel page. Video pages are only touched when the script opened them, either from a custom channel or a pick in the guide. Those tabs get the overlay buttons, intro/credits skipping and end-of-episode handling, plus fullscreen and autoplay when the page loads, including after a reload. Tabs you open yourself are left alone, apart from the **Guide** button (see [Stream Channeler DVR](#stream-channeler-dvr)).

### Settings

Open your userscript manager's menu on any supported page and choose **Settings** to see what's playing, stop it, open the guide, and change the options below.

## Supported Sites

| Site        | Skip Credits | Play Credits | Skip Introduction | Profile Management | Note                                                                                                                                                                                                    |
| ----------- | ------------ | ------------ | ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adult Swim  | ✔            | ✅           | ❌                | ❌                 | Adult Swim will always play introductions and credits.                                                                                                                                                  |
| Amazon      | ✅           | ✅           | ✅                | ❌                 |                                                                                                                                                                                                         |
| Crunchyroll | ✅           | ✅           | ✅                | ❌                 |                                                                                                                                                                                                         |
| Disney+     | ✅           | ✔            | ✅                | ❌                 | Movies can play the main credits but secondary credits are skipped.                                                                                                                                     |
| HBO Max     | ✔            | ✅           | ✅                | ❌                 | HBO Max will always play credits for the last episode of a series or movies.                                                                                                                            |
| HiDive      | ✔            | ✅           | ❌                | ❌                 | HiDive will always play introductions and credits.                                                                                                                                                      |
| Hulu        | ✔            | ✅           | ✅                | ❌                 | Hulu will always play credits.                                                                                                                                                                          |
| Netflix     | ✔            | ✅           | ✅                | ✅                 | Netflix will always play credits for the last episode of a series or movies. Most websites will keep a profile loaded for multiple days, Netflix seems to keep a profile loaded only for a few minutes. |
| NHK World   | ✔            | ✅           | ❌                | ❌                 | NHK World will always play introductions and credits.                                                                                                                                                   |
| Paramount+  | ✔            | ✅           | ❌                | ❌                 | Paramount+ will always play introductions and most of the credits.                                                                                                                                      |
| Peacock     | ✅           | ✅           | ✅                | ❌                 |                                                                                                                                                                                                         |
| Pluto TV    | ✅           | ✔            | ✅                | ❌                 | Pluto TV will always skip the credits for the last episode of a series or movies.                                                                                                                       |
| Roku        | ✅           | ✅           | ✅                | ❌                 |                                                                                                                                                                                                         |
| Tubi        | ✅           | ✅           | ✅                | ❌                 |                                                                                                                                                                                                         |
| YouTube     | ✔            | ✔            | ✔                 | ❌                 | YouTube will always play introductions and credits.                                                                                                                                                     |

### Intros and credits

Intros and credits are skipped by default. To change this, uncheck **Skip intros** or **Skip credits** in **Settings**. The setting applies to every supported site.

### Netflix profile

If Netflix asks "Who's watching?", the script can pick your profile automatically. Enter the profile name and, if the profile is locked, its 4-digit PIN under **Netflix profile** in **Settings**.

### Custom channel

To play your own list of videos, paste their URLs, one per line, under **Custom channel** in **Settings** and click **Play custom channel**.

### Stream Channeler DVR

While a program plays, press **G** or click **Guide** to bring up the Stream Channeler guide over the video. Press **G** or **Esc** to hide it again. The **Guide** button also shows on video pages you open yourself, even when nothing is playing. To show it only while a program plays, uncheck **Always show guide button** in **Settings**. On any other supported page, including streamchanneler.com, choose **Open guide** from your userscript manager's menu.

The guide is built from the data Stream Channeler keeps in your browser, so it shows the channels you have opened on streamchanneler.com. Keep a streamchanneler.com tab open to keep it current; click **Refresh** in the guide to pick up the latest copy. Type in the search box to filter channels by name or number, and click **★ Favorites** to show only your favorite channels. The dropdown left of the search box picks the channel order: **Current sort** lists channels by number, and **Random** shuffles them (switching to **Random** again gives a new shuffle). Each channel starts with its first 20 episodes. Under a channel's name, click **More** to load the rest, or **Refresh** to reload that channel's episodes. While the guide is open, the video shrinks to the top right and the details of the program you hover over appear beside it.

Picking a program in the guide switches to Stream Channeler DVR, which plays programs from the guide's channels like a TV: when a program ends, the next program on the same channel plays in the same tab.
