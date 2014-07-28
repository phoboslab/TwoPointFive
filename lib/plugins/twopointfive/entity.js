ig.module(
	'plugins.twopointfive.entity'
)
.requires(
	'impact.entity',

	'plugins.twopointfive.namespace',
	'plugins.twopointfive.world.tile'
)
.defines(function(){ "use strict";


tpf.Entity = ig.Entity.extend({
	tile: null,
	scale: 0.25,

	pos: {x: 0, y: 0, z: 0},
	vel: {x: 0, y: 0, z: 0},
	accel: {x: 0, y: 0, z: 0},
	maxVel: {x: 10000, y: 10000, z: 10000},

	dynamicLight: true,

	_wmDrawBox: true,
	_wmBoxColor: '#ff5500',

	
	
	rotateToView: true,

	__tilePosX: -1,
	__tilePosY: -1,
	__sectorX: null,
	__sectorY: null,

	init: function( x, y, settings ) {
		this.parent( x, y, settings );

		if( ig.global.wm ) {
			return;
		}

		if( this.animSheet ) {
			this.tile = new tpf.Tile( 
				this.animSheet.image, 0, 
				this.animSheet.width, this.animSheet.height,
				this.scale
			);
				
			this.updateQuad();
		}

		ig.game.culledSectors.moveEntity(this);
	},
	
	reset: function( x, y, settings ) {
		this.parent( x, y, settings );
		ig.game.culledSectors.moveEntity(this);
		this.updateQuad();
	},
	
	kill: function() {
		this.parent();
		this.remove();
	},

	handleMovementTrace: function( res ) {
		// Impact's handleMovementTrace may omit the z position,
		// so remember it here and re-set it afterwards
		var z = this.pos.z;
		this.parent(res);
		this.pos.z = z;
	},

	remove: function() {		
		ig.game.culledSectors.removeEntity(this);
	},

	updateQuad: function() {
		if( this.tile && this.currentAnim ) {
			this.tile.setTile( this.currentAnim.tile );
			
			var tpos = this.tile.quad.position;
			tpos[0] = this.pos.x + this.size.x/2;
			tpos[2] = this.pos.y + this.size.y/2;
			tpos[1] = this.pos.z 
				- ig.game.collisionMap.tilesize / 2 
				+ (this.animSheet.height * this.scale) / 2;
			
			if( this.rotateToView ) {
				this.tile.quad.rotation[1] = ig.system.camera.rotation[1];
			}
			this.tile.quad._dirty = true;
		}
		
		var lm = ig.game.lightMap;
		if( this.dynamicLight && lm ) {
			var ntx = Math.floor( (this.pos.x+this.size.x/2) / lm.tilesize),
				nty = Math.floor( (this.pos.y+this.size.y/2) / lm.tilesize);

			if( ntx !== this.__tilePosX || nty !== this.__tilePosY ) {
				this.__tilePosX = ntx;
				this.__tilePosY = nty;
				this.setLight( lm.getLight(ntx, nty) );
			}
		}
		
		if(
			this.tile && !this._killed &&
			(this.pos.x != this.last.x || this.pos.y != this.last.y)
		) {
			ig.game.culledSectors.moveEntity(this);
		}
	},

	canSee: function( other ) {
		// Trace a line to the player to check if we have a line of sight
		var sx = this.pos.x+this.size.x/2,
			sy = this.pos.y+this.size.y/2;
		var res = ig.game.collisionMap.trace( 
			sx, sy, 
			other.pos.x+other.size.x/2 - sx, other.pos.y+other.size.y/2 - sy, 
			1, 1
		);

		return ( !res.collision.x && !res.collision.y );			
	},

	update: function() {
		this.last.x = this.pos.x;
		this.last.y = this.pos.y;
		
		this.vel.z -= ig.game.gravity * ig.system.tick * this.gravityFactor;

		this.vel.x = this.getNewVelocity( this.vel.x, this.accel.x, this.friction.x, this.maxVel.x );
		this.vel.y = this.getNewVelocity( this.vel.y, this.accel.y, this.friction.y, this.maxVel.y );
		this.vel.z = this.getNewVelocity( this.vel.z, this.accel.z, 0, this.maxVel.z );
		
		// movement & collision
		var mx = this.vel.x * ig.system.tick;
		var my = this.vel.y * ig.system.tick;
		var res = ig.game.collisionMap.trace( 
			this.pos.x, this.pos.y, mx, my, this.size.x, this.size.y
		);
		this.handleMovementTrace( res );

		// handle the z-axis collision with the floor
		this.pos.z += this.vel.z;
		if( this.pos.z < 0 ) {
			if( this.bounciness > 0 && Math.abs(this.vel.z) > this.minBounceVelocity ) {
				this.vel.z *= -this.bounciness;				
			}
			else {
				this.vel.z = 0;
			}
			this.pos.z = 0;
		}
		
		if( this.currentAnim ) {
			this.currentAnim.update();
		}

		this.updateQuad();
	},
	
	setLight: function( color ) {
		if( !this.tile ) { return; }
		this.tile.quad.setColor(color);
	},

	draw: function() {
		if( ig.global.wm ) {
			return;
		}
		else if( this.tile ) {
			this.tile.draw();
		}
	}
});

});