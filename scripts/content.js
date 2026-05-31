(() => {
  console.log("EXTENSION ALIVE: content.js has successfully injected!");

  let currentVideo = new URLSearchParams(window.location.search).get("v");
  let currentVideoBookmarks = [];
  let isSearchingForControls = false;

  chrome.runtime.onMessage.addListener((obj, sender, res) => {
    const { type, videoId, value } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      isSearchingForControls = false;
      newVideoLoaded();
    } else if (type === "PLAY") {
      const ytPlayer = document.getElementsByClassName("video-stream")[0];
      if (ytPlayer) {
        ytPlayer.currentTime = value;
        console.log("Jumping playback timestamp safely to:", value);
      }
    }
  });

  async function newVideoLoaded() {
    if (
      document.getElementsByClassName("bookmark-btn")[0] ||
      isSearchingForControls
    ) {
      return;
    }

    isSearchingForControls = true;
    currentVideoBookmarks = await loadBookmarks();

    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.className = "ytp-button bookmark-btn";
    bookmarkBtn.title = "Click to bookmark this current timestamp";

    bookmarkBtn.style.background = "none";
    bookmarkBtn.style.border = "none";
    bookmarkBtn.style.padding = "0";
    bookmarkBtn.style.width = "46px";
    bookmarkBtn.style.height = "100%";
    bookmarkBtn.style.display = "inline-flex";
    bookmarkBtn.style.alignItems = "center";
    bookmarkBtn.style.justifyContent = "center";
    bookmarkBtn.style.cursor = "pointer";

    const btnIcon = document.createElement("img");
    btnIcon.src = chrome.runtime.getURL("public/bookmark.png");
    btnIcon.style.width = "24px";
    btnIcon.style.height = "24px";
    btnIcon.style.objectFit = "contain";

    bookmarkBtn.appendChild(btnIcon);

    const appendButtonInterval = setInterval(() => {
      const ytRightControls =
        document.getElementsByClassName("ytp-right-controls")[0];

      if (ytRightControls) {
        clearInterval(appendButtonInterval);

        if (!document.getElementsByClassName("bookmark-btn")[0]) {
          ytRightControls.appendChild(bookmarkBtn);
          bookmarkBtn.addEventListener("click", addBookmarkEventHandler);
        }

        isSearchingForControls = false;
      } else {
        if (!currentVideo) {
          clearInterval(appendButtonInterval);
          isSearchingForControls = false;
        }
      }
    }, 500);
  }

  newVideoLoaded();

  async function addBookmarkEventHandler() {
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
      chrome.storage.sync.set({
        [currentVideo]: JSON.stringify(
          [...currentVideoBookmarks, bookmark].sort((a, b) => a.time - b.time),
        ),
      });

      currentVideoBookmarks = await loadBookmarks();
    } catch (error) {
      console.log(
        "Storage failed. Context likely invalidated. Refresh the page.",
        error,
      );
    }
  }

  function loadBookmarks() {
    return new Promise((resolve) => {
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
