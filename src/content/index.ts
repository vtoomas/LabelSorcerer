console.log("LabelSorcerer content script injected");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ping") {
    sendResponse({ type: "pong" });
  }
});
