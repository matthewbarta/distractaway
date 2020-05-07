//Button to block a site.
let blockButton = document.getElementById("block-button");

//Currently just logs the URL.
blockButton.onclick = function() {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        var bkg = chrome.extension.getBackgroundPage();
        //bkg.console.log(tabs[0].url)
        alert(tabs[0].url)
        chrome.storage.sync.get('blockList', function(items) {
            let blockList = items.blockList;
            updateBlockList(blockList, tabs[0].url, bkg)
        });
    })
}

//Updates the blockList array.
function updateBlockList(array, url, /*For debugging*/ bkg) {
    array.push(url)
    chrome.storage.sync.set({blockList: array}, function() {
        // Open the options page.
        bkg.console.log(array)
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        }
        else {
            window.open(chrome.runtime.getURL('../html/options.html'));
        }
    });
}