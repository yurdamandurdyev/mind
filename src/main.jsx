import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (
  import.meta.env.VITE_STANDALONE !== "true" &&
  location.protocol !== "file:" &&
  "serviceWorker" in navigator
) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.warn("Offline cache unavailable:", error));
    });
  } else {
    // The old vanilla shell must not intercept Vite's module requests during development.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const worker =
          registration.active ||
          registration.waiting ||
          registration.installing;
        if (worker && new URL(worker.scriptURL).pathname === "/sw.js")
          registration.unregister();
      }
    });
  }
}
