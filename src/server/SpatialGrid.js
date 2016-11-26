/*
 * Simple Spatial Grid of the game board.
 *
 * Spatial Partitioning is the process of dividing a space into disjoint, non-overlapping regions.
 * A single point can lie in exactly one the regions (called cells). An object (circle/square) can
 * occupy multiple adjacent cells (but the number of cells an object overlaps can be minimized by
 * increasing a cell's size (decreasing partitioning of space).
 *
 * In this case, a cell = 4 game grid blocks (cell height/width = GameBlockSize*2)
 * Once all objects are mapped to their cells, you can do efficient collision detection. If two
 * circles/squares/bullets are not within the same cell, there is no way they could collide.
 * Collision Detection is the biggest bottleneck server-side.
 *
 * Grid state has to be updated every frame. This improves things because
 * collision detection reduces to comparing a given object to the other object within its cell,
 * not all objects.
 *
 * End Result --> iterate over cells, not over all entities.
 *
 * References:
 *  - http://buildnewgames.com/broad-phase-collision-detection/
 *  - https://github.com/jriecken/sat-js
 */

var SAT = require('sat');
var assert = require('assert');
var colors = require('colors');
var _ = require('underscore');
var Vector = SAT.Vector;
var Circle = SAT.Circle;
var Box = SAT.Box; // Note, Boxes are actually rectangles (have width/height)

class SpatialGrid {
    // Since SAT

    constructor(gameBlockSize, boardWidth, boardHeight) {
        this.cellsDynamicEntities = {};
        this.cellsStaticEntities = {};  // these values must be manually updated (otherwise never change)
        this.cellSize = gameBlockSize * 2;
        // I chose above cell size so that all objects do not overlap more than 4 cells ever

        this.staticEntities = [];
        this.dynamicEntities = [];
        this.maxCell = this.getCellFromWorldPosition(boardWidth - 1, boardHeight - 1); // right most cell
        // TODO make sure when adding entites they do not go above or right of maxCell
        this._hashIdCounter = 0; // for given entities their unique ID
    }

    addEntity(dynamic, entity) {
        // check required property (all entities need a bounding box (a SAT shape) for me to detect collisions)
        _.has(entity, 'boundingBox');
        if ((!entity.boundingBox instanceof Circle) || (!entity.boundingBox instanceof Box)) {
            throw new Error("For now Grid only supports circle and box collision detection");
        }
        entity._hashId = this._hashIdCounter++;

        if (dynamic) {
            this.dynamicEntities.push(entity);
        } else {
            this.staticEntities.push(entity);
            var cellsOverlaps;
            var boundingBox = entity.boundingBox;
            if (boundingBox instanceof Circle) {
                cellsOverlaps = this.getCellsCircleOverlaps(boundingBox.pos, boundingBox.r);
            } else {
                // if here, i will assume boundingBox is of shape SAT.Box
                cellsOverlaps = this.getCellsBoxOverlaps(boundingBox.pos.x, boundingBox.pos.y, boundingBox.w, boundingBox.h);
                console.log('for ', boundingBox, ', cells box overlaps = ', cellsOverlaps);
            }
            cellsOverlaps.forEach(cell => {
                if (!(cell in this.cellsStaticEntities)) {
                    this.cellsStaticEntities[cell] = [];
                }
                this.cellsStaticEntities[cell].push(entity);
            });
        }
    }

    getCellFromWorldPosition(x, y) {
        y = Math.max(0, y);
        x = Math.max(0, x);
        var cell_x = Math.floor(x / this.cellSize);
        var cell_y = Math.floor(y / this.cellSize);
        return [cell_x, cell_y];
    }


    // Populate the dynamic entities grid.
    update() {
        this.cellsDynamicEntities = {};
        for (var i = 0; i < this.dynamicEntities.length; i++) {
            const entity = this.dynamicEntities[i];
            // insert this entity into the cells it overlaps

            var boundingBox = entity.boundingBox;
            var cellsOverlaps;
            if (boundingBox instanceof Circle) {
                cellsOverlaps = this.getCellsCircleOverlaps(boundingBox.pos.x, boundingBox.pos.y, boundingBox.r);
            } else {
                cellsOverlaps = this.getCellsBoxOverlaps(boundingBox.pos.x, boundingBox.pos.y, boundingBox.w, boundingBox.h);
            }
            console.log('for ', boundingBox, ', cellsOverlaps = ', cellsOverlaps);
            cellsOverlaps.forEach(cell => {
                if (!(cell in this.cellsDynamicEntities)) {
                    this.cellsDynamicEntities[cell] = [];
                }
                this.cellsDynamicEntities[cell].push(entity);
            });
        }
    }

    getCellsBoxOverlaps(x, y, w, h) {
        assert(w <= this.cellSize, 'cannot have width > cell size');
        assert(h <= this.cellSize, 'cannot have height > cell size');

        // Note, for SAT.Box, pos is the bottom-left coordinate (smalles x and smallest y value)
        var cellOverlaps = [];
        var bottomLeft = this.getCellFromWorldPosition(x, y);
        var bottomRight = this.getCellFromWorldPosition(x + w, y);
        var topLeft = this.getCellFromWorldPosition(x, y + h);
        var topRight = this.getCellFromWorldPosition(x + w, y + h);

        cellOverlaps.push(bottomLeft);
        // consider topLeft
        if (!_.isEqual(bottomLeft, topLeft)) {
            cellOverlaps.push(topLeft);
        }
        // consider topRight
        if (!_.isEqual(bottomLeft, topRight) && !_.isEqual(topLeft, topRight)) {
            cellOverlaps.push(topRight);
        }
        // consider bottomRight
        if (!_.isEqual(bottomLeft, bottomRight) && !_.isEqual(topLeft, bottomRight) && !_.isEqual(topRight, bottomRight)) {
            cellOverlaps.push(bottomRight);
        }

        // check if box is sitting right on left edge of cell (must also add then to left cell)
        var leftCell = this.getCellFromWorldPosition(x-1, y);
        if (!_.isEqual(leftCell, bottomLeft)) {
            cellOverlaps.push(leftCell);
        }
        // check if box is sitting right on bottom edge of cell (must also add then bottom cell)
        var bottomCell = this.getCellFromWorldPosition(x, y-1);
        if (!_.isEqual(bottomCell, bottomLeft)) {
            cellOverlaps.push(bottomCell);
        }
        // check if box is sitting in bottom left corner (must add cell SW of us)
        if (x >= this.cellSize && (x % this.cellSize === 0) &&
            y >= this.cellSize && (y % this.cellSize === 0)) {
            var SW_cell = this.getCellFromWorldPosition(x-1, y-1);
            cellOverlaps.push(SW_cell);
        }
        // TODO  do same thing for top left (NW) and bottom right (SE) corners

        return cellOverlaps;
    }

    getCellsCircleOverlaps(x, y, radius) {
        assert(radius*2 <= this.cellSize, 'cannot have diameter of circle larger than cell size (radius='+radius+' cellsize='+this.cellSize);
        var cellsCircleOverlaps = [];
        var center = this.getCellFromWorldPosition(x, y);
        cellsCircleOverlaps.push(center);

        var upper = this.getCellFromWorldPosition(x, y + radius);
        if (!_.isEqual(center, upper)) {
            cellsCircleOverlaps.push(upper);
        }
        var left = this.getCellFromWorldPosition(x - radius, y);
        if (!_.isEqual(center, left)) {
            cellsCircleOverlaps.push(left);
        }
        var right = this.getCellFromWorldPosition(x + radius, y);
        if (!_.isEqual(center, right)) {
            cellsCircleOverlaps.push(right);
        }
        var down = this.getCellFromWorldPosition(x, y - radius);
        if (!_.isEqual(center, down)) {
            cellsCircleOverlaps.push(down);
        }

        if (cellsCircleOverlaps.length === 3) {
            // there is some corner point of circle overlapping with cell (find last adjacent cell)

            // check if NW point of circle is in different cell
            if (upper[0] - left[0] === 1 && upper[1] - left[1] === 1) {
                var NW = [left[0], left[1] + 1];
                cellsCircleOverlaps.push(NW);
            }
            // check if NE point of circle is in different cell
            if (right[0] - upper[0] === 1 && upper[1] - right[1] === 1) {
                var NE = [right[0], right[1] + 1];
                cellsCircleOverlaps.push(NE);
            }
            // check SW corner
            if (down[0] - left[0] === 1 && left[1] - down[1] === 1) {
                var SW = [left[0], left[1] - 1];
                cellsCircleOverlaps.push(SW);
            }
            // check SE corner
            if (right[0] - down[0] === 1 && right[1] - down[1] === 1) {
                var SE = [right[0], right[1] - 1];
                cellsCircleOverlaps.push(SE);
            }
        }
        return cellsCircleOverlaps;
    }

    _queryForCollisions() {
        const checked = {};
        const cells = Object.keys(this.cellsDynamicEntities);
        for (var i = 0; i < cells.length; i++) {
            var entities = this.cellsDynamicEntities[cells[i]];
            if (cells[i] in this.cellsStaticEntities) {
                entities = entities.concat(this.cellsStaticEntities[cells[i]]);
            }
            // for every object in this cell
            for (var ent_i = 0; ent_i < entities.length; ent_i++) {
                const entityA = entities[ent_i];
                // for every other object in the same cell
                for (var ent_j = ent_i + 1; ent_j < entities.length; ent_j++) {
                    const entityB = entities[ent_j];
                    var hashA = entityA._hashId + ':' + entityB._hashId;
                    var hashB = entityB._hashId + ':' + entityA._hashId;
                    if (!checked[hashA] && !checked[hashB]) {
                        checked[hashA] = checked[hashB] = true;
                        this._detectCollision(entityA, entityB);
                    }
                }
            }
        }
    }

    _detectCollision(entityA, entityB) {
        var boundingBoxA = entityA.boundingBox;
        var boundingBoxB = entityB.boundingBox;
        var A_isCircle = boundingBoxA instanceof Circle;
        var B_isCircle = boundingBoxB instanceof Circle;
        var collided;

        if (A_isCircle && B_isCircle) {
            collided = SAT.testCircleCircle(boundingBoxA, boundingBoxB);
        } else if (!A_isCircle && B_isCircle) {
            collided = SAT.testPolygonCircle(boundingBoxA.toPolygon(), boundingBoxB);
        } else if (A_isCircle && !B_isCircle) {
            collided = SAT.testPolygonCircle(boundingBoxB.toPolygon(), boundingBoxA);
        } else {
            collided = SAT.testPolygonPolygon(boundingBoxA.toPolygon(), boundingBoxB.toPolygon());
        }
        console.log(entityA, ' and ', entityB, ' collided ? -->', collided);
    }
}

module.exports = SpatialGrid;
