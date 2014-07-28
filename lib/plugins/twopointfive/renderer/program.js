ig.module(
	'plugins.twopointfive.renderer.program'
)
.requires(
	'plugins.twopointfive.namespace'
)
.defines(function(){ "use strict";


tpf.Program = ig.Class.extend({
	uniform: {},
	attribute: {},

	init: function( gl, vertexSource, fragmentSource ) {
		var vsh = this.compile(gl, vertexSource, gl.VERTEX_SHADER);
		var fsh = this.compile(gl, fragmentSource, gl.FRAGMENT_SHADER);

		this.program = gl.createProgram();
		gl.attachShader(this.program, vsh);
		gl.attachShader(this.program, fsh);
		gl.linkProgram(this.program);

		if( !gl.getProgramParameter(this.program, gl.LINK_STATUS) ) {
			console.log(gl.getProgramInfoLog(this.program));
		}

		gl.useProgram(this.program);

		// Collect attributes
		this._collect(vertexSource, 'attribute', this.attribute);
		for( var a in this.attribute ) {
			this.attribute[a] = gl.getAttribLocation(this.program, a);
		}

		// Collect uniforms
		this._collect(vertexSource, 'uniform', this.uniform);
		this._collect(fragmentSource, 'uniform', this.uniform);
		for( var u in this.uniform ) {
			this.uniform[u] = gl.getUniformLocation(this.program, u);
		}
	},

	compile: function( gl, source, type ) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
			console.log(gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	},

	_collect: function( source, prefix, collection ) {
		var r = new RegExp('\\b' + prefix + ' \\w+ (\\w+)', 'ig');
		source.replace(r, function(match, name) {
			collection[name] = 0;
			return match;
		});
	}
});


});
