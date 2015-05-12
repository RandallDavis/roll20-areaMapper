# roll20-areaMapper

Core design ideas:
- Create areas based on drawing tool unions.
- Expand areas based on drawing tool unions.
- Remove from areas based on drawing tool intersections.
- Floorplans and walls of an area can be managed separetely - walls are initially built around the border of an area, but use drawing tool intersections to create gaps in walls.
- Floors are constructed of larger tile sets, and negative space of those tiles are covered up with solid polygons (but some floors should instead be transparent).
- Areas can have doors, stateful objects, torches, etc.
- Doors can be dynamically sized and placed, using heuristics. Use drawing tool intersections to replace wall segments with doors. Where the intersection fails, place doors in open space.
- Draw walls as both dynamic lighting walls, and wall images.
- Areas as a whole can be rotated, resized, and moved.
- Areas / objects can be selected via a controller token that is placed above them. From there, areas / objects that match the spatial criteria are chosen between to identify the area / object that is being selected.
- Keep data out of objects so that copy / paste doesn't confuse anything.
- Any automatically drawn object (walls, floors, doors, etc.) can be cycled between available images / styling, and dynamically assigned Urls can be provided (maybe with an option to add these as a regular part of cycling options as opposed to a one-off).

Possibilites:
- Areas will certainly need a Z-order so that superimposing can be handled logically. Normally, you'd expect floors to be at the base layer, then walls, then doors, then objects, basically as a merging / layering between all of the areas. Another optional approach could be to situationally have different areas be on different "floors", and ditch the merging logic and impose a semi-transparent graying effect on floors that are below the active floor.

Implementation:
- All of the polygon logic should be handled as a clustered graph algorithm. For fun, don't do research on others' approaches to this, but do it from scratch.

![graph algorithms!](http://i.imgur.com/QUJJXA5.jpg)

Details that need to be explained to users:
- When drawing inner walls, paths are ignored if they aren't fully contained in the floorplan.
- When removing edge wall gaps, only complete gaps that are contained in the removal polygon are removed.
- In all edge wall logic, a heuristic is used for intersection / reversal-of-intersection logic that determines each path's orientation. This is done to speed up the algorithm. There is a trade-off between the number of points that are considered on the floorplan edge, such that the more points considered the less accuracy in the heuristic, but the more features that can be had with overlapping paths. The main thing that needs to be conveyed is that when removing edge walls, it is often better to use polygons that capture fewer points - if an instruction is being ignored, it's probably capturing too many overlapping points from different paths.
- Freehand drawing is supported, but having the vast number of points has a severe impact on performance (as well as the size of the state object).
