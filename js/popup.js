//TODO submit same url twice and allow it to show up in input bar.

const bkg = chrome.extension.getBackgroundPage();

$(function () {
  //When the block button is clicked.
  $("#block-button").click(function () {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      //Gets the current list and adds the new url to it.
      chrome.storage.sync.set({ currentURL: tabs[0].url }, function () {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL("../html/options.html"));
        }
      });
    });
  });

  //Test to toggle divs.
  $("#not-blocked-text").click(function() {
    $("#popup-not-blocked").hide();
    $("#popup-timer").show();
  });

});
