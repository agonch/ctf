/* Game state for two teams, of 4 players */

// Constants
const MAX_PLAYERS_PER_TEAM = 4;

/*
 * NOTE: 2 teams, one on left side, and one on right side.
 */
module.exports = class GameState {

    constructor() {
        // Player values
        this.playerPositions = {};
        this.playerNames = {/* id --> name */};
        this.playerNums = {/* id --> player # */}; // used to determine what sector of map to place them in
        this.playerVelocity = {};

        // Default values on start
        this.defaultPlayerSize = 50;
        this.defaultBoardSize = [800, 800];
        var [b_w, b_h] = this.defaultBoardSize;
        this.defaultSpawnPointsTeamLeft = {
            'Player1': [b_w/4,   b_h/4],
            'Player2': [b_w*3/4, b_h/4],
            'Player3': [b_w/4,   b_h*3/4],
            'Player4': [b_w*3/4, b_h*3/4]
        };
        this.defaultSpawnPointsTeamLeft = [
            [this.]
        ];
        this.defaultSpawnPointsTeamRight = [
            [b_w - this.defaultPlayerSize*2, b_h - this.defaultPlayerSize*2],
            [b_w*3/4, b_h/4]
        ];
        for (var player_i = 1; player_i <= MAX_PLAYERS_PER_TEAM; player_i++) {
            this.defaultSpawnPointsTeamLeft['Player' + player_i] = [b_w*3/4, b_h / 4];
        }
        this.defaultPlayerSize = 50;
    }

    numPlayersPresent() {
        return Object.keys(this.playerNums).length;
    }

    addPlayer(id, name) {
        if (this.numPlayersPresent() >= MAX_PLAYERS) {
            // throw new Error("Can't have more than %d players.", MAX_PLAYERS); TODO ignore for now
                    // to allow more players
        }
        var playerNum = this.numPlayersPresent() + 1;
        // TODO remove next loop to restric to only 4 players
        while (playerNum > 4) {
            playerNum -= 4;
        }
        this.playerNums[id] = playerNum;
        this.playerPositions[id] = this.defaultSpawnPoints["Player" + this.playerNums[id]];
        this.playerNames[id] = name;
        this.playerVelocity[id] = [0, 0];
    }

    removePlayer(id) {
        delete this.playerPositions[id];
        delete this.playerNames[id];
        delete this.playerNums[id];
        delete this.playerVelocity[id];
    }

    updatePlayerPosition(id, pos) {
        var x = pos[0];
        var y = pos[1];

        if(pos[0] < 0) {
            x = 0;
        } else if(pos[0] > this.defaultBoardSize[0]) {
            x = this.defaultBoardSize[0];
        }

        if(pos[1] < 0) {
            y = 0;
        } else if(pos[1] > this.defaultBoardSize[1]) {
            y = this.defaultBoardSize[1];
        }

        this.playerPositions[id] = [x, y];
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

    getAllPlayers() {
        var nameToPos = {};
        var nameToPlayerNum = {};
        Object.keys(this.playerPositions).forEach(id => {
            var name = this.playerNames[id];
            nameToPos[name] = this.playerPositions[id];
            nameToPlayerNum[name] = this.playerNums[id];
        });
        return [nameToPos, nameToPlayerNum];
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