const Player_Colors = {
    'Player1': 'red',
    'Player2': 'green',
    'Player3': 'blue',
    'Player4': 'orange'
};

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
		this.playerName = startData.playerName;
		this.spawnPoint = startData.spawnPoint;
		this.players = startData.playerPositions;
		this.players[startData.playerName] = startData.spawnPoint;
		this.boardSize = startData.boardSize;
		this.playerSize = startData.playerSize;

        this.playerNumbers = startData.playerNumbers; // maps name to player number (ex., "Anton" --> 3, means Anton is player 3)
        this.draw();
	}

	draw() {
        var [x, y] = this._getLocalCoords(0, 0);
        this.context.clearRect(x, y, x + this.boardSize[0], y + this.boardSize[1]);
        this._drawBackground();
        this._drawGameBoard();
        this._drawGridLines();
        this._drawPlayers();
	}

    _drawBackground() {
        var [x, y] = this._getLocalCoords(-this.canvas.width, -this.canvas.height);
        this.context.fillStyle = 'blue';
        this.context.fillRect(x, y, this.boardSize[0] + this.canvas.width * 2, 
            this.boardSize[1] + this.canvas.height * 2);
    }

    _drawGameBoard() {
        var [x, y] = this._getLocalCoords(0, 0);
        this.context.fillStyle = 'white';
        this.context.fillRect(x, y, this.boardSize[0], this.boardSize[1]);
    }

	_drawPlayers() {
		for (var name in this.players) {
            if(!this.players.hasOwnProperty(name))
                continue;
            this.context.beginPath();
            var pos = this.players[name];
            var [x, y] = this._getLocalCoords(pos[0], pos[1]);
            this.context.arc(x, y, this.playerSize, 0, 2 * Math.PI);
            var playerNum = this.playerNumbers[name];
            this.context.fillStyle = Player_Colors["Player" + playerNum];
            this.context.fill();
            this.context.stroke();
            this._drawNameAbovePlayer(name);
        }
	}

    _drawNameAbovePlayer(name) {
        const paddingTop = 5;
        // var playerNum = this.playerNumbers[name];
        this.context.font = "20px serif";
        // this.context.fillStyle = Player_Colors["Player" + playerNum];
        var pos = this.players[name];
        var [x, y] = this._getLocalCoords(pos[0]- this.playerSize, pos[1] - this.playerSize - paddingTop);
        this.context.fillText(name, x, y);
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
		if (name == this.playerName) {
            var [curX, curY] = this.players[name];
            var [newX, newY] = pos;
            var diffX = curX - newX;
            var diffY = curY - newY;
            this.context.translate(diffX, diffY);
        }
		this.players[name] = pos;
        this.draw();
	}

    setPlayerNum(name, playerNum) {
        this.playerNumbers[name] = playerNum;
    }

    _getLocalCoords(x, y) {
        var [playerX, playerY] = this.spawnPoint;
        var cornerX = playerX - this.canvas.width / 2;
        var cornerY = playerY - this.canvas.height / 2;
        var offsetX = x - cornerX;
        var offsetY = y - cornerY; 
        return [offsetX, offsetY];
    }

    zoom(factor) {
        var localX = this.canvas.width / 2;
        var localY = this.canvas.height / 2;
        var scaledX = localX / factor;
        var scaledY = localY / factor;
        this.context.scale(factor, factor);
        this.context.translate(- (localX - scaledX), - (localY - scaledY));
    }
}

