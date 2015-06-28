# roll20-areaMapper

This is an open source script that's used on the Roll20 API platform (https://roll20.net), which is a site that hosts online table-top games. Roll20 provides some powerful features that are extremely laborious to use, so this script aims to automate and improve on what would not otherwise be possible.

A fundamental aspect of this is the use of the drawing tool as a primary mode for receiving user input. This approach required several polygon graph algorithms, which were both enticing and rewarding to solve.

##### Progress as of version 0.100 (click below for a video):
<a href="http://www.youtube.com/watch?feature=player_embedded&v=QOcWWKUHCmQ" target="_blank"><img src="http://img.youtube.com/vi/QOcWWKUHCmQ/0.jpg" 
alt="Tutorial" width="100%" height="100%" border="10" /></a>

##### Features:
- Area maps are created and managed using a robust user interface and Roll20's drawing tools.
- User interface can be set to be in whispers or a handout.
- Areas are saved in state, and can be hidden, redrawn (on any page - even multiple pages simultaneously).
- Dynamic lighting is handled automatically.
- Doors and chests (and other objects down the road) have interactive logic so that players can toggle them. These can be locked, trapped, and hidden. Interacting with them results in animations that everyone can see.
- Assets (floor, wall, door, and chest images) can be imported via the user interface. They can also be edited through the user interface to account for unwanted transparencies, bad centering, etc.
- Unique assets can be used in an area. This makes it really easy to import a map and use it as the floor image of an area.

##### Required libraries:
This requires another script I wrote for its visual alert animations. It can be found here: https://github.com/RandallDavis/roll20-visualAlertScript.
