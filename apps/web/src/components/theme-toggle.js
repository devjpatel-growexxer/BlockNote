"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if the user already has a saved theme
    const savedTheme = localStorage.getItem("theme");
    // Or if their OS is natively in dark mode
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Default to dark mode if saved, OR if no preference is saved and system is dark
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    
    setIsDark(shouldBeDark);

    // Apply the class globally
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
