// Configuration
var gridWidth = 5;
var gridHeight = 5;

var radius;
var spacing;
var horPadding;
var verPadding;
calculateMetrics();

var gridEl = $('svg');

// X index to X position on visual grid for nodes
function nodeX(x) {
    return horPadding + spacing * x;
}

// Y index to Y position on visual grid for nodes
function nodeY(y) {
    return verPadding + spacing * y;
}

function calculateMetrics() {
    radius = 88 / Math.max(6, Math.max(gridWidth, gridHeight));
    spacing = 800 / (Math.max(gridWidth, gridHeight) + 1);
    horPadding = (800 - spacing * (gridWidth - 1)) / 2;
    verPadding = (800 - spacing * (gridHeight - 1)) / 2;
}

function deepMap(arr, fn) {
    if (typeof(arr) == 'object' && arr.length !== undefined) {
        var arr = arr.slice();

        for (var i = 0; i < arr.length; i++) {
            arr[i] = deepMap(arr[i], fn);
        }

        return arr;
    } else {
        return fn(arr);
    }
}

function num2bool(n) {
    return !!n;
}

function bool2num(b) {
    return +b;
}

// Update URL that allows people to link puzzles
function updateURL() {
    var encoding = {
        gridWidth: gridWidth,
        gridHeight: gridHeight,
        horEdges: deepMap(horEdges, bool2num),
        verEdges: deepMap(verEdges, bool2num),
        nodeTypes: nodeTypes,
        cellTypes: cellTypes,
        cellTetrisLayouts: deepMap(cellTetrisLayouts, bool2num),
        cellTetrisAreas: cellTetrisAreas,
        cellTetrisBounds: cellTetrisBounds
    };

    encoding = btoa(JSON.stringify(encoding));

    location.hash = '#' + encoding;
}

function parseFromURL() {
    try {
        var encoding = JSON.parse(atob(location.hash.substr(1)));

        gridWidth = encoding['gridWidth'];
        gridHeight = encoding['gridHeight'];
        horEdges = deepMap(encoding['horEdges'], num2bool);
        verEdges = deepMap(encoding['verEdges'], num2bool);
        nodeTypes = encoding['nodeTypes'];
        cellTypes = encoding['cellTypes'];
        cellTetrisLayouts = deepMap(encoding['cellTetrisLayouts'], num2bool);
        cellTetrisAreas = encoding['cellTetrisAreas'];
        cellTetrisBounds = encoding['cellTetrisBounds'];

        calculateMetrics();
        updateVisualGrid();

        return true;
    } catch (e) {
        alert('Invalid puzzle URL provided! Displaying the default puzzle.');

        return false;
    }
}

// Update visualization of grid
function updateVisualGrid() {
    updateURL();

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
            } else if (cellTypes[x][y] == CELL_TYPE.TETRIS || cellTypes[x][y] == CELL_TYPE.TETRIS_ROTATED) {
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

                        if (cellTypes[x][y] == CELL_TYPE.TETRIS_ROTATED) {
                            var cx = nodeX(x) + spacing / 2;
                            var cy = nodeY(y) + spacing / 2;

                            iconEl.css('transform', 'translate(' + cx + 'px, ' + cy + 'px) scale(0.8, 0.8) rotate(45deg) translate(' + -cx + 'px, ' + -cy + 'px)');
                        }
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
            var highlighted = highlightedHorEdges.has(node(x, y));

            if (highlighted != drawHighlighted) continue;

            var baseEl = $('<rect />')
                .attr('class', 'edge')
                .attr('data-type', 'hor-edge')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('x', nodeX(x))
                .attr('y', nodeY(y) - radius)
                .attr('width', spacing)
                .attr('height', radius * 2)
                .css('fill', highlighted ? '#B1F514' : '#026223')
                .appendTo(gridEl);

            if (!horEdges[x][y]) {
                baseEl.clone()
                    .attr('x', nodeX(x) + spacing / 2 - radius)
                    .attr('width', radius * 2)
                    .attr('y', nodeY(y) - radius - 2)
                    .attr('height', radius * 2 + 4)
                    .css('fill', '#00E94F')
                    .appendTo(gridEl);
            }
        }
    }

    // Set up vertical edges
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight - 1; y++) {
            var highlighted = highlightedVerEdges.has(node(x, y));

            if (highlighted != drawHighlighted) continue;

            var baseEl = $('<rect />')
                .attr('class', 'edge')
                .attr('data-type', 'ver-edge')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('x', nodeX(x) - radius)
                .attr('y', nodeY(y))
                .attr('width', radius * 2)
                .attr('height', spacing)
                .css('fill', highlighted ? '#B1F514' : '#026223')
                .appendTo(gridEl);

            if (!verEdges[x][y]) {
                baseEl.clone()
                    .attr('y', nodeY(y) + spacing / 2 - radius)
                    .attr('height', radius * 2)
                    .attr('x', nodeX(x) - radius - 2)
                    .attr('width', radius * 2 + 4)
                    .css('fill', '#00E94F')
                    .appendTo(gridEl);
            }
        }
    }
}

function addVisualGridPoints() {
    for (var x = 0; x < gridWidth; x++) {
        for (var y = 0; y < gridHeight; y++) {
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

        cellTypes[x][y] = (cellTypes[x][y] + 1) % 5;

        updateVisualGrid();
    });

    $('.tetris-cell').mouseup(function(e) {
        if (viewingSolution) return;

        var x = +this.getAttribute('data-x');
        var y = +this.getAttribute('data-y');
        var xx = +this.getAttribute('data-xx');
        var yy = +this.getAttribute('data-yy');

        if (e.which != 3) {
            if (e.which == 1) {
                $('.cell[data-x="' + x + '"][data-y="' + y + '"]').click();
            }

            return;
        }

        cellTetrisLayouts[x][y][xx][yy] = !cellTetrisLayouts[x][y][xx][yy];
        updateTetrisLayoutProperties(x, y);

        updateVisualGrid();
    });
    $('rect').contextmenu(function() { return false; });

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

function solve(fractionChange) {
    if (!fractionChange) {
        $('#solve-button').val('Solving...').prop('disabled', true);
    }

    // Allows browser to redraw button before starting computation
    setTimeout(function() {
        actualSolve(fractionChange);
    }, 0);
}

function actualSolve(fractionChange) {
    // Search for solution using branch and bound algorithm
    if (!fractionChange) {
        var start = +new Date();
        latestPath = findSolution();
        var end = +new Date();
        console.log('solving took ' + (end - start) + ' ms');
    }

    highlightedNodes.clear();
    highlightedHorEdges.clear();
    highlightedVerEdges.clear();

    if (latestPath) {
        // If user wants to see a partial solution, cut off the path
        path = latestPath.slice(0, Math.ceil(latestPath.length * solutionFraction));

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
        viewingSolution = false;

        updateVisualGrid();

        alert('No solution!');
    }

    $('#solve-button').val('Solve').prop('disabled', false);
}

function clearSolution() {
    highlightedNodes.clear();
    highlightedHorEdges.clear();
    highlightedVerEdges.clear();

    viewingSolution = false;

    updateVisualGrid();
}

// Set up UI controls
$('#solve-button').click(function() { solve(); });
$('#clear-button').click(clearSolution);

var gridSizeSelector = $('#grid-size-selector');

for (var x = 1; x <= 5; x++) {
    for (var y = 1; y <= 5; y++) {
        var el = $('<option value="' + x + ',' + y + '">' + x + ' x ' + y + '</option>')
            .appendTo(gridSizeSelector);

        if (x == gridWidth - 1 && y == gridHeight - 1) {
            el.prop('selected', true);
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

var hintSizeSelector = $('#hint-size-selector');

for (var i = 100; i >= 10; i -= 10) {
    if (i == 100) {
        var el = $('<option value="100">Full solution</option>')
            .appendTo(hintSizeSelector)
            .prop('selected', true);
    } else {
        hintSizeSelector.append('<option value="' + i + '">' + i + '%</option>');
    }
}

hintSizeSelector.change(function() {
    solutionFraction = +this.value / 100;

    if (viewingSolution) {
        solve(true);
    }
});

function initialize() {
    // Sample puzzle from swamp area
    if (location.hash.length == 0 || !parseFromURL()) {
        initGrid();

        verEdges[2][1] = false;
        nodeTypes[0][4] = NODE_TYPE.START;
        nodeTypes[4][0] = NODE_TYPE.EXIT;
        cellTypes[0][1] = CELL_TYPE.TETRIS;
        cellTypes[1][3] = CELL_TYPE.TETRIS;
        cellTypes[2][3] = CELL_TYPE.TETRIS;

        for (var xx = 0; xx < 4; xx++) {
            for (var yy = 0; yy < 4; yy++) {
                cellTetrisLayouts[0][1][xx][yy] = false;
                cellTetrisLayouts[1][3][xx][yy] = false;
                cellTetrisLayouts[2][3][xx][yy] = false;
            }
        }

        for (var xx = 0; xx < 4; xx++) cellTetrisLayouts[0][1][xx][0] = true;
        for (var yy = 0; yy < 3; yy++) {
            cellTetrisLayouts[1][3][0][yy] = true;
            cellTetrisLayouts[2][3][0][yy] = true;
        }

        updateTetrisLayoutProperties(0, 1);
        updateTetrisLayoutProperties(1, 3);
        updateTetrisLayoutProperties(2, 3);

        updateVisualGrid();
    }
}