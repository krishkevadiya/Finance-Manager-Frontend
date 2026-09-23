import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const browserDocument = (globalThis as any).document;
const rootElement = browserDocument?.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id='root' was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);