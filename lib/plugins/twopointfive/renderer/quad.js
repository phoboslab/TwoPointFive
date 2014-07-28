ig.module(
	'plugins.twopointfive.renderer.quad'
)
.requires(
	'plugins.twopointfive.namespace'
)
.defines(function(){ "use strict";

// The tpf.Quad is the heart of TwoPointFive. Everything that's drawn
// on the screen is drawn through a Quad or, like the tpf.TileMesh,
// is generated from Quads.

// A Quad has 6 vertices, each with an an x, y, z position, 
// u, v texture coordinates and rgba colors.

// Each Quad comes with its own 54 element Float32Array:

// struct vert {
// 	float x, y, z; 		// 0, 1, 2
// 	float u, v; 		// 3, 4
// 	float r, g, b, a; 	// 5, 6, 7, 8
// }
// vert size = 9 * 6 verts = 54 float elements = 216 bytes

// A Quad has no means to draw itself. Instead, it can only copy itself
// into another buffer. TwoPointFive's Renderer maintains a large buffer
// to collect all tiles with the same texture and finally draw them.

tpf.Quad = function( width, height, texture ) {
	this.texture = texture || null;
	this.width = width || 1;
	this.height = height || 1;
	this.color = {r:1, g:1, b:1, a:1};
	
	this.position = vec3.create();
	this.rotation = vec3.create();

	this._dirty = true;
	this._verts = new Float32Array(tpf.Quad.SIZE);

	// vec3 views into the _verts array; needed by gl-matrix
	this._vertsPos = [
		this._verts.subarray(0 * 9, 0 * 9 + 3),
		this._verts.subarray(1 * 9, 1 * 9 + 3),
		this._verts.subarray(2 * 9, 2 * 9 + 3),
		this._verts.subarray(3 * 9, 3 * 9 + 3),
		this._verts.subarray(4 * 9, 4 * 9 + 3),
		this._verts.subarray(5 * 9, 5 * 9 + 3),
	];

	this._recalcPositions = function() {
		var v = this._verts;
		var vp = this._vertsPos;
		var rot = this.rotation;
		var m = mat4.identity(tpf.Quad._workMatrix);
		
		var sx2 = this.width/2,
			sy2 = this.height/2;

		vp[0][0] = -sx2; vp[0][1] = -sy2; vp[0][2] = 0; // top left
		vp[1][0] = sx2; vp[1][1] = -sy2; vp[1][2] = 0; // top right
		vp[2][0] = -sx2; vp[2][1] = sy2; vp[2][2] = 0; // bottom left

		vp[3][0] = sx2; vp[3][1] = sy2; vp[3][2] = 0; // bottom right
		// vp[4] = vp[2] = bottom left; set after transform
		// vp[5] = vp[1] = top right; set after transform
		
		mat4.translate(m, m, this.position);
		if( rot[0] ) { mat4.rotateX(m, m, rot[0]); }
		if( rot[1] ) { mat4.rotateY(m, m, rot[1]); }
		if( rot[2] ) { mat4.rotateZ(m, m, rot[2]); }

		vec3.transformMat4(vp[0], vp[0], m);
		vec3.transformMat4(vp[1], vp[1], m);
		vec3.transformMat4(vp[2], vp[2], m);
		vec3.transformMat4(vp[3], vp[3], m);

		vp[4].set(vp[2]);
		vp[5].set(vp[1]);
	};

	this.setSize = function( width, height ) {
		this.width = width;
		this.height = height;
		this._dirty = true;
	};

	this.setPosition = function( x, y, z ) {
		this.position[0] = x;
		this.position[1] = y;
		this.position[2] = z;
		this._dirty = true;
	};

	this.setRotation = function( x, y, z ) {
		this.rotation[0] = x;
		this.rotation[1] = y;
		this.rotation[2] = z;
		this._dirty = true;
	};

	this.setUV = function( x1, y1, x2, y2 ) {
		var v = this._verts;
		v[3] = x1; v[4] = y1;   // top left
		v[12] = x2; v[13] = y1; // top right
		v[21] = x1; v[22] = y2; // bottom left

		v[30] = x2; v[31] = y2; // bottom right
		v[39] = x1; v[40] = y2; // bottom left
		v[48] = x2; v[49] = y1; // top right
	};
	this.setUV(0,0,1,1);

	this.setColor = function( c ) {
		this.color.r = c.r;
		this.color.g = c.g;
		this.color.b = c.b;
		var v = this._verts;

		v[5] = c.r; v[6] = c.g; v[7] = c.b; // top left
		v[14] = c.r; v[15] = c.g; v[16] = c.b; // top right
		v[23] = c.r; v[24] = c.g; v[25] = c.b; // bottom left

		v[32] = c.r; v[33] = c.g; v[34] = c.b; // bottom right
		v[41] = c.r; v[42] = c.g; v[43] = c.b; // bottom left
		v[50] = c.r; v[51] = c.g; v[52] = c.b; // top right
	};
	this.setColor(this.color);

	this.setAlpha = function( a ) {
		var v = this._verts;
		this.color.a = a;

		v[8] = a; // top left
		v[17] = a; // top right
		v[26] = a; // bottom left

		v[35] = a; // bottom right
		v[44] = a; // bottom left
		v[53] = a; // top right
	};
	this.setAlpha(this.color.a);

	this.copyToBuffer = function( buffer, index ) {
		if( this._dirty ) {
			this._recalcPositions();
			this._dirty = false;
		}
		buffer.set(this._verts, index);
	};
};

// This class method is essentially the same as the setUV() instance method,
// but takes a buffer and offset instead of operating on the instance's 
// vertices directly.

// This is used by tpf.TileMeshes to directly update UV coordinates for animted
// world tiles.

tpf.Quad.setUVInBuffer = function(buffer, offset, x1, y1, x2, y2) {
	var b = offset * tpf.Quad.SIZE;
	var v = buffer;

	v[b+3] = x1; v[b+4] = y1;   // top left
	v[b+12] = x2; v[b+13] = y1; // top right
	v[b+21] = x1; v[b+22] = y2; // bottom left

	v[b+30] = x2; v[b+31] = y2; // bottom right
	v[b+39] = x1; v[b+40] = y2; // bottom left
	v[b+48] = x2; v[b+49] = y1; // top right
};

tpf.Quad.VERTEX_SIZE = 9;
tpf.Quad.VERTICES = 6;
tpf.Quad.SIZE = tpf.Quad.VERTEX_SIZE * tpf.Quad.VERTICES;

if( !ig.global.wm ) {
	tpf.Quad._workMatrix = mat4.create();
}

});
