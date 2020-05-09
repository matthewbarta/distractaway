$(function() {
    $("#block-site").keyup(function() {
        $("#url").text('*' + $('#block-site').val() + '*');
    });
});