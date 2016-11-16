const VELOCITY = 5; // position units per tick

/* Consider this a static class, with helper methods, for determining gameState updates */
module.exports = {

    calculateNewPosition : function (x, y, keysPressed) {
        if (keysPressed['W']) {
            y -= VELOCITY;
        }
        if (keysPressed['A']) {
            x -= VELOCITY;
        }
        if (keysPressed['S']) {
            y += VELOCITY;
        }
        if (keysPressed['D']) {
            x += VELOCITY;
        }

        return [x, y];
    }
};
