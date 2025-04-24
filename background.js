chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle get-api-key
  if (message.type === "get-api-key") {
    chrome.storage.sync.get("gemini_api_key", (data) => {
      sendResponse({ apiKey: data.gemini_api_key });
    });
    return true;
  }

  // Handle set-api-key
  if (message.type === "set-api-key") {
    chrome.storage.sync.set({ gemini_api_key: message.value }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle Gemini API query
  if (message.type === "query-gemini") {
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${message.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message.text }] }],
        }),
      }
    )
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }
});
