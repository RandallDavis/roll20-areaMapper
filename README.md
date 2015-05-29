# roll20-areaMapper

This is an open source script that's used on the Roll20 API platform (https://roll20.net), which is a site that hosts online table-top games. Roll20 provides some powerful features that are extremely laborious to use, so this script aims to automate and improve on what would not otherwise be possible.

A fundamental aspect of this is the use of the drawing tool as a primary mode for receiving user input. This approach required several polygon graph algorithms, which were both enticing and rewarding to solve.

##### Progress as of version 0.1 (click below for a video):
<a href="http://www.youtube.com/watch?feature=player_embedded&v=QOcWWKUHCmQ" target="_blank"><img src="http://img.youtube.com/vi/QOcWWKUHCmQ/0.jpg" 
alt="Tutorial" width="100%" height="100%" border="10" /></a>

##### Required libraries:
This requires another script I wrote for its visual alert animations. It can be found here: https://github.com/RandallDavis/roll20-visualAlertScript.

##### Core design ideas:
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

##### Possibilites:
- Areas will certainly need a Z-order so that superimposing can be handled logically. Normally, you'd expect floors to be at the base layer, then walls, then doors, then objects, basically as a merging / layering between all of the areas. Another optional approach could be to situationally have different areas be on different "floors", and ditch the merging logic and impose a semi-transparent graying effect on floors that are below the active floor.

##### Implementation:
- All of the polygon logic should be handled as a clustered graph algorithm. For fun, don't do research on others' approaches to this, but do it from scratch.

![graph algorithms!](http://i.imgur.com/QUJJXA5.jpg)
