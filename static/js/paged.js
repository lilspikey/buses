var Paged = {
    
    make_paged: function(paged_element) {
        var DT_MILLIS = 50;
        
        var prototype_html = paged_element.html();
        var internal_pages = $('<div></div>').css({ position: 'absolute',
                                                    height: '100%',
                                                    padding: 0,
                                                    margin: 0,
                                                    left: 0, top: 0});
        paged_element.css({ position: 'relative',
                            overflow: 'hidden'})
                     .html('')
                     .append(internal_pages);
        
        var _paged_element_width = paged_element.width();
        var paged_element_width = function() {
            return _paged_element_width;
        }
        
        var _internal_pages_left = 0;
        var get_internal_pages_left = function() {
            return _internal_pages_left;
        }
        
        var set_internal_pages_left = function(left) {
            _internal_pages_left = left;
            internal_pages.css('left', left + 'px');
        }
        
        var prev_x = 0,
            prev_time = 0,
            mouse_down = false,
            speed_x = 0;
        paged_element.mousemove(function(event) {
            if ( mouse_down ) {
                event.preventDefault();
            }
        }).mousedown(function(event) {
            event.preventDefault();
            prev_x = event.pageX;
            prev_time = new Date().getTime();
            mouse_down = true;
        }).bind('mouseup mouseleave mouseout', function(event) {
            if ( mouse_down ) {
                event.preventDefault();
                mouse_down = false;
                var time = new Date().getTime();
                var dt = Math.max(1, (time - prev_time))/1000.0;
                var dx = event.pageX - prev_x;
                speed_x = dx/dt;
                paged._start_ticking();
            }
        });
        
        /* touch handlers */
        function handleTouchEvent(event) {
            /* from http://jasonkuhn.net/mobile/jqui/js/jquery.iphoneui.js
             but changed a bit*/
            var touches = event.changedTouches;
            var first = touches[0];
            var type = '';

            if ( event.type != 'touchmove' ) {
                event.preventDefault();
            }

            if ( !first.target ) {
                return;
            }
            
            switch(event.type) {
                case 'touchstart':
                    type = 'mousedown';
                    break;

                case 'touchmove':
                    type = 'mousemove';
                    break;

                case 'touchend':
                    type = 'mouseup';
                    break;

                default:
                    return;
            }

            var simulatedEvent = document.createEvent('MouseEvent');
            simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0/*left*/, null);

            first.target.dispatchEvent(simulatedEvent);
        }
        var paged_element_dom = paged_element.get(0);
        paged_element_dom.addEventListener("touchstart", handleTouchEvent, true);
        paged_element_dom.addEventListener("touchmove", handleTouchEvent, true);
        paged_element_dom.addEventListener("touchend", handleTouchEvent, true);
        /* end touch handlers */
        
        var paged = {
            _pages: [],
            _page_elements: {},
            _shown_callback: null,
            _current: null,
            _tick_interval_id: null,
            _current_left: 0,
            
            _update_page_positions: function() {
                var left = 0;
                for ( var i = 0; i < this._pages.length; i++ ) {
                    var page_id = this._pages[i];
                    var page_element = this._page_elements[page_id];
                    page_element.css('left', left);
                    left += paged_element_width();
                }
                internal_pages.width(left);
            },
            
            _start_ticking: function() {
                var self = this;
                this._stop_ticking();
                this._tick_interval_id = setInterval(function() {
                    if ( !self._tick(DT_MILLIS/1000.0) ) {
                        self._stop_ticking();
                    }
                }, DT_MILLIS);
            },
            
            _stop_ticking: function() {
                if ( this._tick_interval_id ) {
                    clearInterval(this._tick_interval_id);
                    this._tick_interval_id = null;
                }
            },
            
            _tick: function(dt) {
                // move to page in relevant direction at the given speed
                if ( !mouse_down ) {
                    var left = this._current_left;
                    var current = this._current;
                    var changing_page = false;
                    if ( Math.abs(speed_x) > 1 ) {
                        var target_page = this._current + (speed_x < 0? 1 : -1);
                        if ( 0 <= target_page && target_page < (this._pages.length) ) {
                            var target_left = paged_element.offset().left - (target_page * paged_element_width());
                            target_left = Math.round(target_left);
                            
                            left=target_left;
                        
                            current = target_page;
                            changing_page = true;
                        }
                    }
                    if ( this._current_left != left ) {
                        set_internal_pages_left(left);
                        this._current_left = left;
                        return true;
                    }
                    else if ( current != this._current ) {
                        // finished moving, so can update current page
                        this._current = current;
                        var page_id = this._pages[current];
                        this._shown_callback(page_id);
                    }
                }
                return false;
            },
            
            shown: function(callback) {
                this._shown_callback = callback;
            },
            
            show: function(page_id) {
                var current = 0;
                for ( var i = 0; i < this._pages.length; i++ ) {
                    if ( this._pages[i] == page_id ) {
                        current = i;
                        break;
                    }
                }
                if ( current != this._current ) {
                    this._current = current;
                    var left = paged_element.offset().left - (this._current * paged_element_width());
                    set_internal_pages_left(left);
                    speed_x = 0;
                    this._stop_ticking();
                    this._shown_callback(page_id);
                }
            },
            
            add_page: function(page_id) {
                var existing = this._page_elements[page_id];
                if ( existing ) {
                    return existing;
                }

                var page = $(prototype_html).css({
                    position: 'absolute',
                    top: 0,
                    height: '100%',
                    padding: 0,
                    margin: 0
                }).width(paged_element_width());
                internal_pages.append(page);
                
                this._pages.push(page_id);
                this._page_elements[page_id] = page;
                
                this._update_page_positions();
                
                return page;
            },
            
            remove_page: function(page_id) {
                var existing = this._page_elements[page_id];
                if ( !existing ) {
                    return;
                }
                
                existing.remove();
                
                this._pages = $.grep(this._pages, function(n, i) {
                    return (n != page_id);
                });
                
                delete this._page_elements[page_id];
            }
        }
        
        return paged;
    }
    
};

/*$(function() { 
    var paged = Paged.make_paged($('#pages'));
    
    paged.shown(function(page_id) {
        alert('shown: ' + page_id);
    });
    paged.add_page('id1');
    paged.add_page('id2');
    
    paged.show('id1');
});*/