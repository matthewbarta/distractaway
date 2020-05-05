//Initializes extension.
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({blockList: []}, function() {
      console.log("Initialized extension.");
    });
  });

//! Blocking Example
// chrome.webRequest.onBeforeRequest.addListener(
//     function(details) {return { cancel:true }},
//     {urls: ["*://*.zedo.com/*"]},
//     ["blocking"]
// );

//! Another option to consider.
// chrome.webNavigation.onCompleted.addListener(function() {
//   alert("This is my favorite website!");
// }, {url: [{urlMatches : 'https://www.youtube.com/'}]});