let currentList = [];

//Initializes extension.
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({ blockList: [], current_url: "" }, function () {
    console.log("Initialized extension.");
  });
});

//
chrome.storage.onChanged.addListener(function (changes, areaName) {
  if (changes.blockList != undefined) {
    currentList = changes.blockList.newValue;
  } else {
    console.log("ignore");
  }
  console.log(currentList);
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


//! Another option to consider.
// chrome.webNavigation.onCompleted.addListener(function() {
//   alert("This is my favorite website!");
// }, {url: [{urlMatches : 'https://www.youtube.com/'}]});
