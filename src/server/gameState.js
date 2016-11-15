/* Game state for a single game (of 4 player) */
module.exports = class GameState {

    constructor(maxPlayers) {
        if (maxPlayers < 0) {
            throw new Error("cannot have < 0 players");
        }
        this.maxPlayers = maxPlayers;
        this.playerPositions = {};
        //this.playerNums = {};
        this.playerNames = {}; // TODO enforce uniqueness
        this.defaultSpawnPoint = [100, 100]; // TODO generate this
        this.defaultBoardSize = [500, 500];
        this.defaultPlayerSize = 50;
    }

    addPlayer(id, name) {
        this.playerNames[id] = name;
        if (this.playerNames.length > this.maxPlayers) {
            throw new Error("num players exceeded limit..was given ", this.maxPlayers);
        }
        this.playerPositions[id] = this.defaultSpawnPoint;
        //this.playerNums[name] = this.names.length;
    }

    removePlayer(id) {
        delete this.playerPositions[id];
        delete this.playerNames[id];
    }

    updatePlayerPosition(id, pos) {
        this.playerPositions[id] = pos;
    }

    getPlayerPosition(id) {
        return this.playerPositions[id];
    }

    getPlayerNames() {
        return getValues(this.playerNames);
    }

    getPlayerName(id) {
        return this.playerNames[id];
    }

    getPlayerPositions() {
        var resultPositions = {};
        for (var key in this.playerPositions) {
            console.log("name: " + this.playerNames[key]);
            resultPositions[this.playerNames[key]] = this.playerPositions[key];
        }
        return resultPositions;
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