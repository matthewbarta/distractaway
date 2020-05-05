//Button to block a site.
let blockButton = document.getElementById("block-button");

//Currently just logs the URL.
blockButton.onclick = function() {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        var bkg = chrome.extension.getBackgroundPage();
        //bkg.console.log(tabs[0].url)
        alert(tabs[0].url)
        chrome.storage.sync.get({blockList}, function(items) {
            let blockList = items.blockList;
            blockList.push(tabs[0].url)
            chrome.storage.sync.set({blockList: blockList}, function() {
                bkg.console.log('URL: ' + tabs[0].url + ' added');
            });
            bkg.console.log(items);
        })
        //Open the options page.
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        }
        else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    })
}