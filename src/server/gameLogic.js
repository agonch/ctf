const VELOCITY = 5;
const TURRET_SPEED = 2;             // rate in degrees/tick at which turrets rotate
const TURRET_TRIGGER_EPSILON = 1;   // angle in degrees within target before firing
const TURRET_COOLDOWN = 10;         // number of steps (ticks) to wait before firing again

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
    },

    // Update the turret's angle by a simple AI from each team
    // Returns an object containing updated turret states (empty if none)
    tickTurrets : function (gameState) {
        var updatedStates = {/* turretId --> updated turret state */};

        Object.keys(gameState.turretState).forEach(turretId => {
            var turret = gameState.turretState[turretId];
            var updated = false;

            // Force an initial update to the client
            if (turret.forceInit) {
                updated = true;
                delete gameState.turretState[turretId].forceInit;
            }

            // Turret logic
            // Simple logic allow clients to replicate on their side without constant updating,
            //  just update when the logic should change (behavior state, speed, etc.)
            if (turret.speed === 0) {
                updated = true;
                turret.speed = TURRET_SPEED;     // Use default if no speed
                gameState.turretState[turretId].speed = turret.speed;
            }

            // Decrement firing cooldown if necessary
            if (turret.cooldown && turret.cooldown > 0) {
                turret.cooldown--;
            }

            // Rotate counter-clockwise if no tracked player
            if (!(turret.trackedPlayer && gameState.playerPositions[trackedPlayer])) {
                gameState.turretState[turretId].angle = (turret.angle + turret.speed + 360) % 360;
            } else {
                // Otherwise, use a simple AI to rotate towards the tracked player
                var start = [turret.x, turret.y];
                var target = gameState.playerPositions[trackedPlayer];
                var targetAngle = getAngleBetweenPoints(start, target);
                turret.angle = stepToAngle(start, target, turret.speed);

                // Fire a bullet
                if (Math.abs(turret.angle - targetAngle) <= TURRET_TRIGGER_EPSILON) {
                    if (turret.cooldown === 0) {
                        // TODO: Fire a bullet in the angle

                        // Set a cooldown before being able to fire again
                        turret.cooldown = TURRET_COOLDOWN;
                        gameState.turretState[turretId].cooldown = turret.cooldown;
                    }
                }
            }

            // Finish up by adding the entire turret state to be updated
            if (updated) {
                updatedStates[turretId] = gameState.turretState[turretId];
            }
        });

        return updatedStates;
    }
};

// Return angle in degrees from p1 to p2, points given as 2-tuple coordinate
function getAngleBetweenPoints(p1 /*[x,y]*/, p2 /*[x,y]*/) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
}

// Given a step size, increment shortest route from start angle to target angle, in degrees
function stepToAngle(start, target, step) {
    var angle = start;
    if (Math.abs(target - angle) <= 180) {
        // Rotate clockwise
        angle += step;
    } else {
        // Rotate counter-clockwise
        angle -= step;
    }

    angle = (angle + 360) % 360;
    return angle;
}