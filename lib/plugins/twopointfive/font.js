ig.module(
	'plugins.twopointfive.font'
)
.requires(
	'impact.font',

	'plugins.twopointfive.namespace',
	'plugins.twopointfive.renderer.quad'
)
.defines(function(){ "use strict";
	
	
tpf.Font = ig.Font.extend({
	_quads: [],
	_glAlpha: 1,

	draw: function( text, x, y, align, alpha ) {
		this._glAlpha = typeof(alpha) != 'undefined' ? alpha : 1;
		this.parent(text, x, y, align);
	},
	
	_drawChar: function( c, targetX, targetY ) {
		if( !this.loaded || c < 0 || c >= this.indices.length ) { return 0; }		
		
		var charX = this.indices[c];
		var charY = 0;
		var charWidth = this.widthMap[c];
		var charHeight = (this.height-2);		
		
		var q = this._quads[c];
		q.setAlpha(this._glAlpha);
		q.setPosition(targetX + charWidth/2, targetY + charHeight/2, 0);
		ig.system.renderer.pushQuad(q);
		
		return charWidth + this.letterSpacing;
	},

	
	onload: function( event ) {
		this.parent(event);

		var charHeight = this.height-2;
		for( var i = 0; i < this.indices.length; i++ ) {
			var index = this.indices[i];
			var charWidth = this.widthMap[i];

			var q = new tpf.Quad(charWidth, charHeight, this.texture);
			q.setUV(
				index / this.data.width, 0,
				(index + charWidth) / this.data.width, charHeight / this.data.height
			);

			this._quads.push(q);
		}
	}
});

});