$(function() {
    var flip = function(front, back) {
        $(front).addClass('hidden');
        $(back).removeClass('hidden');
    };
    
    $('#front a.settings').click(function(event) {
        event.preventDefault();
        flip('#front', '#back');
    });
    
    $('#back button.done').click(function(event) {
        event.preventDefault();
        flip('#back', '#front');
    });
});