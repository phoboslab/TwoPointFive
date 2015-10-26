ig.module(
	'plugins.twopointfive.image'
)
.requires(
	'impact.image',

	'plugins.twopointfive.namespace',
	'plugins.twopointfive.renderer.renderer'
)
.defines(function(){ "use strict";


ig.Image.inject({
	texture: null,

	seamsExpanded: false,
	textureWidth: 0,
	textureHeight: 0,
	
	onload: function( event ) {
		this.texture = ig.system.renderer.loadTexture(this.data);
		this.textureWidth = this.data.width;
		this.textureHeight = this.data.height;
		this.parent(event);
	},

	expandSeams: function(tilesize) {
		if( this.seamsExpanded ) { return; }
		this.seamsExpanded = true;


		var tw = (this.width / tilesize)|0,
			th = (this.height / tilesize)|0;

		this.textureWidth = this.width + tw * 2 - 2;
		this.textureHeight = this.height + th * 2 - 2;

		var expandedCanvas = ig.$new('canvas');
		expandedCanvas.width = this.textureWidth;
		expandedCanvas.height = this.textureHeight;
		var ctx = expandedCanvas.getContext('2d');
		ig.System.SCALE.CRISP(expandedCanvas, ctx);
		
		for( var y = 0, dy = -1; y < th; y++, dy += (tilesize+2) ) {
			for( var x = 0, dx = -1; x < tw; x++, dx += (tilesize+2) ) {

				// Left edge
				if( dx > 0 ) {
					ctx.drawImage(this.data, x*tilesize, y*tilesize, 1, tilesize, dx, dy+1, 1, tilesize);
				}

				// Right edge
				if( dx < this.width - tilesize ) {
					ctx.drawImage(this.data, (x+1)*tilesize-1, y*tilesize, 1, tilesize, dx+tilesize+1, dy+1, 1, tilesize);
				}

				// Top edge, draw expanded first to cover the corners
				if( dy > 0 ) {
					ctx.drawImage(this.data, x*tilesize, y*tilesize, tilesize, 1, dx, dy, tilesize+2, 1);
					ctx.drawImage(this.data, x*tilesize, y*tilesize, tilesize, 1, dx+1, dy, tilesize, 1);
				}

				// Bottom edge, draw expanded first to cover the corners
				if( dy < this.height - tilesize ) {
					ctx.drawImage(this.data, x*tilesize, (y+1)*tilesize-1, tilesize, 1, dx, dy+tilesize+1, tilesize+2, 1);
					ctx.drawImage(this.data, x*tilesize, (y+1)*tilesize-1, tilesize, 1, dx+1, dy+tilesize+1, tilesize, 1);
				}

				// Tile
				ctx.drawImage(this.data, x*tilesize, y*tilesize, tilesize, tilesize, dx+1, dy+1, tilesize, tilesize);
			}
		}

		// Replace texture with the expanded version
		this.texture = ig.system.renderer.loadTexture(expandedCanvas);
	}
});

});
