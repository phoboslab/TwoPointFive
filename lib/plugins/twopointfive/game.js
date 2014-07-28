ig.module(
	'plugins.twopointfive.game'
)
.requires(
	'impact.game',

	'plugins.twopointfive.namespace',
	
	'plugins.twopointfive.world.map',
	'plugins.twopointfive.world.wall-map',
	'plugins.twopointfive.world.light-map',
	'plugins.twopointfive.world.culled-sectors',
	
	'plugins.twopointfive.entity',
	'plugins.twopointfive.font',
	'plugins.twopointfive.image',
	'plugins.twopointfive.loader',
	'plugins.twopointfive.system'
)
.defines(function(){ "use strict";


tpf.Game = ig.Game.extend({

	culledSectors: null,
	sectorSize: 4,
	clearColor: null,

	clearLevel: function() {
		for( var i = 0; i < this.entities.length; i++ ) {
			if( this.entities[i] instanceof tpf.Entity ) {
				this.entities[i].remove();
			}
		}
		this.entities = [];
		this.namedEntities = {};

		this.culledSectors = null;
		this.collisionMap = ig.CollisionMap.staticNoCollision;
		this.backgroundMaps = [];

		this.lightMap = null;
	},


	loadLevel: function( data ) {
		this.clearLevel();
		
		// Map Layer
		for( var i = 0; i < data.layer.length; i++ ) {
			var ld = data.layer[i];
			if( ld.name == 'collision' ) {
				this.collisionMap = new ig.CollisionMap(ld.tilesize, ld.data );
			}
			else if( ld.name == 'light' ) {
				this.lightMap = new tpf.LightMap( ld.tilesize, ld.data, ld.tilesetName );
			}
			else if( ld.name == 'walls' || ld.name == 'floor' || ld.name == 'ceiling' ) {
				var MapClass = ld.name == 'walls' ? tpf.WallMap : tpf.Map;
				var anims = this.backgroundAnims[ld.tilesetName] || {};
				var newMap = new MapClass( ld.tilesize, ld.data, ld.tilesetName, ld.name, anims );
				newMap.name = ld.name;
				this.backgroundMaps.push( newMap );
			}
		}
		
		
		// Erase all faces from the wall map that are not connected to a floor
		var floorMap = this.getMapByName('floor');
		var wallMap = this.getMapByName('walls');
		
		if( floorMap && wallMap ) {
			wallMap.eraseDisconnectedWalls( floorMap );
		}		
		
		
		// Apply lightmap on all background maps if we have one
		if( this.lightMap ) {
			for( var i = 0; i < this.backgroundMaps.length; i++ ) {
				this.backgroundMaps[i].applyLightMap( this.lightMap );
			}
		}

		// Create the culled sector map, using the floor map as a guide to where the player
		// can travel. Add the geometry from all background maps
		this.culledSectors = new tpf.CulledSectors( floorMap, this.backgroundMaps, this.sectorSize );
		
		
		for( var i = 0; i < data.entities.length; i++ ) {
			var ent = data.entities[i];
			this.spawnEntity( ent.type, ent.x, ent.y, ent.settings );
		}
		
		// Call post-init ready function on all entities
		for( var i = 0; i < this.entities.length; i++ ) {
			this.entities[i].ready();
		}
	},
	
	draw: function() {
		ig.system.renderer.render(this.drawCallback.bind(this));
	},

	drawCallback: function(renderer) {
		if( this.clearColor ) {
			var c = this.clearColor;
			ig.system.renderer.gl.clearColor(c[0],c[1],c[2],1);
		}
		ig.system.renderer.clear(!!this.clearColor, true);
		
		this.drawWorld();
		this.drawHud();
	},

	drawWorld: function() {
		if( !this.culledSectors ) {
			return;
		}

		
		ig.system.renderer.setCamera(ig.system.camera);

		// Update culled sectors
		var 
			cx = ig.system.camera.position[0],
			cy = ig.system.camera.position[2],
			cullAngle = -ig.system.camera.rotation[1]-Math.PI/2,
			fov = ig.system.horizontalFov().toRad();

		this.culledSectors.draw(cx, cy, cullAngle, fov);
	},

	drawHud: function() {}
});


});