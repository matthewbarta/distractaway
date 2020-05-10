var bkg = chrome.extension.getBackgroundPage();

$(function() {
    //Puts in the current url.
    chrome.storage.sync.get({current_url: ""}, function(url) {
        if(url.current_url != "") {
            //Regex to trim internet urls.
            let re = /([a-zA-Z-]*\.)+\w*/;
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
        let url = $('#block-site').val();
        if(url) {
            $('#block-site').val('');
            $("#url").text($('#block-site').val());
            url = '*://' + url + '/*';
            //Store the given url if it is not a duplicated.
            chrome.storage.sync.get(['blockList'], function(items) {
                let list = items.blockList;
                bkg.console.log(list);
                storeBlocked(list, url, bkg);
            })
        }
        else {
            bkg.console.log("Empty url.")
        }
    })
});

//Checks for a duplicate link, if none exists, add the site to the blocked list.
function storeBlocked(array, url_to_add) {
    //If the link is a duplicate.
    if(array.includes(url_to_add)) {
        alert('ERROR: This link has already been added to the site list!')
    }
    //If it's a unique URL add it to the blocklist.
    else {
        array.push(url_to_add);
        chrome.storage.sync.set({blockList: array}, function() {
            //Do something after set.
        });
    }
}
