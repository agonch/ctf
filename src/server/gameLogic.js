const MAX_PERSON_VELOCITY = 5;
const TURRET_SPEED = 2;             // rate in degrees/tick at which turrets rotate, positive
const TURRET_TRIGGER_EPSILON = TURRET_SPEED + 1;   // angle in degrees within target before firing
const TURRET_COOLDOWN = 30;         // number of steps (ticks) to wait before firing again
const BULLET_SPEED = 2;             // speed of bullets fired by turrets
const BULLET_SIZE = 10;             // radius of bullet

/* Consider this a static class, with helper methods, for determining gameState updates */
module.exports = {

    calculateVelocities(vel_x, vel_y, keysPressed) {
        if (keysPressed['W'] && !keysPressed['S']) {
            if (vel_y > -MAX_PERSON_VELOCITY) {
                vel_y -= 2.0;
            }

        }
        else if (keysPressed['S'] && !keysPressed['W']) {
            if (vel_y < MAX_PERSON_VELOCITY) {
                vel_y += 2;
            }
        }
        else {
            if (vel_y > 0) {
                vel_y -= 0.25;
            } else if (vel_y < 0) {
                vel_y += 0.25;
            }
        }

        if (keysPressed['A'] && !keysPressed['D']) {
            if (vel_x > -MAX_PERSON_VELOCITY) {
                vel_x -= 2.0;
            }
        }
        else if (keysPressed['D'] && !keysPressed['A']) {
            if (vel_x < MAX_PERSON_VELOCITY) {
                vel_x += 2.0;
            }
        }
        else {
            if (vel_x > 0) {
                vel_x -= 0.25;
            } else if (vel_x < 0) {
                vel_x += 0.25;
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
            // We go ahead and update the position (for collision detection to detect overlaps).
            // If no collision, we keep this update. Otherwise, collision detection will figure out new position.
            gameState.updatePlayerPosition(id, newPos); // also updates player's bounding box
        });
    },

    // Update bullet position using its velocity
    // Returns an object containing updated bullet states (empty if none)
    tickBullets : function (gameState) {
        // Move each bullet along its path
        Object.keys(gameState.bulletStates).forEach(bulletId => {
            var bullet = gameState.bulletStates[bulletId];
            var angle = bullet.angle * Math.PI/180;
            bullet.x += bullet.speed * Math.cos(angle);
            bullet.y += bullet.speed * Math.sin(angle);

            // update Bullet's boundingBox for collision detection to work
            bullet.boundingBox.pos.x = bullet.x;
            bullet.boundingBox.pos.y = bullet.y;

            // Destroy the bullet if it has moved out of bounds
            if (gameState.isOutOfBounds(bullet.x, bullet.y)) {
                gameState.destroyBullet(bulletId);
            }
        });

        // Check gameState's bulletUpdates for created/destroyed bullets that need to be sent to clients
        var updatedBullets = {/* bulletId --> [action, {created bullet state}] */};
        Object.keys(gameState.bulletUpdates).forEach(bulletId => {
            var action = gameState.bulletUpdates[bulletId];
            var state = null;

            if (action === 'create') {
                state = gameState.bulletStates[bulletId];
            }

            // Map bulletId to a tuple of [action, state]
            var tuple = [action, state];

            updatedBullets[bulletId] = tuple;
        });
        gameState.bulletUpdates = {};   // Clean out the updates map afterwards

        return updatedBullets;
    },

    // Update the turret's angle by a simple AI from each team
    // Returns an object containing updated turret states (empty if none)
    tickTurrets : function (gameState) {
        var updatedStates = {/* turretId --> updated turret state */};

        Object.keys(gameState.turretStates).forEach(turretId => {
            var turret = gameState.turretStates[turretId];
            var updated = false;
            var originalSpeed = turret.speed;

            // Force an initial update to the client
            if (turret.forceInit) {
                updated = true;
                delete turret.forceInit;
            }

            // Turret logic
            // Simple logic allow clients to replicate on their side without constant updating,
            //  just update when the logic should change (behavior state, speed, etc.)
            if (turret.speed === 0) {
                turret.speed = TURRET_SPEED;     // Use default if no speed
            }

            // Decrement firing cooldown if the turret fired recently
            if (turret.cooldown !== undefined) {
                if (turret.cooldown > 0) {
                    turret.cooldown--;
                }
            } else {
                // Add the cooldown property
                turret.cooldown = TURRET_COOLDOWN;
            }

            // Rotate until an enemy player crosses directly in front of its line of sight
            var start = [turret.x + gameState.gameBlockSize/2, turret.y + gameState.gameBlockSize/2];
            var foundTarget = false;
            for (var playerId in gameState.playerPositions) {
                // Skip this player if this turret already spotted a player or this player isn't an enemy
                var enemyPlayer = gameState.getPlayerTeam(playerId) !== turret.team;
                if (!enemyPlayer) {
                    continue;
                }

                // If the turret sees a player, fire a bullet and try to track them by rotating in the player's direction
                var target = gameState.playerPositions[playerId];
                var targetAngle = getAngleBetweenPoints(start, target);
                if (Math.abs(turret.angle - targetAngle) <= TURRET_TRIGGER_EPSILON) {
                    // Rotate towards the spotted player, stopping on them
                    var distance = distanceToAngle(turret.angle, targetAngle);
                    turret.speed = Math.min(Math.abs(distance), TURRET_SPEED) * Math.sign(distance);

                    // Fire a bullet
                    if (turret.cooldown === 0) {
                        // Fire a bullet at the player
                        var angle = turret.angle * Math.PI/180;
                        var tipX = start[0] + gameState.gameBlockSize/2 * Math.cos(angle);  // Fire from the tip of the turret
                        var tipY = start[1] + gameState.gameBlockSize/2 * Math.sin(angle);
                        gameState.createBullet(tipX, tipY, targetAngle, BULLET_SPEED, BULLET_SIZE, turret.team);

                        // Set a cooldown before being able to fire again
                        turret.cooldown = TURRET_COOLDOWN;
                    }

                    // Stop looking for targets
                    foundTarget = true;
                    break;
                }
            }

            // If no longer on a player, ramp up back to max speed
            if (!foundTarget && Math.abs(turret.speed) < TURRET_SPEED) {
                turret.speed = TURRET_SPEED * Math.sign(turret.speed);
            }

            // Rotate
            turret.angle = (turret.angle + turret.speed + 360) % 360;

            // If the turret changed directions, update it to the client
            if (turret.speed !== originalSpeed) {
                updated = true;
            }

            // Finish up by adding the entire turret state to be updated if flagged
            if (updated) {
                updatedStates[turretId] = gameState.turretStates[turretId];
            }
        });

        return updatedStates;
    }
};

// Return angle in degrees from p1 to p2, points given as 2-tuple coordinate
// Range: [0, 360)
function getAngleBetweenPoints(p1 /*[x,y]*/, p2 /*[x,y]*/) {
    var [p1x, p1y] = p1;
    var [p2x, p2y] = p2;

    return (Math.atan2(p2y - p1y, p2x - p1x) * 180 / Math.PI + 360) % 360;
}

// Given a start angle and target angle in degrees [0, 360),
// Return the signed angle distance along the shortest rotation from the start to target
function distanceToAngle(start, target) {
    var diff = target - start;

    var d = Math.abs(diff) % 360;
    var shortestDistance = d > 180 ? 360 - d : d;

    var cw = (diff >= 0 && diff <= 180) || (diff <= -180 && diff >= -360);
    var shortestDirection = cw ? 1 : -1;
    
    return shortestDistance * shortestDirection;
}
