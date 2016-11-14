// Starts the game
function startTheGame() {
	var gameRenderer = new GameRenderer();
	gameRenderer.start();
	gameRenderer.test();
}

function updateView() {
	GAME_RENDERER.render(GAME_STAGE);
}

// This class exposes APIs that the controller can use to manipulate the game UI.
class GameRenderer {
	constructor() {
		this.playerRenderer = new PlayerRenderer();
	}

	start() {
		document.body.appendChild(GAME_RENDERER.view);
	}

	addPlayer(playerId, x, y) {
		this.playerRenderer.addPlayer(playerId, x, y);
	}

	movePlayerToLocation(playerId, x, y) {
		this.playerRenderer.setLocationOfPlayer(playerId, x, y);
	}
}

