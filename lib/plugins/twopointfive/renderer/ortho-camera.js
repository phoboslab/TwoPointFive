ig.module(
	'plugins.twopointfive.renderer.ortho-camera'
)
.requires(
	'plugins.twopointfive.namespace'
)
.defines(function(){ "use strict";


tpf.OrthoCamera = ig.Class.extend({
	_projection: null, 
	_view: null,
	aspect: 1,
	depthTest: false,

	init: function( width, height ) {
		this._projection = mat4.create();
		this._view = mat4.create();
		mat4.ortho(this._projection, 0, width, height, 0, -1000, 1000);
		
		this.aspect = width/height;
		this.width = width;
		this.height = height;
	},

	projection: function() {
		return this._projection;
	},

	view: function() {
		return this._view;
	}
});

});
