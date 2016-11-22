/* Game state for two teams, of 4 players */

// Constants (these values can change later if desired)
const MaxPlayersPerTeam = 2;
const GameBlockSize = 50; // in pixels
const MaxTurretsPerTeam = 2;    // TODO: indicate client-side what limits are and when they're reached

// # of grid blocks for width and height
const GridBlockWidth = 20;
const GridBlockHeight = 10;

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
        this.playerVelocity = {};

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
        this.pressed = {};
    }

    // Adds an object to the team (or decrements the veto count).
    // Return true if an object was updated, false if nothing was changed
    addObject(object, location, id) {
        // Place the object if it doesn't already exist
        if (!(location in this.selectedObjects)) {
            // Don't add if we've reached the max number of instances of this object
            if (object === 'turret') {
                if (this.numOfTurrets >= MaxTurretsPerTeam) {
                    return false;
                } else {
                    this.numOfTurrets++;
                }
            }

            this.selectedObjects[location] = {
                object: object,
                vetoCount: 0,
                team: this.getPlayerTeam(id), // what team this wall is in
                ids_who_vetoed: new Set()  // to prevent users from vetoing twice
            };
            console.log('added object ' + object + ': ', location);
        } else {
            // object already exists
            // decrease veto count (left clicking on grid decreases its veto count - basically, lets you undo your veto)
            var count = this.selectedObjects[location].vetoCount;
            if (this.selectedObjects[location].ids_who_vetoed.has(id)) {
                this.selectedObjects[location].ids_who_vetoed.delete(id);
                this.selectedObjects[location].vetoCount = Math.max(0, count - 1);
                console.log('set ' + object + ' veto count to  ', this.selectedObjects[location].vetoCount);
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
                console.log('deleting ', this.selectedObjects[location].object, ' at ', location);

                // Update count of relevant objects
                if (this.selectedObjects[location].object === 'turret') this.numOfTurrets--;

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
            objects.push({
                x: x,
                y: y,
                object: this.selectedObjects[location].object,
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

            if (this.selectedObjects[wall].object == 'wall') {
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

    updatePlayerPosition(id, pos) {
        var x = pos[0];
        var y = pos[1];
        var updatePosition = true;
        [x, y] = this.checkEdgeCollision(pos);
        if (updatePosition) {
            updatePosition = this.checkPlayerCollision(id, [x, y]);
        }
        if (updatePosition) {
            this.playerPositions[id] = [x, y];
        }
    }

    checkEdgeCollision(pos) {
        var x = pos[0];
        var y = pos[1];
        if (pos[0] < (GameBlockSize / 2)) {
            x = (GameBlockSize / 2);
        }
        if (pos[0] > (this.boardSize[0] - (GameBlockSize / 2))) {
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

    checkPlayerCollision(id, pos) {
        var isLeft = this.teamToPlayers['TeamLeft'].has(id);
        var update = true;
        for (var key in this.playerPositions) {
            if (key != id) {
                var tempPos = this.playerPositions[key];
                var tempTeamLeft = this.teamToPlayers['TeamLeft'].has(key);
                var sameTeam = (isLeft === tempTeamLeft);

                if (this.detectCollision(pos, tempPos)) {
                    update = false;
                    if (!sameTeam) {
                        this.respawn(key, tempTeamLeft);
                        this.respawn(id, isLeft);
                    } else {
                        var tempVel = this.playerVelocity[id];
                        this.playerVelocity[id] = this.playerVelocity[key];
                        this.playerVelocity[key] = tempVel;
                    }
                }
            }
        }
        return update;
    }

    respawn(id, teamLeft) {
        var index = Math.floor(Math.random() * 2);
        var spawnPoint;
        if (teamLeft) {
            spawnPoint = this.defaultSpawnPoints['TeamLeft'][index];
        } else {
            spawnPoint = this.defaultSpawnPoints['TeamRight'][index];
        }
        this.playerPositions[id] = spawnPoint;
    }

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