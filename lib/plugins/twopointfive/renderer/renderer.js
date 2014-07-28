ig.module(
	'plugins.twopointfive.renderer.renderer'
)
.requires(
	'plugins.twopointfive.namespace',
	'plugins.twopointfive.renderer.quad',
	'plugins.twopointfive.renderer.program'
)
.defines(function(){ "use strict";


tpf.Renderer = ig.Class.extend({
	bufferSize: 64, // 64 Quads
	buffer: null,
	texture: null,
	bufferIndex: 0,
	gl: null,
	drawCalls: 0,
	_currentDrawCalls: 0,
	_currentQuadCount: 0,

	depthTest: true,
	wireframe: false,

	fog: null,

	init: function( canvas ) {
		this.canvas = canvas;
		var webglOptions = {
			alpha: false, 
			premultipliedAlpha: false, 
			antialias: false, 
			stencil: false, 
			preserveDrawingBuffer: true 
		};

		this.gl = canvas.getContext( 'webgl', webglOptions);
		if( !this.gl ) {
			this.gl = canvas.getContext( 'experimental-webgl', webglOptions);
		}

		this.setSize( canvas.width, canvas.height );

		this.programDefault = new tpf.Program( this.gl, tpf.Renderer.Shaders.Vertex, tpf.Renderer.Shaders.Fragment );
		this.programFog = new tpf.Program( this.gl, tpf.Renderer.Shaders.Vertex, tpf.Renderer.Shaders.FragmentWithFog );
		this.program = this.programDefault;

		this.buffer = new Float32Array( this.bufferSize * tpf.Quad.SIZE );
		this.glBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuffer);

		this.prepare();
		this.whiteTexture = this.loadTexture(new Uint8Array([0xff,0xff,0xff,0xff]),1,1);
		this.setProgram( this.programDefault );
	},

	setFog: function( color, near, far ) {
		if( color === false || typeof color === 'undefined' ) {
			this.setProgram( this.programDefault, true );
			this.fog = null;
		}
		else {
			this.setProgram( this.programFog, true );

			this.fog = {
				color: color, 
				near: near, 
				far: far
			};

			var c1 = ((color & 0xff0000) >> 16)/255,
				c2 = ((color & 0x00ff00) >> 8)/255,
				c3 = ((color & 0x0000ff) >> 0)/255;
			
			this.gl.uniform3f(this.program.uniform.fogColor, c1, c2, c3);
			this.gl.uniform1f(this.program.uniform.fogNear, near);
			this.gl.uniform1f(this.program.uniform.fogFar, far);
		}
	},

	setSize: function( width, height ) {
		this.width = width;
		this.height = height;
		this.gl.viewport(0, 0, this.width, this.height);
	},

	loadTexture: function( img, width, height ) {
		var texture = this.gl.createTexture();

		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

		if( img instanceof Uint8Array && width && height ) {
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
		}
		else {
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);	
		}
		
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		this.texture = null;
		return texture;
	},

	clear: function( color, depth, stencil ) {
		this.gl.clear( 
			(color ? this.gl.COLOR_BUFFER_BIT : 0) | 
			(depth ? this.gl.DEPTH_BUFFER_BIT : 0) | 
			(stencil ? this.gl.STENCIL_BUFFER_BIT : 0)
		);
	},

	prepare: function() {
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		this.gl.useProgram(this.program.program);
		this.gl.clearColor(0,0,0,1);

		var floatSize = Float32Array.BYTES_PER_ELEMENT;
		var vertSize = floatSize * tpf.Quad.VERTEX_SIZE

		this.gl.enableVertexAttribArray(this.program.attribute.pos);
		this.gl.vertexAttribPointer(this.program.attribute.pos, 3, this.gl.FLOAT, false, vertSize, 0 * floatSize);

		this.gl.enableVertexAttribArray(this.program.attribute.uv);
		this.gl.vertexAttribPointer(this.program.attribute.uv, 2, this.gl.FLOAT, false, vertSize, 3 * floatSize);

		this.gl.enableVertexAttribArray(this.program.attribute.color);
		this.gl.vertexAttribPointer(this.program.attribute.color, 4, this.gl.FLOAT, false, vertSize, 5 * floatSize);
	},

	flush: function() {
		if( this.bufferIndex == 0 ) { return; }

		this._currentDrawCalls++;
		this._currentQuadCount += this.bufferIndex;
		this.gl.bufferData(this.gl.ARRAY_BUFFER, this.buffer, this.gl.DYNAMIC_DRAW);
		this.gl.drawArrays(this.gl.TRIANGLES, 0, this.bufferIndex * tpf.Quad.VERTICES);
		this.bufferIndex = 0;
	},

	render: function( callback ) {
		if( this.wireframe ) {
			this.clear(true,true,true)
		}
		
		callback(this);

		this.flush();
		this.drawCalls = this._currentDrawCalls;
		this.quadCount = this._currentQuadCount;
		this._currentDrawCalls = 0;
		this._currentQuadCount = 0;
	},

	setCamera: function( camera ) {
		this.flush();
		this.gl.uniformMatrix4fv(this.program.uniform.projection, false, camera.projection());
		this.gl.uniformMatrix4fv(this.program.uniform.view, false, camera.view());

		if( camera.depthTest != this.depthTest) {
			this.depthTest = camera.depthTest;
			if( this.depthTest ) {
				this.gl.enable(this.gl.DEPTH_TEST);
			}
			else {
				this.gl.disable(this.gl.DEPTH_TEST);	
			}
		}
	},

	setTexture: function(texture) {
		texture = texture || this.whiteTexture;
		if( texture == this.texture ) {
			return;
		}

		this.flush();
		this.texture = texture;
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
	},
	
	setProgram: function(program, force) {
		if( program == this.program && !force ) {
			return;
		}
		
		this.flush();
		this.program = program;
		this.gl.useProgram(this.program.program);
	},

	pushQuad: function(quad) {
		this.setTexture(quad.texture);
		if( this.bufferIndex + 1 >= this.bufferSize ) {
			this.flush();
		}

		quad.copyToBuffer( this.buffer, this.bufferIndex * tpf.Quad.SIZE );
		this.bufferIndex++;
	},

	pushMesh: function(mesh) {
		// Meshes are drawn immediately; flush out all previous quads
		this.flush();

		this._currentDrawCalls++;
		this._currentQuadCount += mesh.length;
		this.setTexture(mesh.texture);

		this.gl.bufferData(this.gl.ARRAY_BUFFER, mesh.buffer, this.gl.DYNAMIC_DRAW);

		var polygonMode = this.wireframe ? this.gl.LINES : this.gl.TRIANGLES;
		this.gl.drawArrays(polygonMode, 0, mesh.length * tpf.Quad.VERTICES);
	}
});

tpf.Renderer.Shaders = {
	Vertex: [
		"precision highp float;",

		"attribute vec3 pos;",
		"attribute vec2 uv;",
		"attribute vec4 color;",

		"varying vec4 vColor;",
		"varying vec2 vUv;",

		"uniform mat4 view;",
		"uniform mat4 projection;",

		"void main(void) {",
			"vColor = color;",
			"vUv = uv;",
			"gl_Position = projection * view * vec4(pos, 1.0);",

		"}"
	].join('\n'),

	Fragment: [
		"precision highp float;",

		"varying vec4 vColor;",
		"varying vec2 vUv;",

		"uniform sampler2D texture;",

		"void main(void) {",
			"vec4 tex = texture2D(texture, vUv);",
			"if( tex.a < 0.8 ) discard;",
			"gl_FragColor =  tex * vColor;",
		"}"
	].join('\n'),

	FragmentWithFog: [
		"precision highp float;",

		"varying vec4 vColor;",
		"varying vec2 vUv;",

		"uniform sampler2D texture;",

		"uniform vec3 fogColor;",
		"uniform float fogNear;",
		"uniform float fogFar;",

		"void main(void) {",
			"float depth = gl_FragCoord.z / gl_FragCoord.w;",
			"float fogFactor = smoothstep( fogFar, fogNear, depth );",
			"fogFactor = 1.0 - clamp( fogFactor, 0.2, 1.0);",

			"vec4 tex = texture2D(texture, vUv);",
			"if( tex.a < 0.8 ) discard;",
			"gl_FragColor =  tex * vColor;",
			"gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor.rgb, fogFactor);",
		"}"
	].join('\n')
};


});
