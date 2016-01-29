// Configuration
var gridWidth = 3;
var gridHeight = 3;

var radius = 88 / Math.max(6, Math.max(gridWidth, gridHeight));
var spacing = 800 / (Math.max(gridWidth, gridHeight) + 1);
var horPadding = (800 - spacing * (gridWidth - 1)) / 2;
var verPadding = (800 - spacing * (gridHeight - 1)) / 2;

// Types
var NODE_TYPE = {
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
var nodeTypes = [];
var cellTypes = [];

// Used for keeping track of visited nodes with a Set
// This requires that a given X,Y node is always the exact same JS object
var nodePool = [];

function node(x, y) {
    if (!nodePool[x]) nodePool[x] = [];
    if (!nodePool[x][y]) nodePool[x][y] = {x: x, y: y};

    return nodePool[x][y];
}

// X index to X position on visual grid for nodes
function nodeX(x) {
    return horPadding + spacing * x;
}

// Y index to Y position on visual grid for nodes
function nodeY(y) {
    return verPadding + spacing * y;
}

// Set up default grid with all edges and no special nodes or cells
function initGrid() {
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight; y++) {
            if (!nodeTypes[x]) nodeTypes[x] = [];
            if (!cellTypes[x]) cellTypes[x] = [];
            if (!horEdges[x]) horEdges[x] = [];
            if (!verEdges[x]) verEdges[x] = [];

            var lastCol = x == gridWidth - 1;
            var lastRow = y == gridHeight - 1;

            nodeTypes[x][y] = NODE_TYPE.NORMAL;

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
                .attr('x', nodeX(x))
                .attr('y', nodeY(y))
                .attr('width', spacing)
                .attr('height', spacing)
                .attr('rx', radius / 2)
                .attr('ry', radius / 2)
                .css('fill', 'rgba(0, 0, 0, 0)')
                .appendTo(gridEl);

            if (cellTypes[x][y] != CELL_TYPE.NONE) {
                var iconEl = baseEl.clone()
                    .attr('x', nodeX(x) + spacing / 2 - spacing / 8)
                    .attr('y', nodeY(y) + spacing / 2 - spacing / 8)
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
                .attr('x', nodeX(x))
                .attr('y', nodeY(y) - radius)
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
                .attr('x', nodeX(x) - radius)
                .attr('y', nodeY(y))
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
            // Only render node if there are edges connecting to it (to allow for irregular grid shapes)
            if (!horEdgeExists(x - 1, y) && !horEdgeExists(x, y) && !verEdgeExists(x, y - 1) && !verEdgeExists(x, y)) {
                continue;
            }

            // Create base node for event handling
            var baseEl = $('<circle />')
                .attr('class', 'node')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('cx', nodeX(x))
                .attr('cy', nodeY(y))
                .attr('r', radius)
                .css('fill', '#026223')
                .appendTo(gridEl);

            // Extend visualization based on special node types
            if (nodeTypes[x][y] == NODE_TYPE.START) {
                baseEl.attr('r', radius * 2);
            } else if (nodeTypes[x][y] == NODE_TYPE.REQUIRED) {
                var r = radius * 0.8;
                var hr = radius * 0.5;

                var path = '';
                path += 'M ' + (nodeX(x) + r) + ' ' + nodeY(y);
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
            } else if (nodeTypes[x][y] == NODE_TYPE.EXIT) {
                var ang = 0;

                if (x == 0) ang = 0;
                else if (x == gridWidth - 1) ang = 180;

                if (y == 0) ang = 90;
                else if (y == gridHeight - 1) ang = -90;

                // Diagonally for corner nodes
                if (x == 0 && y == 0) ang -= 45;
                else if (x == 0 && y == gridHeight - 1) ang += 45;
                else if (x == gridWidth - 1 && y == 0) ang += 45;
                else if (x == gridWidth - 1 && y == gridHeight - 1) ang -= 45;

                var parentEl = $('<g />')
                    .css('transform', 'translate(' + nodeX(x) + 'px, ' + nodeY(y) + 'px) rotate(' + ang + 'deg) translate(' + -nodeX(x) + 'px, ' + -nodeY(y) + 'px)')
                    .appendTo(gridEl);

                $('<rect />')
                    .attr('class', 'node')
                    .attr('data-x', x)
                    .attr('data-y', y)
                    .attr('x', nodeX(x) - radius * 2)
                    .attr('y', nodeY(y) - radius)
                    .attr('width', radius * 2)
                    .attr('height', radius * 2)
                    .css('fill', '#026223')
                    .appendTo(parentEl);

                $('<circle />')
                    .attr('class', 'node')
                    .attr('data-x', x)
                    .attr('data-y', y)
                    .attr('cx', nodeX(x) - radius * 2)
                    .attr('cy', nodeY(y))
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

        nodeTypes[x][y] = (nodeTypes[x][y] + 1) % 4;

        // Only outer nodes can be exits
        if (nodeTypes[x][y] == NODE_TYPE.EXIT) {
            if (x != 0 && y != 0 && x != gridWidth - 1 && y != gridHeight - 1) {
                nodeTypes[x][y] = NODE_TYPE.NORMAL;
            }
        }

        updateVisualGrid();
    });
}

function solve() {
    // Search for solution using branch and bound algorithm
    // TODO: Pick shortest solution / solution with least corners
    var path = findSolution();

    if (path) {
        var sol = '';

        for (var p of path) {
            sol += '(' + p.x + ', ' + p.y + '), ';
        }

        sol = sol.substr(0, sol.length - 2);

        console.log('solution: ' + sol);
    } else {
        console.log('no solution');
    }
}

function getNextNodes(n, visited) {
    var candidates = [];

    // Select every connected node that has not yet been visited
    if (horEdgeExists(n.x, n.y) && !visited.has(node(n.x + 1, n.y))) {
        candidates.push(node(n.x + 1, n.y));
    }

    if (horEdgeExists(n.x - 1, n.y) && !visited.has(node(n.x - 1, n.y))) {
        candidates.push(node(n.x - 1, n.y));
    }

    if (verEdgeExists(n.x, n.y) && !visited.has(node(n.x, n.y + 1))) {
        candidates.push(node(n.x, n.y + 1));
    }

    if (verEdgeExists(n.x, n.y - 1) && !visited.has(node(n.x, n.y - 1))) {
        candidates.push(node(n.x, n.y - 1));
    }

    return candidates;
}

function checkSolution(path) {
    // Check if all required nodes are part of the path
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight; y++) {
            if (nodeTypes[x][y] == NODE_TYPE.REQUIRED) {
                if (path.indexOf(node(x, y)) == -1) {
                    return false;
                }
            }
        }
    }

    return true;
}

function findSolution(path, visited) {
    if (!path || path.length == 0) {
        // If this is the first call, recursively try every starting node
        for (var x = 0; x < gridWidth; x++) {
            for (var y = 0; y < gridHeight; y++) {
                if (nodeTypes[x][y] == NODE_TYPE.START) {
                    var fullPath = findSolution([node(x, y)], new Set([node(x, y)]));

                    if (fullPath) {
                        return fullPath;
                    }
                }
            }
        }

        return false;
    } else {
        var cn = path[path.length - 1];

        // If we're at an exit node, check if the current path is a valid solution
        if (nodeTypes[cn.x][cn.y] == NODE_TYPE.EXIT && checkSolution(path)) {
            return path;
        }

        // Try all possibles routes from the latest node
        var candidates = getNextNodes(cn, visited);

        for (var n of candidates) {
            var newPath = path.slice();
            newPath.push(n);

            var newVisited = new Set(visited);
            newVisited.add(n);

            var fullPath = findSolution(newPath, newVisited);

            if (fullPath) {
                return fullPath;
            }
        }

        return false;
    }
}

initGrid();

// Load sample puzzle (starting area)
nodeTypes[0][2] = NODE_TYPE.START;
nodeTypes[2][0] = NODE_TYPE.EXIT;
nodeTypes[0][0] = NODE_TYPE.REQUIRED;
nodeTypes[2][2] = NODE_TYPE.REQUIRED;

updateVisualGrid();

$('#solve-button').click(solve);