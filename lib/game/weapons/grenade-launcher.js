ig.module(
	'game.weapons.grenade-launcher'
)
.requires(
	'game.weapons.base',
	'plugins.twopointfive.entity',
	'impact.entity-pool'
)
.defines(function(){

WeaponGrenadeLauncher = Weapon.extend({
	offset: {x: 0, y: 128},
	// projectileOffset: -8,

	maxAmmo: 80,

	cooldown: 0.5,

	animSheet: new ig.AnimationSheet( 'media/grenade-launcher.png', 180, 134),
	shootSound: new ig.Sound( 'media/sounds/grenade-launcher.*' ),
	emptySound: new ig.Sound( 'media/sounds/empty-click.*' ),
	ammoIconImage: new ig.Image( 'media/grenade.png' ),
	ammoIcon: null,

	init: function( ammo ) {
		this.parent( ammo );
		this.addAnim( 'idle', 100, [0] );
		this.addAnim( 'shoot', 0.1, [1,0], true );

		this.ammoIcon = new tpf.HudTile( this.ammoIconImage, 0, 32, 32);
		this.ammoIcon.setPosition( 200, 460)
		this.shootSound.volume = 0.8;
	},

	depleted: function() {
		if( this.shootTimer.delta() > 0 && this.ammo <= 0 ) {
			this.shootTimer.set( this.cooldown );
			this.emptySound.play();
			return true;
		}
		else {
			return false
		}
	},

	shoot: function( x, y, angle ) {
		ig.game.spawnEntity(EntityGrenade, x, y, {angle: angle} );
		this.currentAnim = this.anims.shoot.rewind();
		this.shootSound.play();

		this.flash(0.2);
	}
});


EntityGrenade = tpf.Entity.extend({
	checkAgainst: ig.Entity.TYPE.B,
	collides: ig.Entity.COLLIDES.NEVER,

	size: {x: 8, y: 8},
	speed: 440,
	scale: 0.25,

	bounciness: 0.8,
	minBounceVelocity: 0.5,

	blastSettings: {radius: 100, damage: 100},
	explosionParticles: 20,
	explosionRadius: 60,

	animSheet: new ig.AnimationSheet( 'media/grenade.png', 32, 32 ),
	explodeSound: new ig.Sound( 'media/sounds/explosion.*' ),
	bounceSound: new ig.Sound( 'media/sounds/grenade-bounce.*' ),
	dynamicLight: true,


	init: function( x, y, settings ) {
		this.parent( x-this.size.x/2, y-this.size.y/2, settings ); // center on spawn pos
		this.addAnim( 'idle', 1, [0] );
		this.bounceSound.volume = 0.6;
		this.explodeSound.volume = 0.9;

		this.vel.x = -Math.sin(this.angle) * this.speed;
		this.vel.y = -Math.cos(this.angle) * this.speed;
		this.vel.z = 1.2;
		this.pos.z = 12;
	},
	
	reset: function( x, y, settings ) {
		this.parent(x,y,settings);
		this.vel.x = -Math.sin(this.angle) * this.speed;
		this.vel.y = -Math.cos(this.angle) * this.speed;
		this.vel.z = 1.2;
		this.pos.z = 12;
		this.currentAnim = this.anims.idle.rewind();
	},

	update: function() {
		if( this.currentAnim.loopCount > 0 ) {
			this.kill();
			return;
		}

		var zvel = this.vel.z;
		
		this.parent();

		// If the z-velocity did invert in the parent update, we bounced
		// of the ground - play the bounce sound!
		if( zvel < 0 && this.vel.z > 0 ) {
			this.bounceSound.play();
		}
	},

	check: function( other ) {
		this.kill();
	},

	handleMovementTrace: function( res ) {
		if( res.collision.x || res.collision.y ) {
			this.bounceSound.play();
		}
		this.parent(res);
	},

	kill: function() {
		for( var i = 0; i < this.explosionParticles; i++ ) {
			var x = this.pos.x
				+ Math.random() * this.explosionRadius * 2
				- this.explosionRadius;
			var y = this.pos.y
				+ Math.random() * this.explosionRadius * 2
				- this.explosionRadius;
			ig.game.spawnEntity(EntityGrenadeExplosion, x, y );
		}

		ig.game.spawnEntity(EntityBlastRadius, this.pos.x, this.pos.y, this.blastSettings );
		this.explodeSound.play();
		this.parent();
	}
});

ig.EntityPool.enableFor(EntityGrenade);


// This invisible entity will spawn and immediately die a frame later. It will 
// give every other entity it touches a bit of damage.
EntityBlastRadius = ig.Entity.extend({
	frame: 0,
	radius: 8,
	damage: 20,
	checkAgainst: ig.Entity.TYPE.B,
	
	init: function( x, y, settings ) {
		var offset = settings.radius || this.radius;
		this.size.x = this.size.y = offset * 2;
		this.parent( x - offset, y - offset, settings );
	},
	
	update: function() {
		if( this.frame == 2 ) {
			this.kill();
		}
		this.frame++;
	},
	
	draw: function() {},
	
	check: function( other ) {
		if( this.frame != 1 ) { return; }

		var f = 1 - (this.distanceTo(other) / this.radius); // normalize to 0..1 range
		if( f > 0 ) {
			var damage = Math.ceil( Math.sqrt(f) * this.damage);
			other.receiveDamage( damage, this );
		}
	}
});


EntityGrenadeExplosion = tpf.Entity.extend({
	size: {x: 0, y: 0},
	vpos: 2,
	scale: 1,

	gravityFactor: 0,

	animSheet: new ig.AnimationSheet( 'media/explosion.png', 32, 32 ),

	init: function( x, y, settings ) {
		var frameTime = Math.random() * 0.1 + 0.03;
		this.addAnim( 'idle', frameTime, [0,1,2,3], true );
		this.parent( x, y, settings );

		this.pos.z = Math.random() * 20;
	},
	
	reset: function(x,y,settings) {
		this.currentAnim.rewind();
		this.parent(x,y,settings);
	},

	update: function() {
		this.parent();
		if( this.currentAnim.loopCount ) {
			this.kill();
		}
	}
});

ig.EntityPool.enableFor(EntityGrenadeExplosion);

});