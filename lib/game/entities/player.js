ig.module(
	'game.entities.player'
)
.requires(
	'plugins.twopointfive.entity',
	'plugins.mouse-delta',
	'game.weapons.grenade-launcher'
)
.defines(function(){

EntityPlayer = tpf.Entity.extend({
	type: ig.Entity.TYPE.A,
	collides: ig.Entity.COLLIDES.PASSIVE,
	
	size: {x: 32, y: 32},
	
	angle: 0,
	internalAngle: 0,
	turnSpeed: (120).toRad(),
	moveSpeed: 192,
	bob: 0,
	bobSpeed: 0.1,
	bobHeight: 0.8,
	
	health: 100,
	maxHealth: 100,
	
	weapons: [],

	currentWeapon: null,
	currentWeaponIndex: -1,
	delayedWeaponSwitchIndex: -1,

	currentLightColor: {r:1, g:1, b:1, a:1},

	god: false,

	hurtSounds: [
		new ig.Sound('media/sounds/hurt1.*'),
		new ig.Sound('media/sounds/hurt2.*'),
		new ig.Sound('media/sounds/hurt3.*')
	],
	
	init: function( x, y, settings ) {
		this.parent( x, y, settings );
		this.internalAngle = this.angle;
		ig.game.player = this;
	},
	
	ready: function() {
		var cx = this.pos.x + this.size.x/2,
			cy = this.pos.y + this.size.y/2;
		ig.system.camera.position[0] = cx;
		ig.system.camera.position[2] = cy;


		this.giveWeapon( WeaponGrenadeLauncher, 16 );
	},
	
	update: function() {
		
		// Move
		var dx = 0, 
			dy = 0;
		
		if( ig.input.state('forward') ) {
			dy = 1;
		}
		else if( ig.input.state('back') ) {
			dy = -1;
		}
		
		// Turn viewpoint with mouse?
		if( ig.system.isFullscreen || ig.system.hasMouseLock ) {
			this.internalAngle -= ig.input.mouseDelta.x / 400;
		}

		// Turn with keys
		if( ig.input.state('left') ) {
			this.internalAngle += this.turnSpeed * ig.system.tick;
		}
		else if( ig.input.state('right') ) {
			this.internalAngle -= this.turnSpeed * ig.system.tick;	
		}

		// Sidestep
		if( ig.input.state('stepleft') ) {
			dx = 1;
		}
		else if( ig.input.state('stepright') ) {
			dx = -1;
		}

		// Touch controls
		if( ig.game.touchFieldMove ) {
			var fi = ig.game.touchFieldMove.input;
			dx = -(fi.x/60).limit(-1, 1);
			dy = -(fi.y/60).limit(-1, 1);
		}
		if( ig.game.touchFieldTurn ) {
			var fi = ig.game.touchFieldTurn.input;
			this.internalAngle += fi.dx/100;
		}

		// Gamepad input
		if( ig.input.gamepad ) {
			var stickThreshold = 0.2;
			if( Math.abs(ig.input.gamepad.axes[2]) > stickThreshold ) {
				this.internalAngle -= ig.input.gamepad.axes[2] * this.turnSpeed * ig.system.tick;
			}
			if( Math.abs(ig.input.gamepad.axes[0]) > stickThreshold ) {
				dx = -ig.input.gamepad.axes[0];
			}
			if( Math.abs(ig.input.gamepad.axes[1]) > stickThreshold ) {
				dy = -ig.input.gamepad.axes[1];
			}
		}
		
		
		var running = ig.input.state('run') || ig.ua.mobile;
		var speed = this.moveSpeed;
		

		// If we have a head tracker connected, add its rotation to our own;
		// It's a bit of a hack to have this here, but we want to change the
		// aim direction of the player with the head movement as well.
		var trackerRotation = [0,0,0];
		var trackerPosition = [0,0,0];
		if( ig.system.renderer instanceof tpf.StereoRenderer ) {
			var state = ig.system.renderer.getHMDState();
			trackerRotation = state.rotation;
			trackerPosition = state.position;
		}

		this.angle = this.internalAngle + trackerRotation[0];


		// Normalize movement vector
		if( Math.abs(dx) + Math.abs(dy) > 1 ) {
			dx *= Math.SQRT1_2;
			dy *= Math.SQRT1_2;
		}

		// Set the desired velocity based on our angle and which keys are
		// pressed
		this.vel.x = -Math.sin(this.angle) * dy * this.moveSpeed 
			-Math.sin(this.angle+Math.PI/2) * dx * this.moveSpeed;

		this.vel.y = -Math.cos(this.angle) * dy * this.moveSpeed 
			-Math.cos(this.angle+Math.PI/2) * dx * this.moveSpeed;
		
		
		
		// Shoot
		if( 
			this.currentWeapon &&
			( ig.input.state('shoot') ||  (!ig.ua.mobile && ig.input.state('click')) )
		) {
			// Calculate the spawn position for projectiles
			var sx = this.pos.x+this.size.x/2 -Math.sin(this.angle) * 3;
				sy = this.pos.y+this.size.y/2 -Math.cos(this.angle) * 3;

			if( !this.currentWeapon.depleted() ) {
				this.currentWeapon.trigger( sx, sy, this.angle );
			}
			else {
				// find the first weapon that has ammo
				this.switchToNextNonEmptyWeapon();
			}
		}
		
		// Change Weapon; be careful to only switch after the shoot button was released
		if( this.delayedWeaponSwitchIndex >= 0 ) {
			this.switchWeapon( this.delayedWeaponSwitchIndex );
		}
		
		if( ig.input.pressed('weaponNext') && this.weapons.length > 1 ) {
			this.switchWeapon( (this.currentWeaponIndex + 1) % this.weapons.length );
		}
		else if( ig.input.pressed('weaponPrev') && this.weapons.length > 1 ) {
			var index = (this.currentWeaponIndex == 0) 
				? this.weapons.length - 1 
				: this.currentWeaponIndex - 1;
			this.switchWeapon( index );
		}
		
		
		// Calculate new position based on velocity; update sector and light etc...
		this.parent();
		

		// Calculate bobbing
		this.bob += ig.system.tick * this.bobSpeed * Math.min(Math.abs(dx) + Math.abs(dy),1) * speed;
		var bobOffset = Math.sin(this.bob) * this.bobHeight;
		
		if( this.currentWeapon ) {
			this.currentWeapon.bobOffset = Math.sin(this.bob+Math.PI/2) * this.bobHeight * 4;
			this.currentWeapon.update();
		}
		
		// Update camera position and view angle
		var cx = this.pos.x + this.size.x/2,
			cy = this.pos.y + this.size.y/2;

		ig.system.camera.setRotation( trackerRotation[2], trackerRotation[1], this.angle );

		// If we have a head tracker connected, we may to adjust the position a bit
		if( ig.system.renderer instanceof tpf.StereoRenderer ) {
			var tt = trackerPosition;
			var a = this.internalAngle;
			var ttx = tt[0] * Math.cos(-a) - tt[2] * Math.sin(-a);
			var tty = tt[0] * Math.sin(-a) + tt[2] * Math.cos(-a);
			ig.system.camera.setPosition( cx + ttx, cy + tty, tt[1] );
		}
		else {
			ig.system.camera.setPosition( cx, cy, bobOffset );
		}
	},
	
	receiveDamage: function( amount, from ) {
		if( this.god || this._killed ) {
			return;
		}

		// Figure out where the damage came from and show the damage indicator
		// accordingly on the HUD
		var a = (this.angle + this.angleTo(from)) % (Math.PI*2);
		a += a < 0 ? Math.PI : -Math.PI;
			
		var xedge = ig.game.hud.width/2;
		var ypos = a < 0 ? ig.game.hud.height/2 : 0;
		var xpos = Math.abs(a).map( 0, Math.PI, -xedge, xedge );
		
		ig.game.hud.showDamageIndicator( xpos, ypos, 1 );
		
		this.hurtSounds.random().play();		
		this.parent( amount, from );
	},
	
	kill: function() {
		ig.game.hud.showMessage('You are Dead!', tpf.Hud.TIME.PERMANENT);
		ig.game.showDeathAnim();
		this.parent();
	},	
	
	giveWeapon: function( weaponClass, ammo ) {
		// Do we have this weapon already? Add ammo!
		var index = -1;
		for( var i = 0; i < this.weapons.length; i++ ) {
			var w = this.weapons[i];
			if( w instanceof weaponClass ) {
				index = i;
				w.giveAmmo( ammo );
			}
		}
		
		// New weapon?
		if( index === -1 ) {
			this.weapons.push( new weaponClass(ammo) );
			index = this.weapons.length - 1;
		}
		
		this.switchWeapon( index );
	},
	
	giveAmmo: function( weaponClass, ammo ) {
		for( var i = 0; i < this.weapons.length; i++ ) {
			var w = this.weapons[i];
			if( w instanceof weaponClass ) {
				w.giveAmmo( ammo );
			}
		}
	},

	giveHealth: function( amount ) {
		if( this.health >= this.maxHealth ) {
			return false;
		}

		this.health = Math.min(this.health + amount, this.maxHealth);
		return true;
	},
	
	switchWeapon: function( index ) {
		if( this.currentWeapon ) {
			if( this.currentWeapon.shootTimer.delta() < 0 ) {
				this.delayedWeaponSwitchIndex = index;
				return;
			}
		}
		
		this.delayedWeaponSwitchIndex = -1;
		this.currentWeaponIndex = index;
		this.currentWeapon = this.weapons[index];
		
		if( this.currentWeapon.ammoIcon ) {
			this.currentWeapon.ammoIcon.setPosition( 
				215, 
				ig.game.hud.height-this.currentWeapon.ammoIcon.tileHeight-6 
			);
		}
		
		// Make sure the lighting for the weapon is updated
		this.currentWeapon.setLight( this.currentLightColor );
	},

	switchToNextNonEmptyWeapon: function() {
		for( var i = this.currentWeaponIndex+1; i < this.weapons.length; i++ ) {
			if( !this.weapons[i].depleted() ) {
				this.switchWeapon(i);
				this.currentWeapon.shootTimer.set(0.5);
				return;
			}
		}

		for( var i = 0; i < this.currentWeaponIndex; i++ ) {
			if( !this.weapons[i].depleted() ) {
				this.switchWeapon(i);
				this.currentWeapon.shootTimer.set(0.5);
				return;
			}
		}
	},
	
	setLight: function( color ) {
		this.currentLightColor = color;
		if( this.currentWeapon ) {
			this.currentWeapon.setLight( color );
		}
	}
});

});