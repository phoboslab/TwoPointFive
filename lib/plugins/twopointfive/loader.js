ig.module(
	'plugins.twopointfive.loader'
)
.requires(
	'impact.loader',
	
	'plugins.twopointfive.namespace',
	'plugins.twopointfive.renderer.renderer'
)
.defines(function(){ "use strict";


tpf.Loader = ig.Loader.extend({
	rotation: 0,

	blockFaces: [],
	loadingBar: null,
	loadingBarBackground: null,

	barSize: {x: 16, y: 0.1},

	load: function() {
		var that = this;
		this.blockImage = new ig.Image('media/loading-block.png');
		this.blockImage.load( function(){
			if( !that._intervalId ) {
				ig.Loader.prototype.load.call(that);
			}
		});
	},

	createGeometry: function() {
		this.loadingBarBackground = new tpf.Quad(this.barSize.x, this.barSize.y);
		this.loadingBarBackground.setPosition(0, -8, 0);
		this.loadingBarBackground.setColor({r: 0.1, g: 0.1, b: 0.1});

		this.loadingBar = new tpf.Quad(this.barSize.x, this.barSize.y);
		this.loadingBar.setPosition(0, -8, 0);
		this.loadingBar.setColor({r: 1, g: 1, b: 1});

		this.blockFaces[0] = new tpf.Tile(this.blockImage, 0, 64, 64, 0.125);
		this.blockFaces[0].quad.setPosition(0, 0, -4);

		this.blockFaces[1] = new tpf.Tile(this.blockImage, 0, 64, 64, 0.125);
		this.blockFaces[1].quad.setPosition(4, 0, 0);
		this.blockFaces[1].quad.setRotation(0, -Math.PI/2, 0);

		this.blockFaces[2] = new tpf.Tile(this.blockImage, 0, 64, 64, 0.125);
		this.blockFaces[2].quad.setPosition(0, 0, 4);

		this.blockFaces[3] = new tpf.Tile(this.blockImage, 0, 64, 64, 0.125);
		this.blockFaces[3].quad.setPosition(-4, 0, 0);
		this.blockFaces[3].quad.setRotation(0, Math.PI/2, 0);
	},

	draw: function() {
		if( !this.loadingBar ) {
			this.createGeometry();
		}

		this.rotation += 0.2 * this.status * this.status;
		ig.system.renderer.render(this.renderCallback.bind(this));
	},

	renderCallback: function() {
		var renderer = ig.system.renderer;
		var camera = ig.system.camera;
		renderer.clear( true, true, true );

		// Rotate camera around the center block
		camera.position[0] = Math.cos(this.rotation) * 20;
		camera.position[2] = Math.sin(this.rotation) * 20;
		camera.rotation[1] = -this.rotation + Math.PI/2;
		renderer.setCamera(camera);
		
		for( var i = 0; i < this.blockFaces.length; i++ ) {
			var c = (Math.sin(this.rotation - (i+1.2) * Math.PI/2)+1)/2;
			this.blockFaces[i].quad.setColor({r:c,g:c,b:c});
			this.blockFaces[i].draw();
		}

		// Reset camera to stationary position for the loading bar
		camera.position[0] = 0;
		camera.position[2] = 20;
		camera.rotation[1] = 0;
		renderer.setCamera(camera);

		this.loadingBar.setPosition(-(1-this.status)*this.barSize.x/2, -8, 0);
		this.loadingBar.setSize(this.status*this.barSize.x, this.barSize.y);
		renderer.pushQuad(this.loadingBar);
		renderer.pushQuad(this.loadingBarBackground);
	}
});


});