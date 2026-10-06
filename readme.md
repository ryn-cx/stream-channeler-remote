# Stream Channeler Remote

A companion UserScript for [Stream Channeler](https://streamchanneler.com) that automatically plays through episodes in a channel sequentially, detecting when each episode ends and advancing to the next one.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager.
2. Install [Stream Channeler Remote](https://ryn-cx.github.io/stream-channeler-remote/index.prod.user.js).

## Usage

1. Open a channel on [streamchanneler.com](https://streamchanneler.com)
2. Click **Start Remote**
3. Episodes will open, play, and advance automatically

### Netflix profile

If Netflix asks "Who's watching?", the script can pick your profile automatically. On any Netflix page, open your userscript manager's menu, choose **Set Netflix profile**, and enter the profile name and, if the profile is locked, its 4-digit PIN.

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
