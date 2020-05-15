//Global variables
let timeList = [];
let blockList = [];
let activeIndex = -1;
let timer;
let port;

//TODO set up days

//TODO Doesn't clear form on submission.
let day = 0;

//TODO popup for when the site is blocked, but just not on that specific day - links to sitelist, also a blocked all day popup redirects to BLOCKED.

//Initializes extension.
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({timeList: [], currentURL: "" }, function () {
    console.log("Initialized extension.");
  });
});

//Connect the timer.js script.
chrome.runtime.onConnect.addListener((p) => {
  port = p;
});

//Countdown method for when tabs are opened.
const reduceTime = (index) => {
  let time = timeList[index].time[day].dayLimit - timeList[index].time[day].dailyTime++;
  //For the countdown - sends a message to the timer script.
  if(time >= 0) {
    //When time runs out.
    if(time == 0) timeExceeded(index);
    if(port != undefined) {
      port.onDisconnect.addListener((p) => {
        if(p.error) {
          console.log(`There was a port error: ${p.error}`);
        }
        port = undefined;
        return;
      });
      //Failsafe, because the port can disconnect between the time the last statment is read and now.
      try {
        port.postMessage({time: time});
      }
      catch(error) {
        console.log(error.message);
      }
    }
  }
};

//When time runs out - stop the timer and push the url to blocklist.
function timeExceeded(index) {
  stopCountdown(timer);
  blockList.push(`*://${timeList[index].url}/*`);
  chrome.browserAction.setPopup({popup: 'chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/blocked.html'}, function(){});
  //Set a timeout on the alert for good measure.
  setTimeout(() => {
    alert(`You have reached your daily limit on ${timeList[index].url}!`);
  }, 1000);
}

//Function to stop the countdown.
const stopCountdown = (timer) => {
  clearInterval(timer);
  //Store the updated daily time used.
  chrome.storage.sync.set({timeList: timeList}, function() {});
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
    let timeState = getTabChangeState(tab.url);
    timeActiveTab(timeState);
    changePopup(timeState);
  });
});

//Current active tab is updated.
chrome.tabs.onUpdated.addListener(function(id, info, tab) {
  let timeState = getTabChangeState(tab.url);
  timeActiveTab(timeState);
  changePopup(timeState);
});

//Checks if active tab is on the timed list, if so time it.
function timeActiveTab(timeState) {
  //If we change state to a blocked or untimed tab.
  if(timeState == 'blocked' || timeState == 'untimed' || timeState == 'options') {
    if(timer != undefined) {
      stopCountdown(timer);
    }
  }
  //Swaps from an unlisted tab to a listed tab.
  else if(timeState == 'untimedToTimed') {
    timer = setInterval(reduceTime, 1000, activeIndex);
  }
  else if(timeState == 'changedTimedUrl') {
    stopCountdown(timer);
    //One second countdown timer on active tab.
    timer = setInterval(reduceTime,1000, activeIndex);
  }
}

//Changes the current popup.
function changePopup(state) {
  if(state == 'untimed') {
    chrome.browserAction.setPopup({popup: 'chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/popup.html'}, function(){});
  }
  else if(state == 'blocked') {
    chrome.browserAction.setPopup({popup: 'chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/blocked.html'}, function(){});
  }
  else if(state == 'options') {
    chrome.browserAction.setPopup({popup: 'chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/options-popup.html'}, function(){});
  }
  else {
    chrome.browserAction.setPopup({popup: 'chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/timer.html'}, function(){});
  }
}

//Gets the state of the tab which has been swapped to or updated.
function getTabChangeState(url) {
  //Loop over block list to see if the url is one that has been blocked.
  for(let index = 0; index < blockList.length; index++) {
    if(url.includes(blockList[index].substring(4, blockList[index].length - 2))) {
      activeIndex = - 1;
      return 'blocked';
    }
  }
  //Loop over timed list to see if it one that is being timed still.
  for(let index = 0; index < timeList.length; index++) {
    if(url.includes(timeList[index].url)) {
      //Wasn't a blacklisted tab before.
      if(activeIndex == -1) {
        activeIndex = index;
        return 'untimedToTimed';
      }
      //Same URL as before, keep the timer running.
      else if(activeIndex == index) {
        return 'sameTimedUrl';
      }
      //Stop an existing timer on a previous tab, start a new one on a current tab.
      else {
        activeIndex = index;
        return 'changedTimedUrl'
      }
    }
  }
  //The item isn't on either list.
  activeIndex = -1;
  if(url == 'chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/options.html') return 'options';
  return 'untimed';
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