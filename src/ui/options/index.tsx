import { createRoot } from "react-dom/client";
import { OptionsApp } from "./OptionsApp";

const rootElement = document.getElementById("options-root");

if (!rootElement) {
  throw new Error("Options root element not found");
}

createRoot(rootElement).render(<OptionsApp />);
