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
    
    area.prototype.create = function(rawPath, pageId, top, left, isFromEvent) {
        var g = new graph();
        g.initialize();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var op = g.convertComplexPolygonToOutlinePolygon(0);
        var rp = g.getRawPath('outlinePolygons', op);
        this.setProperty('id', Math.random());
        this.setProperty('floorPlan', rp.rawPath);
        this.save();
        this.draw(pageId, rp.top, rp.left);
    };
    
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
    
    //alters the area's floorPlan using an area instance as a control:
    area.prototype.floorPlanAppend = function(rawPath, pageId, top, left, isFromEvent) {
        //get an outline polygon from the rawPath:
        var g = new graph();
        g.initialize();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var appendOpIndex = g.convertComplexPolygonToOutlinePolygon(0);
        
        //get instance that appending is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.load();
        
        //TODO: factor in instance's rotation & scale:
        var floorPlanOpIndex = g.addOutlinePolygon(this.getProperty('floorPlan'), instance.getProperty('top'), instance.getProperty('left'));
        var mergedOpIndex = g.mergeOutlinePolygons(floorPlanOpIndex, appendOpIndex);
        
        //if the polygons intersect, or if the old one is engulfed in the new one, update the floorPlan:
        if(mergedOpIndex !== null) {
            var rp = g.getRawPath('outlinePolygons', mergedOpIndex);
            this.setProperty('floorPlan', rp.rawPath);
            this.save();
            this.draw(pageId, rp.top, rp.left);
        }
    };
    
    area.prototype.floorPlanRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var g = new graph();
        g.initialize();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeOpIndex = g.convertComplexPolygonToOutlinePolygon(0);
        
        //get instance that appending is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.load();
        
        //TODO: factor in instance's rotation & scale:
        var floorPlanOpIndex = g.addOutlinePolygon(this.getProperty('floorPlan'), instance.getProperty('top'), instance.getProperty('left'));
        var mergedOpIndex = g.removeFromOutlinePolygon(floorPlanOpIndex, removeOpIndex);
        
        if('undefined' !== typeof(mergedOpIndex)) {
            var rp = g.getRawPath('outlinePolygons', mergedOpIndex);
            this.setProperty('floorPlan', rp.rawPath);
            this.save();
            this.draw(pageId, rp.top, rp.left);
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
            if(a[0][1] === areaId && a[1][1] === pageId) {
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
                oldAreaInstanceState = state.APIAreaMapper.areaInstances.splice(i, 1);        
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
    
    /*
    Points, segments, and angles are kept as simple, non-polymorphic datatypes for efficiency purposes.
    */
    
    var point = function(x, y) {
        this.x = x;
        this.y = y;
        
        this.equals = function(comparedPoint) {
            return (this.x === comparedPoint.x && this.y === comparedPoint.y);
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
  
  
    polygon = function() {
        typedObject.call(this);
        this._type.push('polygon');
        this.points = []; //don't use getter/setter mechanism for the purpose of efficiency
        this.segments = []; //don't use getter/setter mechanism for the purpose of efficiency
    };
    
    inheritPrototype(polygon, typedObject);
    
    polygon.prototype.getPointIndex = function(p) {
        for(var i = 0; i < this.points.length; i++) {
            if(p.equals(this.points[i][0])) {
                return i;
            }
        }
        
        return;
    };
    
    //TODO: make get segment index and ditch this method
    //find item in container; if position is defined, it represents the index in a nested array:
    polygon.prototype.getItemIndex = function(container, item, position) {
        var index;
        
        for(var i = 0; i < container.length; i++) {
            if(item === (((container.length > 0) && ('undefined' !== typeof(position))) ? container[i][position] : container[i])) {
                index = i;
                break;
            }
        }
        
        return index;
    };
    
    polygon.prototype.addPoint = function(p) {
        var index = this.getPointIndex(p);
        
        if('undefined' === typeof(index)) {
            //add point and return its index:
            return this.points.push([p, []]) - 1;
        }
        
        return index;
    };
    
    polygon.prototype.removeSegment = function(s) {
        var iS = this.getItemIndex(this.segments, s);
            
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
    
    polygon.prototype.convertRawPathToPath = function(rawPath, top, left, isFromEvent) {
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
    
    polygon.prototype.addRawPath = function(rawPath, top, left, isFromEvent) {
        var pathPoints = this.convertRawPathToPath(rawPath, top, left, isFromEvent);
        return this.addPointsPath(pathPoints);
    };
    
    polygon.prototype.addPointsPath = function(pathPoints) {
        var hadIntersections = false;
        
        if(pathPoints && pathPoints.length > 1) {
            
            var pStart, //start point
                pPrior, //prior point
                iPrior; //index of prior point
                
            pathPoints.forEach(function(pCurrent) {
                var iCurrent = this.addPoint(pCurrent); //index of current point
                
                if(pPrior) {
                    var result = this.addSegment(new segment(pPrior, pCurrent));
                    
                    if(result && result.hadIntersections) {
                        hadIntersections = true;
                    }
                } else {
                    pStart = pCurrent;
                }
                
                pPrior = pCurrent;
                iPrior = iCurrent;
            }, this);
            
            //close the polygon if it isn't closed already:
            if(!pPrior.equals(pStart)) {
                this.addSegment(new segment(pPrior, pStart));
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
    };
    
    
    var complexPolygon = function() {
        polygon.call(this);
        this._type.push('complexPolygon');
    };
    
    inheritPrototype(complexPolygon, polygon);
    
    /*complexPolygon.prototype.setProperty = function(property, value) {
        switch(property) {
            default:
                polygon.prototype.setProperty.call(this, property, value);
                break;
        }
    };*/
    
    //it's illogical to return a segment's index, because it might have been broken into pieces:
    //it's also inconvient to do early detection of the segment being new, because of segment breaking:
    //returns whether or not there were intersections, because this is useful information for certain algorithms:
    complexPolygon.prototype.addSegment = function(s) {

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
    
    complexPolygon.prototype.convertToOutlinePolygon = function() {
        //find the smallest x points, and of those, take the greatest y:
        var iTopLeftPoint = 0;
        for(var i = 0; i < this.points.length; i++) {
            if((this.points[i][0].x < this.points[iTopLeftPoint][0].x)
                    || (this.points[i][0].x == this.points[iTopLeftPoint][0].x && this.points[i][0].y > this.points[iTopLeftPoint][0].y)) {
                iTopLeftPoint = i;
            }
        }
        
        //start keeping the points that will be used in the output polygon in the proper order:
        var cleanPolygonPoints = [];
        cleanPolygonPoints.push(this.points[iTopLeftPoint][0]);
        
        var iP = iTopLeftPoint; //index of current point
        var a = new angle(Math.PI / 2); //angle of prior segment; for first pass, initialize to facing up
        
        var loopLimit = 10000; //limit the loop iterations in case there's a bug or the equality clause ends up needing an epsilon
        var firstIteration = true;
        
        //loop until the outside of the polygon has been traced:
        while((loopLimit-- > 0) && !(!firstIteration && iP === iTopLeftPoint)) {
            
            firstIteration = false;
            
            //find the longest segment originating from the current point that is the most counter-clockwise from the prior segment's angle:
            var s = 0;
            var chosenSegment = this.segments[this.points[iP][1][s]];
            var sAngle = chosenSegment.angle(this.points[iP][0]);
            var sLength = chosenSegment.length();
            var sRelativeAngle = sAngle.subtract(a.radians);
        
            //loop through the segments of this point:
            for(var iS = 1; iS < this.points[iP][1].length; iS++) {
                var seg = this.segments[this.points[iP][1][iS]];
                var segAngle = seg.angle(this.points[iP][0]);
                var relativeAngle = segAngle.subtract(a.radians);
                
                if((relativeAngle.greaterThan(sRelativeAngle.radians))
                        || (relativeAngle.equals(sRelativeAngle.radians) && seg.length() > sLength)) {
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
        
        //create an outlinePolygon with the points:
        var op = new outlinePolygon();
        op.addPointsPath(cleanPolygonPoints);
        return op;
    };
    
    
    var outlinePolygon = function() {
        polygon.call(this);
        this._type.push('outlinePolygon');
    };
    
    inheritPrototype(outlinePolygon, polygon);
    
    /*outlinePolygon.prototype.setProperty = function(property, value) {
        switch(property) {
            default:
                polygon.prototype.setProperty.call(this, property, value);
                break;
        }
    };*/
    
    //doesn't test for intersections - assumes this is already part of an outline on good faith:
    outlinePolygon.prototype.addSegment = function(s) {
        if(!s.a.equals(s.b)) {
            var iS = this.segments.push(s) - 1;
            var iPa = this.addPoint(s.a);
            var iPb = this.addPoint(s.b);
            this.points[iPa][1].push(iS);
            this.points[iPb][1].push(iS);
        }
    };
  
    //tests if the point is inside the polygon:
    outlinePolygon.prototype.hasInside = function(p) {
        //use an arbitrarily long horizontal segment that goes into negatives (because of relative coordinates):
        var horizontalSegment = new segment(new point(-1000000000, p.y), new point(1000000000, p.y));
        
        //count the intersecting points that appear to the left of the point in question:
        var pointsOnLeft = 0;
        
        //find segments that intersect the point horizontally:
        this.segments.forEach(function(s) {
            var intersectingPoint = segmentsIntersect(horizontalSegment, s);
            if(intersectingPoint && intersectingPoint.x < p.x) {
                pointsOnLeft++;
            }
        }, this);
        
        //there will be an even number of intersections; if the point in question is between an odd number of intersections, it's inside the polygon:
        return (pointsOnLeft % 2 === 1);
    };
    
    outlinePolygon.prototype.getPointsPath = function() {
        var pointsPath = [];
        this.points.forEach(function(p) {
            pointsPath.push(p[0]);
        }, this);
        return pointsPath;
    };
    
    //returns a raw path aligned at (0,0) with top/left offsets:
    outlinePolygon.prototype.getRawPath = function() {
        if(!(this.points && this.points.length > 0)) {
            return;
        }
        
        //var pointsCopy = this.points;
        var minX = this.points[0][0].x;
        var minY = this.points[0][0].y;
        
        this.points.forEach(function(p) {
            minX = Math.min(minX, p[0].x);
            minY = Math.min(minY, p[0].y);
        }, this);
        
        var rawPath = '[[\"M\",' + (this.points[0][0].x - minX) + ',' + (this.points[0][0].y - minY) + ']';
        for(var i = 1; i < this.points.length; i++) {
            rawPath += ',[\"L\",' + (this.points[i][0].x - minX) + ',' + (this.points[i][0].y - minY) + ']';
        }
        rawPath += ',[\"L\",' + (this.points[0][0].x - minX) + ',' + (this.points[0][0].y - minY) + ']';
        rawPath += ']';
        
        var returnObject = [];
        returnObject.rawPath = rawPath;
        returnObject.top = minY;
        returnObject.left = minX;
        return returnObject;
    };
    
    //removes intersection with rop (Removed Outline Polygon):
    outlinePolygon.prototype.removeIntersection = function(rop) {
        
        //points will be converted into a datatype that is better for this algorithm:
        var testedPoints = [];
        
        //TODO: fix bug where rop.hasInside() is failing (rarely) when it should succeed:
        //test all points to see which are contained in rop:
        this.points.forEach(function(p) {
            testedPoints.push([p[0], rop.hasInside(p[0])]);
        }, this);
        
        //find a control point (the first point that's not contained in rop):
        var controlPointIndex = null;
        for(var i = 0; i < testedPoints.length; i++) {
            if(!testedPoints[i][1]) {
                controlPointIndex = i;
                break;
            }
        }
        
        //if no control point was found, the whole polygon should be removed:
        if(controlPointIndex === null) {
            return;
        } 
        
        var loopLimit = 5000; //loop limiter to prevent infinite loops during debugging
        var i = (controlPointIndex + 1) % testedPoints.length;
        var firstIteration = true;
        var priorTest = false;
        
        while(loopLimit-- && !(!firstIteration && i === (controlPointIndex + 1) % testedPoints.length)) {
            firstIteration = false;
            var thisTest = testedPoints[i][1];
            
            //if the prior point's test !== this point's test, then their segment intersects a segment in rop:
            if(thisTest !== priorTest) {
                
                //find intersection points:
                var s = new segment(testedPoints[i][0], testedPoints[(i + testedPoints.length - 1) % testedPoints.length][0]);
                var intersectionPoints = [];
                rop.segments.forEach(function(seg) {
                    var intersectionPoint = segmentsIntersect(s, seg);
                    if(intersectionPoint) {
                        intersectionPoints.push(intersectionPoint);
                    }
                }, this);
                
                if(intersectionPoints.length == 0) {
                    
                    //avoid the 'rop.hasInside()' failure bug (which is pretty rare) by hacking this point back in:
                    testedPoints.splice(i, 0, [testedPoints[i][0], null]);
                } else {
                    
                    //find the most invasive intersection point:
                    var intersectionPoint;
                    var intersectionPointDistance = 1000000000; //this will be corrected in the first iteration
                    var pointNotContained = thisTest ? s.b : s.a;
                    intersectionPoints.forEach(function(p) {
                        var distance = new segment(pointNotContained, p).length();
                        if(distance < intersectionPointDistance) {
                            intersectionPoint = p;
                            intersectionPointDistance = distance;
                        }
                    }, this);
                    
                    //insert the intersection point inbetween the two points:
                    testedPoints.splice(i, 0, [intersectionPoint, null]);
                }
                
                //increment indexes because we added a point:
                if(i <= controlPointIndex) {
                    controlPointIndex++;
                }
                i++;
            }
            
            i = (i + 1) % testedPoints.length;
            priorTest = thisTest;
        }
        
        //loop through again and remove any contained points:
        for(var i = testedPoints.length - 1; i >= 0; i--) {
            if(testedPoints[i][1]) {
                testedPoints.splice(i, 1);
            }
        }
        
        //stuff the results into an outlinePolygon:
        var pointsPath = [];
        testedPoints.forEach(function(p) {
            pointsPath.push(p[0]);
        }, this);
        
        var newOp = new outlinePolygon();
        newOp.addPointsPath(pointsPath);
        return newOp;
    };
    
    
    var graph = function() {
        typedObject.call(this);
        this._type.push('graph');
    };
    
    inheritPrototype(graph, typedObject);
    
    graph.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'complexPolygons':
            case 'outlinePolygons':
                return this['_' + property].push(value) - 1;
                break;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    graph.prototype.initializeCollectionProperty = function(property) {
        switch(property) {
            case 'complexPolygons':
            case 'outlinePolygons':
                this['_' + property] = [];
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
    graph.prototype.initialize = function() {
        this.initializeCollectionProperty('complexPolygons');
        this.initializeCollectionProperty('outlinePolygons');
    };
    
    graph.prototype.addComplexPolygon = function(rawPath, top, left, isFromEvent) {
        var cp = new complexPolygon();
        cp.addRawPath(rawPath, top, left, isFromEvent);
        return this.setProperty('complexPolygons', cp);
    };
    
    graph.prototype.addOutlinePolygon = function(rawPath, top, left) {
        var op = new outlinePolygon();
        op.addRawPath(rawPath, top, left);
        return this.setProperty('outlinePolygons', op);
    };
    
    graph.prototype.convertComplexPolygonToOutlinePolygon = function(index) {
        var op = this.getProperty('complexPolygons')[index].convertToOutlinePolygon();
        this.getProperty('complexPolygons').splice(index, 1);
        return this.setProperty('outlinePolygons', op);
    };
    
    graph.prototype.getRawPath = function(pathType, index) {
        return this.getProperty(pathType)[index].getRawPath();
    };
    
    graph.prototype.mergeOutlinePolygons = function(index1, index2) {
        var cp = new complexPolygon();
        var op1 = this.getProperty('outlinePolygons')[index1];
        
        //stuff points from op1 into cp, rather than re-inserting, for the sake of efficiency:
        cp.points = op1.points;
        cp.segments = op1.segments;
        
        var op2 = this.getProperty('outlinePolygons')[index2];
        var cpResult = cp.addPointsPath(op2.getPointsPath());
        
        //polygons intersect, so return their merge:
        if(cpResult.hadIntersections) {
            var cpIndex = this.setProperty('complexPolygons', cp);
            return this.convertComplexPolygonToOutlinePolygon(cpIndex);
        } 
        //polygon 2 is fully contained within polygon 1, so return polygon 1:
        else if(op1.hasInside(op2.points[0][0])) {
            return index1;
        }
        //polygon 1 is fully contained within polygon 2, so return polygon 2:
        else if(op2.hasInside(op1.points[0][0])) {
            return index2;
        }
        //the polygons are siblings, so merging cannot be done:
        else {
            return null;
        }
    };
    
    //removes the intersection between the two polygons from the first:
    graph.prototype.removeFromOutlinePolygon = function(index1, index2) {
        var cp = new complexPolygon();
        var op1 = this.getProperty('outlinePolygons')[index1];
        var op2 = this.getProperty('outlinePolygons')[index2];
        var op3 = op1.removeIntersection(op2);
        
        if(!op3) {
            return;
        } 
        
        return this.setProperty('outlinePolygons', op3);
    };
     
    /* polygon logic - end */
    
    /* roll20 object management - begin */
    
    var drawPathObject = function(pageid, layer, stroke, path, top, left) {
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
                        var a = new area();
                        a.create(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                        state.APIAreaMapper.activeArea = a.getProperty('id');
                       
                        path.remove();
                        
                        state.APIAreaMapper.recordAreaMode = 'areaAppend';
                        break;
                    case 'areaAppend':
                        if(!state.APIAreaMapper.activeArea) {
                            log('An area needs to be active before appending.');
                            return;
                        }
                        
                        var a = new area();
                        a.setProperty('id', state.APIAreaMapper.activeArea);
                        a.load();
                        a.floorPlanAppend(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    
                        path.remove();
                        break;
                    case 'areaRemove':
                        if(!state.APIAreaMapper.activeArea) {
                            log('An area needs to be active before appending.');
                            return;
                        }
                        
                        var a = new area();
                        a.setProperty('id', state.APIAreaMapper.activeArea);
                        a.load();
                        a.floorPlanRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                 
                        path.remove();
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
