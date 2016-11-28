/* Game state for two teams, of 4 players */

// Constants (these values can change later if desired)
const MaxPlayersPerTeam = 2;
const GameBlockSize = 50; // in pixels
const MaxTurretsPerTeam = 2;    // TODO: indicate client-side what limits are and when they're reached

// # of grid blocks for width and height
const GridBlockWidth = 20;
const GridBlockHeight = 10;
var SpatialGrid = require('./SpatialGrid.js');

/*
 * NOTE: 2 teams, one on left side, and one on right side.
 */
module.exports = class GameState {

    constructor() {
        // Player values
        this.playerPositions = {/* id --> [x,y] pixel locations */};
        this.playerNames = {/* id --> name */};
        this.teamToPlayers = {
            'TeamLeft': new Set() /*stores id's*/,
            'TeamRight': new Set()
        };
        this.playerVelocity = {/* id --> [vel_x, vel_y] */};

        // Team game world
        this.selectedObjects = {};
        this.numOfTurrets = 0;

        this.gameBlockSize = GameBlockSize;
        this.boardSize = [GridBlockWidth * GameBlockSize, GridBlockHeight * GameBlockSize];
        var [b_w, b_h] = this.boardSize;
        this.defaultSpawnPoints = {
            // spawn points are top/bottom corners
            'TeamLeft':  [[GameBlockSize, GameBlockSize], [GameBlockSize, b_h - GameBlockSize]],
            'TeamRight': [[b_w - GameBlockSize, GameBlockSize], [b_w - GameBlockSize, b_h - GameBlockSize]]
        };
        this.pressed = {}; // pressed keys
        this.Grid = SpatialGrid(GameBlockSize, this.boardSize[0], this.boardSize[1], this.collisionCallback);
    }

    collisionCallback(objA, objB) {
        console.log(objA, ' and ', objB, ' collided');
    }

    // Adds an object to the team (or decrements the veto count).
    // Return true if an object was updated, false if nothing was changed
    addObject(objectType, location, id) {
        // Place the object if it doesn't already exist
        if (!(location in this.selectedObjects)) {
            // Don't add if we've reached the max number of instances of this object
            if (objectType === 'turret') {
                if (this.numOfTurrets >= MaxTurretsPerTeam) {
                    return false;
                } else {
                    this.numOfTurrets++;
                }
            }

            this.selectedObjects[location] = {
                objectType: objectType,
                vetoCount: 0,
                team: this.getPlayerTeam(id), // what team this wall is in
                ids_who_vetoed: new Set()  // to prevent users from vetoing twice
            };
            console.log('added object ' + objectType + ': ', location);
        } else {
            // object already exists
            // decrease veto count (left clicking on grid decreases its veto count - basically, lets you undo your veto)
            var count = this.selectedObjects[location].vetoCount;
            if (this.selectedObjects[location].ids_who_vetoed.has(id)) {
                this.selectedObjects[location].ids_who_vetoed.delete(id);
                this.selectedObjects[location].vetoCount = Math.max(0, count - 1);
                console.log('set ' + objectType + ' veto count to  ', this.selectedObjects[location].vetoCount);
            }
        }

        return true;
    }

    // With the object at the given location, increment its veto count. If veto count >= majority vote, delete it.
    // Return true if the object got deleted
    incrementVetoCount(location, id) {
        if (!(location in this.selectedObjects)) {
            return false;
        }
        var team = this.selectedObjects[location].team;
        var numPlayersInTeam = this.teamToPlayers[team].size;
        const vetoCount = Math.floor(numPlayersInTeam / 2) + 1;

        if (team !== this.getPlayerTeam(id)) {
            // this player is of different team, cannot touch this object
            return false;
        }

        if (!this.selectedObjects[location].ids_who_vetoed.has(id)) {
            this.selectedObjects[location].ids_who_vetoed.add(id);

            this.selectedObjects[location].vetoCount++;
            console.log('veto count of ', location, ' is ', this.selectedObjects[location].vetoCount);

            // If enough veto votes, delete the object
            if (this.selectedObjects[location].vetoCount >= vetoCount) {
                console.log('deleting ', this.selectedObjects[location].objectType, ' at ', location);

                // Update count of relevant objects
                if (this.selectedObjects[location].objectType === 'turret') this.numOfTurrets--;

                delete this.selectedObjects[location];
                return true;
            }
        }
    }

    getAllObjects() {
        const objects = [];
        var objectStings = Object.keys(this.selectedObjects);
        for (var i = 0; i < objectStings.length; i++) {
            var location = objectStings[i];   // "x,y" (must use strings for the object location as the key into this.selectedObjects)
            var [x, y] = location.split(",");
            x = parseInt(x);
            y = parseInt(y);
            // TODO is iterating really necessary, can we not just return this.selectedObjects?
            objects.push({
                x: x,
                y: y,
                objectType: this.selectedObjects[location].objectType,
                vetoCount: this.selectedObjects[location].vetoCount,
                team: this.selectedObjects[location].team
            });
        }

        return objects;
    }

    // TODO: Kept for legacy support transitioning from model of walls to generalized model of objects
    getAllWalls() {
        const walls = [];
        var wallStings = Object.keys(this.selectedObjects);
        for (var i = 0; i < wallStings.length; i++) {
            var wall = wallStings[i];   // "x,y" (must use strings for the object location as the key into this.selectedObjects)

            if (this.selectedObjects[wall].objectType === 'wall') {
                var [x, y] = wall.split(",");
                x = parseInt(x);
                y = parseInt(y);
                walls.push({
                    x: x,
                    y: y,
                    vetoCount: this.selectedObjects[wall].vetoCount,
                    team: this.selectedObjects[wall].team
                });
            }
        }

        return walls;
    }

    /* Game is full if both teams are filled up. */
    isFull() {
        return this.numPlayersPresent() >= MaxPlayersPerTeam*2;
    }

    getPlayerNames() {
        return getValues(this.playerNames);
    }

    getPlayerTeam(id) {
        if(this.teamToPlayers['TeamLeft'].has(id)) {
            return 'TeamLeft';
        }
        return 'TeamRight';
    }

    nameExists(name) {
        return this.getPlayerNames().indexOf(name) >= 0;
    }

    numPlayersPresent() {
        return this.teamToPlayers['TeamLeft'].size + this.teamToPlayers['TeamRight'].size;
    }

    addPlayer(id, name) {
        console.log("addPlayer: " + id + ", " + name);
        const numLeft = this.teamToPlayers['TeamLeft'].size;
        const numRight = this.teamToPlayers['TeamRight'].size;
        if ((numLeft + numRight) >= MaxPlayersPerTeam * 2) {
            throw new Error("Can't have more than %d players per game.", MaxPlayersPerTeam * 2);
        }
        var team = 'TeamRight';
        if (numLeft < MaxPlayersPerTeam && numLeft < numRight) {
            team = 'TeamLeft';
        }

        this.teamToPlayers[team].add(id);
        const numSpawnPoints = this.defaultSpawnPoints[team].length;
        this.playerPositions[id] = this.defaultSpawnPoints[team][numLeft % numSpawnPoints];
        console.log("addPlayer: " + this.playerPositions[id]);
        this.playerNames[id] = name;
        this.playerVelocity[id] = [0, 0];
        this.pressed[id] = {'W': false, 'A': false, 'S': false, 'D': false};
    }

    removePlayer(id) {
        console.log("removePlayer");
        delete this.playerPositions[id];
        delete this.playerNames[id];
        delete this.playerVelocity[id];
        // remove name from correct team
        if (this.teamToPlayers['TeamLeft'].has(id)) {
            this.teamToPlayers['TeamLeft'].delete(id);
        } else {
            this.teamToPlayers['TeamRight'].delete(id);
        }
    }

    /* Given pos is a list [x, y] of player position. Given pos is ignored if player collided
     * with player/wall, and their position updated accordingly. */
    updatePlayerPosition(id, pos) {
        var x = pos[0];
        var y = pos[1];
        var updatePosition = true;
        [x, y] = this.checkBoardEdgeCollision([x, y]);
        updatePosition = this.checkWallCollision(([x, y]));
        if (updatePosition) {
            updatePosition = this.checkPlayerCollision(id, [x, y]);
        }
        if (updatePosition) {
            this.playerPositions[id] = [x, y];
        }
    }

    /* Returns new player position to prevent them from crossing board edges. */
    checkBoardEdgeCollision(pos) {
        // pos is center of player
        var x = pos[0];
        var y = pos[1];
        if (x < (GameBlockSize / 2)) {
            x = (GameBlockSize / 2);
        }
        if (x > (this.boardSize[0] - (GameBlockSize / 2))) {
            x = (this.boardSize[0] - (GameBlockSize / 2));
        }
        if (pos[1] < (GameBlockSize / 2)) {
            y = (GameBlockSize / 2);
        }
        if (pos[1] > (this.boardSize[1] - (GameBlockSize / 2))) {
            y = (this.boardSize[1] - (GameBlockSize / 2))
        }
        return [x, y];
    }

    checkWallCollision(pos) {
        var walls = this.getAllWalls();
        for (var i = 0; i < walls.length; i++) {
            var wall = walls[i];
            var cornerA = [wall.x, wall.y];
            var cornerB = [wall.x + GameBlockSize, wall.y];
            var cornerC = [wall.x + GameBlockSize, wall.y + GameBlockSize];
            var cornerD = [wall.x, wall.y + GameBlockSize];
            if (this.checkIntersection(pos, cornerA, cornerB) || this.checkIntersection(pos, cornerB, cornerC)
                || this.checkIntersection(pos, cornerC, cornerD) || this.checkIntersection(pos, cornerD, cornerA)) {
                return false;
            }
        }
        return true;
    }

    checkIntersection(circleCenter, pointA, pointB) {
        var m = (pointB[1] - pointA[1]) / (pointB[0] - pointA[0]);
        if (m === 0) {
            var y = pointA[1];
            if (y <= circleCenter[1] - GameBlockSize / 2 || y >= circleCenter[1] + GameBlockSize / 2) {
                return false
            }
            var x = circleCenter[0];
            var min = Math.min(pointA[0], pointB[0]);
            var max = Math.max(pointA[0], pointB[0]);
            return (x >= min && x <= max);
        } else {
            var x = pointA[0];
            if (x <= circleCenter[0] - GameBlockSize / 2 || x >= circleCenter[0] + GameBlockSize / 2) {
                return false
            }
            var y = circleCenter[1];
            var min = Math.min(pointA[1], pointB[1]);
            var max = Math.max(pointA[1], pointB[1]);
            return (y >= min && y <= max);
        }
    }


    getPlayerPosition(id) {
        return this.playerPositions[id];
    }

    getPlayerName(id) {
        return this.playerNames[id];
    }

    /*
     * Return [ nameToPixelLocations, nameToTeam ]
     */
    getAllPlayers() {
        var nameToPos = {};
        var nameToTeam = {};
        const ids = Object.keys(this.playerPositions);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var name = this.playerNames[id];
            nameToPos[name] = this.playerPositions[id];
            if (this.teamToPlayers['TeamLeft'].has(id)) {
                nameToTeam[name] = 'TeamLeft';
            } else {
                nameToTeam[name] = 'TeamRight';
            }
        }
        return [nameToPos, nameToTeam];
    }

    // TODO move this to gameLogic to avoid duplicated collisison detection
    checkPlayerCollision(id, pos) {
        var isLeft = this.teamToPlayers['TeamLeft'].has(id);
        var update = true;
        const _ids = Object.keys(this.playerPositions);
        for (var i = 0; i < _ids.length; i++) {
            const other_id = _ids[i];
            if (other_id !== id) {
                var tempPos = this.playerPositions[other_id];
                var tempTeamLeft = this.teamToPlayers['TeamLeft'].has(other_id);
                var sameTeam = (isLeft === tempTeamLeft);

                if (this.detectCollision(pos, tempPos)) {
                    update = false;
                    if (!sameTeam) {
                        this.respawn(other_id);
                        this.respawn(id);
                    } else {
                        var tempVel = this.playerVelocity[id];
                        this.playerVelocity[id] = this.playerVelocity[other_id];
                        this.playerVelocity[other_id] = tempVel;
                    }
                }
            }
        }
        return update;
    }

    /* Updates player position to random spawn point on their team's side. */
    respawn(id) {
        const index = Math.floor(Math.random() * 2);
        const spawnPoint = this.defaultSpawnPoints[this.getPlayerTeam(id)][index];
        this.playerPositions[id] = spawnPoint;
    }

    /* Using Pythagorean Theorem, returns true if two players collided */
    detectCollision(first, second) {
        return Math.sqrt(Math.pow(first[1] - second[1], 2) + Math.pow(first[0] - second[0], 2)) <= (1.0 * GameBlockSize);
    }
};


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function getValues(o) {
    var values = [];
    for (var key in o) {
        if (o.hasOwnProperty(key)) {
            values.push(o[key]);
        }
    }
    return values;
}