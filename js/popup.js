//Button to block a site.
let blockButton = document.getElementById("block-button");

//Currently just logs the URL.
blockButton.onclick = function() {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        var bkg = chrome.extension.getBackgroundPage();
        //Gets the current list and adds the new url to it.
        chrome.storage.sync.set({current_url: tabs[0].url}, function() {
            bkg.console.log("Url: " + tabs[0].url + " sent!");
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            }
            else {
                window.open(chrome.runtime.getURL('../html/options.html'));
            }
        });

        //Function to get previous blocklist.
        // chrome.storage.sync.get('blockList', function(items) {
        //     let blockList = items.blockList;
        //     updateBlockList(blockList, tabs[0].url, bkg)
        // });
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