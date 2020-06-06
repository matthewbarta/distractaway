const bkg = chrome.extension.getBackgroundPage();

$(function () {
  //TODO OPEN TO THE SITE LIST if possible.
  $(`#settings-button`).click(function () {
    //Open an options window if one is not open.
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("../html/options.html"));
    }
    //Send a message to either the options page or to the background script who will forward it with a delay.
    chrome.runtime.sendMessage({settings: 'yeet'});
  });
});

//Closes the window at midnight
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.midnight) {
    window.close();
    return;
  }
});
