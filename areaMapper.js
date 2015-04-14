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
