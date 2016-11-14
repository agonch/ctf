class PlayerSprite {
	constructor(x, y, radius, color) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.graphics = new PIXI.Graphics();
		GLOBAL_STAGE.addChild(this.graphics);
		this._updateGraphics();
	}

	getX() {
		return this.x;
	}

	getY() {
		return this.y;
	}

	setPosition(x, y) {
		this.x = x;
		this.y = y;
		this._updateGraphics();
	}

	getRadius() {
		return this.radius;
	}

	setRadius() {
		this.radius = radius;
		this._updateGraphics();
	}

	getColor() {
		return this.color;
	}

	setColor(color) {
		this.color = color;
		this._updateGraphics();
	}

	addToStage() {
		stage.addChild(this.graphics);
	}

	_updateGraphics() {
		this.graphics.beginFill(this.color);
		this.graphics.drawCircle(this.x, this.y, this.radius);
		this.graphics.endFill();
		this.graphics.x = this.x;
		this.graphics.y = this.y;
	}

	toString() {
		return "Location: " + this.graphics.x + ", " + this.graphics.y;
	}
}