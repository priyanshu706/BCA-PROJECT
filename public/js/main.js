/* public/js/main.js — client-side interactions
   - Mobile hamburger menu
   - Tap-to-open dropdowns on touch
   - Live (as-you-type) search
   - Login / Register tab toggle
   - Scroll reveal animations + scroll-to-top
   - "Generating…" state + flash auto-dismiss
*/
document.addEventListener("DOMContentLoaded", function () {
  // Show / hide password fields
  document.querySelectorAll(".pw-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = btn.parentElement.querySelector("input");
      var icon = btn.querySelector("i");
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      if (icon)
        icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
  // Dark / light theme toggle (header button or avatar-menu item)
  var themeBtns = document.querySelectorAll(".theme-toggle");
  themeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      var next = isDark ? "light" : "dark";
      if (next === "dark")
        document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
    });
  });

  /* ---- Mobile hamburger ---- */
  var toggle = document.getElementById("navToggle");
  var collapse = document.getElementById("navCollapse");

  if (toggle && collapse) {
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();

      var open = collapse.classList.toggle("open");
      toggle.classList.toggle("active", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", function (e) {
      if (
        collapse.classList.contains("open") &&
        !collapse.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        collapse.classList.remove("open");
        toggle.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }
  /* ---- Dropdowns: tap to open on small screens ---- */
  document.querySelectorAll(".nav-dd").forEach(function (dd) {
    var btn = dd.querySelector(".nav-dd-btn, .nav-avatar");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width: 820px)").matches) {
        e.preventDefault();
        dd.classList.toggle("open");
      }
    });
  });

  /* ---- Live search (debounced fetch to /api/search) ---- */
  var search = document.getElementById("liveSearch");
  var results = document.getElementById("searchResults");
  if (search && results) {
    var timer = null;
    var render = function (items) {
      if (!items.length) {
        results.innerHTML = '<div class="sr-empty">No matches found</div>';
      } else {
        results.innerHTML = items
          .map(function (b) {
            return (
              '<a class="sr-item" href="/blog/' +
              b.slug +
              '">' +
              '<span class="sr-title">' +
              b.title +
              "</span>" +
              (b.excerpt
                ? '<span class="sr-ex">' + b.excerpt.slice(0, 70) + "…</span>"
                : "") +
              "</a>"
            );
          })
          .join("");
      }
      results.hidden = false;
    };
    search.addEventListener("input", function () {
      var q = search.value.trim();
      clearTimeout(timer);
      if (q.length < 2) {
        results.hidden = true;
        results.innerHTML = "";
        return;
      }
      timer = setTimeout(function () {
        fetch("/api/search?q=" + encodeURIComponent(q))
          .then(function (r) {
            return r.json();
          })
          .then(render)
          .catch(function () {
            results.hidden = true;
          });
      }, 220);
    });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.location =
          "/search?q=" + encodeURIComponent(search.value.trim());
      }
    });
    document.addEventListener("click", function (e) {
      if (!results.contains(e.target) && e.target !== search)
        results.hidden = true;
    });
  }

  /* ---- Login / Register toggle ---- */
  var authCard = document.querySelector(".auth-card");
  if (authCard) {
    var setMode = function (mode) {
      authCard.setAttribute("data-mode", mode);
      authCard.querySelectorAll(".auth-tab").forEach(function (t) {
        t.classList.toggle("active", t.dataset.target === mode);
      });
    };
    setMode(authCard.getAttribute("data-mode") || "login");
    authCard.querySelectorAll(".auth-tab, .switch-to").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        setMode(el.dataset.target);
      });
    });
  }

  /* ---- Scroll reveal animations ---- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("revealed");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(
        ".reveal, .blog-card, .feature-card, .stat-card, .contact-card, .panel",
      )
      .forEach(function (el) {
        el.classList.add("reveal");
        io.observe(el);
      });
  }

  /* ---- Scroll-to-top button ---- */
  var toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("show", window.scrollY > 500);
    });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---- Generating state ---- */
  var form = document.getElementById("generateForm");
  var gbtn = document.getElementById("generateBtn");
  if (form && gbtn) {
    form.addEventListener("submit", function () {
      gbtn.disabled = true;
      var label = gbtn.querySelector(".btn-label");
      if (label) label.textContent = "Generating, please wait…";
    });
  }

  /* ---- Flash auto-dismiss ---- */
  document.querySelectorAll(".flash").forEach(function (el) {
    setTimeout(function () {
      el.style.transition = "opacity .4s ease, transform .4s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px)";
      setTimeout(function () {
        el.remove();
      }, 400);
    }, 4500);
  });
});
