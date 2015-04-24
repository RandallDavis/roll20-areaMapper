var APIAreaMapper = APIAreaMapper || (function() {
   
    /* core - begin */
    
    var version = 0.1,
        schemaVersion = 0.1,
        buttonBackgroundColor = '#E92862',
        buttonHighlightColor = '#00FF00',
        mainBackgroundColor = '#3D8FE1',
        headerBackgroundColor = '#386EA5',
        notificationBackgroundColor = '#64EED7',
        
    checkInstall = function() {
        
        log('-=> Area Mapper v'+version+' <=-');
        
        //TODO: state resets shouldn't destroy areas, and needs the ability to convert them to newer versions to prevent backward compatibile code elsewhere:
        if(!_.has(state,'APIAreaMapper') || state.APIAreaMapper.version !== schemaVersion) {
            log('APIAreaMapper: Resetting state.');
            state.APIAreaMapper = {
                version: schemaVersion,
                areas: [],
                areaInstances: [],
                activeArea: null
            };
        } 
        
        resetTemporaryState();
    },
    
    resetTemporaryState = function() {
        state.APIAreaMapper.tempIgnoreAddPath = false;
        state.APIAreaMapper.recordAreaMode = false;
        delete state.APIAreaMapper.tempArea;
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
    
    /* area - begin */
    
    var area = function() {
        typedObject.call(this);
        this._type.push('area');
    };
    
    inheritPrototype(area, typedObject);
    
    area.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'id':
            case 'floorPlan': //path-ready list of coordinates representing a clean polygon
                this['_' + property] = value;
                break;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
   
    area.prototype.create = function(floorPlan, pageid, top, left) {
        this.setProperty('id', Math.random());
        this.setProperty('floorPlan', floorPlan);
        this.save();
        this.draw(pageid, top, left);
    };
    
    /*//TODO: this needs to change:
    area.prototype.getInstanceIndex = function(pageid) {
        var floorPolygons = this.getProperty('floorPolygon');
        for(var i = 0; i < floorPolygons; i++) {
            if(floorPolygons[i].get('_pageid') === pageid) {
                return i;
            }
        }
        
        return;
    };*/
    
    area.prototype.load = function() {
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
                case 'floorPlan':
                    this.setProperty(areaState[i][0], areaState[i][1]);
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
        areaState.push(['floorPlan', this.getProperty('floorPlan')]);
        
        //remove existing area state:
        var id = this.getProperty('id');
        var areas = state.APIAreaMapper.areas;
        var oldAreaState;
        for(var i = 0; i < areas.length; i++) {
            areas[i].forEach(function(prop) {
                if(prop[0] === 'id' && prop[1] === id) {
                    oldAreaState = state.APIAreaMapper.areas.splice(i);
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
    
    //alters the area's floorPlan using an area instance as a control:
    area.prototype.floorPlanAppend = function(path, pageId, top, left) {
        //get instance that appending is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.load();
        
        //test a mandatory property to make sure that the instance actually exists:
        if('undefined' === instance.getProperty('top')) {
            log('No instance found append to in area.floorPlanAppend().');
            return;
        }
        
        //TODO: incoming polygon should be relative to the instance's rotation and scale
        var instanceTop = instance.getProperty('top');
        var instanceLeft = instance.getProperty('left');
        
        var g = new graph();
        g.addPath(path, instanceTop - top, instanceLeft - left);
        
        //TODO: this is getting weird - the graph never knows if it has a clean polygon or not. Fix with polymorphic graph data structures.
        //determine whether or not the old polygon is inside the new one:
        var firstPointInOldFloorPlanRaw = JSON.parse(this.getProperty('floorPlan'))[0];
        var isOldInNew = g.isInCleanPolygon(firstPointInOldFloorPlanRaw[1], firstPointInOldFloorPlanRaw[2]);
        
        var result = g.addPath(this.getProperty('floorPlan'));
        
        //if the polygons intersect, or if the old one is engulfed in the new one, update the floorPlan:
        if(result.hadIntersections || isOldInNew) {
            var cp = g.getCleanPolygon();
            this.setProperty('floorPlan', g.getCleanPolygon().path);
            this.save();
            this.draw(pageId, Math.min(instanceTop, top), Math.min(instanceLeft, left));
        }
    };
    
    area.prototype.draw = function(pageId, top, left) {
        instance = new areaInstance(this.getProperty('id'), pageId);
        instance.draw(top, left);
    };
    
    var areaInstance = function(areaId, pageId) {
        typedObject.call(this);
        this._type.push('areaInstance');
        this._areaId = areaId;
        this._pageId = pageId;
    };
    
    inheritPrototype(areaInstance, typedObject);
    
    areaInstance.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'areaId':
            case 'pageId':
            case 'area':
            case 'top':
            case 'left':
            case 'floorPolygon': //path object
                this['_' + property] = value;
                break;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    /*areaInstance.prototype.initializeCollectionProperty = function(property) {
        switch(property) {
            case 'floorPolygon':
                this['_' + property] = [];
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };*/
    
    areaInstance.prototype.load = function() {
        var areaId = this.getProperty('areaId');
        var pageId = this.getProperty('pageId');
        
        var areaInstances = state.APIAreaMapper.areaInstances;
        var areaInstanceState;
        areaInstances.forEach(function(a) {
            if(a[0][1] === areaId
                && a[1][1] === pageId) {
                    areaInstanceState = a;
                    return;
            }
            
            if(areaInstanceState) {
                return;
            }
        });
        
        //couldn't find any state to load:
        if(!areaInstanceState) {
            return;
        }
        
        for(var i = 0; i < areaInstanceState.length; i++) {
            switch(areaInstanceState[i][0]) {
                case 'areaId':
                case 'pageId':
                case 'top':
                case 'left':
                    this.setProperty(areaInstanceState[i][0], areaInstanceState[i][1]);
                    break;
                case 'floorPolygonId':
                    if(areaInstanceState[i][1].length > 0) {
                        var floorPolygon = getObj('path', areaInstanceState[i][1]);
                        if(floorPolygon) {
                            this.setProperty('floorPolygon', floorPolygon);
                        } else {
                            log('Could not find floorPolygon matching ID "' + areaInstanceState[i][1] + '" in areaInstance.load().');
                        }
                    }
                    
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
        areaInstanceState.push(['floorPolygonId', this.getProperty('floorPolygon') ? this.getProperty('floorPolygon').id : '']);
        
        //remove existing area instance state:
        var areaInstances = state.APIAreaMapper.areaInstances;
        var oldAreaInstanceState;
        for(var i = 0; i < areaInstances.length; i++) {
            //note: expects areaId and pageId to be the first and second properties:
            if(areaInstances[i][0] === this.getProperty('areaId')
                    && areaInstances[i][1] === this.getProperty('pageId')) {
                oldAreaInstanceState = state.APIAreaMapper.areaInstances.splice(i);        
            }
   
            if(oldAreaInstanceState) {
                break;
            }
        }
        
        //save the updated area instance state:
        state.APIAreaMapper.areaInstances.push(areaInstanceState);
    };
    
    areaInstance.prototype.draw = function(top, left) {
        this.load();
        
        this.setProperty('top', top);
        this.setProperty('left', left);
        
        //remove existing floorPolygon:
        var oldFloorPolygon = this.getProperty('floorPolygon');
        if(oldFloorPolygon) {
            oldFloorPolygon.remove();
        }
        
        //get the floorPlan from the area:
        var a = new area();
        a.setProperty('id', this.getProperty('areaId'));
        a.load();
        
        //create new floorPolygon on map layer:
        var floorPolygon = drawPathObject(this.getProperty('pageId'), 'map', '#0000ff', a.getProperty('floorPlan'), top, left);
        
        this.setProperty('floorPolygon', floorPolygon);
        this.save();
    };
    
    areaInstance.prototype.alter = function(pageid, relativeRotation, relativeScaleX, relativeScaleY, relativePositionX, relativePositionY) {
        //TODO: alter an area instance and everything contained within it
    };
    
    /* area - end */
    
    /* polygon logic - begin */
    
    //TODO: move functionality to prototype and set up for polymorphism:
    var graph = function() {
        
        var points = [], //array of [point, [segment index]]
            segments = [], //array of segment
        
        point = function(x, y) {
            this.x = x;
            this.y = y;
            
            this.equals = function(comparedPoint) {
                return (x === comparedPoint.x && y === comparedPoint.y);
            };
        },
        
        //angle object to simplify comparisons with epsilons:
        angle = function(radians) {
            this.radians = radians;
            
            this.equals = function(comparedRadians) {
                return Math.round(radians * 10000) == Math.round(comparedRadians * 10000);
            };
            
            this.greaterThan = function(comparedRadians) {
                return Math.round(radians * 10000) > Math.round(comparedRadians * 10000);
            };
            
            this.subtract = function(subtractedRadians) {
                return new angle(((radians - subtractedRadians) + (2 * Math.PI) + 0.000001) % (2 * Math.PI));
            };
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
                var radians = (Math.atan2(b.y - a.y, b.x - a.x) + (2 * Math.PI)) % (2 * Math.PI);
                
                if(b.x === p.x && b.y === p.y) {
                    //use angle with respect to b:
                    radians = (radians + (Math.PI)) % (2 * Math.PI);
                }
                
                return new angle(radians);
            };
        },
        
        //TODO: make get segment index and ditch this method
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
        
        getPointIndex = function(point) {
            for(var i = 0; i < points.length; i++) {
                if(point.equals(points[i][0])) {
                    return i;
                }
            }
            
            return;
        },
        
        addPoint = function(point) {
            var index = getPointIndex(point);
            
            if('undefined' === typeof(index)) {
                //add point and return its index:
                return points.push([point, []]) - 1;
            }
            
            return index;
        },
        
        //it's illogical to return a segment's index, because it might have been broken into pieces:
        //it's also inconvient to do early detection of the segment being new, because of segment breaking:
        //returns whether or not there were intersections, because this is useful information for certain algorithms:
        addSegment = function(s) {
            
            //don't add the segment if it's of 0 length:
            if(s.a.equals(s.b)) {
                return;
            }
            
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
            
            var hadIntersections = false;
            
            //add old broken segments:
            brokenSegments.forEach(function(seg) {
                if(!seg.a.equals(seg.b)) {
                    hadIntersections = true;
                    var iS = segments.push(seg) - 1;
                    var iPa = addPoint(seg.a);
                    var iPb = addPoint(seg.b);
                    points[iPa][1].push(iS);
                    points[iPb][1].push(iS);
                }
            });
            
            //add new segments:
            newSegments.forEach(function(seg) {
                if(!seg.a.equals(seg.b)) {
                    var iS = segments.push(seg) - 1;
                    var iPa = addPoint(seg.a);
                    var iPb = addPoint(seg.b);
                    points[iPa][1].push(iS);
                    points[iPb][1].push(iS);
                }
            });
            
            //create a return object with specific fields, so that the return values aren't misconstrued to be something more intuitive:
            var returnObject = [];
            returnObject.hadIntersections = hadIntersections;
            return returnObject;
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
            
            //remove segment from segments:
            segments.splice(iS, 1);
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
        
        addPath = function(path, relativeTop, relativeLeft) {
            if('undefined' === typeof(relativeTop)) {
                relativeTop = 0;
            }
            
            if('undefined' === typeof(relativeLeft)) {
                relativeLeft = 0;
            }
            
            var hadIntersections = false;
            
            path = JSON.parse(path);
            
            if(path && path.length > 1) {
                
                var pStart, //start point
                    pPrior, //prior point
                    iPrior; //index of prior point
                    
                path.forEach(function(pCurrentRaw) {
                    var pCurrent = new point(pCurrentRaw[1] - relativeLeft, pCurrentRaw[2] - relativeTop); //current point
                    var iCurrent = addPoint(pCurrent); //index of current point
                    
                    if(pPrior) {
                        var result = addSegment(new segment(pPrior, pCurrent));
                        
                        if(result && result.hadIntersections) {
                            hadIntersections = true;
                        }
                    } else {
                        pStart = pCurrent;
                    }
                    
                    pPrior = pCurrent;
                    iPrior = iCurrent;
                });
                
                //close the polygon if it isn't closed already:
                if(!pPrior.equals(pStart)) {
                    addSegment(new segment(pPrior, pStart));
                }
            }
            
            /*
            If prior to calling this method, only a clean polygon was stored, and then another clean polygon
            is added, whether or not there were intersections reveals something about the interrelation of 
            the two polygons that is useful for some algorithms. If two clean polygons don't intersect, then
            either they are siblings, or one is completely contained within the other. This is detected in
            this method because it would lead to redundant processing to do it elsewhere.
            */
            var returnObject = [];
            returnObject.hadIntersections = hadIntersections;
            return returnObject;
        },
        
        /*//draws a segment (for debugging):
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
            
            state.APIAreaMapper.tempIgnoreAddPath = true;
            createObj('path', {
                layer: 'objects',
                pageid: Campaign().get('playerpageid'),
                top: top,
                left: left,
                stroke: color,
                stroke_width: 3,
                _path: path
            });
            state.APIAreaMapper.tempIgnoreAddPath = false;
        },*/
        
        /*//draws individual segments (for debugging):
        drawSegments = function() {
            segments.forEach(function(s) {
                drawSegment(s, '#0000ff');
            });
        },*/
        
        getCleanPolygon = function() {
            //find the smallest x points, and of those, take the greatest y:
            var iTopLeftPoint = 0;
            var originalWidth = 0;
            var originalHeight = 0;
            for(var i = 0; i < points.length; i++) {
                if((points[i][0].x < points[iTopLeftPoint][0].x)
                        || (points[i][0].x == points[iTopLeftPoint][0].x && points[i][0].y > points[iTopLeftPoint][0].y)) {
                    iTopLeftPoint = i;
                }
                
                originalWidth = Math.max(originalWidth, points[i][0].x);
                originalHeight = Math.max(originalHeight, points[i][0].y);
            }
            
            //start keeping the points that will be used in the output polygon:
            var cleanPolygonPoints = [];
            cleanPolygonPoints.push(points[iTopLeftPoint][0]);
            var minX = points[iTopLeftPoint][0].x;
            var minY = points[iTopLeftPoint][0].y;
            
            var iP = iTopLeftPoint; //index of current point
            var a = new angle(Math.PI / 2); //angle of prior segment; for first pass, initialize to facing up
            
            var loopLimit = 10000; //limit the loop iterations in case there's a bug or the equality clause ends up needing an epsilon
            var firstIteration = true;
            
            //loop until the outside of the polygon has been traced:
            while((loopLimit-- > 0) && !(!firstIteration && iP === iTopLeftPoint)) {
                
                firstIteration = false;
                
                //find the longest segment originating from the current point that is the most counter-clockwise from the prior segment's angle:
                var s = 0;
                var chosenSegment = segments[points[iP][1][s]];
                var sAngle = chosenSegment.angle(points[iP][0]);
                var sLength = chosenSegment.length();
                var sRelativeAngle = sAngle.subtract(a.radians);
            
                //loop through the segments of this point:
                for(var iS = 1; iS < points[iP][1].length; iS++) {
                    var seg = segments[points[iP][1][iS]];
                    var segAngle = seg.angle(points[iP][0]);
                    var relativeAngle = segAngle.subtract(a.radians);
                    
                    if((relativeAngle.greaterThan(sRelativeAngle.radians))
                            || (relativeAngle.equals(sRelativeAngle.radians) && seg.length() > sLength)) {
                        s = iS;
                        chosenSegment = segments[points[iP][1][s]];
                        sAngle = chosenSegment.angle(points[iP][0]);
                        sLength = chosenSegment.length();
                        sRelativeAngle = relativeAngle;
                    }
                }
                
                //the next point should be the endpoint of the segment that wasn't the prior point:
                if(chosenSegment.a.equals(points[iP][0])) {
                    iP = getPointIndex(chosenSegment.b);
                } else {
                    iP = getPointIndex(chosenSegment.a);
                }
                
                //the angle of the current segment will be used as a limit for finding the next segment:
                a = new angle((sAngle.radians + Math.PI) % (2 * Math.PI));
                
                //add the new point to the clean polygon:
                cleanPolygonPoints.push(points[iP][0]);
                minX = Math.min(minX, points[iP][0].x);
                minY = Math.min(minY, points[iP][0].y);
            }
           
            //build the clean polygon path and make it originating from (0,0):
            var firstCleanPoint = cleanPolygonPoints.shift();
            var cleanPath = '[[\"M\",' + (firstCleanPoint.x - minX) + ',' + (firstCleanPoint.y - minY) + ']';
            cleanPolygonPoints.forEach(function(p) {
                cleanPath += ',[\"L\",' + (p.x - minX) + ',' + (p.y - minY) + ']';
            });
            cleanPath += ']';
            
            //stuff everything into a return object:
            var returnObject = [];
            returnObject['path'] = cleanPath;
            returnObject['originalWidth'] = originalWidth;
            returnObject['originalHeight'] = originalHeight;
            
            return returnObject;
        },
        
        //this assumes that the currently stored information represents a clean polygon and tests if the point is inside it:
        isInCleanPolygon = function(x, y) {
            //use an arbitrarily long horizontal segment that goes into negatives (because of relative coordinates):
            var horizontalSegment = new segment(new point(-1000000000, y), new point(1000000000, y));
            
            //count the intersecting points that appear to the left of the point in question:
            var pointsOnLeft = 0;
            
            //find segments that intersect the point horizontally:
            segments.forEach(function(s) {
                var intersectingPoint = segmentsIntersect(horizontalSegment, s);
                if(intersectingPoint && intersectingPoint.x < x) {
                    pointsOnLeft++;
                }
            });
            
            //there will be an even number of intersections; if the point in question is between an odd number of intersections, it's inside the polygon:
            return (pointsOnLeft % 2 === 1);
        };
        
        return {
            points: points,
            segments: segments,
            addPath: addPath,
            //drawSegments: drawSegments,
            getCleanPolygon: getCleanPolygon,
            isInCleanPolygon: isInCleanPolygon
        };
    },
    
    /* polygon logic - end */
    
    /* roll20 object management - begin */
    
    drawPathObject = function(pageid, layer, stroke, path, top, left) {
        state.APIAreaMapper.tempIgnoreAddPath = true;
        
        var obj = createObj('path', {
            layer: layer,
            pageid: pageid,
            top: top,
            left: left,
            stroke: stroke,
            stroke_width: 1,
            _path: path
        });
        
        state.APIAreaMapper.tempIgnoreAddPath = false;
        
        return obj;
    },
    
    /* roll20 object management - end */
    
    /* user interface - begin */
    
    displayInterface = function(who, text) {
        //if(state.APIRoomManagement.uiPreference === 0) {
            sendChat('Area API', '/w ' + who.split(' ')[0] + ' ' + text); 
        /*} else {
            var handout = findObjs({                              
                _type: 'handout',
                name: 'API-RoomManagement'
            }, {caseInsensitive: true});
        
            if(handout && handout.length > 0) {
                handout = handout[0];
            } else {
                handout = createObj('handout', {
                    name: 'API-RoomManagement',
                    avatar: 'https://s3.amazonaws.com/files.d20.io/images/7360175/t-Y2NgxamazYSIkbaXQjJg/thumb.jpg?1422294416'
                });
            }
            
            handout.set('notes', text);
        }*/
    },
    
    formatInterface = function(who, header, body, nextSteps) {
        var rightPadding = '0px';
        
        /*if(state.APIAreaMapper.uiPreference === 1) {
            rightPadding = '14px';
        }*/
            
        var text =
            '<span style="border: 1px solid black;width: 100%;display:inline-block;background-color:'+mainBackgroundColor+';padding-right:'+rightPadding+';">'
                +'<span style="border: 1px solid black;display:inline-block;width: 100%;font-weight: bold;border-bottom: 1px solid black;background-color:'+headerBackgroundColor+';font-size: 115%;padding-right:'+rightPadding+';">'
                    +'<span style="padding-left:3px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;">'
                        +header
                    +'</span>'
                +'</span>'
                +'<span style="border: 1px solid black;display:inline-block;width: 100%;background-color:'+mainBackgroundColor+';padding-right:'+rightPadding+';">'
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
                +'</span>'
            +'</span>';
        
        displayInterface(who, text);
    },
    
    sendNotification = function(to, message) {
        formatInterface(to.split(' ')[0],
            'Area API - Notification',
            '<span style="text-align:center;padding-left:3px;display:inline-block;width: 100%;margin-top:3px;margin-bottom:3px;">'
                +'<span style="padding-left:13px;padding-top:13px;padding-right:13px;display:inline-block;background-color:'+notificationBackgroundColor+';margin-top:13px;margin-left:13px;margin-right:13px;margin-bottom:3px;">'
                    +'<p>'+message+'</p>'
                +'</span>'
            +'</span>'/*,
            
            commandLinks('standard',[['run script',''],['help','help']])*/
        );
    },
    
    sendStandardInterface = function(to, header, body, nextSteps) {
        formatInterface(to, header,
            '<div style="padding-left:10px;margin-bottom:3px;">'
                +body
            +'</div>',
            nextSteps);
    },
    
    //constructs a clickable command:
    commandLink = function(text, command, highlight) {
        //hightlight defaults to false
        
        //if(state.APIRoomManagement.uiPreference === 0) {
            if(highlight) {
                //TODO: pad around this:
                return '<span style="border: 1px solid white;display:inline-block;background-color: ' + buttonHighlightColor + ';padding: 3px 3px;"> <a href="!api-area ' + command + '">' + text + '</a> </span> ';
            } else {
                return '[' + text + '](!api-area ' + command + ') ';
            }
        //} else {
        //    return '<span style="border: 1px solid white;display:inline-block;background-color: ' + buttonBackgroundColor + ';padding: 5px 5px;"> <a href="!api-area ' + command + '">' + text + '</a> </span> ';
        //}
    },
    
    //constructs clickable commands:
    commandLinks = function(header, commands) {
        var html = '<p><b>' + header + '</b><br/>';
        
        for(var i = 0;i<commands.length;i++) {
            html += commandLink(commands[i][0], commands[i][1], commands[i].length > 2 ? commands[i][2] : false);
        }
        
        return html + '</p>';
    },
    
    interfaceAreaDrawingOptions = function(to) {
        sendStandardInterface(to, 'Area Mapper',
            commandLinks('Area Drawing', [
                ['create new area', 'areaCreate', (state.APIAreaMapper.recordAreaMode == 'areaCreate')],
                ['add to area', 'areaAppend', (state.APIAreaMapper.recordAreaMode == 'areaAppend')],
                ['remove from area', 'areaRemove', (state.APIAreaMapper.recordAreaMode == 'areaRemove')]
            ])
        );
    },
    
    toggleOrSetAreaRecordMode = function(mode) {
        if(state.APIAreaMapper.recordAreaMode == mode) {
            state.APIAreaMapper.recordAreaMode = false;
        } else {
            state.APIAreaMapper.recordAreaMode = mode;
        }
    },
    
    /* user interface - end */
    
    /* event handlers - begin */
    
    handleUserInput = function(msg) {
        if(msg.type == 'api' && msg.content.match(/^!api-area/) && playerIsGM(msg.playerid)) {
            var chatCommand = msg.content.split(' ');
            if(chatCommand.length == 1) {
                //transfer control to intuitive UI layer:
                //intuit(msg.selected, msg.who);
                interfaceAreaDrawingOptions(msg.who);
            } else {
                switch(chatCommand[1]) {
                    case 'areaCreate':
                    case 'areaAppend':
                    case 'areaRemove':
                        toggleOrSetAreaRecordMode(chatCommand[1]);
                        break;
                    default:
                        break;
                }
            }
        }
    },
    
    handlePathAdd = function(path) {
        if(!state.APIAreaMapper.tempIgnoreAddPath) {
            if(state.APIAreaMapper.recordAreaMode) {
                switch(state.APIAreaMapper.recordAreaMode) {
                    case 'areaCreate':
                        var g = new graph();
                        g.addPath(path.get('_path'));
                        var cp = g.getCleanPolygon();
                        
                        var a = new area();
                        a.create(cp.path, path.get('_pageid'), path.get('top') - (cp.originalHeight / 2), path.get('left') - (cp.originalWidth / 2));
                        
                        state.APIAreaMapper.activeArea = a.getProperty('id');
                       
                        path.remove();
                        
                        state.APIAreaMapper.recordAreaMode = 'areaAppend';
                        break;
                    case 'areaAppend':
                        if(!state.APIAreaMapper.activeArea) {
                            log('An area needs to be active before appending.');
                            return;
                        }
                        
                        var g = new graph();
                        g.addPath(path.get('_path'));
                        var cp = g.getCleanPolygon();
                        
                        var areaId = state.APIAreaMapper.areas[0][0][1];
                       
                        var a = new area();
                        a.setProperty('id', state.APIAreaMapper.activeArea);
                        a.load();
                        
                        a.floorPlanAppend(cp.path, path.get('_pageid'), path.get('top') - (cp.originalHeight / 2), path.get('left') - (cp.originalWidth / 2));
                        
                        path.remove();
                        break;
                    case 'areaRemove':
                        break;
                    default:
                        break;
                }
            }
        }
    },
    
    /* event handlers - end */
    
    /* nuts and bolts - begin */
    
    registerEventHandlers = function() {
        on('chat:message', handleUserInput);
        on('add:path', handlePathAdd);
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
