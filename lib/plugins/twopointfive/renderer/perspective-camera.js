ig.module(
	'plugins.twopointfive.renderer.perspective-camera'
)
.requires(
	'plugins.twopointfive.namespace'
)
.defines(function(){ "use strict";

	
tpf.PerspectiveCamera = ig.Class.extend({
	_projection: null, 
	_view: null,

	position: null,
	rotation: null,
	aspect: 1,
	depthTest: true,

	init: function( fov, aspect, near, far ) {
		this._projection = mat4.create();
		this._view = mat4.create();
		this.position = vec3.create();
		this.rotation = vec3.create();

		mat4.perspective(this._projection, fov.toRad(), aspect, near, far);
		this.aspect = aspect;
	},

	setRotation: function( x, y, z ) {
		this.rotation[0] = x;
		this.rotation[1] = z;
		this.rotation[2] = y;
	},

	setPosition: function( x, y, z ) {
		this.position[0] = x;
		this.position[1] = z;
		this.position[2] = y;
	},

	projection: function() {
		return this._projection;
	},

	view: function() {
		var m = this._view;
		var rot = this.rotation;
		
		mat4.identity(m);
		
		if( rot[2] ) { mat4.rotateZ(m, m, -rot[2]); }
		if( rot[0] ) { mat4.rotateX(m, m, -rot[0]); }
		if( rot[1] ) { mat4.rotateY(m, m, -rot[1]); }
		
		mat4.translate(m, m, [-this.position[0], -this.position[1], -this.position[2]]);
		
		return m;
	}
});

});
