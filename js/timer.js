const bkg = chrome.extension.getBackgroundPage();

var myPort = chrome.runtime.connect({name:"port-from-cs"});

$(function() {
    myPort.onMessage.addListener(function(message) {
        let time = message.time;
        let seconds = time % 60;
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);
        $('#time').text(`${makeDoubleDigits(hours)}:${makeDoubleDigits(minutes)}:${makeDoubleDigits(seconds)}`);
        if(time == 0) {
            window.close();
        }
    });
});

function makeDoubleDigits(time) {
    if(time < 10) return '0' + time.toString();
    return time;
}
