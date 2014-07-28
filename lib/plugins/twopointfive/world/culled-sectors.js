ig.module(
	'plugins.twopointfive.world.culled-sectors'
)
.requires(
	'plugins.twopointfive.namespace',
	'plugins.twopointfive.renderer.quad'
)
.defines(function(){ "use strict";


// CulledSectors divides a World into square sectors of 'sectorSize'.

// The 'fillMap' is used as a guide of walkable space - this is usually the
// floor map.

// The 'geometryMaps' array in turn contains all maps of which the geometry
// should be combined to one mesh for each sector. For each map and each
// sector, the CulledSectorMap calls the map's 'getQuadsInRect' method and
// puts all returned quads into big array buffers.

// Once the CulledSectors are created, the visible parts of the map can be 
// drawn given an (x,y) position a view angle and fov.
// CulledSectors recursively traverses through all visible dividing portals
// and draws all world meshes and entities in them.

// Each tpf.Entity comes with a .__sectorX/Y property that denotes the 
// current sector this entity lives in. When the entity is moved, it has to 
// call the CulledSectors' .moveEntity() function to notify the sector of 
// the movement.

tpf.CulledSectors = ig.Class.extend({
	sectorSize: 4,
	tilesize: 8,

	sectors: {},
	numSectors: 0,

	sectorsTraversed: 0,
	
	init: function( fillMap, geometryMaps, sectorSize ) {

		this.sectorSize = sectorSize || 4;
		this.tilesize = fillMap.tilesize;

		this.generateSectors(sectorSize, fillMap, geometryMaps);
	},

	draw: function(cx, cy, angle, fov) {
		var visibleSectors = this.collectVisibleSectors(cx, cy, angle, fov);

		this.drawWorld(visibleSectors);
		this.drawEntities(visibleSectors);
	},

	drawWorld: function(visibleSectors) {
		for( var s in visibleSectors ) {
			visibleSectors[s].world.updateAnimations();
			ig.system.renderer.pushMesh(visibleSectors[s].world);
		}
	},

	drawEntities: function(visibleSectors) {
		var defferedDraw = [];

		for( var s in visibleSectors ) {
			var ents = visibleSectors[s].entities;
			
			for( var e in ents ) {
				// Entities with a zIndex are drawn later. This is typically
				// used for semi-transparent objects, such as water or effects
				if( ents[e].zIndex ) {
					defferedDraw.push(ents[e]);
				}
				else {
					ents[e].draw();
				}
			}
		}

		// Sort all collected entities with zIndices and draw them
		defferedDraw.sort(ig.Game.SORT.Z_INDEX);
		for( var i = 0; i < defferedDraw.length; i++ ) {
			defferedDraw[i].draw();
		}
	},

	collectVisibleSectors: function( cx, cy, angle, fov ) {
		this.sectorsTraversed = 0;
		var visibleSectors = {};

		var sx = (cx/(this.sectorSize*this.tilesize))|0,
			sy = (cy/(this.sectorSize*this.tilesize))|0;

		if( !this.sectors[sy] || !this.sectors[sy][sx] ) {
			// No sector? Shouldn't happen; we bail out.
			return visibleSectors;
		}
		var sector = this.sectors[sy][sx];
		

		// Calculate the view frustum
		var fov2 = fov/2;
		var viewFrustum = {
			cx: cx, cy: cy, // Center position
			x1: cx + Math.cos(angle-fov2), y1: cy + Math.sin(angle-fov2), // Left edge
			x2: cx + Math.cos(angle+fov2), y2: cy + Math.sin(angle+fov2) // Right edge
		};
		
		// This is where the magic happens. Gather all sectors that are visible
		// with the given frustum into 'visibleSectors', starting in 'sector'.
		this.traverseSector( sector, viewFrustum, null, visibleSectors );
		return visibleSectors;
	},
	
	moveEntity: function( ent ) {
		var tt = (this.sectorSize*this.tilesize);
		var newsx = ((ent.pos.x + ent.size.x/2) / tt)|0,
			newsy = ((ent.pos.y + ent.size.y/2) / tt)|0;
		
		if( ent.__sectorX === newsx && ent.__sectorY === newsy ) {
			// Same sector; nothing to do
			return;
		}

		if( ent.__sectorX !== null && ent.__sectorY !== null ) {
			this.removeEntityFromSector( ent.__sectorX, ent.__sectorY, ent );
		}
		this.addEntityToSector( newsx, newsy, ent );
		ent.__sectorX = newsx;
		ent.__sectorY = newsy;
	},

	removeEntity: function( ent ) {
		if( ent.__sectorX !== null && ent.__sectorY !== null ) {
			this.removeEntityFromSector( ent.__sectorX, ent.__sectorY, ent );
		}
		ent.__sectorX = null;
		ent.__sectorY = null;
	},
	
	addEntityToSector: function( sx, sy, ent ) {
		if( !this.sectors[sy] ) { return; }
		
		var sector = this.sectors[sy][sx];
		if( !sector ) { return; }
		
		sector.entities[ent.id] = ent;
	},
	
	removeEntityFromSector: function( sx, sy, ent ) {
		if( !this.sectors[sy] ) { return; }
		
		var sector = this.sectors[sy][sx];
		if( !sector ) { return; }
		delete sector.entities[ent.id];
	},

	traverseSector: function( sector, frustum, from, visibleSectors ) {
		visibleSectors[sector.id] = sector;
		this.sectorsTraversed++;

		// Loop through all portals of this sector and check if we can see them
		for( var i = 0; i < sector.portals.length; i++ ) {
			var portal = sector.portals[i];

			// Skip if the portal's target is the sector we were coming from.
			if( portal.to != from ) {
				var fp = this.frustumThroughPortal(portal, frustum);
				if( fp ) {
					this.traverseSector(portal.to, fp, sector, visibleSectors);
				}
			}
		}
	},

	pointToSideOfRay: function( x, y, rsx, rsy, rex, rey ) {
		return (y-rsy)*(rex-rsx) - (x-rsx)*(rey-rsy); 
	},

	frustumThroughPortal: function( portal, frustum ) {
		
		var side = this.pointToSideOfRay; // Shorter local name

		// Are the points of the portal between the frustum edges?
		var p1f1 = side(portal.x1, portal.y1, frustum.cx, frustum.cy, frustum.x1, frustum.y1) > 0;
		var p1f2 = side(portal.x1, portal.y1, frustum.cx, frustum.cy, frustum.x2, frustum.y2) < 0;
		var p2f1 = side(portal.x2, portal.y2, frustum.cx, frustum.cy, frustum.x1, frustum.y1) > 0;
		var p2f2 = side(portal.x2, portal.y2, frustum.cx, frustum.cy, frustum.x2, frustum.y2) < 0;
		
		// The line paralell to the portal, starting at the frustum's center
		var ppx1 = frustum.cx,
			ppy1 = frustum.cy,
			ppx2 = frustum.cx + (portal.x1-portal.x2),
			ppy2 = frustum.cy + (portal.y1-portal.y2);

		// Is the portal on the right side of the line paralell to the portal?
		var perpp = side(portal.x1, portal.y1, ppx1, ppy1, ppx2, ppy2) > 0;

		// Is the frustum on the right side of the line paralell to the portal? If so, we have 
		// to invert the perpp result to see if the portal is in front of the frustum.
		var perpf = side(frustum.x1, frustum.y1, ppx1, ppy1, ppx2, ppy2) > 0;
		var front = perpf ? perpp : !perpp;

		if(
			!(
				((p1f1 && p1f2) || (p2f1 && p2f2)) || // At least one point inside the frustum?
				(front && (p1f1 || p2f1) && (p1f2 || p2f2)) // Outside the frustum but in front?
			)
		) { 
			// Can't see portal with the given frustum
			return null; 
		}


		// Can we use the original frustum edges, or was the frustum narrowed on either side
		// by the portal?

		var nfx1, nfy1, nfx2, nfy2;
		
		// Decide which point to use for the left edge
		if( p1f1 && p1f2 ) { 
			nfx1 = portal.x1; nfy1 = portal.y1; 
		}
		else if( !p1f1 && (p1f2 || front) ) {
			nfx1 = frustum.x1; nfy1 = frustum.y1;
		}
		else {
			nfx1 = frustum.x2; nfy1 = frustum.y2;
		}

		// Decide which point to use for the right edge
		if( p2f1 && p2f2 ) {
			nfx2 = portal.x2; nfy2 = portal.y2; 
		}
		else if( !p2f1 && (p2f2 || front) ) {
			nfx2 = frustum.x1; nfy2 = frustum.y1;
		}
		else {
			nfx2 = frustum.x2; nfy2 = frustum.y2;
		}

		// Build the new, potentially narrowed, frustum. We may have to flip the left and right 
		// edges, so they are still in clockwise fashion.
		var narrowedFrustum = perpp
			? { cx: frustum.cx, cy: frustum.cy, x1: nfx1, y1: nfy1, x2: nfx2, y2: nfy2 }
			: { cx: frustum.cx, cy: frustum.cy, x1: nfx2, y1: nfy2, x2: nfx1, y2: nfy1 };

		return narrowedFrustum;
	},
	

	generateSectors: function( sectorSize, fillMap, geometryMaps ) {
		// Divide the map into sectors of 'sectorSize' tiles. At each
		// sector edge, we insert a portal if there's a floor tile
		// left & right of the edge.
		
		var tilesize = fillMap.tilesize;

		// generate vertical portals each 'sectorSize'
		for( var x = sectorSize; x < fillMap.width; x+= sectorSize ) {
			var currentLength = 0;
			var currentStart = 0;
			for( var y = 0; y < fillMap.height; y++ ) {
				var left = fillMap.data[y][x-1];
				var right = fillMap.data[y][x];
				if( 
					(y % sectorSize == 0 || !left || !right || y == fillMap.height-1) && 
					currentLength 
				) {
					var sx = (x/sectorSize)|0,
						sy = ((y-1)/sectorSize)|0;

					var s1 = this.createSectorIfNeeded( sx-1, sy, geometryMaps ), // left sector
						s2 = this.createSectorIfNeeded( sx, sy, geometryMaps ); // right sector

					this.addPortal(
						x * tilesize, currentStart * tilesize, // start
						x * tilesize, y * tilesize, // end
						s1, s2
					);
									
					currentStart = y;
					currentLength = 0;
				}
				if( left && right ) {
					currentLength++;
				}
				else {
					currentStart = y+1;
				}
			}
		}
		
		// generate horizontal portals each 'sectorSize'
		for( var y = sectorSize; y < fillMap.height; y+= sectorSize ) {
			var currentLength = 0;
			var currentStart = 0;
			for( var x = 0; x < fillMap.width; x++ ) {
				var top = fillMap.data[y-1][x];
				var bottom = fillMap.data[y][x];
				if( 
					(x % sectorSize == 0 || !top || !bottom || x == fillMap.width-1) && 
					currentLength 
				) {
					var sx = ((x-1)/sectorSize)|0,
						sy = (y/sectorSize)|0;

					var s1 = this.createSectorIfNeeded( sx, sy-1, geometryMaps ), // top sector
						s2 = this.createSectorIfNeeded( sx, sy, geometryMaps ); // bottom sector

					this.addPortal(
						currentStart * tilesize, y * tilesize, // start
						x * tilesize, y * tilesize, // end
						s1, s2
					);

					currentStart = x;
					currentLength = 0;
				}
				
				if( top && bottom ) {
					currentLength++;
				}
				else {
					currentStart = x+1;
				}
			}
		}
	},

	createSectorIfNeeded: function( x, y, maps ) {
		// Sector already created?
		if( !this.sectors[y] ) { 
			this.sectors[y] = {}; 
		}
		else if( this.sectors[y][x] ) { 
			return this.sectors[y][x];
		}

		var s = this.createSector(x, y, maps);
		this.sectors[y][x] = s;
		return s;
	},

	createSector: function( x, y, maps ) {
		// Gather geometry from all maps
		var geometry = [],
			tx = x * this.sectorSize,
			ty = y * this.sectorSize,
			tw = this.sectorSize,
			th = this.sectorSize;

		var tiles = [];
		for( var i = 0; i < maps.length; i++ ) {
			tiles = tiles.concat( maps[i].getTilesInRect(tx, ty, tw, th) );
		}
		var mesh = new tpf.TileMesh(tiles);
	
		// Return the sector		
		return {
			id: this.numSectors++,
			x: x, y: y,
			portals: [],
			world: mesh,
			entities: {}
		};
	},

	addPortal: function( px1, py1, px2, py2, s1, s2 ) {
		s1.portals.push({x1: px1, y1: py1, x2: px2, y2: py2, to: s2});
		s2.portals.push({x1: px1, y1: py1, x2: px2, y2: py2, to: s1});
	}
});

});
