$(function() {
    var get_storage = function() {
        if ( window.localStorage ) {
            return window.localStorage;
        }
        // TODO use in memory storage?
        alert('Sorry no local storage available');
    };
    
    var flip = function(front, back) {
        $(front).addClass('hidden');
        $(back).removeClass('hidden');
    };
    
    var bus_stop = function(element, name) {
        var stop = {
            element: element,
            name: name,
            
            save: function() {
                add_bus_stop(this.name);
            },
            
            update: function() {
                var self = this;
                self.element.addClass('loading');
                self.element.find('.stopname').text(self.name);
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
    
    var _get_names = function() {
        var store = get_storage();
        var names = store.getItem('bus_stops') || '';
        names = names.split(/ /);
        var non_empty = []
        for ( var i = 0; i < names.length; i++ ) {
            if ( names[i] ) {
                non_empty.push(unescape(names[i]));
            }
        }
        return non_empty;
    };
    
    var get_bus_stops = function() {
        var names = _get_names()
        var bus_stops = [];
        if ( names ) {
            for ( var i = 0; i < names.length; i++ ) {
                bus_stops.push(bus_stop($('#front .details'), names[i]));
            }
        }
        return bus_stops;
    };
    
    var add_bus_stop = function(name) {
        var store = get_storage();
        var names = _get_names()
        if ( $.inArray(name, names) < 0 ) {
            names.push(name);
            for ( var i = 0; i < names.length; i++ ) {
                names[i] = escape(names[i]);
            }
            store.setItem('bus_stops', names.join(' '));
        }
    }
        
    $('#front a.settings').click(function(event) {
        event.preventDefault();
        flip('#front', '#back');
    });
    
    $('#back form.add_stop').submit(function(event) {
        event.preventDefault();
        var name = $('#back form.add_stop input[name=stop_name]').val();
        current_stop = bus_stop($('#front .details'), name);
        current_stop.save();
        current_stop.update();
        flip('#back', '#front');
    });
    
    var bus_stops = get_bus_stops();
    var current_stop = bus_stops? bus_stops[0] : null;
    
    if ( current_stop != null ) {
        current_stop.update();
    }
});