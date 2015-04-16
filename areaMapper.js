var APIAreaMapper = APIAreaMapper || (function() {
   
   /* core - begin */
    
    var version = 0.1,
        schemaVersion = 0.1,
        
    checkInstall = function() {
        
        log('-=> Area Mapper v'+version+' <=-');
        
        if(!_.has(state,'APIAreaMapper') || state.APIAreaMapper.version !== schemaVersion) {
            log('APIAreaMapper: Resetting state.');
            state.APIAreaMapper = {
                version: schemaVersion
            };
        }
    },
    
    inheritPrototype = function(childObject, parentObject) {
        var copyOfParent = Object.create(parentObject.prototype);
        copyOfParent.constructor = childObject;
        childObject.prototype = copyOfParent;
    },
    
    typedObject = function() {
        this._type = new Array();
    };
    
    typedObject.prototype = {
        constructor: typedObject,
        
        isType: function(type) {
            var found = false;
           
            this._type.forEach(function(typeValue) {
                if(type == typeValue) {
                    found = true;
                    return;
                }
            });
           
           return found;
        },
        
        getProperty: function(property) {
            if(!property) {
                throw new Error('No property specified in getProperty().');
            }
            
            if('undefined' === typeof(this['_' + property])) {
                return null;
            }
            
            return this['_' + property];
        },
        
        setProperty: function(property, value) {
            if(!property) {
                throw new Error('No property specified in setProperty().');
            }
            
            switch(property) {
                default:
                    throw new Error(property + ' is unknown in setProperty().');
                    break;
            }
        },
        
        initializeCollectionProperty: function(property) {
            if(!property) {
                throw new Error('No property specified in initializeCollectionProperty().');
            }
            
            switch(property) {
                default:
                    throw new Error(property + ' is unknown in initializeCollectionProperty().');
                    break;
            }
        }
    };
    
    /* core - end */
    
    /* polygon logic - begin */
    
    var graph = function() {
        
        var points = [], //array of [point, [segment index]]
            segments = [], //array of segment
        
        point = function(x, y) {
            this.x = x;
            this.y = y;
        },
        
        //segment between points a and b:
        segment = function(a, b) {
            this.a = a;
            this.b = b;
                
            this.length = function() {
                var xDist = b.x - a.x;
                var yDist = b.y - a.y;
                return Math.sqrt((xDist * xDist) + (yDist * yDist));
            };
        },
        
        //find item in container; if position is defined, it represents the index in a nested array:
        getItemIndex = function(container, item, position) {
            var index;
            
            for(var i = 0; i < container.length; i++) {
                if(item === (((container.length > 0) && ('undefined' !== typeof(position))) ? container[i][position] : container[i])) {
                    index = i;
                    break;
                }
            }
            
            return index;
        },
        
        addPoint = function(point) {
            var index = getItemIndex(points, point, 0);
        
            if('undefined' === typeof(index)) {
                //add point and return its index:
                return points.push([point, []]) - 1;
            }
            
            return index;
        },
        
        //it's illogical to return a segment's index, becuse it might have been broken into pieces:
        //it's also inconvient to do early detection of the segment being new, because of segment breaking:
        addSegment = function(s) {
            var newSegments = [];
            var brokenSegments = [];
            var intersectingSegments = [];
            
            newSegments.push(s);
            
            //find segments that the new segment intersects:
            segments.forEach(function(seg) {
                if(segmentsIntersect(s, seg)) {
                    intersectingSegments.push(seg);
                }
            });
            
            //break segment against all intersecting segments and remove intersecting segments:
            intersectingSegments.forEach(function(seg) {
               
                //loop through new segments to look for intersections:
                for(var i = 0; i < newSegments.length; i++) {
                   
                    //because we're breaking new segments, we have to retest for intersection:
                    var intersectionPoint = segmentsIntersect(newSegments[i], seg);
                    if(intersectionPoint) {
                        
                        //create broken segments out of old segment that was intersected:
                        brokenSegments.push(new segment(seg.a, intersectionPoint));
                        brokenSegments.push(new segment(intersectionPoint, seg.b));
                        
                        //remove the segment that was intersected from the graph:
                        removeSegment(seg);
                        
                        //create new broken segments:
                        newSegments.unshift(new segment(newSegments[i].a, intersectionPoint));
                        newSegments.unshift(new segment(intersectionPoint, newSegments[i + 1].b));
                        
                        //remove the new segment that was just broken:
                        newSegments.splice(i + 2, 1);
                        
                        //adjust the loop to bypass the broken newSegments that were already tested against seg:
                        i++;
                    }
                }
            });
            
            //add old broken segments:
            brokenSegments.forEach(function(seg) {
                var iS = segments.push(seg) - 1;
                var iPa = addPoint(seg.a);
                var iPb = addPoint(seg.b);
                points[iPa][1].push(iS);
                points[iPb][1].push(iS);
            });
            
            //add new segments:
            newSegments.forEach(function(seg) {
                var iS = segments.push(seg) - 1;
                var iPa = addPoint(seg.a);
                var iPb = addPoint(seg.b);
                points[iPa][1].push(iS);
                points[iPb][1].push(iS);
            });
        },
        
        removeSegment = function(segment) {
            var iS = getItemIndex(segments, segment);
            
            //remove segment from points:
            //TODO: if points reference 0 segments, remove them
            points.forEach(function(p) {
                pointSegments = p[1];
                for(var i = 0; i < pointSegments.length; i++) {
                    if(pointSegments[i] === iS) {
                        pointSegments.splice(i, 1);
                        break;
                    }
                }
            });
            
            //remove segment from segments:
            segments.splice(iS, 1);
        },
        
        //this is a modified version of https://gist.github.com/Joncom/e8e8d18ebe7fe55c3894
        segmentsIntersect = function(s1, s2) {
            //exclude segments with shared endpoints:
            if(s1.a === s2.a || s1.a === s2.b || s1.b === s2.a || s1.b === s2.b) {
                return null;
            }
            
            var s1_x = s1.b.x - s1.a.x;
            var s1_y = s1.b.y - s1.a.y;
            var s2_x = s2.b.x - s2.a.x;
            var s2_y = s2.b.y - s2.a.y;
            
            var s = (-s1_y * (s1.a.x - s2.a.x) + s1_x * (s1.a.y - s2.a.y)) / (-s2_x * s1_y + s1_x * s2_y);
            var t = (s2_x * (s1.a.y - s2.a.y) - s2_y * (s1.a.x - s2.a.x)) / (-s2_x * s1_y + s1_x * s2_y);
            
            if(s >= 0 && s <= 1 && t >= 0 && t <= 1) {
                return new point(s1.a.x + (t * s1_x), s1.a.y + (t * s1_y));
            }
         
            return null;
        },
        
        addPath = function(path) {
            path = JSON.parse(path);
            
            if(path && path.length > 1) {
                
                var pStart, //start point
                    pPrior, //prior point
                    iPrior; //index of prior point
                
                path.forEach(function(pCurrent) {
                    
                    //overwrite pCurrent with parsed out data:
                    var pCurrent = new point(pCurrent[1], pCurrent[2]); //current point
                    
                    var iCurrent = addPoint(pCurrent); //index of current point
                    
                    if(pPrior) {
                        addSegment(new segment(pPrior, pCurrent));
                    } else {
                        pStart = pCurrent;
                    }
                    
                    pPrior = pCurrent;
                    iPrior = iCurrent;
                });
                
                //close the polygon if it isn't closed already:
                if(pPrior !== pStart) {
                    addSegment(new segment(pPrior, pStart));
                }
            }
        },
        
        //draws individual segments (for debugging):
        drawSegments = function() {
            segments.forEach(function(s) {
                var isPositiveSlope = (((s.b.y - s.a.y) === 0) || (((s.b.x - s.a.x) / (s.b.y - s.a.y)) >= 0));
                var top = Math.min(s.a.y, s.b.y);
                var left = Math.min(s.a.x, s.b.x);
                var path;
                
                //put it somewhere we can see it:
                top += 200;
                left += 200;
                
                //create a path for a segment from A to B relative to (left,top):
                if(isPositiveSlope) {
                    if(s.a.x > s.b.x) {
                        path = '[[\"M\",' + Math.abs(s.a.x - s.b.x) + ',' + Math.abs(s.a.y - s.b.y) + '],[\"L\",0,0]]';
                    } else {
                        path = '[[\"M\",0,0],[\"L\",' + Math.abs(s.b.x - s.a.x) + ',' + Math.abs(s.b.y - s.a.y) + ']]';
                    }
                } else {
                    if(s.a.x > s.b.x) {
                        path = '[[\"M\",' + Math.abs(s.a.x - s.b.x) + ',0],[\"L\",0,' + Math.abs(s.b.y - s.a.y) + ']]';
                    } else {
                        path = '[[\"M\",0,' + Math.abs(s.a.y - s.b.y) + '],[\"L\",' + Math.abs(s.b.x - s.a.x) + ',0]]';
                    }
                }
                
                //create a segment path:
                createObj('path', {
                    layer: 'objects',
                    pageid: Campaign().get('playerpageid'),
                    top: top,
                    left: left,
                    stroke: '#000000',
                    stroke_width: 3,
                    _path: path
                });
            });
        };
        
        return {
            points: points,
            segments: segments,
            addPath: addPath,
            drawSegments: drawSegments
        };
    },
    
    handlePathAdd = function(path) {
        var a = path.get('_path');
        log(a);
        var g = new graph();
        g.addPath(a);
        log(g);
        g.drawSegments();
    },
    
    /* polygon logic - end */
    
    /* nuts and bolts - begin */
    
    registerEventHandlers = function() {
        on('add:path', handlePathAdd);
        
        var g = new graph();
        g.addPath("[[\"M\",163,62],[\"L\",76,243],[\"L\",238,162],[\"L\",56,71],[\"L\",189,285],[\"L\",151,4],[\"L\",29,0],[\"L\",0,119],[\"L\",127,258],[\"L\",198,231]]");
        log(g);
        g.drawSegments();
    };
    
    //expose public functions:
    return {
        checkInstall: checkInstall,
        registerEventHandlers: registerEventHandlers
    };
    
    /* nuts and bolts - end */
    
})();
    

on('ready', function() {
    'use strict';

    APIAreaMapper.checkInstall();
    APIAreaMapper.registerEventHandlers();
});
