// Recalculate the area and top-left anchor of the tetris layout in cell (x, y)
function updateTetrisLayoutProperties(x, y) {
    cellTetrisAreas[x][y] = 0;
    cellTetrisBounds[x][y] = [Number.MAX_VALUE, Number.MAX_VALUE, 0, 0];

    for (var xx = 0; xx < 4; xx++) {
        for (var yy = 0; yy < 4; yy++) {
            cellTetrisAreas[x][y] += +cellTetrisLayouts[x][y][xx][yy];

            if (cellTetrisLayouts[x][y][xx][yy]) {
                cellTetrisBounds[x][y][0] = Math.min(cellTetrisBounds[x][y][0], xx);
                cellTetrisBounds[x][y][1] = Math.min(cellTetrisBounds[x][y][1], yy);
                cellTetrisBounds[x][y][2] = Math.max(cellTetrisBounds[x][y][2], xx);
                cellTetrisBounds[x][y][3] = Math.max(cellTetrisBounds[x][y][3], yy);
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

function checkRequiredNodes(path, required) {
    // Check if all required nodes are part of the path
    for (var n of required) {
        if (path.indexOf(n) == -1) {
            return false;
        }
    }

    return true;
}

function isOuterNode(n) {
    return n.x == 0 || n.y == 0 || n.x == gridWidth - 1 || n.y == gridHeight - 1;
}

function getLeftRight(cur, next) {
    var left, right;

    if (next.x > cur.x) {
        return [
            node(cur.x, cur.y - 1),
            node(cur.x, cur.y)
        ];
    } else if (next.x < cur.x) {
        return [
            node(next.x, next.y),
            node(next.x, next.y - 1)
        ];
    }

    if (next.y > cur.y) {
        return [
            node(cur.x, cur.y),
            node(cur.x - 1, cur.y)
        ];
    } else if (next.y < cur.y) {
        return [
            node(next.x - 1, next.y),
            node(next.x, next.y)
        ];
    }
}

function checkSegregation(area) {
    var color = CELL_TYPE.NONE;

    for (var c of area) {
        if (cellTypes[c.x][c.y] == CELL_TYPE.BLACK || cellTypes[c.x][c.y] == CELL_TYPE.WHITE) {
            if (!colorsCompatible(color, cellTypes[c.x][c.y])) {
                return false;
            }

            color = cellTypes[c.x][c.y];
        }
    }

    return true;
}

function checkTetrisAreas(area) {
    var areaCells = 0;
    var tetrisBlocks = 0;

    for (var c of area) {
        areaCells++;

        if (cellTypes[c.x][c.y] == CELL_TYPE.TETRIS || cellTypes[c.x][c.y] == CELL_TYPE.TETRIS_ROTATED) {
            tetrisBlocks += cellTetrisAreas[c.x][c.y];
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

        for (var x = 0; x < gridWidth - 1; x++) {
            for (var y = 0; y < gridHeight - 1; y++) {
                areas[0].add(node(x, y));
            }
        }

        segment = [];
    }

    // Process new segments
    if (isOuterNode(last)) {
        // outer -> outer counts as outer -> inner -> outer if it crosses an
        // inner edge. This is an edge case on small puzzles.
        var innerEdge =
            segment.length == 1 &&
            (
                (segment[0].x != last.x && last.y > 0 && last.y < gridHeight - 1) ||
                (segment[0].y != last.y && last.x > 0 && last.x < gridWidth - 1)
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

                if (n.x > 0) visitList.push(node(n.x - 1, n.y));
                if (n.y > 0) visitList.push(node(n.x, n.y - 1));
                if (n.x < gridWidth - 1) visitList.push(node(n.x + 1, n.y));
                if (n.y < gridHeight - 1) visitList.push(node(n.x, n.y + 1));
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

    // If the current node is an exit node, also check the last area
    if (nodeTypes[cur.x][cur.y] == NODE_TYPE.EXIT) {
        // If there is currently a segment going on, skip ahead a node to arrive
        // at the areas if the solution were to end here
        var innerEdgeTmp =
            (cur.x != last.x && last.y > 0 && last.y < gridHeight - 1) ||
            (cur.y != last.y && last.x > 0 && last.x < gridWidth - 1);

        var tmpRes = false;
        if (segment.length > 1 || innerEdgeTmp) {
            tmpRes = separateAreasStep(cur, cur, areas, segment);
        }

        if (!tmpRes && !checkArea(areas[areas.length - 1])) {
            return false;
        }
    }

    return [areas, segment];
}

function checkArea(area) {
    return checkSegregation(area) &&
           checkTetrisAreas(area) &&
           checkTetris(area);
}

function checkTetris(area) {
    // For each area, try all possible positions of the tetris blocks contained
    // within and see if they fit (yes, solution verification is NP-complete!)
    var tetrisCells = [];

    for (var cell of area) {
        if (cellTypes[cell.x][cell.y] == CELL_TYPE.TETRIS || cellTypes[cell.x][cell.y] == CELL_TYPE.TETRIS_ROTATED) {
            tetrisCells.push(cell);
        }
    }

    // Use first-fit decreasing style optimisation
    tetrisCells.sort(function(a, b) {
        return cellTetrisAreas[b.x][b.y] - cellTetrisAreas[a.x][a.y];
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

// Find a successful placement of tetris blocks specified in [cells] given the
// available area cells [area]
function findTetrisPlacement(area, cells) {
    if (cells.length == 0) return true;
    var cell = cells.shift();

    var bounds = cellTetrisBounds[cell.x][cell.y];
    var layout = cellTetrisLayouts[cell.x][cell.y];

    // Try every possible viable placement
    var maxAng = cellTypes[cell.x][cell.y] == CELL_TYPE.TETRIS_ROTATED ? 270 : 0;

    for (var ang = 0; ang <= maxAng; ang += 90) {
        for (var topLeft of area) {
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
                        var n = node(topLeft.x + dx, topLeft.y + dy);

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
    return (c1 != CELL_TYPE.BLACK && c1 != CELL_TYPE.WHITE) ||
           (c2 != CELL_TYPE.BLACK && c2 != CELL_TYPE.WHITE) ||
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

function findSolution(path, visited, required, exitsRemaining, areas, segment) {
    if (!required) {
        required = determineAuxilaryRequired();

        for (var n of getNodesByType(NODE_TYPE.REQUIRED)) {
            required.add(n);
        }

        exitsRemaining = getNodesByType(NODE_TYPE.EXIT).length;
    }

    if (!path || path.length == 0) {
        // If this is the first call, recursively try every starting node
        for (var n of getNodesByType(NODE_TYPE.START)) {
            var fullPath = findSolution([n], new Set([n]), required, exitsRemaining, areas, segment);

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

        // If we're at an exit node and the partial solution is correct then
        // this is a correct full solution
        if (nodeTypes[cn.x][cn.y] == NODE_TYPE.EXIT) {
            if (checkRequiredNodes(path, required)) {
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

            var fullPath = findSolution(newPath, newVisited, required, exitsRemaining, areas, segment);

            if (fullPath) {
                return fullPath;
            }
        }

        return false;
    }
}