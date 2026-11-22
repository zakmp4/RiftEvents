# Rift Events

Website for Rift Events, a scripted Minecraft SMP. It's plain HTML, CSS and JavaScript: no build step, no framework, no database. It's hosted on **GitHub Pages** at **https://store.riftevents.net**.

- **Server IP:** riftevents.net
- **Discord:** https://discord.riftevents.net

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, news/announcements, sidebar, what makes it scripted |
| `client/index.html` | Rift Client download page (`store.riftevents.net/client`) |
| `client/latest.yml` | Rift Client update manifest. The launcher reads it to find updates, and the download button reads it too. |
| `rules.html` | Rules, punishment policy, privacy policy |
| `support.html` | FAQ, ban appeals, Discord contact routes |
| `CNAME` | Tells GitHub Pages to serve the site on `store.riftevents.net` |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is |

## Hosting on GitHub Pages (one-time setup)

1. **Make the repository public.** GitHub Pages and public release downloads need it on a free account. In the repo, go to **Settings → General → Danger Zone → Change visibility**.
2. **Turn on Pages.** Go to **Settings → Pages**. Under *Build and deployment* pick **Deploy from a branch**, then **main** and **/ (root)**, and click Save.
3. **Custom domain.** Still in Settings → Pages, `store.riftevents.net` should already be filled in from the `CNAME` file. Once the DNS change below has gone through, tick **Enforce HTTPS**.
4. **DNS.** Where riftevents.net's DNS is managed, add this record:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `store` | `zakmp4.github.io` |

   Don't touch the records for `riftevents.net` itself; that's the Minecraft server.
5. **Shut down the old Render services** (the static site and the API) and the MongoDB Atlas cluster. The site doesn't use them any more.

After that, every push to `main` updates the live site within a minute or two.

## Releasing a Rift Client update

The installer is about 100 MB, which is over GitHub's file limit for a website repo, so it goes on a **GitHub Release** in this repo. The website only hosts the small `client/latest.yml`, which points at it. From the Rift Client launcher folder:

```powershell
$env:GH_TOKEN = "<a GitHub token with repo access>"
npm run release
```

That builds the installer, uploads it to a new release (`v<version>`) here, and writes `client/latest.yml` into this folder. Commit and push this repo, and every installed launcher picks up the update within the hour.

## Editing content

- **Colours, spacing, fonts:** all the design tokens are at the top of `css/style.css` in the `:root` block.
- **Server IP:** search for `riftevents.net` and replace it.
- **News posts:** plain HTML in `index.html` under the "NEWS + SIDEBAR" comment. Copy the commented-out `<article class="card article">` block and edit it.
- **Rules:** plain HTML in `rules.html`. Each rule is one `<article class="card rule">`. If you add one, add a matching link in the `.toc` nav.
- **Discord link:** search for `discord.riftevents.net`.

## Previewing locally

```bash
node .claude/serve.js
```

Then open http://localhost:5173/index.html. That little server doesn't map folders to `index.html`, so open `/client/index.html` directly. GitHub Pages does map them.
