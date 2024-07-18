# Ohun

![Ohun](https://i.postimg.cc/CLHcqxBZ/icon-192.png)

## _A synced lyrics provider for Linux_

Get synchronized song lyrics and sing along with your favorite songs.
Built with [Tauri](https://tauri.app/) and [Sveltekit](https://kit.svelte.dev/).

- Play a song
- See the lyrics live!
- ✨Magic ✨

## Features

- Export and copy LRC files
- Manually control your music from the app
- Lightweight and memory friendly
- Saves lyrics offline
- Works with most music players and even browsers!

There are very few sing along lyrics providers for Linux out there, Ohun attempts to solve this problem by providing a very lightweight and easy to use app
If you find it useful, you can [Donate](https://buymeacoffee.com/n3rdyn3rd) to the cause

## Tech

Ohun uses a number of open source projects to work properly:

- [Playerctl](https://github.com/altdesktop/playerctl) - Playerctl is a command-line utility and library for controlling media players that implement the [MPRIS](http://specifications.freedesktop.org/mpris-spec/latest/) D-Bus Interface Specification.
- [Tauri](https://tauri.app/) - Build an optimized, secure, and frontend-independent application for multi-platform deployment.
- [Sveltekit](https://kit.svelte.dev/) web development, streamlined
- [Paroles](https://github.com/Clarkkkk/paroles) Library for parsing, making, modifying and "playing" LRC format lyrics
- [Lockr](https://github.com/tsironis/lockr) A minimal API wrapper for localStorage. Simple as your high-school locker.

And of course Ohub itself is open source with a [repository](https://github.com/n3-rd/ohun) on GitHub.

## Installation

Ohun requires [Playerctl](https://github.com/altdesktop/playerctl) to run.

You can install Playerctl with

```
sudo apt install playerctl
```

or anyway your preference or distro dictates

Download any release you want here [https://github.com/n3-rd/ohun/releases](https://github.com/n3-rd/ohun/releases)

## Development

Want to contribute? Great!

Ohun uses NodeJS + Rust for fast developing.
Make a change in your file and instantaneously see your updates!

1.  Clone this repository
2.  Navigate to the folder and run `npm install` or `yarn install` or `pnpm install`
3.  Run development server with `npm run tauri dev` or `yarn tauri dev` or `pnpm tauri dev`
4.  Make changes and build with `npm run tauri build` or `yarn tauri build` or `pnpm tauri build`

## Roadmap for Ohun

The main roadmap still prioritises cross-platform compatibility, especially with Windows. The biggest problem plaguing the compatibility is the fact that not many tools exist for getting media metadata from Windows and Mac. Ohun for Linux uses playerctl to get metadata for the currently playing media, but it only works on Linux, a few workarounds exist, some very crude and not healthy for this project.
I currently do not have a lot of time to work on this project as I am on a tight schedule but will do my best to achieve cross-compatibility in the near future.

- **Cross compatibility**
- Improvement in UI (some elements don't just behave...... right)
- Better offline support (caching images for offline use)
- Better error handling
- Fix "Always on top" (Minor Tauri Bug)
- Embed playerctl in the Linux binary as a sidecar so the user does not need to install it manually.

## License

MIT

**Free Software, Hell Yeah!**

## Conditions for use

Don't do drugs
