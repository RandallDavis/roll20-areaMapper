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
            
            //return an angle with respect to a specfic endpoint:
            this.angle = function(p) {
                var angle = (Math.atan2(b.y - a.y, b.x - a.x) + (2 * Math.PI)) % (2 * Math.PI);
                
                log('angle() logs:');
                log(this);
                log(p);
                log(angle);
                
                if('undefined' === p || a.x === p.x && a.y === p.y) {
                    log('using a');
                    //return angle with respect to a:
                    return angle;
                }
                
                log('using b');
                //return angle with respect to b:
                return (angle + (Math.PI)) % (2 * Math.PI);
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
            for(var pI = points.length - 1; pI >= 0; pI--) {
                for(var i = 0; i < points[pI][1].length; i++) {
                    if(points[pI][1][i] === iS) {
                        
                        //remove the segment reference:
                        points[pI][1].splice(i, 1);
                        
                        //fix i since an item was deleted:
                        i--;
                    } else if(points[pI][1][i] > iS) {
                        
                        //decrement segment index references, since a segment is being removed:
                        points[pI][1][i]--;
                    }
                }
            }
            
            //remove points that have no segments:
            for(var pI = points.length - 1; pI >= 0; pI--) {
                if(points[pI][1].length == 0) {
                    points.splice(pI, 1);
                }
            }
            
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
        
        //draws a segment (for debugging):
        drawSegment = function(s, color) {
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
                stroke: color,
                stroke_width: 3,
                _path: path
            });
        },
        
        //draws individual segments (for debugging):
        drawSegments = function() {
            segments.forEach(function(s) {
                drawSegment(s, '#0000ff');
            });
        },
        
        getBlob = function() {
            //find the smallest x points, and of those, take the greatest y:
            var iTopLeftPoint = 0;
            for(var i = 0; i < points.length; i++) {
                if((points[i][0].x < points[iTopLeftPoint][0].x)
                        || (points[i][0].x == points[iTopLeftPoint][0].x && points[i][0].y > points[iTopLeftPoint][0].y)) {
                    iTopLeftPoint = i;
                }
            };
            
            var iP = iTopLeftPoint; //index of current point
            var a = Math.PI / 2; //angle of prior segment; for first pass, initialize to facing up
            
            //constrain this to a loop for now to prevent infinite loop bugs in development; later this should be while new point != iTopLeftPoint:
            for(var tempI = 0; tempI < 16; tempI++) {
                log('---------------------');
                log('iteration: ' + tempI);
                log('iP: ' + iP);
                log(points[iP]);
            
                //find the longest segment originating from the current point that is the most counter-clockwise from the prior segment's angle:
                var s = 0;
                var chosenSegment = segments[points[iP][1][s]];
                var sAngle = chosenSegment.angle(points[iP][0]);
                var sLength = chosenSegment.length();
                
                log('chosenSegment:');
                log(chosenSegment);
                
                log('angles: ' + a + ', ' + sAngle);
                
                var sRelativeAngle = ((sAngle - a) + (2 * Math.PI)) % (2 * Math.PI);;
                
                log('relative angle of 0:');
                log(segments[points[iP][1][s]]);
                log(sRelativeAngle);
                
                
                
                //loop through the segments of this point:
                for(var iS = 1; iS < points[iP][1].length; iS++) {
                    var seg = segments[points[iP][1][iS]];
                    var segAngle = seg.angle(points[iP][0]);
                    
                    var relativeAngle = ((segAngle - a) + (2 * Math.PI)) % (2 * Math.PI);
                    
                    log('angles: ' + a + ', ' + segAngle);
                    
                    log('relative angle of ' + iS + ':');
                    log(seg);
                    log(relativeAngle);
                    
                    /*if((segAngle > sAngle)
                            || (segAngle >= sAngle && seg.length() > sLength)) {*/
                    if((relativeAngle > sRelativeAngle)
                            || (relativeAngle >= sRelativeAngle && seg.length() > sLength)) {
                        s = iS;
                        chosenSegment = segments[points[iP][1][s]];
                        sAngle = chosenSegment.angle(points[iP][0]);
                        sLength = chosenSegment.length();
                        sRelativeAngle = relativeAngle;
                    }
                }
                
                log('s: ' + s);
                log(points[iP][1][s]);
                
                
                
                
                //TODO: mark segment and point as being part of the blob
                
                log('chosen segment:');
                log(chosenSegment);
                drawSegment(chosenSegment, '#ff0000');
                
                //the next point should be the endpoint of the segment that wasn't the prior point:
                if(chosenSegment.a === points[iP][0]) {
                    iP = getItemIndex(points, chosenSegment.b, 0);
                } else {
                    iP = getItemIndex(points, chosenSegment.a, 0);
                }
                
                //the angle of the current segment will be used as a limit for finding the next segment:
                a = (sAngle + Math.PI) % (2 * Math.PI);
                
            }
            
            
            /*log('angle testing:');
            var z = new segment(new point(0,0), new point(1,0));
            log(z.angle(new point(0,0)));
            z = new segment(new point(0,0), new point(1,1));
            log(z.angle(new point(0,0)));
            z = new segment(new point(0,0), new point(0,1));
            log(z.angle(new point(0,0)));
            z = new segment(new point(0,0), new point(-1,1));
            log(z.angle(new point(0,0)));
            z = new segment(new point(0,0), new point(-1,0));
            log(z.angle(new point(0,0)));
            z = new segment(new point(0,0), new point(-1,-1));
            log(z.angle(new point(0,0)));
            z = new segment(new point(0,0), new point(0,-1));
            log(z.angle(new point(0,0)));
            z = new segment(new point(0,0), new point(1,-1));
            log(z.angle(new point(0,0)));*/
        };
        
        return {
            points: points,
            segments: segments,
            addPath: addPath,
            drawSegments: drawSegments,
            getBlob: getBlob
        };
    },
    
    handlePathAdd = function(path) {
        var a = path.get('_path');
        log(a);
        var g = new graph();
        g.addPath(a);
        log(g);
        g.drawSegments();
        g.getBlob();
    },
    
    /* polygon logic - end */
    
    /* nuts and bolts - begin */
    
    registerEventHandlers = function() {
        on('add:path', handlePathAdd);
        
        var g = new graph();
        g.addPath("[[\"M\",163,62],[\"L\",76,243],[\"L\",238,162],[\"L\",56,71],[\"L\",189,285],[\"L\",151,4],[\"L\",29,0],[\"L\",0,119],[\"L\",127,258],[\"L\",198,231]]");
        //g.addPath("[[\"M\",84,79],[\"L\",22,216],[\"L\",189,144],[\"L\",0,78],[\"L\",130,279],[\"L\",187,0],[\"L\",83,289]]");
        log(g);
        g.drawSegments();
        g.getBlob();
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
