// Github:    https://github.com/RandallDavis/roll20-areaMapper
// By:        Rand Davis
// Contact:   https://app.roll20.net/users/163846/rand

var APIAreaMapper = APIAreaMapper || (function() {
   
    /* core - begin */
    
    var version = 0.140,
        schemaVersion = 0.045,
        buttonBackgroundColor = '#CC1869',
        buttonGreyedColor = '#8D94A9',
        buttonHighlightLinkColor = '#D6F510',
        buttonHighlightInactiveColor = '#858789',
        buttonHighlightActiveColor = '#1810F5',
        buttonHighlightPositiveColor = '#29FF4D',
        buttonHighlightNegativeColor = '#8629FF',
        mainBackgroundColor = '#3D8FE1',
        headerBackgroundColor = '#386EA5',
        notificationBackgroundColor = '#64EED7',
        lockedTagColor = '#E5DB50',
        trappedTagColor = '#E2274C',
        hiddenTagColor = '#277EE2',
        closedDoorAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8543193/5XhwOpMaBUS_5B444UNC5Q/thumb.png?1427665106',
        openDoorAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8543205/QBOWp1MHHlJCrPWn9kcVqQ/thumb.png?1427665124',
        padlockAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8546285/bdyuCfZSGRXr3qrVkcPkAg/thumb.png?1427673372',
        skullAlertPic = 'https://s3.amazonaws.com/files.d20.io/images/8779089/aM1ujMQboacuc2fEMFk7Eg/thumb.png?1428784948',
        wallThickness = 14,
        wallLengthExtension = 12,
        doorThickness = 20,
        doorLengthExtension = -26,
        
    checkInstall = function() {
        
        log('-=> Area Mapper v'+version+' <=-');
        
        //TODO: state resets shouldn't destroy areas or preferences, and needs the ability to convert them to newer versions to prevent backward compatibile code elsewhere:
        if(!_.has(state,'APIAreaMapper') || state.APIAreaMapper.version !== schemaVersion) {
            log('APIAreaMapper: Resetting state.');
            state.APIAreaMapper = {
                version: schemaVersion,
                areas: [],
                areaInstances: [],
                activeArea: null,
                blueprintFloorPolygonColor: '#A3E1E4',
                blueprintEdgeWallGapsPathColor: '#D13583',
                blueprintInnerWallsPathColor: '#3535D1',
                blueprintDoorPathColor: '#EC9B10',
                blueprintChestPathColor: '#666666',
                floorAssets: [
                        ['https://s3.amazonaws.com/files.d20.io/images/48971/thumb.jpg?1340229647',0,0,1,1,0,0],
                        ['https://s3.amazonaws.com/files.d20.io/images/224431/2KRtd2Vic84zocexdHKSDg/thumb.jpg?1348140031',0,0,1,1,0,0],
                        ['https://s3.amazonaws.com/files.d20.io/images/170063/-IZTPfD81DHYpTbzvEUyAQ/thumb.png?1345800193',0,0,1,1,0,0],
                        ['https://s3.amazonaws.com/files.d20.io/images/30830/thumb.png?1339416039',0,0,1,1,0,0],
                        ['https://s3.amazonaws.com/files.d20.io/images/2830294/BaNT6qoN5O0WRiY3TS0azA/thumb.png?1390392180',0,0,1,1,0,0]
                    ],
                wallAssets: [
                        [['https://s3.amazonaws.com/files.d20.io/images/9585786/x1-hhxavuLoUjMsgA5vYdA/thumb.png?1432007204',0,1,0.8360173141910751,0.9705901479276444,0,0],
                            ['https://s3.amazonaws.com/files.d20.io/images/7068/thumb.png?1336366825',0,0,1.2399379256250003,1.3534965970312505,0,-4]],
                        [['https://s3.amazonaws.com/files.d20.io/images/452469/9KJ1s2PJhuMbDICeYETXZQ/thumb.png?1355660278',0,0,3.386354940899389,1.0605,0,5],
                            ['https://s3.amazonaws.com/files.d20.io/images/7068/thumb.png?1336366825',0,0,1.2399379256250003,1.3534965970312505,0,-4]]
                    ],
                doorAssets: [
                        [['https://s3.amazonaws.com/files.d20.io/images/6951/thumb.png?1336359665',0,0,1.2775092847093634,1.3807018786315788,0,-2],
                            ['https://s3.amazonaws.com/files.d20.io/images/7068/thumb.png?1336366825',0,0,1.2399379256250003,1.3534965970312505,0,-4]]
                    ],
                chestAssets: [
                        [['https://s3.amazonaws.com/files.d20.io/images/7962/thumb.png?1336489213',0,0,1.1025,0.9523809523809523,0,-2],
                            ['https://s3.amazonaws.com/files.d20.io/images/2839308/_RR8niUb3sTQgLSoxDhM4g/thumb.png?1390469385',0,0,1,1.0396039603960396,0,-1]]
                    ]
            };
        } 
        
        resetTemporaryState();
    },
    
    resetTemporaryState = function() {
        hideAssetManagementEditModal();
        
        delete state.APIAreaMapper.tempIgnoreDrawingEvents;
        delete state.APIAreaMapper.recordAreaMode;
        delete state.APIAreaMapper.playerId;
        delete state.APIAreaMapper.playerName;
        delete state.APIAreaMapper.uiWindow;
        delete state.APIAreaMapper.falseSelection;
        delete state.APIAreaMapper.chestReposition;
        delete state.APIAreaMapper.globalAssetManagement;
        delete state.APIAreaMapper.globalAssetEdit;
        
        //reset the handout:
        if(state.APIAreaMapper.handoutUi) {
            state.APIAreaMapper.uiWindow = 'mainMenu';
            followUpAction = [];
            followUpAction.refresh = true;
            processFollowUpAction(followUpAction);
        }
    },
    
    inheritPrototype = function(childObject, parentObject) {
        var copyOfParent = Object.create(parentObject.prototype);
        copyOfParent.constructor = childObject;
        childObject.prototype = copyOfParent;
    },
    
    typedObject = function() {
        this._type = [];
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
    
    //note: this is a simple, non-polymorphic datatype for performance purposes:
    var point = function(x, y) {
        this.x = x;
        this.y = y;
        
        this.equals = function(comparedPoint) {
            return (this.x === comparedPoint.x && this.y === comparedPoint.y);
        };
    },
    
    //angle object to simplify comparisons with epsilons:
    //note: this is a simple, non-polymorphic datatype for performance purposes:
    angle = function(radians) {
        this.radians = radians;
        
        this.equals = function(comparedRadians) {
            return Math.round(this.radians * 10000) == Math.round(comparedRadians * 10000);
        };
        
        this.lessThan = function(comparedRadians) {
            return Math.round(this.radians * 10000) < Math.round(comparedRadians * 10000);
        };
        
        this.greaterThan = function(comparedRadians) {
            return Math.round(this.radians * 10000) > Math.round(comparedRadians * 10000);
        };
        
        this.subtract = function(subtractedRadians) {
            return new angle(((this.radians - subtractedRadians) + (2 * Math.PI) + 0.000001) % (2 * Math.PI));
        };
    },
    
    //segment between points a and b:
    //note: this is a simple, non-polymorphic datatype for performance purposes:
    segment = function(a, b) {
        this.a = a;
        this.b = b;
        
        this.equals = function(comparedSegment) {
            return (this.a.equals(comparedSegment.a) && this.b.equals(comparedSegment.b))
                    || (this.a.equals(comparedSegment.b) && this.b.equals(comparedSegment.a));
        };
            
        this.length = function() {
            var xDist = this.b.x - this.a.x;
            var yDist = this.b.y - this.a.y;
            return Math.sqrt((xDist * xDist) + (yDist * yDist));
        };
        
        this.midpoint = function() {
            return new point(this.a.x + ((this.b.x - this.a.x) / 2), this.a.y + ((this.b.y - this.a.y) / 2));
        };
        
        //return an angle with respect to a specfic endpoint:
        this.angle = function(p) {
            var radians = (Math.atan2(this.b.y - this.a.y, this.b.x - this.a.x) + (2 * Math.PI)) % (2 * Math.PI);
            
            if(this.b.x === p.x && this.b.y === p.y) {
                
                //use angle with respect to b:
                radians = (radians + (Math.PI)) % (2 * Math.PI);
            }
            
            return new angle(radians);
        };
        
        this.angleDegrees = function(p) {
            return this.angle(p).radians * 180 / Math.PI;
        };
    },
    
    pointIntersectsSegment = function(s, p) {
        
        //boxing logic:
        var xMin = Math.min(s.a.x, s.b.x);
        var yMin = Math.min(s.a.y, s.b.y);
        var xMax = Math.max(s.a.x, s.b.x);
        var yMax = Math.max(s.a.y, s.b.y);
        if(p.x < Math.min(s.a.x, s.b.x)
                || p.y < Math.min(s.a.y, s.b.y)
                || p.x > Math.max(s.a.x, s.b.x)
                || p.y > Math.max(s.a.y, s.b.y)) {
            return null;
        }
        
        //test to see if p is on the line created by s:
        var m = (s.b.y - s.a.y) / (s.b.x - s.a.x);
        var b = s.a.y - (m * s.a.x);
        
        return (Math.abs(p.y - ((m * p.x) + b)) < 0.0001);
    },
    
    //this is a modified version of https://gist.github.com/Joncom/e8e8d18ebe7fe55c3894
    segmentsIntersect = function(s1, s2) {
        
        //exclude segments with shared endpoints:
        if(s1.a.equals(s2.a) || s1.a.equals(s2.b) || s1.b.equals(s2.a) || s1.b.equals(s2.b)) {
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
    
    
    path = function() {
        typedObject.call(this);
        this._type.push('path');
        this.points = []; //don't use getter/setter mechanism for the purpose of efficiency
        this.segments = []; //don't use getter/setter mechanism for the purpose of efficiency
    };
    
    inheritPrototype(path, typedObject);
    
    path.prototype.getPointIndex = function(p) {
        for(var i = 0; i < this.points.length; i++) {
            if(p.equals(this.points[i][0])) {
                return i;
            }
        }
        
        return;
    };
    
    path.prototype.getSegmentIndex = function(s) {
        for(var i = 0; i < this.segments.length; i++) {
            if(s.equals(this.segments[i])) {
                return i;
            }
        }
        
        return;
    };
    
    path.prototype.addPoint = function(p) {
        var index = this.getPointIndex(p);
        
        if('undefined' === typeof(index)) {
            
            //add point and return its index:
            return this.points.push([p, []]) - 1;
        }
        
        return index;
    };
    
    path.prototype.removeSegment = function(s) {
        
        var iS = this.getSegmentIndex(s);
        
        //remove segment from points:
        for(var pI = this.points.length - 1; pI >= 0; pI--) {
            for(var i = 0; i < this.points[pI][1].length; i++) {
                if(this.points[pI][1][i] === iS) {
                    
                    //remove the segment reference:
                    this.points[pI][1].splice(i, 1);
                    
                    //fix i since an item was deleted:
                    i--;
                } else if(this.points[pI][1][i] > iS) {
                    
                    //decrement segment index references, since a segment is being removed:
                    this.points[pI][1][i]--;
                }
            }
        }
        
        //remove segment from segments:
        this.segments.splice(iS, 1);
    };
    
    path.prototype.convertRawPathToPath = function(rawPath, top, left, isFromEvent) {
        var pathPoints = [],
            rawPathParsed = JSON.parse(rawPath);
        
        //if the path is from an event, the top/left is relative to the height/width of the path and needs to be corrected:
        if(isFromEvent) {
            var maxX = 0,
                maxY = 0;
                
            rawPathParsed.forEach(function(pRaw) {
                //TODO: handle types other than M and L:
                var p = new point(pRaw[1], pRaw[2]);
                pathPoints.push(p);
                
                //find the height and width as we loop through the points:
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }, this);
            
            //fix top/left:
            top -= maxY / 2;
            left -= maxX / 2;
            
            //apply corrected top/left offsets to points:
            pathPoints.forEach(function(p) {
                p.x += left;
                p.y += top;
            }, this);
        }
        //if the path isn't from an event, the top/left can be interpreted literally and can be applied while creating the points:
        else {
            rawPathParsed.forEach(function(pRaw) {
                //TODO: handle types other than M and L:
                pathPoints.push(new point(pRaw[1] + left, pRaw[2] + top));
            }, this);
        }
        
        return pathPoints;
    };
    
    path.prototype.addRawPath = function(rawPath, top, left, isFromEvent) {
        var pathPoints = this.convertRawPathToPath(rawPath, top, left, isFromEvent);
        return this.addPointsPath(pathPoints);
    };
    
    path.prototype.addPointsPath = function(pathPoints) {
        if(!(pathPoints && pathPoints.length > 1)) {
            return;
        }
        
        var hadIntersections = false;
        
        var pStart, //start point
            pPrior; //prior point
        
        pathPoints.forEach(function(pCurrent) {
            var iCurrent = this.addPoint(pCurrent); //index of current point
            
            if(pPrior) {
                var result = this.addSegment(new segment(pPrior, pCurrent));
                
                if(result) {
                    hadIntersections = hadIntersections || result.hadIntersections;
                }
            } else {
                pStart = pCurrent;
            }
            
            pPrior = pCurrent;
        }, this);
        
        //if this is a polygon (broken polymorphism because it would be better to do multiple inheritence), close the polygon if it isn't closed already:
        if(this.isType('polygon')) {
            if(!pPrior.equals(pStart)) {
                var result = this.addSegment(new segment(pPrior, pStart));
                
                if(result) {
                    hadIntersections = hadIntersections || result.hadIntersections;
                }
            }
        }
        
        /*
        If prior to calling this method, only a simple polygon was stored, and then another simple polygon
        is added, whether or not there were intersections reveals something about the interrelation of 
        the two polygons that is useful for some algorithms. If two simple polygons don't intersect, then
        either they are siblings, or one is completely contained within the other. This is detected in
        this method because it would lead to redundant processing to do it elsewhere.
        */
        var returnObject = [];
        returnObject.hadIntersections = hadIntersections;
        return returnObject;
    };
    
    
    /*
    A simple path has gauranteed properties. Each point can have one or an even number of segments. Only a point
    at the beginning or end of the path can have one segment, and if one of them has one, then both must. If a point 
    has more than two segments, then it is an intersection point. Segments are ordered such that they can be
    traversed to find a walkable points path.
    
    If all points have an even number of segments, then it is a simple polygon and the first and last points 
    have a shared segment.
    */
    var simplePath = function() {
        path.call(this);
        this._type.push('simplePath');
    };
    
    inheritPrototype(simplePath, path);
    
    //adds the segment to the tail of the path:
    simplePath.prototype.addSegment = function(s) {
        if(!s.a.equals(s.b)) {
            if(this.segments.length == 0) {
            
                //there are no segments, so insert this and establish orientation from s.a -> s.b:
                var sI = this.segments.push(s) - 1;
                var pAI = this.addPoint(s.a);
                var pBI = this.addPoint(s.b);
                this.points[pAI][1].push(sI);
                this.points[pBI][1].push(sI);
            } else {
                
                //fix the segment's orientation:
                var sFixed = 
                    new segment(
                        this.segments[this.segments.length - 1].b,
                        this.segments[this.segments.length - 1].b.equals(s.a)
                            ? s.b
                            : s.a
                    );
                
                var sI = this.segments.push(sFixed) - 1;
                var pAI = this.getPointIndex(sFixed.a);
                var pBI = this.addPoint(sFixed.b);
                this.points[pAI][1].push(sI);
                this.points[pBI][1].push(sI);
            }
        }
    };
    
    //breaks a segment at the specified point:
    simplePath.prototype.breakSegment = function(s, p) {
        if(!s.a.equals(p) && !s.b.equals(p)) {
        
            //get current indexes:
            var sI = this.getSegmentIndex(s);
            var pAI = this.getPointIndex(s.a);
            var pBI = this.getPointIndex(s.b);
            
            //increment the references to all segments that are about to be shifted to the right:
            this.points.forEach(function(p2) {
                for(var i = 0; i < p2[1].length; i++) {
                    if(p2[1][i] > sI) {
                        p2[1][i]++;
                    }
                }
            }, this);
            
            //add the new point:
            var pI = this.addPoint(p);
            
            //splice in the right side of the broken segment:
            this.segments.splice(sI + 1, 0, new segment(p, this.segments[sI].b));
            
            //modify the left side of the broken segment:
            this.segments[sI].b = p;
            
            //increment point s.b's segment reference:
            this.points[pBI][1][this.points[pBI][1].indexOf(sI)]++;
            
            //register the broken segments in point p:
            this.points[pI][1].push(sI);
            this.points[pI][1].push(sI + 1);
        }
    };
    
    //returns points in walking order:
    simplePath.prototype.getPointsPath = function() {
        if(!(this.segments && this.segments.length > 0)) {
            return;
        }
        
        var pointsPath = [];
        pointsPath.push(this.segments[0].a);
            
        this.segments.forEach(function(s) {
            pointsPath.push(s.b);
        }, this);
        
        return pointsPath;
    };
    
    //returns a raw path aligned at (0,0) with top/left offsets:
    simplePath.prototype.getRawPath = function() {
        if(!(this.segments && this.segments.length > 0)) {
            return;
        }
        
        //get a walkable path in the proper orientation:
        var pointsPath = this.getPointsPath();
        
        var minX = pointsPath[0].x;
        var minY = pointsPath[0].y;
        var maxX = pointsPath[0].x;
        var maxY = pointsPath[0].y;
        
        pointsPath.forEach(function(p) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }, this);
        
        var rawPath = '[[\"M\",' + (pointsPath[0].x - minX) + ',' + (pointsPath[0].y - minY) + ']';
        for(var i = 1; i < pointsPath.length; i++) {
            rawPath += ',[\"L\",' + (pointsPath[i].x - minX) + ',' + (pointsPath[i].y - minY) + ']';
        }
        
        //if this is a polygon, close the path:
        if(this.isType('polygon' && !pointsPath[0].equals(pointsPath[pointsPath.length - 1]))) {
            rawPath += ',[\"L\",' + (pointsPath[0].x - minX) + ',' + (pointsPath[0].y - minY) + ']';
        }
        
        rawPath += ']';
        
        var returnObject = [];
        returnObject.rawPath = rawPath;
        returnObject.top = minY;
        returnObject.left = minX;
        returnObject.width = maxX - minX;
        returnObject.height = maxY - minY;
        return returnObject;
    };
    
    //takes an array of path points that are gauranteed to intersect this path and returns paths that weren't intersected:
    //note: this handles simple polygon logic as well
    simplePath.prototype.removePathIntersections = function(intersectingPaths) {
        
        //Stuff this path's points into a data structure that has proper path order, but allows for tagging. Don't do tagging on this.points because it could get persisted when the points are saved.
        var taggedPointsPath = [];
        this.getPointsPath().forEach(function(p) {
            taggedPointsPath.push([p, [false, false, false]]); //this consists of the point, whether or not there are intersections on it, if it's the start of an intersection, and if it's the end of an intersection
        }, this);
        
        var getTaggedPointsPathPointIndex = function(taggedPointsPath, p) {
            for(var i = 0; i < taggedPointsPath.length; i++) {
                if(taggedPointsPath[i][0].equals(p)) {
                    return i;
                }
            }
            
            return null;
        };
      
        var breakSegmentIfPointNotFound = function(taggedPointsPath, p) {
            if(getTaggedPointsPathPointIndex(taggedPointsPath, p) === null) {
                for(var i = 0 + 1; i < taggedPointsPath.length; i++) {
                    var s = new segment(taggedPointsPath[i - 1][0], taggedPointsPath[i][0]);
                    if(pointIntersectsSegment(s, p)) {
                        taggedPointsPath.splice(i, 0, [p, [false, false, false]]);
                        return;
                    }
                }
            }
        };
        
        //break any intersections on this path with critical points on intersecting paths:
        intersectingPaths.forEach(function(ip) {
            breakSegmentIfPointNotFound(taggedPointsPath, ip[0]);
            breakSegmentIfPointNotFound(taggedPointsPath, ip[1]);
            breakSegmentIfPointNotFound(taggedPointsPath, ip[ip.length - 1]);
        }, this);
        
        var fullyIntersected = false;
        
        //apply intersection tags to this path:
        intersectingPaths.forEach(function(ip) {
            
            //test that ip is long enough to be used:
            if(ip.length < 2) {
                return;
            }
            
            //test that the first, second, and last points from ip are all on this path, and the first and second are adjacent:
            var iFirst = getTaggedPointsPathPointIndex(taggedPointsPath, ip[0]);
            var iSecond = getTaggedPointsPathPointIndex(taggedPointsPath, ip[1]);
            var iLast = getTaggedPointsPathPointIndex(taggedPointsPath, ip[ip.length - 1]);
            
            //if orientation is 1, the paths have the same orientation; otherwise, the orientation will be -1, if the orientation is anything else, the first and second points are not adjacent:
            var orientation;
            
            //if this is a polygon and one of the points is at index 0, handle edge cases where the adjacent point is wrapped around; skip the last point in the polygon because it's redundant to the first point:
            if(this.isType('polygon')) {
                if(iFirst === 0 && iSecond === taggedPointsPath.length - 2) {
                    orientation = -1;
                } else if(iSecond === 0 && iFirst === taggedPointsPath.length - 2) {
                    orientation = 1;
                } else {
                    orientation = iSecond - iFirst;
                }
            } else {
                orientation = iSecond - iFirst;
            }
            
            //abs(orientation) will normally be 1, as iFirst should be ajacent to iSecond. Give it an additional threshold in case there is a merge occurring where intersecting paths overlap.
            if(iFirst === null || iSecond === null || iLast === null
                    || Math.abs(orientation) === 0
                    || Math.abs(orientation) > 3) {
                return;
            }
            
            //remove the grace from orientation so that it can be used for stepping:
            orientation = (orientation > 0) ? 1 : -1;
            
            //as a special case, mark all as intersected if ip is a polygon (we already know it's of > 0 length):
            if(iFirst === iLast) {
                fullyIntersected = true;
                return;
            }
            
            //tag the points on this path as intersected that span between the first and last points exclusive:
            for(var i = iFirst + 1; i !== iLast; i = (i + orientation) % taggedPointsPath.length) {
                
                //mark this point as intersected:
                taggedPointsPath[i][1][0] = true;
                
                //clobber any other intersecting paths' endpoints:
                taggedPointsPath[i][1][1] = false;
                taggedPointsPath[i][1][2] = false;
            }
            
            //tag this path with the endpoints of the intersecing path, with respect to this path's orientation:
            //respect other intersecting paths' endpoints as if the new endpoints were clobbered:
            if(orientation > 0) {
                if(!taggedPointsPath[iFirst][1][0]) {
                    taggedPointsPath[iFirst][1][1] = true;
                }
                
                if(!taggedPointsPath[iLast][1][0]) {
                    taggedPointsPath[iLast][1][2] = true;
                }
            } else {
                if(!taggedPointsPath[iFirst][1][0]) {
                    taggedPointsPath[iFirst][1][2] = true;
                }
                
                if(!taggedPointsPath[iLast][1][0]) {
                    taggedPointsPath[iLast][1][1] = true;
                }
            }
            
            //tag the endpoints:
            taggedPointsPath[iFirst][1][0] = true;
            taggedPointsPath[iLast][1][0] = true;
        }, this);
        
        if(fullyIntersected) {
            return [];
        }
        
        var survivingPaths = [];
        var initialPath = [];
        var currentPath = initialPath;
        
        //determine the surviving paths that evaded intersection:
        for(var i = 0; i < taggedPointsPath.length; i++) {
            if(!taggedPointsPath[i][1][0]) {
                
                //add the current point:
                currentPath.push(taggedPointsPath[i][0]);
            } else {
                
                //handle start of intersections:
                if(taggedPointsPath[i][1][1]) {
                    
                    //close off the current path:
                    if(currentPath.length) {
                        currentPath.push(taggedPointsPath[i][0]);
                        survivingPaths.push(currentPath);
                        currentPath = [];
                    }
                }
                
                //handle end of intersections:
                if(taggedPointsPath[i][1][2]) {
                    
                    //begin a new current path:
                    currentPath.push(taggedPointsPath[i][0]);
                }
            }
        }
        
        /*
        The initial path is special in that it might need to be prepended, but we won't know until we complete the circuit.
        It will be prepended if: this path is a polygon, the initial path begins at point index 0, the initial path doesn't 
        complete the circuit without intersections, and the final point of this path is not intersected.
        */
        //prepend to initialPath if necessary:
        if(this.isType('polygon')
                && !taggedPointsPath[0][1][0]
                && currentPath !== initialPath
                && currentPath.length > 0) {
            survivingPaths[0] = currentPath.concat(survivingPaths[0]);
        }
        //include currentPath:
        else {
            if(currentPath.length > 1) {
                survivingPaths.push(currentPath);
            }
        }
        
        return survivingPaths;
    }
    
    
    var complexPath = function() {
        path.call(this);
        this._type.push('complexPath');
    };
    
    inheritPrototype(complexPath, path);
    
    //returns whether or not there were intersections, because this is useful information for certain algorithms:
    complexPath.prototype.addSegment = function(s) {
        
        //note: it's illogical to return a segment's index, because it might have been broken into pieces:
        //note: it's inconvient to do early detection of the segment being new, because of segment breaking:
    
        //don't add the segment if it's of 0 length:
        if(s.a.equals(s.b)) {
            return;
        }
        
        var newSegments = [];
        var brokenSegments = [];
        var intersectingSegments = [];
        
        newSegments.push(s);
        
        //find segments that the new segment intersects:
        this.segments.forEach(function(seg) {
            if(segmentsIntersect(s, seg)) {
                intersectingSegments.push(seg);
            }
        }, this);
        
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
                    this.removeSegment(seg);
                    
                    //create new broken segments:
                    newSegments.unshift(new segment(newSegments[i].a, intersectionPoint));
                    newSegments.unshift(new segment(intersectionPoint, newSegments[i + 1].b));
                    
                    //remove the new segment that was just broken:
                    newSegments.splice(i + 2, 1);
                    
                    //adjust the loop to bypass the broken newSegments that were already tested against seg:
                    i++;
                }
            }
        }, this);
        
        var hadIntersections = false;
        
        //add old broken segments:
        brokenSegments.forEach(function(seg) {
            if(!seg.a.equals(seg.b)) {
                hadIntersections = true;
                var iS = this.segments.push(seg) - 1;
                var iPa = this.addPoint(seg.a);
                var iPb = this.addPoint(seg.b);
                this.points[iPa][1].push(iS);
                this.points[iPb][1].push(iS);
            }
        }, this);
        
        //add new segments:
        newSegments.forEach(function(seg) {
            if(!seg.a.equals(seg.b)) {
                var iS = this.segments.push(seg) - 1;
                var iPa = this.addPoint(seg.a);
                var iPb = this.addPoint(seg.b);
                this.points[iPa][1].push(iS);
                this.points[iPb][1].push(iS);
            }
        }, this);
        
        //create a return object with specific fields, so that the return values aren't misconstrued to be something more intuitive:
        var returnObject = [];
        returnObject.hadIntersections = hadIntersections;
        return returnObject;
    };
    
    
    var simplePolygon = function() {
        simplePath.call(this);
        this._type.push('polygon');
        this._type.push('simplePolygon');
    };
    
    inheritPrototype(simplePolygon, simplePath);
    
    //tests if the point is inside the polygon:
    simplePolygon.prototype.hasInsidePoint = function(p) {
        
        //use an arbitrarily long horizontal segment that goes into negatives (because of relative coordinates):
        var horizontalSegment = new segment(new point(-1000000000, p.y), new point(1000000000, p.y));
        
        //count the intersecting points that appear to the left of the point in question:
        var pointsOnLeft = 0;
        
        //find segments that intersect the point horizontally:
        this.segments.forEach(function(s) {
            
            //find a naturally occurring intersection point:
            var intersectingPoint = segmentsIntersect(horizontalSegment, s);
            
            //if there was no natural intersection point, test for a segment endpoint hitting the horizontal segment:
            if(!intersectingPoint) {
                
                /*
                If an endpoint on the segment is on the horizontal segment, count it as an intersecting segment if it is angling down from 
                that point's perspective. This will result in two segments traveling through the horizontal segment to register as odd, and
                will ignore any horizontal segments that are overlapping the horizontal segment.
                */
                if(s.a.y === p.y && s.b.y - s.a.y > 0) {
                    intersectingPoint = s.a;
                } else if(s.b.y === p.y && s.a.y - s.b.y > 0) {
                    intersectingPoint = s.b;
                }
            }
            
            if(intersectingPoint && intersectingPoint.x < p.x) {
                pointsOnLeft++;
            }
        }, this);
        
        //there will be an even number of intersections; if the point in question is between an odd number of intersections, it's inside the polygon:
        return (pointsOnLeft % 2 === 1);
    };
    
    //only tests segment's endpoints:
    simplePolygon.prototype.hasInsideSegment = function(s) {
        return (this.hasInsidePoint(s.a) && this.hasInsidePoint(s.b));
    };
    
    simplePolygon.prototype.hasInsideEntirePath = function(sp) {
        var pointsPath = sp.getPointsPath();
        
        for(var i = 0; i < pointsPath.length; i++) {
            if(!this.hasInsidePoint(pointsPath[i])) {
                return false;
            }
        }
        
        return true;
    };
    
    //returns a point in this that is not contained in sp:
    simplePolygon.prototype.getSinglePointIndexEvadingFilter = function(sp) {
        var pointsPath = this.getPointsPath();
      
        for(var i = 0; i < pointsPath.length; i++) {
            if(!sp.hasInsidePoint(pointsPath[i])) {
                return i;
            }
        }
        
        return null;
    };
    
    //returns all points in sp that are not contained in this:
    simplePolygon.prototype.getContainedPoints = function(sp) {
        var containedPoints = [];
        
        sp.getPointsPath().forEach(function(p) {
            if(this.hasInsidePoint(p)) {
                containedPoints.push(p);
            }
        }, this);
        
        return containedPoints;
    };
    
    //returns intersecting paths (as an array of path points) for a simple path or simple polygon:
    simplePolygon.prototype.getIntersectingPaths = function(sp) {
        
        //find all intersecting segments and their points of intersection:
        var intersectingSegments = [];
       
        //break all intersecting segments, but keep references to them and check for further intersections:
        for(var i = 0; i < sp.segments.length; i++) {
            for(var i2 = 0; i2 < this.segments.length; i2++) {
     
                //because we're breaking new segments, we have to retest for intersection:
                var intersectionPoint = segmentsIntersect(sp.segments[i], this.segments[i2]);
                if(intersectionPoint) {
                    
                    //release reference to the broken segment if it exists:
                    for(var i3 = 0; i3 < intersectingSegments.length; i3++) {
                        if(intersectingSegments[i3][0].equals(sp.segments[i])) {
                            intersectingSegments.splice(i3, 1);
                        }
                    }
                    
                    //break the segment in sp:
                    sp.breakSegment(sp.segments[i], intersectionPoint);
                    
                    //store references to the broken segment pieces:
                    intersectingSegments.push([sp.segments[i], false]);
                    intersectingSegments.push([sp.segments[i + 1], false]);
                    
                    //break the segments in this so that we don't get repeated intersections in further tests:
                    this.breakSegment(this.segments[i2], intersectionPoint);
                }
            }
        }
        
        var intersectingPaths = [];
        
        //handle cases where there are no intersectingSegments:
        if(!intersectingSegments.length) {
            
            //sp is fully contained in this:
            if(this.hasInsidePoint(sp.points[0][0])) {
                intersectingPaths.push(sp.getPointsPath());
            }
        } else {
        
            //intersectingSegments is now a stable array; loop through until all have been processed:
            intersectingSegments.forEach(function(s) {
                
                //intersectingSegments can be processed inherently through processing others:
                if(!s[1]) {
                    
                    //test the midpoint of the segment to see if it's contained in this polygon:
                    if(this.hasInsidePoint(s[0].midpoint())) {
                        var intersectingPath = [];
                        
                        intersectingPath.push(s[0].a);
                        intersectingPath.push(s[0].b);
                        
                        //find the index of the segment in sp:
                        var sIndex = sp.getSegmentIndex(s[0]);
                        
                        //walk the path forward until finding a segment that's not contained:
                        var sWalkingIndex = sIndex + 1;
                        
                        if(sp.isType('polygon')) {
                            sWalkingIndex %= sp.segments.length;
                        }
                        
                        while(sWalkingIndex !== sIndex && sWalkingIndex < sp.segments.length && this.hasInsidePoint(sp.segments[sWalkingIndex].midpoint())) {
                            var seg = sp.segments[sWalkingIndex];
                            intersectingPath.push(seg.b);
                            
                            //if the segment is in intersectingSegments, mark it as processed:
                            intersectingSegments.forEach(function(iSeg) {
                                if(iSeg[0].equals(seg)) {
                                    iSeg[1] = true;
                                }
                            }, this);
                            
                            sWalkingIndex++;
                            
                            if(sp.isType('polygon')) {
                                sWalkingIndex %= sp.segments.length;
                            }
                        }
                        
                        //if the forward walk didn't complete the circuit, walk the path backward until finding a segment that's not contained:
                        if(sWalkingIndex !== sIndex) {
                            sWalkingIndex = sIndex - 1;
                            
                            if(sp.isType('polygon')) {
                                sWalkingIndex = (sWalkingIndex + sp.segments.length) % sp.segments.length;
                            }
                            
                            while(sWalkingIndex !== sIndex && sWalkingIndex >= 0 && this.hasInsidePoint(sp.segments[sWalkingIndex].midpoint())) {
                                var seg = sp.segments[sWalkingIndex];
                                intersectingPath.unshift(seg.a);
                                    
                                //if the segment is in intersectingSegments, mark it as processed:
                                intersectingSegments.forEach(function(iSeg) {
                                    if(iSeg[0].equals(seg)) {
                                        iSeg[1] = true;
                                    }
                                }, this);
                                
                                sWalkingIndex--;
                            
                                if(sp.isType('polygon')) {
                                    sWalkingIndex = (sWalkingIndex + sp.segments.length) % sp.segments.length;
                                }
                            }
                        }
                        
                        intersectingPaths.push(intersectingPath);
                    }
                }
            }, this);
        }
        
        return intersectingPaths;
    };
    
    //removes intersection with rsp (Removed Simple Polygon):
    simplePolygon.prototype.removeIntersection = function(rsp) {
        var controlPointIndex = this.getSinglePointIndexEvadingFilter(rsp);
        
        if(controlPointIndex === null) {
            return;
        }
        
        //get an angle from the control point to the prior point:
        var controlSegment = new segment(this.points[controlPointIndex][0], this.points[(controlPointIndex - 1 + this.points.length) % this.points.length][0]);
        var controlAngle = controlSegment.angle(controlSegment.a);
        
        //stuff both polygons into a complex polygon:
        var cp = new complexPolygon();
        cp.addPointsPath(this.getPointsPath());
        cp.addPointsPath(rsp.getPointsPath());
        
        //get the point index out of cp in case it has changed since we found it in this.points:
        var controlPointIndex = cp.getPointIndex(this.points[controlPointIndex][0]);
        
        return cp.convertToSimplePolygon(controlPointIndex, controlAngle, false);
    };
    
    simplePolygon.prototype.invert = function() {
        var invertedPoints = this.getPointsPath();
        
        var minX = invertedPoints[0].x;
        var minY = invertedPoints[0].y;
        var maxX = invertedPoints[0].x;
        var maxY = invertedPoints[0].y;
        var controlPointIndex = 0;
        
        //find the smallest x points, and of those, take the greatest y:
        for(var i = 0; i < invertedPoints.length; i++) {
            if((invertedPoints[i].x < invertedPoints[controlPointIndex].x)
                    || (invertedPoints[i].x == invertedPoints[controlPointIndex].x && invertedPoints[i].y > invertedPoints[controlPointIndex].y)) {
                controlPointIndex = i;
            }
            
            minX = Math.min(minX, invertedPoints[i].x);
            minY = Math.min(minY, invertedPoints[i].y);
            maxX = Math.max(maxX, invertedPoints[i].x);
            maxY = Math.max(maxY, invertedPoints[i].y);
        }
        
        //the inverted border needs to be this much larger than the original polygon:
        var invertedBorderDistance = 1;
        
        //insert a point immediately down from the control point to branch off from:
        invertedPoints.splice(controlPointIndex + 1, 0, new point(invertedPoints[controlPointIndex].x, invertedPoints[controlPointIndex].y + 1));
        
        //branch the new point to the edge of the inverted border:
        invertedPoints.splice(controlPointIndex + 1, 0, new point(minX - invertedBorderDistance, invertedPoints[controlPointIndex].y + 1));
        
        //draw the inverted border corners stemming from control point:
        invertedPoints.splice(controlPointIndex + 1, 0, new point(minX - invertedBorderDistance, maxY + invertedBorderDistance));
        invertedPoints.splice(controlPointIndex + 1, 0, new point(maxX + invertedBorderDistance, maxY + invertedBorderDistance));
        invertedPoints.splice(controlPointIndex + 1, 0, new point(maxX + invertedBorderDistance, minY - invertedBorderDistance));
        invertedPoints.splice(controlPointIndex + 1, 0, new point(minX - invertedBorderDistance, minY - invertedBorderDistance));
        
        //insert a point from the control point leading to the edge of the inverted border:
        invertedPoints.splice(controlPointIndex + 1, 0, new point(minX - invertedBorderDistance, invertedPoints[controlPointIndex].y));
        
        var op = new simplePolygon();
        op.addPointsPath(invertedPoints);
        
        return op;
    };
    
  
    var complexPolygon = function() {
        complexPath.call(this);
        this._type.push('polygon');
        this._type.push('complexPolygon');
    };
    
    inheritPrototype(complexPolygon, complexPath);
    
    //if isOuterDesired, this finds the most expansive path; otherwise, it finds the most restrictive path:
    complexPolygon.prototype.convertToSimplePolygon = function(controlPointIndex, controlAngle, isOuterDesired) {
        
        //start keeping the points that will be used in the output polygon in the proper order:
        var cleanPolygonPoints = [];
        cleanPolygonPoints.push(this.points[controlPointIndex][0]);
        
        var iP = controlPointIndex; //index of current point
        var a = controlAngle; //angle of prior segment
        var loopLimit = 10000; //limit the loop iterations in case there's a bug or the equality clause ends up needing an epsilon
        var firstIteration = true;
        
        //loop until the outside of the polygon has been traced:
        while((loopLimit-- > 0) && !(!firstIteration && iP === controlPointIndex)) {
            
            firstIteration = false;
            
            /*
            If isOuterDesired, find the longest segment originating from the current point that is the most counter-clockwise from the prior segment's angle:
            If not isOuterDesired, find the shortest segment originating from the current point that is the least counter-clockwise from the prior segment's angle, without backtracking:
            */
            
            //initialize variables:
            var s;
            var chosenSegment;
            var sAngle;
            var sLength = isOuterDesired ? 0 : 1000000000;
            var sRelativeAngle = new angle(isOuterDesired ? 0.0001 : (2 * Math.PI) - 0.0001);
        
            //loop through the segments of this point:
            for(var iS = 0; iS < this.points[iP][1].length; iS++) {
                var seg = this.segments[this.points[iP][1][iS]];
                var segAngle = seg.angle(this.points[iP][0]);
                var relativeAngle = segAngle.subtract(a.radians);
                
                if((isOuterDesired &&
                        ((relativeAngle.greaterThan(sRelativeAngle.radians))
                        || (relativeAngle.equals(sRelativeAngle.radians) && seg.length() > sLength)))
                    || (!isOuterDesired && relativeAngle.radians > 0.00001 &&
                        ((relativeAngle.lessThan(sRelativeAngle.radians))
                        || (relativeAngle.equals(sRelativeAngle.radians) && seg.length() < sLength)))) {
                    s = iS;
                    chosenSegment = this.segments[this.points[iP][1][s]];
                    sAngle = chosenSegment.angle(this.points[iP][0]);
                    sLength = chosenSegment.length();
                    sRelativeAngle = relativeAngle;
                }
            }
            
            //the next point should be the endpoint of the segment that wasn't the prior point:
            if(chosenSegment.a.equals(this.points[iP][0])) {
                iP = this.getPointIndex(chosenSegment.b);
            } else {
                iP = this.getPointIndex(chosenSegment.a);
            }
            
            //the angle of the current segment will be used as a limit for finding the next segment:
            a = new angle((sAngle.radians + Math.PI) % (2 * Math.PI));
            
            //add the new point to the clean polygon:
            cleanPolygonPoints.push(this.points[iP][0]);
        }
        
        //create an simplePolygon with the points:
        var op = new simplePolygon();
        op.addPointsPath(cleanPolygonPoints);
        return op;
    };
    
    complexPolygon.prototype.convertToOuterSimplePolygon = function() {
        
        //find the smallest x points, and of those, take the greatest y:
        var iTopLeftPoint = 0;
        for(var i = 0; i < this.points.length; i++) {
            if((this.points[i][0].x < this.points[iTopLeftPoint][0].x)
                    || (this.points[i][0].x == this.points[iTopLeftPoint][0].x && this.points[i][0].y > this.points[iTopLeftPoint][0].y)) {
                iTopLeftPoint = i;
            }
        }
        
        return this.convertToSimplePolygon(iTopLeftPoint, new angle(Math.PI / 2), true);
    };
    
    
    var graph = function() {
        typedObject.call(this);
        this._type.push('graph');
        this.initializeCollectionProperty('simplePaths');
        this.initializeCollectionProperty('complexPaths');
        this.initializeCollectionProperty('simplePolygons');
        this.initializeCollectionProperty('complexPolygons');
    };
    
    inheritPrototype(graph, typedObject);
    
    graph.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'simplePaths':
            case 'complexPaths':
            case 'simplePolygons':
            case 'complexPolygons':
                return this['_' + property].push(value) - 1;
                break;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    graph.prototype.initializeCollectionProperty = function(property) {
        switch(property) {
            case 'simplePaths':
            case 'complexPaths':
            case 'simplePolygons':
            case 'complexPolygons':
                this['_' + property] = [];
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
    graph.prototype.addSimplePath = function(rawPath, top, left, isFromEvent) {
        if('undefined' === typeof(top)) {
            top = 0;
        }
        
        if('undefined' === typeof(left)) {
            left = 0;
        }
        
        var sp = new simplePath();
        sp.addRawPath(rawPath, top, left, isFromEvent);
        return this.setProperty('simplePaths', sp);
    };
    
    graph.prototype.addSimplePathFromPoints = function(pointsPath) {
        var sp = new simplePath();
        sp.addPointsPath(pointsPath);
        return this.setProperty('simplePaths', sp);
    };
    
    graph.prototype.addSimplePathFromSegment = function(s, top, left) {
        if('undefined' === typeof(top)) {
            top = 0;
        }
        
        if('undefined' === typeof(left)) {
            left = 0;
        }
        
        var sp = new simplePath();
        
        //convert s into a segment (because it may have been loaded and lost that property) and apply offsets:
        sp.addSegment(new segment(new point(s.a.x + left, s.a.y + top), new point(s.b.x + left, s.b.y + top)));
        
        return this.setProperty('simplePaths', sp);
    };
    
    graph.prototype.addComplexPath = function(rawPath, top, left, isFromEvent) {
        var cp = new complexPath();
        cp.addRawPath(rawPath, top, left, isFromEvent);
        return this.setProperty('complexPaths', cp);
    };
    
    graph.prototype.addSimplePolygon = function(rawPath, top, left, isFromEvent) {
        if('undefined' === typeof(top)) {
            top = 0;
        }
        
        if('undefined' === typeof(left)) {
            left = 0;
        }
        
        var sp = new simplePolygon();
        sp.addRawPath(rawPath, top, left, isFromEvent);
        return this.setProperty('simplePolygons', sp);
    };
    
    graph.prototype.addComplexPolygon = function(rawPath, top, left, isFromEvent) {
        var cp = new complexPolygon();
        cp.addRawPath(rawPath, top, left, isFromEvent);
        return this.setProperty('complexPolygons', cp);
    };
    
    graph.prototype.convertComplexPolygonToSimplePolygon = function(index) {
        var op = this.getProperty('complexPolygons')[index].convertToOuterSimplePolygon();
        this.getProperty('complexPolygons').splice(index, 1);
        return this.setProperty('simplePolygons', op);
    };
    
    graph.prototype.getRawPath = function(pathType, index) {
        return this.getProperty(pathType)[index].getRawPath();
    };
    
    graph.prototype.getPointsPath = function(pathType, index) {
        return this.getProperty(pathType)[index].getPointsPath();
    };
    
    graph.prototype.getContainedPoints = function(pathType1, index1, pathType2, index2) {
        return this.getProperty(pathType1)[index1].getContainedPoints(this.getProperty(pathType2)[index2]);
    };
    
    graph.prototype.mergeSimplePolygons = function(index1, index2) {
        var cp = new complexPolygon();
        var op1 = this.getProperty('simplePolygons')[index1];
        
        //stuff points from op1 into cp, rather than re-inserting, for the sake of efficiency:
        cp.points = op1.points;
        cp.segments = op1.segments;
        
        var op2 = this.getProperty('simplePolygons')[index2];
        var cpResult = cp.addPointsPath(op2.getPointsPath());
        
        //polygons intersect, so return their merge:
        if(cpResult.hadIntersections) {
            var cpIndex = this.setProperty('complexPolygons', cp);
            return this.convertComplexPolygonToSimplePolygon(cpIndex);
        } 
        //polygon 2 is fully contained within polygon 1, so return polygon 1:
        else if(op1.hasInsidePoint(op2.points[0][0])) {
            return index1;
        }
        //polygon 1 is fully contained within polygon 2, so return polygon 2:
        else if(op2.hasInsidePoint(op1.points[0][0])) {
            return index2;
        }
        //the polygons are siblings, so merging cannot be done:
        else {
            return null;
        }
    };
    
    //removes the intersection between the two polygons from the first:
    graph.prototype.removeFromSimplePolygon = function(index1, index2) {
        var cp = new complexPolygon();
        var op1 = this.getProperty('simplePolygons')[index1];
        var op2 = this.getProperty('simplePolygons')[index2];
        var op3 = op1.removeIntersection(op2);
        
        if(!op3) {
            return;
        } 
        
        return this.setProperty('simplePolygons', op3);
    };
    
    graph.prototype.invertSimplePolygon = function(index) {
        var invertedOp = this.getProperty('simplePolygons')[index].invert();
        return this.setProperty('simplePolygons', invertedOp);
    };
    
    graph.prototype.removePathIntersections = function(pathType, index, intersectingPaths) {
        return this.getProperty(pathType)[index].removePathIntersections(intersectingPaths);
    };
    
    graph.prototype.getIntersectingPaths = function(pathType1, index1, pathType2, index2) {
        return this.getProperty(pathType1)[index1].getIntersectingPaths(this.getProperty(pathType2)[index2]);
    };
    
    graph.prototype.hasInsidePoint = function(pathType, index, p) {
        return this.getProperty(pathType)[index].hasInsidePoint(p);
    };
    
    graph.prototype.hasInsideSegment = function(pathType, index, s) {
        return this.getProperty(pathType)[index].hasInsideSegment(s);
    };
    
    graph.prototype.hasInsideEntirePath = function(pathType1, index1, pathType2, index2) {
        return this.getProperty(pathType1)[index1].hasInsideEntirePath(this.getProperty(pathType2)[index2]);
    };
        
     
    /* polygon logic - end */
    
    /* roll20 object management - begin */
    
    //find imgsrc that is legal for object creation:
    var getCleanImgsrc = function (imgsrc) {
        var parts = imgsrc.match(/(.*\/images\/.*)(thumb|max|med)(.*)$/);
        
        if(parts) {
          return parts[1] + 'thumb' + parts[3];
        }
        return null;
    },
    
    deleteObject = function(type, id) {
        state.APIAreaMapper.tempIgnoreDrawingEvents = true;
        
        var obj = getObj(type, id);
        if(obj) {
            obj.remove();
        }
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = false;
    },
    
    getRectanglePath = function(height, width) {
        return "[[\"M\",0,0],[\"L\",0," + height + "],[\"L\"," + width + "," + height + "],[\"L\"," + width + ",0],[\"L\",0,0]]";
    },
    
    createPathObject = function(path, pageId, layer, strokeColor, fillColor, top, left, height, width, strokeWidth, rotation) {
        if('undefined' === typeof(strokeWidth)) {
            strokeWidth = 1;
        }
        
        if('undefined' === typeof(rotation)) {
            rotation = 0;
        }
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = true;
        
        var obj = createObj('path', {
                layer: layer,
                pageid: pageId,
                top: top + (height / 2),
                left: left + (width / 2),
                height: height,
                width: width,
                stroke: strokeColor,
                stroke_width: strokeWidth,
                fill: fillColor,
                _path: path,
                rotation: rotation
            });
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = false;
        
        return obj;
    }, 
    
    createRectanglePathObject = function(pageId, layer, strokeColor, fillColor, top, left, height, width, strokeWidth, rotation) {
        return createPathObject(
            getRectanglePath(height, width),
            pageId,
            layer,
            strokeColor,
            fillColor,
            top,
            left,
            height,
            width,
            strokeWidth,
            rotation);
    },
    
    createBandPathObjectFromToken = function(token, bandIndex, color, layer) {
        if('undefined' === typeof(layer)) {
            layer = 'gmlayer';
        }
        
        var bandStrokeWidth = 4;
        
        var height = token.get('height') + (2 * (bandIndex * bandStrokeWidth));
        var width = token.get('width') + (2 * (bandIndex * bandStrokeWidth));
        
        return createRectanglePathObject(
            token.get('_pageid'),
            layer,
            color,
            'transparent',
            token.get('top') - (token.get('height') / 2),
            token.get('left') - (token.get('width') / 2),
            height,
            width,
            bandStrokeWidth,
            token.get('rotation'));
    },
    
    createBandPathObject = function(pageId, top, left, height, width, bandIndex, color, rotation, layer) {
        if('undefined' === typeof(rotation)) {
            rotation = 0;
        }
        
        if('undefined' === typeof(layer)) {
            layer = 'gmlayer';
        }
        
        var bandStrokeWidth = 4;
        
        top -= (bandIndex * bandStrokeWidth);
        left -= (bandIndex * bandStrokeWidth);
        height += (2 * (bandIndex * bandStrokeWidth));
        width += (2 * (bandIndex * bandStrokeWidth));
        
        return createRectanglePathObject(
            pageId,
            layer,
            color,
            'transparent',
            top,
            left,
            height,
            width,
            bandStrokeWidth,
            rotation);
    },
    
    createBandsFromToken = function(token, bandColors, layer) {
        var bandIds = [];
        var bandIndex = 0;
        
        bandColors.forEach(function(color) {
            bandIds.push(createBandPathObjectFromToken(token, bandIndex++, color, layer).id);
        }, this);
        
        return bandIds;
    },
    
    createBands = function(pageId, top, left, height, width, bandColors, rotation, layer) {
        var bandIds = [];
        var bandIndex = 0;
        
        bandColors.forEach(function(color) {
            bandIds.push(createBandPathObject(pageId, top, left, height, width, bandIndex++, color, rotation, layer).id);
        }, this);
        
        return bandIds;
    },
    
    createBandsBySegment = function(pageId, segment, height, widthExtension, bandColors, layer) {
        var midpoint = segment.midpoint();
        var width = segment.length() + widthExtension;
        
        return createBands(
            pageId,
            midpoint.y - (height / 2),
            midpoint.x - (width / 2),
            height,
            width,
            bandColors,
            segment.angleDegrees(segment.a),
            layer);
    },
    
    createTokenObjectFromImage = function(imagesrc, pageId, layer, top, left, height, width, rotation) {
        if('undefined' === typeof(rotation)) {
            rotation = 0;
        }
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = true;
        
        var obj = createObj('graphic', {
            imgsrc: imagesrc,
            layer: layer,
            pageid: pageId,
            top: top + (height / 2),
            left: left + (width / 2),
            height: height,
            width: width,
            rotation: rotation
        });
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = false;
        
        return obj;
    },
    
    createTokenObjectFromAsset = function(assetObject, pageId, layer, top, left, height, width, rotation) {
        if('undefined' === typeof(rotation)) {
            rotation = 0;
        }
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = true;
        
        var scaledHeight = height * assetObject.getProperty('scaleVertical');
        var scaledWidth = width * assetObject.getProperty('scaleHorizontal');
        
        //the inbound height and width are reversed if the asset's alternate property is true:
        var usedHeight = assetObject.getProperty('alternate') ? scaledWidth : scaledHeight;
        var usedWidth = assetObject.getProperty('alternate') ? scaledHeight : scaledWidth;
        
        var obj = createObj('graphic', {
            imgsrc: assetObject.getProperty('imagesrc'),
            layer: layer,
            pageid: pageId,
            top: top + (height / 2) + assetObject.getProperty('offsetVertical'),
            left: left + (width / 2) + assetObject.getProperty('offsetHorizontal'),
            height: usedHeight,
            width: usedWidth,
            rotation: rotation + assetObject.getProperty('rotation') + (assetObject.getProperty('alternate') ? 90 : 0)
        });
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = false;
        
        return obj;
    },
    
    createTokenObjectFromAssetBySegment = function(assetObject, pageId, layer, segment, height, widthExtension) {
        var midpoint = segment.midpoint();
        var width = segment.length() + widthExtension;
        
        //apply asset's horizontal offset to midpoint:
        midpoint.x += (assetObject.getProperty('offsetHorizontal') * Math.cos(segment.angle(segment.a).radians));
        midpoint.y += (assetObject.getProperty('offsetHorizontal') * Math.sin(segment.angle(segment.a).radians));
        
        //apply asset's vertical offset to midpoint:
        midpoint.x += (assetObject.getProperty('offsetVertical') * Math.cos(segment.angle(segment.a).radians - (Math.PI / 2)));
        midpoint.y += (assetObject.getProperty('offsetVertical') * Math.sin(segment.angle(segment.a).radians - (Math.PI / 2)));
        
        return createTokenObjectFromAsset(
            assetObject,
            pageId,
            layer,
            midpoint.y - (height / 2) - assetObject.getProperty('offsetVertical'), //remove misadjustments to top that createTokenObjectFromAsset() makes
            midpoint.x - (width / 2) - assetObject.getProperty('offsetHorizontal'), //remove misadjustments to left that createTokenObjectFromAsset() makes
            height,
            width,
            segment.angleDegrees(segment.a));
    },
    
    createTextObject = function(text, pageId, layer, top, left, height, width, rotation) {
        if('undefined' === typeof(rotation)) {
            rotation = 0;
        }
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = true;
        
        var obj = createObj('text', {
            text: text,
            layer: layer,
            pageid: pageId,
            top: top + (height / 2),
            left: left + (width / 2),
            height: height,
            width: width,
            rotation: rotation
        });
        
        state.APIAreaMapper.tempIgnoreDrawingEvents = false;
        
        return obj;
    };
    
    /* roll20 object management - end */
    
    /* area - begin */
    
    var asset = function(stateObject) {
        typedObject.call(this);
        this._type.push('asset');
        
        if('undefined' === typeof(stateObject)) {
            stateObject = ['',0,0,1,1,0,0];
        }
        
        this.setProperty('imagesrc', stateObject[0]);
        this.setProperty('rotation', stateObject[1]);
        this.setProperty('alternate', stateObject[2]);
        this.setProperty('scaleVertical', stateObject[3]);
        this.setProperty('scaleHorizontal', stateObject[4]);
        this.setProperty('offsetVertical', stateObject[5]);
        this.setProperty('offsetHorizontal', stateObject[6]);
    }
    
    inheritPrototype(asset, typedObject);
    
    asset.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'imagesrc':
            case 'rotation':
            case 'alternate':
            case 'scaleVertical':
            case 'scaleHorizontal':
            case 'offsetVertical':
            case 'offsetHorizontal':
                this['_' + property] = value;
                break;
            default:
                return typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
        
        return null;
    };
    
    asset.prototype.getStateObject = function() {
        return [
                this.getProperty('imagesrc'),
                this.getProperty('rotation'),
                this.getProperty('alternate'),
                this.getProperty('scaleVertical'),
                this.getProperty('scaleHorizontal'),
                this.getProperty('offsetVertical'),
                this.getProperty('offsetHorizontal')
            ];
    };
    
    
    var texture = function(stateObject) {
        typedObject.call(this);
        this._type.push('texture');
        
        //note: stateObject is structured as [textureType, value (can be null, an asset index, or a unique asset)]
        
        //if the stateObject isn't sent in, use the first generic asset:
        if('undefined' === typeof(stateObject)) {
            this._textureType = 'asset';
            this._value = 0;
        } else {
            this._textureType = stateObject[0];
            this._value = stateObject[1]; //note: this is storing state - in certain cases (such as a unique asset), this will have to be decoded to be used
        }
    };
    
    inheritPrototype(texture, typedObject);
    
    texture.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'textureType':
            case 'value':
                this['_' + property] = value;
                break;
            default:
                return typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
        
        return null;
    };
    
    texture.prototype.getStateObject = function() {
        return [this._textureType, this._value];
    };
    
    
    var interactiveObject = function(isOpen, isLocked, isTrapped, isHidden) {
        typedObject.call(this);
        this._type.push('interactiveObject');
        
        if('undefined' === typeof(isOpen)) {
            isOpen = 0;
        }
        
        if('undefined' === typeof(isLocked)) {
            isLocked = 0;
        }
        
        if('undefined' === typeof(isTrapped)) {
            isTrapped = 0;
        }
        
        if('undefined' === typeof(isHidden)) {
            isHidden = 0;
        }
        
        this._isOpen = isOpen;
        this._isLocked = isLocked;
        this._isTrapped = isTrapped;
        this._isHidden = isHidden;
    };
    
    inheritPrototype(interactiveObject, typedObject);
    
    interactiveObject.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'isOpen':
            case 'isLocked':
            case 'isTrapped':
            case 'isHidden':
                this['_' + property] = value;
                break;
            default:
                return typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
        
        return null;
    };
    
    interactiveObject.prototype.getStateObject = function() {
        return [this._isOpen, this._isLocked, this._isTrapped, this._isHidden];
    };
    
    
    var door = function(stateObject) {
        if('undefined' === typeof(stateObject)) {
            stateObject = new Array(5);
        }
        
        interactiveObject.call(this, stateObject[1], stateObject[2], stateObject[3], stateObject[4]);
        this._type.push('door');
        this._positionSegment = stateObject[0];
    };
    
    inheritPrototype(door, interactiveObject);
    
    door.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'positionSegment':
                this['_' + property] = value;
                break;
            default:
                return interactiveObject.prototype.setProperty.call(this, property, value);
                break;
        }
        
        return null;
    };
    
    door.prototype.getStateObject = function() {
        var stateObject = [this._positionSegment];
        return stateObject.concat(interactiveObject.prototype.getStateObject.call(this));
    };
    
    
    var chest = function(stateObject) {
        if('undefined' === typeof(stateObject)) {
            stateObject = new Array(9);
        }
        
        interactiveObject.call(this, stateObject[5], stateObject[6], stateObject[7], stateObject[8]);
        this._type.push('chest');
        this._top = stateObject[0];
        this._left = stateObject[1];
        this._height = stateObject[2];
        this._width = stateObject[3];
        this._rotation = stateObject[4];
    };
    
    inheritPrototype(chest, interactiveObject);
    
    chest.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'top':
            case 'left':
            case 'height':
            case 'width':
            case 'rotation':
                this['_' + property] = value;
                break;
            default:
                return interactiveObject.prototype.setProperty.call(this, property, value);
                break;
        }
        
        return null;
    };
    
    chest.prototype.getStateObject = function() {
        var stateObject = [this._top, this._left, this._height, this._width, this._rotation];
        return stateObject.concat(interactiveObject.prototype.getStateObject.call(this));
    };
    
    
    var area = function(id) {
        typedObject.call(this);
        this._type.push('area');
        this.initializeCollectionProperty('edgeWalls');
        this.initializeCollectionProperty('edgeWallGaps');
        this.initializeCollectionProperty('innerWalls');
        this.initializeCollectionProperty('doors');
        this.initializeCollectionProperty('chests');
        
        //load existing area:
        if('undefined' !== typeof(id)) {
            this.setProperty('id', parseFloat(id));
            this.load();
        }
    };
    
    inheritPrototype(area, typedObject);
    
    area.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'id':
            case 'name':
            case 'floorplan': //simple polygon
            case 'floorTexture': //texture
            case 'wallTexture': //texture
            case 'doorTexture': //texture
            case 'chestTexture': //texture
            case 'width':
            case 'height':
            case 'archived':
                this['_' + property] = value;
                break;
            //TODO: consider using a DTO for these; this will remove direct referencing of positions within arrays:
            case 'edgeWalls': //[simple path, top, left, height, width]
            case 'edgeWallGaps': //[simple path, top, left, height, width]
            case 'innerWalls': //[simple path, top, left, height, width]
            case 'doors': //[segment position, isOpen, isLocked, isTrapped, isHidden] - represented by door DTO
            case 'chests': //[top, left, height, width, rotation, isOpen, isLocked, isTrapped, isHidden] - represented by chest DTO
                return this['_' + property].push(value) - 1;
            default:
                return typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
        
        return null;
    };
    
    area.prototype.initializeCollectionProperty = function(property, value) {
        switch(property) {
            case 'edgeWalls':
            case 'edgeWallGaps':
            case 'innerWalls':
            case 'doors':
            case 'chests':
                if('undefined' === typeof(value)) {
                    this['_' + property] = [];
                } else {
                    this['_' + property] = value;
                }
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
    area.prototype.createName = function(nameType) {
        var name = "";
        
        //TODO: nameType of "copy" along with ID of area being copied; like 'new' case, find the greastest number of 'copy of xxx #' and increment
        
        switch(nameType) {
            case 'new':
                var newNameBase = 'new area ';
                var greatestNewNameNumber = 0;
                
                state.APIAreaMapper.areas.forEach(function(a) {
                    a.forEach(function(prop) {
                        if(prop[0] == 'name') {
                            if(prop[1].indexOf(newNameBase) === 0) {
                                greatestNewNameNumber = Math.max(greatestNewNameNumber, parseInt(prop[1].substring(newNameBase.length)));
                            }
                        }
                    }, this);
                }, this);
                
                name = newNameBase + (greatestNewNameNumber + 1);
                break;
            default:
                log("Unhandled nameType of '" + nameType + "' in area.createName().");
                return null;
        }
        
        return name;
    };
    
    area.prototype.create = function(rawPath, pageId, top, left, isFromEvent) {
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var sp = g.convertComplexPolygonToSimplePolygon(0);
        var rp = g.getRawPath('simplePolygons', sp);
        this.setProperty('id', Math.random());
        this.setProperty('name', this.createName('new'));
        this.setProperty('floorplan', rp.rawPath);
        this.setProperty('floorTexture', new texture().getStateObject());
        this.setProperty('wallTexture', new texture().getStateObject());
        this.setProperty('doorTexture', new texture().getStateObject());
        this.setProperty('chestTexture', new texture().getStateObject());
        
        //initially, edge walls will be identical to the floorplan, because no gaps have been declared:
        this.setProperty('edgeWalls', [rp.rawPath, 0, 0, rp.height, rp.width]);
        
        this.setProperty('width', rp.width);
        this.setProperty('height', rp.height);
        this.setProperty('archived', 0);
        this.save();
        
        this.createInstance(pageId, rp.top, rp.left);
        
        var followUpAction = [];
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    //undraws and destroys all instances:
    area.prototype.hide = function() {
        this.undraw();
        
        //remove all area instances from state:
        var areaInstances = state.APIAreaMapper.areaInstances;
        for(var i = areaInstances.length - 1; i >= 0; i--) {
            
            //note: expects areaId to be the first property:
            if(areaInstances[i][0][1] === this.getProperty('id')) {
                state.APIAreaMapper.areaInstances.splice(i, 1);        
            }
        }
    };
    
    area.prototype.load = function() {
        
        //note: each area's state is stored in an array of key/value pairs
        
        var id = this.getProperty('id');
        var areas = state.APIAreaMapper.areas;
        var areaState;
        areas.forEach(function(a) {
            a.forEach(function(prop) {
                if(prop[0] === 'id' && prop[1] === id) {
                    areaState = a;
                    return;
                }
            });
            
            if(areaState) {
                return;
            }
        });
        
        for(var i = 0; i < areaState.length; i++) {
            switch(areaState[i][0]) {
                case 'id':
                case 'name':
                case 'floorplan':
                case 'floorTexture':
                case 'wallTexture':
                case 'doorTexture':
                case 'chestTexture':
                case 'width':
                case 'height':
                case 'archived':
                    this.setProperty(areaState[i][0], areaState[i][1]);
                    break;
                case 'edgeWalls':
                case 'edgeWallGaps':
                case 'innerWalls':
                case 'doors':
                case 'chests':
                    this.initializeCollectionProperty(areaState[i][0], areaState[i][1]);
                    break;
                default:
                    log('Unknown property "' + areaState[i][0] + '" in area.load().');
                    break;
            }
        }
    };
    
    area.prototype.save = function() {
        var areaState = [];
        areaState.push(['id', this.getProperty('id')]);
        areaState.push(['name', this.getProperty('name')]);
        areaState.push(['floorplan', this.getProperty('floorplan')]);
        areaState.push(['floorTexture', this.getProperty('floorTexture')]);
        areaState.push(['wallTexture', this.getProperty('wallTexture')]);
        areaState.push(['doorTexture', this.getProperty('doorTexture')]);
        areaState.push(['chestTexture', this.getProperty('chestTexture')]);
        areaState.push(['width', this.getProperty('width')]);
        areaState.push(['height', this.getProperty('height')]);
        areaState.push(['archived', this.getProperty('archived')]);
        areaState.push(['edgeWalls', this.getProperty('edgeWalls')]);
        areaState.push(['edgeWallGaps', this.getProperty('edgeWallGaps')]);
        areaState.push(['innerWalls', this.getProperty('innerWalls')]);
        areaState.push(['doors', this.getProperty('doors')]);
        areaState.push(['chests', this.getProperty('chests')]);
        
        //remove existing area state:
        var id = this.getProperty('id');
        var areas = state.APIAreaMapper.areas;
        var oldAreaState;
        for(var i = 0; i < areas.length; i++) {
            areas[i].forEach(function(prop) {
                if(prop[0] === 'id' && prop[1] === id) {
                    oldAreaState = state.APIAreaMapper.areas.splice(i, 1);
                    return;
                }
            });
 
            if(oldAreaState) {
                break;
            }
        }
        
        //save the updated area state:
        state.APIAreaMapper.areas.push(areaState);
    };
    
    //draws an instance on the page, if one already exists, it'll be redrawn in the new location:
    area.prototype.createInstance = function(pageId, top, left) {
        var followUpAction = [];
        
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.setProperty('top', top);
        instance.setProperty('left', left);
        instance.save();
        instance.draw();
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.getEdgeWallGapPointsPath = function(pageId) {
        var topOffset = 0,
            leftOffset = 0;
        
        //if pageId is not null, it is expected to offset the gaps based on the area instance:
        if('undefined' !== typeof(pageId)) {
            
            //get instance that removal is relative to:
            var instance = new areaInstance(this.getProperty('id'), pageId);
            topOffset = instance.getProperty('top');
            leftOffset = instance.getProperty('left');
        }
        
        var g = new graph();
        
        var edgeWallGaps = [];
        this.getProperty('edgeWallGaps').forEach(function(ewg) {
            
            //convert raw paths to points paths:
            ewgI = g.addSimplePath(ewg[0], ewg[1] + topOffset, ewg[2] + leftOffset);
            edgeWallGaps.push(g.getPointsPath('simplePaths', ewgI));
        }, this);
        
        return edgeWallGaps;
    };
    
    area.prototype.calculateEdgeWallGaps = function() {
        var g = new graph();
        
        var floorplan = this.getProperty('floorplan');
        var floorplanIndex = g.addSimplePolygon(floorplan);
        var edgeWallPaths = this.getProperty('edgeWalls');
        
        var edgeWallPointPaths = [];
        
        edgeWallPaths.forEach(function(ew) {
            var spI = g.addSimplePath(ew[0], ew[1], ew[2]);
            edgeWallPointPaths.push(g.getPointsPath('simplePaths', spI));
        }, this);
        
        var edgeWallGaps = g.removePathIntersections('simplePolygons', floorplanIndex, edgeWallPointPaths);
        
        var edgeWallGapRawPaths = [];
        edgeWallGaps.forEach(function(ewg) {
            
            //convert points paths to raw paths:
            ewgI = g.addSimplePathFromPoints(ewg);
            var ewgRaw = g.getRawPath('simplePaths', ewgI);
            edgeWallGapRawPaths.push([ewgRaw.rawPath, ewgRaw.top, ewgRaw.left, ewgRaw.height, ewgRaw.width]);
        }, this);
        this.initializeCollectionProperty('edgeWallGaps', edgeWallGapRawPaths);
        
        return edgeWallGaps;
    };
    
    //alters the area's floorplan using an area instance as a control:
    area.prototype.floorplanAppend = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        
        //get a simple polygon from the rawPath:
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var appendOpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that appending is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //TODO: factor in instance's rotation & scale:
        var floorplanOpIndex = g.addSimplePolygon(this.getProperty('floorplan'), instance.getProperty('top'), instance.getProperty('left'));
        var mergedOpIndex = g.mergeSimplePolygons(floorplanOpIndex, appendOpIndex);
        
        //if the polygons intersect, or if the old one is engulfed in the new one, update the floorplan:
        if(mergedOpIndex !== null) {
            var rp = g.getRawPath('simplePolygons', mergedOpIndex);
            this.setProperty('floorplan', rp.rawPath);
            this.setProperty('width', rp.width);
            this.setProperty('height', rp.height);
            
            //find the difference in top / left from what it used to be for this instance:
            var topDelta = instance.getProperty('top') - rp.top;
            var leftDelta = instance.getProperty('left') - rp.left;
            
            var oldEdgeWallGaps = this.getEdgeWallGapPointsPath(pageId);
            
            //if there are no edge wall gaps, just use the new floorplan for edge walls:
            if(!oldEdgeWallGaps || !oldEdgeWallGaps.length) {
                this.initializeCollectionProperty('edgeWalls');
                this.setProperty('edgeWalls', [rp.rawPath, 0, 0, rp.height, rp.width]);
            } else {
                this.initializeCollectionProperty('edgeWalls');
                var edgeWallPaths = g.removePathIntersections('simplePolygons', mergedOpIndex, oldEdgeWallGaps);
                
                //convert edgeWallPaths into raw paths:
                edgeWallPaths.forEach(function(ew) {
                    var ewSpI = g.addSimplePathFromPoints(ew);
                    var rp = g.getRawPath('simplePaths', ewSpI);
                    this.setProperty('edgeWalls', [rp.rawPath, rp.top - instance.getProperty('top') + topDelta, rp.left - instance.getProperty('left') + leftDelta, rp.height, rp.width]);
                }, this);
                
                this.calculateEdgeWallGaps();
            }
            
            //adjust top / left of all objects within the area:
            if(topDelta !== 0 || leftDelta !== 0) {
                
                this.getProperty('innerWalls').forEach(function(iw) {
                    iw[1] += topDelta;
                    iw[2] += leftDelta;
                }, this);
                
                var doors = this.getProperty('doors');
                for(var i = 0; i < doors.length; i++) {
                    var doorState = new door(doors[i]);
                    var s = doorState.getProperty('positionSegment');
                    s.a.x += leftDelta;
                    s.a.y += topDelta;
                    s.b.x += leftDelta;
                    s.b.y += topDelta;
                    doorState.setProperty('positionSegment', s);
                    this.getProperty('doors')[i] = doorState.getStateObject();
                }
                
                var chests = this.getProperty('chests');
                for(var i = 0; i < chests.length; i++) {
                    var chestState = new chest(chests[i]);
                    chestState.setProperty('top', chestState.getProperty('top') + topDelta);
                    chestState.setProperty('left', chestState.getProperty('left') + leftDelta);
                    this.getProperty('chests')[i] = chestState.getStateObject();
                }
            }
            
            //adjust all instances' positions so that they don't move visually:
            this.getInstancePageIds().forEach(function(pageId) {
                var instance = new areaInstance(this.getProperty('id'), pageId)
                instance.setProperty('top', instance.getProperty('top') - topDelta);
                instance.setProperty('left', instance.getProperty('left') - leftDelta);
                instance.save();
            }, this);
            
            this.save();
            this.draw();
        }
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.floorplanRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeOpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //TODO: factor in instance's rotation & scale:
        var floorplanOpIndex = g.addSimplePolygon(this.getProperty('floorplan'), instance.getProperty('top'), instance.getProperty('left'));
        var mergedOpIndex = g.removeFromSimplePolygon(floorplanOpIndex, removeOpIndex);
        
        if('undefined' !== typeof(mergedOpIndex)) {
            var oldEdgeWallGaps = this.getEdgeWallGapPointsPath(pageId);
            
            var rp = g.getRawPath('simplePolygons', mergedOpIndex);
            this.setProperty('floorplan', rp.rawPath);
            this.setProperty('width', rp.width);
            this.setProperty('height', rp.height);
            
            //find the difference in top / left from what it used to be for this instance:
            var topDelta = instance.getProperty('top') - rp.top;
            var leftDelta = instance.getProperty('left') - rp.left;
            
            //if there are no edge wall gaps, just use the new floorplan for edge walls:
            if(!oldEdgeWallGaps || !oldEdgeWallGaps.length) {
                this.initializeCollectionProperty('edgeWalls');
                this.setProperty('edgeWalls', [rp.rawPath, 0, 0, rp.height, rp.width]);
            } else {
                this.initializeCollectionProperty('edgeWalls');
                var edgeWallPaths = g.removePathIntersections('simplePolygons', mergedOpIndex, oldEdgeWallGaps);
                
                //convert edgeWallPaths into raw paths:
                edgeWallPaths.forEach(function(ew) {
                    var ewSpI = g.addSimplePathFromPoints(ew);
                    var rp = g.getRawPath('simplePaths', ewSpI);
                    this.setProperty('edgeWalls', [rp.rawPath, rp.top - instance.getProperty('top') + topDelta, rp.left - instance.getProperty('left') + leftDelta, rp.height, rp.width]);
                }, this);
                
                this.calculateEdgeWallGaps();
            }
            
            //adjust top / left of all objects within the area:
            if(topDelta !== 0 || leftDelta !== 0) {
                
                this.getProperty('innerWalls').forEach(function(iw) {
                    iw[1] += topDelta;
                    iw[2] += leftDelta;
                }, this);
                
                var doors = this.getProperty('doors');
                for(var i = 0; i < doors.length; i++) {
                    var doorState = new door(doors[i]);
                    var s = doorState.getProperty('positionSegment');
                    s.a.x += leftDelta;
                    s.a.y += topDelta;
                    s.b.x += leftDelta;
                    s.b.y += topDelta;
                    doorState.setProperty('positionSegment', s);
                    this.getProperty('doors')[i] = doorState.getStateObject();
                }
                
                var chests = this.getProperty('chests');
                for(var i = 0; i < chests.length; i++) {
                    var chestState = new chest(chests[i]);
                    chestState.setProperty('top', chestState.getProperty('top') + topDelta);
                    chestState.setProperty('left', chestState.getProperty('left') + leftDelta);
                    this.getProperty('chests')[i] = chestState.getStateObject();
                }
            }
            
            //adjust all instances' positions so that they don't move visually:
            this.getInstancePageIds().forEach(function(pageId) {
                var instance = new areaInstance(this.getProperty('id'), pageId)
                instance.setProperty('top', instance.getProperty('top') - topDelta);
                instance.setProperty('left', instance.getProperty('left') - leftDelta);
                instance.save();
            }, this);
            
            this.save();
            this.draw();
        }
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.edgeWallRemove = function(rawPath, pageId, top, left, isFromEvent) {
        followUpAction = [];
        
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //find removal's intersections with the floorplan edge:
        var floorplanSpIndex = g.addSimplePolygon(this.getProperty('floorplan'), instance.getProperty('top'), instance.getProperty('left'));
        var containedPaths = g.getIntersectingPaths('simplePolygons', removeSpIndex, 'simplePolygons', floorplanSpIndex);
        
        //append containedPaths with existing gaps (might result in multiples being merged):
        var oldEdgeWallGaps = [];
        this.getProperty('edgeWallGaps').forEach(function(ewg) {
            
            //convert raw paths to points paths:
            ewgI = g.addSimplePath(ewg[0], ewg[1] + instance.getProperty('top'), ewg[2] + instance.getProperty('left'));
            oldEdgeWallGaps.push(g.getPointsPath('simplePaths', ewgI));
        }, this);
        containedPaths = containedPaths.concat(oldEdgeWallGaps);
        
        var edgeWallPaths = g.removePathIntersections('simplePolygons', floorplanSpIndex, containedPaths);
        
        //merge and store edge wall gaps:
        var edgeWallGapPaths = g.removePathIntersections('simplePolygons', floorplanSpIndex, edgeWallPaths);
        this.initializeCollectionProperty('edgeWallGaps');
        edgeWallGapPaths.forEach(function(ewg) {
            
            //convert points paths to raw paths:
            ewgI = g.addSimplePathFromPoints(ewg);
            var ewgRaw = g.getRawPath('simplePaths', ewgI);
            this.setProperty('edgeWallGaps', [ewgRaw.rawPath, ewgRaw.top - instance.getProperty('top'), ewgRaw.left - instance.getProperty('left'), ewgRaw.height, ewgRaw.width]);
        }, this);
        
        //TODO: factor in instance's rotation & scale:
        //convert edgeWallPaths into raw paths:
        this.initializeCollectionProperty('edgeWalls');
        edgeWallPaths.forEach(function(ew) {
            var ewSpI = g.addSimplePathFromPoints(ew);
            var rp = g.getRawPath('simplePaths', ewSpI);
            this.setProperty('edgeWalls', [rp.rawPath, rp.top - instance.getProperty('top'), rp.left - instance.getProperty('left'), rp.height, rp.width]);
        }, this);
        
        this.save();
        this.draw();
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.edgeWallGapRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //TODO: factor in instance's rotation & scale:
        var oldEdgeWallGaps = this.getProperty('edgeWallGaps');
        var edgeWallGaps = [];
        for(var i = 0; i < oldEdgeWallGaps.length; i++) {
            var ewg = oldEdgeWallGaps[i];
            ewgI = g.addSimplePath(ewg[0], ewg[1] + instance.getProperty('top'), ewg[2] + instance.getProperty('left'));
            
            if(!g.hasInsideEntirePath('simplePolygons', removeSpIndex, 'simplePaths', ewgI)) {
                edgeWallGaps.push(oldEdgeWallGaps[i]);
            }
        }
        
        if(edgeWallGaps.length < oldEdgeWallGaps.length) {
            
            //update edge wall gaps property:
            this.initializeCollectionProperty('edgeWallGaps', edgeWallGaps);
            
            //update edge walls property:
            this.initializeCollectionProperty('edgeWalls');
            var floorplanOpIndex = g.addSimplePolygon(this.getProperty('floorplan'), instance.getProperty('top'), instance.getProperty('left'));
            var edgeWallPaths = g.removePathIntersections('simplePolygons', floorplanOpIndex, this.getEdgeWallGapPointsPath(pageId));
            
            //convert edgeWallPaths into raw paths:
            edgeWallPaths.forEach(function(ew) {
                var ewSpI = g.addSimplePathFromPoints(ew);
                var rp = g.getRawPath('simplePaths', ewSpI);
                this.setProperty('edgeWalls', [rp.rawPath, rp.top - instance.getProperty('top'), rp.left - instance.getProperty('left'), rp.height, rp.width]);
            }, this);
            
            this.save();
            this.draw();
        }

        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.innerWallAdd = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        var g = new graph();
        
        //get instance that addition is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //get the added path:
        var innerWallAddSpIndex = g.addSimplePath(rawPath, top - instance.getProperty('top'), left - instance.getProperty('left'), isFromEvent);
        
        //make sure that the inner wall is fully contained in the floorplan:
        var floorplanSpIndex = g.addSimplePolygon(this.getProperty('floorplan'));
        if(!g.hasInsideEntirePath('simplePolygons', floorplanSpIndex, 'simplePaths', innerWallAddSpIndex)) {
            followUpAction.message = 'Attempt to add inner walls that exceed the floorplan.';
            return followUpAction;
        }
        
        //add the inner wall:
        var rp = g.getRawPath('simplePaths', innerWallAddSpIndex);
        this.setProperty('innerWalls', [rp.rawPath, rp.top, rp.left, rp.height, rp.width]);
        
        this.save();
        this.draw();
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.innerWallRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        var g = new graph();
        
        //get instance that addition is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //get the removal polygon:
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        var newInnerWalls = [];
        
        //remove intersections from inner walls:
        this.getProperty('innerWalls').forEach(function(iw) {
            
            //add the inner wall to the graph:
            var iwSpIndex = g.addSimplePath(iw[0], iw[1] + instance.getProperty('top'), iw[2] + instance.getProperty('left'));
            
            //find intersections between the removal polygon and the inner wall:
            var removalIntersections = g.getIntersectingPaths('simplePolygons', removeSpIndex, 'simplePaths', iwSpIndex);
  
            //record new inner walls that avoid intersections:
            if(removalIntersections.length) {
                var newInnerWallPointPaths = g.removePathIntersections('simplePaths', iwSpIndex, removalIntersections);
                
                newInnerWallPointPaths.forEach(function(iwPP) {
                    var iwSpI = g.addSimplePathFromPoints(iwPP);
                    var rp = g.getRawPath('simplePaths', iwSpI);
                    newInnerWalls.push([rp.rawPath, rp.top - instance.getProperty('top'), rp.left - instance.getProperty('left'), rp.height, rp.width]);
                }, this);
            } else {
                newInnerWalls.push(iw);
            }
        }, this);
        
        this.initializeCollectionProperty('innerWalls', newInnerWalls);
        
        this.save();
        this.draw();
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.doorAdd = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        var g = new graph();
        
        //get instance that addition is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //get the addition polygon:
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var addSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        var pointCount = 0;
        var innerWallPoints = []; //array of [inner wall simplePath index, [intersecting points]]
        var edgeWallPoints = []; //array of [inner wall simplePath index, [intersecting points]]
        var innerWallSpIndexes = [];
        var edgeWallSpIndexes = [];
        
        //look for point intersections with inner walls:
        this.getProperty('innerWalls').forEach(function(iw) {
            
            //push iw into a simplePath:
            var iwI = g.addSimplePath(iw[0], iw[1] + instance.getProperty('top'), iw[2] + instance.getProperty('left'));
            innerWallSpIndexes.push(iwI);
            
            //find intersected points:
            var iwIntersectedPoints = g.getContainedPoints('simplePolygons', addSpIndex, 'simplePaths', iwI);
            
            //if there were matches, save them:
            if(iwIntersectedPoints && iwIntersectedPoints.length) {
                pointCount += iwIntersectedPoints.length;
                innerWallPoints.push([iwI, iwIntersectedPoints]);
            }
        }, this);
        
        //if we failed to find 2 points, look for inner wall segment intersections (excluding segments where point intersections succeeded) and derive points from the centers of the intersected sections:
        if(pointCount < 2) {
            innerWallSpIndexes.forEach(function(iwI) {
                
                //find intersecting paths:
                var iwIntersectedPaths = g.getIntersectingPaths('simplePolygons', addSpIndex, 'simplePaths', iwI);
      
                if(iwIntersectedPaths && iwIntersectedPaths.length) {
                    iwIntersectedPaths.forEach(function(iwip) {
                        
                        //ignore paths that have anything other than a single segment:
                        if(iwip.length === 2) {
                            
                            //ignore paths that contain an intersected point, to prevent double-counting:
                            var found = false;
                            for(var i = 0; i < iwip.length; i++) {
                                innerWallPoints.forEach(function(iwP) {
                                    if(iwP[0] === iwI) {
                                        iwP[1].forEach(function(p) {
                                            if(iwip[i].equals(p)) {
                                                found = true;
                                            }
                                        }, this);
                                    }
                                }, this);
                            }
                            
                            if(!found) {
                                
                                //push the midpoint of the intersected segment:
                                var newPoint = new segment(iwip[0], iwip[1]).midpoint();
                                
                                //push it into an existing array if one exists for iwI:
                                var pushed = false;
                                innerWallPoints.forEach(function(iwP) {
                                    if(iwP[0] === iwI) {
                                        iwP[1].push(newPoint);
                                        pushed = true;
                                    }
                                }, this);
                                
                                if(!pushed) {
                                    var pushObj = [iwI, []];
                                    pushObj[1].push(newPoint);
                                    innerWallPoints.push(pushObj);
                                }
                                
                                pointCount++;
                            }
                        }
                    }, this);
                }
            }, this);
        }
        
        //if we don't have 2 points yet, look to edge walls for point intersections:
        if(pointCount < 2) {
            
            //look for point intersections with edge walls:
            this.getProperty('edgeWalls').forEach(function(ew) {
                
                //push ew into a simplePath:
                var ewI = g.addSimplePath(ew[0], ew[1] + instance.getProperty('top'), ew[2] + instance.getProperty('left'));
                edgeWallSpIndexes.push(ewI);
                
                //find intersected points:
                var ewIntersectedPoints = g.getContainedPoints('simplePolygons', addSpIndex, 'simplePaths', ewI);
                
                //if there were matches, save them:
                if(ewIntersectedPoints && ewIntersectedPoints.length) {
                    pointCount += ewIntersectedPoints.length;
                    edgeWallPoints.push([ewI, ewIntersectedPoints]);
                }
            }, this);
        }
        
        //if we still don't have 2 points, look for edge wall segment intersections (excluding segments where point intersections succeeded) and derive points from the centers of the intersected sections:
        if(pointCount < 2) {
            edgeWallSpIndexes.forEach(function(ewI) {
                
                //find intersecting paths:
                var ewIntersectedPaths = g.getIntersectingPaths('simplePolygons', addSpIndex, 'simplePaths', ewI);
                
                if(ewIntersectedPaths && ewIntersectedPaths.length) {
                    ewIntersectedPaths.forEach(function(ewip) {
                        
                        //ignore paths that have anything other than a single segment:
                        if(ewip.length === 2) {
                            
                            //ignore paths that contain an intersected point, to prevent double-counting:
                            var found = false;
                            for(var i = 0; i < ewip.length; i++) {
                                edgeWallPoints.forEach(function(ewP) {
                                    if(ewP[0] === ewI) {
                                        ewP[1].forEach(function(p) {
                                            if(ewip[i].equals(p)) {
                                                found = true;
                                            }
                                        }, this);
                                    }
                                }, this);
                            }
                            
                            if(!found) {
                                
                                //push the midpoint of the intersected segment:
                                var newPoint = new segment(ewip[0], ewip[1]).midpoint();
                                
                                //push it into an existing array if one exists for iwI:
                                var pushed = false;
                                edgeWallPoints.forEach(function(ewP) {
                                    if(ewP[0] === ewI) {
                                        ewP[1].push(newPoint);
                                        pushed = true;
                                    }
                                }, this);
                                
                                if(!pushed) {
                                    var pushObj = [ewI, []];
                                    pushObj[1].push(newPoint);
                                    edgeWallPoints.push(pushObj);
                                }
                                
                                pointCount++;
                            }
                        }
                    }, this);
                }
            }, this);
        }
       
        if(pointCount < 2) {
            followUpAction.message = 'Attempt to add door failed because fewer than 2 points were identified.';
            return followUpAction;
        } 
        
        if(pointCount > 2) {
            followUpAction.message = 'Attempt to add door failed because more than 2 points were identified.';
            return followUpAction;
        }
        
        //extract the points:
        var doorSegmentPoints = [];
        innerWallPoints.forEach(function(iwp) {
            iwp[1].forEach(function(p) {
                p.x -= instance.getProperty('left');
                p.y -= instance.getProperty('top');
                doorSegmentPoints.push(p);
            }, this);
        }, this);
        edgeWallPoints.forEach(function(ewp) {
            ewp[1].forEach(function(p) {
                p.x -= instance.getProperty('left');
                p.y -= instance.getProperty('top');
                doorSegmentPoints.push(p);
            }, this);
        }, this);
        
        //place the new door as a segment connecting the two points:
        var doorState = new door();
        doorState.setProperty('positionSegment', new segment(doorSegmentPoints[0], doorSegmentPoints[1]));
        this.setProperty('doors', doorState.getStateObject());
        
        this.save();
        this.draw();
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.doorRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        var oldDoors = this.getProperty('doors');
        var doors = [];
        for(var i = 0; i < oldDoors.length; i++) {
            var oldDoorPositionSegment = new door(oldDoors[i]).getProperty('positionSegment');
            
            var s = new segment(
                new point(
                    oldDoorPositionSegment.a.x + instance.getProperty('left'),
                    oldDoorPositionSegment.a.y + instance.getProperty('top')),
                new point(
                    oldDoorPositionSegment.b.x + instance.getProperty('left'),
                    oldDoorPositionSegment.b.y + instance.getProperty('top'))
            );
            
            if(!g.hasInsideSegment('simplePolygons', removeSpIndex, s)) {
                doors.push(oldDoors[i]);
            }
        }
        
        if(doors.length < oldDoors.length) {
            this.initializeCollectionProperty('doors', doors);
            
            this.save();
            this.draw();
        }
      
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.chestAdd = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        var g = new graph();
        
        //get instance that addition is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        //get the addition polygon:
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var addSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        var addRp = g.getRawPath('simplePolygons', addSpIndex);
        
        //create the chest using the polygon's position, width, and height:
        var chestState = new chest();
        chestState.setProperty('top', addRp.top - instance.getProperty('top'));
        chestState.setProperty('left', addRp.left - instance.getProperty('left'));
        chestState.setProperty('height', addRp.height);
        chestState.setProperty('width', addRp.width);
        chestState.setProperty('rotation', 0);
        this.setProperty('chests', chestState.getStateObject());
        
        this.save();
        this.draw();
        
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.chestRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var followUpAction = [];
        
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        
        //handle illogical case where drawing is done on a page without an instance:
        if(instance.getProperty('isNew')) {
            followUpAction.message = 'Area modification attempted on a page without a drawn instance.';
            return followUpAction;
        }
        
        var oldChests = this.getProperty('chests');
        var chests = [];
        
        oldChests.forEach(function(c) {
            var chestState = new chest(c);
            var chestTop = chestState.getProperty('top') + instance.getProperty('top');
            var chestLeft = chestState.getProperty('left') + instance.getProperty('left');
            var chestCenter = new point(chestLeft + (chestState.getProperty('width') / 2), chestTop + (chestState.getProperty('height') / 2));
            
            if(!g.hasInsidePoint('simplePolygons', removeSpIndex, chestCenter)) {
                chests.push(c);
            }
        }, this);
        
        if(chests.length < oldChests.length) {
            this.initializeCollectionProperty('chests', chests);
            
            this.save();
            this.draw();
        }
      
        followUpAction.refresh = true;
        return followUpAction;
    };
    
    area.prototype.cycleStandardAsset = function(objectType) {
        switch(objectType) {
            case 'floor':
                var standardTexture = new texture(this.getProperty('floorTexture'));
                
                //if the texture is already a standard asset, cycle to the next one:
                if(standardTexture.getProperty('textureType') == 'asset') {
                    standardTexture.setProperty('value', ((standardTexture.getProperty('value') + 1) % state.APIAreaMapper.floorAssets.length));
                }
                //set the texture to the first standard asset:
                else {
                    standardTexture.setProperty('textureType', 'asset');
                    standardTexture.setProperty('value', 0);
                }
                
                this.setProperty('floorTexture', standardTexture.getStateObject());
                break;
            case 'walls':
                var standardTexture = new texture(this.getProperty('wallTexture'));
                
                //if the texture is already a standard asset, cycle to the next one:
                if(standardTexture.getProperty('textureType') == 'asset') {
                    standardTexture.setProperty('value', ((standardTexture.getProperty('value') + 1) % state.APIAreaMapper.wallAssets.length));
                }
                //set the texture to the first standard asset:
                else {
                    standardTexture.setProperty('textureType', 'asset');
                    standardTexture.setProperty('value', 0);
                }
                
                this.setProperty('wallTexture', standardTexture.getStateObject());
                break;
            case 'doors':
                var standardTexture = new texture(this.getProperty('doorTexture'));
                
                //if the texture is already a standard asset pair, cycle to the next one:
                if(standardTexture.getProperty('textureType') == 'asset') {
                    standardTexture.setProperty('value', ((standardTexture.getProperty('value') + 1) % state.APIAreaMapper.doorAssets.length));
                }
                //set the texture to the first standard asset pair:
                else {
                    standardTexture.setProperty('textureType', 'asset');
                    standardTexture.setProperty('value', 0);
                }
                
                this.setProperty('doorTexture', standardTexture.getStateObject());
                break;
            case 'chests':
                var standardTexture = new texture(this.getProperty('chestTexture'));
                
                //if the texture is already a standard asset pair, cycle to the next one:
                if(standardTexture.getProperty('textureType') == 'asset') {
                    standardTexture.setProperty('value', ((standardTexture.getProperty('value') + 1) % state.APIAreaMapper.chestAssets.length));
                }
                //set the texture to the first standard asset pair:
                else {
                    standardTexture.setProperty('textureType', 'asset');
                    standardTexture.setProperty('value', 0);
                }
                
                this.setProperty('chestTexture', standardTexture.getStateObject());
                break;
            default:
                log('Unhandled objectType of ' + objectType + ' in area.cycleStandardAsset().');
                return;
        }
        
        this.save();
        this.draw();
    };
    
    area.prototype.useTransparentAsset = function(objectType) {
        switch(objectType) {
            case 'floor':
                var standardTexture = new texture();
                standardTexture.setProperty('textureType', 'transparent');
                standardTexture.setProperty('value', '');
                this.setProperty('floorTexture', standardTexture.getStateObject());
                break;
            default:
                log('Unhandled objectType of ' + objectType + ' in area.useTransparentAsset().');
                return;
        }
        
        this.save();
        this.draw();
    };
    
    area.prototype.getInstancePageIds = function() {
        var instancePageIds = [];
    
        state.APIAreaMapper.areaInstances.forEach(function(a) {
            if(a[0][1] === this.getProperty('id')) {
                instancePageIds.push(a[1][1])
            }
        }, this);
        
        return instancePageIds;
    };
    
    area.prototype.undraw = function() {
        this.getInstancePageIds().forEach(function(pageId) {
            var instance = new areaInstance(this.getProperty('id'), pageId)
            instance.undraw();
        }, this);
    };
    
    area.prototype.draw = function() {
        this.getInstancePageIds().forEach(function(pageId) {
            var instance = new areaInstance(this.getProperty('id'), pageId)
            instance.draw();
        }, this);
    };
    
    area.prototype.handleGraphicChange = function(graphic) {
        var instance = new areaInstance(this.getProperty('id'), graphic.get('_pageid'));
        instance.handleGraphicChange(graphic);
    };
    
    area.prototype.getManagedGraphicProperties = function(graphic) {
        var instance = new areaInstance(this.getProperty('id'), graphic.get('_pageid'));
        var managedGraphic = instance.findManagedGraphic(graphic);
        
        if(!managedGraphic) {
            return null;
        }
        
        managedGraphic.properties = this.getProperty(managedGraphic.graphicType)[managedGraphic.graphicIndex];
        
        return managedGraphic;
    };
    
    area.prototype.toggleInteractiveProperty = function(graphic, property) {
        var instance = new areaInstance(this.getProperty('id'), graphic.get('_pageid'));
        return instance.toggleInteractiveProperty(graphic, property);
    };
    
    //draws an interactive object in all instances:
    area.prototype.drawInteractiveObject = function(objectType, masterIndex, featureTagsOnly, selectedObject) {
        this.getInstancePageIds().forEach(function(pageId) {
            var instance = new areaInstance(this.getProperty('id'), pageId)
            instance.drawInteractiveObject(objectType, masterIndex, featureTagsOnly, selectedObject);
        }, this);
    };
    
    
    var areaInstance = function(areaId, pageId) {
        typedObject.call(this);
        this._type.push('areaInstance');
        this._areaId = areaId;
        this._pageId = pageId;
        this.initializeCollectionProperty('wallIds');
        this.initializeCollectionProperty('edgeWallGapIds');
        this.initializeCollectionProperty('losWallIds');
        this.initializeCollectionProperty('blueprintWallIds');
        this.initializeCollectionProperty('doorIds');
        this.initializeCollectionProperty('chestIds');
        this.initializeCollectionProperty('blueprintDoorIds');
        this.initializeCollectionProperty('blueprintChestIds');
        
        this.load();
    };
    
    inheritPrototype(areaInstance, typedObject);
    
    areaInstance.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'areaId':
            case 'pageId':
            case 'isNew': //this is not persisted
            case 'area':
            case 'top':
            case 'left':
            case 'floorPolygonId': //path
            case 'floorTileId': //token
            case 'floorMaskId': //path
                this['_' + property] = value;
                break;
            case 'wallIds': //tokens
            case 'edgeWallGapIds': //paths
            case 'losWallIds': //paths
            case 'blueprintWallIds': //paths
            //TODO: consider using polymorphic DTOs for these to remove direct referencing of positions within arrays:
            case 'doorIds': //[door token, LoS wall path, feature tag paths]
            case 'chestIds': //[chest token, feature tag paths]
            case 'blueprintDoorIds': //paths
            case 'blueprintChestIds': //paths
                return this['_' + property].push(value) - 1;
            default:
                return typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    areaInstance.prototype.initializeCollectionProperty = function(property, value) {
        switch(property) {
            case 'wallIds':
            case 'edgeWallGapIds':
            case 'losWallIds':
            case 'blueprintWallIds':
            case 'doorIds':
            case 'chestIds':
            case 'blueprintDoorIds':
            case 'blueprintChestIds':
                if('undefined' === typeof(value)) {
                    this['_' + property] = [];
                } else {
                    this['_' + property] = value;
                }
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
    areaInstance.prototype.load = function() {
        
        //note: each areaInstance's state is stored in an array of key/value pairs
        
        var areaId = this.getProperty('areaId');
        var pageId = this.getProperty('pageId');
        
        var areaInstances = state.APIAreaMapper.areaInstances;
        var areaInstanceState;
        areaInstances.forEach(function(a) {
            if(a[0][1] === areaId && a[1][1] === pageId) {
                areaInstanceState = a;
                return;
            }
            
            if(areaInstanceState) {
                return;
            }
        }, this);
        
        //couldn't find any state to load:
        if(!areaInstanceState) {
            
            //set an indicator on the areaInstance that specifies it being new:
            this.setProperty('isNew', true);
            return;
        }
        
        for(var i = 0; i < areaInstanceState.length; i++) {
            switch(areaInstanceState[i][0]) {
                case 'areaId':
                case 'pageId':
                case 'top':
                case 'left':
                case 'floorPolygonId':
                case 'floorTileId':
                case 'floorMaskId':
                    this.setProperty(areaInstanceState[i][0], areaInstanceState[i][1]);
                    break;
                case 'wallIds':
                case 'edgeWallGapIds':
                case 'losWallIds':
                case 'blueprintWallIds':
                case 'doorIds':
                case 'chestIds':
                case 'blueprintDoorIds':
                case 'blueprintChestIds':
                    this.initializeCollectionProperty(areaInstanceState[i][0], areaInstanceState[i][1]);
                    break;
                default:
                    log('Unknown property "' + areaInstanceState[i][0] + '" in areaInstance.load().');
                    break;
            }
        }
    };
    
    areaInstance.prototype.save = function() {
        var areaInstanceState = [];
        areaInstanceState.push(['areaId', this.getProperty('areaId')]);
        areaInstanceState.push(['pageId', this.getProperty('pageId')]);
        areaInstanceState.push(['top', this.getProperty('top')]);
        areaInstanceState.push(['left', this.getProperty('left')]);
        areaInstanceState.push(['floorPolygonId', this.getProperty('floorPolygonId')]);
        areaInstanceState.push(['floorTileId', this.getProperty('floorTileId')]);
        areaInstanceState.push(['floorMaskId', this.getProperty('floorMaskId')]);
        areaInstanceState.push(['wallIds', this.getProperty('wallIds')]);
        areaInstanceState.push(['losWallIds', this.getProperty('losWallIds')]);
        areaInstanceState.push(['edgeWallGapIds', this.getProperty('edgeWallGapIds')]);
        areaInstanceState.push(['blueprintWallIds', this.getProperty('blueprintWallIds')]);
        areaInstanceState.push(['doorIds', this.getProperty('doorIds')]);
        areaInstanceState.push(['chestIds', this.getProperty('chestIds')]);
        areaInstanceState.push(['blueprintDoorIds', this.getProperty('blueprintDoorIds')]);
        areaInstanceState.push(['blueprintChestIds', this.getProperty('blueprintChestIds')]);
        
        //remove existing area instance state:
        var areaInstances = state.APIAreaMapper.areaInstances;
        var oldAreaInstanceState;
        for(var i = 0; i < areaInstances.length; i++) {
            
            //note: expects areaId and pageId to be the first and second properties:
            if(areaInstances[i][0][1] === this.getProperty('areaId')
                    && areaInstances[i][1][1] === this.getProperty('pageId')) {
                oldAreaInstanceState = state.APIAreaMapper.areaInstances.splice(i, 1);        
            }
   
            if(oldAreaInstanceState) {
                break;
            }
        }
        
        //save the updated area instance state:
        state.APIAreaMapper.areaInstances.push(areaInstanceState);
    };
    
    areaInstance.prototype.undraw = function() {
        this.load();
        
        //delete floorPolygon:
        deleteObject('path', this.getProperty('floorPolygonId'));
        this.setProperty('floorPolygonId', '');
        
        //delete floor tile:
        deleteObject('graphic', this.getProperty('floorTileId'));
        this.setProperty('floorTileId', '');
        
        //delete floor tile mask:
        deleteObject('path', this.getProperty('floorMaskId'));
        this.setProperty('floorMaskId', '');
        
        //delete walls:
        this.getProperty('wallIds').forEach(function(wId) {
            deleteObject('graphic', wId);
        }, this);
        this.initializeCollectionProperty('wallIds');
        
        //delete edge wall gaps:
        this.getProperty('edgeWallGapIds').forEach(function(wId) {
            deleteObject('path', wId);
        }, this);
        this.initializeCollectionProperty('edgeWallGapIds');
        
        //delete blueprint walls:
        this.getProperty('blueprintWallIds').forEach(function(wId) {
            deleteObject('path', wId);
        }, this);
        this.initializeCollectionProperty('blueprintWallIds');
        
        //delete line of sight blocking walls:
        this.getProperty('losWallIds').forEach(function(wId) {
            deleteObject('path', wId);
        }, this);
        this.initializeCollectionProperty('losWallIds');
        
        //delete doors:
        this.getProperty('doorIds').forEach(function(dId) {
            
            //delete door token:
            deleteObject('graphic', dId[0]);
            
            //delete LoS wall (which may not exist):
            deleteObject('path', dId[1]);
            
            //delete feature tag paths:
            dId[2].forEach(function(ftId) {
                deleteObject('path', ftId);
            }, this);
        }, this);
        this.initializeCollectionProperty('doorIds');
        
        //delete chests:
        this.getProperty('chestIds').forEach(function(cId) {
            
            //delete chest token:
            deleteObject('graphic', cId[0]);
            
            //delete feature tag paths:
            cId[1].forEach(function(ftId) {
                deleteObject('path', ftId);
            }, this);
        }, this);
        this.initializeCollectionProperty('chestIds');
        
        //delete blueprint doors:
        this.getProperty('blueprintDoorIds').forEach(function(wId) {
            deleteObject('path', wId);
        }, this);
        this.initializeCollectionProperty('blueprintDoorIds');
        
        //delete blueprint chests:
        this.getProperty('blueprintChestIds').forEach(function(cId) {
            deleteObject('path', cId);
        }, this);
        this.initializeCollectionProperty('blueprintChestIds');
        
        this.save();
    };
    
    areaInstance.prototype.draw = function() {
        this.undraw();
        
        if(state.APIAreaMapper.blueprintMode) {
            this.drawBlueprint();
        } else {
            this.drawObjects();
        }
    };
    
    areaInstance.prototype.drawObjects = function() {
        this.load();
        
        var top = this.getProperty('top');
        var left = this.getProperty('left');
        
        //get the floorplan from the area:
        var a = new area(this.getProperty('areaId'));
        
        //draw new floor tile:
        var floorTexture = new texture(a.getProperty('floorTexture'));
        //TODO: uniqueAsset:
        switch(floorTexture.getProperty('textureType')) {
            case 'asset':
                var floorAsset = new asset(state.APIAreaMapper.floorAssets[floorTexture.getProperty('value')]);
                var floorTile = createTokenObjectFromAsset(
                    floorAsset,
                    this.getProperty('pageId'), 
                    'map',
                    top,
                    left,
                    a.getProperty('height'),
                    a.getProperty('width'));
                this.setProperty('floorTileId', floorTile.id);
                break;
            case 'transparent':
                break;
            default:
                log('Unhandled textureType of ' + floorTexture.getProperty('textureType') + ' for floorTexture in areaInstance.drawObjects().');
                break;
        }
        
        //draw floor tile mask:
        var page = getObj('page', this.getProperty('pageId'));
        var maskColor = page.get('background_color');
        var g = new graph();
        var floorplanOpIndex = g.addSimplePolygon(a.getProperty('floorplan'), top, left);
        var floorMaskOpIndex = g.invertSimplePolygon(floorplanOpIndex);
        var floorMaskRawPath = g.getRawPath('simplePolygons', floorMaskOpIndex);
        var floorMask = createPathObject(floorMaskRawPath.rawPath, this.getProperty('pageId'), 'map', maskColor, maskColor, floorMaskRawPath.top, floorMaskRawPath.left, floorMaskRawPath.height, floorMaskRawPath.width);
        this.setProperty('floorMaskId', floorMask.id);
        
        //TODO: unique texture (just sub it in as an alternate texture to use here):
        var wallTexture = new texture(a.getProperty('wallTexture'));
        var wallAsset;
        switch(wallTexture.getProperty('textureType')) {
            case 'asset':
                wallAsset = new asset(state.APIAreaMapper.wallAssets[wallTexture.getProperty('value')][0]);
                break;
            default:
                log('Unhandled textureType of ' + wallTexture.getProperty('textureType') + ' for wallTexture in areaInstance.drawObjects().');
                break;
        }
        
        //draw edge walls:
        a.getProperty('edgeWalls').forEach(function(ew) {
            
            //draw wall tokens:
            var ewIndex = g.addSimplePath(ew[0], top + ew[1], left + ew[2]);
            g.getProperty('simplePaths')[ewIndex].segments.forEach(function(s) {
                this.setProperty('wallIds', 
                    createTokenObjectFromAssetBySegment(
                            wallAsset,
                            this.getProperty('pageId'),
                            'objects',
                            new segment(new point(s.a.x, s.a.y), new point(s.b.x, s.b.y)),
                            wallThickness,
                            wallLengthExtension
                        ).id    
                );
            }, this);
            
            //draw line of sight blocking wall:
            this.setProperty('losWallIds',
                createPathObject(
                        ew[0],
                        this.getProperty('pageId'),
                        'walls',
                        '#ff0000',
                        'transparent',
                        top + ew[1],
                        left + ew[2],
                        ew[3],
                        ew[4]
                    ).id
            );
        }, this);
        
        //draw inner walls:
        a.getProperty('innerWalls').forEach(function(iw) {
            
            //draw wall tokens:
            var iwIndex = g.addSimplePath(iw[0], top + iw[1], left + iw[2]);
            g.getProperty('simplePaths')[iwIndex].segments.forEach(function(s) {
                this.setProperty('wallIds', 
                    createTokenObjectFromAssetBySegment(
                            wallAsset,
                            this.getProperty('pageId'),
                            'objects',
                            new segment(new point(s.a.x, s.a.y), new point(s.b.x, s.b.y)),
                            wallThickness,
                            wallLengthExtension
                        ).id    
                );
            }, this);
            
            //draw line of sight blocking wall:
            this.setProperty('losWallIds',
                createPathObject(
                        iw[0],
                        this.getProperty('pageId'),
                        'walls',
                        '#ff0000',
                        'transparent',
                        top + iw[1],
                        left + iw[2],
                        iw[3],
                        iw[4]
                    ).id
            );
        }, this);
        
        //draw doors:
        for(var i = 0; i < a.getProperty('doors').length; i++) {
            this.drawInteractiveObject('doors', i);
        }
        
        //draw chests:
        for(var i = 0; i < a.getProperty('chests').length; i++) {
            this.drawInteractiveObject('chests', i);
        }
       
        this.save();
    };
    
    //draws an interactive object, which may replace an existing one:
    areaInstance.prototype.drawInteractiveObject = function(objectType, masterIndex, featureTagsOnly, selectedObject) {
        
        //note: featureTagsOnly is expected to be true only when this is an existing object
        
        var a = new area(this.getProperty('areaId'));
        var g = new graph();
        
        var master = a.getProperty(objectType)[masterIndex];
        
        //TODO: normalize this code (after making DTOs):
        switch(objectType) {
            case 'doors':
                var doorState = new door(master);
                var dIndex = g.addSimplePathFromSegment(doorState.getProperty('positionSegment'), this.getProperty('top'), this.getProperty('left'));
                var s = g.getProperty('simplePaths')[dIndex].segments[0];
                var doorProperty = [];
                var doorAsset;
                
                //identify the door (or wall) asset:
                if(doorState.getProperty('isHidden')) {
                    //TODO: unique texture (just sub it in as an alternate texture to use here):
                    var wallTexture = new texture(a.getProperty('wallTexture'));
                    switch(wallTexture.getProperty('textureType')) {
                        case 'asset':
                            doorAsset = new asset(state.APIAreaMapper.wallAssets[wallTexture.getProperty('value')][doorState.getProperty('isOpen') ? 1 : 0]);
                            break;
                        default:
                            log('Unhandled textureType of ' + wallTexture.getProperty('textureType') + ' for wallTexture in areaInstance.drawObjects().');
                            break;
                    }
                } else {
                    //TODO: unique texture (just sub it in as an alternate texture to use here):
                    var doorTexture = new texture(a.getProperty('doorTexture'));
                    switch(doorTexture.getProperty('textureType')) {
                        case 'asset':
                            doorAsset = new asset(state.APIAreaMapper.doorAssets[doorTexture.getProperty('value')][doorState.getProperty('isOpen') ? 1 : 0]);
                            break;
                        default:
                            log('Unhandled textureType of ' + doorTexture.getProperty('textureType') + ' for doorTexture in areaInstance.drawObjects().');
                            break;
                    }
                }
                
                //if the number of objects in the area and the instance are equal, then this is modifying an existing object:
                var existingDoor = this.getProperty('doorIds').length === a.getProperty(objectType).length;
                var existingDoorIsSelected = false;
                
                if(existingDoor) {
                    
                    //delete feature tags:
                    this.getProperty('doorIds')[masterIndex][2].forEach(function(ftId) {
                        deleteObject('path', ftId);
                    }, this);
                    
                    //delete door:
                    if(!featureTagsOnly) {
                        //note: there is no behavioral difference in handling of hidden doors
                        
                        //the selectedObject will only be provided for the instance that was modified by the user:
                        existingDoorIsSelected = selectedObject && (this.getProperty('doorIds')[masterIndex][0] === selectedObject.id);
                            
                        //delete the old door image:
                        deleteObject('graphic', this.getProperty('doorIds')[masterIndex][0]);
                        
                        //delete the old door LoS wall (which may not exist):
                        deleteObject('path', this.getProperty('doorIds')[masterIndex][1]);
                        
                        //delete the old door feature tags:
                        this.getProperty('doorIds')[masterIndex][2].forEach(function(ftId) {
                            deleteObject('path', ftId);
                        }, this);
                    
                        //clear properties out to be prudent, but they will be overwritten soon anyway:
                        this.getProperty('doorIds')[masterIndex] = ['','',[]];
                    }
                }
                
                var doorToken;
                
                //keep existing door:
                if(featureTagsOnly) {
                    doorToken = getObj('graphic', this.getProperty('doorIds')[masterIndex][0]);
                    doorProperty.push(this.getProperty('doorIds')[masterIndex][0]); //door token ID
                    doorProperty.push(this.getProperty('doorIds')[masterIndex][1]); //door LoS path ID
                }
                //create a new door:
                else {
                    
                    //draw the door:
                    doorToken = createTokenObjectFromAssetBySegment(
                        doorAsset,
                        this.getProperty('pageId'),
                        'objects',
                        s,
                        (doorState.getProperty('isHidden') ? wallThickness : doorThickness),
                        (doorState.getProperty('isHidden') ? wallLengthExtension : doorLengthExtension));
                    
                    
                    //set door privs to players unless the door is hidden:
                    if(!doorState.getProperty('isHidden')) {
                        doorToken.set("controlledby", "all");
                    }
                    
                    //draw line of sight blocking wall if the door is closed:
                    var doorLosId = '';
                    if(!doorState.getProperty('isOpen')) {
                        var rp = g.getRawPath('simplePaths', dIndex);
                        doorLosId = createPathObject(
                                rp.rawPath, 
                                this.getProperty('pageId'), 
                                'walls', 
                                '#ff0000', 
                                'transparent', 
                                rp.top, 
                                rp.left, 
                                rp.height, 
                                rp.width
                            ).id;
                    }
                    
                    doorProperty.push(doorToken.id);
                    doorProperty.push(doorLosId);
                }
                
                //draw feature tags around the door:
                var featureTagColors = [];
                if(doorState.getProperty('isLocked')) {
                    featureTagColors.push(lockedTagColor);
                }
                if(doorState.getProperty('isTrapped')) {
                    featureTagColors.push(trappedTagColor);
                }
                if(doorState.getProperty('isHidden')) {
                    featureTagColors.push(hiddenTagColor);
                }
                var tagIds = createBandsBySegment(
                    this.getProperty('pageId'),
                    s,
                    (doorState.getProperty('isHidden') ? wallThickness : doorThickness),
                    (doorState.getProperty('isHidden') ? wallLengthExtension : doorLengthExtension),
                    featureTagColors);
                 
                doorProperty.push(tagIds);
                
                //if this is replacing an existing image, write it back into the appropriate slot:
                if(existingDoor) {
                    this.getProperty('doorIds')[masterIndex] = doorProperty;
                    
                    //if the selected door was replaced, store the new door as a false selection:
                    if(existingDoorIsSelected) {
                        state.APIAreaMapper.falseSelection = doorToken.id;
                    }
                }
                //if it's a new image, push it to the end (which will line up with the master's index):
                else {
                    this.setProperty('doorIds', doorProperty);
                }
                break;
            case 'chests':
                var chestState = new chest(master);
                var chestProperty = [];
                var chestAsset;
                
                //identify the chest asset:
                //TODO: unique texture (just sub it in as an alternate texture to use here):
                var chestTexture = new texture(a.getProperty('chestTexture'));
                switch(chestTexture.getProperty('textureType')) {
                    case 'asset':
                        chestAsset = new asset(state.APIAreaMapper.chestAssets[chestTexture.getProperty('value')][chestState.getProperty('isOpen') ? 1 : 0]);
                        break;
                    default:
                        log('Unhandled textureType of ' + chestTexture.getProperty('textureType') + ' for chestTexture in areaInstance.drawObjects().');
                        break;
                }
                
                var chestTop = chestState.getProperty('top') + this.getProperty('top');
                var chestLeft = chestState.getProperty('left') + this.getProperty('left');
                
                //if the number of objects in the area and the instance are equal, then this is modifying an existing object:
                var existingChest = this.getProperty('chestIds').length === a.getProperty(objectType).length;
                var existingChestIsSelected = false;
                
                if(existingChest) {
                    
                    //delete feature tags:
                    this.getProperty('chestIds')[masterIndex][1].forEach(function(ftId) {
                        deleteObject('path', ftId);
                    }, this);
                    
                    //delete chest:
                    if(!featureTagsOnly) {
                        //note: there is no behavioral difference in handling of hidden chests
                        
                        //the selectedObject will only be provided for the instance that was modified by the user:
                        existingChestIsSelected = selectedObject && (this.getProperty('chestIds')[masterIndex][0] === selectedObject.id);
                        
                        //delete the old chest image:
                        deleteObject('graphic', this.getProperty('chestIds')[masterIndex][0]);
                        
                        //delete the old chest feature tags:
                        this.getProperty('chestIds')[masterIndex][1].forEach(function(ftId) {
                            deleteObject('path', ftId);
                        }, this);
                    
                        //clear properties out to be prudent, but they will be overwritten soon anyway:
                        this.getProperty('chestIds')[masterIndex] = ['',[]];
                    }
                }
                
                var chestToken;
                
                //keep existing door:
                if(featureTagsOnly) {
                    chestToken = getObj('graphic', this.getProperty('chestIds')[masterIndex][0]);
                    chestProperty.push(this.getProperty('chestIds')[masterIndex][0]); //chest token ID
                }
                //create a new chest:
                else {
                    
                    //draw the chest (on the object or gm layer depending on it being hidden):
                    chestToken = createTokenObjectFromAsset(
                        chestAsset, 
                        this.getProperty('pageId'), 
                        (chestState.getProperty('isHidden') ? 'gmlayer' : 'objects'),
                        chestTop,
                        chestLeft,
                        chestState.getProperty('height'),
                        chestState.getProperty('width'),
                        chestState.getProperty('rotation'));
                       
                    //set chest privs to players unless the door is hidden:
                    if(!chestState.getProperty('isHidden')) {
                        chestToken.set("controlledby", "all");
                    }
                    
                    chestProperty.push(chestToken.id);
                }
                
                //draw feature tags around the chest:
                var featureTagColors = [];
                if(chestState.getProperty('isLocked')) {
                    featureTagColors.push(lockedTagColor);
                }
                if(chestState.getProperty('isTrapped')) {
                    featureTagColors.push(trappedTagColor);
                }
                if(chestState.getProperty('isHidden')) {
                    featureTagColors.push(hiddenTagColor);
                }
                var tagIds = createBands(
                    this.getProperty('pageId'),
                    chestTop,
                    chestLeft,
                    chestState.getProperty('height'),
                    chestState.getProperty('width'),
                    featureTagColors,
                    chestState.getProperty('rotation'));
                
                chestProperty.push(tagIds);
                
                //if this is replacing an existing image, write it back into the appropriate slot:
                if(existingChest) {
                    this.getProperty('chestIds')[masterIndex] = chestProperty;
                    
                    //if the selected chest was replaced, store the new chest as a false selection:
                    if(existingChestIsSelected) {
                        state.APIAreaMapper.falseSelection = chestToken.id;
                    }
                }
                //if it's a new image, push it to the end (which will line up with the master's index):
                else {
                    this.setProperty('chestIds', chestProperty);
                }
                break;
            default:
                log('Unsupported objectType of ' + objectType + ' in areaInstance.drawInteractiveObject().');
                return 'There was a problem; check the log for details.';
        }
        
        this.save();
        
        return null;
    };
    
    areaInstance.prototype.drawBlueprint = function() {
        this.load();
        
        var top = this.getProperty('top');
        var left = this.getProperty('left');
        
        var a = new area(this.getProperty('areaId'));
        var g = new graph();
        
        //create floorPolygon:
        this.setProperty('floorPolygonId', 
            createPathObject(
                    a.getProperty('floorplan'),
                    this.getProperty('pageId'),
                    'map',
                    state.APIAreaMapper.blueprintFloorPolygonColor,
                    state.APIAreaMapper.blueprintFloorPolygonColor,
                    top,
                    left,
                    a.getProperty('height'),
                    a.getProperty('width')
                ).id);
        
        //draw edge wall gaps:
        a.calculateEdgeWallGaps().forEach(function(ew) {
            var ewI = g.addSimplePathFromPoints(ew);
            var ewRaw = g.getRawPath('simplePaths', ewI);
            this.setProperty('edgeWallGapIds', 
                createPathObject(
                        ewRaw.rawPath,
                        this.getProperty('pageId'),
                        'objects',
                        state.APIAreaMapper.blueprintEdgeWallGapsPathColor,
                        'transparent',
                        top + ewRaw.top,
                        left + ewRaw.left,
                        ewRaw.height,
                        ewRaw.width,
                        5
                    ).id);
        }, this);
        
        //draw blueprint walls:
        a.getProperty('innerWalls').forEach(function(iw) {
            this.setProperty('blueprintWallIds', 
                createPathObject(
                        iw[0],
                        this.getProperty('pageId'),
                        'objects',
                        state.APIAreaMapper.blueprintInnerWallsPathColor,
                        'transparent',
                        top + iw[1],
                        left + iw[2],
                        iw[3],
                        iw[4],
                        2
                    ).id);
        }, this);
        
        //draw blueprint doors:
        a.getProperty('doors').forEach(function(s) {
            var dI = g.addSimplePathFromSegment(s[0], top, left);
            var rp = g.getRawPath('simplePaths', dI);
            this.setProperty('blueprintWallIds',
                createPathObject(
                        rp.rawPath,
                        this.getProperty('pageId'),
                        'objects',
                        state.APIAreaMapper.blueprintDoorPathColor,
                        'transparent',
                        rp.top,
                        rp.left,
                        rp.height,
                        rp.width,
                        2
                    ).id);
        }, this);
        
        //draw blueprint chests:
        a.getProperty('chests').forEach(function(c) {
            this.setProperty('blueprintChestIds', 
                createRectanglePathObject(
                        this.getProperty('pageId'),
                        'objects',
                        state.APIAreaMapper.blueprintChestPathColor,
                        state.APIAreaMapper.blueprintChestPathColor,
                        c[0] + top,
                        c[1] + left,
                        c[2],
                        c[3],
                        1,
                        c[4]
                    ).id);    
        }, this);
        
        this.save();
    };
    
    areaInstance.prototype.alter = function(pageid, relativeRotation, relativeScaleX, relativeScaleY, relativePositionX, relativePositionY) {
        //TODO: alter an area instance and everything contained within it
    };
    
    areaInstance.prototype.findManagedGraphic = function(graphic) {
        var graphicType;
        var graphicIndex;
        
        //see if the graphic is a managed door:
        var doorIds = this.getProperty('doorIds');
        for(var i = 0; i < doorIds.length; i++) {
            if(graphic.id === doorIds[i][0]) {
                graphicType = 'doors';
                graphicIndex = i;
                break;
            }
        }
        
        //see if the graphic is a managed chest:
        if(!graphicType) {
            var chestIds = this.getProperty('chestIds');
            for(var i = 0; i < chestIds.length; i++) {
                if(graphic.id === chestIds[i][0]) {
                    graphicType = 'chests';
                    graphicIndex = i;
                    break;
                }
            }
        }
        
        if(!graphicType) {
            return null;
        }
        
        var returnObj = [];
        returnObj.graphicType = graphicType;
        returnObj.graphicIndex = graphicIndex;
        return returnObj;
    };
    
    areaInstance.prototype.handleInteractiveObjectInteraction = function(objectType, masterIndex, selectedObject) {
        var a = new area(this.getProperty('areaId'));
        var g = new graph();
        
        var handleInteraction = function(interactiveObject, visualAlertPoint, openPic, closedPic, lockedPic, trappedPic) {
            
            //handle locked object:
            if(interactiveObject.getProperty('isLocked')) {
                
                //lock visual alert:
                setTimeout(
                    APIVisualAlert.visualAlert(
                        lockedPic,
                        visualAlertPoint.x,
                        visualAlertPoint.y,
                        1.0,
                        1),
                    5);
            }
            //process toggle:
            else {
                if(interactiveObject.getProperty('isTrapped')) {
                    
                    //trap visual alert:
                    setTimeout(
                        APIVisualAlert.visualAlert(
                            trappedPic,
                            visualAlertPoint.x,
                            visualAlertPoint.y,
                            1.0,
                            2),
                        5);
                    
                    interactiveObject.setProperty('isTrapped', 0);
                }
                
                //toggle object state:
                interactiveObject.setProperty('isOpen', (interactiveObject.getProperty('isOpen') + 1) % 2);
                
                //door toggle visual alert:
                setTimeout(
                    APIVisualAlert.visualAlert(
                        interactiveObject.getProperty('isOpen') ? openPic : closedPic,
                        visualAlertPoint.x,
                        visualAlertPoint.y,
                        1.0,
                        0),
                    5);
            }
        };
        
        var master = a.getProperty(objectType)[masterIndex];
        
        switch(objectType) {
            case 'doors':
                var doorState = new door(master);
                var dIndex = g.addSimplePathFromSegment(doorState.getProperty('positionSegment'), this.getProperty('top'), this.getProperty('left'));
                var s = g.getProperty('simplePaths')[dIndex].segments[0];
                handleInteraction(doorState, s.midpoint(), openDoorAlertPic, closedDoorAlertPic, padlockAlertPic, skullAlertPic);
                master = doorState.getStateObject();
                break;
            case 'chests':
                var chestState = new chest(master);
                var chestTop = chestState.getProperty('top') + this.getProperty('top');
                var chestLeft = chestState.getProperty('left') + this.getProperty('left');
                var chestCenter = new point(chestLeft + (chestState.getProperty('width') / 2), chestTop + (chestState.getProperty('height') / 2));
                //TODO: use chest-specific open / close pics:
                handleInteraction(chestState, chestCenter, openDoorAlertPic, closedDoorAlertPic, padlockAlertPic, skullAlertPic);
                master = chestState.getStateObject();
                break;
            default:
                log('Unsupported objectType of ' + objectType + ' in areaInstance.handleInteractiveObjectInteraction().');
                return;
        }
        
        //update the master:
        a.getProperty(objectType)[masterIndex] = master;
        a.save();
        
        //draw the object in the area, so that it propagates to all instances:
        a.drawInteractiveObject(objectType, masterIndex, false, selectedObject);
    };
    
    areaInstance.prototype.handleGraphicChange = function(graphic) {
        
        //see if the graphic is being managed:
        var managedGraphic = this.findManagedGraphic(graphic);
        
        if(!managedGraphic) {
            return;
        }
        
        //see if the position changed - other changes are ignored:
        var positionEpsilon = 0.001;
        a = new area(this.getProperty('areaId'));
        var graphicMaster = a.getProperty(managedGraphic.graphicType)[managedGraphic.graphicIndex];
        var specialInteraction = false;
        
        switch(managedGraphic.graphicType) {
            case 'doors':
                var p = (new segment(
                    new point(
                        graphicMaster[0].a.x + this.getProperty('left'),
                        graphicMaster[0].a.y + this.getProperty('top')),
                    new point(
                        graphicMaster[0].b.x + this.getProperty('left'),
                        graphicMaster[0].b.y + this.getProperty('top')))).midpoint();
                
                //compare position to point, using epsilon, to see if it moved:
                if((Math.abs(graphic.get('left') - p.x) < positionEpsilon)
                        && (Math.abs(graphic.get('top') - p.y) < positionEpsilon)) {
                    return;
                }
                break;
            case 'chests':
                if(state.APIAreaMapper.chestReposition) {
                    specialInteraction = true;
                    
                    //update the chest's position / rotation / dimensions in the master area:
                    graphicMaster[0] = graphic.get('top') - this.getProperty('top') - (graphic.get('height') / 2);
                    graphicMaster[1] = graphic.get('left') - this.getProperty('left') - (graphic.get('width') / 2);
                    graphicMaster[2] = graphic.get('height');
                    graphicMaster[3] = graphic.get('width');
                    graphicMaster[4] = graphic.get('rotation');
                    
                    a.getProperty(managedGraphic.graphicType)[managedGraphic.graphicIndex] = graphicMaster;
                    a.save();
                    
                    //draw the object in the area, so that it propagates to all instances:
                    a.drawInteractiveObject(managedGraphic.graphicType, managedGraphic.graphicIndex, false, graphic);
                } else {
                    var chestTop = graphicMaster[0] + this.getProperty('top');
                    var chestLeft = graphicMaster[1] + this.getProperty('left');
                    
                    var p = (new segment(
                        new point(
                            chestLeft,
                            chestTop),
                        new point(
                            chestLeft + graphicMaster[3],
                            chestTop + graphicMaster[2]))).midpoint();
                    
                    //compare position to point, using epsilon, to see if it moved:
                    if((Math.abs(graphic.get('left') - p.x) < positionEpsilon)
                            && (Math.abs(graphic.get('top') - p.y) < positionEpsilon)) {
                        return;
                    }
                }
                break;
            default:
                log('Unhandled graphic type of ' + managedGraphic.graphicType + ' in areaInstance.handleGraphicChange().');
                break;
        }
        
        //handle true interactions if there was no special case:
        if(!specialInteraction) {
            this.handleInteractiveObjectInteraction(managedGraphic.graphicType, managedGraphic.graphicIndex, graphic);
        }
    };
    
    areaInstance.prototype.toggleInteractiveProperty = function(graphic, property) {
        var followUpAction = [];
        
        var managedGraphic = this.findManagedGraphic(graphic);
        
        if(!managedGraphic) {
            followUpAction.message = 'The graphic is not managed by the area and/or is not eligible for property changes.';
            return followUpAction;
        }
        
        a = new area(this.getProperty('areaId'));
        var graphicMaster = a.getProperty(managedGraphic.graphicType)[managedGraphic.graphicIndex];
        
        var changeProperty = function(interactiveObject, property, followUpAction) {
            var redraw = false;
            var toggledProperty;
            switch(property) {
                case 'open':
                    toggledProperty = 'isOpen';
                    redraw = true;
                    break;
                case 'lock':
                    toggledProperty = 'isLocked';
                    followUpAction.refresh = true;
                    break;
                case 'trap':
                    toggledProperty = 'isTrapped';
                    followUpAction.refresh = true;
                    break;
                case 'hide':
                    toggledProperty = 'isHidden';
                    redraw = true;
                    break;
                default:
                    log('Unhandled property type of ' + property + ' in areaInstance.toggleInteractiveProperty().');
                    followUpAction.message = 'There was a problem; see the log for details.';
                    return;
            }
            interactiveObject.setProperty(toggledProperty, (interactiveObject.getProperty(toggledProperty) + 1) % 2);
            return redraw;
        }
        
        var redraw = false;
        
        switch(managedGraphic.graphicType) {
            case 'doors':
                var doorState = new door(graphicMaster);
                redraw = changeProperty(doorState, property, followUpAction);
                graphicMaster = doorState.getStateObject();
                break;
            case 'chests':
                var chestState = new chest(graphicMaster);
                redraw = changeProperty(chestState, property, followUpAction);
                graphicMaster = chestState.getStateObject();
                break;
            default:
                log('Unhandled graphic type of ' + managedGraphic.graphicType + ' in areaInstance.toggleInteractiveProperty().');
                followUpAction.message = 'There was a problem; see the log for details.';
                break;
        }
        
        if(followUpAction.message) {
            return followUpAction;
        }
        
        //update the master:
        a.getProperty(managedGraphic.graphicType)[managedGraphic.graphicIndex] = graphicMaster;
        a.save();
        
        //redraw the door or just its features across all instances of the area:
        var errorMessage = a.drawInteractiveObject(managedGraphic.graphicType, managedGraphic.graphicIndex, !redraw, graphic);
        followUpAction.message = errorMessage;
        
        this.save();
        
        return followUpAction;
    };
    
    /* area - end */
    
    /* modals - begin */
    
    var drawAssetManagementEditModal = function(highlightEditedAsset) {
        hideAssetManagementEditModal();
        
        //TODO: highlight edited asset
        
        if(!state.APIAreaMapper.globalAssetManagement) {
            return;
        }
        
        var modalTop = 35,
            modalLeft = 35,
            modalNonPairHeight = 210,
            modalPairStretchHeight = 100,
            modalPairNonStretchHeight = 160,
            modalWidth = 500,
            modalTopMargin = 40,
            assetNonStretchSize = 150,
            assetPairNonStretchSize = 100,
            assetPairNonStretchSpacing = 50,
            assetStretchHeight = 40,
            assetStretchWidth = 200,
            assetPairStretchSpacing = 20,
            labelHover = 36,
            pageId = Campaign().get('playerpageid');
            
        state.APIAreaMapper.assetManagementEditModalIds = [];
        
        var asset1,
            asset2,
            token1,
            token2;
        
        switch(state.APIAreaMapper.globalAssetManagement[0]) {
            case 'floor':
                
                //create the modal frame:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                    createRectanglePathObject(
                            pageId, 
                            'objects', 
                            '#000000', 
                            headerBackgroundColor, 
                            modalTop, 
                            modalLeft, 
                            modalNonPairHeight, 
                            modalWidth,
                            2
                        ).id]);
       
                //draw asset:
                asset1 = new asset(state.APIAreaMapper.floorAssets[state.APIAreaMapper.globalAssetManagement[1]]);
                token1 = createTokenObjectFromAsset(
                        asset1,
                        pageId,
                        'objects',
                        modalTop + modalTopMargin,
                        modalLeft + ((modalWidth - assetNonStretchSize) / 2),
                        assetNonStretchSize,
                        assetNonStretchSize
                    );
                state.APIAreaMapper.assetManagementEditModalIds.push(['graphic', token1.id]);
                
                //draw band:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                        createBandPathObject(
                                pageId, 
                                modalTop + modalTopMargin,
                                modalLeft + ((modalWidth - assetNonStretchSize) / 2),
                                assetNonStretchSize,
                                assetNonStretchSize, 
                                0, 
                                '#00ff00', 
                                0, 
                                'objects'
                            ).id
                    ]);
                
                //draw label:
                state.APIAreaMapper.assetManagementEditModalIds.push(['text',
                        createTextObject(
                                'floor asset',
                                pageId,
                                'objects',
                                modalTop + modalTopMargin - labelHover,
                                modalLeft + ((modalWidth - assetNonStretchSize) / 2),
                                labelHover,
                                assetNonStretchSize
                            ).id
                    ]);
                break;
            case 'wall':
                
                //create the modal frame:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                    createRectanglePathObject(
                            pageId, 
                            'objects', 
                            '#000000', 
                            headerBackgroundColor, 
                            modalTop, 
                            modalLeft, 
                            modalPairStretchHeight, 
                            modalWidth,
                            2
                        ).id]);
       
                //draw assets:
                asset1 = new asset(state.APIAreaMapper.wallAssets[state.APIAreaMapper.globalAssetManagement[1]][0]);
                asset2 = new asset(state.APIAreaMapper.wallAssets[state.APIAreaMapper.globalAssetManagement[1]][1]);
                
                token1 = createTokenObjectFromAsset(
                        asset1,
                        pageId,
                        'objects',
                        modalTop + modalTopMargin,
                        modalLeft + (modalWidth / 2) - assetStretchWidth - assetPairStretchSpacing,
                        assetStretchHeight,
                        assetStretchWidth
                    );
                token2 = createTokenObjectFromAsset(
                        asset2,
                        pageId,
                        'objects',
                        modalTop + modalTopMargin,
                        modalLeft + (modalWidth / 2) + assetPairStretchSpacing,
                        assetStretchHeight,
                        assetStretchWidth
                    );
                state.APIAreaMapper.assetManagementEditModalIds.push(['graphic', token1.id]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['graphic', token2.id]);
                
                //draw bands:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                        createBandPathObject(
                                pageId, 
                                modalTop + modalTopMargin,
                                modalLeft + (modalWidth / 2) - assetStretchWidth - assetPairStretchSpacing,
                                assetStretchHeight,
                                assetStretchWidth, 
                                0, 
                                '#00ff00', 
                                0, 
                                'objects'
                            ).id
                    ]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                        createBandPathObject(
                                pageId, 
                                modalTop + modalTopMargin,
                                modalLeft + (modalWidth / 2) + assetPairStretchSpacing,
                                assetStretchHeight,
                                assetStretchWidth, 
                                0, 
                                '#00ff00', 
                                0, 
                                'objects'
                            ).id
                    ]);
                
                //draw labels:
                state.APIAreaMapper.assetManagementEditModalIds.push(['text',
                        createTextObject(
                                'wall / hidden closed door asset',
                                pageId,
                                'objects',
                                modalTop + modalTopMargin - labelHover,
                                modalLeft + (modalWidth / 2) - (assetStretchWidth + assetPairStretchSpacing),
                                labelHover,
                                assetStretchWidth
                            ).id
                    ]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['text',
                        createTextObject(
                                'hidden open door asset',
                                pageId,
                                'objects',
                                modalTop + modalTopMargin - labelHover,
                                modalLeft + (modalWidth / 2) + assetPairStretchSpacing,
                                labelHover,
                                assetStretchWidth
                            ).id
                    ]);
                break;
            case 'door':
                
                //create the modal frame:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                    createRectanglePathObject(
                            pageId, 
                            'objects', 
                            '#000000', 
                            headerBackgroundColor, 
                            modalTop, 
                            modalLeft, 
                            modalPairStretchHeight, 
                            modalWidth,
                            2
                        ).id]);
       
                //draw assets:
                asset1 = new asset(state.APIAreaMapper.doorAssets[state.APIAreaMapper.globalAssetManagement[1]][0]);
                asset2 = new asset(state.APIAreaMapper.doorAssets[state.APIAreaMapper.globalAssetManagement[1]][1]);
                token1 = createTokenObjectFromAsset(
                        asset1,
                        pageId,
                        'objects',
                        modalTop + modalTopMargin,
                        modalLeft + (modalWidth / 2) - assetStretchWidth - assetPairStretchSpacing,
                        assetStretchHeight,
                        assetStretchWidth
                    );
                token2 = createTokenObjectFromAsset(
                        asset2,
                        pageId,
                        'objects',
                        modalTop + modalTopMargin,
                        modalLeft + (modalWidth / 2) + assetPairStretchSpacing,
                        assetStretchHeight,
                        assetStretchWidth
                    );
                state.APIAreaMapper.assetManagementEditModalIds.push(['graphic', token1.id]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['graphic', token2.id]);
                
                //draw bands:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                        createBandPathObject(
                                pageId, 
                                modalTop + modalTopMargin,
                                modalLeft + (modalWidth / 2) - assetStretchWidth - assetPairStretchSpacing,
                                assetStretchHeight,
                                assetStretchWidth, 
                                0, 
                                '#00ff00', 
                                0, 
                                'objects'
                            ).id
                    ]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                        createBandPathObject(
                                pageId, 
                                modalTop + modalTopMargin,
                                modalLeft + (modalWidth / 2) + assetPairStretchSpacing,
                                assetStretchHeight,
                                assetStretchWidth, 
                                0, 
                                '#00ff00', 
                                0, 
                                'objects'
                            ).id
                    ]);
                
                //draw labels:
                state.APIAreaMapper.assetManagementEditModalIds.push(['text',
                        createTextObject(
                                'closed door asset',
                                pageId,
                                'objects',
                                modalTop + modalTopMargin - labelHover,
                                modalLeft + (modalWidth / 2) - (assetStretchWidth + assetPairStretchSpacing),
                                labelHover,
                                assetStretchWidth
                            ).id
                    ]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['text',
                        createTextObject(
                                'open door asset',
                                pageId,
                                'objects',
                                modalTop + modalTopMargin - labelHover,
                                modalLeft + (modalWidth / 2) + assetPairStretchSpacing,
                                labelHover,
                                assetStretchWidth
                            ).id
                    ]);
                break;
            case 'chest':
                
                //create the modal frame:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                    createRectanglePathObject(
                            pageId, 
                            'objects', 
                            '#000000', 
                            headerBackgroundColor, 
                            modalTop, 
                            modalLeft, 
                            modalPairNonStretchHeight, 
                            modalWidth,
                            2
                        ).id]);
                
                //draw assets:
                asset1 = new asset(state.APIAreaMapper.chestAssets[state.APIAreaMapper.globalAssetManagement[1]][0]);
                asset2 = new asset(state.APIAreaMapper.chestAssets[state.APIAreaMapper.globalAssetManagement[1]][1]);
                token1 = createTokenObjectFromAsset(
                        asset1,
                        pageId,
                        'objects',
                        modalTop + modalTopMargin,
                        modalLeft + (modalWidth / 2) - assetPairNonStretchSize - assetPairNonStretchSpacing,
                        assetPairNonStretchSize,
                        assetPairNonStretchSize
                    );
                token2 = createTokenObjectFromAsset(
                        asset2,
                        pageId,
                        'objects',
                        modalTop + modalTopMargin,
                        modalLeft + (modalWidth / 2) + assetPairNonStretchSpacing,
                        assetPairNonStretchSize,
                        assetPairNonStretchSize
                    );
                state.APIAreaMapper.assetManagementEditModalIds.push(['graphic', token1.id]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['graphic', token2.id]);
                
                //draw bands:
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                        createBandPathObject(
                                pageId, 
                                modalTop + modalTopMargin,
                                modalLeft + (modalWidth / 2) - assetPairNonStretchSize - assetPairNonStretchSpacing,
                                assetPairNonStretchSize,
                                assetPairNonStretchSize, 
                                0, 
                                '#00ff00', 
                                0, 
                                'objects'
                            ).id
                    ]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['path', 
                        createBandPathObject(
                                pageId, 
                                modalTop + modalTopMargin,
                                modalLeft + (modalWidth / 2) + assetPairNonStretchSpacing,
                                assetPairNonStretchSize,
                                assetPairNonStretchSize, 
                                0, 
                                '#00ff00', 
                                0, 
                                'objects'
                            ).id
                    ]);
                
                //draw labels:
                state.APIAreaMapper.assetManagementEditModalIds.push(['text',
                        createTextObject(
                                'closed chest asset',
                                pageId,
                                'objects',
                                modalTop + modalTopMargin - labelHover,
                                modalLeft + (modalWidth / 2) - (assetPairNonStretchSize + assetPairNonStretchSpacing),
                                labelHover,
                                assetPairNonStretchSize
                            ).id
                    ]);
                state.APIAreaMapper.assetManagementEditModalIds.push(['text',
                        createTextObject(
                                'open chest asset',
                                pageId,
                                'objects',
                                modalTop + modalTopMargin - labelHover,
                                modalLeft + (modalWidth / 2) + assetPairNonStretchSpacing,
                                labelHover,
                                assetPairNonStretchSize
                            ).id
                    ]);
                break;
            default:
                log('Unhandled asset classification of ' + state.APIAreaMapper.globalAssetManagement[0] + ' in drawAssetManagementEditModal().');
                return;
        }
    },
    
    hideAssetManagementEditModal = function() {
        if(!state.APIAreaMapper.assetManagementEditModalIds) {
            return;
        }
        
        state.APIAreaMapper.assetManagementEditModalIds.forEach(function(mId) {
            deleteObject(mId[0], mId[1]);
        }, this);
        
        delete state.APIAreaMapper.assetManagementEditModalIds;
    };
    
    /* modals - end */
    
    /* business logic bridge - begin */
    
    var toggleHandoutUi = function(who) {
        
        //send a special drawing of the existing UI with a spoofed reversal value of handoutUi (as changing it for real would send it to the new UI); this way, the switch is clear and the user can switch back from either UI:
        interfaceSettings(who, true);
        
        //switch the state and let the UI refresh from the other UI:
        state.APIAreaMapper.handoutUi = !state.APIAreaMapper.handoutUi;
        var followUpAction = [];
        followUpAction.refresh = true;
        
        return followUpAction;
    },
    
    toggleGlobalAssetClassification = function(classification) {
        if(state.APIAreaMapper.globalAssetManagement && state.APIAreaMapper.globalAssetManagement[0] == classification) {
            delete state.APIAreaMapper.globalAssetManagement;
        } else {
            state.APIAreaMapper.globalAssetManagement = [classification, 0];
        }
        
        var followUpAction = [];
        followUpAction.refresh = true;
        
        return followUpAction;
    },
    
    handleGlobalAssetCreate = function(selected) {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        if(!state.APIAreaMapper.globalAssetManagement) {
            followUpAction.message = 'A classification must be active.';
            return followUpAction;
        }
        
        if(!(selected && selected.length)) {
            followUpAction.message = 'Image(s) must be selected to turn into assets.';
            return followUpAction;
        }
        
        switch(state.APIAreaMapper.globalAssetManagement[0]) {
            case 'floor':
                if(selected.length !== 1) {
                    followUpAction.message = 'Exactly one image should be selected to turn into a floor asset.';
                    return followUpAction;
                }
                
                var token1 = getObj('graphic', selected[0]._id);
                
                if(!token1) {
                    followUpAction.message = 'No selected image was found. Exactly one image should be selected to turn into a floor asset.';
                    return followUpAction;
                }
                
                var asset1 = new asset();
                asset1.setProperty('imagesrc', getCleanImgsrc(token1.get('imgsrc')));
                
                state.APIAreaMapper.floorAssets.push(asset1.getStateObject());
                state.APIAreaMapper.globalAssetManagement[1] = state.APIAreaMapper.floorAssets.length - 1;
                break;
            case 'wall':
                if(selected.length !== 2) {
                    followUpAction.message = 'Exactly two images should be selected to turn into wall assets. One for a wall / closed hidden door, and another for an open hidden door.';
                    return followUpAction;
                }
                
                var token1 = getObj('graphic', selected[0]._id);
                var token2 = getObj('graphic', selected[1]._id);
                
                if(!token1 || !token2) {
                    followUpAction.message = 'Failure to find exactly two selected images. Two images should be selected to turn into wall assets. One for a wall / closed hidden door, and another for an open hidden door.';
                    return followUpAction;
                }
                
                var asset1 = new asset();
                asset1.setProperty('imagesrc', getCleanImgsrc(token1.get('imgsrc')));
                var asset2 = new asset();
                asset2.setProperty('imagesrc', getCleanImgsrc(token2.get('imgsrc')));
                
                state.APIAreaMapper.wallAssets.push([asset1.getStateObject(), asset2.getStateObject()]);
                state.APIAreaMapper.globalAssetManagement[1] = state.APIAreaMapper.wallAssets.length - 1;
                break;
            case 'door':
                if(selected.length !== 2) {
                    followUpAction.message = 'Exactly two images should be selected to turn into door assets. One for a closed door and another for an open door.';
                    return followUpAction;
                }
                
                var token1 = getObj('graphic', selected[0]._id);
                var token2 = getObj('graphic', selected[1]._id);
                
                if(!token1 || !token2) {
                    followUpAction.message = 'Failure to find exactly two selected images. Two images should be selected to turn into door assets. One for a closed door and another for an open door.';
                    return followUpAction;
                }
                
                var asset1 = new asset();
                asset1.setProperty('imagesrc', getCleanImgsrc(token1.get('imgsrc')));
                var asset2 = new asset();
                asset2.setProperty('imagesrc', getCleanImgsrc(token2.get('imgsrc')));
                
                state.APIAreaMapper.doorAssets.push([asset1.getStateObject(), asset2.getStateObject()]);
                state.APIAreaMapper.globalAssetManagement[1] = state.APIAreaMapper.doorAssets.length - 1;
                break;
            case 'chest':
                if(selected.length !== 2) {
                    followUpAction.message = 'Exactly two images should be selected to turn into chest assets. One for a closed chest and another for an open chest.';
                    return followUpAction;
                }
                
                var token1 = getObj('graphic', selected[0]._id);
                var token2 = getObj('graphic', selected[1]._id);
                
                if(!token1 || !token2) {
                    followUpAction.message = 'Failure to find exactly two selected images. Two images should be selected to turn into chest assets. One for a closed chest and another for an open chest.';
                    return followUpAction;
                }
                
                var asset1 = new asset();
                asset1.setProperty('imagesrc', getCleanImgsrc(token1.get('imgsrc')));
                var asset2 = new asset();
                asset2.setProperty('imagesrc', getCleanImgsrc(token2.get('imgsrc')));
                
                state.APIAreaMapper.chestAssets.push([asset1.getStateObject(), asset2.getStateObject()]);
                state.APIAreaMapper.globalAssetManagement[1] = state.APIAreaMapper.chestAssets.length - 1;
                break;
            default:
                log('Unhandled asset classification of ' + state.APIAreaMapper.globalAssetManagement[0] + ' in handleGlobalAssetCreate().');
                followUpAction.message = 'There was a problem; see the log for details.';
                return followUpAction;
        }
        
        return followUpAction;
    },
    
    handleGlobalAssetCycle = function() {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        if(!state.APIAreaMapper.globalAssetManagement) {
            followUpAction.message = 'A classification must be active.';
            return followUpAction;
        }
        
        var assetLength;
        
        switch(state.APIAreaMapper.globalAssetManagement[0]) {
            case 'floor':
                assetLength = state.APIAreaMapper.floorAssets.length;
                break;
            case 'wall':
                assetLength = state.APIAreaMapper.wallAssets.length;
                break;
            case 'door':
                assetLength = state.APIAreaMapper.doorAssets.length;
                break;
            case 'chest':
                assetLength = state.APIAreaMapper.chestAssets.length;
                break;
            default:
                log('Unhandled asset classification of ' + state.APIAreaMapper.globalAssetManagement[0] + ' in handleGlobalAssetCycle().');
                followUpAction.message = 'There was a problem; see the log for details.';
                return followUpAction;
        }
        
        state.APIAreaMapper.globalAssetManagement[1] = (state.APIAreaMapper.globalAssetManagement[1] + 1) % assetLength;
        
        return followUpAction;
    },
    
    //editGlobalAssetUpdateSetProperty = function(property, value, isReplacement) {
    editGlobalAssetUpdateSetProperty = function(property, value, updateType) {
        var assetClassification = state.APIAreaMapper.globalAssetManagement[0];
        var assetIndex = state.APIAreaMapper.globalAssetManagement[1];
        
        var setPropertyToValue = function(assetObject, property, value, updateType) {
            switch(updateType) {
                case 'toggle':
                    assetObject.setProperty(property, (assetObject.getProperty(property) + 1) % 2);
                    break;
                case 'add':
                    assetObject.setProperty(property, assetObject.getProperty(property) + value);
                    break;
                case 'multiply':
                    assetObject.setProperty(property, assetObject.getProperty(property) * value);
                    break;
                case 'replace':
                    assetObject.setProperty(property, value);
                    break;
                default:
                    log('Unhandled updateType of ' + updateType + ' in editGlobalAssetUpdateSetProperty().');
                    return;
            }
        };
        
        switch(assetClassification) {
            case 'floor':
                var assetObject = new asset(state.APIAreaMapper.floorAssets[assetIndex]);
                setPropertyToValue(assetObject, property, value, updateType);
                state.APIAreaMapper.floorAssets[assetIndex] = assetObject.getStateObject();
                break;
            case 'wall':
                var assetObject = new asset(state.APIAreaMapper.wallAssets[assetIndex][state.APIAreaMapper.globalAssetEdit[0]]);
                setPropertyToValue(assetObject, property, value, updateType);
                state.APIAreaMapper.wallAssets[assetIndex][state.APIAreaMapper.globalAssetEdit[0]] = assetObject.getStateObject();
                break;
            case 'door':
                var assetObject = new asset(state.APIAreaMapper.doorAssets[assetIndex][state.APIAreaMapper.globalAssetEdit[0]]);
                setPropertyToValue(assetObject, property, value, updateType);
                state.APIAreaMapper.doorAssets[assetIndex][state.APIAreaMapper.globalAssetEdit[0]] = assetObject.getStateObject();
                break;
            case 'chest':
                var assetObject = new asset(state.APIAreaMapper.chestAssets[assetIndex][state.APIAreaMapper.globalAssetEdit[0]]);
                setPropertyToValue(assetObject, property, value, updateType);
                state.APIAreaMapper.chestAssets[assetIndex][state.APIAreaMapper.globalAssetEdit[0]] = assetObject.getStateObject();
                break;
            default:
                log('Unhandled assetClassification of ' + assetClassification + ' in interfaceGlobalAssetEdit().');
                return;
        }
    },
    
    handleGlobalAssetEditRotate = function(direction, amount) {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        var rotationAmount = 0;
        
        switch(amount) {
            case 'lots':
                rotationAmount = 90;
                break;
            case 'some':
                rotationAmount = 15;
                break;
            case 'tad':
                rotationAmount = 1;
                break;
            default:
                log('Unhandled amount of ' + amount + ' in handleGlobalAssetRotate().');
                break;
        }
        
        editGlobalAssetUpdateSetProperty('rotation', (direction == 'cw' ? rotationAmount : 0 - rotationAmount), 'add');
        
        return followUpAction;
    },
    
    toggleGlobalAssetEditAlternateStretch = function() {
        var followUpAction = [];
        followUpAction.refresh = true;
         
        editGlobalAssetUpdateSetProperty('alternate', null, 'toggle');
        
        return followUpAction;
    },
    
    handleGlobalAssetEditSwapAssets = function() {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        var assetClassification = state.APIAreaMapper.globalAssetManagement[0];
        var assetIndex = state.APIAreaMapper.globalAssetManagement[1];
        
        switch(assetClassification) {
            case 'wall':
                var tempAsset = state.APIAreaMapper.wallAssets[assetIndex][0];
                state.APIAreaMapper.wallAssets[assetIndex][0] = state.APIAreaMapper.wallAssets[assetIndex][1];
                state.APIAreaMapper.wallAssets[assetIndex][1] = tempAsset;
                break;
            case 'door':
                var tempAsset = state.APIAreaMapper.doorAssets[assetIndex][0];
                state.APIAreaMapper.doorAssets[assetIndex][0] = state.APIAreaMapper.doorAssets[assetIndex][1];
                state.APIAreaMapper.doorAssets[assetIndex][1] = tempAsset;
                break;
            case 'chest':
                var tempAsset = state.APIAreaMapper.chestAssets[assetIndex][0];
                state.APIAreaMapper.chestAssets[assetIndex][0] = state.APIAreaMapper.chestAssets[assetIndex][1];
                state.APIAreaMapper.chestAssets[assetIndex][1] = tempAsset;
                break;
            default:
                log('Unhandled assetClassification of ' + assetClassification + ' in handleGlobalAssetEditSwapAssets().');
                return;
        }
        
        return followUpAction;
    },
    
    handleGlobalAssetEditScaleChange = function(axis, action, amount) {
        var followUpAction = [];
        followUpAction.refresh = true;
       
        var amountValue;
        
        var property = axis == 'vertical' ? 'scaleVertical' : 'scaleHorizontal';
        var isIncreasing = (action == 'increase');
        
        switch(amount) {
            case 'lots':
                amountValue = 1.05;
                break;
            case 'tad':
                amountValue = 1.01;
                break;
            default:
                log('Unhandled amount of ' + amount + ' in handleGlobalAssetEditScaleChange().');
                followUpAction.message = 'There was a problem; see the log for details.';
                return followUpAction;
        }
        
        editGlobalAssetUpdateSetProperty(property, isIncreasing ? amountValue : 1 / amountValue, 'multiply');
        
        return followUpAction;
    },
    
    handleGlobalAssetEditOffsetChange = function(axis, action, amount) {
        var followUpAction = [];
        followUpAction.refresh = true;
       
        var amountValue;
        
        var property = axis == 'vertical' ? 'offsetVertical' : 'offsetHorizontal';
        var isIncreasing = (action == 'increase');
        
        switch(amount) {
            case 'lots':
                amountValue = 5;
                break;
            case 'tad':
                amountValue = 1;
                break;
            default:
                log('Unhandled amount of ' + amount + ' in handleGlobalAssetEditOffsetChange().');
                followUpAction.message = 'There was a problem; see the log for details.';
                return followUpAction;
        }
        
        editGlobalAssetUpdateSetProperty(property, isIncreasing ? amountValue : 0 - amountValue, 'add');
        
        return followUpAction;
    },
    
    toggleOrSetAreaRecordMode = function(mode) {
        if(state.APIAreaMapper.recordAreaMode == mode) {
            state.APIAreaMapper.recordAreaMode = false;
        } else {
            state.APIAreaMapper.recordAreaMode = mode;
        }
        
        var followUpAction = [];
        followUpAction.refresh = true;
        return followUpAction;
    },
    
    toggleChestReposition = function() {
        state.APIAreaMapper.chestReposition = !state.APIAreaMapper.chestReposition;
        
        var followUpAction = [];
        followUpAction.refresh = true;
        return followUpAction;
    },
    
    toggleBlueprintMode = function() {
        state.APIAreaMapper.blueprintMode = !state.APIAreaMapper.blueprintMode;
        
        if(state.APIAreaMapper.activeArea) {
            var a = new area(state.APIAreaMapper.activeArea);
            a.draw();
        }
        
        var followUpAction = [];
        followUpAction.refresh = true;
        return followUpAction;
    },
    
    toggleInteractiveProperty = function(selected, who, property) {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        if(selected.length > 1) {
            followUpAction.Message = 'Only one object should be selected.';
            return followUpAction;
        }
        
        var graphic = getSelectedGraphic(selected);
        
        if(!graphic) {
            followUpAction.Message = 'Unable to find the selected object.';
            return followUpAction;
        }
        
        var interactiveProperty;
        
        switch(property) {
            case 'interactiveObjectOpen':
                interactiveProperty = 'open';
                break;
            case 'interactiveObjectLock':
                interactiveProperty = 'lock';
                break;
            case 'interactiveObjectTrap':
                interactiveProperty = 'trap';
                break;
            case 'interactiveObjectHide':
                interactiveProperty = 'hide';
                break;
            default:
                log("Unhandled property of '" + property + "' in toggleInteractiveProperty().");
                return;
        }
        
        var a = new area(state.APIAreaMapper.activeArea);
        
        var returnedFollowUpAction = a.toggleInteractiveProperty(graphic, interactiveProperty);
        
        followUpAction.message = returnedFollowUpAction.message;
        return followUpAction;
    },
    
    handleAreaHide = function(areaId) {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        var a = new area(areaId);
        a.hide();
        
        return followUpAction;
    },
    
    handleAreaArchive = function(areaId) {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        var a = new area(areaId);
        
        //hide the area in case there are any instances:
        a.hide();
        a.setProperty('archived', (a.getProperty('archived') + 1) % 2);
        a.save();
        
        return followUpAction;
    },
    
    handleAreaRedraw = function() {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        var a = new area(state.APIAreaMapper.activeArea);
        a.draw();
        
        return followUpAction;
    },
    
    //renames the active area:
    //may be called without a name, in case where instructions should be supplied instead:
    handleAreaRename = function(newName) {
        var followUpAction = [];
        
        if('undefined' === typeof(newName) || !newName.length) {
            followUpAction.message = 'To change the active area'+ch("'")+'s name, type "<b>!api-area rename '+ch("<")+'new name'+ch(">")+'</b>".';
        } else {
            var a = new area(state.APIAreaMapper.activeArea);
            a.setProperty('name', newName);
            a.save();
            
            //navigate to the active area, since it was renamed:
            state.APIAreaMapper.uiWindow = 'area#' + state.APIAreaMapper.activeArea;
            followUpAction.refresh = true;
            followUpAction.ignoreSelection = true;
        }
        
        return followUpAction;
    },
    
    handleAssetStandard = function(objectType) {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        var a = new area(state.APIAreaMapper.activeArea);
        a.cycleStandardAsset(objectType);
        
        return followUpAction;
    },
    
    handleAssetTransparent = function(objectType) {
        var followUpAction = [];
        followUpAction.refresh = true;
        
        var a = new area(state.APIAreaMapper.activeArea);
        a.useTransparentAsset(objectType);
        
        return followUpAction;
    },
    
    /* business logic bridge - end */
    
    /* user interface core - begin */
    
    //character converter, credits to Aaron from https://github.com/shdwjk/Roll20API/blob/master/APIHeartBeat/APIHeartBeat.js
    ch = function(c) {
        var entities = {
            '<' : 'lt',
            '>' : 'gt',
            "'" : '#39',
            '@' : '#64',
            '{' : '#123',
            '|' : '#124',
            '}' : '#125',
            '[' : '#91',
            ']' : '#93',
            '"' : 'quot',
            '-' : 'mdash',
            ' ' : 'nbsp'
        };

        if(_.has(entities,c) ){
            return ('&'+entities[c]+';');
        }
        return '';
    },
    
    displayInterface = function(who, text) {
        if(!state.APIAreaMapper.handoutUi) {
            
            //if who isn't supplied, send whisper to last player to use the macro:
            if('undefined' === typeof(who)) {
                who = state.APIAreaMapper.playerName;
            }
            
            sendChat('Area Mapper', '/w ' + who.split(' ')[0] + ' ' + text); 
        } else {
            var handout = findObjs({                              
                _type: 'handout',
                name: 'API-AreaMapper'
            }, {caseInsensitive: true});
            
            if(handout && handout.length > 0) {
                handout = handout[0];
            } else {
                handout = createObj('handout', {
                    name: 'API-AreaMapper',
                    avatar: 'https://s3.amazonaws.com/files.d20.io/images/7360175/t-Y2NgxamazYSIkbaXQjJg/thumb.jpg?1422294416'
                });
            }
            
            handout.set('notes', text);
        }
    },
    
    formatInterface = function(who, header, body, nextSteps) {
        var rightPadding = '0px';
        
        if(state.APIAreaMapper.handoutUi) {
            rightPadding = '14px';
        }
            
        var text =
            '<span style="border: 1px solid black;width: 100%;display:inline-block;background-color:'+mainBackgroundColor+';padding-right:'+rightPadding+';">'
                +'<span style="border: 1px solid black;display:inline-block;width: 100%;font-weight: bold;border-bottom: 1px solid black;background-color:'+headerBackgroundColor+';font-size: 115%;padding-right:'+rightPadding+';">'
                    +'<span style="padding-left:3px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;">'
                        +header
                    +'</span>'
                +'</span>'
                +'<span style="border: 1px solid black;display:inline-block;width: 100%;background-color:'+mainBackgroundColor+';padding-right:'+rightPadding+';">'
                    +'<div style="margin-top:10px;"></div>'
                    +body;
                    
        if(nextSteps) {
            text = text
                    +'<span style="padding-left:10px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;padding-right:'+rightPadding+';">'
                        +'<span style="border-top: 1px solid '+headerBackgroundColor+';display:inline-block;width: 100%;margin-top:10px;border-bottom: 1px solid '+headerBackgroundColor+';">'
                            +'<div style="margin-top:10px;"></div>'
                            +nextSteps
                        +'</span>'
                    +'</span>';
        }
        
        text = text
                    +'<span style="padding-left:10px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;padding-right:'+rightPadding+';">'
                        +'<span style="border-top: 1px solid '+headerBackgroundColor+';display:inline-block;width: 100%;margin-top:10px;border-bottom: 1px solid '+headerBackgroundColor+';">'
                            +'<div style="margin-top:10px;"></div>'
                            +uiSection('General', null, [
                                ['navigation', 'run script', '', false, false],
                                ['navigation', 'main menu', 'mainMenu', false, false],
                                ['navigation', 'help', 'help', false, false],
                                ['navigation', 'about', 'about', false, false],
                                ['navigation', 'settings', 'settings', false, false]
                            ])
                        +'</span>'
                    +'</span>'
                +'</span>'
            +'</span>';
        
        displayInterface(who, text);
    },
    
    sendNotification = function(to, message) {
        formatInterface(to,
            'Notification',
            '<span style="text-align:center;padding-left:3px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;">'
                +'<span style="padding-left:13px;padding-top:13px;padding-right:13px;display:inline-block;background-color:'+notificationBackgroundColor+';margin-top:13px;margin-left:13px;margin-right:13px;margin-bottom:3px;">'
                    +'<p>'+message+'</p>'
                +'</span>'
            +'</span>'
        );
    },
    
    sendStandardInterface = function(to, header, body, nextSteps) {
        formatInterface(to, header,
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +body
            +'</div>',
            nextSteps);
    },
    
    uiCommand = function(command) {
        //note: command is composed of [type, text, apiCommand, greyed, state]
        
        //build the command link:
        var link = 
            command[3] 
                ? ('<span style="border:1px solid white;display:inline-block;background-color:' + buttonGreyedColor + ';padding:5px 5px;"> ' + command[1] + ' </span> ')
                : (state.APIAreaMapper.handoutUi
                    ? ('<span style="border:1px solid white;display:inline-block;background-color:' + buttonBackgroundColor + ';padding:5px 5px;"> <a href="!api-area ' + command[2] + '">' + command[1] + '</a> </span> ')
                    : ('[' + command[1] + '](!api-area ' + command[2] + ') '));

        //highlight helper function:
        var highlight = function(htmlToHighlight, color, size, noBorder) {
            return '<span style="border:' + (noBorder ? 0 : 1) + 'px solid black;display:inline-block;background-color:' + color + ';padding:' + size + 'px ' + size + 'px;">' + htmlToHighlight + '</span>'
        };

        //highlight the command link:
        switch(command[0]) {
            case 'navigation':
                link = highlight(link, buttonHighlightLinkColor, 5);
                break;
            case 'navigationActive':
                if(command[4]) {
                    link = highlight(link, buttonHighlightActiveColor, 3, true);
                    link = highlight(link, buttonHighlightLinkColor, 2);
                } else {
                    link = highlight(link, buttonHighlightLinkColor, 5);
                }
                break;
            case 'active':
                link = highlight(link, command[4] ? buttonHighlightActiveColor : buttonHighlightInactiveColor, 5);
                break;
            case 'mode':
                link = highlight(link, command[4] ? (command[4] === 1 ? buttonHighlightPositiveColor : buttonHighlightNegativeColor) : buttonHighlightInactiveColor, 5);
                break;
            default:
                break;
        }
        
        return link;
    },
    
    uiSection = function(header, text, commands) {
        var html = '<p><b>' + header + '</b></p><p>';
        
        if(text !== null) {
            html += text + '</p><p>';
        }
        
        commands.forEach(function(c) {
            html += uiCommand(c) + ' ';
        }, this);
        
        html += '</p>';
        return html;
    },
    
    modeCommand = function(text, commands, greyed, state) {
        var currentState = commands.indexOf(state);
     
        if(currentState === -1) {
            currentState = 0;
        }
        
        return ['mode', text, commands[(currentState + 1) % commands.length], greyed, currentState];
    },
    
    /* user interface core - end */
    
    /* user interface windows - begin */
    
    interfaceDoor = function(who, managedGraphic) {
        state.APIAreaMapper.uiWindow = 'door';
        
        sendStandardInterface(who, 'Area Mapper',
            uiSection('Door Management', null, [
                    ['active', 'open', 'interactiveObjectOpen', false, managedGraphic.properties[1]],
                    ['active', 'lock', 'interactiveObjectLock', false, managedGraphic.properties[2]],
                    ['active', 'trap', 'interactiveObjectTrap', false, managedGraphic.properties[3]],
                    ['active', 'hide', 'interactiveObjectHide', false, managedGraphic.properties[4]]
                ])
        );
    },
    
    interfaceChest = function(who, managedGraphic) {
        state.APIAreaMapper.uiWindow = 'chest';
        
        sendStandardInterface(who, 'Area Mapper',
            uiSection('Chest Management', null, [
                    ['active', 'open', 'interactiveObjectOpen', false, managedGraphic.properties[5]],
                    ['active', 'lock', 'interactiveObjectLock', false, managedGraphic.properties[6]],
                    ['active', 'trap', 'interactiveObjectTrap', false, managedGraphic.properties[7]],
                    ['active', 'hide', 'interactiveObjectHide', false, managedGraphic.properties[8]],
                    ['active', 'reposition', 'chestReposition', false, state.APIAreaMapper.chestReposition] //this is a global setting for repositioning all chests
                ])
        );
    },
    
    interfaceAreaManagement = function(who, areaId) {
        var a = new area(areaId);
        
        if(!a) {
            log("Couldn't find area '" + areaId + "' in interfaceAreaManagement().");
            delete state.APIAreaMapper.uiWindow;
            return;
        }
        
        //TODO: some of these may no longer be necessary:
        var hasEdgeWallGaps = a.getProperty('edgeWallGaps').length;
        var hasEdgeWalls = a.getProperty('edgeWalls').length;
        var hasInnerWalls = a.getProperty('innerWalls').length;
        var hasDoors = a.getProperty('doors').length;
        var hasChests = a.getProperty('chests').length;
        var hasInstances = a.getInstancePageIds().length;
        var isArchived = a.getProperty('archived');
        
        var getModeState = function(variable, positiveValue, negativeValue) {
            if(variable == positiveValue) {
                return 1;
            }
            
            if(variable == negativeValue) {
                return 2;
            }
            
            return 0;
        };
        
        var instructions = null;
        
        switch(state.APIAreaMapper.recordAreaMode) {
            case 'areaAppend':
                instructions = 'Use a drawing tool to add to the floorplan.';
                break;
            case 'areaRemove':
                instructions = 'Use a drawing tool to remove from the floorplan.';
                break;
            case 'edgeWallGapRemove':
                instructions = 'Use a drawing tool to remove gaps in edge walls. Entire gaps must be captured.';
                break;
            case 'edgeWallRemove':
                instructions = 'Use a drawing tool to remove edge walls.';
                break;
            case 'innerWallAdd':
                instructions = 'Use a drawing tool to add inner walls. Walls must be fully contained within the floorplan.';
                break;
            case 'innerWallRemove':
                instructions = 'Use a drawing tool to remove inner walls.';
                break;
            case 'doorAdd':
                instructions = 'Use a drawing tool to add a door by selecting two wall sections that the door should connect.';
                break;
            case 'doorRemove':
                instructions = 'Use a drawing tool to remove doors. Entire doors must be captured.';
                break;
            case 'chestAdd':
                instructions = 'Use a drawing tool to create a chest. The position, height, and width of the drawing will be used.';
                break;
            case 'chestRemove':
                instructions = 'Use a drawing tool to remove chests. Chest centers must be captured.';
                break;
            default:
                break;
        }
        
        sendStandardInterface(who, a.getProperty('name'),
            uiSection('Manage', null, [
                    ['active', 'active', 'areaActivate ' + areaId, false, (state.APIAreaMapper.activeArea == areaId)],
                    ['navigation', 'rename', 'rename', (state.APIAreaMapper.activeArea != areaId), false],
                    ['navigation', 'assets', 'areaAssets', (state.APIAreaMapper.activeArea != areaId), false],
                    ['active', 'draw instance', 'areaInstanceCreate', isArchived || (state.APIAreaMapper.activeArea != areaId), (state.APIAreaMapper.recordAreaMode == 'areaInstanceCreate')],
                    ['navigation', 'hide', 'areaHide ' + areaId, !hasInstances, false],
                    ['active', 'archive', 'areaArchive ' + areaId, false, isArchived],
                    ['active', 'blueprint mode', 'blueprint', !hasInstances || (state.APIAreaMapper.activeArea != areaId), state.APIAreaMapper.blueprintMode],
                    ['navigation', 'redraw', 'redraw', !hasInstances || (state.APIAreaMapper.activeArea != areaId), false]
                ])
            +uiSection('Modify', instructions, [
                    modeCommand('floorplan', ['endRecordAreaMode', 'areaAppend', 'areaRemove'], !hasInstances || (state.APIAreaMapper.activeArea != areaId), state.APIAreaMapper.recordAreaMode),
                    modeCommand('edge walls', ['endRecordAreaMode', 'edgeWallGapRemove', 'edgeWallRemove'], !hasInstances || (state.APIAreaMapper.activeArea != areaId), state.APIAreaMapper.recordAreaMode),
                    modeCommand('inner walls', ['endRecordAreaMode', 'innerWallAdd', 'innerWallRemove'], !hasInstances || (state.APIAreaMapper.activeArea != areaId), state.APIAreaMapper.recordAreaMode),
                    modeCommand('doors', ['endRecordAreaMode', 'doorAdd', 'doorRemove'], !hasInstances || (state.APIAreaMapper.activeArea != areaId), state.APIAreaMapper.recordAreaMode),
                    modeCommand('chests', ['endRecordAreaMode', 'chestAdd', 'chestRemove'], !hasInstances || (state.APIAreaMapper.activeArea != areaId), state.APIAreaMapper.recordAreaMode),
                    ['navigation', 'undo (TBA)', 'undo', true || !hasInstances || (state.APIAreaMapper.activeArea != areaId), false]
                ])
            //TODO: instance-specific modifications: move, resize, rotate
        );
    },
    
    interfaceAreaAssets = function(who) {
        sendStandardInterface(who, 'Manage Area Assets',
            uiSection('Floor', null, [
                    ['navigation', 'cycle asset', 'assetStandard floor', false, false],
                    ['navigation', 'transparent', 'assetTransparent floor', false, false],
                    ['navigation', 'unique asset (TBA)', 'assetUnique floor', true, false]
                ])
            +uiSection('Walls', null, [
                    ['navigation', 'cycle asset', 'assetStandard walls', false, false],
                    ['navigation', 'unique asset (TBA)', 'assetUnique walls', true, false]
                ])
            +uiSection('Doors', null, [
                    ['navigation', 'cycle asset', 'assetStandard doors', false, false],
                    ['navigation', 'unique asset (TBA)', 'assetUnique doors', true, false]
                ])
            +uiSection('Chests', null, [
                    ['navigation', 'cycle asset', 'assetStandard chests', false, false],
                    ['navigation', 'unique asset (TBA)', 'assetUnique chests', true, false]
                ])
        );
    },
    
    interfaceAreaList = function(who) {
        var displayFolder = state.APIAreaMapper.uiWindow.split(' ')[1];
        
        //find the areas and break them into groups:
        var areasByFolder = [[],[],[]]; //0: drawn, 1: hidden, 2: archived
        
        var drawnCount = 0;
        var hiddenCount = 0;
        var archivedCount = 0;
        
        //populate drawn areas (with instance count):
        state.APIAreaMapper.areaInstances.forEach(function(ai) {
            var areaId = ai[0][1];
            
            if(areasByFolder[0][areaId]) {
                areasByFolder[0][areaId][0]++;
            } else {
                drawnCount++;
                
                areasByFolder[0][areaId] = [1, ''];
            }
        }, this);
        
        //populate area information:
        state.APIAreaMapper.areas.forEach(function(a) {
            var areaId,
                areaName,
                areaArchived;
                
            for(var prop in a) {
                switch(a[prop][0]) {
                    case 'id':
                        areaId = a[prop][1];
                        break;
                    case 'name':
                        areaName = a[prop][1];
                        break;
                    case 'archived':
                        areaArchived = a[prop][1];
                        break;
                    default:
                        break;
                }
            }
            
            if(areasByFolder[0][areaId]) {
                areasByFolder[0][areaId][1] = areaName;
            } else if(areaArchived) {
                archivedCount++;
                areasByFolder[2][areaId] = areaName;
            } else {
                hiddenCount++;
                areasByFolder[1][areaId] = areaName;
            }
        }, this);
        
        var html = '';
        var folderLinks = [];
        
        switch(displayFolder) {
            case 'drawn':
                for(var areaId in areasByFolder[0]) {
                    folderLinks.push(['navigationActive', areasByFolder[0][areaId][1] + ' (' + areasByFolder[0][areaId][0]  + ')', 'manageArea ' + areaId, false, state.APIAreaMapper.activeArea == areaId]);
                }
                html += uiSection('Drawn', 'The numbers in parentheses represent the number of drawn instances.', folderLinks)
                    +uiSection('Other Lists', 'The numbers in parentheses represent the number of areas in the list.', [
                            ['navigation', 'Hidden (' + hiddenCount + ')', 'listAreas hidden', !hiddenCount, false],
                            ['navigation', 'Archived (' + archivedCount + ')', 'listAreas archived', !archivedCount, false]
                        ]);
                break;
            case 'hidden':
                for(var areaId in areasByFolder[1]) {
                    folderLinks.push(['navigation', areasByFolder[1][areaId], 'manageArea ' + areaId, false, state.APIAreaMapper.activeArea == areaId]);
                }
                html += uiSection('Hidden', null, folderLinks)
                    +uiSection('Other Lists', 'The numbers in parentheses represent the number of areas in the list.', [
                            ['navigation', 'Drawn (' + drawnCount + ')', 'listAreas drawn', !drawnCount, false],
                            ['navigation', 'Archived (' + archivedCount + ')', 'listAreas archived', !archivedCount, false]
                        ]);
                break;
            case 'archived':
                for(var areaId in areasByFolder[2]) {
                    folderLinks.push(['navigation', areasByFolder[2][areaId], 'manageArea ' + areaId, false, state.APIAreaMapper.activeArea == areaId]);
                }
                html += uiSection('Hidden', null, folderLinks)
                    +uiSection('Other Lists', 'The numbers in parentheses represent the number of areas in the list.', [
                            ['navigation', 'Drawn (' + drawnCount + ')', 'listAreas drawn', !drawnCount, false],
                            ['navigation', 'Hidden (' + hiddenCount + ')', 'listAreas hidden', !hiddenCount, false]
                        ]);
                break;
            default:
                log("Unhandled displayFolder '" + displayFolder + "' in interfaceAreaList().");
                return;
        }
        
        sendStandardInterface(who, 'Area List', html);
    },
    
    interfaceMainMenu = function(who) {
        sendStandardInterface(who, 'Area Mapper',
            uiSection('Main Menu', null, [
                    ['navigationActive', 'active area', 'activeArea', !state.APIAreaMapper.activeArea, false],
                    ['navigation', 'list areas', 'listAreas drawn', !state.APIAreaMapper.areas.length, false],
                    ['active', 'create new area', 'areaCreate', false, (state.APIAreaMapper.recordAreaMode == 'areaCreate')]
                ])
        );
    },
    
    interfaceSettings = function(who, reverseHandoutUi) {
        
        //note: this function is special in that when the handoutUi state is toggled, a direct command is issued from the toggle with reverseHandoutUi set, so that the toggled state will appear in both UIs
        
        sendStandardInterface(who, 'Area Mapper',
            uiSection('Settings', null, [
                    ['active', 'handout UI', 'handoutUi', false, reverseHandoutUi ? !state.APIAreaMapper.handoutUi : state.APIAreaMapper.handoutUi],
                    ['navigation', 'assets', 'globalAssets', false, false]
                ])
        );
    },
    
    interfaceGlobalAssets = function(who) {
        var activeClassification;
        var assetIndex = 0;
        
        if(state.APIAreaMapper.globalAssetManagement) {
            activeClassification = state.APIAreaMapper.globalAssetManagement[0];
            assetIndex = state.APIAreaMapper.globalAssetManagement[1];
        }
        
        sendStandardInterface(who, 'Global Assets',
            uiSection('Floors', 
                activeClassification == 'floor' ? 'The floor asset can be seen on the top left corner of the player page.' : null, 
                [
                        ['active', 'active', 'globalAssetActivateClassification floor', false, activeClassification == 'floor'],
                        ['navigation', 'create', 'globalAssetCreate', activeClassification != 'floor', false],
                        ['navigation', 'cycle', 'globalAssetCycle', activeClassification != 'floor', false],
                        ['navigation', 'edit', 'globalAssetEdit', activeClassification != 'floor', false],
                        ['navigation', 'delete (TBA)', 'globalAssetDelete floor', true || activeClassification != 'floor', false]
                    ])
            +uiSection('Walls', 
                activeClassification == 'wall' ? 'The wall assets can be seen on the top left corner of the player page.' : null, 
                [
                        ['active', 'active', 'globalAssetActivateClassification wall', false, activeClassification == 'wall'],
                        ['navigation', 'create', 'globalAssetCreate', activeClassification != 'wall', false],
                        ['navigation', 'cycle', 'globalAssetCycle', activeClassification != 'wall', false],
                        ['navigation', 'edit', 'globalAssetEdit', activeClassification != 'wall', false],
                        ['navigation', 'delete (TBA)', 'globalAssetDelete wall', true || activeClassification != 'wall', false]
                    ])
            +uiSection('Doors', 
                activeClassification == 'door' ? 'The door assets can be seen on the top left corner of the player page.' : null, 
                [
                        ['active', 'active', 'globalAssetActivateClassification door', false, activeClassification == 'door'],
                        ['navigation', 'create', 'globalAssetCreate',activeClassification != 'door', false],
                        ['navigation', 'cycle', 'globalAssetCycle', activeClassification != 'door', false],
                        ['navigation', 'edit', 'globalAssetEdit', activeClassification != 'door', false],
                        ['navigation', 'delete (TBA)', 'globalAssetDelete door', true || activeClassification != 'door', false]
                    ])
            +uiSection('Chests', 
                activeClassification == 'chest' ? 'The chest assets can be seen on the top left corner of the player page.' : null, 
                [
                        ['active', 'active', 'globalAssetActivateClassification chest', false, activeClassification == 'chest'],
                        ['navigation', 'create', 'globalAssetCreate', activeClassification != 'chest', false],
                        ['navigation', 'cycle', 'globalAssetCycle', activeClassification != 'chest', false],
                        ['navigation', 'edit', 'globalAssetEdit', activeClassification != 'chest', false],
                        ['navigation', 'delete (TBA)', 'globalAssetDelete chest', true || activeClassification != 'chest', false]
                    ])
        );
    },
    
    interfaceGlobalAssetEdit = function(who) {
        if(!state.APIAreaMapper.globalAssetManagement) {
            log('interfaceGlobalAssetEdit() called without state.APIAreaMapper.globalAssetManagement.');
            return;
        }
        
        if(!state.APIAreaMapper.globalAssetEdit) {
            log('interfaceGlobalAssetEdit() called wihtout state.APIAreaMapper.globalAssetEdit.');
            return;
        }
        
        var assetClassification = state.APIAreaMapper.globalAssetManagement[0];
        var assetIndex = state.APIAreaMapper.globalAssetManagement[1];
        
        var asset1,
            asset2;
        
        //get asset(s):
        switch(assetClassification) {
            case 'floor':
                asset1 = new asset(state.APIAreaMapper.floorAssets[assetIndex]);
                break;
            case 'wall':
                asset1 = new asset(state.APIAreaMapper.wallAssets[assetIndex][0]);
                asset2 = new asset(state.APIAreaMapper.wallAssets[assetIndex][1]);
                break;
            case 'door':
                asset1 = new asset(state.APIAreaMapper.doorAssets[assetIndex][0]);
                asset2 = new asset(state.APIAreaMapper.doorAssets[assetIndex][1]);
                break;
            case 'chest':
                asset1 = new asset(state.APIAreaMapper.chestAssets[assetIndex][0]);
                asset2 = new asset(state.APIAreaMapper.chestAssets[assetIndex][1]);
                break;
            default:
                log('Unhandled assetClassification of ' + assetClassification + ' in interfaceGlobalAssetEdit().');
                return;
        }
        
        var activeAsest = state.APIAreaMapper.globalAssetEdit[0] ? asset2 : asset1;
        
        //TODO: reset button? - would need to be on an individual asset, not the pair
        
        var text = null;
        var links = [['navigation', 'done', 'globalAssets', false, false]];
        switch(assetClassification) {
            case 'floor':
                break;
            case 'wall':
            case 'door':
            case 'chest':
                links.push(['active', 'left asset', 'globalAssetEditToggleActiveAsset', false, !state.APIAreaMapper.globalAssetEdit[0]]);
                links.push(['navigation', 'swap assets', 'globalAssetEditSwapAssets', false, false]);
                break;
            default:
                log('Unhandled assetClassification of ' + assetClassification + ' in interfaceGlobalAssetEdit().');
                return;
        }
        var html = uiSection('General', text, links);
        
        text = null;
        links = [['navigation', ch("<") + '---', 'globalAssetEditRotate ccw lots', false, false],
                    ['navigation', ch("<") + '--', 'globalAssetEditRotate ccw some', false, false],
                    ['navigation', ch("<") + '-', 'globalAssetEditRotate ccw tad', false, false],
                    ['navigation', '-' + ch(">"), 'globalAssetEditRotate cw tad', false, false],
                    ['navigation', '--' + ch(">"), 'globalAssetEditRotate cw some', false, false],
                    ['navigation', '---' + ch(">"), 'globalAssetEditRotate cw lots', false, false]];
        switch(assetClassification) {
            case 'floor':
                break;
            case 'wall':
            case 'door':
                links.push(['active', 'alternate stretch', 'globalAssetEditAlternateStretch', false, activeAsest.getProperty('alternate')]);
                text = 'Assets should be horizontal.';
                break;
            case 'chest':
                break;
            default:
                log('Unhandled assetClassification of ' + assetClassification + ' in interfaceGlobalAssetEdit().');
                return;
        }
        html += uiSection('Rotation', text, links);
        
        text = null;
        links = [['navigation', 'increase lots', 'globalAssetEditScale vertical increase lots', false, false],
                    ['navigation', 'increase', 'globalAssetEditScale vertical increase tad', false, false],
                    ['navigation', 'decrease', 'globalAssetEditScale vertical decrease tad', false, false],
                    ['navigation', 'decrease lots', 'globalAssetEditScale vertical decrease lots', false, false]];
        html += uiSection('Vertical Scale', text, links);
        
        text = null;
        links = [['navigation', 'increase lots', 'globalAssetEditScale horizontal increase lots', false, false],
                    ['navigation', 'increase', 'globalAssetEditScale horizontal increase tad', false, false],
                    ['navigation', 'decrease', 'globalAssetEditScale horizontal decrease tad', false, false],
                    ['navigation', 'decrease lots', 'globalAssetEditScale horizontal decrease lots', false, false]];
        html += uiSection('Horizontal Scale', text, links);
        
        text = null;
        links = [['navigation', 'increase lots', 'globalAssetEditOffset vertical increase lots', false, false],
                    ['navigation', 'increase', 'globalAssetEditOffset vertical increase tad', false, false],
                    ['navigation', 'decrease', 'globalAssetEditOffset vertical decrease tad', false, false],
                    ['navigation', 'decrease lots', 'globalAssetEditOffset vertical decrease lots', false, false]];
        html += uiSection('Vertical Position', text, links);
        
        text = null;
        links = [['navigation', 'increase lots', 'globalAssetEditOffset horizontal increase lots', false, false],
                    ['navigation', 'increase', 'globalAssetEditOffset horizontal increase tad', false, false],
                    ['navigation', 'decrease', 'globalAssetEditOffset horizontal decrease tad', false, false],
                    ['navigation', 'decrease lots', 'globalAssetEditOffset horizontal decrease lots', false, false]];
        html += uiSection('Horizontal Position', text, links);
        
        sendStandardInterface(who, 'Edit Global Asset', html);
    },
    
    interfaceHelp = function(who, topic) {
        var helpText = '';
        
        if('undefined' !== typeof(topic) && topic.length) {
            switch(topic) {
                case 'commandLinks':
                    var colorBlock = function(color) {
                        return '<span style="border:0px solid white;display:inline-block;background-color:' + color + ';padding:7px 15px;"> </span>';
                    };
                    
                    helpText = uiSection('Help - Command Links', 
                        'Command links are color coded to indicate what they do.</p><p>'
                            +'A main section of ' + colorBlock(buttonBackgroundColor) + ' is an active link that can be clicked.<br/>'
                            +'A main section of ' + colorBlock(buttonGreyedColor) + ' is an inactive link and cannot be clicked.</p><p>'
                            +'A border of ' + colorBlock(buttonHighlightLinkColor) + ' is a link that does something once or is used for navigation.<br/>'
                            +'A border of ' + colorBlock(buttonHighlightInactiveColor) + ' is a link that can have state, but is currently inactive. Clicking the link will change its state.<br/>'
                            +'A border of ' + colorBlock(buttonHighlightActiveColor) + ' is a link that is is currently in an active state. Clicking the link will deactivate it.<br/>'
                            +'A border of ' + colorBlock(buttonHighlightPositiveColor) + ' is a link that is in a '+ch("'")+'positive'+ch("'")+' state (such as adding something). Clicking the link will put it into a '+ch("'")+'negative'+ch("'")+' state.<br/>'
                            +'A border of ' + colorBlock(buttonHighlightNegativeColor) + ' is a link that is in a '+ch("'")+'negative'+ch("'")+' state (such as removing something). Clicking the link will put it into an inactive state.<br/>'
                            +'A border of ' + colorBlock(buttonHighlightActiveColor) + ' surrounded by ' + colorBlock(buttonHighlightLinkColor) + ' is a link that is used for navigation. This is indicating that the link represents something that is in an active state.', 
                        []);
                    break;
                case 'handoutUi':
                    helpText = uiSection('Help - Handout UI', 
                        'Normally, the user interface is sent as whispers to the GM in the chat window. If the '+ch("'")+'handout UI'+ch("'")+' setting is active, the user interface instead appears in a handout called '+ch("'")+'API-AreaMapper'+ch("'")+'.</p><p>'
                            +'Command links in the handout are not functional if the handout is popped out.', 
                        []);
                    break;
                default:
                    break;
            }
        }
        
        sendStandardInterface(who, 'Area Mapper',
            helpText.length
                ? helpText
                : uiSection('Help Topics', null, [
                        ['navigation', 'command links', 'help commandLinks', false, false],
                        ['navigation', 'handout UI', 'help handoutUi', false, false]
                    ])
        );
    },
    
    interfaceAbout = function(who) {
        sendStandardInterface(who, 'Area Mapper',
            '<p><b>About</b></p>'
            +'<p>Area Mapper is a mapping tool that is intended to make map management quick, versatile, and powerful.</p>'
            +'<p>The source code can be found at https://github.com/RandallDavis/roll20-areaMapper/.</p>'
            +'<p>Developed by Rand Davis circa 2015.</p>'
        );
    },
    
    /* user interface windows - end */
    
    /* user interface navigation - begin */
    
    //gets the selected graphic, and failing that, will use a false selection:
    getSelectedGraphic = function(selected) {
        var graphic = getObj('graphic', selected[0]._id);
        
        //if the truly selected graphic is reachable, delete any false selections:
        if(graphic) {
            delete state.APIAreaMapper.falseSelection;
        }
        //if the graphic wasn't reachable, attempt to find a false selection, if there is one:
        else if(state.APIAreaMapper.falseSelection) {
            graphic = getObj('graphic', state.APIAreaMapper.falseSelection);
        }
        
        return graphic;
    },
    
    //note: this should be callable based on selections from the selector tool:
    intuit = function(selected, who) {
        var followUpAction = [];
        
        if(!(selected && selected.length) || selected.length !== 1) {
            if(!state.APIAreaMapper.uiWindow || state.APIAreaMapper.uiWindow == 'mainMenu') {
                interfaceMainMenu(who);
                return;
            }
            
            if(state.APIAreaMapper.uiWindow.indexOf('listAreas') === 0) {
                interfaceAreaList(who);
                return;
            }
            
            if(state.APIAreaMapper.uiWindow.indexOf('area#') === 0) {
                interfaceAreaManagement(who, state.APIAreaMapper.uiWindow.substring(5));
                return;
            }
            
            if(state.APIAreaMapper.uiWindow.indexOf('areaAssets') === 0) {
                interfaceAreaAssets(who);
                return;
            }
            
            if(state.APIAreaMapper.uiWindow.indexOf('settings') === 0) {
                interfaceSettings(who);
                return;
            }
            
            if(state.APIAreaMapper.uiWindow.indexOf('globalAssets') === 0) {
                drawAssetManagementEditModal();
                interfaceGlobalAssets(who);
                return;
            }
            
            if(state.APIAreaMapper.uiWindow.indexOf('globalAssetEdit') === 0) {
                drawAssetManagementEditModal(true);
                interfaceGlobalAssetEdit(who);
                return;
            }
            
            interfaceMainMenu(who);
            return;
        }
       
        var graphic = getSelectedGraphic(selected);
        
        if(!graphic) {
            followUpAction.message = 'The selected item is not a reachable graphic.';
            return followUpAction;
        }
        
        var a = new area(state.APIAreaMapper.activeArea);
        var managedGraphicProperties = a.getManagedGraphicProperties(graphic);
        
        if(!managedGraphicProperties) {
            followUpAction.message = 'The selected graphic has no options to display.';
            return followUpAction;
        }
        
        switch(managedGraphicProperties.graphicType) {
            case 'doors':
                interfaceDoor(who, managedGraphicProperties);
                break;
            case 'chests':
                interfaceChest(who, managedGraphicProperties);
                break;
            default:
                log('Unhandled graphicType of ' + managedGraphicProperties.graphicType + ' in intuit().');
                followUpAction.message = 'There was a problem; see the log for details.';
                return followUpAction;
        }
        
        return followUpAction;
    },
    
    processFollowUpAction = function(followUpAction, who, selected) {
        if(followUpAction) {
            if(followUpAction.message) {
                sendNotification(who, followUpAction.message);
            }
            else if(followUpAction.refresh) {
                intuit(followUpAction.ignoreSelection ? null : selected, who);
            }
        }
    },
    
    processUserInput = function(msg) {
        
        //store player information to use for any future anonymous actions:
        state.APIAreaMapper.playerId = msg.playerid;
        state.APIAreaMapper.playerName = msg.who;
        
        var followUpAction = []; //might get clobbered
        var chatCommand = msg.content.split(' ');
        
        var retainRecordAreaMode = false;
        var retainFalseSelection = false;
        
        if(chatCommand.length === 1) {
            followUpAction = intuit(msg.selected, msg.who);
        } else {
            switch(chatCommand[1]) {
                case 'handoutUi':
                    state.APIAreaMapper.uiWindow = 'settings';
                    followUpAction = toggleHandoutUi(msg.who)
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssets':
                    state.APIAreaMapper.uiWindow = 'globalAssets';
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetActivateClassification':
                    state.APIAreaMapper.uiWindow = 'globalAssets';
                    followUpAction = toggleGlobalAssetClassification(chatCommand[2]);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetCreate':
                    followUpAction = handleGlobalAssetCreate(msg.selected);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetCycle':
                    followUpAction = handleGlobalAssetCycle();
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetEdit':
                    state.APIAreaMapper.uiWindow = 'globalAssetEdit';
                    state.APIAreaMapper.globalAssetEdit = [];
                    state.APIAreaMapper.globalAssetEdit.push(0);
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetEditRotate':
                    followUpAction = handleGlobalAssetEditRotate(chatCommand[2], chatCommand[3]);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetEditAlternateStretch':
                    followUpAction = toggleGlobalAssetEditAlternateStretch();
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetEditToggleActiveAsset':
                    state.APIAreaMapper.globalAssetEdit[0] = (state.APIAreaMapper.globalAssetEdit[0] + 1) % 2;
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetEditSwapAssets':
                    followUpAction = handleGlobalAssetEditSwapAssets();
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetEditScale':
                    followUpAction = handleGlobalAssetEditScaleChange(chatCommand[2], chatCommand[3], chatCommand[4]);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'globalAssetEditOffset':
                    followUpAction = handleGlobalAssetEditOffsetChange(chatCommand[2], chatCommand[3], chatCommand[4]);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'mainMenu':
                    state.APIAreaMapper.uiWindow = 'mainMenu';
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'listAreas':
                    state.APIAreaMapper.uiWindow = 'listAreas ' + chatCommand[2];
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'manageArea':
                    state.APIAreaMapper.uiWindow = 'area#' + chatCommand[2];
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'activeArea':
                    state.APIAreaMapper.uiWindow = 'area#' + state.APIAreaMapper.activeArea;
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'areaActivate':
                    if(state.APIAreaMapper.activeArea == chatCommand[2]) {
                        delete state.APIAreaMapper.activeArea;
                    } else {
                        state.APIAreaMapper.activeArea = chatCommand[2]
                    }
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'areaHide':
                    followUpAction = handleAreaHide(chatCommand[2]);
                    break;
                case 'areaArchive':
                    followUpAction = handleAreaArchive(chatCommand[2]);
                    break;
                case 'areaCreate':
                case 'areaAppend':
                case 'areaRemove':
                case 'edgeWallRemove':
                case 'edgeWallGapRemove':
                case 'innerWallAdd':
                case 'innerWallRemove':
                case 'doorAdd':
                case 'doorRemove':
                case 'chestAdd':
                case 'chestRemove':
                case 'areaInstanceCreate':
                    retainRecordAreaMode = true;
                    followUpAction = toggleOrSetAreaRecordMode(chatCommand[1]);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'endRecordAreaMode':
                    followUpAction.ignoreSelection = true;
                    followUpAction.refresh = true;
                    break;
                case 'chestReposition':
                    retainFalseSelection = true;
                    followUpAction = toggleChestReposition();
                    break;
                case 'redraw':
                    retainRecordAreaMode = true;
                    followUpAction = handleAreaRedraw();
                    break;
                case 'blueprint':
                    retainRecordAreaMode = true;
                    followUpAction = toggleBlueprintMode();
                    followUpAction.ignoreSelection = true;
                    break;
                case 'areaAssets':
                    state.APIAreaMapper.uiWindow = 'areaAssets';
                    followUpAction.refresh = true;
                    followUpAction.ignoreSelection = true;
                    break;
                case 'assetStandard':
                    followUpAction = handleAssetStandard(chatCommand[2]);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'assetTransparent':
                    followUpAction = handleAssetTransparent(chatCommand[2]);
                    followUpAction.ignoreSelection = true;
                    break;
                case 'interactiveObjectOpen':
                case 'interactiveObjectLock':
                case 'interactiveObjectTrap':
                case 'interactiveObjectHide':
                    retainFalseSelection = true;
                    followUpAction = toggleInteractiveProperty(msg.selected, msg.who, chatCommand[1]);
                    break;
                case 'settings':
                    interfaceSettings(msg.who);
                    break;
                case 'help':
                    if(chatCommand.length < 3) {
                        interfaceHelp(msg.who);
                    } else {
                        interfaceHelp(msg.who, chatCommand[2]);
                    }
                    break;
                case 'about':
                    interfaceAbout(msg.who);
                    break;
                case 'rename':
                    var nameItems = chatCommand;
                    nameItems.shift();
                    nameItems.shift();
                    followUpAction = handleAreaRename(nameItems.join(' '));
                    break;
                default:
                    break;
            }
        }
        
        if(!retainRecordAreaMode) {
            delete state.APIAreaMapper.recordAreaMode;
        }
        
        if(!retainFalseSelection) {
            delete state.APIAreaMapper.falseSelection;
        }
        
        hideAssetManagementEditModal();
        
        processFollowUpAction(followUpAction, msg.who, msg.selected);
    },
    
    /* user interface navigation - end */
    
    /* event handlers - begin */
    
    handleUserInput = function(msg) {
        if(msg.type == 'api' && msg.content.match(/^!api-area/) && playerIsGM(msg.playerid)) {
            processUserInput(msg);
        }
    },
    
    handlePathAdd = function(path) {
        if(state.APIAreaMapper.tempIgnoreDrawingEvents || !state.APIAreaMapper.recordAreaMode) {
            return;
        }
        
        var followUpAction;
        
        if(state.APIAreaMapper.recordAreaMode == 'areaCreate') {
            var a = new area();
            followUpAction = a.create(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
            state.APIAreaMapper.activeArea = a.getProperty('id');
            state.APIAreaMapper.uiWindow = 'area#' + state.APIAreaMapper.activeArea;
            delete state.APIAreaMapper.recordAreaMode;
            path.remove();
        } else if(state.APIAreaMapper.activeArea) {
            var a = new area(state.APIAreaMapper.activeArea);
            
            switch(state.APIAreaMapper.recordAreaMode) {
                case 'areaAppend':
                    followUpAction = a.floorplanAppend(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'areaRemove':
                    followUpAction = a.floorplanRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'edgeWallRemove':
                    followUpAction = a.edgeWallRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'edgeWallGapRemove':
                    followUpAction = a.edgeWallGapRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'innerWallAdd':
                    followUpAction = a.innerWallAdd(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'innerWallRemove':
                    followUpAction = a.innerWallRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'doorAdd':
                    followUpAction = a.doorAdd(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'doorRemove':
                    followUpAction = a.doorRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'chestAdd':
                    followUpAction = a.chestAdd(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'chestRemove':
                    followUpAction = a.chestRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    break;
                case 'areaInstanceCreate':
                    followUpAction = a.createInstance(path.get('_pageid'), path.get('top'), path.get('left'));
                    break;
                default:
                    return;
            }
            
            path.remove();
        }
        
        processFollowUpAction(followUpAction);
    },
    
    handleGraphicChange = function(graphic, prevState) {
        if(state.APIAreaMapper.tempIgnoreDrawingEvents) {
            return;
        }
        
        if(!state.APIAreaMapper.activeArea) {
            return;
        }
        
        //ignore prevState: if the object was snapped to grid, prevState and graphic will both be changed; if not, prevState is old... I don't know a way to determine which case we're dealing with
        
        //let the area instance know about the graphic being changed; it should only care if it was a position change and if it's a managed object:
        var a = new area(state.APIAreaMapper.activeArea);
        a.handleGraphicChange(graphic);
    },
    
    /* event handlers - end */
    
    /* nuts and bolts - begin */
    
    registerEventHandlers = function() {
        on('chat:message', handleUserInput);
        on('add:path', handlePathAdd);
        on('change:graphic', handleGraphicChange);
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
    
    if('undefined' !== typeof(APIVisualAlert) && APIVisualAlert.visualAlert && _.isFunction(APIVisualAlert.visualAlert)) {
        APIAreaMapper.checkInstall();
        APIAreaMapper.registerEventHandlers();
    } else {
        log('--------------------------------------------------------------');
        log('APIRoomManagement requires the VisualAlert script to work.');
        log('VisualAlert GIST: https://github.com/RandallDavis/roll20-visualAlertScript');
        log('--------------------------------------------------------------');
    }
});
