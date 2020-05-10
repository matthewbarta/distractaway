let currentList = [];

//Initializes extension.
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({ blockList: [], current_url: "" }, function () {
    console.log("Initialized extension.");
  });
});

//Update the currentList variable.
chrome.storage.onChanged.addListener(function (changes, areaName) {
  if (changes.blockList != undefined) {
    currentList = changes.blockList.newValue;
  } else {
    // Do nothing.
  }
});

//Currently this blocks the added urls.
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        if(currentList.length > 0) {
          chrome.webRequest.onBeforeRequest.addListener(
            function(details) {
              return {cancel: true};
            }, {urls: currentList}, ["blocking"]
          );
        }
        else {
          return {cancel: false};
        }
    }, {urls: []}
);
