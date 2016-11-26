var grid = require('../SpatialGrid.js');
var assert = require('assert');
var SAT = require('sat');
var V = SAT.Vector;
var C = SAT.Circle;
var B = SAT.Box;

const gridBlockSize = 6;
const Grid = new grid(gridBlockSize, 20*50, 10*50); // cell size is 12

var circlesTests = [
    {x: 5, y: 5, radius: gridBlockSize, name: 'should only be in [0,0]'},
    {x: 6, y: 5, radius: gridBlockSize, name: 'should only be in [0,0], [1,0]'},
    {x: 6, y: 6, radius: gridBlockSize, name: 'should only be in [0,0], [1,0], [0,1] [1,1]'},

    {x: gridBlockSize*3, y: gridBlockSize*3, radius: gridBlockSize, name: 'should only be [1,1], [0,1], [1,0], [2,1], [1,2] '},

    {x: 15, y: 15, radius: gridBlockSize/2, name: 'should only be in [1,1]'},
    {x: gridBlockSize*2, y: gridBlockSize*2, radius: gridBlockSize, name: 'should only be in [0,0], [1,0], [0,1] [1,1]'},
    {x: 15, y: gridBlockSize-1, radius: gridBlockSize, name: 'should only be in [0,0], [1,0]'},
    {x: gridBlockSize*3, y: gridBlockSize*2-1, radius: gridBlockSize/2, name: 'should only be in [1,0], [1,1]'},

    {x: gridBlockSize*4-2, y: gridBlockSize*2-2, radius: 1, name: 'should only be in [1,0]'},
    {x: gridBlockSize*4-2, y: gridBlockSize*2-2, radius: 2, name: 'should only be in [1,0], [1,1], [2,0], [2,1]'},
    {x: gridBlockSize*4-2, y: gridBlockSize*2-2, radius: 3, name: 'should only be in [1,0], [1,1], [2,0], [2,1]'},
    {x: gridBlockSize*4-2, y: gridBlockSize*2-2, radius: 4, name: 'should only be in [1,0], [1,1], [2,0], [2,1]'}
];

circlesTests.forEach(c => {
    var dynamic = true;
    var circle = new C(new V(c.x, c.y), c.radius);
    Grid.addEntity(dynamic, {boundingBox: circle, name: c.name});
});


Grid.update();
console.log('------------------------------');
console.log();
// console.log(Grid.cellsDynamicEntities);


var wallTests = [
    {x: 0, y: 0, name: 'should be [0,0], [1,0], [0,1], [1,1]'},
    {x: 6, y: 0, name: 'should be [0,0], [1,0], [0,1], [1,1]'},
    {x: 6, y: 6, name: 'should be [0,0], [1,0], [0,1], [1,1]'},
    {x: 0, y: 6, name: 'should be [0,0], [1,0], [0,1], [1,1]'},
    {x: gridBlockSize*4, y: gridBlockSize*2, name: 'should be all cells surrounding cell [2,1]'}
];

wallTests.forEach(wall => {
    var b = {boundingBox: new B(new V(wall.x, wall.y), gridBlockSize*2, gridBlockSize*2), name: wall.name};
    Grid.addEntity(false, b);
});

console.log('----');
Grid._queryForCollisions();