/**
 * This script runs before React hydrates so a saved dark theme is applied
 * before first paint. Without it, a dark-theme refresh can briefly show the
 * default light CSS variables before the client toggle code loads.
 */
const THEME_SYNC_SCRIPT = `
/*
 * This runs before React hydrates so a saved dark theme is applied before the
 * first paint. Without it, the server renders light CSS variables first and a
 * dark-theme refresh can briefly flashbang the user with a light page.
 */
(function () {
  try {
    var storageKey = "transactions-dashboard-theme";
    var cookieTheme = document.cookie
      .split("; ")
      .find(function (row) { return row.indexOf(storageKey + "=") === 0; });
    cookieTheme = cookieTheme ? cookieTheme.split("=")[1] : null;
    var storedTheme = window.localStorage.getItem(storageKey);
    var theme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : cookieTheme === "dark" || cookieTheme === "light"
          ? cookieTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    var root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    document.cookie =
      storageKey + "=" + theme + "; Path=/; Max-Age=31536000; SameSite=Lax";
  } catch (_) {}
})();
`

function ThemeSyncScript() {
  return (
    <script
      id="transactions-dashboard-theme"
      dangerouslySetInnerHTML={{ __html: THEME_SYNC_SCRIPT }}
    />
  )
}

export { ThemeSyncScript }
