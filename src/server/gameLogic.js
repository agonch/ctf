const VELOCITY = 5;

/* Consider this a static class, with helper methods, for determining gameState updates */
module.exports = {

    calculateVelocities(vel_x, vel_y, keysPressed) {
        if (keysPressed['W'] && !keysPressed['S']) {
            vel_y = -VELOCITY;
        }
        else if (keysPressed['S'] && !keysPressed['W']) {
            vel_y = VELOCITY;
        }
        else {
            vel_y = 0;
        }

        if (keysPressed['A'] && !keysPressed['D']) {
            vel_x = -VELOCITY;
        }
        else if (keysPressed['D'] && !keysPressed['A']) {
            vel_x = VELOCITY;
        }
        else {
            vel_x = 0;
        }

        return [vel_x, vel_y];
    },

    // Using their current velocities, update player positions
    tickPlayerPositions : function (gameState) {
        Object.keys(gameState.playerPositions).forEach(id => {
            var pos = gameState.getPlayerPosition(id);
            var vel = gameState.playerVelocity[id];
            pos[0] += vel[0];
            pos[1] += vel[1];
            gameState.updatePlayerPosition(id, pos);
        });
    },

    tickBullets : function (gameState) {
        // for later
    }
};
