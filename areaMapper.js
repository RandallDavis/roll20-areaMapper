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
    
    graph = function() {
        
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
            
            if(!index) {
                //add point and return its index:
                return points.push([point, []]) - 1;
            }
            
            return index;
        },
        
        addSegment = function(segment) {
            var iS = getItemIndex(segments, segment);
            
            if(!iS) {
                iS = segments.push(segment) - 1;
            }
            
            //assume that points already exist:
            var iPa = getItemIndex(points, segment.a, 0);
            var iPb = getItemIndex(points, segment.b, 0);
            
            points[iPa][1].push(iS);
            points[iPb][1].push(iS);
        },
        
        removeSegment = function(segment) {
            var iS = getItemIndex(segments, segment);
            
            //remove segment from points:
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
            segments.splice(iS, 1)
        },
        
        //this is a modified version of https://gist.github.com/Joncom/e8e8d18ebe7fe55c3894
        segmentsIntersect = function(s1, s2) {
            //TODO: it "might" be more efficient to test segments for common points, in order for this to be viable, there would have to be segment-level references to point indexes to speed up the lookups. These might be a win anyway, but I think that overall it's not improving anything much.
            //exclude shared endpoints:
            if(s1.a === s2.a || s1.a === s2.b || s1.b === s2.a || s1.b === s2.b) {
                return false;
            }
            
            var s1_x = s1.b.x - s1.a.x;
            var s1_y = s1.b.y - s1.a.y;
            var s2_x = s2.b.x - s2.a.x;
            var s2_y = s2.b.y - s2.a.y;
            
            var s = (-s1_y * (s1.a.x - s2.a.x) + s1_x * (s1.a.y - s2.a.y)) / (-s2_x * s1_y + s1_x * s2_y);
            var t = (s2_x * (s1.a.y - s2.a.y) - s2_y * (s1.a.x - s2.a.x)) / (-s2_x * s1_y + s1_x * s2_y);
            
            if(s >= 0 && s <= 1 && t >= 0 && t <= 1) {
                return true;
            }
         
            return false;
        },
        
        addPath = function(path) {
            path = JSON.parse(path);
            
            if(path && path.length > 1) {
                
                var pStart, //start point
                    pPrior, //prior point
                    iPrior; //index of prior point
                
                path.forEach(function(pCurrent) {
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
        
        //break all intersecting segments into smaller pieces:
        breakSegments = function() {
            for(var i = 0; i < segments.length - 1; i++) {
                for(var i2 = i + 1; i2 < segments.length; i2++) {
                    log(
                        i
                        + ', ' + i2
                        + ': '
                        +segmentsIntersect(segments[i], segments[i2])
                    );
                }
            }
        };
        
        return {
            points: points,
            segments: segments,
            addPath: addPath,
            breakSegments: breakSegments
        };
    };
    
    var handlePathAdd = function(path) {
        var a = path.get('_path');
        //log(a);
        
        
        var g = new graph();
        g.addPath(a);
        log(g);
        
        g.breakSegments();
        log(g);
    },
    
    /* polygon logic - end */
    
    /* nuts and bolts - begin */
    
    registerEventHandlers = function() {
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
