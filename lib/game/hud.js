ig.module(
	'game.hud'
)
.requires(
	'plugins.twopointfive.hud'
)
.defines(function(){

MyHud = tpf.Hud.extend({

	font: new tpf.Font( 'media/fredoka-one.font.png' ),

	healthIconImage: new ig.Image( 'media/health-icon.png' ),
	damageIndicatorImage: new ig.Image( 'media/hud-blood-low.png' ),
	healthIcon: null,

	keys: [],

	showControlsTimer: null,

	init: function( width, height, showControls ) {
		this.parent(width, height);

		this.healthIcon = new tpf.HudTile( this.healthIconImage, 0, 32, 32 );
		this.healthIcon.setPosition( 96, this.height-this.healthIcon.tileHeight-4 );
	},

	draw: function( player, weapon ) {
		this.prepare();

		if( weapon ) {
			weapon.draw();

			if( weapon.ammoIcon ) {
				weapon.ammoIcon.draw();
				this.font.draw( weapon.ammo, 210, this.height - this.font.height + 1, ig.Font.ALIGN.RIGHT );
			}
		}

		this.healthIcon.draw();
		this.font.draw( player.health, 90, this.height - this.font.height + 1, ig.Font.ALIGN.RIGHT );

		this.font.draw( 'Kills: ' +ig.game.blobKillCount, 32, 8 );

		// Draw the current message (showMessage(text)) and the damage indicator
		this.drawDefault();
	}
});


});