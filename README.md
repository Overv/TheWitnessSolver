The Witness Puzzle Solver (SPOILERS!)
=====================================

This is a tool for solving all of the non-environment puzzles in the video game
[The Witness](http://store.steampowered.com/app/210970/). It provides an
interface for inputting puzzles similar to the panels in the game. It finds the
simplest solution and displays it in the grid. You can also configure the solver
to only show part of the solution if you just need a hint.

You can try out the solver here:

https://overv.github.io/TheWitnessSolver/

# Algorithm

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

# Rules

This is a list of the mechanics as implemented by this solver:

##### Path

The path must be a self-avoiding walk starting at a start node and ending at an end node

##### Hexagons

Nodes or edges with a hexagon *must* be included in the path

##### Squares

For every region R, all squares in R must share the same color.

##### Suns / Stars

For every region R, **if** a sun of color X in in R, **then** there must be **exactly two** elements of color X in R.

##### Tetris Pieces

For every region R, R must exactly accommodate all the tetris pieces represented in R.

##### Hollow Squares

For every region R, let H be the total number of hollow squares represented in the region (that is, groups just contribute their size, and the shape is ignored).
**For some** choice of H individual tetris blocks, R must pass tetris validation (the step described above) when these pieces are removed, **but not if fewer** than H blocks are removed.

##### Cancellation symbols

For every region R, let K denote the number of cancellation symbols in R.
**For some** choice of K (non-cancellation) elements from the region, validation must pass (that is, all the rules described above must pass) when these elements are removed, **but not if fewer** than K elements are removed.

# Notable implementation discrepancies

Here are some things that are different from the game:

* Perhaps most importantly, Cancellation symbols will not respect hexagons -- they only consider entities in the interiors of cells.
* Hollow tetris cubes are implemented *only* depending on the total amount of hollow blocks in a region, disregarding shape.
For the vast majority of puzzles in the game, this is acceptable.
It's not completely clear *how* respecting the shape of hollow squares would work, as there were very few puzzles in the game using this mechanic.
