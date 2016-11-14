/**
 * Created by agonch on 11/13/16.
 */

/* game state for a single game (of 4 player) */
module.exports = class SingleGameState {

    constructor(maxPlayers) {
        if (maxPlayers < 0) {
            throw new Error("cannot have < 0 players");
        }
        this.maxPlayers = maxPlayers;
        this.playerPositions = {};
        //this.playerNums = {};
        this.playerNames = {};
    }

    addPlayer(id, name) {
        this.playerNames[id] = name;
        if (this.playerNames.length > this.maxPlayers) {
            throw new Error("num players exceeded limit..was given ", this.maxPlayers);
        }
        this.playerPositions[id] = [1000, 1000];
        //this.playerNums[name] = this.names.length;
    }

    removePlayer(id) {
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
        return this.playerPositions;
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