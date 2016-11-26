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
 */

var SAT = require('sat');
var assert = require('assert');
var colors = require('colors');
var _ = require('underscore');
var Vector = SAT.Vector;
var Circle = SAT.Circle;

class SpatialGrid {

    constructor(gameBlockSize) {
        this.cellsDynamicEntities = {};
        this.cellsStaticEntities = {};  // these values must be manually updated (otherwise never change)
        this.cellSize = gameBlockSize * 2;
        // I chose above cell size so that all objects do not overlap more than 4 cells ever
    }

    getCellFromWorldPosition(x, y) {
        y = Math.max(0, y);
        x = Math.max(0, x);
        var cell_x = Math.floor(x / this.cellSize);
        var cell_y = Math.floor(y / this.cellSize);
        return [cell_x, cell_y];
    }


    insertCircle(worldPosition, radius, obj, id) {
        var cellsCircleOverlaps = this.getCellsCircleOverlaps(worldPosition, radius);
        console.log('cellsCircleOverlaps ', cellsCircleOverlaps);
        obj._overlappingCells = cellsCircleOverlaps;
        var center = cellsCircleOverlaps[0];

        // note, center is [x,y] which will be converted to string "x,y" to be used as key in object cells
        if (center in this.cells) {
            this.cells[center].push(id);
        } else {
            this.cells[center] = [id];
        }
    }

    getCellsCircleOverlaps(worldPosition, radius) {
        assert(radius*2 <= this.cellSize, 'cannot have diameter of circle larger than cell size (radius='+radius+' cellsize='+this.cellSize);
        var cellsCircleOverlaps = [];
        var center = this.getCellFromWorldPosition(worldPosition[0], worldPosition[1]);
        cellsCircleOverlaps.push(center);

        var upper = this.getCellFromWorldPosition(worldPosition[0], worldPosition[1] - radius);
        if (!_.isEqual(center, upper)) {
            cellsCircleOverlaps.push(upper);
        }
        var left = this.getCellFromWorldPosition(worldPosition[0] - radius, worldPosition[1]);
        if (!_.isEqual(center, left)) {
            cellsCircleOverlaps.push(left);
        }
        var right = this.getCellFromWorldPosition(worldPosition[0] + radius, worldPosition[1]);
        if (!_.isEqual(center, right)) {
            cellsCircleOverlaps.push(right);
        }
        var down = this.getCellFromWorldPosition(worldPosition[0], worldPosition[1] + radius);
        if (!_.isEqual(center, down)) {
            cellsCircleOverlaps.push(down);
        }

        // check if NW point of circle is in different cell
        if (upper[0] - left[0] === 1 && left[1] - upper[1] === 1) {
            var NW = [left[0], left[1] - 1];
            cellsCircleOverlaps.push(NW);
        }
        // check if NE point of circle is in different cell
        if (right[0] - upper[0] === 1 && right[1] - upper[1] === 1) {
            var NE = [right[0], right[1] - 1];
            cellsCircleOverlaps.push(NE);
        }
        // check SW corner
        if (down[0] - left[0] === 1 && down[1] - left[1] === 1) {
            var SW = [left[0], left[1] + 1];
            cellsCircleOverlaps.push(SW);
        }
        // check SE corner
        if (right[0] - down[0] === 1 && down[1] - right[1] === 1) {
            var SE = [right[0], right[1] + 1];
            cellsCircleOverlaps.push(SE);
        }
        return cellsCircleOverlaps;
    }

    // NOTE: worldPosition must give top left corner
    insertWall(worldPosition, sideLen) {
        assert(sideLen <= this.cellSize / 2 /*same as grid block size*/,
            'implementation only supports walls up to size '+this.cellSize/2);
        /* TODO (if later want to have bigger walls, need to create a function that returns
         *    the cells the wall overlaps (similar to getCellsCircleOverlaps)  */

        var cell = this.getCellFromWorldPosition(worldPosition[0], worldPosition[1]);

        if (cell in this.cellsForWalls) {
            this.cellsForWalls[cell].push(worldPosition);
        } else {
            this.cellsForWalls[cell] = [worldPosition]
        }
    }

    clearGrid() {
        this.cells = {};
    }

}

module.exports = SpatialGrid;

function getIdIndex(cellList, id) {
    for (var i = 0; i < cellList.length; i++) {
        if (cellList[i].id === id) {
            return i;
        }
    }
    return -1;
}