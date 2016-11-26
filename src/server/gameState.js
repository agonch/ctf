/* Game state for two teams, of 4 players */

// Constants (these values can change later if desired)
const MaxPlayersPerTeam = 2;
const GameBlockSize = 50; // in pixels
const ValidObjectTypes = ['wall', 'turret'];    // Validate objectType sent by client before propagating to other players
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
        this.numOfTurrets = {/* team --> turretCount */};
        this.turretState = {/* turretId --> turret state */};   // turretId formed by nth turret created
        this.turretIndex = -1;  // Sequence index of latest turret created

        this.gameBlockSize = GameBlockSize;
        this.boardSize = [GridBlockWidth * GameBlockSize, GridBlockHeight * GameBlockSize];
        var [b_w, b_h] = this.boardSize;
        this.defaultSpawnPoints = {
            // spawn points are top/bottom corners
            'TeamLeft':  [[GameBlockSize, GameBlockSize], [GameBlockSize, b_h - GameBlockSize]],
            'TeamRight': [[b_w - GameBlockSize, GameBlockSize], [b_w - GameBlockSize, b_h - GameBlockSize]]
        };
    }

    // Adds an object to the team (or decrements the veto count).
    // Return true if an object was updated, false if nothing was changed
    addObject(objectType, location, id) {
        // Place the object if it doesn't already exist
        if (!(location in this.selectedObjects)) {
            var team = this.getPlayerTeam(id);      // what team this object belongs to
            var details = {};                       // additional details regarding this object

            // objectType is invalid, don't add to model
            if (!(ValidObjectTypes.indexOf(objectType) >= 0)) {
                return false;
            }

            // Turrets
            if (objectType === 'turret') {
                if (this.numOfTurrets[team] && this.numOfTurrets[team] >= MaxTurretsPerTeam) {
                    // Reached the max number of instances of turrets, don't add
                    return false;
                } else {
                    // Keep track of the number of turrets this team has placed
                    if (!this.numOfTurrets[team]) this.numOfTurrets[team] = 0;
                    this.numOfTurrets[team]++;

                    // Initialize the turret state
                    // Synthesize a turretId as the sequence number in which it was placed
                    var turretId = (++this.turretIndex);
                    var [x, y] = location;
                    this.turretState[turretId] = {
                        angle: 0,
                        trackedPlayer: null,
                        speed: 0,
                        x: x,
                        y: y,
                        forceInit: true      // Force an initial update to the client on this new turret
                    };

                    // Add the turretId to the model to help the client link and identify which state is associated to it
                    details.turretId = turretId;
                }
            }

            this.selectedObjects[location] = {
                objectType: objectType,
                vetoCount: 0,
                team: team,
                ids_who_vetoed: new Set(),  // to prevent users from vetoing twice
                details: details
            };
            console.log('added ' + objectType + ': ', location);
        } else {
            // object already exists
            // decrease veto count (left clicking on grid decreases its veto count - basically, lets you undo your veto)
            var count = this.selectedObjects[location].vetoCount;
            if (this.selectedObjects[location].ids_who_vetoed.has(id)) {
                this.selectedObjects[location].ids_who_vetoed.delete(id);
                this.selectedObjects[location].vetoCount = Math.max(0, count - 1);
                console.log('set ' + objectType + ' veto count to  ', this.selectedObjects[location].vetoCount);
            } else {
                return false;
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
                if (this.selectedObjects[location].objectType === 'turret') {
                    var turretId = this.selectedObjects[location].details.turretId;
                    delete this.turretState[turretId];   // clear out the state for the deleted turret
                    this.numOfTurrets[team]--;
                }

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
            var [x, y] = parseLocation(location);

            var attributes = {
                x: x,
                y: y,
                objectType: this.selectedObjects[location].objectType,
                vetoCount: this.selectedObjects[location].vetoCount,
                team: this.selectedObjects[location].team
            };

            // Add details object if available
            if (this.selectedObjects[location].details) {
                attributes.details = this.selectedObjects[location].details;
            }

            objects.push(attributes);
        }

        return objects;
    }

    getValidObjectTypes() {
        return ValidObjectTypes;
    }

    // TODO: Kept for legacy support transitioning from model of walls to generalized model of objects
    getAllWalls() {
        const walls = [];
        var wallStings = Object.keys(this.selectedObjects);
        for (var i = 0; i < wallStings.length; i++) {
            var wall = wallStings[i];   // "x,y" (must use strings for the object location as the key into this.selectedObjects)

            if (this.selectedObjects[wall].objectType == 'wall') {
                var [x, y] = parseLocation(wall);

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

        if(pos[0] < 0) {
            x = 0;
        } else if(pos[0] > this.boardSize[0]) {
            x = this.boardSize[0];
        }

        if(pos[1] < 0) {
            y = 0;
        } else if(pos[1] > this.boardSize[1]) {
            y = this.boardSize[1];
        }

        this.playerPositions[id] = [x, y];
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

};


function getValues(o) {
    var values = [];
    for (var key in o) {
        if (o.hasOwnProperty(key)) {
            values.push(o[key]);
        }
    }
    return values;
}

// For a locationString in the form "x,y", return a 2-tuple coordinate containing [x,y]
// (must use strings for the object location as the key into this.selectedObjects)
function parseLocation(locationString) {
    var [x, y] = locationString.split(",");
    x = parseInt(x);
    y = parseInt(y);

    return [x, y];
}