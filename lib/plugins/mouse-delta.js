ig.module(
	'plugins.mouse-delta'
)
.requires(
	'impact.input'
)
.defines(function(){

ig.Input.inject({
	mouseDelta: {x: 0, y: 0},
	
	mousemove: function( event ) {
		var oldX = this.mouse.x;
		var oldY = this.mouse.y;
		
		this.parent( event );
	
		// Needed because mousemove() is also called for click events	
		if( event.type == 'mousemove' ) {
			this.mouseDelta.x += 
				event.movementX ||
				event.mozMovementX ||
				event.webkitMovementX ||
				this.mouse.x - oldX;
				
			this.mouseDelta.y += 
				event.movementY ||
				event.mozMovementY ||
				event.webkitMovementY ||
				this.mouse.y - oldY;
		}
	},
	
	clearPressed: function() {
		this.parent();
		
		this.mouseDelta.x = 0;
		this.mouseDelta.y = 0;
	}
})

});