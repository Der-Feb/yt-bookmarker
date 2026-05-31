import { getActiveTabUrl } from "./utils/helper.js"; // Correct path to utils folder

function getTimeString(t) {
  const date = new Date(0);
  date.setSeconds(t);
  return date.toISOString().substr(11, 8);
}

function viewAllBookmarks(allVideoBookmarks = {}) {
  const bookmarksElement = document.getElementById("bookmarks");
  if (!bookmarksElement) return;

  bookmarksElement.innerHTML = "";
  const videoIds = Object.keys(allVideoBookmarks);

  if (videoIds.length === 0) {
    bookmarksElement.innerHTML =
      "<i class='no-bookmarks'>No bookmarks saved yet!</i>";
    return;
  }

  for (let videoId of videoIds) {
    let bookmarks = [];
    try {
      bookmarks = JSON.parse(allVideoBookmarks[videoId]);
    } catch (e) {
      continue;
    }

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) continue;

    const videoGroup = document.createElement("div");
    videoGroup.className = "video-group";

    const groupTitle = document.createElement("div");
    groupTitle.className = "video-group-title";
    groupTitle.textContent = bookmarks[0].title || `Video ID: ${videoId}`;
    videoGroup.appendChild(groupTitle);

    for (let bookmark of bookmarks) {
      const itemRow = document.createElement("div");
      itemRow.className = "bookmark-item";

      const infoContainer = document.createElement("div");
      infoContainer.className = "bookmark-info";

      const timeStampBadge = document.createElement("span");
      timeStampBadge.className = "timestamp-badge";
      timeStampBadge.textContent = getTimeString(bookmark.time);

      const descText = document.createElement("span");
      descText.className = "bookmark-description-text";
      descText.textContent = bookmark.description;

      infoContainer.appendChild(timeStampBadge);
      infoContainer.appendChild(descText);

      const controls = document.createElement("div");
      controls.className = "bookmark-controls";

      // 1. PLAY BUTTON
      const playBtn = document.createElement("img");
      playBtn.src = "../public/play.png"; // Step up from scripts/ to public/
      playBtn.title = "Play from this timestamp";
      playBtn.className = "control-btn";
      playBtn.addEventListener("click", async () => {
        const activeTab = await getActiveTabUrl();
        if (!activeTab) return;

        const currentUrl = new URL(activeTab.url);
        const currentTabVideoId = currentUrl.searchParams.get("v");

        if (currentTabVideoId === videoId) {
          chrome.tabs.sendMessage(activeTab.id, {
            type: "PLAY",
            value: bookmark.time,
          });
        } else {
          const roundedTime = Math.floor(bookmark.time);
          const targetUrl = `https://www.youtube.com/watch?v=${videoId}&t=${roundedTime}s`;
          chrome.tabs.update(activeTab.id, { url: targetUrl });
        }
      });

      // 2. SHARE LINK (Hooked up, copying the full watch URL format)
      const shareBtn = document.createElement("img");
      shareBtn.src = "../public/share.png";
      shareBtn.title = "Copy timestamped video link";
      shareBtn.className = "control-btn";

      // CRITICAL FIX: Explicitly adding the missing event listener to the element!
      shareBtn.addEventListener("click", () => {
        const roundedTime = Math.floor(bookmark.time);
        // Explicitly formats exactly to the direct YouTube watch target string structure
        const shareUrl = `https://www.youtube.com/watch?v=${videoId}&t=${roundedTime}s`;

        navigator.clipboard
          .writeText(shareUrl)
          .then(() => {
            // Swap to checkmark icon immediately
            shareBtn.src = "../public/tick.png";
            shareBtn.title = "Copied to clipboard!";

            // Loop back to the share arrow icon after 600ms
            setTimeout(() => {
              shareBtn.src = "../public/share.png";
              shareBtn.title = "Copy timestamped video link";
            }, 600);
          })
          .catch((err) => {
            console.error("Clipboard operational block encountered:", err);
          });
      });

      // 3. EDIT DESCRIPTION
      const editBtn = document.createElement("img");
      editBtn.src = "../public/edit.png";
      editBtn.title = "Edit notes";
      editBtn.className = "control-btn";
      editBtn.addEventListener("click", () => {
        const newDesc = prompt(
          "Edit your bookmark notes:",
          bookmark.description,
        );
        if (newDesc !== null && newDesc.trim() !== "") {
          chrome.storage.sync.get([videoId], (results) => {
            let list = results[videoId] ? JSON.parse(results[videoId]) : [];
            list = list.map((item) => {
              if (Math.floor(item.time) === Math.floor(bookmark.time)) {
                item.description = newDesc;
              }
              return item;
            });
            chrome.storage.sync.set({ [videoId]: JSON.stringify(list) }, () => {
              descText.textContent = newDesc;
              bookmark.description = newDesc;
            });
          });
        }
      });

      // 4. DELETE TIMESTAMP
      const deleteBtn = document.createElement("img");
      deleteBtn.src = "../public/delete.png";
      deleteBtn.title = "Delete";
      deleteBtn.className = "control-btn";
      deleteBtn.addEventListener("click", () => {
        chrome.storage.sync.get([videoId], (results) => {
          let list = results[videoId] ? JSON.parse(results[videoId]) : [];
          list = list.filter(
            (item) => Math.floor(item.time) !== Math.floor(bookmark.time),
          );

          if (list.length === 0) {
            chrome.storage.sync.remove([videoId], () => {
              itemRow.remove();
              if (videoGroup.querySelectorAll(".bookmark-item").length === 0) {
                videoGroup.remove();
              }
              chrome.storage.sync.get(null, (allData) =>
                viewAllBookmarks(allData),
              );
            });
          } else {
            chrome.storage.sync.set({ [videoId]: JSON.stringify(list) }, () => {
              itemRow.remove();
            });
          }
        });
      });

      // Add everything sequentially to the layout container row
      controls.appendChild(playBtn);
      controls.appendChild(shareBtn);
      controls.appendChild(editBtn);
      controls.appendChild(deleteBtn);

      itemRow.appendChild(infoContainer);
      itemRow.appendChild(controls);
      videoGroup.appendChild(itemRow);
    }

    bookmarksElement.appendChild(videoGroup);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(null, (allVideoBookmarks) => {
    viewAllBookmarks(allVideoBookmarks);
  });
});
