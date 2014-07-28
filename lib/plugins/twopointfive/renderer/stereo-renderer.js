ig.module(
	'plugins.twopointfive.renderer.stereo-renderer'
)
.requires(
	'plugins.twopointfive.namespace',
	'plugins.twopointfive.renderer.renderer'
)
.defines(function(){ "use strict";

	
tpf.StereoRenderer = tpf.Renderer.extend({
	eyes: {
		left: {},
		right: {}
	},

	viewportFov: 110,

	init: function( canvas, hmd, worldScale ) {
		this.parent(canvas);

		// Calculate lens distortion and fov 
		var aspect = hmd.hResolution / (2 * hmd.vResolution);
		var r = -1.0 - (4 * (hmd.hScreenSize/4 - hmd.lensSeparationDistance/2) / hmd.hScreenSize);
		var h = 4 * (hmd.hScreenSize/4 - hmd.interpupillaryDistance/2) / hmd.hScreenSize;

		var dk = hmd.distortionK;
		var distScale = (dk[0] + dk[1] * Math.pow(r,2) + dk[2] * Math.pow(r,4) + dk[3] * Math.pow(r,6));
		var lensShift = 4 * (hmd.hScreenSize/4 - hmd.lensSeparationDistance/2) / hmd.hScreenSize;
		this.viewportFov = 2 * Math.atan2(hmd.vScreenSize * distScale, 2 * hmd.eyeToScreenDistance);


		// Calculate projection matrices
		var projection = mat4.perspective(mat4.create(), this.viewportFov, aspect, 1, 10000);
		
		var pleft = mat4.create();
		mat4.translate(pleft, pleft, [h, 0, 0]);
		mat4.mul(pleft, pleft, projection);

		var pright = mat4.create();
		mat4.translate(pright, pright, [-h, 0, 0]);
		mat4.mul(pright, pright, projection);


		// Set up eyes
		worldScale = worldScale || 4;
		this.eyes.left.offset = -worldScale * hmd.interpupillaryDistance/2;
		this.eyes.left.lensShift = lensShift;
		this.eyes.left.projection = pleft;

		this.eyes.right.offset = worldScale * hmd.interpupillaryDistance/2;
		this.eyes.right.lensShift = -lensShift;
		this.eyes.right.projection = pright;


		// Create the lens wrap shader
		this.lensWarp = new tpf.Program( this.gl, tpf.StereoRenderer.Shaders.LensWarpVertex, tpf.StereoRenderer.Shaders.LensWarpFragment );
		this.gl.useProgram( this.lensWarp.program );

		var floatSize = Float32Array.BYTES_PER_ELEMENT;
		var vertSize = floatSize * tpf.Quad.VERTEX_SIZE

		this.gl.enableVertexAttribArray(this.lensWarp.attribute.pos);
		this.gl.vertexAttribPointer(this.lensWarp.attribute.pos, 3, this.gl.FLOAT, false, vertSize, 0 * floatSize);

		this.gl.enableVertexAttribArray(this.lensWarp.attribute.uv);
		this.gl.vertexAttribPointer(this.lensWarp.attribute.uv, 2, this.gl.FLOAT, false, vertSize, 3 * floatSize);

		this.gl.uniform4f(this.lensWarp.uniform.hmdWarpParam, dk[0], dk[1], dk[2], dk[3]);
		this.gl.uniform2f(this.lensWarp.uniform.scaleIn, 1.0, 1.0/aspect);
		this.gl.uniform2f(this.lensWarp.uniform.scale, 1.0/distScale, 1.0 * aspect/distScale);
	},

	setSize: function( width, height ) {
		this.parent(width, height);

		var width2 = width/2;
		var ss = 2; // super sampling

		this.eyes.left.width = width2 * ss;
		this.eyes.left.height = height * ss;
		this.eyes.left.viewport = {x:0, y:0, width:width2, height:height};
		this.eyes.left.quad = this.createFBOTextureQuad( width2 * ss, height * ss );

		this.eyes.right.width = width2 * ss;
		this.eyes.right.height = height * ss;
		this.eyes.right.viewport = {x:width2, y:0, width:width2, height:height};
		this.eyes.right.quad = this.createFBOTextureQuad( width2 * ss, height * ss );
	},


	_renderSceneForEye: function( eye, sceneCallback ) {
		this.gl.viewport(0, 0, eye.width, eye.height);
		this.gl.bindFramebuffer( this.gl.FRAMEBUFFER, eye.quad.fbo );
		this.currentEye = eye; // needed to override setCamera

		if( this.wireframe ) {
			this.clear(true,true,true)
		}
		sceneCallback(this);

		this.flush();
	},

	_renderEyeOnScreen: function( eye ) {
		this.gl.viewport(eye.viewport.x, eye.viewport.y, eye.viewport.width, eye.viewport.height);
		this.gl.uniform2f(this.lensWarp.uniform.lensCenter, eye.lensShift, 0);
		this.pushQuad( eye.quad );
		this.flush();
	},

	render: function( sceneCallback ) {
		var floatSize = Float32Array.BYTES_PER_ELEMENT;
		var vertSize = floatSize * tpf.Quad.VERTEX_SIZE;

		// Render eyes
		this.gl.useProgram( this.program.program );

		this.gl.vertexAttribPointer(this.program.attribute.pos, 3, this.gl.FLOAT, false, vertSize, 0 * floatSize);
		this.gl.vertexAttribPointer(this.program.attribute.uv, 2, this.gl.FLOAT, false, vertSize, 3 * floatSize);
		this.gl.vertexAttribPointer(this.program.attribute.color, 4, this.gl.FLOAT, false, vertSize, 5 * floatSize);

		this._renderSceneForEye(this.eyes.left, sceneCallback);
		this._renderSceneForEye(this.eyes.right, sceneCallback);
		


		// Render Screen
		this.gl.useProgram( this.lensWarp.program );
		this.gl.vertexAttribPointer(this.lensWarp.attribute.pos, 3, this.gl.FLOAT, false, vertSize, 0 * floatSize);
		this.gl.vertexAttribPointer(this.lensWarp.attribute.uv, 2, this.gl.FLOAT, false, vertSize, 3 * floatSize);

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.clear(true, true, true);

		this._renderEyeOnScreen(this.eyes.left);
		this._renderEyeOnScreen(this.eyes.right);

		this.drawCalls = this._currentDrawCalls;
		this._currentDrawCalls = 0;
	},

	createFBOTextureQuad: function( width, height ) {
		var fbo = this.gl.createFramebuffer();
    	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);

    	var renderbuffer = this.gl.createRenderbuffer();
		this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
    	this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);

		var texture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
		this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbuffer);

		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

		var quad = new tpf.Quad( 2, 2, texture );
		quad.fbo = fbo;

		return quad;
	},

	setCamera: function( camera ) {
		this.flush();

		var projection = camera.projection();
		var view = camera.view();


		// Transform Perspective Camera to current eye coordinates
		if( camera instanceof tpf.PerspectiveCamera ) {
			var tt = vec3.fromValues(
				Math.cos(camera.rotation[1]) * -this.currentEye.offset,
				0,
				Math.sin(camera.rotation[1]) * this.currentEye.offset
			);
			mat4.translate( view, view, tt );
			projection = this.currentEye.projection;
		}

		// Cheap hack to transform HUD into center of the screen
		else if( camera instanceof tpf.OrthoCamera ) {
			var scale = 0.5;
			projection = mat4.ortho(mat4.create(), 0, camera.width, camera.height, 0, -1000, 1000);

			var hshift = (camera.width - camera.width * scale) * 0.5;
			var vshift = (camera.height - camera.height * scale) * 0.5;
			mat4.translate(projection, projection, [hshift + this.currentEye.lensShift * camera.width * 0.625, vshift, 0]);
			mat4.scale(projection, projection, [scale, scale, 1]);
		}
			
		this.gl.uniformMatrix4fv(this.program.uniform.projection, false, projection);
		this.gl.uniformMatrix4fv(this.program.uniform.view, false, view);

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
});

tpf.StereoRenderer.Shaders = {
	LensWarpVertex: [
		"precision highp float;",

		"attribute vec3 pos;",
		"attribute vec2 uv;",

		"varying vec2 vUv;",

		"void main(void) {",
			"vUv = uv;",
			"gl_Position = vec4(pos, 1.0);",
		"}"
	].join('\n'),

	LensWarpFragment: [
		"precision highp float;",
		"uniform vec2 scale;",
		"uniform vec2 scaleIn;",
		"uniform vec2 lensCenter;",
		"uniform vec4 hmdWarpParam;",
		"uniform sampler2D texture;",
		"varying vec2 vUv;",
		"void main()",
		"{",
			"vec2 uv = (vUv*2.0)-1.0;", // range from [0,1] to [-1,1]
			"vec2 theta = (uv-lensCenter)*scaleIn;",
			"float rSq = theta.x*theta.x + theta.y*theta.y;",
			"vec2 rvector = theta*(hmdWarpParam.x + hmdWarpParam.y*rSq + hmdWarpParam.z*rSq*rSq + hmdWarpParam.w*rSq*rSq*rSq);",
			"vec2 tc = (lensCenter + scale * rvector);",
			"tc = (tc+1.0)/2.0;", // range from [-1,1] to [0,1]
			"if (any(bvec2(clamp(tc, vec2(0.0,0.0), vec2(1.0,1.0))-tc)))",
				"gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);",
			"else",
				"gl_FragColor = texture2D(texture, tc);",
		"}"
	].join('\n')
};



tpf.StereoRenderer.HMDConfigs = {
	OculusRift: { // from the Oculus Rift DK1
		hResolution: 1280,
		vResolution: 800,
		hScreenSize: 0.14976,
		vScreenSize: 0.0936,
		interpupillaryDistance: 0.064,
		lensSeparationDistance: 0.064,
		eyeToScreenDistance: 0.041,
		distortionK : [1.0, 0.22, 0.24, 0.0]
	}
};


// Client for external HMD Tracker from http://oculusstreetview.eu.pn/
// Expects a quaternion as array of 4 elements representing the camera rotation. 
// (e.g. [0.1,0,0,0.9])

tpf.StereoRenderer.HMDExternalTracker = ig.Class.extend({
	rotation: null,
	currentData: null,
	retryDelay: 1000,
	_timeoutId: 0,

	init: function( host ) {
		this.rotation = vec3.create();
		this.quaternion = quat.create();
		this.host = host;
		this.connect();
	},

	connect: function() {
		var that = this;
		this.ws = new WebSocket('ws://' + this.host);
		
		this.ws.addEventListener('message', function( ev ){
			that.currentData = ev.data;
		}, false);

		this.ws.addEventListener('error', function(){
			that._timeoutId = setTimeout(function(){
				that.connect();
			}, that.retryDelay);
		});
	},

	close: function() {
		clearTimeout(this._timeoutId);
		this.ws.close();
	},

	getRotation: function() {
		if( !this.currentData ) {
			return this.rotation;
		}

		var q = JSON.parse(this.currentData);

		// Quaternion to xyz rotation
		var sqw = q[0]*q[0];
		var sqx = q[1]*q[1];
		var sqy = q[2]*q[2];
		var sqz = q[3]*q[3];
		var unit = sqx + sqy + sqz + sqw; // if normalised is one, otherwise is correction factor
		var test = q[1]*q[2] + q[3]*q[0];
		if( test > 0.499*unit ) { // singularity at north pole
			this.rotation[0] = 2 * Math.atan2(q[1],q[0]);
			this.rotation[1] = Math.PI/2;
			this.rotation[2] = 0;
			return this.rotation;
		}
		if( test < -0.499*unit ) { // singularity at south pole
			this.rotation[0] = -2 * Math.atan2(q[1],q[0]);
			this.rotation[1] = -Math.PI/2;
			this.rotation[2] = 0;
			return this.rotation;
		}

		this.rotation[0] = Math.atan2(2*q[2]*q[0]-2*q[1]*q[3] , sqx - sqy - sqz + sqw);
		this.rotation[1] = Math.asin(2*test/unit);
		this.rotation[2] = Math.atan2(2*q[1]*q[0]-2*q[2]*q[3] , -sqx + sqy - sqz + sqw);

		return this.rotation;
	}
});

});
