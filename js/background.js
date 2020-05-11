let timeList = [];
let blockList = [];
//let timerActive = false;
let activeIndex = -1;
let timer;

//Initializes extension.
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({timeList: [], blockList: [], current_url: "" }, function () {
    console.log("Initialized extension.");
  });
});

//Countdown method for when tabs are opened.
const reduceTime = (index) => {
  timeList[index].time--;
  console.log(timeList[index].time)
  if(timeList[index].time == 0) {
      stopCountdown(timer);
  }
};

//Function to stop the countdown.
const stopCountdown = (timer) => {
  clearInterval(timer)
  alert(`You have ${timeList[activeIndex].time} seconds left on ${timeList[activeIndex].url}!`);
};

//Checks if active tab is on the timed list, if so time it.
function timeActiveTab(url) {
  for(let index = 0; index < timeList.length; index++) {
    if(url.includes(timeList[index].url)) {
      if(activeIndex == -1) {
        //The timer should already be running.
        timer = setInterval(reduceTime, 1000, index);
        activeIndex = index;
        return;
      }
      else if(activeIndex == index) {
        //Same index as before, do nothing.
        return;
      }
      //Stop an existing timer on a previous tab, start a new one on a current tab.
      else {
        stopCountdown(timer);
        activeIndex = index;
        //One second countdown timer on active tab.
        timer = setInterval(reduceTime,1000, index);
        return;
      }
    }
  }
  activeIndex = -1;
}

// TODO remember to update this later when it is time to use the blocklist, if needed.
// chrome.storage.onChanged.addListener(function (changes) {
//   if (changes.blockList != undefined) {
//     blockList = changes.blockList.newValue;
//   }
// });


//Whenever the timeList gets a new component added update it on this script.
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.timeList != undefined) {
    timeList = changes.timeList.newValue;
  }
});

// TODO Remember to use this to block sites later when the block list is running.
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
    timeActiveTab(tab.url);
  });
});

//Current active tab is updated.
chrome.tabs.onUpdated.addListener(function(id, info, tab) {
  timeActiveTab(tab.url);
});



//TODO When blocking a URL, add the match schemes for webRequest urls.
//url = '*://' + url + '/*';
//blockList.push(url)
