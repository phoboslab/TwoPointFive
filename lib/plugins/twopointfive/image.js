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
	
	onload: function( event ) {
		this.texture = ig.system.renderer.loadTexture(this.data);
		this.parent(event);
	}
});

});