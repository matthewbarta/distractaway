//! FOR DEBUGGING
const bkg = chrome.extension.getBackgroundPage();

$(function () {
  //When the block button is clicked.
  $("#block-button").click(function () {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      //Opens the options plage.
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL("../html/options.html"));
      }
      //Sends the new URL to either the BG script or to the options script.
      chrome.runtime.sendMessage({ url: tabs[0].url });
    });
  });
});
