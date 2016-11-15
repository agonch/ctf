const MAX_VELOCITY = 20;
const MIN_VELOCITY = 3;

/* Consider this a static class, with helper methods, for determining gameState updates */
module.exports = {

    calculateNewPosition : function (curr_velocity_x, curr_velocity_y, x, y, keysPressed) {
        if (keysPressed['W']) {
            y-=3;
        }
        if (keysPressed['A']) {
            x-=3;
        }
        if (keysPressed['S']) {
            y+=3;
        }
        if (keysPressed['D']) {
            x+=3;
        }
    }
};