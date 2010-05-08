$(function() {
    var get_storage = function() {
        if ( window.localStorage ) {
            return window.localStorage;
        }
        // TODO use in memory storage?
        alert('Sorry no local storage available');
    };
    
    if ( window.applicationCache ) {
        var cache = window.applicationCache;
        
        var cacheUpdatereadyListener = function() {
            cache.swapCache();
            $('#status').text('update ready');
            window.location.reload();
        };
        
        var cacheErrorListener = function() {
            $('#status').text('cache error');
        };
        
        cache.addEventListener('updateready', cacheUpdatereadyListener, false);
        cache.addEventListener('error', cacheErrorListener, false);
    }
    
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
                            if ( result.error ) {
                                self.element.find('.stop_status').text(result.error);
                            }
                            else {
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
    
    var serialize_array = function(arr) {
        arr = $.map(arr, function(n, i) {
            return escape(n);
        });
        return arr.join(' ');
    }
    
    var add_bus_stop = function(name) {
        var store = get_storage();
        var names = _get_names()
        if ( $.inArray(name, names) < 0 ) {
            names.push(name);
            store.setItem('bus_stops', serialize_array(names));
        }
    }
    
    var remove_bus_stop = function(name) {
        var store = get_storage();
        var names = _get_names()
        names = $.grep(names, function(n, i) {
            return (n != name);
        });
        store.setItem('bus_stops', serialize_array(names));
        
        if ( _current_stop.name == name ) {
            _current_stop = null;
        }
    }
    
    var paged = Paged.make_paged($('#paged'));
    paged.shown(function(page_id) {
        bus_stops = get_bus_stops();
        for ( var i = 0; i < bus_stops.length; i++ ) {
            var stop = bus_stops[i];
            if ( stop.name == page_id ) {
                set_current_stop(stop);
                stop.update();
                break;
            }
        }
        display_stops(bus_stops);
    });
    
    var display_stops = function(bus_stops) {
        $('#back ul#bus_stops li').remove();
        $('ul#stop_links li').remove();
        if ( bus_stops ) {
            var current_stop = get_current_stop();
            for ( var i = 0; i < bus_stops.length; i++ ) {
                var stop = bus_stops[i];
                var active = ((current_stop == null && i == 0) || current_stop.name == stop.name);
                $('#back ul#bus_stops')
                    .append(
                        $('<li></li>').append(
                            $('<a class="view"></a>')
                                .text(stop.name)
                                .attr('href', stop.name)
                        ).append(
                            $('<a class="delete">[x]</a>')
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
    
    $('ul#bus_stops li a.view').live('click', function(event) {
        event.preventDefault();
        var name = $(this).attr('href');
        paged.show(name);
        flip('#back', '#front');
    });
    
    $('ul#bus_stops li a.delete').live('click', function(event) {
        event.preventDefault();
        var name = $(this).attr('href');
        if ( confirm('Remove: ' + name + '?') ) {
            remove_bus_stop(name);
            bus_stops = get_bus_stops();
            paged.remove_page(name);
            display_stops(bus_stops);
        }
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
    var _current_stop = null;
    var set_current_stop = function(current_stop) {
        _current_stop = current_stop;
        var store = get_storage();
        store.setItem('current_stop', current_stop.name);
    }
    var get_current_stop = function() {
        if ( !_current_stop ) {
            var store = get_storage();
            var name = store.getItem('current_stop');
            for ( var i = 0; i < bus_stops.length; i++ ) {
                if ( bus_stops[i].name == name ) {
                    _current_stop = bus_stops[i];
                    return _current_stop;
                }
            }
            _current_stop = bus_stops? bus_stops[0] : null;
        }
        return _current_stop;
    }
    display_stops(bus_stops);
    
    $('#back').hide();
    
    _current_stop = get_current_stop();
    if ( _current_stop != null ) {
        _current_stop.update();
        paged.show(_current_stop.name);
    }
    else {
        flip('#front', '#back');
    }

    setInterval(function() {
        if ( _current_stop ) {
            _current_stop.update();
        }
    }, 30*1000);
});