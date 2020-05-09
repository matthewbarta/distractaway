var bkg = chrome.extension.getBackgroundPage();

$(function() {
    //Puts in the current url.
    chrome.storage.sync.get({current_url: ""}, function(url) {
        if(url.current_url != "") {
            $('#block-site').val(url.current_url);
            $("#url").text('*' + $('#block-site').val() + '*');
        }
        else {
            $("#url").text('');
        }
    });
    //When modifying the url.
    $("#block-site").keyup(function() {
        if( $('#block-site').val() != '') {
            $("#url").text('*' + $('#block-site').val() + '*');
        }
        else {
            $("#url").text($('#block-site').val());
        }
    });
    //On submission
    $('#submit-button').click(function() {
        bkg.console.log("Something was submitted.")
        let val = $('#block-site').val();
        if(val) {
            $('#block-site').val('');
            $("#url").text($('#block-site').val());

        }
        else {
            bkg.console.log("Empty url.")
        }
    })
});
