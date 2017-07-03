The Witness Puzzle Solver (SPOILERS!)
=====================================

This is a tool for solving all of the non-environment puzzles in the video game
[The Witness](http://store.steampowered.com/app/210970/). It provides an
interface for inputting puzzles similar to the panels in the game. It finds the
simplest solution and displays it in the grid. You can also configure the solver
to only show part of the solution if you just need a hint.

You can try out the solver here:

https://overv.github.io/TheWitnessSolver/

Algorithm
---------

Currently a very simple branch-and-bound algorithm is used that walks through
all possible paths from each starting node and evaluates if the current path
forms a correct solution when it hits an exit node.

Even just verifying a solution for the puzzles with tetris blocks appears to be
an [NP-complete problem](https://en.wikipedia.org/wiki/Tetris#Computational_complexity)
so the algorithm is unlikely to become more efficient. Most of the effort should
probably be dedicated to finding heuristics for the bound conditions to reduce
the depth of the search tree.

This solver does not attempt to find the "simplest" solution, because that would
require an exhaustive search that eliminates many optimisation opportunities to
keep the performance reasonable.

The areas split up by the solution path are found incrementally, which means
that for every step in the path only the last area has to be reexamined. This
is much faster than running flood fill from scratch for every proposed solution
and allows for early termination decisions, because other areas are known to
longer change with future steps.

Similar to the first-fit decreasing bin packing algorithm, tetris puzzle
solutions are verified by trying to fit the largest tetris blocks within an area
first, which allows for detecting nonsensical solutions earlier. Note that
unlike the bin packing algorithm, all possible combinations will be attempted if
necessary.

### Prefer required neighbour nodes

If multiple unvisited neighbour nodes are available, try visiting the required
nodes first. This can avoid a lot of dead end solutions early on.

### Segregation optimization through auxilary required nodes

If differently colored squares are direct neighbours, then the edge between them
**must** be part of the correct solution path. That means that the endpoints of
that edge are required nodes in the path. By checking for these (extra) required
nodes in the solution check, the full segregation check doesn't need to run most
of the time, which saves a lot of time.

### Terminate a path if finished areas are already wrong

If an area that cannot be revisited already fails the segregation or tetris
checks then there is no point going on.

Rules
-----

The solver assumes the following rules considering the puzzle elements:

- Each node may only be visited once
- The path must begin at one of the starting nodes and end at one of the exit
nodes
- Each node with a black hexagon must be visited
- Each area enclosed by the path and the edge of the grid may not contain cells
with both white and black squares
- Enclosed areas must have the exact same area as the sum of areas of all tetris
blocks contained within (may be `0`)

There are also some rules that are not relevant to puzzles found in the original
game, but are relevant to this solver's implementation:

- White/black segregation cells are considered regular cells for solving the
tetris block placement
- Tetris block cells are considered uncolored cells for white/black segregation

To do
-----

- Make tetris solver to handle irregular grids
- Solve other puzzles
