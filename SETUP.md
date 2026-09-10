# Setup — step by step

This connects your website to a real database, so people you add in the admin panel show up
for **everyone**, not just on your own computer.

Everything here is free. Set aside about 30 minutes. Do the parts in order.

You do **not** need to write any code. The code is already in this folder.

---

## Before you start

Have these three things ready to paste. You'll collect them as you go:

| | What it is | Where you get it |
|---|---|---|
| A | Database link | Part 2 |
| B | Admin password | You already have it: `hda9dahdas08d` |
| C | Website address | Part 5 |

Keep a notepad open. You'll copy A in Part 2 and use it in Part 3.

---

# Part 1 — Put your files on GitHub

**What this does:** gives Render a copy of your website to publish.

Use **GitHub Desktop** for this. Don't use the website's upload page — it can't handle
folders properly, and this site has four of them.

1. Open **GitHub Desktop**. Sign in with your GitHub account if it asks.
2. Menu bar: **File → Add local repository...**
3. Click **Choose...**, select your `D:\RiftEvents` folder, then click **Select Folder**.
4. It will say *"This directory does not appear to be a Git repository."*
   That's expected. Click the blue **create a repository** link inside that message.
5. A dialog opens. Check these:
   - **Name:** `riftevents`
   - **Git ignore:** None ← leave it. This folder already has the right one.
   - **README:** leave unticked. There's already a README.
   
   Click **Create repository**.
6. The left panel now fills with a list of every file. That's your whole website.
7. Bottom left, in the **Summary** box, type: `Rift Events website`
8. Click the blue **Commit to main** button underneath it.
9. At the top of the window, click **Publish repository**.
10. In the dialog that opens:
    - **Name:** `riftevents`
    - **Keep this code private:** leave this **ticked**.
    - Click **Publish repository**.

✅ **Check:** go to **https://github.com** and open your `riftevents` repo. You should see
`index.html` plus the `css`, `js`, `assets` and `server` folders.

> **Why private?** Your admin password's fingerprint lives in `js/admin.js`. A private repo
> keeps it out of public view. Render can still deploy from private repos — when you connect
> it in Part 3 it will ask for permission, which is normal.

---

# Part 2 — Make the database

**What this does:** creates the place where your roster is actually stored.

1. Go to **https://www.mongodb.com/cloud/atlas/register** and sign up.
2. When it asks what you're building, skip or click through the questions.
3. It will offer to create a cluster. Choose the **M0 / Free** option. Click **Create**.
4. It now asks you to create a database user:
   - Username: `riftadmin`
   - Password: click **Autogenerate**, then **copy the password somewhere safe**.
     You cannot see it again later.
   - Click **Create Database User**.
5. In the left sidebar click **Network Access**.
6. Click **Add IP Address** → click **Allow Access from Anywhere** → **Confirm**.

   > This is required. Render's servers don't have a fixed address, so the database has to
   > accept connections from anywhere. Your password is what keeps it private.

7. In the left sidebar click **Clusters** (or **Database**).
8. Click the **Connect** button on your cluster.
9. Choose **Drivers**.
10. Copy the long link it shows you. It looks like this:

```
mongodb+srv://riftadmin:<db_password>@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority
```

11. In your notepad, paste it and **replace `<db_password>`** with the password from step 4.
    Delete the `<` and `>` too.

✅ **This finished link is thing A.** You'll paste it in the next part.

---

# Part 3 — Put the API online

**What this does:** runs the little program that talks to the database.

1. Go to **https://render.com** and sign in with your GitHub account.
2. Click **New +** (top right) → **Web Service**.
3. Find `riftevents` in the list and click **Connect**.
4. Fill in the form. Most of it is already correct — you only need to change these:

   - **Name:** `riftevents-api`
   - **Root Directory:** `server`  ← important, don't skip this
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**

5. Scroll down to **Environment Variables**. Click **Add Environment Variable** three times
   and fill them in exactly:

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | thing **A** — the long database link from Part 2 |
   | `ADMIN_PASSWORD` | `hda9dahdas08d` |
   | `ALLOWED_ORIGIN` | `*` |

   > Type the keys exactly as shown — capital letters and underscores matter.

6. Click **Create Web Service** at the bottom.
7. Wait. The log window will scroll for a minute or two. You're waiting for the word
   **Live** to appear at the top of the page.

✅ **Check:** at the top of the page there's a URL like
`https://riftevents-api.onrender.com`. Click it. Your browser should show:

```json
{"ok":true,"service":"Rift Events API"}
```

If you see that, the API and the database are talking to each other. **Copy this URL** —
you need it next.

❌ If it says "Application failed to respond", open the **Logs** tab and jump to
[Something went wrong](#something-went-wrong) at the bottom of this page.

---

# Part 4 — Tell the website about the API

**What this does:** one line, and the website starts using the database.

1. On your computer, open `D:\RiftEvents\js\data.js` in a text editor.
   (Notepad works. VS Code or Notepad++ is nicer.)
2. Find this line near the top — it's about 24 lines down:

```js
  const API_BASE = ""; // <-- leave empty to use browser storage
```

3. Put your API URL from Part 3 inside the quotes:

```js
  const API_BASE = "https://riftevents-api.onrender.com";
```

   > No slash on the end. Keep the quotes and the semicolon.

4. **Save the file** (Ctrl+S).
5. Switch to **GitHub Desktop**. `data.js` now appears in the left panel, with your change
   highlighted in green on the right.
6. In the **Summary** box, type: `Connect site to the API`
7. Click **Commit to main**.
8. Click **Push origin** at the top. ← don't skip this. Committing saves it on your computer;
   pushing is what sends it to GitHub.

---

# Part 5 — Put the website online

**What this does:** publishes the actual site people visit.

1. Back on Render, click **New +** → **Static Site**.
2. Pick the same `riftevents` repo → **Connect**.
3. Fill in:

   - **Name:** `riftevents`
   - **Root Directory:** leave **blank**
   - **Build Command:** leave **blank**
   - **Publish Directory:** type a single dot → `.`

4. Click **Create Static Site**.
5. Wait for it to finish. You'll get a URL like `https://riftevents.onrender.com`.

✅ **Check:** open that URL. Your website should load.

**This URL is thing C.** Copy it.

---

# Part 6 — Lock it down

**What this does:** stops other websites from writing to your database. Don't skip this.

1. On Render, open your **riftevents-api** service.
2. Click **Environment** in the left sidebar.
3. Find `ALLOWED_ORIGIN` and click the pencil to edit it.
4. Replace the `*` with thing **C** — your website URL:

```
https://riftevents.onrender.com
```

   > No slash on the end. It has to match exactly.

5. Click **Save Changes**. Render will restart the API automatically.

---

# Part 7 — Test that it worked

1. Go to `https://riftevents.onrender.com/admin.html`
2. Log in with `hda9dahdas08d`
3. Add a person. You should see a toast saying they were added.
4. Open `https://riftevents.onrender.com/characters.html` **on your phone**.

If that person is there on your phone too, **you're done.** That's the entire point of all
this — the data now lives on the internet instead of in one browser.

---

# Making changes later

You never have to repeat any of the above. To change the website, it's always the same four
steps:

1. Edit the file in `D:\RiftEvents` on your computer and save it.
2. Open **GitHub Desktop** — your change shows up automatically in the left panel.
3. Type a short note in the **Summary** box, click **Commit to main**.
4. Click **Push origin**.

Render notices and republishes within a minute or two, automatically. Refresh your site to
see it.

> If you forget to **Push origin**, your change stays on your computer and the live site
> won't update. That's the single most common thing to trip over.

To add or remove people you don't touch GitHub at all — just use `/admin.html`. That writes
straight to the database and is live instantly.

---

# Something went wrong

**The first page load takes 30–60 seconds, then it's fine.**
Normal. Render's free tier puts your API to sleep after 15 minutes of no visitors. The next
visitor wakes it up. Paid plans don't sleep.

**Characters page is empty, or says it can't load.**
Open the site, press `F12`, click the **Console** tab, and reload.
- Red text mentioning **CORS** → `ALLOWED_ORIGIN` on Render doesn't exactly match your site
  URL. Check for a stray slash on the end.
- **404** or **failed to fetch** → `API_BASE` in `js/data.js` is wrong or has a slash on the end.

**Adding someone says "Not authorised".**
`ADMIN_PASSWORD` on Render doesn't match what you typed in the admin panel. Check it in
Render → your API service → Environment.

**The API says "Application failed to respond".**
Render → your API service → **Logs**.
- `Missing MONGODB_URI` → the environment variable name is misspelled.
- `Authentication failed` → the password inside your database link is wrong, or you left the
  `<db_password>` placeholder in there.
- `ETIMEDOUT` / `connection timed out` → you missed the "Allow Access from Anywhere" step in
  Part 2.

**I changed a file but the live site still shows the old version.**
In GitHub Desktop, look at the top bar. If it says **Push origin** with a number next to it,
your commit never left your computer — click it. If it says **Fetch origin**, the push worked
and Render is probably still building (check the **Events** tab on Render).

**GitHub Desktop doesn't show my repo / says "no local changes".**
Make sure the **Current Repository** dropdown at the top left says `riftevents`. If it's on a
different project, click it and pick `riftevents`.

**Render can't see my private repo.**
Render → **New +** → when picking a repo, click **Configure account** and grant it access to
`riftevents`. GitHub will ask you to confirm.

**I want to change the admin password.**
Two places, both required:
1. Render → API service → Environment → `ADMIN_PASSWORD`.
2. `js/admin.js` → the `PASS_HASH` line. Get the new hash by running this on your computer:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_NEW_PASSWORD').digest('hex'))"
```

---

# If you'd rather use the command line than GitHub Desktop

Part 1 becomes:

```bash
git init
git add .
git commit -m "Rift Events website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/riftevents.git
git push -u origin main
```

After that, any change is:

```bash
git add . && git commit -m "what you changed" && git push
```
