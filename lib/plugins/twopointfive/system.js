ig.module(
	'plugins.twopointfive.system'
)
.requires(
	'impact.system',
	
	'plugins.twopointfive.namespace',
	'plugins.twopointfive.renderer.ortho-camera',
	'plugins.twopointfive.renderer.perspective-camera',
	'plugins.twopointfive.renderer.renderer',
	'plugins.twopointfive.renderer.stereo-renderer'
)
.defines(function(){ "use strict";


ig.System.inject({
	renderer: null,
	scene: null,
	camera: null,
	
	isFullscreen: false,
	hasMouseLock: false,

	initialWidth: 640,
	initialHeight: 480,
	fov: 75,

	stereoMode: false,
	
	init: function( canvasId, fps, width, height, scale ) {
		this.initialWidth = width;
		this.initialHeight = height;
		
		this.clock = new ig.Timer();
		this.canvas = ig.$(canvasId);
		this.canvas.width = width * ig.ua.pixelRatio;
		this.canvas.height = height * ig.ua.pixelRatio;
		this.canvas.style.width = width + 'px';
		this.canvas.style.height = height + 'px';
		
		this.realWidth = this.width = width;
		this.realHeight = this.height = height;
		
		this.renderer = new tpf.Renderer(canvas);	
		this.resize( width, height, scale );
	},

	horizontalFov: function() {
		// The renderer may override the system's fov for stereo rendering
		if( this.renderer.viewportFov ) {
			return this.renderer.viewportFov.toDeg();
		}

		return this.fov * this.camera.aspect;
	},
	
	resize: function( width, height, scale ) {
		var r = ig.System.useRetina ? ig.ua.pixelRatio : 1;
		
		this.width = width;
		this.height = height;
		
		this.realWidth = this.width = width;
		this.realHeight = this.height = height;
		this.canvas.width = width * r;
		this.canvas.height = height * r;
		
		this.renderer.setSize( width * r, height * r );
		this.canvas.style.width = width + 'px';
		this.canvas.style.height = height + 'px';
		
		this.camera = new tpf.PerspectiveCamera( this.fov, width / height, 1, 10000 );
	},

	setStereoMode: function( on ) {
		var fog = this.renderer.fog;

		this.stereoMode = on;
		if( on ) {
			this.tracker = new tpf.StereoRenderer.HMDExternalTracker('127.0.0.1:9006');
			this.renderer = new tpf.StereoRenderer(canvas, tpf.StereoRenderer.HMDConfigs.OculusRift);
		}
		else {
			if( this.tracker ) {
				this.tracker.close();
				this.tracker = null;
			}
			this.renderer = new tpf.Renderer(canvas);
		}

		if( fog ) {
			this.renderer.setFog( fog.color, fog.near, fog.far );
		}
	},
	
	setupFullscreenMouselockOnce: function() {
		if( this.fullscreenSetupComplete ) { return; }
		
		
		// Fuck yeah, Vendor Prefixes \o/
		
		// Request fullscreen
		this.canvas.requestFullscreen = 
			ig.getVendorAttribute( this.canvas, 'requestFullscreen') ||
			ig.getVendorAttribute( this.canvas, 'requestFullScreen'); // uppercase S (moz)

		var fullscreenCallback = this.fullscreenCallback.bind(this);
		document.addEventListener('fullscreenchange', fullscreenCallback, false);
		document.addEventListener('mozfullscreenchange', fullscreenCallback, false);
		document.addEventListener('webkitfullscreenchange', fullscreenCallback, false);
		
		// Request pointer lock
		ig.normalizeVendorAttribute( this.canvas, 'requestPointerLock' );

		var mouseLockCallback = this.mouseLockCallback.bind(this);
		document.addEventListener('pointerlockchange', mouseLockCallback, false);
		document.addEventListener('mozpointerlockchange', mouseLockCallback, false);
		document.addEventListener('webkitpointerlockchange', mouseLockCallback, false);

		this.fullscreenSetupComplete = true;
	},
	
	requestFullscreen: function() {
		this.setupFullscreenMouselockOnce();
		this.canvas.requestFullscreen();
	},

	requestMouseLock: function() {
		this.setupFullscreenMouselockOnce();
		this.canvas.requestPointerLock();
	},
	
	fullscreenCallback: function( ev ) {
		if(
			document.webkitFullscreenElement === this.canvas ||
			document.mozFullscreenElement === this.canvas ||
			document.mozFullScreenElement === this.canvas
		) {
			this.isFullscreen = true;
			this.resize( screen.width, screen.height, 1 );
			this.canvas.requestPointerLock();
		}
		else {
			this.isFullscreen = false;
			this.resize( this.initialWidth, this.initialHeight, 1 );
		}
		return true;
	},
	
	mouseLockCallback: function( ev ) {
		this.hasMouseLock = (
			document.pointerLockElement === this.canvas ||
			document.mozPointerLockElement === this.canvas ||
			document.webkitPointerLockElement === this.canvas
		);
	},
	
	clear: function() {},
});

ig.System.useRetina = true;

ig.System._hasWebGL = null;
ig.System.hasWebGL = function() {
	if( ig.System._hasWebGL === null ) {	
		var canvas = document.createElement('canvas');
		var gl = null;

		try { gl = canvas.getContext("webgl"); }
		catch (x) { gl = null; }

		if (gl === null) {
			try { gl = canvas.getContext("experimental-webgl"); }
			catch (x) { gl = null; }
		}
		ig.System._hasWebGL = (gl !== null);
	}
	return ig.System._hasWebGL;
};

});	