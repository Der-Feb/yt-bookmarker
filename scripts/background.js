chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("youtube.com/watch")
  ) {
    const queryParams = tab.url.split("?")[1];
    const urlParams = new URLSearchParams(queryParams);

    chrome.tabs.sendMessage(tabId, {
      type: "NEW",
      videoId: urlParams.get("v"),
    });
  }
});
