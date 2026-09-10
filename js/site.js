/* ============================================================
   Rift Events - shared site behaviour
   nav, copy-ip, toasts, scroll reveals, characters grid
   ============================================================ */

(function () {
  "use strict";

  /* ---------- mobile nav ---------- */
  const burger = document.querySelector(".burger");
  const nav = document.querySelector("nav.main");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", nav.classList.contains("open"));
    });
  }

  /* ---------- toast ---------- */
  let toastEl = null;
  let toastTimer = null;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    requestAnimationFrame(function () {
      toastEl.classList.add("show");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }
  window.riftToast = toast;

  /* ---------- copy server ip ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    el.addEventListener("click", function () {
      const value = el.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(
          function () { toast("Copied " + value); },
          function () { toast(value); }
        );
      } else {
        toast(value);
      }
    });
  });

  /* ---------- footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- scroll reveal ---------- */
  const revealables = document.querySelectorAll(".reveal");
  if (revealables.length) {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -60px 0px" }
      );
      revealables.forEach(function (el) { io.observe(el); });
    } else {
      revealables.forEach(function (el) { el.classList.add("in"); });
    }
  }

  /* ============================================================
     CHARACTERS PAGE
     ============================================================ */
  const grid = document.getElementById("charGrid");
  if (!grid) return;

  const searchInput = document.getElementById("charSearch");
  const chipRow = document.getElementById("rankChips");
  const countEl = document.getElementById("charCount");

  let people = [];
  let activeRank = "All";
  let query = "";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cardFor(p) {
    const rankClass = "rank-" + String(p.rank || "Member").toLowerCase();
    const avatar = RiftData.avatarUrl(p.username, 128);
    const initial = escapeHtml((p.name || "?").charAt(0).toUpperCase());

    const skin = avatar
      ? '<img src="' + avatar + '" alt="' + escapeHtml(p.name) + '" loading="lazy" ' +
        "onerror=\"this.parentNode.innerHTML='<span class=&quot;fallback&quot;>" + initial + "</span>'\">"
      : '<span class="fallback">' + initial + "</span>";

    const tags = (p.tags || [])
      .map(function (t) { return "<span>" + escapeHtml(t) + "</span>"; })
      .join("");

    return (
      '<article class="card char reveal in">' +
        '<div class="skin">' + skin + "</div>" +
        '<span class="rank ' + rankClass + '">' + escapeHtml(p.rank || "Member") + "</span>" +
        "<h3>" + escapeHtml(p.name) + "</h3>" +
        '<div class="user">' + (p.username ? "@" + escapeHtml(p.username) : "&nbsp;") + "</div>" +
        '<p class="bio">' + escapeHtml(p.bio || "No bio yet.") + "</p>" +
        '<div class="tags">' + tags + "</div>" +
      "</article>"
    );
  }

  function render() {
    const q = query.trim().toLowerCase();
    const filtered = people.filter(function (p) {
      const matchesRank = activeRank === "All" || p.rank === activeRank;
      if (!matchesRank) return false;
      if (!q) return true;
      const haystack = [p.name, p.username, p.bio, (p.tags || []).join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(q) !== -1;
    });

    if (countEl) {
      countEl.textContent =
        filtered.length + (filtered.length === 1 ? " character" : " characters");
    }

    if (!filtered.length) {
      grid.innerHTML =
        '<div class="empty" style="grid-column:1/-1">' +
          "<b>Nobody here yet</b>" +
          "<span>Try a different search, or add people from the admin panel.</span>" +
        "</div>";
      return;
    }

    grid.innerHTML = filtered.map(cardFor).join("");
  }

  function buildChips() {
    if (!chipRow) return;
    const ranks = ["All"].concat(RiftData.RANKS);
    chipRow.innerHTML = ranks
      .map(function (r) {
        return (
          '<button type="button" class="chip' + (r === activeRank ? " active" : "") +
          '" data-rank="' + r + '">' + r + "</button>"
        );
      })
      .join("");

    chipRow.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        activeRank = chip.getAttribute("data-rank");
        chipRow.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        render();
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      query = searchInput.value;
      render();
    });
  }

  RiftData.list()
    .then(function (data) {
      people = data;
      buildChips();
      render();
    })
    .catch(function (err) {
      console.error(err);
      grid.innerHTML =
        '<div class="empty" style="grid-column:1/-1"><b>Could not load characters</b>' +
        "<span>" + escapeHtml(err.message) + "</span></div>";
    });
})();
