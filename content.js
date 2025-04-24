// Inject marked.min.js first
const markedScript = document.createElement("script");
markedScript.src = chrome.runtime.getURL("marked.min.js");
markedScript.onload = () => {
  // Once marked is loaded, inject the widget
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("widget.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
};
(document.head || document.documentElement).appendChild(markedScript);

// Listen for messages from widget.js
window.addEventListener("message", async (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === "request-gemini-api-key") {
    chrome.runtime.sendMessage({ type: "get-api-key" }, (response) => {
      window.postMessage(
        {
          type: "gemini-api-key-response",
          apiKey: response.apiKey,
          id: event.data.id,
        },
        "*"
      );
    });
  }

  chrome.runtime.sendMessage(event.data, (response) => {
    window.postMessage(
      { type: "gemini-response", id: event.data.id, response },
      "*"
    );
  });
});

const style = document.createElement("link");
style.rel = "stylesheet";
style.href = chrome.runtime.getURL("widget.css");
document.head.appendChild(style);
