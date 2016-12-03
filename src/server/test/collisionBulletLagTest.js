
function testBoundingBox(gameState, gameID)  {
    // ONLY USED FOR TESTING COLLISION DETECTION
    // This function emits all bounding boxes of all objects to client

    var allBoundingBoxesByObjectType = {'wall': [], 'bullet': [], 'player': [], 'turret': []};
    gameState.Grid.dynamicEntities.forEach(entity => {
        allBoundingBoxesByObjectType[entity.objectType].push(entity);
    });
    gameState.Grid.staticEntities.forEach(entity => {
        allBoundingBoxesByObjectType[entity.objectType].push(entity);
    });
    io.to(gameID).emit('boundingBoxTest', allBoundingBoxesByObjectType);
}

function drawBoundingBoxes(entities) {
    // entities is {'wall': [], 'bullet': [], 'player': [], 'turret': []}

    // draw player bounding boxes
    entities['player'].forEach(function(player) {
        GAME_VIEW.context.beginPath();
        var pos = player.boundingBox.pos;
        var [x, y] = GAME_VIEW._getLocalCoords(pos.x, pos.y);
        var radius = player.boundingBox.r;
        GAME_VIEW.context.arc(x, y, radius, 0, 2 * Math.PI);
        GAME_VIEW.context.fillStyle = 'green';
        GAME_VIEW.context.fill();
        GAME_VIEW.context.stroke();
    });

    // draw bullet bounding boxes
    entities['bullet'].forEach(function (bullet) {
        var pos = bullet.boundingBox.pos;
        var [localX, localY] = GAME_VIEW._getLocalCoords(pos.x, pos.y);
        GAME_VIEW.context.beginPath();
        GAME_VIEW.context.arc(localX, localY, bullet.size /* radius */, 0, 2*Math.PI);
        GAME_VIEW.context.fillStyle = 'green';
        GAME_VIEW.context.fill();
        GAME_VIEW.context.stroke();
    });

    entities['wall'].forEach(function (wall) {
        var pos = wall.boundingBox.pos;
        var [x, y] = GAME_VIEW._getLocalCoords(pos.x, pos.y);
        GAME_VIEW.context.fillStyle = 'green';
        GAME_VIEW.context.fillRect(x, y, wall.boundingBox.w, wall.boundingBox.h);
    });
}
