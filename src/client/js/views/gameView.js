// This class exposes APIs that the controller can use to manipulate the game UI.
class GameView {
	constructor() {
		this.players = {};
	}

	initializeCanvas(startData) {
		this.canvas = document.getElementById("canvas");
		this.context = canvas.getContext("2d");
		this.canvas.width = window.innerWidth - (window.innerWidth % 2) - 30; // 30 pixels prevents scrollbars from appearing
		this.canvas.height = window.innerHeight - (window.innerHeight % 2) - 30;
		this.playerId = startData.playerId;
		this.spawnPoint = startData.spawnPoint;
		this.players = startData.playerPositions;
		this.players[startData.playerId] = startData.spawnPoint;
		this.boardSize = startData.boardSize;
		this.playerSize = startData.playerSize;
        this.draw();
	}

	draw() {
        var [x, y] = this._getLocalCoords(0, 0);
        this.context.clearRect(x, y, x + this.boardSize[0], y + this.boardSize[1]);
        this._drawGridLines();
        this._drawPlayers();
	}

	_drawPlayers() {
		for (var key in this.players) {
            this.context.beginPath();
            var pos = this.players[key];
            var [x, y] = this._getLocalCoords(pos[0], pos[1]);
            this.context.arc(x, y, this.playerSize, 0, 2 * Math.PI);
            this.context.fillStyle = 'green';
            this.context.fill();
            this.context.stroke();
        }
	}

	_drawGridLines() {
        for (var i = 0; i < this.boardSize[0]; i+=50) {
            var [offsetX, offsetY] = this._getLocalCoords(0, i);
            this.context.beginPath();
            this.context.moveTo(offsetX, offsetY);
            this.context.lineTo(offsetX + this.boardSize[0], offsetY);
            this.context.lineWidth = 0.25;
            this.context.stroke();
        }
        for (var i = 0; i < this.boardSize[1]; i+=50) {
            var [offsetX, offsetY] = this._getLocalCoords(i, 0);
            this.context.beginPath();
            this.context.moveTo(offsetX, offsetY);
            this.context.lineTo(offsetX, offsetY + this.boardSize[1]);
            this.context.lineWidth = 0.25;
            this.context.stroke();
        }
	}

	removePlayer(name) {
		delete this.players[name];
		this.draw();
	}

	setPlayerLocation(name, pos) {
		if (name == this.playerId) {
            var [curX, curY] = this.players[name];
            var [newX, newY] = pos;
            var diffX = curX - newX;
            var diffY = curY - newY;
            this.context.translate(diffX, diffY);
        }
		this.players[name] = pos;
        this.draw();
	}

    _getLocalCoords(x, y) {
        var [playerX, playerY] = this.spawnPoint;
        var cornerX = playerX - this.canvas.width / 2;
        var cornerY = playerY - this.canvas.height / 2;
        var offsetX = x - cornerX;
        var offsetY = y - cornerY;
        return [offsetX, offsetY];
    }
}

