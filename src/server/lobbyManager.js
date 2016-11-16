
/* This keeps track of all the gameStates (all games in play).
 * This acts as the lobby manager and global game state manager
 */

module.exports = class LobbyManager {
    constructor() {
        this.allNames = new Set();
        this.playersWaitingOnGame = []; // should be only of size 0 - 3
                                        // (if 4, we create a new game and match them together)
    }

    addName(name) {
        this.allNames.add(name);
    }

    deleteName(name) {
        this.allNames.delete(name);
    }

    nameAlreadyExists(name) {
        return this.allNames.has(name);
    }

};
