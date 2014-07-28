ig.module(
	'plugins.twopointfive.world.light-map'
)
.requires(
	'impact.image',
	'impact.map',

	'plugins.twopointfive.namespace'
)
.defines(function(){ "use strict";


tpf.LightMap = ig.Map.extend({
	white: {r:1, g:1, b:1},
	
	init: function( tilesize, data, tileset ) {
		this.parent( tilesize, ig.copy(data) );
			
		// Grab the colors from the tileset
		var tilesetName  = tileset instanceof ig.Image ? tileset.path : tileset;
		var tiles = new ig.Image( tilesetName );
		
		var px = ig.getImagePixels(tiles.data, 0, 0, tiles.width, tiles.height).data;
		var colors = [];
		
		for( var y = 0; y < tiles.height; y+=tilesize ) {
			for( var x = 0; x < tiles.width; x+=tilesize ) {
				var index = (y * tiles.width + x) * 4;
				var color = {r:px[index]/255, g:px[index+1]/255, b:px[index+2]/255};
				colors.push( color );
			}
		}
		
		// Go through the map and replace the tile numbers with the 
		// actual color values	
		for( var y = 0; y < this.height; y++ ) {
			for( var x = 0; x < this.width; x++ ) {
				
				// Defaults to white (0xffffff)
				var tile = this.data[y][x];
				this.data[y][x] = tile ? colors[tile-1] : this.white;
			}
		}
	},
	
	
	getLight: function( x, y ) {
		if( 
			(x >= 0 && x < this.width) &&
			(y >= 0 && y < this.height)
		) {
			return this.data[y][x];
		} 
		else {
			return this.white;
		}
	}
});

});
