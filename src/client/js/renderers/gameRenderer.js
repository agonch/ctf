// This class exposes APIs that the controller can use to manipulate the game UI.
class GameRenderer {
	constructor() {
		this.players = {};
	}

	initializeCanvas(playerId) {
		this.canvas = document.getElementById("canvas");
		this.context = canvas.getContext("2d");
		this.canvas.width = window.innerWidth - (window.innerWidth % 2) - 30;
		this.canvas.height = window.innerHeight - (window.innerHeight % 2) - 30;
		this.playerId = playerId;
		this.players[playerId] = [1000, 1000];
		var that = this;
        /*this.interval = setInterval(function() {

        }, 33);*/
        this._draw();
	}

	_draw() {
        var [x, y] = this._getLocalCoords(0, 0);
        this.context.clearRect(x, y, x + 10000, y + 10000);
        this._drawGridLines();
        this.drawSelf();
	}

	drawSelf() {
		this.context.beginPath();
		var pos = this.players[this.playerId];
		var [x, y] = this._getLocalCoords(pos[0], pos[1]);
	    this.context.arc(x, y, 50, 0, 2 * Math.PI);
        this.context.fillStyle = 'green';
        this.context.fill();
	    this.context.stroke();
	}

	_drawGridLines() {
        for (var i = 0; i < 10000; i+=50) {
            var [offsetX, offsetY] = this._getLocalCoords(0, i);
            var [offsetXCol, offsetYCol] = this._getLocalCoords(i, 0);
            this.context.beginPath();
            this.context.moveTo(offsetX, offsetY);
            this.context.lineTo(offsetX + 10000, offsetY);
            this.context.lineWidth = 0.25;
            this.context.stroke();
            this.context.beginPath();
            this.context.moveTo(offsetXCol, offsetYCol);
            this.context.lineTo(offsetXCol, offsetYCol + 10000);
            this.context.lineWidth = 0.25;
            this.context.stroke();
        }
	}

	setPlayerLocation(pos) {
		var [curX, curY] = this.players[this.playerId];
		var [newX, newY] = pos;
		var diffX = curX - newX;
		var diffY = curY - newY;
		console.log("diffX: " + diffX);
		console.log("diffY: " + diffY);
		console.log("pos: " + pos);
		this.context.translate(diffX, diffY);
		this.players[this.playerId] = pos;
        this._draw();
	}

	//movePlayerToLocation(playerId, x, y) {
	//	this.playerRenderer.setLocationOfPlayer(playerId, x, y);
	//}

	updateCanvas() {
    	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvas.width = window.innerWidth - (window.innerWidth % 2);
		this.canvas.height = window.innerHeight - (window.innerHeight % 2);
		this._drawGridLines();
		this.drawSelf();
	}

    _getLocalCoords(x, y) {
        var [playerX, playerY] = [1000, 1000]; // TODO fix these hardcodings
        var cornerX = playerX - this.canvas.width / 2;
        var cornerY = playerY - this.canvas.height / 2;
        var offsetX = x - cornerX;
        var offsetY = y - cornerY;
        return [offsetX, offsetY];
    }
}

function updateView() {
	GLOBAL_RENDERER.render(GLOBAL_STAGE);
}

