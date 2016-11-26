const Team_Colors = {
    'TeamLeft': 'red',
    'TeamRight': 'blue'
};

const Build_UI = {
    x: 0,       // x, y attributes are a factor of GRID_SIZE
    y: 1.05,
    size: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 4,
    textHeight: 20,
    font: "sans-serif",
    color: "white"
};

var GRID_SIZE = 50;
var Build_Tools = [];     // let the server set this when initializing

// This class exposes APIs that the controller can use to manipulate the game UI.
class GameView {

	constructor() {
		this.players = {};
	}

	initializeCanvas(startData) {
	    console.log("Initializing...");
		this.canvas = document.getElementById("canvas");
		this.context = canvas.getContext("2d");
        const {spawnPoint, boardSize, gridSize, playerPositions, playerName, namesToTeams, objectPositions, validObjectTypes} = startData;
        GRID_SIZE = gridSize;
        Build_Tools = validObjectTypes;

		this.canvas.width = window.innerWidth - (window.innerWidth % 2) - 30; // 30 pixels prevents scrollbars from appearing
		this.canvas.height = window.innerHeight - (window.innerHeight % 2) - 30;
		this.origin = {x: 0, y: 0};

		// Mouse interaction
		this.phase = 'build';
        this.buildToolIndex = 0;
		this.buildTool = Build_Tools[this.buildToolIndex];
		this.mouse = {x: 0, y: 0};
		this.gridTopLeft = null;
		this.playerName = playerName;
		this.spawnPoint = spawnPoint;
		this.players = playerPositions;
		this.players[playerName] = spawnPoint;
		this.boardSize = boardSize;
		this.namesToTeams = namesToTeams; // (ex., "Anton" --> "TeamLeft")
		this.objectPositions = objectPositions;
        this.initialized = true;
		this.draw();
	}

    draw() {
        this._clearCanvas();
        //this._drawBackground();
        this._drawGameBoard();
        this._drawBuildTool();
        this._drawGridLines();
        this._drawPlayers();
        this._drawObjects();

        this._drawUI();
    }

    _clearCanvas() {
        var [x, y] = this._getLocalCoords(-this.canvas.width, -this.canvas.height);
        this.context.clearRect(x, y, this.boardSize[0] + this.canvas.width * 2,
            this.boardSize[1] + this.canvas.height * 2);
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
            this.context.arc(x, y, GRID_SIZE / 2, 0, 2 * Math.PI);
            var team = this.namesToTeams[name];
            this.context.fillStyle = Team_Colors[team];
            this.context.fill();
            this.context.stroke();
            this._drawNameAbovePlayer(name);
        }
	}

    _drawNameAbovePlayer(name) {
        const paddingTop = 16;
        this.context.font = "20px serif";
        this.context.textAlign = 'center';
        // this.context.fillStyle = Team_Colors["Player" + playerNum];
        var pos = this.players[name];
        var [x, y] = this._getLocalCoords(pos[0], pos[1] - GRID_SIZE / 2 - paddingTop);
        this.context.fillText(name, x, y);
    }

	_drawGridLines() {

        for (var i = 0; i <= this.boardSize[0]; i+=GRID_SIZE) {
            var [offsetX, offsetY] = this._getLocalCoords(i, 0);
            this.context.beginPath();
            this.context.moveTo(offsetX, offsetY);
            this.context.lineTo(offsetX, offsetY + this.boardSize[1]);
            this.context.lineWidth = 0.50;
            this.context.stroke();
        }
        for (var i = 0; i <= this.boardSize[1]; i+=GRID_SIZE) {
            var [offsetX, offsetY] = this._getLocalCoords(0, i);
            this.context.beginPath();
            this.context.moveTo(offsetX, offsetY);
            this.context.lineTo(offsetX + this.boardSize[0], offsetY);
            this.context.lineWidth = 0.25;
            this.context.stroke();
        }
	}

    _drawBuildTool() {
        document.body.style.cursor = 'auto';
        if (this.phase != 'build') {
            return;
        }

        // Update the tool selected
        this.buildTool = Build_Tools[this.buildToolIndex];

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
            default:
            case 'wall':
                this.context.fillStyle = 'gray';
                this.context.fillRect(gridX, gridY, GRID_SIZE, GRID_SIZE);
                break;
            //case 'turret':
            //    break;
        }
    }

    _drawUI() {
        // Build UI
        // TODO: make an actual UI rather than keyboard controlled?
        if (this.phase === 'build') {
            this.context.font = Build_UI.textHeight + "px " + Build_UI.font;
            this.context.textAlign = 'center';
            var text = "[Q] Placing: " + this.buildTool + " [E]";
            var pos = this.players[this.playerName];
            var [x, y] = this._getLocalCoords(pos[0] + GRID_SIZE * Build_UI.x, pos[1] + GRID_SIZE * Build_UI.y);
            var box = this.context.measureText(text);
            this.context.fillStyle = Build_UI.backgroundColor;
            this.context.fillRect(x - box.width/2 - Build_UI.padding, 
                                  y - Build_UI.textHeight - Build_UI.padding, 
                                  box.width + Build_UI.padding * 2, 
                                  Build_UI.size + Build_UI.padding * 2);
            this.context.fillStyle = Build_UI.color;
            this.context.fillText(text, x, y);
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

    setPlayerTeam(name, team) {
        this.namesToTeams[name] = team;
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
     * Objects View
     */
    _drawObjects(context) {
        for(var i = 0; i < this.objectPositions.length; i++) {
            var {x, y, objectType, vetoCount, team} = this.objectPositions[i];
            [x, y] = this._getLocalCoords(x, y);

            // Draw the object
            switch (objectType) {
                case 'wall':
                    this.context.fillStyle = Team_Colors[team];
                    this.context.fillRect(x, y, GRID_SIZE, GRID_SIZE);
                    break;
                case 'turret':
                    var basePadding = 0.1;  // factor of GRID_SIZE
                    this.context.fillStyle = Team_Colors[team];
                    this.context.fillRect(x + GRID_SIZE*basePadding, y + GRID_SIZE*basePadding, 
                                          GRID_SIZE * (1 - basePadding*2), GRID_SIZE * (1 - basePadding*2));
                    break;
                default:
                    // Indicate an unrecognized object for later troubleshooting
                    this.context.fillStyle = Team_Colors[team];
                    this.context.font = "12px sans-serif";
                    this.context.textAlign = 'center';
                    this.context.fillStyle = 'black';
                    this.context.fillText("OBJERR", x + GRID_SIZE / 2, y + GRID_SIZE / 2);
                    break;
            }
            

            // draw veto count
            const padding = 5;
            this.context.font = "20px serif";
            this.context.textAlign = 'center';
            this.context.fillStyle = 'yellow';
            this.context.fillText(vetoCount, x + GRID_SIZE / 2, y + GRID_SIZE / 2);
        }
    }

}

