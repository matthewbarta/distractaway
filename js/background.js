//Global variables
let timeList = [];
let blockList = [];
let activeIndex = -1;
let tabIndex;
let timer;
let midnightTimer;
let port;
let today;

//Initializes extension.
chrome.runtime.onInstalled.addListener(function () {
  today = new Date().getDay();
  const date = new Date();
  //Set basic information.
  chrome.storage.sync.set(
    { timeList: [], date: date.toJSON() },
    function () {
      console.log("Initialized extension.");
      midnightTimer = setTimeout(onMidnight, timeTillMidnight());
    }
  );
});

//Checks to perform when chrome is reopened.
chrome.runtime.onStartup.addListener(function () {
  if (midnightTimer) stopTimeout(midnightTimer);
  //Compare date since last startup.
  const currentDate = new Date();
  today = currentDate.getDay();
  chrome.storage.sync.get("date", function (items) {
    const lastDate = new Date(items.date);
    //If it is no longer the same day as the last time the extension was used.
    if (
      lastDate.getDay() != currentDate.getDay() ||
      lastDate.getDate() != currentDate.getDate() ||
      lastDate.getMonth() != currentDate.getMonth() ||
      lastDate.getFullYear() != currentDate.getFullYear()
    ) {
      resetDailyLimits(lastDate.getDay());
      chrome.storage.sync.set({ date: currentDate.toJSON() }, function () {
        console.log("NEW DATE SET to ");
        console.log(currentDate);
      });
    }
    //Set the midnight timer.
    midnightTimer = setTimeout(onMidnight, timeTillMidnight());
  });
});

//Connect the timer.js script.
chrome.runtime.onConnect.addListener((p) => {
  port = p;
});

//Removes the blocked site from the blockList.
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.unblock) {
    const unblockIndex = blockList.indexOf(`*://${message.unblock}/*`);
    if (unblockIndex != -1) {
      blockList.splice(unblockIndex, 1);
    }
    return;
  }
  //Toggles the page immediately.
  else if (message.settings) {
    setTimeout(() => {
      chrome.runtime.sendMessage({ settings: "yeet" });
    }, 100);
  }
  //For forwarding urls to the options script.
  else if (message.url) {
    setTimeout(() => {
      chrome.runtime.sendMessage({ url: message.url });
    }, 100);
  }
});

//Countdown method for when tabs are opened.
const reduceTime = (index) => {
  chrome.windows.getCurrent(function (window) {
    //If the window is not in the forefront, but also ask the user about this option.x
    if (window.state == "minimized") {
      return;
    }
    let time =
      timeList[index].time[today].dayLimit -
      timeList[index].time[today].timeUsed++;
    //! DEBUG
    console.log(time);
    //For the countdown - sends a message to the timer script.
    if (time >= 0) {
      //When time runs out.
      if (time <= 0) timeExceeded(index);
      if (port) {
        port.onDisconnect.addListener((p) => {
          if (p.error) {
            console.log(`There was a port error: ${p.error}`);
          }
          port = undefined;
          return;
        });
        //Failsafe, because the port can disconnect between the time the last statment is read and now.
        try {
          port.postMessage({ time: time });
        } catch (error) {
          console.log(error.message);
        }
      }
    }
    //If the tab is no longer correct.
  });
};

/* At midnight we want:
  -All blocked sites to be reset
  -Reset weekly day time for all apps.
  -Switch to the next day's popup/timers.
  -Clear timers.
*/
function onMidnight() {
  //Set the new date.
  chrome.storage.sync.set({ date: new Date().toJSON() }, function () {});
  //Reset blockist.
  blockList = [];
  //Clear timers.
  if (timer) clearInterval(timer);
  //Reset daily limit.
  resetDailyLimits(today);
  today = new Date().getDay();
  setDailyBlockList(today);
  //! Debugging.
  console.log("Midnight");
  //This should send a message to close the current popup.
  chrome.runtime.sendMessage({ midnight: "midnight" });
  if (timeList.length > 0 && activeIndex >= 0) {
    const url = timeList[activeIndex].url;
    activeIndex = -1;
    const timeState = getTabChangeState(url, today);
    timeActiveTab(timeState);
    changePopup(timeState);
  }
  setTimeout(onMidnight, timeTillMidnight());
}

//When time runs out - stop the timer and push the url to blocklist.
function timeExceeded(index) {
  stopCountdown(timer);
  blockList.push(`*://${timeList[index].url}/*`);
  chrome.browserAction.setPopup(
    {
      popup:
        "chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/blocked.html",
    },
    function () {}
  );
  //Set a timeout on the alert for good measure.
  setTimeout(() => {
    alert(`You have reached your daily limit on ${timeList[index].url}!`);
  }, 500);
}

//Resets the daily time limits for the last used day.
function resetDailyLimits(day) {
  for (let index = 0; index < timeList.length; index++) {
    timeList[index].time[day].timeUsed = 0;
  }
  chrome.storage.sync.set({ timeList: timeList }, function () {});
}

//Sets block list at midnight.
function setDailyBlockList(day) {
  for (let index = 0; index < timeList.length; index++) {
    if (timeList[index].time[day].dayLimit == 0) {
      blockList.push(`*://${timeList[index].url}/*`);
    }
  }
}

//Stop the midnight timeout.
const stopTimeout = (timeout) => {
  clearInterval(timeout);
};

//Function to stop the countdown.
const stopCountdown = (timer) => {
  clearInterval(timer);
  //Store the updated daily time used.
  chrome.storage.sync.set({ timeList: timeList }, function () {});
};

//Whenever the timeList gets a new component added update it on this script.
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.timeList) {
    timeList = changes.timeList.newValue;
  }
});

//When the tab changes, get the active tab and check if it's in the blocklist.
chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    let timeState = getTabChangeState(tab.url, today);
    timeActiveTab(timeState);
    changePopup(timeState);
  });
});

//Current active tab is updated.
chrome.tabs.onUpdated.addListener(function (id, info, tab) {
  //Check the tab is still valid.
  chrome.tabs.query({ active: true }, function (tabs) {
      let timeState = getTabChangeState(tabs[0].url, today);
      timeActiveTab(timeState);
      changePopup(timeState);
  });
});

//Checks if active tab is on the timed list, if so time it.
function timeActiveTab(timeState) {
  //If we change state to a blocked or untimed tab.
  if (
    timeState == "blocked" ||
    timeState == "untimed" ||
    timeState == "options"
  ) {
    if (timer) {
      stopCountdown(timer);
    }
  }
  //Swaps from an unlisted tab to a listed tab.
  else if (timeState == "untimedToTimed") {
    timer = setInterval(reduceTime, 1000, activeIndex);
  } else if (timeState == "changedTimedUrl") {
    stopCountdown(timer);
    //One second countdown timer on active tab.
    timer = setInterval(reduceTime, 1000, activeIndex);
  }
}

//Changes the current popup.
function changePopup(state) {
  if (state == "untimed") {
    chrome.browserAction.setPopup(
      {
        popup:
          "chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/popup.html",
      },
      function () {}
    );
  } else if (state == "blocked") {
    chrome.browserAction.setPopup(
      {
        popup:
          "chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/blocked.html",
      },
      function () {}
    );
  } else if (state == "options") {
    chrome.browserAction.setPopup(
      {
        popup:
          "chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/options-popup.html",
      },
      function () {}
    );
  } else if (state == "unrestricted") {
    chrome.browserAction.setPopup(
      {
        popup:
          "chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/unrestricted.html",
      },
      function () {}
    );
  } else {
    chrome.browserAction.setPopup(
      {
        popup:
          "chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/timer.html",
      },
      function () {}
    );
  }
}

//Gets the state of the tab which has been swapped to or updated.
function getTabChangeState(url, day) {
  //Loop over block list to see if the url is one that has been blocked.

  for (let index = 0; index < blockList.length; index++) {
    if (
      url.includes(blockList[index].substring(4, blockList[index].length - 2))
    ) {
      activeIndex = -1;
      return "blocked";
    }
  }

  //Loop over timed list to see if it one that is being timed still.
  for (let index = 0; index < timeList.length; index++) {
    if (url.includes(timeList[index].url)) {
      //Wasn't a blacklisted tab before.
      if (timeList[index].time[day].dayLimit == -1) {
        return "unrestricted";
      } else if (timeList[index].time[day].dayLimit == 0) {
        blockList.push(`*://${timeList[index].url}/*`);
        return "blocked";
      } else if (activeIndex == -1) {
        activeIndex = index;
        return "untimedToTimed";
      }
      //Same URL as before, keep the timer running.
      else if (activeIndex == index) {
        return "sameTimedUrl";
      }
      //Stop an existing timer on a previous tab, start a new one on a current tab.
      else {
        activeIndex = index;
        return "changedTimedUrl";
      }
    }
  }
  //The item isn't on either list.
  activeIndex = -1;
  if (
    url ==
    "chrome-extension://kpkacecdfjfpoiddkmcikpemmadefijm/html/options.html"
  )
    return "options";
  return "untimed";
}

//Returns the milliseconds till midnight.
function timeTillMidnight() {
  let now = new Date();
  let midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const timeDifference = now.getTime() - midnight.getTime();
  return Math.abs(timeDifference);
  // return 10 * 1000;
}

//Blocks sites whose time has run out.
chrome.webRequest.onBeforeRequest.addListener(
  function () {
    if (blockList.length > 0) {
      console.log(blockList);
      chrome.webRequest.onBeforeRequest.addListener(
        function () {
          if (blockList.length > 0) return { cancel: true };
        },
        { urls: blockList },
        ["blocking"]
      );
    } else {
      return { cancel: false };
    }
  },
  { urls: [] }
);
