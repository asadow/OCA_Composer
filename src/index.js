import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./i18n";

// Suppress benign ResizeObserver loop errors (Chrome bug) to avoid noisy console
// https://bugs.chromium.org/p/chromium/issues/detail?id=809574
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = function (...args) {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("ResizeObserver loop completed with undelivered notifications") ||
        args[0].includes("ResizeObserver loop limit exceeded"))
    ) {
      return; // ignore
    }
    originalConsoleError.apply(console, args);
  };

  // Some browsers emit this as a global Error event rather than console.error
  window.addEventListener(
    "error",
    (event) => {
      if (
        typeof event.message === "string" &&
        (event.message.includes(
          "ResizeObserver loop completed with undelivered notifications"
        ) ||
          event.message.includes("ResizeObserver loop limit exceeded"))
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      }
    },
    true
  );

  // Also catch unhandled promise rejections that might contain ResizeObserver errors
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (
        typeof event.reason === "string" &&
        (event.reason.includes(
          "ResizeObserver loop completed with undelivered notifications"
        ) ||
          event.reason.includes("ResizeObserver loop limit exceeded"))
      ) {
        event.preventDefault();
        return false;
      }
    },
    true
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
