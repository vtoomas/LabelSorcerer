console.log("LabelSorcerer background service worker loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("LabelSorcerer background initialized");
});
