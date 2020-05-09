var bkg = chrome.extension.getBackgroundPage();

$(function() {
    //Puts in the current url.
    chrome.storage.sync.get({current_url: ""}, function(url) {
        if(url.current_url != "") {
            //Regex to trim internet urls.
            let re = /[^(http)?(s)?(:\/\/)?](\w*\.)+\w*/;
            let old_url = url.current_url;
            let trimmed_url = re.exec(old_url);
            //If it is a trimmable url, trim it.
            if(trimmed_url != undefined) {
                $('#block-site').val(trimmed_url[0]);
                $("#url").text('*' + $('#block-site').val() + '*');
            }
            //Otherwise use the raw url.
            else {
                $('#block-site').val(old_url);
                $("#url").text('*' + $('#block-site').val() + '*');
            }
        }
        //If there isn't a current url set the text to be blank.
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
