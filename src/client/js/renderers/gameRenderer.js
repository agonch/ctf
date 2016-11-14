// This class exposes APIs that the controller can use to manipulate the game UI.
class GameRenderer {
	constructor() {
		this.playerRenderer = new PlayerRenderer();
	}

	start() {
		document.body.appendChild(GLOBAL_RENDERER.view);
	}

	addPlayer(playerId, x, y) {
		this.playerRenderer.addPlayer(playerId, x, y);
	}

	movePlayerToLocation(playerId, x, y) {
		this.playerRenderer.setLocationOfPlayer(playerId, x, y);
	}
}

function updateView() {
	GLOBAL_RENDERER.render(GLOBAL_STAGE);
}

