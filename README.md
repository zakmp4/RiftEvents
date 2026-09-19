# Rift Events

Website for Rift Events, a scripted Minecraft SMP — plain HTML, CSS and JavaScript. No build
step, no framework, no npm install. Open the files and they work.

- **Server IP:** riftevents.net (Java Edition 1.21.11)
- **Discord:** https://discord.riftevents.net

## Pages

| File | What it is |
|---|---|
| `index.html` | Home — hero, news/announcements, sidebar, season schedule |
| `characters.html` | The cast and crew, searchable and filterable by rank |
| `rules.html` | Rules, punishment policy, privacy policy |
| `support.html` | FAQ, ban appeals, Discord contact routes |
| `admin.html` | **Hidden.** Not linked anywhere — reach it by typing `/admin.html` |
| `server/` | The optional API + MongoDB backend. Not needed unless you follow the setup below. |

## Admin panel

Go to `yoursite.com/admin.html` and enter the password:

```
hda9dahdas08d
```

From there you can add, edit and delete people. Anyone you add shows up on the Characters
page immediately. You can also export the roster to JSON, import it back, or clear it out.

The roster starts **empty** — there are no example people to delete first.

The login lasts until you close the tab.

### Changing the password

The password isn't stored as plain text — `js/admin.js` holds its SHA-256 hash. To change it,
generate a new hash and replace the `PASS_HASH` value at the top of that file:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_NEW_PASSWORD').digest('hex'))"
```

### How safe is this?

As it ships: it keeps casual visitors out, and that's it. The check runs in the browser, so
anyone who opens devtools can see how it works and skip past it. The worst case is someone
editing a list of names in their own browser, which changes nothing for anyone else.

Once you follow the full setup below, this stops being true in the way that matters — the
server checks the password on every write, so bypassing the browser gate gets you nowhere.

## Where the data lives

Right now everyone you add is saved in **that browser's localStorage**. Two consequences:

- It survives refreshes and closing the browser.
- It does **not** sync. If you add someone on your PC, a visitor on their phone won't see them.

For a site that's just yours, that's often enough. To make it shared, follow the setup below.

## Connecting a real database

Follow **[SETUP.md](SETUP.md)** — it's a click-by-click walkthrough of GitHub, MongoDB Atlas
and Render, written to be followed without knowing any of them already. About 30 minutes,
all free tiers.

The short version of what it does:

1. Your files go on GitHub.
2. MongoDB Atlas holds the roster.
3. The API in `server/` goes on Render as a **Web Service** (root directory `server`).
4. You paste the API's URL into `API_BASE` in `js/data.js` — the only line that changes.
5. The website goes on Render as a **Static Site** (publish directory `.`).
6. You set `ALLOWED_ORIGIN` on the API to your site's URL.

After that, reads are public but every write must carry the admin password in an
`x-admin-password` header that the server checks — so the browser gate stops being the only
thing protecting your data.

## The logo

`assets/logo.webp` is your real logo and is what every page uses. `assets/logo.svg` is a
hand-drawn stand-in kept only as a fallback — if the webp ever fails to load, the SVG renders
instead. To swap the logo, replace `logo.webp` and nothing else changes.

## Editing content

- **Colours, spacing, fonts** — all the design tokens are at the top of `css/style.css` in the
  `:root` block. Change `--sky` and `--bg` to reskin the whole site.
- **Server IP** — search for `riftevents.net` and replace it. It appears in the nav, the
  hero, the sidebar, the footer and the support FAQ. The Minecraft version (`1.21.11`) sits in
  the hero, the sidebar IP card, the footer and one support FAQ.
- **News posts** — plain HTML in `index.html` under the "NEWS + SIDEBAR" comment. Copy an
  existing `<article class="card article">` block and edit it.
- **Rules** — plain HTML in `rules.html`. Each rule is one `<article class="card rule">`.
  If you add one, add a matching link in the `.toc` nav so the sidebar stays in sync.
- **Default cast** — the `SEED` array in `js/data.js`, used the first time someone visits.
- **Discord link** — search for `discord.riftevents.net`.

## Previewing locally

`.claude/` holds a dev-only static file server (not part of the site, safe to delete):

```bash
node .claude/serve.js
```

Then open http://localhost:5173.

Opening `index.html` directly from the file system also mostly works, but some browsers
restrict storage on `file://` URLs, so the admin panel is happier over a local server.

## Not included, on purpose

No login or register anywhere — visitors just browse. The Games, Forums, Leaderboards and
Store sections are deliberately absent; Characters took the Leaderboards slot in the nav.

There is no email address on the site — every contact route points at Discord. There are also
no live player-count or member-count figures anywhere, by design.
