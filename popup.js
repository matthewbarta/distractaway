//Button to block a site.
let blockButton = document.getElementById("block-button")

//Currently just logs the URL.
blockButton.onclick = function() {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        var bkg = chrome.extension.getBackgroundPage();
        bkg.console.log(tabs[0].url)
    })
}