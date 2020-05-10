let timeList = [];
let blockList = [];

//Initializes extension.
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({timeList: [], blockList: [], current_url: "" }, function () {
    console.log("Initialized extension.");
  });
});

//Update the currentList variable.
// chrome.storage.onChanged.addListener(function (changes) {
//   if (changes.blockList != undefined) {
//     blockList = changes.blockList.newValue;
//   }
// });

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.timeList != undefined) {
    timeList = changes.timeList.newValue;
  }
  console.log(timeList);
});

//Currently this blocks the added urls.
// chrome.webRequest.onBeforeRequest.addListener(
//     function() {
//         if(blockList.length > 0) {
//           chrome.webRequest.onBeforeRequest.addListener(
//             function() {
//               return {cancel: true};
//             }, {urls: blockList}, ["blocking"]
//           );
//         }
//         else {
//           return {cancel: false};
//         }
//     }, {urls: []}
// );

//When the tab changes, get the active tab and check if it's in the blocklist.
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    console.log(tab.url);
  })
});

//Current active tab is updated.
chrome.tabs.onUpdated.addListener(function(id, info, tab) {
  console.log('UPDATED')
  console.log(tab.url)
});
