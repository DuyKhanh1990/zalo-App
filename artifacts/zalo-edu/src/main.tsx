import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("unhandledrejection", (event) => {
  if (!(event.reason instanceof Error)) {
    event.preventDefault();
  }
});

const container =
  document.getElementById("app") || document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
