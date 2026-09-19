/* ============================================================
   Rift Events - admin panel
   ------------------------------------------------------------
   Reached only by typing /admin.html - it is not linked anywhere
   in the site navigation.

   NOTE ON SECURITY: this is a front-end gate. The password is
   stored as a SHA-256 hash rather than plain text so it is not
   readable at a glance, but anyone determined can still get past
   a client-side check. If this panel ever guards something that
   actually matters, move the check to a server (see README).
   ============================================================ */

(function () {
  "use strict";

  /* SHA-256 of the admin password */
  const PASS_HASH = "53ebec51aee1510e236659fc6db32b0a942a7c55f8a1aa5b0e79fe469312c065";
  const SESSION_KEY = "rift.admin.session";

  /* ---------- tiny dependency-free SHA-256 ---------- */
  function sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = "";
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = (sha256.h = sha256.h || []);
    const k = (sha256.k = sha256.k || []);
    let primeCounter = k.length;
    const isComposite = {};
    let i, j;

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += "\x80";
    while ((ascii.length % 64) - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (j = 0; j < words.length; ) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash;
      hash = hash.slice(0, 8);

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const a = hash[0];
        const e = hash[4];
        const temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? 0 : "") + b.toString(16);
      }
    }
    return result;
  }

  /* ---------- elements ---------- */
  const gate = document.getElementById("gate");
  const panel = document.getElementById("panel");
  const gateForm = document.getElementById("gateForm");
  const gatePass = document.getElementById("gatePass");
  const gateError = document.getElementById("gateError");

  const form = document.getElementById("personForm");
  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("submitBtn");
  const cancelBtn = document.getElementById("cancelEdit");
  const tbody = document.getElementById("peopleBody");
  const totalEl = document.getElementById("total");
  const filterInput = document.getElementById("adminSearch");
  const rankSelect = document.getElementById("f_rank");

  let people = [];
  let editingId = null;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function notify(message, ok) {
    if (window.riftToast) window.riftToast(message);
    else alert(message);
    if (ok === false) console.warn(message);
  }

  /* ---------- gate ---------- */
  function unlock() {
    gate.style.display = "none";
    panel.style.display = "block";
    document.body.style.overflow = "";
    load();
  }

  if (sessionStorage.getItem(SESSION_KEY) === PASS_HASH) {
    unlock();
  }

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const attempt = sha256(gatePass.value);
    if (attempt === PASS_HASH) {
      sessionStorage.setItem(SESSION_KEY, PASS_HASH);
      /* kept only for this tab, and only used to authorise API writes
         once js/data.js has an API_BASE set */
      sessionStorage.setItem("rift.admin.key", gatePass.value);
      gateError.style.display = "none";
      unlock();
    } else {
      gateError.style.display = "block";
      gatePass.value = "";
      gatePass.focus();
    }
  });

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("rift.admin.key");
      location.reload();
    });
  }

  /* ---------- rank options ---------- */
  if (rankSelect) {
    rankSelect.innerHTML = RiftData.RANKS.map(function (r) {
      return '<option value="' + r + '"' + (r === "Member" ? " selected" : "") + ">" + r + "</option>";
    }).join("");
  }

  /* ---------- table ---------- */
  function renderTable() {
    const q = (filterInput ? filterInput.value : "").trim().toLowerCase();
    const rows = people.filter(function (p) {
      if (!q) return true;
      return (p.name + " " + p.username + " " + p.rank).toLowerCase().indexOf(q) !== -1;
    });

    totalEl.textContent = people.length + (people.length === 1 ? " person" : " people");

    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="4"><div class="empty" style="border:none;padding:40px 10px">' +
        "<b>No people yet</b><span>Add someone with the form on the left.</span>" +
        "</div></td></tr>";
      return;
    }

    tbody.innerHTML = rows
      .map(function (p) {
        const avatar = RiftData.isImage(p.image) ? p.image : RiftData.avatarUrl(p.username, 64);
        const img = avatar
          ? '<img src="' + avatar + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">'
          : '<img alt="" style="visibility:hidden">';
        return (
          "<tr>" +
            '<td><div class="who">' + img +
              "<span><b>" + escapeHtml(p.name) + "</b>" +
              "<small>" + (p.username ? "@" + escapeHtml(p.username) : "no username") + "</small></span>" +
            "</div></td>" +
            '<td><span class="rank rank-' + String(p.rank).toLowerCase() + '" style="margin:0">' +
              escapeHtml(p.rank) + "</span></td>" +
            "<td>" + escapeHtml(p.joined || "-") + "</td>" +
            '<td><div class="actions">' +
              '<button class="btn btn-ghost btn-sm" data-edit="' + p.id + '">Edit</button>' +
              '<button class="btn btn-danger btn-sm" data-del="' + p.id + '">Delete</button>' +
            "</div></td>" +
          "</tr>"
        );
      })
      .join("");

    tbody.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { startEdit(b.getAttribute("data-edit")); });
    });
    tbody.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { confirmDelete(b.getAttribute("data-del")); });
    });
  }

  if (filterInput) filterInput.addEventListener("input", renderTable);

  function load() {
    RiftData.list()
      .then(function (data) {
        people = data;
        renderTable();
      })
      .catch(function (err) { notify(err.message, false); });
  }

  /* ---------- add / edit ---------- */
  /* ---------- picture picker ---------- */
  const PIC_SIZE = 256;          // saved pictures are 256x256
  const PIC_MAX_CHARS = 380000;  // stay under the API's limit
  const picInput = document.getElementById("f_image");
  const picPreview = document.getElementById("picPreview");
  const picRemove = document.getElementById("picRemove");
  const picHint = document.getElementById("picHint");
  const usernameInput = document.getElementById("f_username");
  const PIC_HINT_DEFAULT = picHint.textContent;
  let currentImage = "";

  function showPreview() {
    const username = usernameInput.value.trim();
    const name = document.getElementById("f_name").value.trim();
    if (currentImage) {
      picPreview.innerHTML = '<img src="' + currentImage + '" alt="">';
    } else if (username) {
      picPreview.innerHTML = '<img class="skin-img" src="' + RiftData.avatarUrl(username, 128) +
        '" alt="" onerror="this.remove()">';
    } else {
      picPreview.innerHTML = "<span>" + escapeHtml((name || "?").charAt(0).toUpperCase()) + "</span>";
    }
    picRemove.hidden = !currentImage;
  }

  // Shrink and square-crop the chosen file so it's small enough to store.
  function processImage(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
        reject(new Error("Choose a PNG, JPG, WebP or GIF image."));
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        reject(new Error("That file is over 15 MB. Choose a smaller image."));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = PIC_SIZE;
        const ctx = canvas.getContext("2d");
        // Keep pixel art crisp when scaling up small images (like skin renders).
        ctx.imageSmoothingEnabled = side >= PIC_SIZE;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, PIC_SIZE, PIC_SIZE);

        // WebP keeps transparency and is small; fall back if the browser can't make it.
        let data = canvas.toDataURL("image/webp", 0.88);
        if (data.indexOf("data:image/webp") !== 0) data = canvas.toDataURL("image/png");
        if (data.length > PIC_MAX_CHARS) data = canvas.toDataURL("image/jpeg", 0.85);
        if (data.length > PIC_MAX_CHARS) data = canvas.toDataURL("image/jpeg", 0.6);
        if (!RiftData.isImage(data) || data.length > PIC_MAX_CHARS) {
          reject(new Error("Couldn't shrink that picture enough. Try a different image."));
          return;
        }
        resolve(data);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("That file couldn't be opened as an image."));
      };
      img.src = url;
    });
  }

  picInput.addEventListener("change", function () {
    const file = picInput.files[0];
    picInput.value = "";
    if (!file) return;
    picHint.textContent = "Preparing picture...";
    processImage(file)
      .then(function (data) {
        currentImage = data;
        picHint.textContent = "Picture ready — it saves when you click " +
          (editingId ? "Save changes." : "Add person.");
        showPreview();
      })
      .catch(function (err) {
        picHint.textContent = PIC_HINT_DEFAULT;
        notify(err.message, false);
      });
  });

  picRemove.addEventListener("click", function () {
    currentImage = "";
    picHint.textContent = editingId
      ? "Picture removed — click Save changes to confirm. Their skin will show instead."
      : PIC_HINT_DEFAULT;
    showPreview();
  });

  usernameInput.addEventListener("input", function () { if (!currentImage) showPreview(); });
  showPreview();
  document.getElementById("f_name").addEventListener("input", function () {
    if (!currentImage && !usernameInput.value.trim()) showPreview();
  });

  function formValues() {
    return {
      name: document.getElementById("f_name").value,
      username: document.getElementById("f_username").value,
      rank: document.getElementById("f_rank").value,
      bio: document.getElementById("f_bio").value,
      tags: document.getElementById("f_tags").value,
      joined: document.getElementById("f_joined").value,
      image: currentImage
    };
  }

  function resetForm() {
    form.reset();
    document.getElementById("f_rank").value = "Member";
    currentImage = "";
    picHint.textContent = PIC_HINT_DEFAULT;
    showPreview();
    editingId = null;
    formTitle.textContent = "Add a person";
    submitBtn.textContent = "Add person";
    cancelBtn.style.display = "none";
  }

  function startEdit(id) {
    const p = people.find(function (x) { return x.id === id; });
    if (!p) return;
    editingId = id;
    document.getElementById("f_name").value = p.name || "";
    document.getElementById("f_username").value = p.username || "";
    document.getElementById("f_rank").value = p.rank || "Member";
    document.getElementById("f_bio").value = p.bio || "";
    document.getElementById("f_tags").value = (p.tags || []).join(", ");
    document.getElementById("f_joined").value = p.joined || "";
    currentImage = RiftData.isImage(p.image) ? p.image : "";
    picHint.textContent = PIC_HINT_DEFAULT;
    showPreview();
    formTitle.textContent = "Editing " + p.name;
    submitBtn.textContent = "Save changes";
    cancelBtn.style.display = "inline-flex";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const values = formValues();
    if (!values.name.trim()) { notify("A display name is required."); return; }

    const action = editingId
      ? RiftData.update(editingId, {
          name: values.name.trim(),
          username: values.username.trim(),
          rank: values.rank,
          bio: values.bio.trim(),
          tags: RiftData.normaliseTags(values.tags),
          joined: values.joined,
          image: values.image
        })
      : RiftData.add(values);

    const wasEditing = Boolean(editingId);

    action
      .then(function () {
        notify(wasEditing ? "Changes saved" : values.name.trim() + " added");
        resetForm();
        load();
      })
      .catch(function (err) { notify(err.message, false); });
  });

  function confirmDelete(id) {
    const p = people.find(function (x) { return x.id === id; });
    if (!p) return;
    if (!confirm("Remove " + p.name + " from the roster?")) return;
    RiftData.remove(id)
      .then(function () {
        notify(p.name + " removed");
        if (editingId === id) resetForm();
        load();
      })
      .catch(function (err) { notify(err.message, false); });
  }

  /* ---------- export / import / reset ---------- */
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      const blob = new Blob([JSON.stringify(people, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rift-characters.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  const importInput = document.getElementById("importFile");
  const importBtn = document.getElementById("importBtn");
  if (importBtn && importInput) {
    importBtn.addEventListener("click", function () { importInput.click(); });
    importInput.addEventListener("change", function () {
      const file = importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const parsed = JSON.parse(String(reader.result));
          RiftData.replaceAll(parsed).then(function () {
            notify("Imported " + parsed.length + " people");
            load();
          });
        } catch (err) {
          notify("That file is not valid JSON.", false);
        }
        importInput.value = "";
      };
      reader.readAsText(file);
    });
  }

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (!confirm("Remove every person from the roster? This cannot be undone.")) return;
      RiftData.resetToSeed().then(function () {
        notify("Roster cleared");
        resetForm();
        load();
      });
    });
  }
})();
