The Witness Puzzle Solver (SPOILERS!)
=====================================

This is a tool for solving all of the non-environment puzzles in the video game
[The Witness](http://store.steampowered.com/app/210970/). It provides an
interface for inputting puzzles similar to the panels in the game. It finds the
simplest solution and displays it in the grid.

Algorithm
---------

Currently a very simple branch-and-bound algorithm is used that walks through
all possible paths from each starting node and evaluates if the current path
forms a correct solution when it hits an exit node.

Even just verifying a solution for the puzzles with tetris blocks appears to be
an [NP-complete problem](https://en.wikipedia.org/wiki/Tetris#Computational_complexity)
so the algorithm is unlikely to more efficient. Most of the effort should
probably be dedicated to finding heuristics for the bound conditions to reduce
the depth of the search tree.

Rules
-----

The solver assumes the following rules considering the puzzle elements:

- Each node may only be visited once
- The path must begin at one of the starting nodes and end at one of the exit
nodes
- Each node with a black hexagon must be visited
- Each area enclosed by the path and the edge of the grid may not contain cells
with both white and black squares

To do
-----

- Visually show the solution path
- Find the simplest solution (least amount of turns)
- Solve puzzles with black/white square segregation
- Solve puzzles with tetris blocks (static and with rotation)
- Solve other puzzles