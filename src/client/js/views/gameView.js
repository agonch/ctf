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

var Start_Time = 0;         // Local computer time of when last rendered (to calculate how much time/steps has elapsed)
var Current_Time = 0;       // Current time calibrated with the server
var Time_Offset = 0;        // Local computer time offset against the server to correct differently-calibrated clocks
var Time_Deficit = 0;       // Deficit in rendering on-time with Time to make up with next draw
var Step_Deficit = 0;       // Number of virtual steps (approximates the number of ticks the server would have performed on its end)    

var TICK_RATE = 0;          // Get the server's processing rate to simulate locally (0 at start -> client is not calibrated yet)
var LATENCY = 0;            // Estimate one-way latency between server-client communication
var GRID_SIZE = 50;
var Build_Tools = [];       // let the server set this when initializing

// This class exposes APIs that the controller can use to manipulate the game UI.
class GameView {

	constructor() {
		this.players = {};
	}

	initializeCanvas(startData) {
	    console.log("Initializing...");
		this.canvas = document.getElementById("canvas");
		this.context = canvas.getContext("2d");

        // Initialize game values
        const {spawnPoint, boardSize, gridSize, playerPositions, playerName, namesToTeams, 
            objectPositions, turretStates, bulletStates,
            validObjectTypes, maxWallHealth, maxPlayerHealth} = startData;

        GRID_SIZE = gridSize;
        Build_Tools = validObjectTypes;
        Start_Time = Date.now();        // Client local time when created

		this.canvas.width = window.innerWidth - (window.innerWidth % 2) - 30; // 30 pixels prevents scrollbars from appearing
		this.canvas.height = window.innerHeight - (window.innerHeight % 2) - 30;
		this.origin = {x: 0, y: 0};

		// Mouse interaction
		this.phase = 'build';
        this.buildToolIndex = 0;
		this.buildTool = Build_Tools[this.buildToolIndex];
		this.mouse = {x: 0, y: 0};
		this.gridTopLeft = null;      // currently selected grid cell on the game board

        // Local game model loaded in from server
		this.playerName = playerName;
		this.spawnPoint = spawnPoint;
		this.players = playerPositions;
		this.players[playerName] = spawnPoint;
		this.boardSize = boardSize;
		this.namesToTeams = namesToTeams; // (ex., "Anton" --> "TeamLeft")
		this.objectPositions = objectPositions;
        this.turretStates = turretStates;   // turretId --> {turret state properties}
        this.bulletStates = bulletStates;   // bulletId --> {bullet state properties}

        this.healthValues = {'players': {/*name --> health*/}, 'walls': {/*pos --> health*/}};
        this.maxWallHealth = maxWallHealth;
        this.maxPlayerHealth = maxPlayerHealth;

        this.flagBasePositions = {
            'TeamRight': startData.teamRightFlagBasePosition,
            'TeamLeft': startData.teamLeftFlagBasePosition
        };

        this.flagPositions = {
            'TeamRight': this.flagBasePositions['TeamRight'],
            'TeamLeft': this.flagBasePositions['TeamLeft']
        }


        this.initializeStates();

        // Initialize canvas
        this.initialized = true;
        this.draw();
	}

    draw() {
        Current_Time = Date.now() + Time_Offset;
        Time_Deficit = Current_Time - Start_Time;  // amount of time elapsed since last draw
        Start_Time = Current_Time;
        Step_Deficit = TICK_RATE / (1000 / Time_Deficit);   // estimate number of steps (ticks) since last draw
        if (Step_Deficit > 1000000) Step_Deficit = 1;       // floor massive/infinity (divide-by-zero) deficits to 1


        this._clearCanvas();
        //this._drawBackground();
        this._drawGameBoard();
        this._drawBuildTool();
        this._drawGridLines();
        this._drawPlayers();
        this._drawBullets();
        this._drawObjects();
        this._drawUI();
        this._drawHealths();
        this._drawFlagBases();
        this._drawFlags();
    }

    // Fix outdated properties in states passed by server during initialization
    // Tied closely to how server processes states
    initializeStates() {
        var that = this;
        var $canvas = $('#canvas');

        $canvas.on('initializeStates', function() {
            // Bullet origin is not known mid-flight, so treat the current position as origin and NOW as timeCreated
            // Wait for controller to tell us to update
            for (var bulletId in that.bulletStates) {
                var bullet = that.bulletStates[bulletId];
                if (bullet) {
                    bullet.timeCreated = Date.now() + Time_Offset - LATENCY;
                }
            }

            // Finished correcting states
            $canvas.off('initializeStates');
        });
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

    _drawFlagBases() {
        var [Rx, Ry] = this._getLocalCoords(this.flagBasePositions['TeamRight'][0], this.flagBasePositions['TeamRight'][1]);
        var [Lx, Ly] = this._getLocalCoords(this.flagBasePositions['TeamLeft'][0], this.flagBasePositions['TeamLeft'][1]);

        this.context.fillStyle = 'purple';
        this.context.fillRect(Rx, Ry, GRID_SIZE, GRID_SIZE);

        this.context.fillStyle = 'purple';
        this.context.fillRect(Lx, Ly, GRID_SIZE, GRID_SIZE);
    }

    _drawFlags() {
        var [Rx, Ry] = this._getLocalCoords(this.flagPositions['TeamRight'][0], this.flagPositions['TeamRight'][1]);
        var [Lx, Ly] = this._getLocalCoords(this.flagPositions['TeamLeft'][0], this.flagPositions['TeamLeft'][1]);

        console.log(Rx + " " + Ry);

        this.context.fillStyle = 'yellow';
        this.context.fillRect(Rx, Ry, GRID_SIZE, GRID_SIZE);

        this.context.fillStyle = 'yellow';
        this.context.fillRect(Lx, Ly, GRID_SIZE, GRID_SIZE);
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

        const highlightColor = 'gray';
        switch (this.buildTool) {
            default:
            case 'wall':
                this.context.fillStyle = highlightColor;
                this.context.fillRect(gridX, gridY, GRID_SIZE, GRID_SIZE);
                break;
            case 'turret':
                __drawTurret(this.context, gridX, gridY, -90, highlightColor);
                break;
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
	}

	setFlagLocation(flagTeam, pos) {
        this.flagPositions[flagTeam] = pos;
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
                    // Check turretState to get necessary values such as the angle
                    var turretId = this.objectPositions[i].details.turretId;
                    var turret = this.turretStates[turretId];

                    // Skip drawing if we're still waiting on the server to update us with a state
                    if (!turret) {
                        break;
                    }

                    // For now, just update the simple logic of the turret turning at a constant
                    turret.angle += turret.speed * Step_Deficit;

                    __drawTurret(this.context, x, y, turret.angle, Team_Colors[team]);

                    break;
                default:
                    // Indicate an unrecognized object for later troubleshooting
                    this.context.fillStyle = Team_Colors[team];
                    this.context.font = "12px sans-serif";
                    this.context.textAlign = 'center';
                    this.context.fillStyle = 'black';
                    this.context.fillText("OBJERR", x + GRID_SIZE/2, y + GRID_SIZE/2);
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

    _drawBullets(context) {
        // Clip the bullets with the edge of the game board
        // Comment this and the bottom line to disable
        this.context.save();
        var [x, y] = this._getLocalCoords(0, 0);
        this.context.beginPath();
        this.context.rect(x, y, this.boardSize[0], this.boardSize[1]);
        this.context.clip();

        for (var bulletId in this.bulletStates) {
            var bullet = this.bulletStates[bulletId];

            // Bullet states are outdated by the time we get them
            // But we know the path of the bullet and when it was created,
            //  so extrapolate its position along its time-parameterized ray
            var time = Math.max(0, Current_Time - bullet.timeCreated);
            var t = TICK_RATE *  (time / 1000);             // t parameter in steps
            var angle = bullet.angle * Math.PI/180;
            var x = bullet.x + (t * bullet.speed * Math.cos(angle));
            var y = bullet.y + (t * bullet.speed * Math.sin(angle));

            // Escape and don't draw this bullet if it's projected to be out of bounds
            // Uncomment to use this instead of clipping (and comment the code outside the for loop)
            /*if (x < 0 || y < 0 || x > this.boardSize[0] || y > this.boardSize[1]) {
                continue;
            }*/

            // Draw the projectile
            var [localX, localY] = this._getLocalCoords(x, y);
            this.context.beginPath();
            this.context.arc(localX, localY, bullet.size, 0, 2*Math.PI);
            this.context.fillStyle = Team_Colors[bullet.team];
            this.context.fill();
            this.context.stroke();
        }

        // Remove the clipping mask
        this.context.restore();
    }

    _drawHealths() {
        var darkGray = "#595959";
        var darkLimeGreen = "#2eb82e";
        function drawHealthBar(x, y, healthPercent, ctx) {
            ctx.fillStyle = darkLimeGreen;
            var total_len = GRID_SIZE;
            var width = 8;
            var health_len = total_len * healthPercent;
            ctx.fillRect(x, y, health_len, width);
            ctx.fillStyle = darkGray;
            ctx.fillRect(x + health_len, y, total_len - health_len, width);
        }
        function parseLocation(strLocation) {
            var [x, y] = strLocation.split(",");
            x = parseInt(x);
            y = parseInt(y);
            return [x, y];
        }

        var health;
        var bottomPadding = 4;
        for (var name in this.healthValues['players']) {
            health = this.healthValues['players'][name];
            var pos = this.players[name];
            var [x, y] = this._getLocalCoords(pos[0], pos[1]);
            drawHealthBar(x - GRID_SIZE/2, y + GRID_SIZE/2 + bottomPadding, health/this.maxPlayerHealth, this.context);
        }
        for (var pos in this.healthValues['walls']) {
            health = this.healthValues['walls'][pos];
            pos = parseLocation(pos);
            var [x, y] = this._getLocalCoords(pos[0], pos[1]);
            drawHealthBar(x, y + GRID_SIZE*3/4, health/this.maxWallHealth, this.context);
        }
    }

}

// Draw a turret with the given angle in degrees and color
function __drawTurret(context, x, y, angle, color) {
    const basePadding = 0.1;  // factor of GRID_SIZE
    context.fillStyle = color;
    context.fillRect(x + GRID_SIZE*basePadding, y + GRID_SIZE*basePadding, 
                          GRID_SIZE * (1 - basePadding*2), GRID_SIZE * (1 - basePadding*2));
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(x + GRID_SIZE/2, y + GRID_SIZE/2, GRID_SIZE/3, 0, 2 * Math.PI);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(x + GRID_SIZE/2, y + GRID_SIZE/2, GRID_SIZE/4, 0, 2 * Math.PI);
    context.fill();
    context.stroke();

    // Draw a rotated turret barrel
    angle = angle * Math.PI/180;
    const length = GRID_SIZE/2;
    const width = GRID_SIZE/2;
    var x1 = x + GRID_SIZE/2;
    var y1 = y + GRID_SIZE/2;
    var x2 = x1 + length*Math.cos(angle);
    var y2 = y1 + length*Math.sin(angle);
    context.save();
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineWidth = width;
    context.strokeStyle = color;
    context.stroke();
    context.restore();
}