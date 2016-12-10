module.exports = class Bot {

    constructor(name) {
        this.namesToTeam = {};
        this.nameToPosition = {};
        this.name = "_bot_" + name;
        this.keysPressed = {'W': false, 'A': false, 'S': false, 'D': false};
    }

    initialize(startData) {
        // Initialize game values
        const {spawnPoint, boardSize, gridSize, playerPositions, playerName, namesToTeams, objectPositions,
            turretStates, bulletStates, validObjectTypes, maxWallHealth, maxPlayerHealth} = startData;
        this.nameToPosition[this.name] = spawnPoint;
        this.namesToTeam = namesToTeams;
    }

    removePlayer(name) {
        delete this.namesToTeam[name];
        delete this.nameToPosition[name];
    }

    addPlayer(name, pos, team) {
        // set player team
        this.namesToTeam[name] = team;
        // set player position
        this.nameToPosition[name] = pos;
    }

    setupBotKeyListenerAI(socket) {
        const numToLetter = {0: 'W', 1: 'A', 2: 'S', 3: 'D'};
        const nextKeyTimeInterval = 100;

        setInterval(() => {
            var nearestPlayer = this.getNearestPlayer();
            if (nearestPlayer === undefined)
                return; // no enemies yet

            var bot_pos = this.nameToPosition[this.name];
            var nearestEnemyPos = this.nameToPosition[nearestPlayer];

            this.keysPressed = {'W': false, 'A': false, 'S': false, 'D': false};
            if (nearestEnemyPos[0] < bot_pos[0]) {
                this.keysPressed['A'] = true;
            } else {
                this.keysPressed['D'] = true;
            }
            if (nearestEnemyPos[1] < bot_pos[1]) {
                this.keysPressed['W'] = true;
            } else {
                this.keysPressed['S'] = true;
            }
            // const randomLetter = numToLetter[Math.floor(Math.random() * 4)];
            // this.keysPressed[randomLetter] = !this.keysPressed[randomLetter];
            // console.log(this.keysPressed);

            socket.emit('updateKeys', this.keysPressed);
        }, nextKeyTimeInterval);
    }

    getNearestPlayer() {
        var closestPlayer;
        var closestDistance = Number.MAX_SAFE_INTEGER;
        var bot_pos = this.nameToPosition[this.name];

        function playerDistance([x1, y1], [x2, y2]) {
            return Math.hypot(x2 - x1, y2 - y1);
        }

        Object.keys(this.nameToPosition).forEach(name => {
            if (this.namesToTeam[this.name] !== this.namesToTeam[name]) {
                // some enemy position
                var enemy_pos = this.nameToPosition[name];
                // console.log(bot_pos, enemy_pos);
                var distance = playerDistance(bot_pos, enemy_pos);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPlayer = name;
                }
            }
        });

        return closestPlayer;
    }

};
