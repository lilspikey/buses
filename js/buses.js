$(function() {
    var flip = function(front, back) {
        $(front).addClass('hidden');
        $(back).removeClass('hidden');
    };
    
    var bus_stop = function(element, name) {
        var stop = {
            element: element,
            name: name,
            
            update: function() {
                var self = this;
                self.element.addClass('loading');
                $.ajax({
                    url: 'dyn/times/' + escape(self.name),
                    cache: false,
                    dataType: 'json',
                    success: function(result) {
                        if ( result ) {
                            self.element.find('.stopname').text(result.name);
                            var tbody = self.element.find('.timetable tbody');
                            tbody.find('tr').each(function(i) {
                                var row = $(this);
                                if ( i >= result.times.length ) {
                                    row.find('td').html('&nbsp;');
                                }
                                else {
                                    var time = result.times[i];
                                    row.find('td.route').text(time.route);
                                    row.find('td.destination').text(time.destination);
                                    row.find('td.departure').text(time.departure);
                                }
                            });
                        }
                        self.element.removeClass('loading');
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown) {
                        alert(textStatus);
                        self.element.removeClass('loading');
                    }
                });
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
        current_stop = bus_stop($('#front .details'), name);
        current_stop.update();
        flip('#back', '#front');
    });
    
});