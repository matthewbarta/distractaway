var bkg = chrome.extension.getBackgroundPage();

$(function() {
    chrome.storage.sync.get({current_url: ""}, function(url) {
        $("#url").text('*' + url.current_url + '*');
    })
    $("#block-site").keyup(function() {
        $("#url").text('*' + $('#block-site').val() + '*');
    });
});
