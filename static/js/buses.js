$(function() {
    var _json_store = {
        getItem: function(key, defaultValue) {
            try {
                var value = window.localStorage.getItem(key);
                return JSON.parse(value);
            }
            catch(SyntaxError) {
                return defaultValue;
            }
        },
        
        setItem: function(key, value) {
            value = JSON.stringify(value);
            window.localStorage.setItem(key, value);
        }
    };
    
    var get_storage = function() {
        if ( window.localStorage ) {
            return _json_store;
        }
        // TODO use in memory storage?
        alert('Sorry no local storage available');
    };
    
    if ( window.applicationCache ) {
        var cache = window.applicationCache;
        
        var cacheUpdatereadyListener = function() {
            cache.swapCache();
            $('#update').html('New version available: <button type="submit">Update</button> <a href="#">x</a>').slideDown();
        };
        
        var cacheErrorListener = function() {
            $('#status').text('cache error');
        };
        
        cache.addEventListener('updateready', cacheUpdatereadyListener, false);
        cache.addEventListener('error', cacheErrorListener, false);
        
        $('#update button').live('click', function(event) {
            event.preventDefault();
            window.location.reload();
        });
        $('#update a').live('click', function(event) {
            event.preventDefault();
            $('#update').slideUp();
        });
    }
    
    if ( navigator.geolocation ) {
        $('#id_find_nearby').click(function(event) {
            event.preventDefault();
            $('form.stop_search').addClass('loading');
            var start_watch = new Date().getTime();
            var watch_id = navigator.geolocation.watchPosition(
                function(position) {
                    $('form.stop_search').addClass('loading');
                    var latitude = position.coords.latitude;
                    var longitude = position.coords.longitude;
                    $.ajax({
                        url: 'dyn/search?ll=' + escape(latitude + ',' + longitude),
                        cache: false,
                        dataType: 'json',
                        success: function(result) {
                            display_search_results(result, {lat: latitude, lng: longitude});
                        },
                        complete: function() {
                            $('form.stop_search').removeClass('loading');
                        }
                    });
                    
                    if (
                        (new Date().getTime() - start_watch) > 15*1000
                    || (position.coords.accuracy <= 10)
                     ) {
                        navigator.geolocation.clearWatch(watch_id);
                    }
                },
                function(code) {
                    if ( code != 1 ) {
                        alert("Error getting position");
                    }
                    $('form.stop_search').removeClass('loading');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 30*1000
                }
            );
        });
    }
    else {
        $('.uses_geolocation').hide();
    }
    
    var flip = function(front, back) {
        $(back).show(function() { 
            $(back).removeClass('hidden');
            $(front).addClass('hidden');
            setTimeout(function() { $(front).hide(); }, 1500);
        });
    };
    
    var format_date = function(date) {
        var hour = date.getHours();
        var min  = date.getMinutes();
        var sec  = date.getSeconds();
        
        return hour + 
            ':' + (min < 10?('0' + min): min) +
            ':' + (sec < 10?('0' + sec): sec);
    }
    
    var bus_stop = function(element, id, name) {
        var stop = {
            element: element,
            id: id,
            name: name,
            
            save: function() {
                add_bus_stop(this.id, this.name);
            },
            
            update: function() {
                var self = this;
                self.element.addClass('loading');
                self.element.find('.stopname').text(self.name);
                var source_url = self.element.find('.stop_status a').attr('href');
                source_url = source_url.replace(/stName=[^&]*/, 'stName=' + escape(self.name));
                source_url = source_url.replace(/stopId=[^&]*/, 'stopId=' + escape(self.name));
                self.element.find('.stop_status a').attr('href', source_url);
                $.ajax({
                    url: 'dyn/times/' + escape(self.id),
                    cache: false,
                    dataType: 'json',
                    success: function(result) {
                        if ( result ) {
                            var updated = format_date(new Date());
                            self.element.find('.stop_status .updated').text(
                                updated
                            );
                            if ( result.error ) {
                                self.element.find('.stop_status .error').text(result.error);
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
    
    var get_bus_stops = function() {
        var store = get_storage();
        var bus_stops = store.getItem('bus_stops') || [];
        for ( var i = 0; i < bus_stops.length; i++ ) {
            var id   = bus_stops[i].id;
            var name = bus_stops[i].name;
            var page = paged.add_page(id);
            bus_stops[i] = bus_stop(page, id, name);
        }
        return bus_stops;
    };
    
    var add_bus_stop = function(id, name) {
        var store = get_storage();
        var bus_stops = store.getItem('bus_stops') || [];
        for ( var i = 0; i < bus_stops.length; i++ ) {
            var stop_id = bus_stops[i].id;
            if ( id == stop_id ) {
                return;
            }
        }
        
        bus_stops.push({ id:id, name:name });
        store.setItem('bus_stops', bus_stops);
    }
    
    var remove_bus_stop = function(id) {
        var store = get_storage();
        var bus_stops = store.getItem('bus_stops') || [];
        bus_stops = $.grep(bus_stops, function(n, i) {
            return (n.id != id);
        });
        store.setItem('bus_stops', bus_stops);
        
        if ( _current_stop.id == id ) {
            _current_stop = null;
        }
    }
    
    var paged = Paged.make_paged($('#paged'));
    paged.shown(function(page_id) {
        bus_stops = get_bus_stops();
        for ( var i = 0; i < bus_stops.length; i++ ) {
            var stop = bus_stops[i];
            if ( stop.id == page_id ) {
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
                var active = ((current_stop == null && i == 0) || current_stop.id == stop.id);
                $('#back ul#bus_stops')
                    .append(
                        $('<li></li>').append(
                            $('<a class="view"></a>')
                                .text(stop.name)
                                .attr('href', stop.id)
                        ).append(
                            $('<a class="delete">[x]</a>')
                                .attr('title', 'Delete ' + stop.name)
                                .attr('href', stop.id)
                        )
                    );
                $('ul#stop_links')
                    .append(
                        $('<li></li>').append(
                            $('<a>&#149;</a>')
                                .attr('href', stop.id)
                                .addClass(active? 'active' : '')
                            )
                    );
            }
        }
    };
        
    $('ul#stop_links li a').live('click', function(event) {
        event.preventDefault();
        var id = $(this).attr('href');
        paged.show(id);
    });
    
    $('ul#bus_stops li a.view').live('click', function(event) {
        event.preventDefault();
        var id = $(this).attr('href');
        paged.show(id);
        flip('#back', '#front');
    });
    
    $('ul#bus_stops li a.delete').live('click', function(event) {
        event.preventDefault();
        if ( confirm($(this).attr('title') + '?') ) {
            var id = $(this).attr('href');
            remove_bus_stop(id);
            bus_stops = get_bus_stops();
            paged.remove_page(id);
            display_stops(bus_stops);
        }
    });
    
    $('#front .settings a').live('click', function(event) {
        event.preventDefault();
        flip('#front', '#back');
    });
    
    $('#back form.stop_search').submit(function(event) {
        event.preventDefault();
    });
    
    $('#back form.add_stop').live('submit', function(event) {
        event.preventDefault();
        var id   = $(this).find('input[name=stop_id]').val();
        var name = $(this).find('input[name=stop_name]').val();
        var page = paged.add_page(id);
        var stop = bus_stop(page, id, name);
        stop.save();
        
        bus_stops = get_bus_stops();
        
        $('#id_stop_name').val('');
        $('#stops_found').html('');

        paged.show(id);
        flip('#back', '#front');
    });
    
    var display_search_results = function(result, current_pos) {
        var results_list = $('<ul></ul>');
        
        var map_width = $('#stops_found').width() - 20;
        
        var map_params = [
            'size='+map_width+'x'+map_width,
            'maptype=roadmap',
            'sensor=true'
        ];
        
        if ( current_pos ) {
            map_params.push(
                'markers=color:red|'+current_pos.lat+','+current_pos.lng
            );
        }
        
        for ( var i = 0; i < result.length; i++ ) {
            var label = String.fromCharCode('A'.charCodeAt() + i);
            var stop = result[i];
            var stop_id = stop.id;
            var stop_name = stop.name;
            results_list.append(
                $('<li></li>').append(
                    $('<form class="add_stop"></form>').append(
                        $('<input type="hidden" name="stop_id" />').val(stop_id)
                    ).append(
                        $('<input type="hidden" name="stop_name" />').val(stop_name)
                    ).append(
                        $('<button type="submit"></button>').text(label + ': ' + stop_name)
                    )
                )
            );
            
            map_params.push(
                'markers=color:blue|label:'+label+'|'+stop.lat+','+stop.lng
            );
        }
        
        var map_url = 'http://maps.google.com/maps/api/staticmap?';
        map_url += (map_params.join('&'));
        
        if ( result.length > 0 ) {
            results_list.append(
                $('<li></li>').append(
                    $('<img />').attr('src', map_url)
                )
            );
        }
        
        if ( results_list.html() != $('#stops_found ul').html() ) {
            $('#stops_found').html('').append(results_list);
        }
    };
    
    var current_search_id = null;
    $('#id_stop_name').live('keyup', function(event) {
        if ( current_search_id ) {
            clearTimeout(current_search_id);
            current_search_id = null;
        }
        var search = $('#id_stop_name').val();
        current_search_id = setTimeout(function() {
            $('form.stop_search').addClass('loading');
            $.ajax({
                url: 'dyn/search?q=' + escape(search),
                cache: false,
                dataType: 'json',
                success: function(result) {
                    if ( search == $('#id_stop_name').val() ) {
                        display_search_results(result);
                    }
                },
                complete: function() {
                    $('form.stop_search').removeClass('loading');
                }
            });
        }, 500);
    });
    
    
    
    var bus_stops = get_bus_stops();
    var _current_stop = null;
    var set_current_stop = function(current_stop) {
        _current_stop = current_stop;
        var store = get_storage();
        store.setItem('current_stop', current_stop.id);
    }
    var get_current_stop = function() {
        if ( !_current_stop ) {
            var store = get_storage();
            var id = store.getItem('current_stop');
            for ( var i = 0; i < bus_stops.length; i++ ) {
                if ( bus_stops[i].id == id ) {
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
        paged.show(_current_stop.id);
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