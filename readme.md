# TwoPointFive for Impact

TwoPointFive is a plugin for the [Impact HTML5 Game Engine](http://impactjs.com/) that provides a 3D viewport for the game world.


### Demo
[Super Blob Blaster](http://phoboslab.org/twopointfive/)


A demo game that uses this plugin is included in this repository.

Please note that you need a license for Impact to actually run the demo. The `lib/impact/` and `lib/weltmeister/` directories from Impact need to be copied into the `lib/` directory of this demo.


### Usage

The demo game and its sources in `lib/game/` should give you a good overview on how to use the plugin. 

The most importantant thing for your entities is to subclass them from `tpf.Entity` rather than from `ig.Entity`. The `tpf.Entity` provides some capabilities to position and draw them in 3D space. Each entity has an additional `.z` property for `.pos` and `.vel` that determines its vertical position and speed in the world.

The layers in your level need to be named in a certain way for TwoPointFive to recognize them. The tile layers for the graphics need to be named `floor`, `ceiling` and `walls`. An additional `light` layer provides an additional tint for each of the tiles in the level. Note that the tilesize for each of these layers must be the same. Again, have a look a the included `lib/game/levels/base1.js` for an example.


TwoPointFive comes with some additions to Impact's Debug Module to show To load it, simply require the `plugins.twopointfive.debug` module in your `main.js`.