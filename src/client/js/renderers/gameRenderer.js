// This class exposes APIs that the controller can use to manipulate the game UI.
class GameRenderer {
	constructor() {
		this.players = {};
	}

	initializeCanvas() {
		this.canvas = document.getElementById("canvas");
		this.context = canvas.getContext("2d");
		this.canvas.width = window.innerWidth - (window.innerWidth % 2);
		this.canvas.height = window.innerHeight - (window.innerHeight % 2);

		this.drawSelf();
	}

	drawSelf() {
		this.context.beginPath();
	    this.context.arc(this.canvas.width / 2, this.canvas.height / 2, 50, 0, 2 * Math.PI);
	    this.context.stroke();
	}

	addPlayer(playerId, x, y) {
		this.playerRenderer.addPlayer(playerId, x, y);
	}

	movePlayerToLocation(playerId, x, y) {
		this.playerRenderer.setLocationOfPlayer(playerId, x, y);
	}

	updateCanvas() {
		this.canvas.width = window.innerWidth - (window.innerWidth % 2);
		this.canvas.height = window.innerHeight - (window.innerHeight % 2);

		this.drawSelf();
	}
}

function updateView() {
	GLOBAL_RENDERER.render(GLOBAL_STAGE);
}

