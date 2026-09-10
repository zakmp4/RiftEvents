/* ============================================================
   Rift Events API
   ------------------------------------------------------------
   Stores the Characters roster in MongoDB.

   Reading is public (the Characters page needs it).
   Writing requires the admin password, sent as the
   x-admin-password header by the admin panel.

   Environment variables (set these in Render, never in code):
     MONGODB_URI     your MongoDB Atlas connection string
     ADMIN_PASSWORD  the password the admin panel uses
     ALLOWED_ORIGIN  your site's URL, e.g. https://riftevents.com
                     (use * while testing, tighten it after)
     PORT            set automatically by Render
   ============================================================ */

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Set it in your environment variables.");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error("Missing ADMIN_PASSWORD. Set it in your environment variables.");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    allowedHeaders: ["Content-Type", "x-admin-password"]
  })
);

let characters; // the MongoDB collection, filled in by start()

/* ---------- helpers ---------- */

// Turn a MongoDB document into the shape the website expects.
function toClient(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name || "",
    username: doc.username || "",
    rank: doc.rank || "Member",
    bio: doc.bio || "",
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    joined: doc.joined || ""
  };
}

// Keep only the fields we know about, so nobody can inject junk.
function clean(body) {
  const tags = Array.isArray(body.tags)
    ? body.tags
    : String(body.tags || "").split(",");

  return {
    name: String(body.name || "").trim().slice(0, 80),
    username: String(body.username || "").trim().slice(0, 40),
    rank: String(body.rank || "Member").trim().slice(0, 40),
    bio: String(body.bio || "").trim().slice(0, 500),
    tags: tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10),
    joined: String(body.joined || "").slice(0, 20)
  };
}

// Blocks every write that doesn't carry the right password.
function requireAdmin(req, res, next) {
  if (req.get("x-admin-password") !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Not authorised" });
  }
  next();
}

function validId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

/* ---------- routes ---------- */

app.get("/", (req, res) => {
  res.json({ ok: true, service: "Rift Events API" });
});

// Public: the Characters page reads this.
app.get("/api/characters", async (req, res, next) => {
  try {
    const docs = await characters.find({}).sort({ _id: 1 }).toArray();
    res.json(docs.map(toClient));
  } catch (err) {
    next(err);
  }
});

// Admin only from here down.
app.post("/api/characters", requireAdmin, async (req, res, next) => {
  try {
    const doc = clean(req.body);
    if (!doc.name) return res.status(400).json({ error: "A display name is required." });

    const result = await characters.insertOne(doc);
    res.status(201).json(toClient({ ...doc, _id: result.insertedId }));
  } catch (err) {
    next(err);
  }
});

app.put("/api/characters/:id", requireAdmin, async (req, res, next) => {
  try {
    const _id = validId(req.params.id);
    if (!_id) return res.status(400).json({ error: "Bad id" });

    const doc = clean(req.body);
    if (!doc.name) return res.status(400).json({ error: "A display name is required." });

    const updated = await characters.findOneAndUpdate(
      { _id },
      { $set: doc },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ error: "Person not found" });

    res.json(toClient(updated));
  } catch (err) {
    next(err);
  }
});

app.delete("/api/characters/:id", requireAdmin, async (req, res, next) => {
  try {
    const _id = validId(req.params.id);
    if (!_id) return res.status(400).json({ error: "Bad id" });

    const result = await characters.deleteOne({ _id });
    if (!result.deletedCount) return res.status(404).json({ error: "Person not found" });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

/* ---------- start ---------- */

async function start() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  characters = client.db("riftevents").collection("characters");
  console.log("Connected to MongoDB");

  app.listen(PORT, () => console.log("Rift Events API listening on port " + PORT));
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
