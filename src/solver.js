// Check if a tetris layout is hollow by checking if all blocks are reachable
// from the outside
function isTetrisLayoutHollow(cell) {
    if (cell.tetrisArea == 0) return false;

    // Start with all outer nodes
    var visitList = [];

    for (var x = 0; x < 4; x++) {
        for (var y = 0; y < 4; y++) {
            if (x == 0 || y == 0 || x == 3 || y == 3) {
                visitList.push(point(x, y));
            }
        }
    }

    // Now allow spreading for anything except block -> nonblock
    var reachable = new Set();

    while (visitList.length > 0) {
        var p = visitList.shift();

        reachable.add(p);

        var neighbours = [
            point(p.x - 1, p.y),
            point(p.x + 1, p.y),
            point(p.x, p.y - 1),
            point(p.x, p.y + 1)
        ];

        for (var n of neighbours) {
            var valid =
                n.x > 0 && n.y > 0 && n.x < 4 && n.y < 4 &&
                !(cell.tetris[p.x][p.y] && !cell.tetris[n.x][n.y]) &&
                !reachable.has(n);

            if (valid) {
                visitList.push(n);
            }
        }
    }

    return reachable.size != 16;
}

function getNextNodes(n, visited, required) {
    var candidates = [];

    // Select every connected node that has not yet been visited
    if (horEdgeExists(n.x, n.y) && !visited.has(point(n.x + 1, n.y))) {
        candidates.push(point(n.x + 1, n.y));
    }

    if (horEdgeExists(n.x - 1, n.y) && !visited.has(point(n.x - 1, n.y))) {
        candidates.push(point(n.x - 1, n.y));
    }

    if (verEdgeExists(n.x, n.y) && !visited.has(point(n.x, n.y + 1))) {
        candidates.push(point(n.x, n.y + 1));
    }

    if (verEdgeExists(n.x, n.y - 1) && !visited.has(point(n.x, n.y - 1))) {
        candidates.push(point(n.x, n.y - 1));
    }

    candidates.sort(function(a, b) { return required.has(b) - required.has(a); });

    return candidates;
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

function checkRequiredEdges(path, edgeRequired) {
    // Check if all required edges are part of the path
    if (edgeRequired == null) return true;
    for (var n of edgeRequired) {
    // wha?
        if (n.ori == ORIENTATION_TYPE.VER) { //Vertical
            var flag = false;
            for(var i = 0; i < path.length-1; i++) {
                if((path[i].x == n.x && path[i].y == n.y &&
                    path[i+1].x == n.x && path[i+1].y == n.y + 1 )
                    ||(path[i+1].x == n.x && path[i+1].y == n.y &&
                    path[i].x == n.x && path[i].y == n.y + 1 )) {
                    flag = true;
                    break;
                }
            }
            if (flag == false) return false;
        } else { //Horizontal
            var flag = false;
            for(var i = 0; i < path.length-1; i++) {
                if((path[i].x == n.x && path[i].y == n.y &&
                    path[i+1].x == n.x + 1 && path[i+1].y == n.y )
                    ||(path[i+1].x == n.x && path[i+1].y == n.y &&
                    path[i].x == n.x + 1 && path[i].y == n.y )) {
                    flag = true;
                    break;
                }
            }
            if (flag == false) return false;
        }
    }

    return true;
}


function isOuterpoint(n) {
    return n.x == 0 || n.y == 0 || n.x == puzzle.width - 1 || n.y == puzzle.height - 1;
}

function getLeftRight(cur, next) {
    var left, right;

    if (next.x > cur.x) {
        return [
            point(cur.x, cur.y - 1),
            point(cur.x, cur.y)
        ];
    } else if (next.x < cur.x) {
        return [
            point(next.x, next.y),
            point(next.x, next.y - 1)
        ];
    }

    if (next.y > cur.y) {
        return [
            point(cur.x, cur.y),
            point(cur.x - 1, cur.y)
        ];
    } else if (next.y < cur.y) {
        return [
            point(next.x - 1, next.y),
            point(next.x, next.y)
        ];
    }
}

function checkSegregation(area) {
    var cmp = {type: CELL_TYPE.NONE, color: CELL_COLOR.BLACK};

    for (var c of area) {
        if (puzzle.cells[c.x][c.y].type == CELL_TYPE.SQUARE) {
            if (!colorsCompatible(cmp, puzzle.cells[c.x][c.y])) {
                return false;
            }

            cmp = puzzle.cells[c.x][c.y];
        }
    }

    return true;
}

function checkTetrisArea(area) {
    var areaCells = 0;
    var tetrisBlocks = 0;

    for (var c of area) {
        areaCells++;

        if (puzzle.cells[c.x][c.y].type == CELL_TYPE.TETRIS || puzzle.cells[c.x][c.y].type == CELL_TYPE.TETRIS_ROTATED) {
            tetrisBlocks += puzzle.cells[c.x][c.y].tetrisArea;
        }
    }

    if (tetrisBlocks > 0 && tetrisBlocks != areaCells) {
        return false;
    } else {
        return true;
    }
}

function separateAreasStep(last, cur, areas, segment) {
    // Start with 1 area: the entire grid
    if (!areas) {
        areas = [new Set()];

        for (var x = 0; x < puzzle.width - 1; x++) {
            for (var y = 0; y < puzzle.height - 1; y++) {
                areas[0].add(point(x, y));
            }
        }

        segment = [];
    }

    // Process new segments
    if (isOuterpoint(last)) {
        // outer -> outer counts as outer -> inner -> outer if it crosses an
        // inner edge. This is an edge case on small puzzles.
        var innerEdge =
            segment.length == 1 &&
            (
                (segment[0].x != last.x && last.y > 0 && last.y < puzzle.height - 1) ||
                (segment[0].y != last.y && last.x > 0 && last.x < puzzle.width - 1)
            );

        if (segment.length <= 1 && !innerEdge) {
            segment = [last];
        } else {
            // Select nodes on the left and on the right of the segment
            var leftCells = [];
            var rightCells = new Set();

            for (var i = 0; i < segment.length; i++) {
                var segCur = segment[i];

                var segNext = last;
                if (i < segment.length - 1) {
                    segNext = segment[i + 1];
                }

                var res = getLeftRight(segCur, segNext);
                leftCells.push(res[0]);
                rightCells.add(res[1]);
            }

            segment = [last];

            // Last area in the list is always the one we're currently in
            var area = new Set(areas[areas.length - 1]);
            areas = areas.slice(0, -1);

            // Find full left and right sides using flood fill
            var visitList = leftCells;
            leftCells = [];

            while (visitList.length > 0) {
                var n = visitList.shift();

                if (rightCells.has(n) || !area.has(n)) continue;
                leftCells.push(n);
                area.delete(n);

                if (n.x > 0) visitList.push(point(n.x - 1, n.y));
                if (n.y > 0) visitList.push(point(n.x, n.y - 1));
                if (n.x < puzzle.width - 1) visitList.push(point(n.x + 1, n.y));
                if (n.y < puzzle.height - 1) visitList.push(point(n.x, n.y + 1));
            }

            // Determine which area the path continues in and add it last
            var res = getLeftRight(last, cur);

            if (res && (area.has(res[0]) || area.has(res[1]))) {
                areas.push(new Set(leftCells));
                areas.push(area);
            } else {
                areas.push(area);
                areas.push(new Set(leftCells));
            }

            // Run segregation and tetris checks for the second to last area,
            // which will now no longer change. This allows for early termination.
            if (!checkArea(areas[areas.length - 2])) {
                return false;
            }
        }
    } else if (segment.length >= 1) {
        segment = segment.slice();
        segment.push(last);
    }

    return [areas, segment];
}

// Close up the last area and check it (for exit nodes)
function checkLastArea(last, cur, areas, segment) {
    // If there is currently a segment going on, skip ahead a node to arrive
    // at the areas if the solution were to end here
    var innerEdgeTmp =
        (cur.x != last.x && last.y > 0 && last.y < puzzle.height - 1) ||
        (cur.y != last.y && last.x > 0 && last.x < puzzle.width - 1);

    var tmpRes = true;
    if (segment.length > 1 || innerEdgeTmp) {
        tmpRes = separateAreasStep(cur, cur, areas, segment);
        areas = tmpRes[0];
    }

    if (!tmpRes || !checkArea(areas[areas.length - 1])) {
        return false;
    } else {
        return true;
    }
}

function checkArea(area) {
    return checkSegregation(area) &&
           checkTetrisArea(area) &&
           checkTetris(area);
}

function checkTetris(area) {
    // For each area, try all possible positions of the tetris blocks contained
    // within and see if they fit (yes, solution verification is NP-complete!)
    var tetrisCells = [];

    for (var cell of area) {
        if (puzzle.cells[cell.x][cell.y].type == CELL_TYPE.TETRIS || puzzle.cells[cell.x][cell.y].type == CELL_TYPE.TETRIS_ROTATED) {
            tetrisCells.push(cell);
        }
    }

    // Use first-fit decreasing style optimisation
    tetrisCells.sort(function(a, b) {
        return puzzle.cells[b.x][b.y].tetrisArea - puzzle.cells[a.x][a.y].tetrisArea;
    });

    if (!findTetrisPlacement(area, tetrisCells)) {
        return false;
    } else {
        return true;
    }
}

// returns x for [bounds] cropped tetris layout after rotation by [ang] degrees
function tx(x, y, bounds, ang) {
    if (ang == 0) {
        return x + bounds[0];
    } else if (ang == 90) {
        return y + bounds[0];
    } else if (ang == 180) {
        return bounds[2] - x;
    } else if (ang == 270) {
        return bounds[2] - y;
    }
}

// returns y for [bounds] cropped tetris layout after rotation by [ang] degrees
function ty(x, y, bounds, ang) {
    if (ang == 0) {
        return y + bounds[1];
    } else if (ang == 90) {
        return bounds[3] - x;
    } else if (ang == 180) {
        return bounds[3] - y;
    } else if (ang == 270) {
        return x + bounds[1];
    }
}

function areaBounds(area) {
    var bounds = [Number.MAX_VALUE, Number.MAX_VALUE, 0, 0];

    for (var c of area) {
        bounds[0] = Math.min(bounds[0], c.x);
        bounds[1] = Math.min(bounds[1], c.y);
        bounds[2] = Math.max(bounds[2], c.x);
        bounds[3] = Math.max(bounds[3], c.y);
    }

    return bounds;
}

// Find a successful placement of tetris blocks specified in [cells] given the
// available area cells [area]
function findTetrisPlacement(area, cells) {
    if (cells.length == 0) return true;
    var cell = cells.shift();

    var bounds = puzzle.cells[cell.x][cell.y].tetrisBounds;
    var layout = puzzle.cells[cell.x][cell.y].tetris;

    // Try every possible viable placement
    var maxAng = puzzle.cells[cell.x][cell.y].type == CELL_TYPE.TETRIS_ROTATED ? 270 : 0;

    // For insertion points, use the bounding box of the area to deal with
    // shapes that don't have any blocks in the top-left part for an orientation
    // (see issue #2)
    var insertionPoints = area;

    for (var ang = 0; ang <= maxAng; ang += 90) {
        var xx = tx(0, 0, bounds, ang);
        var yy = ty(0, 0, bounds, ang);

        if (!layout[xx][yy]) {
            var bb = areaBounds(area);
            insertionPoints = new Set();

            for (var x = bb[0]; x <= bb[2]; x++) {
                for (var y = bb[1]; y <= bb[3]; y++) {
                    insertionPoints.add(point(x, y));
                }
            }

            break;
        }
    }

    for (var ang = 0; ang <= maxAng; ang += 90) {
        for (var topLeft of insertionPoints) {
            var viable = true;
            var remainingArea = new Set(area);

            for (var dx = 0; dx < 4 && viable; dx++) {
                for (var dy = 0; dy < 4 && viable; dy++) {
                    var xx = tx(dx, dy, bounds, ang);
                    var yy = ty(dx, dy, bounds, ang);

                    if (xx < bounds[0] || xx > bounds[2] || yy < bounds[1] || yy > bounds[3]) {
                        break;
                    }

                    if (xx >= bounds[0] && yy >= bounds[1] && xx <= bounds[2] && yy <= bounds[3] && layout[xx][yy]) {
                        var n = point(topLeft.x + dx, topLeft.y + dy);

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
    }

    return false;
}

function colorsCompatible(c1, c2) {
    return (c1.type != CELL_TYPE.SQUARE) ||
           (c2.type != CELL_TYPE.SQUARE) ||
           (c1.color == c2.color);
}

// Auxilary required nodes are an optimization feature for segregation puzzles.
// It contains the endpoints of each edge between differently colored cells.
// These edges must be visited for a correct solution and therefore its
// endpoints are required nodes in the path.
function determineAuxilaryRequired() {
    var aux = new Set();

    for (var x = 0; x < puzzle.width - 1; x++) {
        for (var y = 0; y < puzzle.height - 1; y++) {
            // Right side
            if (x < puzzle.width - 2 && !colorsCompatible(puzzle.cells[x][y], puzzle.cells[x + 1][y])) {
                aux.add(point(x + 1, y));
                aux.add(point(x + 1, y + 1));
            }

            // Bottom side
            if (y < puzzle.height - 2 && !colorsCompatible(puzzle.cells[x][y], puzzle.cells[x][y + 1])) {
                aux.add(point(x, y + 1));
                aux.add(point(x + 1, y + 1));
            }
        }
    }

    return aux;
}

function getNodesByType(type) {
    var nodes = [];

    for (var x = 0; x < puzzle.width; x++) {
        for (var y = 0; y < puzzle.height; y++) {
            if (puzzle.nodes[x][y].type == type) {
                nodes.push(point(x, y));
            }
        }
    }

    return nodes;
}

function getEdgesByType(type) {
    var edges = [];

    for (var x = 0; x < puzzle.width - 1; x++) {
        for (var y = 0; y < puzzle.height; y++) {
            if (puzzle.horEdges[x][y]==type) {
                edges.push(edge(x, y, ORIENTATION_TYPE.HOR));
            }
        }
    }

    for (var x = 0; x < puzzle.width; x++) {
        for (var y = 0; y < puzzle.height - 1; y++) {
            if (puzzle.verEdges[x][y]==type) {
                edges.push(edge(x, y, ORIENTATION_TYPE.VER));
            }
        }
    }

    return edges;
}

function findSolution(path, visited, required, edgeRequired, exitsRemaining, areas, segment) {
    if (!required) {
        required = determineAuxilaryRequired();

        for (var n of getNodesByType(NODE_TYPE.REQUIRED)) {
            required.add(n);
        }

        exitsRemaining = getNodesByType(NODE_TYPE.EXIT).length;

        // Extra processing stuff
        // Edge should be checked so we get edge set here.
        // We will check edge at checkRequiredEdges()
        edgeRequired = new Set();

        for (var n of getEdgesByType(EDGE_TYPE.REQUIRED)) {
            edgeRequired.add(n);
        }
    }

    if (!path || path.length == 0) {
        // If this is the first call, recursively try every starting node
        for (var n of getNodesByType(NODE_TYPE.START)) {
            var fullPath = findSolution([n], new Set([n]), required, edgeRequired, exitsRemaining, areas, segment);

            if (fullPath) {
                return fullPath;
            }
        }

        return false;
    } else {
        var cn = path[path.length - 1];

        var res = false;
        if (path.length >= 2) {
            var prevn = path[path.length - 2];

            res = separateAreasStep(prevn, cn, areas, segment);

            // Partial solution contains area that is already wrong, abort
            if (!res) {
                return false;
            }

            areas = res[0];
            segment = res[1];
        }

        // If we're at an exit node and the partial solution along with the last
        // area is correct, then the full solution is correct
        if (puzzle.nodes[cn.x][cn.y].type == NODE_TYPE.EXIT) {
            if (checkLastArea(prevn, cn, areas, segment) && checkRequiredNodes(path, required) && checkRequiredEdges(path, edgeRequired)) {
                return path;
            } else {
                exitsRemaining--;
            }
        }

        // If we've run out of exits, abort
        if (exitsRemaining == 0) return false;

        // Try all possibles routes from the latest node
        var candidates = getNextNodes(cn, visited, required);

        for (var n of candidates) {
            var newPath = path.slice();
            newPath.push(n);

            var newVisited = new Set(visited);
            newVisited.add(n);

            var fullPath = findSolution(newPath, newVisited, required, edgeRequired, exitsRemaining, areas, segment);

            if (fullPath) {
                return fullPath;
            }
        }

        return false;
    }
}
