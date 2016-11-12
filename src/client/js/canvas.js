'use strict';

var PIXI = require('PIXI');

function start() {

    var renderer = PIXI.autoDetectRenderer(window.innerWidth - 15, window.innerHeight - 20,
        { backgroundColor: 0x000000, antialias: true });
    document.body.appendChild(renderer.view);

    var stage = new PIXI.Container();

    var graphics = new PIXI.Graphics();
    // Set the fill color
    graphics.beginFill(0xe74c3c); // Red
    // Draw a circle
    graphics.drawCircle(60, 185, 40); // drawCircle(x, y, radius)
    // Applies fill to lines and shapes since the last call to beginFill.
    graphics.endFill();
    // Set a new fill color
    graphics.beginFill(0x3498db); // Blue
    // Draw an ellipse
    graphics.drawEllipse(170, 185, 45, 25); // drawEllipse(x, y, width, height)
    graphics.endFill();

    stage.addChild(graphics);
    renderer.render(stage);

}