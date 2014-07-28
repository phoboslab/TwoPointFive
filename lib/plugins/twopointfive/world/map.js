ig.module(
	'plugins.twopointfive.world.map'
)
.requires(
	'impact.background-map',

	'plugins.twopointfive.namespace',
	'plugins.twopointfive.world.tile'
)
.defines(function(){ "use strict";


tpf.Map = ig.BackgroundMap.extend({
	tileData: {},
	yOffset: 0,
	
	init: function( tilesize, data, tileset, orientation, anims ) {
		this.parent( tilesize, data, tileset );
		this.yOffset = this.tilesize/2 * (orientation == 'floor' ? -1 : 1);

		this.anims = anims || {};
		
		// Create tiles
		for( var y = 0; y < this.height; y++ ){
			for( var x = 0; x < this.width; x++ ){
				var tile = this.data[y][x];
				if( tile !== 0 ) {
					if( !this.tileData[y] ) {
						this.tileData[y] = {};
					}

					var anim = this.anims[tile-1] || null;
					this.tileData[y][x] = this.createTileAtPosition( tile-1, x, y, anim );
				}
			}
		}
	},

	draw: function() {}, // Maps are drawn by tpf.CulledSectors
	
	hasTile: function( x, y ) {
		return (x >= 0 && y >= 0 && this.data[y] && this.data[y][x]);
	},
	
	createTileAtPosition: function( tile, x, y, anim ) {
		var t = new tpf.Tile( this.tiles, tile, this.tilesize );
		t.quad.setPosition(
			x * this.tilesize + this.tilesize/2,
			this.yOffset,
			y * this.tilesize + this.tilesize/2
		);
		t.quad.setRotation((-90).toRad(), 0, 0);
		t.anim = anim;
		return t;
	},
	
	applyLightMap: function( lightMap ) {
		for( var y in this.tileData ) {
			for( var x in this.tileData[y] ) {
				var tile = this.tileData[y][x],
					rx = x|0,
					ry = y|0;
				tile.quad.setColor(lightMap.getLight(rx, ry));
			}
		}
	},

	getTilesInRect: function( xs, ys, w, h ) {
		var tiles = [];
		for( var y = ys; y < ys + h; y++ ) {
			if( !this.tileData[y] ) { continue; }
			
			for( var x = xs; x < xs + w; x++ ) {
				if( !this.tileData[y][x] ) { continue; }
				tiles.push(this.tileData[y][x]);
			}
		}
		return tiles;
	}
});


});
