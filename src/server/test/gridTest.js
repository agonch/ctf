var grid = require('../SpatialGrid.js');
var assert = require('assert');

const gridBlockSize = 6;
const Grid = new grid(gridBlockSize); // cell size is 12

var circles = [
    {x: 5, y: 5, radius: gridBlockSize, name: 'should only be in [0,0]'},
    {x: 6, y: 5, radius: gridBlockSize, name: 'should only be in [0,0], [1,0]'},
    {x: 6, y: 6, radius: gridBlockSize, name: 'should only be in [0,0], [1,0], [0,1] [1,1]'},
    {x: 15, y: 15, radius: gridBlockSize/2, name: 'should only be in [1,1]'},
    {x: gridBlockSize*2, y: gridBlockSize*2, radius: gridBlockSize, name: 'should only be in [0,0], [1,0], [0,1] [1,1]'},
    {x: 15, y: gridBlockSize-1, radius: gridBlockSize, name: 'should only be in [0,0], [1,0]'},
    {x: gridBlockSize*3, y: gridBlockSize*2-1, radius: gridBlockSize/2, name: 'should only be in [1,0], [1,1]'}
];

circles.forEach(c => {
    console.log('inserting ', c);
    Grid.insertCircle([c.x, c.y], c.radius, c);
    console.log();
});

console.log(Grid.cells);

