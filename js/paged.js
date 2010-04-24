var Paged = {
    
    make_paged: function(paged_element) {
        var DT_MILLIS = 100;
        
        var prototype_html = paged_element.html();
        var internal_pages = $('<div></div>').css({ position: 'absolute',
                                                    height: '100%',
                                                    border: '1px solid red',
                                                    padding: 0,
                                                    margin: 0,
                                                    left: 0, top: 0});
        paged_element.css({ position: 'relative',
                            overflow: 'hidden',
                            background: 'yellow',
                            border: '1px solid black'})
                     .html('')
                     .append(internal_pages);
        
        var prev_mouse_x = 0,
            initial_mouse_x = 0,
            initial_left = 0,
            mouse_down = false,
            prev_time = 0,
            speed_x = 0;
        paged_element.mousemove(function(event) {
            if ( mouse_down ) {
                var dx = event.pageX - initial_mouse_x;
                var left =  initial_left + dx;
                internal_pages.offset({ left: left, top: 0 });
                var time = new Date().getTime();
                var dt = Math.max(1, time - prev_time)/1000.0;
                speed_x = (event.pageX - prev_mouse_x)/dt;
                prev_mouse_x = event.pageX;
                prev_time = time;
            }
        }).mousedown(function(event) {
            initial_mouse_x = event.pageX;
            initial_left = internal_pages.offset().left;
            mouse_down = true;
            speed_x = 0;
            prev_time = new Date().getTime();
        }).mouseup(function(event) {
            mouse_down = false;
        });
        
        var paged = {
            _pages: [],
            _page_elements: {},
            _shown_callback: null,
            
            _update_page_positions: function() {
                var left = 0;
                for ( var i = 0; i < this._pages.length; i++ ) {
                    var page_id = this._pages[i];
                    var page_element = this._page_elements[page_id];
                    page_element.css('left', left);
                    left += paged_element.width();
                }
                internal_pages.width(left);
            },
            
            _move_at_speed: function(speed_x, dt) {
                var left = internal_pages.offset().left;
                left += (dt*speed_x);
                internal_pages.offset({ left: left, top: 0 });
                return speed_x;
            },
            
            shown: function(callback) {
                this._shown_callback = callback;
            },
            
            show: function(page_id) {
                
            },
            
            add_page: function(page_id) {
                var page = $(prototype_html).css({
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                    height: '100%',
                    padding: 0,
                    margin: 0,
                    background: 'blue'
                });
                internal_pages.append(page);
                
                this._pages.push(page_id);
                this._page_elements[page_id] = page;
                
                this._update_page_positions();
                
                return page;
            }
        }
        
        // move to page in relevant direction at the given speed
        setInterval(function() {
            if ( !mouse_down && Math.abs(speed_x) > 5 ) {
                speed_x = paged._move_at_speed(speed_x, DT_MILLIS/1000.0);
            }
        }, DT_MILLIS);
        
        return paged;
    }
    
};

$(function() { 
    var paged = Paged.make_paged($('#pages'));
    
    paged.shown(function(page_id) {
        alert('shown: ' + page_id);
    });
    paged.add_page('id1');
    paged.add_page('id2');
    
    paged.show('id1');
});