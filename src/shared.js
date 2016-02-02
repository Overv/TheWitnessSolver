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
    'TETRIS': 3,
    'TETRIS_ROTATED': 4
};

// Visual grid definition
var horEdges = [];
var verEdges = [];
var nodeTypes = [];
var cellTypes = [];
var cellTetrisLayouts = [];
var cellTetrisAreas = [];
var cellTetrisBounds = [];

var viewingSolution = false;
var solutionFraction = 1;
var highlightedNodes = new Set();
var highlightedHorEdges = new Set();
var highlightedVerEdges = new Set();

var latestPath = [];

// Used for keeping track of visited nodes with a Set
// This requires that a given X,Y node is always the exact same JS object
var nodePool = [];

function node(x, y) {
    if (!nodePool[x]) nodePool[x] = [];
    if (!nodePool[x][y]) nodePool[x][y] = {x: x, y: y};

    return nodePool[x][y];
}

// Set up default grid with all edges and no special nodes or cells
function initGrid() {
    for (var x = 0; x < gridWidth; x++) {
        nodeTypes[x] = [];
        cellTypes[x] = [];
        cellTetrisLayouts[x] = [];
        cellTetrisAreas[x] = [];
        cellTetrisBounds[x] = [];
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
                        cellTetrisLayouts[x][y][xx][yy] = false;
                    }
                }
                cellTetrisLayouts[x][y][0][0] = true;
                cellTetrisLayouts[x][y][3][0] = true;
                cellTetrisLayouts[x][y][0][3] = true;
                cellTetrisLayouts[x][y][3][3] = true;

                cellTetrisAreas[x][y] = 4;
                cellTetrisBounds[x][y] = [0, 0, 3, 3];
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