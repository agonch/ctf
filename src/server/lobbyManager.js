
/* This keeps track of all the gameStates (all games in play).
 * This acts as the lobby manager and global game state manager
 */

module.exports = class LobbyManager {
    constructor() {
        this.games = [];
        this.games.push(new GameState());
        this.loadingGame = 0;
        this.playerGame = {};
    }

    addPlayer(id, name) {
        this.games[this.loadingGame].addPlayer(id, name);
        var gameState = this.games[this.loadingGame];
        this.playerGame[id] = this.loadingGame;
        if (this.games[this.loadingGame].isFull()) {
            loadingGame++;
            this.games.push(new GameState());
        }
        return [gameState, this.playerGame[id].toString()];
    }

    getGameState(id) {
        return [this.games[this.playerGame[id]], this.playerGame[id].toString()];
    }

    deletePlayer(id) {
        this.games[this.playerGame[id]].removePlayer(id);
        delete this.playerGame[id];
    }

    nameAlreadyExists(name) {
        return this.games[this.loadingGame].nameExists(name);
    }


};
