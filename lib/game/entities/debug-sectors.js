ig.module(
	'game.entities.debug-sectors'
)
.requires(
	'plugins.twopointfive.entity',
	'plugins.twopointfive.world.culled-sectors'
)
.defines(function(){

// This Entity can be placed in weltmeister to visualize the sector boundaries
// in the level. It does not have any purpose in the game.

EntityDebugSectors = ig.Entity.extend({
	type: ig.Entity.TYPE.NONE,
	checkAgainst: ig.Entity.TYPE.NONE,
	collides: ig.Entity.COLLIDES.NEVER,
	
	size: {x: 16, y: 16},
	sectorSize: 4,

	_wmDrawBox: true,
	_wmBoxColor: '#fff',

	generate: function() {
		var floorMap = null;
		for( var i = 0; i < ig.editor.layers.length; i++ ) {
			if( ig.editor.layers[i].name == 'floor' ) {
				floorMap = ig.editor.layers[i];
				break;
			}
		}
		if( floorMap ) {
			console
			this.culledSectors = new tpf.CulledSectors( floorMap, [], this.sectorSize );
		}
	},

	draw: function() {
		if( !ig.global.wm ) { return; }

		// Did the sector size change? Regenerate!
		if( !this.culledSectors || this.culledSectors.sectorSize != this.sectorSize ) {
			this.generate();
			return;
		}

		// Draw all portals
		for( var y in this.culledSectors.sectors ) {
			for( var x in this.culledSectors.sectors[y] ) {
				var s = this.culledSectors.sectors[y][x];
				for( var i = 0; i < s.portals.length; i++ ) {
					var p = s.portals[i];
					this.drawLine('#f4f', p.x1, p.y1, p.x2, p.y2);
				}
			}
		}
	},

	drawLine: function( color, sx, sy, dx, dy ) {
		ig.system.context.strokeStyle = color;
		ig.system.context.lineWidth = 1.0;

		ig.system.context.beginPath();
		ig.system.context.moveTo( 
			ig.system.getDrawPos(sx - ig.game.screen.x),
			ig.system.getDrawPos(sy - ig.game.screen.y)
		);
		ig.system.context.lineTo( 
			ig.system.getDrawPos(dx - ig.game.screen.x),
			ig.system.getDrawPos(dy - ig.game.screen.y)
		);
		ig.system.context.stroke();
		ig.system.context.closePath();
	}
});


});
