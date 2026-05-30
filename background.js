chrome.tabs.onUpdated.addListener((tabId, tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    const queryParameters = tab.url.split("?")[1];
    const urlParams = new URLSearchParams(queryParameters);
    console.log("Url parameters: ", urlParams);

    chrome.tabs.sendMessage(tabId, {
      type: "NEW",
      videoId: urlParams.get("v"),
    });
  }
});
