// Load saved key on popup open
chrome.storage.sync.get("gemini_api_key", (data) => {
  document.getElementById("apiKeyInput").value = data.gemini_api_key || "";
});

// Save key when button is clicked
document.getElementById("saveBtn").addEventListener("click", () => {
  const key = document.getElementById("apiKeyInput").value.trim();
  chrome.storage.sync.set({ gemini_api_key: key }, () => {
    alert("API Key saved!");
  });
});
