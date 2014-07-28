ig.module(
	'plugins.twopointfive.debug'
)
.requires(
	'impact.debug.menu',
	'impact.debug.graph-panel',
	'impact.debug.entities-panel',
	
	'plugins.twopointfive.game',
	'plugins.twopointfive.world.culled-sectors'
)
.defines(function(){ "use strict";

tpf.Game.inject({
	draw: function() {
		ig.graph.beginClock('draw');
		this.parent();
		ig.graph.endClock('draw');

		ig.Image.drawCount = ig.system.renderer.drawCalls;
		ig.debug.showNumber( 'quads', ig.system.renderer.quadCount );

		if( ig.game.culledSectors ) {
			ig.debug.showNumber( 'sectors', ig.game.culledSectors.sectorsTraversed);
		}
	}
});


tpf.CulledSectors.inject({
	drawEntities: function(visibleSectors) {
		if( tpf.CulledSectors._debugDrawEntities ) {
			this.parent(visibleSectors);
		}
	}
});
tpf.CulledSectors._debugDrawEntities = true;

ig.debug.addPanel({
	type: ig.DebugPanel,
	name: 'tpf',
	label: 'TwoPointFive',
	options: [
		{
			name: 'Wireframe Rendering',
			object: {
				get wireframe() { return ig.system && ig.system.renderer && ig.system.renderer.wireframe; },
				set wireframe(v) { ig.system.renderer.wireframe = v; }
			},
			property: 'wireframe'
		},
		{
			name: 'Draw Entities',
			object: tpf.CulledSectors,
			property: '_debugDrawEntities'
		}
	]
});


});	