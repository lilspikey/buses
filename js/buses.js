$(function() {
    var get_storage = function() {
        if ( window.localStorage ) {
            return window.localStorage;
        }
        // TODO use in memory storage?
        alert('Sorry no local storage available');
    };
    
    var flip = function(front, back) {
        $(back).show(function() { 
            $(back).removeClass('hidden');
            $(front).addClass('hidden');
            setTimeout(function() { $(front).hide(); }, 1500);
        });
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
                var name = names[i];
                var page = paged.add_page(name);
                bus_stops.push(bus_stop(page, name));
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
    
    var paged = Paged.make_paged($('#paged'));
    paged.shown(function(page_id) {
        bus_stops = get_bus_stops();
        for ( var i = 0; i < bus_stops.length; i++ ) {
            var stop = bus_stops[i];
            if ( stop.name == page_id ) {
                current_stop = stop;
                current_stop.update();
                break;
            }
        }
        display_stops(bus_stops);
    });
    
    var display_stops = function(bus_stops) {
        $('#back ul#bus_stops li').remove();
        $('ul#stop_links li').remove();
        if ( bus_stops ) {
            for ( var i = 0; i < bus_stops.length; i++ ) {
                var stop = bus_stops[i];
                var active = (current_stop.name == stop.name);
                $('#back ul#bus_stops')
                    .append(
                        $('<li></li>').append(
                            $('<a></a>')
                                .text(stop.name)
                                .attr('href', stop.name)
                        )
                    );
                $('ul#stop_links')
                    .append(
                        $('<li></li>').append(
                            $('<a>&#149;</a>')
                                .attr('href', stop.name)
                                .addClass(active? 'active' : '')
                            )
                    );
            }
        }
    };
        
    $('ul#stop_links li a').live('click', function(event) {
        event.preventDefault();
        var name = $(this).attr('href');
        paged.show(name);
    });
    
    $('ul#bus_stops li a').live('click', function(event) {
        event.preventDefault();
        var name = $(this).attr('href');
        paged.show(name);
        flip('#back', '#front');
    });
    
    $('#front .settings a').live('click', function(event) {
        event.preventDefault();
        flip('#front', '#back');
    });
    
    $('#back form.add_stop').submit(function(event) {
        event.preventDefault();
        var name = $('#back form.add_stop input[name=stop_name]').val();
        var page = paged.add_page(name);
        var stop = bus_stop(page, name);
        stop.save();
        paged.show(name);
        flip('#back', '#front');
    });
    
    var bus_stops = get_bus_stops();
    var current_stop = bus_stops? bus_stops[0] : null;
    display_stops(bus_stops);
    
    $('#back').hide();
    
    if ( current_stop != null ) {
        current_stop.update();
    }
    else {
        flip('#front', '#back');
    }
});