// Configuration
var radius;
var spacing;
var horPadding;
var verPadding;

var latestPath = [];
var viewingSolution = false;
var solutionFraction = 1;
var highlightedNodes = new Set();
var highlightedHorEdges = new Set();
var highlightedVerEdges = new Set();

var gridEl = $('svg');

function calculateMetrics() {
    radius = 88 / Math.max(6, Math.max(puzzle.width, puzzle.height));
    spacing = 800 / (Math.max(puzzle.width, puzzle.height) + 1);
    horPadding = (800 - spacing * (puzzle.width - 1)) / 2;
    verPadding = (800 - spacing * (puzzle.height - 1)) / 2;
}

// X index to X position on visual grid for nodes
function nodeX(x) {
    return horPadding + spacing * x;
}

// Y index to Y position on visual grid for nodes
function nodeY(y) {
    return verPadding + spacing * y;
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
// These use the legacy format for compatibility
function updateURL() {
    var encoding = {
        gridWidth: puzzle.width,
        gridHeight: puzzle.height,
        horEdges: deepMap(puzzle.horEdges, bool2num),
        verEdges: deepMap(puzzle.verEdges, bool2num),
        nodeTypes: deepMap(puzzle.nodes, function(n) { return n.type; }),
        cellTypes: deepMap(puzzle.cells, function(c) { return c.type; }),
        cellTetrisLayouts: deepMap(deepMap(puzzle.cells, function(c) { return c.tetris; }), bool2num),
        cellTetrisAreas: deepMap(puzzle.cells, function(c) { return c.tetrisArea; }),
        cellTetrisBounds: deepMap(puzzle.cells, function(c) { return c.tetrisBounds; })
    };

    encoding = btoa(JSON.stringify(encoding));

    location.hash = '#' + encoding;
}

function parseFromURL() {
    try {
        var encoding = JSON.parse(atob(location.hash.substr(1)));

        initPuzzle(puzzle, encoding['gridWidth'], encoding['gridHeight']);

        puzzle.horEdges = deepMap(encoding['horEdges'], num2bool);
        puzzle.verEdges = deepMap(encoding['verEdges'], num2bool);
        puzzle.nodes = deepMap(encoding['nodeTypes'], function(t) { return {type: t}; });
        puzzle.cells = deepMap(encoding['cellTypes'], function(t) { return {type: t}; });

        var cellTetrisLayouts = deepMap(encoding['cellTetrisLayouts'], num2bool);
        var cellTetrisAreas = encoding['cellTetrisAreas'];
        var cellTetrisBounds = encoding['cellTetrisBounds'];

        for (var x = 0; x < puzzle.width - 1; x++) {
            for (var y = 0; y < puzzle.height - 1; y++) {
                puzzle.cells[x][y].tetris = cellTetrisLayouts[x][y];
                puzzle.cells[x][y].tetrisArea = cellTetrisAreas[x][y];
                puzzle.cells[x][y].tetrisBounds = cellTetrisBounds[x][y];
            }
        }

        updateVisualGrid();

        return true;
    } catch (e) {
        throw e;
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
    for (var x = 0; x < puzzle.width - 1; x++) {
        for (var y = 0; y < puzzle.height - 1; y++) {
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

            if (puzzle.cells[x][y].type == CELL_TYPE.BLACK || puzzle.cells[x][y].type == CELL_TYPE.WHITE) {
                addVisualBlackWhiteCell(x, y, baseEl);
            } else if (puzzle.cells[x][y].type == CELL_TYPE.TETRIS || puzzle.cells[x][y].type == CELL_TYPE.TETRIS_ROTATED) {
                addVisualGridTetrisCell(x, y, baseEl);
            }
        }
    }
}

function addVisualBlackWhiteCell(x, y, baseEl) {
    var iconEl = baseEl.clone()
        .attr('x', nodeX(x) + spacing / 2 - spacing / 8)
        .attr('y', nodeY(y) + spacing / 2 - spacing / 8)
        .attr('width', spacing / 4)
        .attr('height', spacing / 4)
        .appendTo(gridEl);

    if (puzzle.cells[x][y].type == CELL_TYPE.BLACK) {
        iconEl.css('fill', 'rgba(0, 0, 0, 0.9)');
    } else {
        iconEl.css('fill', 'white');
    }
}

function addVisualGridTetrisCell(x, y, baseEl) {
    // Draw tetris grid
    for (var xx = 0; xx < 4; xx++) {
        for (var yy = 0; yy < 4; yy++) {
            var a = puzzle.cells[x][y].tetris[xx][yy] ? '1' : '0';

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

            if (puzzle.cells[x][y].type == CELL_TYPE.TETRIS_ROTATED) {
                var cx = nodeX(x) + spacing / 2;
                var cy = nodeY(y) + spacing / 2;

                iconEl.css('transform', 'translate(' + cx + 'px, ' + cy + 'px) scale(0.8, 0.8) rotate(45deg) translate(' + -cx + 'px, ' + -cy + 'px)');
            }
        }
    }
}

function addVisualGridEdges(drawHighlighted) {
    // Set up horizontal edges
    for (var x = 0; x < puzzle.width - 1; x++) {
        for (var y = 0; y < puzzle.height; y++) {
            var highlighted = highlightedHorEdges.has(point(x, y));

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

            if (!puzzle.horEdges[x][y]) {
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
    for (var x = 0; x < puzzle.width; x++) {
        for (var y = 0; y < puzzle.height - 1; y++) {
            var highlighted = highlightedVerEdges.has(point(x, y));

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

            if (!puzzle.verEdges[x][y]) {
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
    for (var x = 0; x < puzzle.width; x++) {
        for (var y = 0; y < puzzle.height; y++) {
            // Create base node for event handling
            var baseEl = $('<circle />')
                .attr('class', 'node')
                .attr('data-x', x)
                .attr('data-y', y)
                .attr('cx', nodeX(x))
                .attr('cy', nodeY(y))
                .attr('r', radius)
                .css('fill', highlightedNodes.has(point(x, y)) ? '#B1F514' : '#026223')
                .appendTo(gridEl);

            // Extend visualization based on special node types
            if (puzzle.nodes[x][y].type == NODE_TYPE.START) {
                baseEl.attr('r', radius * 2);
            } else if (puzzle.nodes[x][y].type == NODE_TYPE.REQUIRED) {
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
                    .css('fill', highlightedNodes.has(point(x, y)) ? '#B1F514' : 'black')
                    .attr('d', path)
                    .appendTo(gridEl);
            } else if (puzzle.nodes[x][y].type == NODE_TYPE.EXIT) {
                var ang = 0;

                if (x == 0) ang = 0;
                else if (x == puzzle.width - 1) ang = 180;

                if (y == 0) ang = 90;
                else if (y == puzzle.height - 1) ang = -90;

                // Diagonally for corner nodes
                if (x == 0 && y == 0) ang -= 45;
                else if (x == 0 && y == puzzle.height - 1) ang += 45;
                else if (x == puzzle.width - 1 && y == 0) ang += 45;
                else if (x == puzzle.width - 1 && y == puzzle.height - 1) ang -= 45;

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
                    .css('fill', highlightedNodes.has(point(x, y)) ? '#B1F514' : '#026223')
                    .appendTo(parentEl);

                $('<circle />')
                    .attr('class', 'node')
                    .attr('data-x', x)
                    .attr('data-y', y)
                    .attr('cx', nodeX(x) - radius * 2)
                    .attr('cy', nodeY(y))
                    .attr('r', radius)
                    .css('fill', highlightedNodes.has(point(x, y)) ? '#B1F514' : '#026223')
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

        puzzle.cells[x][y].type = (puzzle.cells[x][y].type + 1) % (CELL_TYPE.LAST + 1);

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

        puzzle.cells[x][y].tetris[xx][yy] = !puzzle.cells[x][y].tetris[xx][yy];
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
            puzzle.horEdges[x][y] = !puzzle.horEdges[x][y];
        } else if (type == 'ver-edge') {
            puzzle.verEdges[x][y] = !puzzle.verEdges[x][y];
        }

        updateVisualGrid();
    });

    $('.node').click(function() {
        if (viewingSolution) return;

        var x = +this.getAttribute('data-x');
        var y = +this.getAttribute('data-y');

        puzzle.nodes[x][y].type = (puzzle.nodes[x][y].type + 1) % (NODE_TYPE.LAST + 1);

        // Only outer nodes can be exits
        if (puzzle.nodes[x][y].type == NODE_TYPE.EXIT) {
            if (x != 0 && y != 0 && x != puzzle.width - 1 && y != puzzle.height - 1) {
                puzzle.nodes[x][y].type = NODE_TYPE.NORMAL;
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
            highlightedNodes.add(point(cur.x, cur.y));

            // Highlight edge to next node
            if (next) {
                if (next.x > cur.x) highlightedHorEdges.add(point(cur.x, cur.y));
                if (next.x < cur.x) highlightedHorEdges.add(point(next.x, next.y));
                if (next.y > cur.y) highlightedVerEdges.add(point(cur.x, cur.y));
                if (next.y < cur.y) highlightedVerEdges.add(point(next.x, next.y));
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

for (var x = 1; x <= 6; x++) {
    for (var y = 1; y <= 6; y++) {
        var el = $('<option value="' + (x + 1) + ',' + (y + 1) + '">' + x + ' x ' + y + '</option>')
            .appendTo(gridSizeSelector);
    }
}

gridSizeSelector.change(function() {
    var x = +this.value.split(',')[0];
    var y = +this.value.split(',')[1];

    clearSolution();

    initPuzzle(puzzle, x, y);

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
        initPuzzle(puzzle, 5, 5);

        puzzle.verEdges[2][1] = false;
        puzzle.nodes[0][4].type = NODE_TYPE.START;
        puzzle.nodes[4][0].type = NODE_TYPE.EXIT;
        puzzle.cells[0][1].type = CELL_TYPE.TETRIS;
        puzzle.cells[1][3].type = CELL_TYPE.TETRIS;
        puzzle.cells[2][3].type = CELL_TYPE.TETRIS;

        for (var xx = 0; xx < 4; xx++) {
            for (var yy = 0; yy < 4; yy++) {
                puzzle.cells[0][1].tetris[xx][yy] = false;
                puzzle.cells[1][3].tetris[xx][yy] = false;
                puzzle.cells[2][3].tetris[xx][yy] = false;
            }
        }

        for (var xx = 0; xx < 4; xx++) puzzle.cells[0][1].tetris[xx][0] = true;
        for (var yy = 0; yy < 3; yy++) {
            puzzle.cells[1][3].tetris[0][yy] = true;
            puzzle.cells[2][3].tetris[0][yy] = true;
        }

        updateTetrisLayoutProperties(0, 1);
        updateTetrisLayoutProperties(1, 3);
        updateTetrisLayoutProperties(2, 3);

        updateVisualGrid();
    }
}