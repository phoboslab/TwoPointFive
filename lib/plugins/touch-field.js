ig.module(
	'plugins.touch-field'
)
.requires(
	'impact.system'
)
.defines(function(){

ig.TouchField = ig.Class.extend({
	pos: {x: 0, y: 0},
	size: {x: 0, y: 0},
	
	input: {x: 0, y: 0, dx: 0, dy: 0},
	pressed: false,
	
	angle: 0,
	amount: 0,
	
	_touchId: null,
	_startPos: {x: 0, y: 0},
	touched: false,

	touchStartBound: null,
	touchMoveBound: null,
	touchEndBound: null,
	
	init: function( x, y, width, height ) {
		this.pos = {x: x, y: y};
		this.size = {x: width, y: height};

		this.touchStartBound = this.touchStart.bind(this);
		this.touchMoveBound = this.touchMove.bind(this);
		this.touchEndBound = this.touchEnd.bind(this);

		ig.system.canvas.addEventListener( 'touchstart', this.touchStartBound, false );
		ig.system.canvas.addEventListener( 'touchmove', this.touchMoveBound, false );
		ig.system.canvas.addEventListener( 'touchend', this.touchEndBound, false );
	},

	remove: function() {
		ig.system.canvas.removeEventListener( 'touchstart', this.touchStartBound, false );
		ig.system.canvas.removeEventListener( 'touchmove', this.touchMoveBound, false );
		ig.system.canvas.removeEventListener( 'touchend', this.touchEndBound, false );
	},
	
	touchStart: function( ev ) {
		ev.preventDefault();
		
		if( this.pressed ) { return; }
		for( var i = 0; i < ev.touches.length; i++ ) {
			var touch = ev.touches[i];
			
			var x = touch.pageX;
			var y = touch.pageY;
			
			if(
				x > this.pos.x && x < this.pos.x + this.size.x &&
				y > this.pos.y && y < this.pos.y + this.size.y
			 ) {
				this.pressed = true;
				this.touched = true;
				this.input.dx = 0;
				this.input.dy = 0;
				this._touchId = touch.identifier;
				this._startPos.x = x;
				this._startPos.y = y;
				return;
			}
		}
	},
	
	touchMove: function( ev ) {
		ev.preventDefault();
		
		for( var i = 0; i < ev.changedTouches.length; i++ ) {
			if( ev.changedTouches[i].identifier == this._touchId ) {
				this._moved( ev.changedTouches[i] );
				return;
			}
		}
	},
	
	_moved: function( touch ) {
		var nx = touch.pageX - this._startPos.x;
		var ny = touch.pageY - this._startPos.y;
		this.input.dx = this.input.x - nx;
		this.input.dy = this.input.y - ny;
		this.input.x = nx;
		this.input.y = ny;
	},
	
	touchEnd: function( ev ) {
		ev.preventDefault();
		
		for( var i = 0; i < ev.changedTouches.length; i++ ) {
			if( ev.changedTouches[i].identifier == this._touchId ) {
				this.pressed = false;
				this.input.x = 0;
				this.input.dx = 0;
				this.input.y = 0;
				this.input.dy = 0;
				this._touchId = null;
				return;
			}
		}
	}
});


});