const Player_Colors = {
    'Player1': 'red',
    'Player2': 'green',
    'Player3': 'blue',
    'Player4': 'orange'
};

const GRID_SIZE = 50;

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
        this.origin = {x: 0, y: 0};

        // Mouse interaction
        this.phase = 'build';
        this.buildTool = 'wall';
        this.mouse = {x: 0, y: 0};
        this.gridTopLeft;

		this.playerName = startData.playerName;
		this.spawnPoint = startData.spawnPoint;
		this.players = startData.playerPositions;
		this.players[startData.playerName] = startData.spawnPoint;
		this.boardSize = startData.boardSize;
		this.playerSize = startData.playerSize;

        this.playerNumbers = startData.playerNumbers; // maps name to player number (ex., "Anton" --> 3, means Anton is player 3)
        



        this.wallPositions = [ ];    




        this.draw();
	}

	draw() {
        var [x, y] = this._getLocalCoords(0, 0);
        this.context.clearRect(x, y, x + this.boardSize[0], y + this.boardSize[1]);
        this._drawBackground();
        this._drawGameBoard();
        this._drawBuildTool();
        this._drawGridLines();
        this._drawPlayers();
        this.drawWalls();
	}

    _drawBackground() {
        var [x, y] = this._getLocalCoords(-this.canvas.width, -this.canvas.height);
        this.context.fillStyle = 'blue';
        this.context.fillRect(0, 0, this.boardSize[0] + this.canvas.width * 2, 
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
        for (var i = 0; i < this.boardSize[0]; i+=GRID_SIZE) {
            var [offsetX, offsetY] = this._getLocalCoords(0, i);
            this.context.beginPath();
            this.context.moveTo(offsetX, offsetY);
            this.context.lineTo(offsetX + this.boardSize[0], offsetY);
            this.context.lineWidth = 0.25;
            this.context.stroke();
        }
        for (var i = 0; i < this.boardSize[1]; i+=GRID_SIZE) {
            var [offsetX, offsetY] = this._getLocalCoords(i, 0);
            this.context.beginPath();
            this.context.moveTo(offsetX, offsetY);
            this.context.lineTo(offsetX, offsetY + this.boardSize[1]);
            this.context.lineWidth = 0.25;
            this.context.stroke();
        }
	}

    _drawBuildTool() {
        document.body.style.cursor = 'auto';
        if (this.phase != 'build') {
            return;
        }

        var [left, top] = this._getLocalCoords(0, 0);
        var outOfScreen = this.mouse.x < 0 || this.mouse.y < 0 ||
            this.mouse.x > this.canvas.width || this.mouse.y > this.canvas.height;
        var outOfBoard = this.mouse.x < left + this.origin.x || this.mouse.y < top + this.origin.y ||
            this.mouse.x >= this.boardSize[0] + this.origin.x + left || this.mouse.y >= this.boardSize[1] + this.origin.y + top;
        if (outOfScreen || outOfBoard) {
            // Clear the stored grid values since they're not valid anymore
            this.gridTopLeft = null;

            document.body.style.cursor = 'not-allowed';
            return;
        }

        // Set cursor to click
        document.body.style.cursor = 'pointer';

        // Snap mouse position to grid
        var relative = this.getRelativeCoordsFromCanvasCoords(this.mouse);
        var offsetX = GRID_SIZE - left % GRID_SIZE;
        var offsetY = GRID_SIZE - top % GRID_SIZE;
        var gridX = GRID_SIZE * Math.floor((relative.x + offsetX) / GRID_SIZE);
        var gridY = GRID_SIZE * Math.floor((relative.y + offsetY) / GRID_SIZE);

        gridX -= offsetX;
        gridY -= offsetY;
        // These fields are updated so that the controller can send the top left coordinates
        // of the grid to the server when the user clicks on a grid location
        
        var localGridX = GRID_SIZE * Math.floor((relative.x - left) / GRID_SIZE);
        var localGridY = GRID_SIZE * Math.floor((relative.y - top) / GRID_SIZE);
        this.gridTopLeft = {x: localGridX, y: localGridY};

        switch (this.buildTool) {
            case 'wall':
                this.context.fillStyle = 'gray';
                this.context.fillRect(gridX, gridY, GRID_SIZE, GRID_SIZE);
            default:
                break;
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
            this.moveCamera(diffX, diffY);
        }
		this.players[name] = pos;
        this.draw();
	}

    moveCamera(deltaX, deltaY) {
        this.context.translate(deltaX, deltaY);

        // Keep track of the total translation
        this.origin.x += deltaX;
        this.origin.y += deltaY;
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

    getCanvasDimensions() {
        // Dimensions with left, top, right, bottom, x, y, width, height
        var dimensions = this.canvas.getBoundingClientRect();

        // Add scale to the object
        dimensions.scaleX = this.canvas.width / dimensions.width;
        dimensions.scaleY = this.canvas.height / dimensions.height;

        return dimensions;
    }

    setMousePosition(pos) {
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
    }

    /**
     * @param  {Object} x,y on canvas (where top-left is 0,0)
     * @return {Object} x,y in local game world
     */
    getRelativeCoordsFromCanvasCoords(pos) {
        return {
            x: pos.x - this.origin.x,
            y: pos.y - this.origin.y
        }
    }

    /**
     * Wall View
     */
    drawWalls(context) {
        for(var i = 0; i < this.wallPositions.length; i++) {
            var [x, y] = this._getLocalCoords(this.wallPositions[i][0], this.wallPositions[i][1]);
            this.context.fillStyle = 'brown';
            this.context.fillRect(x, y, GRID_SIZE, GRID_SIZE);
        }
    }

    updateWallPositions(wallPositions) {
        this.wallPositions = wallPositions;
        this.draw();
    }
}

