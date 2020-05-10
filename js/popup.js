//Currently just logs the URL.
$(function () {
  //When the block button is clicked.
  $("#block-button").click(function () {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      var bkg = chrome.extension.getBackgroundPage();
      //Gets the current list and adds the new url to it.
      chrome.storage.sync.set({ current_url: tabs[0].url }, function () {
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

//Updates the blockList array.
function updateBlockList(array, url, /*For debugging*/ bkg) {
  array.push(url);
  chrome.storage.sync.set({ blockList: array }, function () {
    // Open the options page.
    bkg.console.log(array);
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("../html/options.html"));
    }
  });
}
