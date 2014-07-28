ig.module(
	'game.weapons.base'
)
.requires(
	'plugins.twopointfive.world.tile',
	'impact.animation'
)
.defines(function(){

Weapon = ig.Class.extend({
	
	offset: {x: 0, y: 48},
	offsetAngle: 0,
	projectileOffset: 0,
	pos: {x: 0, y: 0},
	bobOffset: 0,
	
	anim: null,
	tile: null,
	
	ammo: 0,
	maxAmmo: 100,
	anims: [],
	
	cooldown: 1,
	shootTimer: null,
	ammoIcon: null,

	currentQuadColor: {r: 1, g: 1, b:1},
	flashQuadColor: {r: 1, g: 1, b:1},
	unsetFlashTimer: null,
	
	init: function( ammo ) {
		this.ammo = ammo || 0;
		
		this.tile = new tpf.HudTile( 
			this.animSheet.image, 0, 
			this.animSheet.width, 
			this.animSheet.height
		);
		
		this.pos.x = ig.game.hud.width/2 - this.animSheet.width/2 - this.offset.x;
		this.pos.y = ig.game.hud.height - this.offset.y;
		
		this.shootTimer = new ig.Timer();
		this.tile.setPosition( this.pos.x, this.pos.y + this.bobOffset );
	},
	
	
	addAnim: function( name, frameTime, sequence, stop ) {
		if( !this.animSheet ) {
			throw( 'No animSheet to add the animation '+name+' to.' );
		}
		var a = new ig.Animation( this.animSheet, frameTime, sequence, stop );
		this.anims[name] = a;
		if( !this.currentAnim ) {
			this.currentAnim = a;
		}
		
		return a;
	},
	
	
	trigger: function( x, y, angle ) {
		if( this.ammo > 0 && this.shootTimer.delta() > 0 ) {
			this.shootTimer.set( this.cooldown );
			this.ammo--;
			
			var offsetAngle = angle - Math.PI/2;
			var sx = x -Math.sin(offsetAngle) * this.projectileOffset,
				sy = y -Math.cos(offsetAngle) * this.projectileOffset;
			
			this.shoot( sx, sy, angle + this.offsetAngle );
		}
	},

	depleted: function() {
		return (this.shootTimer.delta() > 0 && this.ammo <= 0);
	},
	
	
	giveAmmo: function( ammo ) {
		this.ammo = Math.min( this.maxAmmo, this.ammo + ammo);
	},
	

	shoot: function( x, y, angle ) {
		// Not implemented in the base class
	},
	
	
	setLight: function( color ) {
		this.currentQuadColor = color;

		if( !this.tile ) { return; }
		this.tile.quad.setColor(color);
	},

	flash: function(duration) {
		if( !this.tile ) { return; }
		this.tile.quad.setColor(this.flashQuadColor);
		this.unsetFlashTimer = new ig.Timer(duration);
	},		
	
	update: function() {
		this.currentAnim.update();
		this.tile.setTile( this.currentAnim.tile );
		
		this.tile.setPosition( this.pos.x, this.pos.y + this.bobOffset );

		if( this.unsetFlashTimer && this.unsetFlashTimer.delta() > 0 ) {
			this.setLight(this.currentQuadColor);
			this.unsetFlashTimer = null;
		}
	},

	draw: function() {
		this.tile.draw();
	}
});


});