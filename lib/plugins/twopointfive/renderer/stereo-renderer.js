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
		left: {offset: 0, projection: null, viewport: {}, quad: null},
		right: {offset: 0, projection: null, viewport: {}, quad: null}
	},

	sensorDevice: null,
	hmdDevice: null,
	vrMode: false,
	currentEye: null,

	worldScale: (32/1.80),
	viewportFov: (110).toRad(),
	hudFreelook: false,
	hudDistance: 250,

	init: function( canvas, worldScale ) {
		this.parent(canvas);

		this.worldScale = worldScale || this.worldScale;

		if( navigator.getVRDevices ) {
			navigator.getVRDevices().then(this.enumerateVRDevices.bind(this));
		} else if (navigator.mozGetVRDevices) {
			navigator.mozGetVRDevices(this.enumerateVRDevices.bind(this));
		} else {
			alert('No WebVR support!');
		}
	},

	enumerateVRDevices: function(devices) {
		// First find an HMD device
		for( var i = 0; i < devices.length; i++ ) {
			if( devices[i] instanceof HMDVRDevice ) {
				this.hmdDevice = devices[i];

				this.eyes.left.offset = this.hmdDevice.getEyeTranslation("left");
				this.eyes.right.offset = this.hmdDevice.getEyeTranslation("right");
				break;
			}
		}

		// Next find a sensor that matches the HMD hardwareUnitId
		for( var i = 0; i < devices.length; i++ ) {
			if(
				devices[i] instanceof PositionSensorVRDevice &&
				(!this.hmdDevice || devices[i].hardwareUnitId == this.hmdDevice.hardwareUnitId)
			) {
				this.sensorDevice = devices[i];
				break;
			}
		}

		this.fullscreenFlags = { vrDisplay: this.hmdDevice };
		ig.system.requestFullscreen();
		this.setFov();
	},

	setFov: function() {
		if( !this.hmdDevice ) { return; }
		
		var fovLeft, fovRight;

		if( 'getRecommendedEyeRenderRect' in this.hmdDevice ) {
			var leftEyeViewport = this.hmdDevice.getRecommendedEyeRenderRect("left");
			var rightEyeViewport = this.hmdDevice.getRecommendedEyeRenderRect("right");
			var renderTargetWidth = leftEyeViewport.width + rightEyeViewport.width;
			var renderTargetHeight = Math.max(leftEyeViewport.height, rightEyeViewport.height);
		}

		this.setSize( renderTargetWidth, renderTargetHeight );

		if ('getCurrentEyeFieldOfView' in this.hmdDevice) {
			fovLeft = this.hmdDevice.getCurrentEyeFieldOfView("left");
			fovRight = this.hmdDevice.getCurrentEyeFieldOfView("right");
		} else {
			fovLeft = this.hmdDevice.getRecommendedEyeFieldOfView("left");
			fovRight = this.hmdDevice.getRecommendedEyeFieldOfView("right");
		}

		this.eyes.left.projection = this.perspectiveMatrixFromVRFieldOfView(fovLeft, 0.1, 1000);
		this.eyes.right.projection = this.perspectiveMatrixFromVRFieldOfView(fovRight, 0.1, 1000);
	},

	perspectiveMatrixFromVRFieldOfView: function(fov, zNear, zFar) {
		var out = mat4.create();
		var upTan, downTan, leftTan, rightTan;
		if (fov == null) {
			// If no FOV is given plug in some dummy values
			upTan = Math.tan(50 * Math.PI/180.0);
			downTan = Math.tan(50 * Math.PI/180.0);
			leftTan = Math.tan(45 * Math.PI/180.0);
			rightTan = Math.tan(45 * Math.PI/180.0);
		} else {
			upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
			downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
			leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
			rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);
		}

		var xScale = 2.0 / (leftTan + rightTan);
		var yScale = 2.0 / (upTan + downTan);

		out[0] = xScale;
		out[4] = 0.0;
		out[8] = -((leftTan - rightTan) * xScale * 0.5);
		out[12] = 0.0;

		out[1] = 0.0;
		out[5] = yScale;
		out[9] = ((upTan - downTan) * yScale * 0.5);
		out[13] = 0.0;

		out[2] = 0.0;
		out[6] = 0.0;
		out[10] = zFar / (zNear - zFar);
		out[14] = (zFar * zNear) / (zNear - zFar);

		out[3] = 0.0;
		out[7] = 0.0;
		out[11] = -1.0;
		out[15] = 0.0;

		return out;
	},

	setSize: function( width, height ) {
		this.canvas.width = width;
		this.canvas.height = height;

		this.parent(width, height);

		var width2 = width/2;

		this.eyes.left.viewport = {x:0, y:0, width:width2, height:height};
		this.eyes.right.viewport = {x:width2, y:0, width:width2, height:height};
	},


	_renderSceneForEye: function( eye, sceneCallback ) {
		this.gl.viewport(eye.viewport.x, eye.viewport.y, eye.viewport.width, eye.viewport.height);
		this.currentEye = eye; // needed to override setCamera
		sceneCallback(this);
		this.flush();
	},

	render: function( sceneCallback ) {
		if( !this.hmdDevice ) {
			return this.parent(sceneCallback);
		}


		if( this.wireframe ) {
			this.clear(true,true,true)
		}
		
		this._renderSceneForEye(this.eyes.left, sceneCallback);
		this._renderSceneForEye(this.eyes.right, sceneCallback);

		this.drawCalls = this._currentDrawCalls;
		this.quadCount = this._currentQuadCount;
		this._currentDrawCalls = 0;
		this._currentQuadCount = 0;
	},

	setCamera: function( camera ) {
		this.flush();

		var projection = camera.projection();
		var view = camera.view();

		// Transform Perspective Camera to current eye coordinates
		if( camera instanceof tpf.PerspectiveCamera ) {
			var tt = vec3.fromValues(
				Math.cos(camera.rotation[1]) * -this.currentEye.offset.x * this.worldScale,
				0,
				Math.sin(camera.rotation[1]) * this.currentEye.offset.x * this.worldScale
			);
			mat4.translate( view, view, tt );
			projection = this.currentEye.projection;
		}

		// Cheap hack to transform HUD into center of the screen
		else if( camera instanceof tpf.OrthoCamera ) {
			var ts = this.getHMDState();
			projection = this.currentEye.projection;

			var tt = vec3.fromValues(
				-camera.width * 0.5,
				camera.height * 0.5,
				-this.hudDistance
			);
			var inv = vec3.fromValues(1,-1,1);
			view = mat4.create();
			
			
			view = mat4.rotateX( view, view, -ts.rotation[2]);
			view = mat4.rotateZ( view, view, -ts.rotation[1]);
			if( this.hudFreelook ) {
				view = mat4.rotateY( view, view, -ts.rotation[0]);
			}
			else {
				this.HMDRotation += this.lastHMDRotation - ts.rotation[0];
				this.HMDRotation *= 0.95;
				view = mat4.rotateY( view, view, this.HMDRotation);
				this.lastHMDRotation = ts.rotation[0];
			}

			view = mat4.translate( view, view, tt);
			view = mat4.scale( view, view, inv);
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
	HMDRotation: 0,
	lastHMDRotation: 0,

	reset: function() {
		if( this.sensorDevice ) {
			this.sensorDevice.zeroSensor();
		}
	},

	getHMDState: function() {
		var state = {
			position: [0,0,0],
			rotation: [0,0,0]
		};

		if( !this.sensorDevice ) {
			return state;
		}

		var s = this.sensorDevice.getState();
		state.position = [
			s.position.x * this.worldScale,
			s.position.y * this.worldScale,
			s.position.z * this.worldScale
		];

		// Quaternion to xyz rotation
		var q = s.orientation;
		var sqw = q.w*q.w;
		var sqx = q.x*q.x;
		var sqy = q.y*q.y;
		var sqz = q.z*q.z;
		var unit = sqx + sqy + sqz + sqw; // if normalised is one, otherwise is correction factor
		var test = q.x*q.y + q.z*q.w;
		if( test > 0.499*unit ) { // singularity at north pole
			state.rotation[0] = 2 * Math.atan2(q.x,q.w);
			state.rotation[1] = Math.PI/2;
			state.rotation[2] = 0;
		}
		else if( test < -0.499*unit ) { // singularity at south pole
			state.rotation[0] = -2 * Math.atan2(q.x,q.w);
			state.rotation[1] = -Math.PI/2;
			state.rotation[2] = 0;
		}
		else {
			state.rotation[0] = Math.atan2(2*q.y*q.w-2*q.x*q.z , sqx - sqy - sqz + sqw);
			state.rotation[1] = Math.asin(2*test/unit);
			state.rotation[2] = Math.atan2(2*q.x*q.w-2*q.y*q.z , -sqx + sqy - sqz + sqw);
		}

		return state;
	},
});

tpf.StereoRenderer.hasWebVR = function() {
	return navigator.getVRDevices || navigator.mozGetVRDevices;
}


});
