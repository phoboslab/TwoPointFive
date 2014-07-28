ig.module(
	'game.entities.grenade-pickup'
)
.requires(
	'plugins.twopointfive.entity',
	'game.weapons.grenade-launcher'
)
.defines(function(){

EntityGrenadePickup = tpf.Entity.extend({
	checkAgainst: ig.Entity.TYPE.A,
	
	size: {x: 16, y: 16},
	vpos: 0.5,
	scale: 0.5,
	amount: 8,

	dynamicLight: true,
	_wmBoxColor: '#55ff00',
	
	animSheet: new ig.AnimationSheet( 'media/grenade-pickup.png', 32, 32 ),
	pickupSound: new ig.Sound( 'media/sounds/health-pickup.*' ),
	bounceTimer: null,
	
	init: function( x, y, settings ) {
		this.parent( x, y, settings );
		this.addAnim( 'idle', 10, [0] );
	},

	update: function() {
		this.parent();
	},
	
	check: function( other ) {
		other.giveAmmo(WeaponGrenadeLauncher, this.amount);
		this.pickupSound.play();
		this.kill();
	}
});

});