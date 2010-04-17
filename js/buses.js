$(function() {
    var flip = function(front, back) {
        $(front).addClass('hidden');
        $(back).removeClass('hidden');
    };
    
    var busstop = function(element, name) {
        var stop = {
            element: element,
            name: name,
            
            update: function() {
                this.element.find('.stopname').text(this.name);
            }
        };
        
        return stop;
    };
    
    var current_stop = null;
    
    $('#front a.settings').click(function(event) {
        event.preventDefault();
        flip('#front', '#back');
    });
    
    $('#back button.done').click(function(event) {
        event.preventDefault();
        var name = $('#back form.add_stop input[name=stop_name]').val();
        current_stop = busstop($('#front .details'), name);
        current_stop.update();
        flip('#back', '#front');
    });
    
});