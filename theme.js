(function () {
  const root = document.documentElement;
  const storageKey = "hospital_theme";

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch (_) {}
  }

  function getPreferredTheme() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "light" || saved === "dark") return saved;
    } catch (_) {}

    // If user hasn't picked, follow OS preference
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function initToggle() {
    const btn = document.getElementById("themeToggle");
    const icon = document.getElementById("themeToggleIcon");
    if (!btn) return;

    const applyButtonText = () => {
      const t = root.getAttribute("data-theme") || "dark";
      if (t === "light") {
        if (icon) icon.textContent = "☀️";
        btn.setAttribute("aria-label", "Switch to dark mode");
      } else {
        if (icon) icon.textContent = "🌙";
        btn.setAttribute("aria-label", "Switch to light mode");
      }
    };

    applyButtonText();

    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      setTheme(current === "dark" ? "light" : "dark");
      applyButtonText();

      // If TV mode uses body.tv-mode, it should still respect the theme vars.
      // (No other JS needed.)
    });
  }

  // Init
  setTheme(getPreferredTheme());
  initToggle();
})();
