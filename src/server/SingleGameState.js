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
        this.playerNums = {};
        this.names = [];
    }

    addPlayer(name) {
        this.names.push(name);
        if (this.names.length > this.maxPlayers) {
            throw new Error("num players exceeded limit..was given ", this.maxPlayers);
        }
        this.playerPositions[name] = [0, 0];
        this.playerNums[name] = this.names.length;
    }

    removePlayer() {
        // TODO
    }

    updatePlayerPosition(name, pos) {
        this.playerPositions[name] = pos;
    }

    getPlayerNames() {
        return this.names;
    }

    getPlayerPositions() {
        return this.playerPositions;
    }

};
