import { evaluateMappings } from "./domEvaluator";

console.log("LabelSorcerer content script injected");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ping") {
    sendResponse({ type: "pong" });
    return;
  }

  if (message?.type === "evaluateMappings") {
    const result = evaluateMappings(message.payload);
    sendResponse(result);
    return;
  }
});
