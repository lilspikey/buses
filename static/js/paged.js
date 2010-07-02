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
        
        paged_element.find('td.route').live('click touchend', function(event) {
            paged.show_left();
        });
        paged_element.find('td.departure').live('click touchend', function(event) {
            paged.show_right();
        });
        
        var paged = {
            _pages: [],
            _page_elements: {},
            _shown_callback: null,
            _current: null,
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
            
            show_left: function() {
                if ( this._current > 0 ) {
                    this.show(this._pages[this._current-1]);
                }
            },
            
            show_right: function() {
                if ( this._current < (this._pages.length-1) ) {
                    this.show(this._pages[this._current+1]);
                }
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
                    var left = 0 - (this._current * paged_element_width());
                    set_internal_pages_left(left);
                    speed_x = 0;
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
                
                if ( this._current == this._pages.indexOf(page_id) ) {
                    this._current = null;
                }
                
                this._pages = $.grep(this._pages, function(n, i) {
                    return (n != page_id);
                });
                
                delete this._page_elements[page_id];
            }
        }
        
        return paged;
    }
    
};