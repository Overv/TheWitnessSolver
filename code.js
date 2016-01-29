// Configuration
var gridWidth = 4;
var gridHeight = 4;

var radius = 88 / Math.max(gridWidth, gridHeight);
var spacing = 800 / (Math.max(gridWidth, gridHeight) + 1);
var horPadding = (800 - spacing * (gridWidth - 1)) / 2;
var verPadding = (800 - spacing * (gridHeight - 1)) / 2;

// Types
var POINT_TYPE = {
    'NORMAL': 0,
    'START': 1,
    'REQUIRED': 2,
    'EXIT': 3
};

var CELL_TYPE = {
    'NONE': 0,
    'BLACK': 1,
    'WHITE': 2
};

// Visual grid definition
var gridEl = $('svg');

var horEdges = [];
var verEdges = [];
var pointTypes = [];
var cellTypes = [];

// X index to X position on visual grid for points
function pointX(x) {
    return horPadding + spacing * x;
}

// Y index to Y position on visual grid for points
function pointY(y) {
    return verPadding + spacing * y;
}

// Set up default grid with all edges and no special points or cells
function initGrid() {
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight; y++) {
            if (!pointTypes[x]) pointTypes[x] = [];
            if (!cellTypes[x]) cellTypes[x] = [];
            if (!horEdges[x]) horEdges[x] = [];
            if (!verEdges[x]) verEdges[x] = [];

            var lastCol = x == gridWidth - 1;
            var lastRow = y == gridHeight - 1;

            pointTypes[x][y] = POINT_TYPE.NORMAL;

            if (!lastCol && !lastRow) {
                cellTypes[x][y] = CELL_TYPE.NONE;
            }

            if (!lastCol) {
                horEdges[x][y] = true;
            }

            if (!lastRow) {
                verEdges[x][y] = true;
            }
        }
    }
}

function horEdgeExists(x, y) {
    if (x < 0 || y < 0 || x >= gridWidth - 1 || y >= gridHeight) return false;
    return horEdges[x][y];
}

function verEdgeExists(x, y) {
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight - 1) return false;
    return verEdges[x][y];
}

// Update visualization of grid
function updateVisualGrid() {
    // Remove old grid
    $('svg').empty();

    addVisualGridCells();
    addVisualGridEdges();

    addVisualGridPoints();

    // Re-render SVG
    $("svg").html($("svg").html());

    // Elements are now ready for adding event handlers
    addGridEventHandlers();
}

function addVisualGridCells() {
    for (var x = 0; x < gridWidth - 1; x++) {
        for (var y = 0; y < gridHeight - 1; y++) {
            var baseEl = $('<rect />')
                .attr('class', 'cell')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('x', pointX(x))
                .attr('y', pointY(y))
                .attr('width', spacing)
                .attr('height', spacing)
                .attr('rx', radius / 2)
                .attr('ry', radius / 2)
                .css('fill', 'rgba(0, 0, 0, 0)')
                .appendTo(gridEl);

            if (cellTypes[x][y] != CELL_TYPE.NONE) {
                var iconEl = baseEl.clone()
                    .attr('x', pointX(x) + spacing / 2 - spacing / 8)
                    .attr('y', pointY(y) + spacing / 2 - spacing / 8)
                    .attr('width', spacing / 4)
                    .attr('height', spacing / 4)
                    .appendTo(gridEl);

                if (cellTypes[x][y] == CELL_TYPE.BLACK) {
                    iconEl.css('fill', 'rgba(0, 0, 0, 0.9)');
                } else {
                    iconEl.css('fill', 'white');
                }
            }
        }
    }
}

function addVisualGridEdges() {
    // Set up horizontal edges
    for (var x = 0; x < gridWidth - 1; x++) {
        for (var y = 0; y < gridHeight; y++) {
            var a = horEdges[x][y] ? '1' : '0';

            $('<rect />')
                .attr('class', 'edge')
                .attr('data-type', 'hor-edge')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('x', pointX(x))
                .attr('y', pointY(y) - radius)
                .attr('width', spacing)
                .attr('height', radius * 2)
                .css('fill', 'rgba(2, 98, 35, ' + a + ')')
                .appendTo(gridEl);
        }
    }

    // Set up vertical edges
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight - 1; y++) {
            var a = verEdges[x][y] ? '1' : '0';

            $('<rect />')
                .attr('class', 'edge')
                .attr('data-type', 'ver-edge')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('x', pointX(x) - radius)
                .attr('y', pointY(y))
                .attr('width', radius * 2)
                .attr('height', spacing)
                .css('fill', 'rgba(2, 98, 35, ' + a + ')')
                .appendTo(gridEl);
        }
    }
}

function addVisualGridPoints() {
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight; y++) {
            // Only render point if there are edges connecting to it (to allow for irregular grid shapes)
            if (!horEdgeExists(x - 1, y) && !horEdgeExists(x, y) && !verEdgeExists(x, y - 1) && !verEdgeExists(x, y)) {
                continue;
            }

            // Create base point for event handling
            var baseEl = $('<circle />')
                .attr('class', 'node')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('cx', pointX(x))
                .attr('cy', pointY(y))
                .attr('r', radius)
                .css('fill', '#026223')
                .appendTo(gridEl);

            // Extend visualization based on special point types
            if (pointTypes[x][y] == POINT_TYPE.START) {
                baseEl.attr('r', radius * 2);
            } else if (pointTypes[x][y] == POINT_TYPE.REQUIRED) {
                var r = radius * 0.8;
                var hr = radius * 0.5;

                var path = '';
                path += 'M ' + (pointX(x) + r) + ' ' + pointY(y);
                path += 'l ' + (-hr) + ' ' + r;
                path += 'h ' + (-r);
                path += 'l ' + (-hr) + ' ' + (-r);
                path += 'l ' + hr + ' ' + (-r);
                path += 'h ' + r;
                path += 'l ' + hr + ' ' + r;

                $('<path />')
                    .attr('class', 'node')
                    .attr('data-x', x)
                    .attr('data-y', y)
                    .css('fill', 'black')
                    .attr('d', path)
                    .appendTo(gridEl);
            } else if (pointTypes[x][y] == POINT_TYPE.EXIT) {
                var ang = 0;

                if (x == 0) ang = 0;
                else if (x == gridWidth - 1) ang = 180;

                if (y == 0) ang = 90;
                else if (y == gridHeight - 1) ang = -90;

                // Diagonally for corner points
                if (x == 0 && y == 0) ang -= 45;
                else if (x == 0 && y == gridHeight - 1) ang += 45;
                else if (x == gridWidth - 1 && y == 0) ang += 45;
                else if (x == gridWidth - 1 && y == gridHeight - 1) ang -= 45;

                var parentEl = $('<g />')
                    .css('transform', 'translate(' + pointX(x) + 'px, ' + pointY(y) + 'px) rotate(' + ang + 'deg) translate(' + -pointX(x) + 'px, ' + -pointY(y) + 'px)')
                    .appendTo(gridEl);

                $('<rect />')
                    .attr('class', 'node')
                    .attr('data-x', x)
                    .attr('data-y', y)
                    .attr('x', pointX(x) - radius * 2)
                    .attr('y', pointY(y) - radius)
                    .attr('width', radius * 2)
                    .attr('height', radius * 2)
                    .css('fill', '#026223')
                    .appendTo(parentEl);

                $('<circle />')
                    .attr('class', 'node')
                    .attr('data-x', x)
                    .attr('data-y', y)
                    .attr('cx', pointX(x) - radius * 2)
                    .attr('cy', pointY(y))
                    .attr('r', radius)
                    .css('fill', '#026223')
                    .appendTo(parentEl);
            }
        }
    }
}

function addGridEventHandlers() {
    $('.cell').click(function() {
        var x = +this.getAttribute('data-x');
        var y = +this.getAttribute('data-y');

        cellTypes[x][y] = (cellTypes[x][y] + 1) % 3;

        updateVisualGrid();
    });

    $('.edge').click(function() {
        var type = this.getAttribute('data-type');
        var x = +this.getAttribute('data-x');
        var y = +this.getAttribute('data-y');
        
        if (type == 'hor-edge') {
            horEdges[x][y] = !horEdges[x][y];
        } else if (type == 'ver-edge') {
            verEdges[x][y] = !verEdges[x][y];
        }

        updateVisualGrid();
    });

    $('.node').click(function() {
        var x = +this.getAttribute('data-x');
        var y = +this.getAttribute('data-y');

        pointTypes[x][y] = (pointTypes[x][y] + 1) % 4;

        // Only outer nodes can be exits
        if (pointTypes[x][y] == POINT_TYPE.EXIT) {
            if (x != 0 && y != 0 && x != gridWidth - 1 && y != gridHeight - 1) {
                pointTypes[x][y] = POINT_TYPE.NORMAL;
            }
        }

        updateVisualGrid();
    });
}

// Encode a graph from the visual grid structure
function encodeGraph() {
    var nodes = [];

    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight; y++) {
            
        }
    }
}

initGrid();
updateVisualGrid();