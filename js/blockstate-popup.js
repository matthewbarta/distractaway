$(function () {
  //Closes the window at midnight
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.midnight != undefined) {
      window.close();
      return;
    }
  });
});
