//Global variables
let timeList = [];
let blockList = [];
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
  console.log(timeList[index].time);
  //When time runs out.
  if(timeList[index].time == 0) timeExceeded(index);
};

//When time runs out - stop the timer and push the url to blocklist.
function timeExceeded(index) {
  stopCountdown(timer);
  alert(`You have reached your daily limit on ${timeList[index].url}`);
  blockList.push(`*://${timeList[index].url}/*`);
}

//Function to stop the countdown.
const stopCountdown = (timer) => {
  clearInterval(timer);
};

//Whenever the timeList gets a new component added update it on this script.
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.timeList != undefined) {
    timeList = changes.timeList.newValue;
  }
});

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

//Checks if active tab is on the timed list, if so time it.
function timeActiveTab(url) {
  for(let index = 0; index < timeList.length; index++) {
    if(url.includes(timeList[index].url)) {
      if(activeIndex == -1) {
        //Start a timer.
        timer = setInterval(reduceTime, 1000, index);
        activeIndex = index;
        return;
      }
      //Same URL as before, keep the timer running.
      else if(activeIndex == index) {
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
  //If the item isn't on the blocklist and there is an active timer, shut it off.
  if(timer != undefined) stopCountdown(timer);
  activeIndex = -1;
}

//Blocks sites whose time has run out.
chrome.webRequest.onBeforeRequest.addListener(
    function() {
        if(blockList.length > 0) {
          chrome.webRequest.onBeforeRequest.addListener(
            function() {
              return {cancel: true};
            }, {urls: blockList}, ["blocking"]
          );
        }
        else {
          return {cancel: false};
        }
    }, {urls: []}
);