# roll20-areaMapper

This is an open source script that's used on the Roll20 API platform (https://roll20.net), which is a site that hosts online table-top games. Roll20 provides some powerful features that are extremely laborious to use, so this script aims to automate and improve on what would not otherwise be possible.

A fundamental aspect of this is the use of the drawing tool as a primary mode for receiving user input. This approach required several polygon graph algorithms, which were both enticing and rewarding to solve.

##### See it in action! (click below for a video):
<a href="http://www.youtube.com/watch?feature=player_embedded&v=JMspDXJT9fA" target="_blank"><img src="http://img.youtube.com/vi/JMspDXJT9fA/0.jpg" 
alt="AreaMapper demo" width="100%" height="100%" border="10" /></a>

##### Features:
- Area maps are created and managed using a robust user interface and Roll20's drawing tools.
- User interface can be in whispers or in a handout.
- Areas are saved in state, and can be hidden and redrawn (on any page - even multiple pages simultaneously). Create as many areas as you want - it's easy to switch between them.
- Dynamic lighting is handled automatically.
- Doors, chests, and trapdoors have interactive logic so that players can toggle them. These can be locked, trapped, and hidden. Interacting with them results in animations that everyone can see.
- Assets (floor, wall, door, chest, and trapdoor images) can be imported via the user interface. They can also be edited through the user interface to fix unwanted border transparencies, bad centering, etc. It's really easy to change which assets an area is using.
- Unique assets can be used. This makes it really easy to import a map and use it as the floor image of an area.
- Blueprint mode is available.

##### Features not appearing in the video since they were implemented after it was made:
- Trapdoors.
- UX improvements.

##### Required libraries:
This requires another script I wrote for its visual alert animations. It can be found here: https://github.com/RandallDavis/roll20-visualAlertScript.

##### Discussion:
Participate in the the Roll20 forum post here: https://app.roll20.net/forum/post/2123439/script-areamapper#post-2123439
