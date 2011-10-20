//@todo Display inline
//@todo Modal popup option: overlay? center?
//@todo Close on 'escape' key?
//@todo Callbacks? Offer interaction?
//@todo Methods? open/close/enable/disable/etc...
//@todo Clip to websafe colors
//@todo Open in the right position -> Above or below, left or right, depending on what fits in screen. Check my smart tooltip extension
//@todo Custom user-defined buttons
//@todo Undo/redo for OK clicks?
//@todo All images to PNG format
//@todo Copyright header (MIT)
//@todo Small size variant (128x128)
//@todo Options for animation (fade/slide/hide), easing and speed
//@todo Distance between rgb/hsv/a options
//@todo Exchange close/cancel; public-accessible close must cancel!

(function($, undefined) {  

$.widget("ui.colorpicker", {   
	options: {
		autoOpen:		false,
		color:			'#00FF00',
        mode:			'h',
        title:			'Foreground color',		
		onClose:		undefined,
		onSelect:		undefined,
		onChange:		undefined,
		closeOnOutside:	true,
		revert:			true,			// on cancel, revert changes to color
		swatches:		undefined,
		hsv:			true,
		rgb:			true,
        alpha:			false,
		showMap:		true,
		showBar:		true,
		showSwatches:	true,
		showHex:		true,
		showPreview:	true,
		showInputs:		true,
		showHeader:		true
	},
	
	_curInst: undefined,
    
	container: '<div class="ui-colorpicker ui-dialog ui-widget ui-widget-content ui-corner-all" style="display: none;"></div>',
	
	layout: '<table class="ui-dialog-content ui-widget-content" cellspacing="0" cellpadding="0" border="0"><tr>'    
			+'<td valign="top" id="ui-colorpicker-map-container"></td>'
			+'<td valign="top" id="ui-colorpicker-bar-container"></td>'
			+'<td valign="top" id="ui-colorpicker-controls-container">'
				+'<div id="ui-colorpicker-preview-container"></div>'
				+'<div id="ui-colorpicker-inputs-container"></div>'
				+'<div id="ui-colorpicker-hex-container"></div>'
			+'</td>'
			+'<td valign="top" id="ui-colorpicker-swatches-container"></td>'
			+'</tr></table>',

	_create: function() {  
        var self = this;			
		
		self.opened = false;
		self.generated = false;
		
		self.changed = false;
        
        self.mode = self.options.mode;
        
        var rgb = self._colorRGBNormalized(self.options.color);        
        self.color = (rgb === false? new self.Color() : new self.Color(rgb[0], rgb[1], rgb[2]));		
        self.currentColor = $.extend({}, self.color);
		
		if (!self.options.swatches) {
			self.options.swatches = self._colors;
		}
        
		self.parts = [	new self.Footer(self)	];		
		if (self.options.showMap)		{	self.parts.push(new self.Map(self));	}
		if (self.options.showBar)		{	self.parts.push(new self.Bar(self));	}
		if (self.options.showHeader)	{	self.parts.push(new self.Header(self));	}
		if (self.options.showPreview)	{	self.parts.push(new self.Preview(self));	}
		if (self.options.showInputs)	{	self.parts.push(new self.Inputs(self));	}
		if (self.options.showHex)		{	self.parts.push(new self.Hex(self));	}
		if (self.options.showSwatches)	{	self.parts.push(new self.Swatches(self));	}
        
		$('body').prepend(self.container);
		self.dialog = $('.ui-colorpicker:first');
				
		$(document).mousedown( function(event) {
			if (!self.opened || !self.options.closeOnOutside)
				return;
						
			if (event.target == self.element[0]) {
				return;
			}
			
			var parents = $(event.target).parents()
			for (var p in parents) {
				if (parents[p] === self.dialog.get(0)) {
					return;	// part of window
				}
			}

			self._cancel();
		});
		
		self.element.click( function(event) {
			if (self.opened) {
				self._cancel();
			} else {
				self.open();
			}		
		});
		
		if (self.options.autoOpen) {
			self.open();
		}		
		
		return this;
	},
		
	_ok: function() {				
		var inst = $.ui.colorpicker._curInst;
		
		inst.currentColor	= $.extend({}, inst.color);
		inst.changed		= false;
		
		inst._callback(inst.options.onSelect);
		
		inst.close();
	},
	
	_cancel: function() {
		var inst = $.ui.colorpicker._curInst;
		
		if (inst.options.revert) {
			inst.color		= $.extend({}, inst.currentColor);
			inst.changed	= false;
		}
		
		inst.close();
	},
	
	open: function() {
		var inst = $.ui.colorpicker._curInst;
		if (inst) {		
			inst._cancel();
		}
		inst = $.ui.colorpicker._curInst = this;
		
		if (!inst.generated) {			
			inst.dialog.append(inst.layout);        
			inst._initAllParts(); 
			inst._generateAllParts(); 
			inst.generated = true;				
		}

		var offset = inst.element.offset();
		var height = inst.element.height();
		inst.dialog.css({'left': offset.left, 'top': offset.top + height});

		inst.opened = true;
		inst.dialog.slideDown('fast');
	},
	
	close: function() {
		var inst = $.ui.colorpicker._curInst;
		
		// tear down the interface
		inst.opened = false;
		inst.dialog.slideUp('fast', function() {
		//	inst.dialog.empty();
		//	inst.generated = false;
		});
			
		inst._callback(inst.options.onClose);
		
		$.ui.colorpicker._curInst = undefined;
	},
		
	_callback: function(f) {	
		var inst = $.ui.colorpicker._curInst;
		if (f instanceof Function) {
			f(inst.color.toHex(), {
				r: inst.color.r,
				g: inst.color.g,
				b: inst.color.b,
				a: inst.color.a
			}, inst);
		}
	},	
	
	_generateAllParts: function() {
		$.each(this.parts, function(index, part) {
			part.generate();
		});
	},

	_initAllParts: function() {
		$.each(this.parts, function(index, part) {
			part.init();
		});
	},

	_change: function() {
		var inst = $.ui.colorpicker._curInst;
		
		inst.changed = true;
		
		inst._callback(inst.options.onChange);
		
		$.each(inst.parts, function(index, part) {
			part.repaint();
		});
	},
	
	_intToHex: function(dec) {
		var result = (dec | 0).toString(16);
		if (result.length == 1) {
			result = ('0' + result);
		}
		return result.toLowerCase();
	},
	
	_hexToInt: function(hex) {
		return parseInt(hex, 16);
	},
	
	_crop: function(value) {
		return value > 1? 1 : (value < 0? 0 : value);
	},
	
	// This will be deprecated by jQueryUI 1.9 widget
	_hoverable: function(e) {
		e.hover( function() {
			e.addClass( "ui-state-hover" );
		}, function() {
			e.removeClass( "ui-state-hover" );
		});		
	},
	
	// This will be deprecated by jQueryUI 1.9 widget
	_focusable: function(e) {
		e.focus(function() {
			e.addClass( "ui-state-focus" );
		}).blur(function() {
			e.removeClass( "ui-state-focus" );
		});		
	},
        
    Map: function(inst) {
        var self = this;
		var e = undefined;
        var isMouseDown = false;
        var isDragging = false;        

        this.init = function() {
            e = $(_html()).appendTo($('#ui-colorpicker-map-container', inst.dialog));

			$(document).bind('mousedown mousemove mouseup', _handleEvents);
        };

        this.generate = function() {
            switch (inst.mode) {
                case 'h':
                    $('#ui-colorpicker-map-layer-1', e).css({'background-position': '0 0', 'opacity': 1}).show();
                    $('#ui-colorpicker-map-layer-2', e).hide();
                    break;
                    
                case 's':
                case 'a':
                    $('#ui-colorpicker-map-layer-1', e).css({'background-position': '0 -260px', 'opacity': 1}).show();
                    $('#ui-colorpicker-map-layer-2', e).css({'background-position': '0 -520px', 'opacity': 1}).show();
                    break;          
                    
                case 'v':
                    $(e).css('background-color', 'black');
                    $('#ui-colorpicker-map-layer-1', e).css({'background-position': '0 -780px', 'opacity': 1}).show();
                    $('#ui-colorpicker-map-layer-2', e).hide();
                    break;          
                    
                case 'r':
                    $('#ui-colorpicker-map-layer-1', e).css({'background-position': '0 -1040px', 'opacity': 1}).show();
                    $('#ui-colorpicker-map-layer-2', e).css({'background-position': '0 -1300px', 'opacity': 1}).show();
                    break;          
                    
                case 'g':
                    $('#ui-colorpicker-map-layer-1', e).css({'background-position': '0 -1560px', 'opacity': 1}).show();
                    $('#ui-colorpicker-map-layer-2', e).css({'background-position': '0 -1820px', 'opacity': 1}).show();
                    break;          
                    
                case 'b':
                    $('#ui-colorpicker-map-layer-1', e).css({'background-position': '0 -2080px', 'opacity': 1}).show();
                    $('#ui-colorpicker-map-layer-2', e).css({'background-position': '0 -2340px', 'opacity': 1}).show();
                    break;          
            }
            self.repaint();
        }
        
        this.repaint = function() {
            var div = $('#ui-colorpicker-map-layer-pointer', e);
 
            var x = 0;
            var y = 0;
            switch (inst.mode) {
                case 'h':
                    x = inst.color.s * div.width();
                    y = (1 - inst.color.v) * div.width();                      
                    $(e).css('background-color', inst.color.normClone().toHex());
                    break;

                case 's':
                case 'a':
                    x = inst.color.h * div.width();
                    y = (1 - inst.color.v) * div.width();
                    $('#ui-colorpicker-map-layer-2', e).css('opacity', 1 - inst.color.s);
                    break;

                case 'v':
                    x = inst.color.h * div.width();
                    y = (1 - inst.color.s) * div.width();
                    $('#ui-colorpicker-map-layer-1', e).css('opacity', inst.color.v);
                    break;

                case 'r':
                    x = inst.color.b * div.width();
                    y = (1 - inst.color.g) * div.width();
                    $('#ui-colorpicker-map-layer-2', e).css('opacity', inst.color.r);
                    break;

                case 'g':
                    x = inst.color.b * div.width();
                    y = (1 - inst.color.r) * div.width();
                    $('#ui-colorpicker-map-layer-2', e).css('opacity', inst.color.g);
                    break;

                case 'b':
                    x = inst.color.r * div.width();
                    y = (1 - inst.color.g) * div.width();
                    $('#ui-colorpicker-map-layer-2', e).css('opacity', inst.color.b);
                    break;
            }
            
            if (inst.options.alpha) {
                $('#ui-colorpicker-map-layer-alpha', e).css('opacity', 1 - inst.color.a);                
            }
			
            $('#ui-colorpicker-map-pointer', e).css({
                'left': x - 7, 
                'top': y - 7
                });
        };

        var _handleEvents = function(event) {	
			if (!inst.opened)
				return;
			
            switch (event.type) {
                case 'mousedown':
                    isMouseDown = true;
                    break;
                case 'mouseup':
                    isMouseDown = false;
                    isDragging = false;
                    break;
            }            

			if (isMouseDown) {
                var div = $('#ui-colorpicker-map-layer-pointer', e);
                var offset = div.offset();
                var width = div.width();
                var height = div.height();

                var x = event.pageX - offset.left;
                var y = event.pageY - offset.top;          

                if (event.type == 'mousedown'
                        && x >= 0 && x < width
                        && y >= 0 && y < height) {
                    isDragging = true;
                }

                if (isDragging) {
                    x = Math.max(0, Math.min(x / width, 1));
                    y = Math.max(0, Math.min(y / height, 1));

                    // interpret values                
                    switch (inst.mode) {
                        case 'h':
                            inst.color.s = x;
                            inst.color.v = 1 - y;
                            inst.color.updateRGB();
                            break;

                        case 's':
                        case 'a':
                            inst.color.h = x;
                            inst.color.v = 1 - y;
                            inst.color.updateRGB();
                            break;

                        case 'v':
                            inst.color.h = x;
                            inst.color.s = 1 - y;
                            inst.color.updateRGB();
                            break;

                        case 'r':
                            inst.color.b = x;
                            inst.color.g = 1 - y;
                            inst.color.updateHSV();
                            break;

                        case 'g':
                            inst.color.b = x;
                            inst.color.r = 1 - y;
                            inst.color.updateHSV();
                            break;

                        case 'b':
                            inst.color.r = x;
                            inst.color.g = 1 - y;
                            inst.color.updateHSV();
                            break;
                    }

                    inst._change();

                    // handled
                    event.stopImmediatePropagation();                
                    event.preventDefault();                
                }            
            }
        }
        
        var _html = function() {
            var html = '<div id="ui-colorpicker-map" class="ui-colorpicker-border">'
						+'<span id="ui-colorpicker-map-layer-1" style="background: url(images/map.png) no-repeat;">&nbsp;</span>'
						+'<span id="ui-colorpicker-map-layer-2" style="background: url(images/map.png) no-repeat;">&nbsp;</span>';
            if (inst.options.alpha) {
                html += '<span id="ui-colorpicker-map-layer-alpha" style="background: url(images/map-opacity.png);">&nbsp;</span>'
            }
            html += '<span id="ui-colorpicker-map-layer-pointer"><img src="images/map-pointer.png" id="ui-colorpicker-map-pointer"/></span></div>';   
            return html;
        };       
    },
    
    Bar: function(inst) {
        var self = this;  
		var e = undefined;
        var isMouseDown = false;
        var isDragging = false;        
        
        this.init = function() {
            e = $(self._html()).appendTo($('#ui-colorpicker-bar-container', inst.dialog));
            
            $(document).bind('mousedown mousemove mouseup', _handleEvents);
        };

        this.generate = function() {            
            switch (inst.mode) {
                case 'h':
                case 's':
                case 'v':
                case 'r':
                case 'g':
                case 'b':
                    $('#ui-colorpicker-bar-layer-alpha', e).show();
                    $('#ui-colorpicker-bar-layer-alphabar', e).hide();
                    break;
                    
                case 'a':
                    $('#ui-colorpicker-bar-layer-alpha', e).hide();
                    $('#ui-colorpicker-bar-layer-alphabar', e).show();
                    break;                
            }
            
            switch (inst.mode) {
                case 'h':
                    $('#ui-colorpicker-bar-layer-1', e).css({'background-position': '0 0', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-2', e).hide();
                    $('#ui-colorpicker-bar-layer-3', e).hide();
                    $('#ui-colorpicker-bar-layer-4', e).hide();
                    break;
                    
                case 's':
                    $('#ui-colorpicker-bar-layer-1', e).css({'background-position': '0 -260px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-2', e).css({'background-position': '0 -520px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-3', e).hide();
                    $('#ui-colorpicker-bar-layer-4', e).hide();
                    break;
                    
                case 'v':
                    $('#ui-colorpicker-bar-layer-1', e).css({'background-position': '0 -520px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-2', e).hide();
                    $('#ui-colorpicker-bar-layer-3', e).hide();
                    $('#ui-colorpicker-bar-layer-4', e).hide();
                    break;
                    
                case 'r':
                    $('#ui-colorpicker-bar-layer-1', e).css({'background-position': '0 -1560px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-2', e).css({'background-position': '0 -1300px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-3', e).css({'background-position': '0 -780px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-4', e).css({'background-position': '0 -1040px', 'opacity': 1}).show();
                    break;
                    
                case 'g':
                    $('#ui-colorpicker-bar-layer-1', e).css({'background-position': '0 -2600px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-2', e).css({'background-position': '0 -2340px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-3', e).css({'background-position': '0 -1820px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-4', e).css({'background-position': '0 -2080px', 'opacity': 1}).show();
                    break;
                    
                case 'b':
                    $('#ui-colorpicker-bar-layer-1', e).css({'background-position': '0 -3640px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-2', e).css({'background-position': '0 -3380px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-3', e).css({'background-position': '0 -2860px', 'opacity': 1}).show();
                    $('#ui-colorpicker-bar-layer-4', e).css({'background-position': '0 -3120px', 'opacity': 1}).show();
                    break;
                    
                case 'a':
                    $('#ui-colorpicker-bar-layer-1', e).hide();
                    $('#ui-colorpicker-bar-layer-2', e).hide();
                    $('#ui-colorpicker-bar-layer-3', e).hide();
                    $('#ui-colorpicker-bar-layer-4', e).hide();
                    break;                    
            }
            self.repaint();
        }

        this.repaint = function() {
            var div = $('#ui-colorpicker-bar-layer-pointer', e);

            var y = 0;
            switch (inst.mode) {
                case 'h':
                    y = (1 - inst.color.h) * div.height();
                    break;
                    
                case 's':
                    y = (1 - inst.color.s) * div.height();
                    $('#ui-colorpicker-bar-layer-2', e).css('opacity', 1 - inst.color.v);                      
                    $(e).css('background-color', inst.color.normClone().toHex());
                    break;
                    
                case 'v':
                    y = (1 - inst.color.v) * div.height();
                    $(e).css('background-color', inst.color.normClone().toHex());
                    break;
                    
                case 'r':
                    y = (1 - inst.color.r) * div.height();
                    $('#ui-colorpicker-bar-layer-2', e).css('opacity', Math.max(0, (inst.color.b - inst.color.g)));                      
                    $('#ui-colorpicker-bar-layer-3', e).css('opacity', Math.max(0, (inst.color.g - inst.color.b)));                      
                    $('#ui-colorpicker-bar-layer-4', e).css('opacity', Math.min(inst.color.b, inst.color.g));                      
                    break;
                    
                case 'g':
                    y = (1 - inst.color.g) * div.height();
                    $('#ui-colorpicker-bar-layer-2', e).css('opacity', Math.max(0, (inst.color.b - inst.color.r)));                      
                    $('#ui-colorpicker-bar-layer-3', e).css('opacity', Math.max(0, (inst.color.r - inst.color.b)));                      
                    $('#ui-colorpicker-bar-layer-4', e).css('opacity', Math.min(inst.color.r, inst.color.b));                      
                    break;
                    
                case 'b':
                    y = (1 - inst.color.b) * div.height();
                    $('#ui-colorpicker-bar-layer-2', e).css('opacity', Math.max(0, (inst.color.r - inst.color.g)));                      
                    $('#ui-colorpicker-bar-layer-3', e).css('opacity', Math.max(0, (inst.color.g - inst.color.r)));                      
                    $('#ui-colorpicker-bar-layer-4', e).css('opacity', Math.min(inst.color.r, inst.color.g));                      
                    break;
                    
                case 'a':
                    y = (1 - inst.color.a) * div.height();
                    $(e).css('background-color', inst.color.normClone().toHex());
                    break;
            }
            
            if (inst.mode != 'a') {
                $('#ui-colorpicker-bar-layer-alpha', e).css('opacity', 1 - inst.color.a);
            }            
            
            $('#ui-colorpicker-bar-pointer', e).css('top', y - 3);
        }

        var _handleEvents = function(event) {
			if (!inst.opened)
				return;
			
            switch (event.type) {
                case 'mousedown':
                    isMouseDown = true;
                    break;
                case 'mouseup':
                    isMouseDown = false;
                    isDragging = false;
                    break;
            }            

            if (isMouseDown) {''
                var div = $('#ui-colorpicker-bar-layer-pointer', e);
                var offset  = div.offset();
                var width   = div.width();
                var height  = div.height();

                var x = event.pageX - offset.left;
                var y = event.pageY - offset.top;          

                if (event.type == 'mousedown'
                        && x >= 0 && x < width
                        && y >= 0 && y < height) {
                    isDragging = true;
                }
                
                if (isDragging) {;
                    y = Math.max(0, Math.min(y / height, 1));

                    // interpret values                
                    switch (inst.mode) {
                        case 'h':
                            inst.color.h = 1 - y;
                            inst.color.updateRGB();
                            break;
                            
                        case 's':
                            inst.color.s = 1 - y;
                            inst.color.updateRGB();
                            break;
                            
                        case 'v':
                            inst.color.v = 1 - y;
                            inst.color.updateRGB();
                            break;
                            
                        case 'r':
                            inst.color.r = 1 - y;
                            inst.color.updateHSV();
                            break;
                            
                        case 'g':
                            inst.color.g = 1 - y;
                            inst.color.updateHSV();
                            break;
                            
                        case 'b':
                            inst.color.b = 1 - y;
                            inst.color.updateHSV();
                            break;
                            
                        case 'a':
                            inst.color.a = 1 - y;
                            break;
                    }             

                    inst._change();

                    // handled
                    event.stopImmediatePropagation();                
                    event.preventDefault();                
                }            
            }    
        }        

        this._html = function() {
            var html = '<div id="ui-colorpicker-bar" class="ui-colorpicker-border" style="background-color: rgb(0, 0, 255);">'
					+'<span id="ui-colorpicker-bar-layer-1" style="background: url(images/bar.png) repeat-x;">&nbsp;</span>'
					+'<span id="ui-colorpicker-bar-layer-2" style="background: url(images/bar.png) repeat-x;">&nbsp;</span>'
					+'<span id="ui-colorpicker-bar-layer-3" style="background: url(images/bar.png) repeat-x;">&nbsp;</span>'
					+'<span id="ui-colorpicker-bar-layer-4" style="background: url(images/bar.png) repeat-x;">&nbsp;</span>';
				
			if (inst.options.alpha) {
                html += '<span id="ui-colorpicker-bar-layer-alpha" style="background: url(images/bar-opacity.png);">&nbsp;</span>'
					+'<span id="ui-colorpicker-bar-layer-alphabar" style="background: url(images/bar-alpha.png);">&nbsp;</span>';
            }
			
            html += '<span id="ui-colorpicker-bar-layer-pointer"><img src="images/bar-pointer.gif" id="ui-colorpicker-bar-pointer"/></span></div>';
			
            return html;
        };
    },
    
    Inputs: function(inst) {
        var self = this;
		var e = undefined;
        
        this.init = function() {
            e = $(self._html()).appendTo($('#ui-colorpicker-inputs-container', inst.dialog));
            
            $('.ui-colorpicker-mode', e).click( function() {
                inst.mode = $(this).val();            
                inst._generateAllParts();
            });
            
            $('.ui-colorpicker-number', e).bind('change input keyup', function() {            
                inst.color = self._getColorFromInputs();
                if ($(this).hasClass('ui-colorpicker-number-hsv')) {
                    inst.color.updateRGB();
                } else if ($(this).hasClass('ui-colorpicker-number-rgb')) {
                    inst.color.updateHSV();
                }				
                inst._change();
            });            
        };       
        
        this.repaint = function() {            
            var c = $.extend(inst.color);
            c.h *= 360;
            c.s *= 100;
            c.v *= 100;
            c.r *= 255;
            c.g *= 255;
            c.b *= 255;
            c.a *= 100;      

            $.each(c, function(index, value) {
                var v = Math.round(value);
                if (!$('#ui-colorpicker-'+index+' .ui-colorpicker-number', e).is(':focus')
                  || $('#ui-colorpicker-'+index+' .ui-colorpicker-number', e).val() != v) {            
                    $('#ui-colorpicker-'+index+' .ui-colorpicker-number', e).val(v);                    
                }            
            });              
        };
        
        this.generate = function() {
			$('.ui-colorpicker-mode', e).each( function() {
				$(this).attr('checked', $(this).val() == inst.mode);
			});
            this.repaint();
        };
        
        this._html = function() {
            var html = '<div id="ui-colorpicker-inputs">';
			
			if (inst.options.hsv) {
				html +=	'<div id="ui-colorpicker-h"><input class="ui-colorpicker-mode" type="radio" value="h"/><label>H:</label><input class="ui-colorpicker-number ui-colorpicker-number-hsv" type="number" min="0" max="360" size="10"/><span class="ui-colorpicker-unit">&deg;</span></div>'
					+ '<div id="ui-colorpicker-s"><input class="ui-colorpicker-mode" type="radio" value="s"/><label>S:</label><input class="ui-colorpicker-number ui-colorpicker-number-hsv" type="number" min="0" max="100" size="10"/><span class="ui-colorpicker-unit">%</span></div>'
					+ '<div id="ui-colorpicker-v"><input class="ui-colorpicker-mode" type="radio" value="v"/><label>V:</label><input class="ui-colorpicker-number ui-colorpicker-number-hsv" type="number" min="0" max="100" size="10"/><span class="ui-colorpicker-unit">%</span></div>';
			}
			
			if (inst.options.rgb) {
				html += '<div id="ui-colorpicker-r"><input class="ui-colorpicker-mode" type="radio" value="r"/><label>R:</label><input class="ui-colorpicker-number ui-colorpicker-number-rgb" type="number" min="0" max="255" size="10"/><span class="ui-colorpicker-unit"></span></div>'
					+ '<div id="ui-colorpicker-g"><input class="ui-colorpicker-mode" type="radio" value="g"/><label>G:</label><input class="ui-colorpicker-number ui-colorpicker-number-rgb" type="number" min="0" max="255" size="10"/><span class="ui-colorpicker-unit"></span></div>'
					+ '<div id="ui-colorpicker-b"><input class="ui-colorpicker-mode" type="radio" value="b"/><label>B:</label><input class="ui-colorpicker-number ui-colorpicker-number-rgb" type="number" min="0" max="255" size="10"/><span class="ui-colorpicker-unit"></span></div>';
			}

            if (inst.options.alpha) {
                html += '<div id="ui-colorpicker-a"><input class="ui-colorpicker-mode" name="mode" type="radio" value="a"/><label>A:</label><input class="ui-colorpicker-number ui-colorpicker-number-a" type="number" min="0" max="100" size="10"/><span class="ui-colorpicker-unit">%</span></div>';
            }
            
            return html + '</div>';
        };
        
        this._getColorFromInputs = function() {
            return new inst.Color(
                $('#ui-colorpicker-r .ui-colorpicker-number', e).val() / 255,
                $('#ui-colorpicker-g .ui-colorpicker-number', e).val() / 255,
                $('#ui-colorpicker-b .ui-colorpicker-number', e).val() / 255,
                $('#ui-colorpicker-a .ui-colorpicker-number', e).val() / 100,
                $('#ui-colorpicker-h .ui-colorpicker-number', e).val() / 360,
                $('#ui-colorpicker-s .ui-colorpicker-number', e).val() / 100,
                $('#ui-colorpicker-v .ui-colorpicker-number', e).val() / 100
            );
        };        
    },
    
    Preview: function(inst) {
        var self = this;
		var e = undefined;
        
        this.init = function() {
            e = $(self._html()).appendTo($('#ui-colorpicker-preview-container', inst.dialog));
            
            $('#ui-colorpicker-preview-initial', e).click( function() {
				inst.color = $.extend({}, inst.currentColor);
                inst._change();
            });
            
        };       
        
        this.repaint = function() {
            $('#ui-colorpicker-preview-initial', e).css('background-color', inst.currentColor.toHex()).attr('title', inst.currentColor.toHex());
            $('#ui-colorpicker-preview-initial-alpha', e).css('opacity', 1 - inst.currentColor.a);
            $('#ui-colorpicker-preview-current', e).css('background-color', inst.color.toHex()).attr('title', inst.color.toHex());
            $('#ui-colorpicker-preview-current-alpha', e).css('opacity', 1 - inst.color.a);
        };
        
        this.generate = function() {
            if (inst.options.alpha) {
                $('#ui-colorpicker-preview-initial-alpha, #ui-colorpicker-preview-current-alpha', e).show();
            } else {
                $('#ui-colorpicker-preview-initial-alpha, #ui-colorpicker-preview-current-alpha', e).hide();                
            }
            
            this.repaint();
        };
        
        this._html = function() {
            return '<div id="ui-colorpicker-preview">'
				+'<span class="ui-colorpicker-border">'
				+'<div id="ui-colorpicker-preview-initial"><div id="ui-colorpicker-preview-initial-alpha" style="background: url(\'images/preview-opacity.png\') repeat;"></div></div>'
				+'<div id="ui-colorpicker-preview-current"><div id="ui-colorpicker-preview-current-alpha" style="background: url(\'images/preview-opacity.png\') repeat;"></div></div>'
				+'</span>'		
				+'</div>';
        };        
    },
    
    Hex: function(inst) {
        var self = this;
		var e = undefined;
        
        this.init = function() {
            e = $(self._html()).appendTo($('#ui-colorpicker-hex-container', inst.dialog));
            
            $('#ui-colorpicker-hex-input', e).bind('change keyup', function() {
				inst.color.r = self._r();
				inst.color.g = self._g();
				inst.color.b = self._b();
				inst.color.updateHSV();
                inst._generateAllParts();                
            });
			
            $('#ui-colorpicker-hex-alpha', e).bind('change keyup', function() {
                inst.color.a = self._a();
                inst._generateAllParts();                
            });
        };
		
		this._a = function() {
			return inst._crop(inst._hexToInt($('#ui-colorpicker-hex-alpha', e).val()) / 255);
		};
		
		this._r = function() {
			return inst._crop((inst._hexToInt($('#ui-colorpicker-hex-input', e).val()) >> 16 & 0xFF) / 255);
		};
		this._g = function() {
			return inst._crop((inst._hexToInt($('#ui-colorpicker-hex-input', e).val()) >> 8 & 0xFF) / 255);
		};
		this._b = function() {
			return inst._crop((inst._hexToInt($('#ui-colorpicker-hex-input', e).val()) & 0xFF) / 255);
		};
        
        this.repaint = function() {
			if (!$('#ui-colorpicker-hex-input', e).is(':focus')) {
				var hex = inst.color.toHex().toLowerCase()
                $('#ui-colorpicker-hex-input', e).val(hex.substr(1));
			}
						
			if (!$('#ui-colorpicker-hex-alpha', e).is(':focus')) {
				$('#ui-colorpicker-hex-alpha', e).val(inst._intToHex(inst.color.a * 255).toLowerCase());
			}
        };
        
        this.generate = function() {
            this.repaint();
        };
        
        this._html = function() {
            var html = '';
			
			if (inst.options.alpha) {
				html += '<input id="ui-colorpicker-hex-alpha" maxlength="2" size="2"/>';
			}
			
			html += '<input id="ui-colorpicker-hex-input" maxlength="6" size="6"/>';
			
			return '<div id="ui-colorpicker-hex"><label for="ui-colorpicker-hex-input">#: </label>' + html + '</div>';
        };        
    },
    
    Header: function(inst) {
        var self = this;
        var e = undefined;
		
        this.init = function() {
			e = $(self._html()).prependTo(inst.dialog);
			var close = $('.ui-dialog-titlebar-close', e);

			inst._hoverable(close);
			inst._focusable(close);
			close.click( inst._cancel );
        };       
        
        this.repaint = function() {
        };
        
        this.generate = function() {
            this.repaint();
        };
        
        this._html = function() {
            return '<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix">'
                +'<span class="ui-dialog-title">'+inst.options.title+'</span>'
                +'<a href="#" class="ui-dialog-titlebar-close ui-corner-all" role="button">'
                +'<span class="ui-icon ui-icon-closethick">close</span></a></div>';
        };        
    },
    
    Footer: function(inst) {
        var self = this;
		var e = undefined;
    
        this.init = function() {
			e = $(self._html()).appendTo(inst.dialog);
			
			$('.ui-colorpicker-ok', e).button().click( function() {
                inst._ok();
            });
            $('.ui-colorpicker-cancel', e).button().click( function() {
                inst._cancel();
            });			
        };       
        
        this.repaint = function() {
			//@todo enable/disable OK button if changed
			$('.ui-colorpicker-ok', e).button(inst.changed? 'enable' : 'disable');
        };
        
        this.generate = function() {
            this.repaint();
        };
        
        this._html = function() {
            return '<div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix">'
                +'<div class="ui-dialog-buttonset">'
				+'<button class="ui-colorpicker-ok">OK</button>'
				+'<button class="ui-colorpicker-cancel">Cancel</button>'
				+'</div></div>';
        };        
    },    
    
    Swatches: function(inst) {
        var self = this;
		var e = undefined;
    
        this.init = function() {
            e = $(self._html()).appendTo($('#ui-colorpicker-swatches-container', inst.dialog));

			$('.ui-colorpicker-swatch', e).click( function() {
				var rgb		= inst._colorRGBNormalized($(this).css('background-color'));
				inst.color	= (rgb === false? new inst.Color() : new inst.Color(rgb[0], rgb[1], rgb[2]));
                inst._change();
			});
        };       
        
        this.repaint = function() {
			// Not affected by changing color;
        };
        
        this.generate = function() {
			// Not affected by changing color;
        };
        
        this._html = function() {
			var html = '';
			
			$.each(inst.options.swatches, function(name, color) {
				var hex = inst._intToHex(color[0]) + inst._intToHex(color[1]) + inst._intToHex(color[2]);
				html += '<div class="ui-colorpicker-swatch" style="background-color: #' + hex + '" title="' + name + '"></div>';
			});
			
            return '<div id="ui-colorpicker-swatches" class="ui-colorpicker-border">' + html + '</div>';
        };        
    },    

	/* Based on FLOT/jquery.colorhelpers.js
	 * Released under the MIT license by Ole Laursen, October 2009.
	 */
	_colorRGBNormalized: function(color) {
        var rgb = this._colorRGB(color);
        if (rgb !== undefined) {
            rgb[0] /= 255;
            rgb[1] /= 255;
            rgb[2] /= 255;
        }
        return rgb;
    },

    _colorRGB: function(color) {
		var m;

		// Look for #fff
		if (m = /^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/.exec(color))
			return [parseInt(m[1]+m[1], 16), parseInt(m[2]+m[2], 16), parseInt(m[3]+m[3], 16)];

		// Look for #a0b1c2
		if (m = /^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(color))
			return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];

		// rgb{a}(#,#,#{,#})
		if (m = /^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*(?:,\s*([0-9]+(?:\.[0-9]+)?)\s*)?\)$/.exec(color))
			return m.slice(1,4);
		
		// rgb{a}(%,%,%{,%})
		if (m = /^rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*(?:,\s*([0-9]+(?:\.[0-9]+)?)\s*)?\)$/.exec(color))
			return [parseFloat(m[1]) * 2.55, parseFloat(m[2]) * 2.55, parseFloat(m[3]) * 2.55];
			
		// Otherwise, we're most likely dealing with a named color
		var name = jQuery.trim(color).toLowerCase();
		if (name == "transparent")
			return [255, 255, 255];
		else {
			return this._colors[name];
		}
	},

	_colors: {
		'Black': [0x00, 0x00, 0x00],
		'DimGray': [0x69, 0x69, 0x69],
		'Gray': [0x80, 0x80, 0x80],
		'DarkGray': [0xA9, 0xA9, 0xA9],
		'Silver': [0xC0, 0xC0, 0xC0],
		'LightGrey': [0xD3, 0xD3, 0xD3],
		'Gainsboro': [0xDC, 0xDC, 0xDC],
		'WhiteSmoke': [0xF5, 0xF5, 0xF5],
		'White': [0xFF, 0xFF, 0xFF],
		'RosyBrown': [0xBC, 0x8F, 0x8F],
		'IndianRed': [0xCD, 0x5C, 0x5C],
		'Brown': [0xA5, 0x2A, 0x2A],
		'FireBrick': [0xB2, 0x22, 0x22],
		'LightCoral': [0xF0, 0x80, 0x80],
		'Maroon': [0x80, 0x00, 0x00],
		'DarkRed': [0x8B, 0x00, 0x00],
		'Red': [0xFF, 0x00, 0x00],
		'Snow': [0xFF, 0xFA, 0xFA],
		'Salmon': [0xFA, 0x80, 0x72],
		'MistyRose': [0xFF, 0xE4, 0xE1],
		'Tomato': [0xFF, 0x63, 0x47],
		'DarkSalmon': [0xE9, 0x96, 0x7A],
		'OrangeRed': [0xFF, 0x45, 0x00],
		'Coral': [0xFF, 0x7F, 0x50],
		'LightSalmon': [0xFF, 0xA0, 0x7A],
		'Sienna': [0xA0, 0x52, 0x2D],
		'Seashell': [0xFF, 0xF5, 0xEE],
		'Chocolate': [0xD2, 0x69, 0x1E],
		'SaddleBrown': [0x8B, 0x45, 0x13],
		'SandyBrown': [0xF4, 0xA4, 0x60],
		'PeachPuff': [0xFF, 0xDA, 0xB9],
		'Peru': [0xCD, 0x85, 0x3F],
		'Linen': [0xFA, 0xF0, 0xE6],
		'DarkOrange': [0xFF, 0x8C, 0x00],
		'Bisque': [0xFF, 0xE4, 0xC4],
		'BurlyWood': [0xDE, 0xB8, 0x87],
		'Tan': [0xD2, 0xB4, 0x8C],
		'AntiqueWhite': [0xFA, 0xEB, 0xD7],
		'NavajoWhite': [0xFF, 0xDE, 0xAD],
		'BlanchedAlmond': [0xFF, 0xEB, 0xCD],
		'PapayaWhip': [0xFF, 0xEF, 0xD5],
		'Orange': [0xFF, 0xA5, 0x00],
		'Moccasin': [0xFF, 0xE4, 0xB5],
		'Wheat': [0xF5, 0xDE, 0xB3],
		'OldLace': [0xFD, 0xF5, 0xE6],
		'FloralWhite': [0xFF, 0xFA, 0xF0],
		'Goldenrod': [0xDA, 0xA5, 0x20],
		'DarkGoldenrod': [0xB8, 0x86, 0x0B],
		'Cornsilk': [0xFF, 0xF8, 0xDC],
		'Gold': [0xFF, 0xD7, 0x00],
		'PaleGoldenrod': [0xEE, 0xE8, 0xAA],
		'Khaki': [0xF0, 0xE6, 0x8C],
		'LemonChiffon': [0xFF, 0xFA, 0xCD],
		'DarkKhaki': [0xBD, 0xB7, 0x6B],
		'Beige': [0xF5, 0xF5, 0xDC],
		'LightGoldenrodYellow': [0xFA, 0xFA, 0xD2],
		'Olive': [0x80, 0x80, 0x00],
		'Yellow': [0xFF, 0xFF, 0x00],
		'LightYellow': [0xFF, 0xFF, 0xE0],
		'Ivory': [0xFF, 0xFF, 0xF0],
		'OliveDrab': [0x6B, 0x8E, 0x23],
		'YellowGreen': [0x9A, 0xCD, 0x32],
		'DarkOliveGreen': [0x55, 0x6B, 0x2F],
		'GreenYellow': [0xAD, 0xFF, 0x2F],
		'LawnGreen': [0x7C, 0xFC, 0x00],
		'Chartreuse': [0x7F, 0xFF, 0x00],
		'DarkSeaGreen': [0x8F, 0xBC, 0x8F],
		'ForestGreen': [0x22, 0x8B, 0x22],
		'LimeGreen': [0x32, 0xCD, 0x32],
		'LightGreen': [0x90, 0xEE, 0x90],
		'PaleGreen': [0x98, 0xFB, 0x98],
		'DarkGreen': [0x00, 0x64, 0x00],
		'Green': [0x00, 0x80, 0x00],
		'Lime': [0x00, 0xFF, 0x00],
		'Honeydew': [0xF0, 0xFF, 0xF0],
		'MediumSeaGreen': [0x3C, 0xB3, 0x71],
		'SeaGreen': [0x2E, 0x8B, 0x57],
		'SpringGreen': [0x00, 0xFF, 0x7F],
		'MintCream': [0xF5, 0xFF, 0xFA],
		'MediumSpringGreen': [0x00, 0xFA, 0x9A],
		'MediumAquamarine': [0x66, 0xCD, 0xAA],
		'Aquamarine': [0x7F, 0xFF, 0xD4],
		'Turquoise': [0x40, 0xE0, 0xD0],
		'LightSeaGreen': [0x20, 0xB2, 0xAA],
		'MediumTurquoise': [0x48, 0xD1, 0xCC],
		'DarkSlateGray': [0x2F, 0x4F, 0x4F],
		'PaleTurquoise': [0xAF, 0xEE, 0xEE],
		'Teal': [0x00, 0x80, 0x80],
		'DarkCyan': [0x00, 0x8B, 0x8B],
		'DarkTurquoise': [0x00, 0xCE, 0xD1],
		'Aqua': [0x00, 0xFF, 0xFF],
		'Cyan': [0x00, 0xFF, 0xFF],
		'LightCyan': [0xE0, 0xFF, 0xFF],
		'Azure': [0xF0, 0xFF, 0xFF],
		'CadetBlue': [0x5F, 0x9E, 0xA0],
		'PowderBlue': [0xB0, 0xE0, 0xE6],
		'LightBlue': [0xAD, 0xD8, 0xE6],
		'DeepSkyBlue': [0x00, 0xBF, 0xFF],
		'SkyBlue': [0x87, 0xCE, 0xEB],
		'LightSkyBlue': [0x87, 0xCE, 0xFA],
		'SteelBlue': [0x46, 0x82, 0xB4],
		'AliceBlue': [0xF0, 0xF8, 0xFF],
		'DodgerBlue': [0x1E, 0x90, 0xFF],
		'SlateGray': [0x70, 0x80, 0x90],
		'LightSlateGray': [0x77, 0x88, 0x99],
		'LightSteelBlue': [0xB0, 0xC4, 0xDE],
		'CornflowerBlue': [0x64, 0x95, 0xED],
		'RoyalBlue': [0x41, 0x69, 0xE1],
		'MidnightBlue': [0x19, 0x19, 0x70],
		'Lavender': [0xE6, 0xE6, 0xFA],
		'Navy': [0x00, 0x00, 0x80],
		'DarkBlue': [0x00, 0x00, 0x8B],
		'MediumBlue': [0x00, 0x00, 0xCD],
		'Blue': [0x00, 0x00, 0xFF],
		'GhostWhite': [0xF8, 0xF8, 0xFF],
		'DarkSlateBlue': [0x48, 0x3D, 0x8B],
		'SlateBlue': [0x6A, 0x5A, 0xCD],
		'MediumSlateBlue': [0x7B, 0x68, 0xEE],
		'MediumPurple': [0x93, 0x70, 0xDB],
		'BlueViolet': [0x8A, 0x2B, 0xE2],
		'Indigo': [0x4B, 0x00, 0x82],
		'DarkOrchid': [0x99, 0x32, 0xCC],
		'DarkViolet': [0x94, 0x00, 0xD3],
		'MediumOrchid': [0xBA, 0x55, 0xD3],
		'Thistle': [0xD8, 0xBF, 0xD8],
		'Plum': [0xDD, 0xA0, 0xDD],
		'Violet': [0xEE, 0x82, 0xEE],
		'Purple': [0x80, 0x00, 0x80],
		'DarkMagenta': [0x8B, 0x00, 0x8B],
		'Magenta': [0xFF, 0x00, 0xFF],
		'Fuchsia': [0xFF, 0x00, 0xFF],
		'Orchid': [0xDA, 0x70, 0xD6],
		'MediumVioletRed': [0xC7, 0x15, 0x85],
		'DeepPink': [0xFF, 0x14, 0x93],
		'HotPink': [0xFF, 0x69, 0xB4],
		'PaleVioletRed': [0xDB, 0x70, 0x93],
		'LavenderBlush': [0xFF, 0xF0, 0xF5],
		'Crimson': [0xDC, 0x14, 0x3C],
		'Pink': [0xFF, 0xC0, 0xCB],
		'LightPink': [0xFF, 0xB6, 0xC1],
		'RosyBrown': [0xBC, 0x8F, 0x8F],
		'IndianRed': [0xCD, 0x5C, 0x5C],
		'Brown': [0xA5, 0x2A, 0x2A],
		'FireBrick': [0xB2, 0x22, 0x22],
		'LightCoral': [0xF0, 0x80, 0x80],
		'Maroon': [0x80, 0x00, 0x00],
		'DarkRed': [0x8B, 0x00, 0x00],
		'Red': [0xFF, 0x00, 0x00]
	},
	
	Color: function() {        
        this.updateRGB = function() {		
            this.h = Math.max(0, Math.min(this.h, 1));
            this.s = Math.max(0, Math.min(this.s, 1));
            this.v = Math.max(0, Math.min(this.v, 1));
            
            if (this.s == 0) {
               this.r = this.g = this.b = this.v;
            } else {
                var_h = this.h == 1? 0 : this.h * 6;
                var_i = Math.floor(var_h);
                var_1 = this.v * (1 - this.s);
                var_2 = this.v * (1 - this.s * (var_h - var_i));
                var_3 = this.v * (1 - this.s * (1 - (var_h - var_i)));
                
                if (var_i == 0) {this.r = this.v;this.g = var_3;this.b = var_1}
                else if (var_i == 1) {this.r = var_2;this.g = this.v;this.b = var_1}
                else if (var_i == 2) {this.r = var_1;this.g = this.v;this.b = var_3}
                else if (var_i == 3) {this.r = var_1;this.g = var_2;this.b = this.v}
                else if (var_i == 4) {this.r = var_3;this.g = var_1;this.b = this.v}
                else {this.r = this.v;this.g = var_1;this.b = var_2};
            }
            return this;
        };
        
        this.updateHSV = function() {
            this.r = Math.max(0, Math.min(this.r, 1));
            this.g = Math.max(0, Math.min(this.g, 1));
            this.b = Math.max(0, Math.min(this.b, 1));
            
            var minVal = Math.min(this.r, this.g, this.b);
            var maxVal = Math.max(this.r, this.g, this.b);
            var delta = maxVal - minVal;

            this.v = maxVal;

            if (delta == 0) {
                this.h = 0;
                this.s = 0;
            } else {
                this.s = delta / maxVal;
                var del_R = (((maxVal - this.r) / 6) + (delta / 2)) / delta;
                var del_G = (((maxVal - this.g) / 6) + (delta / 2)) / delta;
                var del_B = (((maxVal - this.b) / 6) + (delta / 2)) / delta;

                if (this.r == maxVal) {this.h = del_B - del_G;}
                else if (this.g == maxVal) {this.h = (1 / 3) + del_R - del_B;}
                else if (this.b == maxVal) {this.h = (2 / 3) + del_G - del_R;}

                if (this.h < 0) {this.h += 1;}
                if (this.h > 1) {this.h -= 1;}
            } 
			return this;
        };
		
        this._hexify = function(number) {
           // return Math.round(number).toString(16);
            var digits = '0123456789ABCDEF';
            var lsd = number % 16;
            var msd = (number - lsd) / 16;
            var hexified = digits.charAt(msd) + digits.charAt(lsd);
            return hexified;
        };

        this.toHex = function() {
            return "#" + this._hexify(this.r * 255) + this._hexify(this.g * 255) + this._hexify(this.b * 255);
        };      
		
        this.toHexAlpha = function() {
            return this._hexify(this.a * 255);
        };
        
        this.dump = function() {
            return '('+this.h+','+this.s+','+this.v+'),('+this.r+','+this.g+','+this.b+'),'+this.a;
        };
        
        this.normClone = function() {
            return $.extend({}, this, {s:1, v:1}).updateRGB();
        };
       
        for (var a = 0; a < arguments.length; ++a) {
			arguments[a] = Math.max(0, Math.min(arguments[a], 1));
        }
        
        if (arguments.length == 0) {
            this.r = 0;
            this.g = 0;
            this.b = 0;
            this.a = 1;
            this.h = 0;
            this.s = 0;
            this.v = 0;
        } else if (arguments.length == 3) {
            // r,g,b
            this.r = arguments[0] || 0;
            this.g = arguments[1] || 0;
            this.b = arguments[2] || 0;
            this.a = 1;
            this.updateHSV();
        } else if (arguments.length == 4) {
            this.r = arguments[0] || 0;
            this.g = arguments[1] || 0;
            this.b = arguments[2] || 0;
            this.a = arguments[3] || 0;
            this.updateHSV();
        } else if (arguments.length == 7) {
            // r,g,b,a,h,s,v
            this.r = arguments[0] || 0;
            this.g = arguments[1] || 0;
            this.b = arguments[2] || 0;
            this.a = arguments[3] || 0;
            this.h = arguments[4] || 0;
            this.s = arguments[5] || 0;
            this.v = arguments[6] || 0;
        }
    }	
});

})(jQuery);