/* Game state for two teams, of 4 players */

// Constants (these values can change later if desired)
const MaxPlayersPerTeam = 8; // note, ok to be >= # spawn points
const GameBlockSize = 50; // in pixels
const ValidObjectTypes = ['wall', 'turret'];    // Validate objectType sent by client before propagating to other players
const MaxTurretsPerTeam = 3;    // TODO: indicate client-side what limits are and when they're reached

const MaxPlayerHealth = 5000;
const MaxWallHealth = 1000;

// # of grid blocks for width and height
const GridBlockWidth = 20;
const GridBlockHeight = 10;

var SpatialGrid = require('./SpatialGrid.js');
var SAT = require('sat');
var Vector = SAT.Vector;
var Circle = SAT.Circle;
var Box = SAT.Box;
var assert = require('assert');

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
        this.playerShape = {/*id --> SAT polygon Circle */};
        this.playerHealth = {/* id --> health*/};

        // Team game world
        this.wallHealths = {/*location --> health*/};
        this.selectedObjects = {};
        this.numOfTurrets = {/* team --> turretCount */};
        this.turretStates = {/* turretId --> turret state */};  // turretId formed by nth turret created
        this.turretIndex = -1;  // Sequence index of latest turret created
        this.bulletStates = {/* bulletId --> bullet state */};  // bulletId formed by nth bullet created
        this.bulletIndex = -1;  // Sequence index of latest bullet created
        this.bulletUpdates = {/* bulletId --> create/destroy */};    // tracks state change for bullets

        this.gameBlockSize = GameBlockSize;
        this.boardSize = [GridBlockWidth * GameBlockSize, GridBlockHeight * GameBlockSize];
        var [b_w, b_h] = this.boardSize;
        this.defaultSpawnPoints = {
            // 8 spawn locations per team (4 per corner)
            'TeamLeft':  [
                [GameBlockSize/2, GameBlockSize/2],   // top left corner spawns
                [GameBlockSize*3/2, GameBlockSize/2],
                [GameBlockSize/2, GameBlockSize*3/2],
                [GameBlockSize*3/2, GameBlockSize*3/2],

                [GameBlockSize/2, b_h - GameBlockSize*3/2],  // bottom left corner spawns
                [GameBlockSize*3/2, b_h - GameBlockSize*3/2],
                [GameBlockSize/2, b_h - GameBlockSize/2],
                [GameBlockSize*3/2, b_h - GameBlockSize/2]
            ],
            'TeamRight': [
                [b_w - GameBlockSize*3/2, GameBlockSize/2],     // top right corner spawns
                [b_w - GameBlockSize*3/2, GameBlockSize*3/2],
                [b_w - GameBlockSize/2, GameBlockSize/2],
                [b_w - GameBlockSize/2, GameBlockSize*3/2],

                [b_w - GameBlockSize*3/2, b_h - GameBlockSize/2],     // bottom right spawns
                [b_w - GameBlockSize*3/2, b_h - GameBlockSize*3/2],
                [b_w - GameBlockSize/2, b_h - GameBlockSize/2],
                [b_w - GameBlockSize/2, b_h - GameBlockSize*3/2]
            ]
        };
        this.pressed = {}; // pressed keys
        this.Grid = new SpatialGrid(GameBlockSize, this.boardSize[0], this.boardSize[1], this);
    }

    /*
     * Create a boundingBox for this entity and add it to the grid for collision detection querying.
     */
    addToGrid(entity, location) {
        // TODO turret actually has smaller bounding box than wall
        if (entity.objectType === 'turret' || entity.objectType === 'wall') {
            // note: Box actually uses lower left corner as location (not top left)
            entity.boundingBox = new Box(new Vector(location[0], location[1]), this.gameBlockSize, this.gameBlockSize);
        } else if (entity.objectType === 'player') {
            entity.boundingBox = new Circle(new Vector(location[0], location[1]), this.gameBlockSize / 2);
        } else if (entity.objectType === 'bullet') {
            entity.boundingBox = new Circle(new Vector(location[0], location[1]), entity.size);
        } else {
            throw new Error("Unkown object type");
        }

        var isStatic = entity.objectType === 'turret' || entity.objectType === 'wall';
        this.Grid.addEntity(!isStatic, entity);
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
                    this.turretStates[turretId] = {
                        angle: -90,             // angle in degrees, start turret pointing up
                        //trackedPlayer: null,
                        speed: 0,
                        x: x,
                        y: y,
                        team: team,
                        forceInit: true         // Force an initial update to the client on this new turret
                    };

                    // Add the turretId to the model to help the client link and identify which state is associated to it
                    details.turretId = turretId;
                }
            }
            if (objectType === 'wall') {
                this.wallHealths[location] = MaxWallHealth;
            }
            this.selectedObjects[location] = {
                objectType: objectType,
                location: location,
                vetoCount: 0,
                team: team,
                ids_who_vetoed: new Set(),  // to prevent users from vetoing twice
                details: details
            };
            console.log('added ' + objectType + ': ', location);

            // Register object to be queried for collision detection
            this.addToGrid(this.selectedObjects[location], location);
        } else {
            // object already exists
            // decrease veto count (left clicking on grid decreases its veto count - basically, lets you undo your veto)
            var count = this.selectedObjects[location].vetoCount;
            if (this.selectedObjects[location].ids_who_vetoed.has(id)) {
                this.selectedObjects[location].ids_who_vetoed.delete(id);
                this.selectedObjects[location].vetoCount = Math.max(0, count - 1);
                console.log('set ' + objectType + ' veto count to  ', this.selectedObjects[location].vetoCount);
            } else {
                return false; // nothing added
            }
        }

        return true; // object added
    }

    removeWall(location) {
        delete this.wallHealths[location];
        delete this.selectedObjects[location];
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
                    delete this.turretStates[turretId];   // clear out the state for the deleted turret
                    this.numOfTurrets[team]--;
                }
                if (location in this.wallHealths) {
                    delete this.wallHealths[location];
                }

                // Un-register object to be queried for collision detection
                this.Grid.deleteEntity(this.selectedObjects[location]);
                delete this.selectedObjects[location];
                return true;
            }
        }
    }

    // Creates a bullet with a:
    //  starting position
    //  velocity (speed in pixels per step, angle in degrees) 
    //  projectile size
    //  team the bullet belongs to
    // Returns the bulletId
    createBullet(x, y, angle, speed, size, team) {
        var bulletId = ++this.bulletIndex;

        // Add the bulletId to the list of bullet updates for the server to propagate back to clients
        this.bulletUpdates[bulletId] = 'create';

        // Create bullet state
        this.bulletStates[bulletId] = {
            bulletId: bulletId,
            objectType: 'bullet',
            x: x,
            y: y,
            angle: angle,
            speed: speed,
            size: size, // radius
            team: team,
            timeCreated: Date.now()     // Enables client to simulate bullet path as a time-parameterized vector
        };
        // Register bullet for collision detection
        this.addToGrid(this.bulletStates[bulletId], [x, y]);

        return bulletId;
    }

    // Destroys the bullet with the given bulletId, such as when the bullet collides or goes out-of-bounds
    destroyBullet(bulletId) {
        // Add the bulletId to the list of bullet updates for the server to propagate back to clients
        this.bulletUpdates[bulletId] = 'destroy';

        // Un-register object to be queried for collision detection
        this.Grid.deleteEntity(this.bulletStates[bulletId]);

        // Delete bullet state
        delete this.bulletStates[bulletId];
    }

    getAllObjects() {
        const objects = [];
        var objectStings = Object.keys(this.selectedObjects);
        for (var i = 0; i < objectStings.length; i++) {
            var location = objectStings[i];   // "x,y" (must use strings for the object location as the key into this.selectedObjects)
            var [x, y] = parseLocation(location);
            // TODO is iterating really necessary, can we not just return this.selectedObjects?
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
        var wallStrings = Object.keys(this.selectedObjects);
        console.log("LENGTH: " + wallStrings.length);
        for (var i = 0; i < wallStrings.length; i++) {
            var wall = wallStrings[i];   // "x,y" (must use strings for the object location as the key into this.selectedObjects)

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

    /* Game is full if both teams are filled up. */
    isFull() {
        return this.numPlayersPresent() >= MaxPlayersPerTeam*2;
    }

    // Returns true if given x,y coord is outside of the game board
    isOutOfBounds(x, y) {
        return (x < 0 || y < 0 || x > this.boardSize[0] || y > this.boardSize[1]);
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
        this.playerHealth[id] = MaxPlayerHealth;

        // Register player to be queried for collision detection. playerShape[id] will be the entity used
        // for detecting collision.
        this.playerShape[id] = {
            id: id, objectType: 'player'
        };
        this.addToGrid(this.playerShape[id], this.playerPositions[id]);
    }

    removePlayer(id) {
        console.log("removePlayer");
        delete this.playerPositions[id];
        delete this.playerNames[id];
        delete this.playerVelocity[id];
        delete this.pressed[id];
        // remove name from correct team
        if (this.teamToPlayers['TeamLeft'].has(id)) {
            this.teamToPlayers['TeamLeft'].delete(id);
        } else {
            this.teamToPlayers['TeamRight'].delete(id);
        }
        this.Grid.deleteEntity(this.playerShape[id]);
        delete this.playerShape[id];
        delete this.playerHealth[id];
    }

    /* Given pos is a list [x, y] of player position. Given pos is ignored if player collided
     * with player/wall, and their position updated accordingly. */
    updatePlayerPosition(id, pos) {
        var x = pos[0];
        var y = pos[1];
        [x, y] = this.checkBoardEdgeCollision([x, y]);
        this.playerPositions[id] = [x,y];

        // Update player's bounding box (for collision detection only).
        this.playerShape[id].boundingBox.pos.x = x;
        this.playerShape[id].boundingBox.pos.y = y;
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

    /* DEPRECATED DO NOT USE, USE SPATIAL GRID */
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

    /* DEPRECATED DO NOT USE, USE SPATIAL GRID */
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


    /* DEPRECATED DO NOT USE, USE SPATIAL GRID */
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
        const numSpawnsPerTeam = this.defaultSpawnPoints['TeamLeft'].length;
        const index = Math.floor(Math.random() * numSpawnsPerTeam);
        const spawnPoint = this.defaultSpawnPoints[this.getPlayerTeam(id)][index];
        if (spawnPoint === undefined) {
            console.log('index', index, 'spawnpoint', spawnPoint, this.getPlayerTeam(id));
            throw new Error("DEBUG spawn point");
        }
        this.updatePlayerPosition(id, spawnPoint);
        this.playerHealth[id] = MaxPlayerHealth;
    }

    /* DEPRECATED DO NOT USE, USE SPATIAL GRID */
    detectCollision(first, second) {
        return Math.sqrt(Math.pow(first[1] - second[1], 2) + Math.pow(first[0] - second[0], 2)) <= (1.0 * GameBlockSize);
    }
};

// Utility functions \\

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

// For a locationString in the form "x,y", return a 2-tuple coordinate containing [x,y]
// (must use strings for the object location as the key into this.selectedObjects)
function parseLocation(locationString) {
    var [x, y] = locationString.split(",");
    x = parseInt(x);
    y = parseInt(y);

    return [x, y];
}