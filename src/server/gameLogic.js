const MAX_VEL = 10.0;

/* Consider this a static class, with helper methods, for determining gameState updates */
module.exports = {

    calculateVelocities(vel_x, vel_y, keysPressed) {
        if (keysPressed['W'] && !keysPressed['S']) {
            if (vel_y > -MAX_VEL) {
                vel_y -= 2.0;
            }

        }
        else if (keysPressed['S'] && !keysPressed['W']) {
            if (vel_y < MAX_VEL) {
                vel_y += 2;
            }
        }
        else {
            if (vel_y > 0) {
                vel_y-=1.0;
            } else if (vel_y < 0) {
                vel_y+=1.0;
            }
        }

        if (keysPressed['A'] && !keysPressed['D']) {
            if (vel_x > -MAX_VEL) {
                vel_x -= 2.0;
            }
        }
        else if (keysPressed['D'] && !keysPressed['A']) {
            if (vel_x < MAX_VEL) {
                vel_x += 2.0;
            }
        }
        else {
            if (vel_x > 0) {
                vel_x-=1.0;
            } else if (vel_x < 0) {
                vel_x+=1.0;
            }
        }

        return [vel_x, vel_y];
    },

    // Using their current velocities, update player positions
    tickPlayerPositions : function (gameState) {
        Object.keys(gameState.playerPositions).forEach(id => {

            var [vel_x, vel_y] = gameState.playerVelocity[id];
            var keysPressed = gameState.pressed[id];
            var newVelocities = this.calculateVelocities(vel_x, vel_y, keysPressed);
            gameState.playerVelocity[id] = newVelocities;
            var pos = gameState.getPlayerPosition(id);
            var vel = gameState.playerVelocity[id];
            var newPos = [];
            newPos[0] = pos[0] + vel[0];
            newPos[1] = pos[1] + vel[1];
            gameState.updatePlayerPosition(id, newPos);
        });
    },

    tickBullets : function (gameState) {
        // for later
    }
};
