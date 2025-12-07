import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp";

const root = document.getElementById("popup-root");

if (!root) {
  throw new Error("Popup root element not found");
}

createRoot(root).render(<PopupApp />);
