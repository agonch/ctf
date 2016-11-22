/* Game state for two teams, of 4 players */

// Constants (these values can change later if desired)
const MaxPlayersPerTeam = 2;
const GameBlockSize = 50; // in pixels

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
        this.selectedWalls = {};

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

    // Adds wall to the team team (or decrements the veto count).
    addWall(wall, id) {
        if (!(wall in this.selectedWalls)) {
            this.selectedWalls[wall] = {
                vetoCount: 0,
                team: this.getPlayerTeam(id), // what team this wall is in
                ids_who_vetoed: new Set()  // to prevent users from vetoing twice
            };
            console.log('added wall: ', wall);
        } else {
            // wall already exists
            // decrease veto count (left clicking on grid decreases its veto count - basically, lets you undo your veto)
            var count = this.selectedWalls[wall].vetoCount;
            if (this.selectedWalls[wall].ids_who_vetoed.has(id)) {
                this.selectedWalls[wall].ids_who_vetoed.delete(id);
                this.selectedWalls[wall].vetoCount = Math.max(0, count - 1);
                console.log('set wall veto count to  ', this.selectedWalls[wall].vetoCount);
            }
        }
    }

    // Increment the walls veto count. If veto count >= majority vote, delete it.
    // Return true if wall got deleted
    incrementVetoCount(wall, id) {
        if (!(wall in this.selectedWalls)) {
            return false;
        }
        var team = this.selectedWalls[wall].team;
        var numPlayersInTeam = this.teamToPlayers[team].size;
        const vetoCount = Math.floor(numPlayersInTeam / 2) + 1;

        if (team !== this.getPlayerTeam(id)) {
            // this player is of different team, cannot touch his wall
            return false;
        }

        if (!this.selectedWalls[wall].ids_who_vetoed.has(id)) {
            this.selectedWalls[wall].ids_who_vetoed.add(id);

            this.selectedWalls[wall].vetoCount++;
            console.log('veto count of ', wall, ' is ', this.selectedWalls[wall].vetoCount);
            if (this.selectedWalls[wall].vetoCount >= vetoCount) {
                console.log('deleteing wall ', wall);
                delete this.selectedWalls[wall];
                return true;
            }
        }
    }

    getAllWalls() {
        const walls = [];
        var wallStings = Object.keys(this.selectedWalls);
        for (var i = 0; i < wallStings.length; i++) {
            var wall = wallStings[i];   // "x,y" (must use strings as the wall locations as the key into this.selectedWalls)
            var [x, y] = wall.split(",");
            x = parseInt(x);
            y = parseInt(y);
            walls.push({
                x: x,
                y: y,
                vetoCount: this.selectedWalls[wall].vetoCount,
                team: this.selectedWalls[wall].team
            });
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