/* ============================================================
   Rift Events - data layer
   ------------------------------------------------------------
   Everything the site reads/writes about "people" goes through
   here. Right now it stores in the browser (localStorage), which
   is perfect for a static host like GitHub Pages or a Render
   Static Site.

   WHEN YOU ADD A REAL DATABASE (e.g. MongoDB Atlas + an Express
   API on Render): set API_BASE to your API url below. Nothing
   else on the site has to change - every function already
   returns a Promise.

       const API_BASE = "https://rift-api.onrender.com";

   Expected API shape:
       GET    {API_BASE}/api/characters       -> [ {...}, ... ]
       POST   {API_BASE}/api/characters       -> created object
       PUT    {API_BASE}/api/characters/:id   -> updated object
       DELETE {API_BASE}/api/characters/:id   -> { ok: true }
   ============================================================ */

const RiftData = (function () {
  const API_BASE = "https://play.riftevents.net"; // <-- your Render API. Set to "" to use browser storage only
  const KEY = "rift.characters.v2";

  const RANKS = ["Owner", "Admin", "Moderator", "Host", "Builder", "Member"];

  /* Starts empty on purpose. Add people through /admin.html.
     Anything you add here shows up before the admin panel is even opened. */
  const SEED = [];

  /* ---------- local storage helpers ---------- */

  function readLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        localStorage.setItem(KEY, JSON.stringify(SEED));
        return SEED.slice();
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("[RiftData] storage unavailable, using seed data", err);
      return SEED.slice();
    }
  }

  function writeLocal(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (err) {
      console.warn("[RiftData] could not save", err);
      throw new Error("Couldn't save — this browser's storage is full. Try a smaller picture.");
    }
    return arr;
  }

  /* A custom picture is a small image stored as text (a "data URL"). */
  const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
  function isImage(value) {
    return typeof value === "string" && IMAGE_PATTERN.test(value);
  }

  function newId() {
    return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Reads are public. Writes send the admin password the panel was
     unlocked with, and the server checks it against its own env var. */
  async function api(path, options) {
    const headers = { "Content-Type": "application/json" };
    let key = null;
    try { key = sessionStorage.getItem("rift.admin.key"); } catch (err) { key = null; }
    if (key) headers["x-admin-password"] = key;

    const res = await fetch(API_BASE + "/api/characters" + path, { headers, ...options });
    const data = await res.json().catch(() => null);
    if (res.status === 401) throw new Error("Not authorised — log in to the admin panel again.");
    if (!res.ok) throw new Error((data && data.error) || "Request failed: " + res.status);
    return data;
  }

  /* ---------- public ---------- */

  async function list() {
    if (API_BASE) return api("");
    return readLocal();
  }

  async function add(person) {
    const record = {
      id: newId(),
      name: (person.name || "").trim(),
      username: (person.username || "").trim(),
      rank: person.rank || "Member",
      bio: (person.bio || "").trim(),
      tags: normaliseTags(person.tags),
      joined: person.joined || new Date().toISOString().slice(0, 10),
      image: isImage(person.image) ? person.image : ""
    };
    if (!record.name) throw new Error("A display name is required.");
    if (API_BASE) return api("", { method: "POST", body: JSON.stringify(record) });

    const all = readLocal();
    all.push(record);
    writeLocal(all);
    return record;
  }

  async function update(id, patch) {
    if (API_BASE) return api("/" + id, { method: "PUT", body: JSON.stringify(patch) });

    const all = readLocal();
    const i = all.findIndex((p) => p.id === id);
    if (i === -1) throw new Error("Person not found.");
    all[i] = { ...all[i], ...patch, tags: normaliseTags(patch.tags ?? all[i].tags), id };
    if (!isImage(all[i].image)) all[i].image = "";
    writeLocal(all);
    return all[i];
  }

  async function remove(id) {
    if (API_BASE) return api("/" + id, { method: "DELETE" });

    writeLocal(readLocal().filter((p) => p.id !== id));
    return { ok: true };
  }

  async function replaceAll(arr) {
    if (!Array.isArray(arr)) throw new Error("Expected a list of people.");
    const cleaned = arr.map((p) => ({
      id: p.id || newId(),
      name: String(p.name || "").trim(),
      username: String(p.username || "").trim(),
      rank: RANKS.includes(p.rank) ? p.rank : "Member",
      bio: String(p.bio || "").trim(),
      tags: normaliseTags(p.tags),
      joined: p.joined || new Date().toISOString().slice(0, 10),
      image: isImage(p.image) ? p.image : ""
    })).filter((p) => p.name);

    if (API_BASE) {
      // The API has no bulk endpoint, so clear the roster then add each person in turn.
      await clearAll();
      const saved = [];
      for (const p of cleaned) {
        const { id, ...fields } = p;
        saved.push(await api("", { method: "POST", body: JSON.stringify(fields) }));
      }
      return saved;
    }

    writeLocal(cleaned);
    return cleaned;
  }

  async function clearAll() {
    const current = await api("");
    for (const p of current) {
      await api("/" + p.id, { method: "DELETE" });
    }
  }

  async function resetToSeed() {
    if (API_BASE) {
      await clearAll();
      return [];
    }
    return writeLocal(SEED.slice());
  }

  function normaliseTags(tags) {
    if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
    if (typeof tags === "string") {
      return tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    return [];
  }

  /* Minecraft head render (Minotar, with the hat layer). If the
     service is down, the page falls back to the person's initial. */
  function avatarUrl(username, size) {
    if (!username) return null;
    return "https://minotar.net/helm/" + encodeURIComponent(username) + "/" + (size || 128) + ".png";
  }

  return { RANKS, list, add, update, remove, replaceAll, resetToSeed, avatarUrl, normaliseTags, isImage };
})();
