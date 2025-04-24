(async function () {
  function requestApiKey() {
    return new Promise((resolve) => {
      const requestId = Date.now();
      function handleApiKey(event) {
        if (
          event.source === window &&
          event.data.type === "gemini-api-key-response"
        ) {
          resolve(event.data.apiKey || "");
          window.removeEventListener("message", handleApiKey);
        }
      }
      window.addEventListener("message", handleApiKey);
      window.postMessage(
        { type: "request-gemini-api-key", id: requestId },
        "*"
      );
    });
  }

  const widgetHTML = `
    <div id="gemini-toggle-btn">💬</div>
    <div id="gemini-widget-container" style="display: none;">
        <div id="gemini-widget">
            <div id="gemini-header">
                <span>Gemini Assistant</span>
                <button id="gemini-close-btn">×</button>
                <button id="gemini-clear-btn">🗑️</button>
            </div>
            <div id="gemini-log"></div>
            <div id="gemini-controls">
                <input id="gemini-input" type="text" placeholder="Ask something...">
                <button id="gemini-send">Send</button>
            </div>
        </div>
    </div>
    `;
  document.body.insertAdjacentHTML("beforeend", widgetHTML);

  const logEl = document.getElementById("gemini-log");
  const inputEl = document.getElementById("gemini-input");
  const sendBtn = document.getElementById("gemini-send");

  const toggleBtn = document.getElementById("gemini-toggle-btn");
  const widgetBoxContainer = document.getElementById("gemini-widget-container");
  const widgetBox = document.getElementById("gemini-widget");

  const closeBtn = document.getElementById("gemini-close-btn");
  const clearBtn = document.getElementById("gemini-clear-btn");

  // Make it draggable
  function makeDraggable(dragHandle, moveTarget) {
    let posX = 0,
      posY = 0,
      mouseX = 0,
      mouseY = 0;

    dragHandle.style.cursor = "move";

    dragHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      mouseX = e.clientX;
      mouseY = e.clientY;
      document.onmouseup = closeDrag;
      document.onmousemove = drag;
    }

    function drag(e) {
      e.preventDefault();
      posX = mouseX - e.clientX;
      posY = mouseY - e.clientY;
      mouseX = e.clientX;
      mouseY = e.clientY;
      moveTarget.style.top = moveTarget.offsetTop - posY + "px";
      moveTarget.style.left = moveTarget.offsetLeft - posX + "px";
    }

    function closeDrag() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  makeDraggable(
    document.getElementById("gemini-header"),
    document.getElementById("gemini-widget-container")
  );

  // Restore previous chat
  const savedHistory = JSON.parse(localStorage.getItem("gemini_chat") || "[]");
  savedHistory.forEach(({ sender, msg }) => {
    addToLog(sender, msg, false); // Reuse the same method to render
  });

  closeBtn.addEventListener("click", () => {
    widgetBoxContainer.style.display = "none";
  });

  toggleBtn.addEventListener("click", () => {
    widgetBoxContainer.style.display =
      widgetBoxContainer.style.display === "none" ? "flex" : "none";
  });

  sendBtn.addEventListener("click", () => {
    const text = inputEl.value.trim();
    if (text) sendToGemini(text);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("gemini_chat");
    logEl.innerHTML = "";
  });

  function addToLog(sender, msg, saveToStorage = true) {
    const div = document.createElement("div");
    const isUser = sender === "You";
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    div.className = `${
      isUser ? "user_msg" : "gemini_msg"
    } chat_msg animate_msg`;

    div.innerHTML = `
      <div class="avatar">${isUser ? "🧑" : "🤖"}</div>
      <div class="msg_bubble">
        <div class="msg_sender">${sender}</div>
        <div class="msg_text">${msg}</div>
        <div class="msg_time">${time}</div>
      </div>
    `;

    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;

    // Save to localStorage
    if (saveToStorage) {
      const chatHistory = JSON.parse(
        localStorage.getItem("gemini_chat") || "[]"
      );
      chatHistory.push({ sender, msg, time });
      localStorage.setItem("gemini_chat", JSON.stringify(chatHistory));
    }
  }

  async function sendToGemini(text) {
    const apiKey = await requestApiKey();

    if (!apiKey) {
      alert("Please enter your Gemini API key from the extension popup.");
      return;
    }

    const id = Date.now(); // Unique ID for this request
    addToLog("You", text);
    inputEl.value = "";

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "gemini_msg chat_msg typing_placeholder";
    loadingDiv.innerHTML = `
  <div class="avatar">🤖</div>
  <div class="msg_bubble"><div class="msg_text">...</div></div>
`;
    logEl.appendChild(loadingDiv);
    logEl.scrollTop = logEl.scrollHeight;

    window.postMessage(
      {
        type: "query-gemini",
        apiKey: apiKey,
        text,
        id,
      },
      "*"
    );

    window.addEventListener("message", function handleResponse(event) {
      if (
        event.source !== window ||
        event.data.type !== "gemini-response" ||
        event.data.id !== id
      )
        return;

      const response = event.data.response;
      if (response?.success) {
        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        logEl.removeChild(loadingDiv);
        addToLog(
          "Gemini",
          marked?.parse(reply || "⚠️ No valid response from Gemini.")
        );
      } else {
        addToLog(
          "Gemini",
          "⚠️ API Error: " + (response?.error || "Unknown error")
        );
      }

      window.removeEventListener("message", handleResponse); // Cleanup listener
    });
  }
})();
