(() => {
  // 1. IMMEDIATE LOG TO VERIFY INJECTION
  console.log("EXTENSION ALIVE: content.js has successfully injected!");

  let currentVideo = new URLSearchParams(window.location.search).get("v");
  let currentVideoBookmarks = [];

  chrome.runtime.onMessage.addListener((obj, sender, res) => {
    const { type, videoId } = obj;
    if (type === "NEW") {
      currentVideo = videoId;
      console.log(
        "Received message from background. Video ID is now:",
        currentVideo,
      );
      newVideoLoaded();
    }
  });

  async function newVideoLoaded() {
    const bookmarkBtnExists =
      document.getElementsByClassName("bookmark-btn")[0];

    currentVideoBookmarks = await loadBookmarks();

    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img");
      bookmarkBtn.src = chrome.runtime.getURL("public/bookmark.png");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.style.fontSize = "20px";

      const appendButtonInterval = setInterval(() => {
        const ytRightControls =
          document.getElementsByClassName("ytp-right-controls")[0];

        if (ytRightControls) {
          clearInterval(appendButtonInterval);
          console.log("Found controls! Appending button now.");
          ytRightControls.appendChild(bookmarkBtn);
          bookmarkBtn.addEventListener("click", addBookmarkEventHandler);
        } else {
          console.log("⏳ Still looking for ytp-right-controls...");
        }
      }, 500);
    }

    console.log(currentVideoBookmarks);
  }

  newVideoLoaded();

  async function addBookmarkEventHandler() {
    // Safety check: Did the extension reload?
    if (!chrome.runtime?.id) {
      alert(
        "Extension updated! Please refresh the page to continue bookmarking.",
      );
      return;
    }

    const ytPlayer = document.getElementsByClassName("video-stream")[0];
    const currentTime = ytPlayer.currentTime;

    const titleElement = document.querySelector(
      "ytd-watch-metadata h1.ytd-watch-metadata",
    );
    const videoTitle = titleElement
      ? titleElement.innerText.trim()
      : "Unknown Video";

    const bookmark = {
      time: currentTime,
      description: "Bookmark at " + getTime(currentTime),
      title: videoTitle,
    };

    try {
      // save to chrome storage
      chrome.storage.sync.set({
        [currentVideo]: JSON.stringify(
          [...currentVideoBookmarks, bookmark].sort((a, b) => a.time - b.time),
        ),
      });

      currentVideoBookmarks = await loadBookmarks();
      console.log(currentVideoBookmarks);
    } catch (error) {
      console.log(
        "Storage failed. Context likely invalidated. Refresh the page.",
        error,
      );
    }
  }

  function loadBookmarks() {
    return new Promise((resolve) => {
      // Safety check for async promise handling
      if (!chrome.runtime?.id) {
        resolve([]);
        return;
      }

      chrome.storage.sync.get([currentVideo], (result) => {
        resolve(result[currentVideo] ? JSON.parse(result[currentVideo]) : []);
      });
    });
  }
})();

function getTime(t) {
  var date = new Date(0);
  date.setSeconds(t);
  return date.toISOString().substr(11, 8);
}
