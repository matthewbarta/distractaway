let myPort = chrome.runtime.connect();
const bkg = chrome.extension.getBackgroundPage();

//Controls the time display.
$(function() {
    myPort.onMessage.addListener(function(message) {
        //Close the window if it's midnight.
        if(message.midnight != undefined) {
            window.close();
            return;
        }
        //Otherwise get the time.
        let time = message.time;
        let seconds = time % 60;
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time % 3600) / 60);
        $('#time').text(`${makeDoubleDigits(hours)}:${makeDoubleDigits(minutes)}:${makeDoubleDigits(seconds)}`);
        if(time == 0) {
            window.close();
        }
    });
});

//For formatting the time.
function makeDoubleDigits(time) {
    if(time < 10) return '0' + time.toString();
    return time;
}

