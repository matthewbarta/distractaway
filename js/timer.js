let myPort = chrome.runtime.connect();
const bkg = chrome.extension.getBackgroundPage();

//TODO Switch to the proper options page.

//Controls the time display.
$(function () {
  myPort.onMessage.addListener(function (message) {
    //Otherwise get the time.
    let time = message.time;
    let seconds = time % 60;
    let hours = Math.floor(time / 3600);
    let minutes = Math.floor((time % 3600) / 60);
    $("#time").text(
      `${makeDoubleDigits(hours)}:${makeDoubleDigits(
        minutes
      )}:${makeDoubleDigits(seconds)}`
    );
    if (time <= 0) {
      window.close();
    }
  });

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

//For formatting the time.
function makeDoubleDigits(time) {
  if (time < 10) return "0" + time.toString();
  return time;
}
