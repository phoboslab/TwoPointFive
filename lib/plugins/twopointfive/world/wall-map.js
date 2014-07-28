ig.module(
	'plugins.twopointfive.world.wall-map'
)
.requires(

	'plugins.twopointfive.namespace',
	'plugins.twopointfive.world.map'
)
.defines(function(){ "use strict";


tpf.WallMap = tpf.Map.extend({
	createTileAtPosition: function( tile, x, y, anim ) {
		
		// We need 4 tiles, one for each side of the block		
		var tiles = {};
		for( var name in tpf.WallMap.offsets ) {
			var off = tpf.WallMap.offsets[name];
			
			var t = new tpf.Tile( this.tiles, tile, this.tilesize );
			
			t.quad.setPosition(
				(x + off.x/2 + 0.5) * this.tilesize,
				0,
				(y + off.y/2 + 0.5) * this.tilesize
			);
			t.quad.setRotation(0, off.rot, 0);
			t.anim = anim;

			tiles[name] = t;
		}
		
		return tiles;
	},
	
	applyLightMap: function( lightMap ) {
		for( var y in this.tileData ) {
			for( var x in this.tileData[y] ) {
				
				var tiles = this.tileData[y][x],
					rx = x|0,
					ry = y|0;
				
				for( var name in tiles ) {
					var off = tpf.WallMap.offsets[name];
					tiles[name].quad.setColor( lightMap.getLight(rx+off.x, ry+off.y) );
				}
			}
		}
	},
	
	getTilesInRect: function( xs, ys, w, h ) {
		var tiles = [];

		for( var y = ys; y < ys + h; y++ ) {			
			for( var x = xs; x < xs + w; x++ ) {

				// Take care to get the walls _facing_ to this tile, instead of just
				// the walls _on_ this tile
				for( var name in tpf.WallMap.offsets ) {
					var off = tpf.WallMap.offsets[name];
					var tx = x - off.x, 
						ty = y - off.y;

					if( this.hasTile(tx, ty) && this.tileData[ty][tx][name] ) {
						tiles.push(this.tileData[ty][tx][name]);
					}
				}

			}
		}
		return tiles;
	},	
	

	// Typically, all walls that are visible are connected to floor tiles,
	// so we can safely remove those that are not.
	
	eraseDisconnectedWalls: function( floorMap ) {
		for( var y in this.tileData ) {
			for( var x in this.tileData[y] ) {
				
				var tiles = this.tileData[y][x],
					rx = x|0,
					ry = y|0;
				
				for( var name in tpf.WallMap.offsets ) {
					var off = tpf.WallMap.offsets[name];
					if( !floorMap.hasTile(rx + off.x, ry + off.y) ) {
						delete tiles[name];
					}
				}
				
			}
		}
	}
});


tpf.WallMap.offsets = {
	top: 	{x: 0, y:-1, rot: (180).toRad() },
	bottom:	{x: 0, y: 1, rot: (0).toRad() },
	right: 	{x: 1, y: 0, rot: (90).toRad() },
	left: 	{x:-1, y: 0, rot: (-90).toRad() }
};

});
