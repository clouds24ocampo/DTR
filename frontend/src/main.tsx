import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function ThemeMeta() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const setColor = () => {
      meta.setAttribute(
        "content",
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "#0f172a" : "#f1f5f9"
      );
    };
    setColor();
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    m.addEventListener("change", setColor);
    return () => m.removeEventListener("change", setColor);
  }, []);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeMeta />
    <App />
  </StrictMode>,
);
