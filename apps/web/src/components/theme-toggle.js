"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    // Default to light theme unless the user explicitly selected dark before.
    const shouldBeDark = savedTheme === "dark";

    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  function toggleTheme() {
    const nextTheme = !isDark;
    setIsDark(nextTheme);

    const themeString = nextTheme ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", themeString);
    localStorage.setItem("theme", themeString);
  }

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
