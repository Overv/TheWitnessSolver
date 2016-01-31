// Configuration
var gridWidth = 4;
var gridHeight = 4;

var radius;
var spacing;
var horPadding;
var verPadding;
calculateMetrics();

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
    'WHITE': 2,
    'TETRIS': 3
};

// Visual grid definition
var gridEl = $('svg');

var horEdges = [];
var verEdges = [];
var nodeTypes = [];
var cellTypes = [];
var cellTetrisLayouts = [];
var cellTetrisAreas = [];
var cellTetrisAnchors = [];

var viewingSolution = false;
var highlightedNodes = new Set();
var highlightedHorEdges = new Set();
var highlightedVerEdges = new Set();

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
        nodeTypes[x] = [];
        cellTypes[x] = [];
        cellTetrisLayouts[x] = [];
        cellTetrisAreas[x] = [];
        cellTetrisAnchors[x] = [];
        horEdges[x] = [];
        verEdges[x] = [];

        for (var y = 0; y < gridHeight; y++) {
            var lastCol = x == gridWidth - 1;
            var lastRow = y == gridHeight - 1;

            nodeTypes[x][y] = NODE_TYPE.NORMAL;

            if (!lastCol && !lastRow) {
                cellTypes[x][y] = CELL_TYPE.NONE;

                cellTetrisLayouts[x][y] = [];
                for (var xx = 0; xx < 4; xx++) {
                    cellTetrisLayouts[x][y][xx] = [];
                    for (var yy = 0; yy < 4; yy++) {
                        cellTetrisLayouts[x][y][xx][yy] = true;
                    }
                }

                cellTetrisAreas[x][y] = 16;
                cellTetrisAnchors[x][y] = [0, 0];
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

// Recalculate the area and top-left anchor of the tetris layout in cell (x, y)
function updateTetrisLayoutProperties(x, y) {
    cellTetrisAreas[x][y] = 0;
    cellTetrisAnchors[x][y] = [Number.MAX_VALUE, Number.MAX_VALUE];

    for (var xx = 0; xx < 4; xx++) {
        for (var yy = 0; yy < 4; yy++) {
            cellTetrisAreas[x][y] += +cellTetrisLayouts[x][y][xx][yy];

            if (cellTetrisLayouts[x][y][xx][yy]) {
                cellTetrisAnchors[x][y][0] = Math.min(cellTetrisAnchors[x][y][0], xx);
                cellTetrisAnchors[x][y][1] = Math.min(cellTetrisAnchors[x][y][1], yy);
            }
        }
    }
}

function calculateMetrics() {
    radius = 88 / Math.max(6, Math.max(gridWidth, gridHeight));
    spacing = 800 / (Math.max(gridWidth, gridHeight) + 1);
    horPadding = (800 - spacing * (gridWidth - 1)) / 2;
    verPadding = (800 - spacing * (gridHeight - 1)) / 2;
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

    // Draw highlighted edges over other edges
    addVisualGridEdges(false);
    addVisualGridEdges(true);

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

            if (cellTypes[x][y] == CELL_TYPE.BLACK || cellTypes[x][y] == CELL_TYPE.WHITE) {
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
            } else if (cellTypes[x][y] == CELL_TYPE.TETRIS) {
                // Draw tetris grid
                for (var xx = 0; xx < 4; xx++) {
                    for (var yy = 0; yy < 4; yy++) {
                        var a = cellTetrisLayouts[x][y][xx][yy] ? '1' : '0';

                        var iconEl = baseEl.clone()
                            .attr('class', 'tetris-cell')
                            .attr('data-xx', xx)
                            .attr('data-yy', yy)
                            .attr('x', nodeX(x) + (spacing - radius) / 5 * (xx + 1))
                            .attr('y', nodeY(y) + (spacing - radius) / 5 * (yy + 1))
                            .attr('width', spacing / 8)
                            .attr('height', spacing / 8)
                            .attr('rx', 0)
                            .attr('ry', 0)
                            .css('fill', 'rgba(248, 222, 37, ' + a + ')')
                            .appendTo(gridEl);
                    }
                }
            }
        }
    }
}

function addVisualGridEdges(drawHighlighted) {
    // Set up horizontal edges
    for (var x = 0; x < gridWidth - 1; x++) {
        for (var y = 0; y < gridHeight; y++) {
            var a = horEdges[x][y] ? '1' : '0';
            var highlighted = highlightedHorEdges.has(node(x, y));

            if (highlighted != drawHighlighted) continue;

            $('<rect />')
                .attr('class', 'edge')
                .attr('data-type', 'hor-edge')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('x', nodeX(x))
                .attr('y', nodeY(y) - radius)
                .attr('width', spacing)
                .attr('height', radius * 2)
                .css('fill', highlighted ? '#B1F514' : 'rgba(2, 98, 35, ' + a + ')')
                .appendTo(gridEl);
        }
    }

    // Set up vertical edges
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight - 1; y++) {
            var a = verEdges[x][y] ? '1' : '0';
            var highlighted = highlightedVerEdges.has(node(x, y));

            if (highlighted != drawHighlighted) continue;

            $('<rect />')
                .attr('class', 'edge')
                .attr('data-type', 'ver-edge')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('x', nodeX(x) - radius)
                .attr('y', nodeY(y))
                .attr('width', radius * 2)
                .attr('height', spacing)
                .css('fill', highlighted ? '#B1F514' : 'rgba(2, 98, 35, ' + a + ')')
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
                .css('fill', highlightedNodes.has(node(x, y)) ? '#B1F514' : '#026223')
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
                    .css('fill', highlightedNodes.has(node(x, y)) ? '#B1F514' : 'black')
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
                    .css('fill', highlightedNodes.has(node(x, y)) ? '#B1F514' : '#026223')
                    .appendTo(parentEl);

                $('<circle />')
                    .attr('class', 'node')
                    .attr('data-x', x)
                    .attr('data-y', y)
                    .attr('cx', nodeX(x) - radius * 2)
                    .attr('cy', nodeY(y))
                    .attr('r', radius)
                    .css('fill', highlightedNodes.has(node(x, y)) ? '#B1F514' : '#026223')
                    .appendTo(parentEl);
            }
        }
    }
}

function addGridEventHandlers() {
    $('.cell').click(function() {
        if (viewingSolution) return;

        var x = +this.getAttribute('data-x');
        var y = +this.getAttribute('data-y');

        cellTypes[x][y] = (cellTypes[x][y] + 1) % 4;

        updateVisualGrid();
    });

    $('.tetris-cell').click(function() {
        if (viewingSolution) return;

        var x = +this.getAttribute('data-x');
        var y = +this.getAttribute('data-y');
        var xx = +this.getAttribute('data-xx');
        var yy = +this.getAttribute('data-yy');

        cellTetrisLayouts[x][y][xx][yy] = !cellTetrisLayouts[x][y][xx][yy];
        updateTetrisLayoutProperties(x, y);

        updateVisualGrid();
    });

    $('.edge').click(function() {
        if (viewingSolution) return;

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
        if (viewingSolution) return;

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
    var start = +new Date();
    var path = findSolution();
    var end = +new Date();
    console.log('solving took ' + (end - start) + ' ms');

    if (path) {
        // Do it in updateVisualGrid instead and mark edges as selected (draw those later)
        for (var i = 0; i < path.length; i++) {
            var cur = path[i];
            var next = path[i + 1];

            // Highlight visited node
            highlightedNodes.add(node(cur.x, cur.y));

            // Highlight edge to next node
            if (next) {
                if (next.x > cur.x) highlightedHorEdges.add(node(cur.x, cur.y));
                if (next.x < cur.x) highlightedHorEdges.add(node(next.x, next.y));
                if (next.y > cur.y) highlightedVerEdges.add(node(cur.x, cur.y));
                if (next.y < cur.y) highlightedVerEdges.add(node(next.x, next.y));
            }
        }

        viewingSolution = true;

        updateVisualGrid();
    } else {
        highlightedNodes.clear();
        highlightedHorEdges.clear();
        highlightedVerEdges.clear();

        viewingSolution = false;

        updateVisualGrid();

        alert('No solution!');
    }
}

function clearSolution() {
    highlightedNodes.clear();
    highlightedHorEdges.clear();
    highlightedVerEdges.clear();

    viewingSolution = false;

    updateVisualGrid();
}

function getNextNodes(n, visited, required) {
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

    candidates.sort(function(a, b) { return required.has(b) - required.has(a); });

    return candidates;
}

function checkSolution(path, required) {
    if (checkRequiredNodes(path, required)) {
        var areas = checkSegregation(path);

        if (areas) {
            return checkTetris(path, areas);
        }
    }

    return false;
}

function checkRequiredNodes(path, required) {
    // Check if all required nodes are part of the path
    for (var n of required) {
        if (path.indexOf(n) == -1) {
            return false;
        }
    }

    return true;
}

// Determine reachable neighbours of each cell based on a proposed path
function getCellReachabilities(path) {
    var neighbours = [];

    for (var x = 0; x < gridWidth - 1; x++) {
        for (var y = 0; y < gridHeight - 1; y++) {
            neighbours[[x, y]] = new Set();

            if (x > 0) neighbours[[x, y]].add(node(-1, 0));
            if (x < gridWidth - 2) neighbours[[x, y]].add(node(1, 0));
            if (y > 0) neighbours[[x, y]].add(node(0, -1));
            if (y < gridHeight - 2) neighbours[[x, y]].add(node(0, 1));
        }
    }

    for (var i = 0; i < path.length; i++) {
        var cur = path[i];
        var next = path[i + 1];

        if (next) {
            if (next.x > cur.x) {
                if (cur.y > 0) neighbours[[cur.x, cur.y - 1]].delete(node(0, 1));
                if (cur.y < gridHeight - 1) neighbours[[cur.x, cur.y]].delete(node(0, -1));
            }

            if (next.x < cur.x) {
                if (next.y > 0) neighbours[[next.x, next.y - 1]].delete(node(0, 1));
                if (next.y < gridHeight - 1) neighbours[[next.x, next.y]].delete(node(0, -1));
            }

            if (next.y > cur.y) {
                if (cur.x > 0) neighbours[[cur.x - 1, cur.y]].delete(node(1, 0));
                if (cur.x < gridWidth - 1) neighbours[[cur.x, cur.y]].delete(node(-1, 0));
            }

            if (next.y < cur.y) {
                if (next.x > 0) neighbours[[next.x - 1, next.y]].delete(node(1, 0));
                if (next.x < gridWidth - 1) neighbours[[next.x, next.y]].delete(node(-1, 0));
            }
        }
    }

    return neighbours;
}

function checkSegregation(path) {
    // Segregation of black and white squares is checked using flood fill
    var visited = new Set();
    var remaining = new Set();
    var cellCount = (gridWidth - 1) * (gridHeight - 1);

    for (var x = 0; x < gridWidth - 1; x++) {
        for (var y = 0; y < gridHeight - 1; y++) {
            remaining.add(node(x, y));
        }
    }

    var cells = getCellReachabilities(path);

    // Color of current area and cells in it left to visit
    var areaColor = CELL_TYPE.NONE;
    var visitList = [node(0, 0)];

    var areas = [[]];

    while (visited.size != cellCount) {
        var n = visitList.shift();
        visited.add(n);
        remaining.delete(n);
        areas[areas.length - 1].push(n);

        // Check how current cell compares to other cells we've seen in the same
        // continuous area so far
        if (!colorsCompatible(areaColor, cellTypes[n.x][n.y])) {
            return false;
        } else if (areaColor == CELL_TYPE.NONE) {
            // First cell with a color in this area
            areaColor = cellTypes[n.x][n.y];
        }

        // Add reachable neighbours we haven't visited yet
        for (var relPos of cells[[n.x, n.y]]) {
            var neighbour = node(n.x + relPos.x, n.y + relPos.y);

            if (!visited.has(neighbour) && visitList.indexOf(neighbour) == -1) {
                visitList.push(neighbour);
            }
        }

        // Finished inspecting this area, select a new unvisited node - if any
        if (visitList.length == 0) {
            for (var n of remaining.values()) {
                areaColor = CELL_TYPE.NONE;
                visitList = [n];
                areas.push([]);

                break;
            }
        }
    }

    return areas;
}

function checkTetris(path, areas) {
    // Start with some early cheap checks
    if (!checkTetrisAreas(path, areas)) {
        return false;
    }

    // For each area, try all possible positions of the tetris blocks contained
    // within and see if they fit (yes, solution verification is NP-complete!)
    for (var area of areas) {
        var tetrisCells = [];

        for (var cell of area) {
            if (cellTypes[cell.x][cell.y] == CELL_TYPE.TETRIS) {
                tetrisCells.push(cell);
            }
        }

        // Use first-fit decreasing style optimisation
        tetrisCells.sort(function(a, b) {
            return cellTetrisAreas[b.x][b.y] - cellTetrisAreas[a.x][a.y];
        });

        if (!findTetrisPlacement(new Set(area), tetrisCells)) {
            return false;
        }
    }

    return true;
}

// Find a successful placement of tetris blocks specified in [cells] given the
// available area cells [area]
function findTetrisPlacement(area, cells) {
    if (cells.length == 0) return true;
    var cell = cells.shift();

    var anchor = cellTetrisAnchors[cell.x][cell.y];
    var layout = cellTetrisLayouts[cell.x][cell.y];

    // Try every possible viable placement
    for (var topLeft of area) {
        var viable = true;
        var remainingArea = new Set(area);

        for (var xx = anchor[0]; xx < 4 && viable; xx++) {
            for (var yy = anchor[1]; yy < 4 && viable; yy++) {
                if (layout[xx][yy]) {
                    var n = node(topLeft.x + xx, topLeft.y + yy);

                    remainingArea.delete(n);

                    if (!area.has(n)) {
                        viable = false;
                    }
                }
            }
        }

        // If a viable placement was found, continue with the remaining blocks
        if (viable && findTetrisPlacement(remainingArea, cells.slice())) {
            return true;
        }
    }

    return false;
}

function checkTetrisAreas(path, areas) {
    // Check if the amount of cells in each area matches the amount of tetris blocks
    for (var area of areas) {
        var cellCount = area.length;
        var tetrisCount = 0;

        for (var cell of area) {
            if (cellTypes[cell.x][cell.y] == CELL_TYPE.TETRIS) {
                tetrisCount += cellTetrisAreas[cell.x][cell.y];
            }
        }

        if (tetrisCount != 0 && tetrisCount != cellCount) return false;
    }

    return true;
}

function colorsCompatible(c1, c2) {
    return (c1 != CELL_TYPE.BLACK && c1 != CELL_TYPE.WHITE) ||
           (c2 != CELL_TYPE.BLACK && c2 == CELL_TYPE.WHITE) ||
           c1 == c2;
}

// Auxilary required nodes are an optimization feature for segregation puzzles.
// It contains the endpoints of each edge between differently colored cells.
// These edges must be visited for a correct solution and therefore its
// endpoints are required nodes in the path.
function determineAuxilaryRequired() {
    var aux = new Set();

    for (var x = 0; x < gridWidth - 1; x++) {
        for (var y = 0; y < gridHeight - 1; y++) {
            // Right side
            if (x < gridWidth - 2 && !colorsCompatible(cellTypes[x][y], cellTypes[x + 1][y])) {
                aux.add(node(x + 1, y));
                aux.add(node(x + 1, y + 1));
            }

            // Bottom side
            if (y < gridHeight - 2 && !colorsCompatible(cellTypes[x][y], cellTypes[x][y + 1])) {
                aux.add(node(x, y + 1));
                aux.add(node(x + 1, y + 1));
            }
        }
    }

    return aux;
}

function getNodesByType(type) {
    var nodes = [];

    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight; y++) {
            if (nodeTypes[x][y] == type) {
                nodes.push(node(x, y));
            }
        }
    }

    return nodes;
}

function findSolution(path, visited, required) {
    if (!required) {
        required = determineAuxilaryRequired();

        for (var n of getNodesByType(NODE_TYPE.REQUIRED)) {
            required.add(n);
        }
    }

    if (!path || path.length == 0) {
        // Check if there are any exit nodes
        if (getNodesByType(NODE_TYPE.EXIT).length == 0) {
            return false;
        }

        // If this is the first call, recursively try every starting node
        for (var n of getNodesByType(NODE_TYPE.START)) {
            var fullPath = findSolution([n], new Set([n]), required);

            if (fullPath) {
                return fullPath;
            }
        }

        return false;
    } else {
        var cn = path[path.length - 1];

        // If we're at an exit node, check if the current path is a valid solution
        if (nodeTypes[cn.x][cn.y] == NODE_TYPE.EXIT && checkSolution(path, required)) {
            return path;
        }

        // Try all possibles routes from the latest node
        var candidates = getNextNodes(cn, visited, required);

        for (var n of candidates) {
            var newPath = path.slice();
            newPath.push(n);

            var newVisited = new Set(visited);
            newVisited.add(n);

            var fullPath = findSolution(newPath, newVisited, required);

            if (fullPath) {
                return fullPath;
            }
        }

        return false;
    }
}

initGrid();

// Load sample puzzle (starting area)
nodeTypes[0][3] = NODE_TYPE.START;
nodeTypes[3][0] = NODE_TYPE.EXIT;

cellTypes[0][0] = CELL_TYPE.TETRIS;
cellTypes[0][2] = CELL_TYPE.TETRIS;

for (var xx = 0; xx < 4; xx++) {
    for (var yy = 0; yy < 4; yy++) {
        cellTetrisLayouts[0][0][xx][yy] = false;
        cellTetrisLayouts[0][2][xx][yy] = false;
    }
}

cellTetrisLayouts[0][0][0][0] = true;
cellTetrisLayouts[0][0][1][0] = true;
updateTetrisLayoutProperties(0, 0);

cellTetrisLayouts[0][2][0][0] = true;
cellTetrisLayouts[0][2][0][1] = true;
cellTetrisLayouts[0][2][1][0] = true;
cellTetrisLayouts[0][2][1][1] = true;
updateTetrisLayoutProperties(0, 2);

updateVisualGrid();

// Set up UI controls
$('#solve-button').click(solve);
$('#clear-button').click(clearSolution);

var gridSizeSelector = $('#grid-size-selector');

for (var x = 1; x <= 5; x++) {
    for (var y = 1; y <= 5; y++) {
        var el = $('<option value="' + x + ',' + y + '">' + x + ' x ' + y + '</option>')
            .appendTo(gridSizeSelector);

        if (x == gridWidth - 1 && y == gridHeight - 1) {
            el.attr('selected', 'selected');
        }
    }
}

gridSizeSelector.change(function() {
    var x = +this.value.split(',')[0];
    var y = +this.value.split(',')[1];

    clearSolution();

    gridWidth = x + 1;
    gridHeight = y + 1;
    calculateMetrics();

    initGrid();

    updateVisualGrid();
});