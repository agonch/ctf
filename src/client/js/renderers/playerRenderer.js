class PlayerRenderer {
	constructor() {
		// Maps a unique player id to the player sprite
		this.players = {};
	}

	addPlayer(playerId, x, y) {
		var newPlayer = new PlayerSprite(x, y, PLAYER_RADIUS, PLAYER_COLOR);
		this.players[playerId] = newPlayer;
		updateView();
	}

	getRandomColor() {
		return '#'+(Math.random()*0xFFFFFF<<0).toString(16);
	}

	setLocationOfPlayer(playerId, x, y) {
		this.players[playerId].setPosition(x, y);
		updateView();
	}
}