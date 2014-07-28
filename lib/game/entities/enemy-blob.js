ig.module(
	'game.entities.enemy-blob'
)
.requires(
	'plugins.twopointfive.entity',
	'game.entities.particle'
)
.defines(function(){



EntityEnemyBlobSpawner = tpf.Entity.extend({
	size: {x: 16, y: 16},
	scale: 0.5,

	dynamicLight: true,
	_wmBoxColor: '#ff0000',

	angle: 0,

	animSheet: new ig.AnimationSheet( 'media/blob-spawn.png', 64, 128 ),
	
	init: function( x, y, settings ) {
		this.parent( x, y, settings );
		this.addAnim( 'idle', 1, [0] );
		this.addAnim( 'spawn', 0.05, [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,14,15,16,17,18,19,20,21] );
	},

	update: function() {
		if( this.currentAnim == this.anims.idle ) {
			if( this.manhattenDistanceTo(ig.game.player) < 512 ) {
				this.currentAnim = this.anims.spawn.rewind();
			}
			else {
				return;
			}
		}

		this.parent();

		// Spawn anim finished? Spawn the Blob and kill the spawner.
		if( this.currentAnim == this.anims.spawn && this.currentAnim.loopCount ) {
			ig.game.spawnEntity(EntityEnemyBlob, this.pos.x, this.pos.y);
			this.kill();
		}
	},

	manhattenDistanceTo: function( other ) {
		// This is a tiny bit faster than .distanceTo() and we don't need the precision
		return Math.abs(other.pos.x - this.pos.x) + Math.abs(other.pos.y - this.pos.y);
	}
});


EntityEnemyBlob = tpf.Entity.extend({
	type: ig.Entity.TYPE.B,
	checkAgainst: ig.Entity.TYPE.A,
	collides: ig.Entity.COLLIDES.ACTIVE,

	size: {x: 16, y: 16},
	friction: {x: 100, y: 100},
	scale: 0.5,

	health: 10,
	damage: 10,

	dynamicLight: true,
	_wmBoxColor: '#ff0000',

	angle: 0,
	speed: 80,
	injump: false,

	didHurtPlayer: false,
	seenPlayer: false,


	animSheet: new ig.AnimationSheet( 'media/blob.png', 64, 64 ),
	
	init: function( x, y, settings ) {
		this.parent( x, y, settings );
		var crawFrameTime = 0.04 + Math.random() * 0.02;

		this.addAnim( 'crawl', 0.04, [0,1,2,3,4,5,4,3,2,1] );
		this.currentAnim.gotoRandomFrame();

		this.hurtTimer = new ig.Timer(); 
	},


	update: function() {
		this.angle = this.angleTo( ig.game.player );

		this.vel.x = Math.cos(this.angle) * this.speed;
		this.vel.y = Math.sin(this.angle) * this.speed;
		
		if( ig.game.dead ) {
			// Move away from the player if he's dead
			this.vel.x *= -1;
			this.vel.y *= -1;
		}

		this.parent();
	},

	kill: function() {
		var cx = this.pos.x + this.size.x/2;
		var cy = this.pos.y + this.size.y/2;
		for( var i = 0; i < 20; i++ ) {
			ig.game.spawnEntity( EntityEnemyBlobGib, cx, cy );
		}
		ig.game.blobKillCount++;
		this.parent();
	},

	check: function( other ) {
		if( this.hurtTimer.delta() < 0 ) {
			// Player already hurt during this attack move?
			return;
		}

		// Only hurt the player once a second
		this.hurtTimer.set(1);

		
		this.vel.x = -this.vel.x;
		this.vel.y = -this.vel.y;
		other.receiveDamage( this.damage, this );
	}
});



EntityEnemyBlobGib = EntityParticle.extend({
	vpos: 0,
	scale: 0.5,
	initialVel: {x:120, y: 120, z: 2.5},
	friction: {x: 10, y: 10},
	
	lifetime: 2,
	
	animSheet: new ig.AnimationSheet( 'media/blob-gib.png', 16, 16 ),
	
	init: function( x, y, settings ) {
		this.addAnim( 'idle', 5, [0,1,2,3,4,5,6,7,8,9,10,11] );
		this.parent( x, y, settings );
	}
});


});