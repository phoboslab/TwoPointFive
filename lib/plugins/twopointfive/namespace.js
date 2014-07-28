ig.module(
	'plugins.twopointfive.namespace'
)
.requires(
	'plugins.twopointfive.gl-matrix'
)
.defines(function(){ "use strict";

// Create the main 'tpf' namespace, used by all other modules of this plugin
window.tpf = window.tpf || {};
	
});
