var APIAreaMapper = APIAreaMapper || (function() {
   
    /* core - begin */
    
    var version = 0.033,
        schemaVersion = 0.023,
        buttonBackgroundColor = '#E92862',
        buttonHighlightColor = '#00FF00',
        mainBackgroundColor = '#3D8FE1',
        headerBackgroundColor = '#386EA5',
        notificationBackgroundColor = '#64EED7',
        wallImageUrl = 'https://s3.amazonaws.com/files.d20.io/images/9136034/foLUiyrb1qQyK-pkkLKpTg/thumb.png?1430357960',
        floorImageUrl = 'https://s3.amazonaws.com/files.d20.io/images/48971/thumb.jpg?1340229647',
        
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
                activePage: null,
                blueprintFloorPolygonColor: '#A3E1E4',
                edgeWallGapsPolygonColor: '#D13583'
            };
        } 
        
        resetTemporaryState();
    },
    
    resetTemporaryState = function() {
        state.APIAreaMapper.tempIgnoreAddPath = false;
        state.APIAreaMapper.recordAreaMode = false;
        //state.APIAreaMapper.blueprintMode = false;
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
        this.initializeCollectionProperty('edgeWalls');
    };
    
    inheritPrototype(area, typedObject);
    
    area.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'id':
            case 'floorPlan': //simple polygon
            case 'width':
            case 'height':
                this['_' + property] = value;
                break;
            case 'edgeWalls': //simple paths
                return this['_' + property].push(value) - 1;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    area.prototype.initializeCollectionProperty = function(property, value) {
        switch(property) {
            case 'edgeWalls':
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
    
    area.prototype.create = function(rawPath, pageId, top, left, isFromEvent) {
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var sp = g.convertComplexPolygonToSimplePolygon(0);
        var rp = g.getRawPath('simplePolygons', sp);
        this.setProperty('id', Math.random());
        this.setProperty('floorPlan', rp.rawPath);
        
        //initially, edge walls will be identical to the floorPlan, because no gaps have been declared:
        this.setProperty('edgeWalls', [rp.rawPath, 0, 0]);
        
        this.setProperty('width', rp.width);
        this.setProperty('height', rp.height);
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
                case 'width':
                case 'height':
                    this.setProperty(areaState[i][0], areaState[i][1]);
                    break;
                case 'edgeWalls':
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
        areaState.push(['floorPlan', this.getProperty('floorPlan')]);
        areaState.push(['width', this.getProperty('width')]);
        areaState.push(['height', this.getProperty('height')]);
        areaState.push(['edgeWalls', this.getProperty('edgeWalls')]);
        
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
    
    area.prototype.getEdgeWallGaps = function(pageId) {
        //TODO
        
        /*
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.load();
        
        //find removal's intersections with the floorPlan edge:
        var floorPlanSpIndex = g.addSimplePolygon(this.getProperty('floorPlan'), instance.getProperty('top'), instance.getProperty('left'));
        var containedPaths = g.getProperty('simplePolygons')[removeSpIndex].getIntersectingPaths(g.getProperty('simplePolygons')[floorPlanSpIndex]);
        
        //TODO: append containedPaths with existing gaps (might result in multiples being merged):
        
        //TODO: reuse this logic in the method that gets existing gaps:
        var edgeWallPaths = g.getProperty('simplePolygons')[floorPlanSpIndex].removePathIntersections(containedPaths);
        
        //TODO: factor in instance's rotation & scale:
        //convert edgeWallPaths into raw paths:
        this.initializeCollectionProperty('edgeWalls');
        edgeWallPaths.forEach(function(ew) {
            var sp = new simplePath();
            sp.addPointsPath(ew);
            var rp = sp.getRawPath();
            this.setProperty('edgeWalls', [rp.rawPath, rp.top - instance.getProperty('top'), rp.left - instance.getProperty('left')]);
        }, this);
        */
        
        return null;
    };
    
    //alters the area's floorPlan using an area instance as a control:
    area.prototype.floorPlanAppend = function(rawPath, pageId, top, left, isFromEvent) {
        
        //get a simple polygon from the rawPath:
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var appendOpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that appending is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.load();
        
        //TODO: factor in instance's rotation & scale:
        var floorPlanOpIndex = g.addSimplePolygon(this.getProperty('floorPlan'), instance.getProperty('top'), instance.getProperty('left'));
        var mergedOpIndex = g.mergeSimplePolygons(floorPlanOpIndex, appendOpIndex);
        
        //if the polygons intersect, or if the old one is engulfed in the new one, update the floorPlan:
        if(mergedOpIndex !== null) {
            var oldEdgeWallGaps = this.getEdgeWallGaps(pageId);
            
            var rp = g.getRawPath('simplePolygons', mergedOpIndex);
            this.setProperty('floorPlan', rp.rawPath);
            this.setProperty('width', rp.width);
            this.setProperty('height', rp.height);
            
            //if there are no edge wall gaps, just use the new floorPlan for edge walls:
            if(!oldEdgeWallGaps || !oldEdgeWallGaps.length) {
                this.initializeCollectionProperty('edgeWalls');
                this.setProperty('edgeWalls', [rp.rawPath, 0, 0]);
            } else {
                //TODO
            }
            
            this.save();
            this.draw(pageId, rp.top, rp.left);
        }
    };
    
    area.prototype.floorPlanRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeOpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.load();
        
        //TODO: factor in instance's rotation & scale:
        var floorPlanOpIndex = g.addSimplePolygon(this.getProperty('floorPlan'), instance.getProperty('top'), instance.getProperty('left'));
        var mergedOpIndex = g.removeFromSimplePolygon(floorPlanOpIndex, removeOpIndex);
        
        if('undefined' !== typeof(mergedOpIndex)) {
            var oldEdgeWallGaps = this.getEdgeWallGaps(pageId);
            
            var rp = g.getRawPath('simplePolygons', mergedOpIndex);
            this.setProperty('floorPlan', rp.rawPath);
            this.setProperty('width', rp.width);
            this.setProperty('height', rp.height);
            
            //if there are no edge wall gaps, just use the new floorPlan for edge walls:
            if(!oldEdgeWallGaps || !oldEdgeWallGaps.length) {
                this.initializeCollectionProperty('edgeWalls');
                this.setProperty('edgeWalls', [rp.rawPath, 0, 0]);
            } else {
                //TODO
            }
            
            this.save();
            this.draw(pageId, rp.top, rp.left);
        }
    };
    
    area.prototype.edgeWallRemove = function(rawPath, pageId, top, left, isFromEvent) {
        var g = new graph();
        g.addComplexPolygon(rawPath, top, left, isFromEvent);
        var removeSpIndex = g.convertComplexPolygonToSimplePolygon(0);
        
        //get instance that removal is relative to:
        var instance = new areaInstance(this.getProperty('id'), pageId);
        instance.load();
        
        //find removal's intersections with the floorPlan edge:
        var floorPlanSpIndex = g.addSimplePolygon(this.getProperty('floorPlan'), instance.getProperty('top'), instance.getProperty('left'));
        var containedPaths = g.getProperty('simplePolygons')[removeSpIndex].getIntersectingPaths(g.getProperty('simplePolygons')[floorPlanSpIndex]);
        
        //TODO: append containedPaths with existing gaps (might result in multiples being merged):
        
        //TODO: reuse this logic in the method that gets existing gaps:
        var edgeWallPaths = g.getProperty('simplePolygons')[floorPlanSpIndex].removePathIntersections(containedPaths);
        
        //TODO: factor in instance's rotation & scale:
        //convert edgeWallPaths into raw paths:
        this.initializeCollectionProperty('edgeWalls');
        edgeWallPaths.forEach(function(ew) {
            var sp = new simplePath();
            sp.addPointsPath(ew);
            var rp = sp.getRawPath();
            this.setProperty('edgeWalls', [rp.rawPath, rp.top - instance.getProperty('top'), rp.left - instance.getProperty('left')]);
        }, this);
        
        this.save();
        
        this.draw(pageId, instance.getProperty('top'), instance.getProperty('left'));
    };
    
    area.prototype.undraw = function(pageId) {
        instance = new areaInstance(this.getProperty('id'), pageId);
        instance.undraw();
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
        this.initializeCollectionProperty('edgeWallIds');
        this.initializeCollectionProperty('edgeWallGapIds');
        this.initializeCollectionProperty('losWallIds');
    };
    
    inheritPrototype(areaInstance, typedObject);
    
    areaInstance.prototype.setProperty = function(property, value) {
        switch(property) {
            case 'areaId':
            case 'pageId':
            case 'area':
            case 'top':
            case 'left':
            case 'floorPolygonId': //simple path
            case 'floorTileId': //token
            case 'floorMaskId': //simple path
                this['_' + property] = value;
                break;
            case 'edgeWallIds': //tokens
            case 'edgeWallGapIds': //simple paths
            case 'losWallIds': //simple paths
                return this['_' + property].push(value) - 1;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    areaInstance.prototype.initializeCollectionProperty = function(property, value) {
        switch(property) {
            case 'edgeWallIds':
            case 'edgeWallGapIds':
            case 'losWallIds':
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
                case 'floorPolygonId':
                case 'floorTileId':
                case 'floorMaskId':
                    this.setProperty(areaInstanceState[i][0], areaInstanceState[i][1]);
                    break;
                case 'edgeWallIds':
                case 'edgeWallGapIds':
                case 'losWallIds':
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
        areaInstanceState.push(['edgeWallIds', this.getProperty('edgeWallIds')]);
        areaInstanceState.push(['losWallIds', this.getProperty('losWallIds')]);
        areaInstanceState.push(['edgeWallGapIds', this.getProperty('edgeWallGapIds')]);
        
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
        
        //delete edge walls:
        this.getProperty('edgeWallIds').forEach(function(wId) {
            deleteObject('graphic', wId);
        }, this);
        this.initializeCollectionProperty('edgeWallIds');
        
        //delete edge walls:
        this.getProperty('edgeWallGapIds').forEach(function(wId) {
            deleteObject('path', wId);
        }, this);
        this.initializeCollectionProperty('edgeWallGapIds');
        
        //delete line of sight blocking walls:
        this.getProperty('losWallIds').forEach(function(wId) {
            deleteObject('path', wId);
        }, this);
        this.initializeCollectionProperty('losWallIds');
        
        this.save();
    };
    
    areaInstance.prototype.draw = function(top, left) {
        this.undraw();
        
        this.load();
        
        if('undefined' !== typeof(top)) {
            this.setProperty('top', top);
        }
        
        if('undefined' !== typeof(left)) {
            this.setProperty('left', left);
        }
        
        this.save();
        
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
        
        //get the floorPlan from the area:
        var a = new area();
        a.setProperty('id', this.getProperty('areaId'));
        a.load();
        
        //draw new floor tile:
        var floorTile = createTokenObject(floorImageUrl, this.getProperty('pageId'), 'map', new segment(new point(left, top), new point(left + a.getProperty('width'), top + a.getProperty('height'))));
        this.setProperty('floorTileId', floorTile.id);
        
        //draw floor tile mask:
        var page = getObj('page', this.getProperty('pageId'));
        var maskColor = page.get('background_color');
        var g = new graph();
        var floorPlanOpIndex = g.addSimplePolygon(a.getProperty('floorPlan'), top, left);
        var floorMaskOpIndex = g.invertSimplePolygon(floorPlanOpIndex);
        var floorMaskRawPath = g.getRawPath('simplePolygons', floorMaskOpIndex);
        var floorMask = drawPathObject(this.getProperty('pageId'), 'map', maskColor, maskColor, floorMaskRawPath.rawPath, floorMaskRawPath.top, floorMaskRawPath.left);
        this.setProperty('floorMaskId', floorMask.id);
        
        //draw edge walls:
        a.getProperty('edgeWalls').forEach(function(ew) {
            var ewIndex = g.addSimplePath(ew[0], top + ew[1], left + ew[2]);
            g.getProperty('simplePaths')[ewIndex].segments.forEach(function(s) {
                this.setProperty('edgeWallIds', createTokenObjectFromSegment(wallImageUrl, this.getProperty('pageId'), 'objects', s, 30).id);
            }, this);
        }, this);
        
        //draw line of sight blocking walls:
        a.getProperty('edgeWalls').forEach(function(ew) {
            var losWall = drawPathObject(this.getProperty('pageId'), 'walls', '#ff0000', 'transparent', ew[0], top + ew[1], left + ew[2], 1);
            this.setProperty('losWallIds', losWall.id);
        }, this);
       
        this.save();
    };
    
    areaInstance.prototype.drawBlueprint = function() {
        this.load();
        
        var top = this.getProperty('top');
        var left = this.getProperty('left');
        
        //get the floorPlan from the area:
        var a = new area();
        a.setProperty('id', this.getProperty('areaId'));
        a.load();
        
        //create floorPolygon:
        var floorPolygon = drawPathObject(this.getProperty('pageId'), 'map', state.APIAreaMapper.blueprintFloorPolygonColor, state.APIAreaMapper.blueprintFloorPolygonColor, a.getProperty('floorPlan'), top, left);
        this.setProperty('floorPolygonId', floorPolygon.id);
        
        //draw edge wall gaps:
        //TODO: use edge wall gaps instead of edge walls:
        a.getProperty('edgeWalls').forEach(function(ew) {
            var edgeWallGap = drawPathObject(this.getProperty('pageId'), 'map', state.APIAreaMapper.edgeWallGapsPolygonColor, 'transparent', ew[0], top + ew[1], left + ew[2], 5);
            this.setProperty('edgeWallGapIds', edgeWallGap.id);
        }, this);
        
        this.save();
    };
    
    areaInstance.prototype.alter = function(pageid, relativeRotation, relativeScaleX, relativeScaleY, relativePositionX, relativePositionY) {
        //TODO: alter an area instance and everything contained within it
    };
    
    /* area - end */
    
    /* polygon logic - begin */
    
    /*
    Points, segments, and angles are kept as simple, non-polymorphic datatypes for performance.
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
            return new point(this.a.x + ((this.b.x - this.a.x) / 2), this.a.y + ((this.b.y - this.a.y) / 2))
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
    
    
    var simplePath = function() {
        path.call(this);
        this._type.push('simplePath');
    };
    
    inheritPrototype(simplePath, path);
    
    //doesn't test for intersections - assumes this is already part of an simple on good faith:
    simplePath.prototype.addSegment = function(s, index) {
        if(!s.a.equals(s.b)) {
            if('undefined' === typeof(index)) {
                index = this.segments.length;
            }
            
            //increment all segment index references that are about to be altered:
            this.points.forEach(function(p) {
                for(var i = 0; i < p[1].length; i++) {
                    if(p[1][i] >= index) {
                        p[1][i]++;
                    }
                }
            }, this);
            
            //add the segment:
            this.segments.splice(index, 0, s);
            
            //register the segment in this.points:
            var iPa = this.addPoint(s.a);
            var iPb = this.addPoint(s.b);
            this.points[iPa][1].push(index);
            this.points[iPb][1].push(index);
        }
    };
    
    //TODO: this is broken and getting stupid; replace it with a simple mechanism that returns points, and require that SimplePath stays in good state at all times
    //returns points in walking order:
    simplePath.prototype.getPointsPath = function() {
        
        
        //TODO: use the control point as it is to figure out orientation. Walk forward until you hit the endpoint that has no other segments, then walk backward and prepend until you hit the same type of endpoint.
        
        //find the smallest x points, and of those, take the greatest y:
        var controlPointIndex = 0;
        for(var i = 0; i < this.points.length; i++) {
            if((this.points[i][0].x < this.points[controlPointIndex][0].x)
                    || (this.points[i][0].x == this.points[controlPointIndex][0].x && this.points[i][0].y > this.points[controlPointIndex][0].y)) {
                controlPointIndex = i;
            }
        }
        
        var iP = controlPointIndex;
        var loopLimit = this.points.length * 2; //limit the loop iterations in case there's a bug or the equality clause ends up needing an epsilon
        var firstIteration = true;
        var pointsPath = [];
        
        //choose the segment with the greater relative angle to set the walking orientation:
        var controlAngle = new angle((Math.PI / 2) + 0.0001);
        var controlSegmentIndex = 0;
        
        if(this.points[iP][1].length > 1) {
            controlSegmentIndex =
                (this.segments[this.points[iP][1][0]].angle(this.points[iP][0]).subtract(controlAngle.radians).radians > this.segments[this.points[iP][1][1]].angle(this.points[iP][0]).subtract(controlAngle.radians).radians) 
                ? this.points[iP][1][0]
                : this.points[iP][1][1];
        }
        
        //TODO: remove:
        if(this.points[iP][1].length === 0) {
            log('CONTROL POINT ONLY ONE SEGMENT');
        }
        
        var chosenSegment = this.segments[controlSegmentIndex];
            
        log('chosenSegment:');
        log(chosenSegment);
        
        log('this.points:');
        log(this.points);
        
        pointsPath.push(this.points[iP][0]);
        
        log('beginning pointsPath:');
        log(pointsPath);
        
        //loop forward until the path has been traced to its end:
        //TODO: test loopLimit for 'off by one' errors:
        //note: the path should not ever loop back to the controlPointIndex, but check for that just in case this is a simple polygon that is being treated as a simple path:
        //note: when a point is reached that has no further segment, chosenSegment will be undefined.
        while((loopLimit-- > 0) && !(!firstIteration && iP === controlPointIndex) && 'undefined' !== typeof(chosenSegment) && chosenSegment !== null) {
            firstIteration = false;
            var iPOld = iP;
            
            log('iP: ' + iP + ', loopLimit: ' + loopLimit);

            //the next point should be the endpoint of the segment that wasn't the prior point:
            if(chosenSegment.a.equals(this.points[iP][0])) {
                iP = this.getPointIndex(chosenSegment.b);
            } else {
                iP = this.getPointIndex(chosenSegment.a);
            }
            
            log('iP: ' + iP + ', loopLimit: ' + loopLimit);
            log(this.points);
            
            if(this.points[iP][1].length === 1) {
                chosenSegment = null;
            } else {
                //the next segment should be the one that isn't shared by iPOld:
                chosenSegment =
                    (this.points[iP][1][0] === this.points[iPOld][1][0] || this.points[iP][1][0] === this.points[iPOld][1][1])
                    ? this.segments[this.points[iP][1][1]]
                    : this.segments[this.points[iP][1][0]];
            }
                
            log('chosenSegment:');
            log(chosenSegment);
            
            pointsPath.push(this.points[iP][0]);
            
            log('updated points Path:');
            log(pointsPath);
        }
        
        
        log('finished forward traversal');
        log('controlPointIndex: ' + controlPointIndex + ', controlSegmentIndex: ' + controlSegmentIndex);
        
        
        //reset the chosen segment and reverse traversal orientation:
        firstIteration = true;
        iP = controlPointIndex;
        
        log('this.points[iP][1][0]: ' + this.points[iP][1][0]);
        
        chosenSegment =
            (this.points[iP][1][0] === controlSegmentIndex)
            ? this.segments[this.points[iP][1][1]]
            : this.segments[this.points[iP][1][0]];
        
        while((loopLimit-- > 0) && !(!firstIteration && iP === controlPointIndex) && 'undefined' !== typeof(chosenSegment) && chosenSegment !== null) {
            firstIteration = false;
            
            var iPOld = iP;
            
            log('iP: ' + iP + ', loopLimit: ' + loopLimit);

            //the next point should be the endpoint of the segment that wasn't the prior point:
            if(chosenSegment.a.equals(this.points[iP][0])) {
                iP = this.getPointIndex(chosenSegment.b);
            } else {
                iP = this.getPointIndex(chosenSegment.a);
            }
            
            log('iP: ' + iP + ', loopLimit: ' + loopLimit);
            log(this.points);
            
            if(this.points[iP][1].length === 1) {
                chosenSegment = null;
            } else {
                //the next segment should be the one that isn't shared by iPOld:
                chosenSegment =
                    (this.points[iP][1][0] === this.points[iPOld][1][0] || this.points[iP][1][0] === this.points[iPOld][1][1])
                    ? this.segments[this.points[iP][1][1]]
                    : this.segments[this.points[iP][1][0]];
            }
                
            log('chosenSegment:');
            log(chosenSegment);
            
            pointsPath.unshift(this.points[iP][0]);
            
            log('updated points Path:');
            log(pointsPath);
        }
        
        log('final points Path:');
        log(pointsPath);
        
        return pointsPath;
    };
    
    //returns a raw path aligned at (0,0) with top/left offsets:
    simplePath.prototype.getRawPath = function() {
        if(!(this.points && this.points.length > 0)) {
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
        if(this.isType('polygon')) {
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
        
        /*
        If an intersecting path has both endpoints on this path, it is assumed that it follows this path's 
        route. Otherwise, the intersecting path is ignored.
        */
        
        /* 
        It might be possible in the future that orientations are NOT in line with what is being compared.
        This could happen when paths are not stemming from the same source, or the source has changed - 
        orientation can be reversed depending on the control point and the angles of its segments. For this
        to work, the algorithm would require fewer assumptions about the relationship between the two
        paths being compared. The sure-fire way to accomplish this would be to control things from the perspective
        of the intersecting path: 
        1) find the intersecting path's beginning point on this path
        2) dynamically orient from the perspective of the intersecting path, figuring out which direction to traverse
        this path
        3) traverse to the end of the intersecting path, tagging each point as having a +1 intersection (no need for
        start or end tags); this has to be done because if you have start and end tags and try to analyze later, you
        still won't know which way the intersection is oriented
        4) wrap the traversal if this is a polygon
        */
        
        //note: intersecting paths are supposed to always be oriented in the same direction of progression as this path (see note above though)
        
        //Stuff this path's points into a data structure that has proper path order, but allows for tagging. Don't do tagging on this.points because it could get persisted when the points are saved.
        var pointsPath = [];
        this.getPointsPath().forEach(function(p) {
            pointsPath.push([p]);
        }, this);
        
        //helper function for segment breaking:
        var getSegmentIntersectionPointIndex = function(pointsPath, p, beginningIndex) {
            for(var i = beginningIndex + 1; i < pointsPath.length; i++) {
                var s = new segment(pointsPath[i - 1][0], pointsPath[i][0]);
                if(pointIntersectsSegment(s, p)) {
                    pointsPath.splice(i, 0, [p]);
                    return i;
                }
            }
            
            return null;
        };
        
        //apply intersecting paths' endpoints to this path:
        intersectingPaths.forEach(function(ip) {
            if(ip.length > 1) {
                
                var startPointIndex,
                    endPointIndex;
                    
                //tag start point if a match can be found:
                for(var i = 0; i < pointsPath.length; i++) {
                    if(pointsPath[i][0].equals(ip[0])) {
                        
                        //increment the start tag for this point:
                        pointsPath[i].start = pointsPath[i].start ? pointsPath[i].start + 1 : 1;
                        
                        startPointIndex = i;
                        break;
                    }
                }
                
                //if no point matched for start point, see if the start point intersects a segment:
                if('undefined' === startPointIndex) {
                    startPointIndex = getSegmentIntersectionPointIndex(pointsPath, ip[0], 0);
                }
                
                if(startPointIndex !== null) {
                    
                    //increment the start tag for this point:
                    pointsPath[startPointIndex].start = 1;
                
                    //tag end point if a match can be found:
                    //if this path is not a polygon, the end point can only be after the start point:
                    for(var i = this.isType('polygon') ? 0 : startPointIndex; i < pointsPath.length; i++) {
                        if(pointsPath[i][0].equals(ip[ip.length - 1])) {
                            
                            //increment the end tag for this point:
                            pointsPath[i].end = pointsPath[i].end ? pointsPath[i].end + 1 : 1;
                            
                            endPointIndex = i;
                            break;
                        }
                    }
                    
                    //if no point matched for end point, see if the end point intersects a segment:
                    if('undefined' === endPointIndex) {
                        endPointIndex = getSegmentIntersectionPointIndex(pointsPath, ip[ip.length - 1], this.isType('polygon') ? 0 : startPointIndex);
                    }
                    
                    if(endPointIndex !== null) {
                        
                        //increment the end tag for this point:
                        pointsPath[endPointIndex].end = 1;
                    } else {
                        
                        //undo start and ignore segment:
                        pointsPath[startPointIndex].start--;
                    }
                }
            }
        }, this);
        
        var survivingPaths = [];
        
        //identify a starting point that is not intersected; because of polygon wrapping, a complete circuit has to be made:
        var beginningIndex = 0; //relative to index 0
        var beginningIndexIntersectionOverlap = 10000; //relative to index 0
        var indexIntersectionOverlap = 0;
        var detectedFloor = 0; //relative to index 0
        for(var i = 0; i < pointsPath.length; i++) {
            
            //raise the ceiling of this index:
            if(pointsPath[i].start) {
                indexIntersectionOverlap += pointsPath[i].start;
            }
            
            //adjust beginning index if this is the lowest point detected so far:
            if(indexIntersectionOverlap < beginningIndexIntersectionOverlap) {
                beginningIndex = i;
                beginningIndexIntersectionOverlap = indexIntersectionOverlap;
            }
            
            //lower the index if anything has ended here (this will affect later points):
            if(pointsPath[i].end) {
                indexIntersectionOverlap -= pointsPath[i].end;
                
                //TODO: there might cases this doesn't cover, where a deeper floor can be detected but there happens to be intersections distancing it from the current point:
                detectedFloor = Math.min(detectedFloor, indexIntersectionOverlap)
            }
        }
        
        //abort if no points evaded the intersection:
        if(beginningIndexIntersectionOverlap > detectedFloor) {
            return [];
        }
        
        //loop through this path identifying paths that evaded intersection:
        var initialPath = []; //this path is special because we might wrap back into it and need to prepend
        var currentPath = initialPath;
        var intersectionCount = 0;
        
        for(var i = beginningIndex; i < pointsPath.length; i++) {
            if(pointsPath[i].start) {
                intersectionCount += pointsPath[i].start;
            }
            
            if(intersectionCount === 0) {
                currentPath.push(pointsPath[i][0]);
            } else if(currentPath.length > 0) {
                
                //close off the current path, push it:
                currentPath.push(pointsPath[i][0]);
                survivingPaths.push(currentPath);
                
                //clear the current path out:
                currentPath = [];
            }
            
            if(pointsPath[i].end) {
                intersectionCount -= pointsPath[i].end;
                
                //start a new path if the interections have ended:
                if(intersectionCount === 0) {
                    currentPath.push(pointsPath[i][0]);
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
                && beginningIndex === 0
                && currentPath !== initialPath
                && currentPath.length > 0) {
            survivingPaths[0] = currentPath.concat(survivingPaths[0]);
        }
        //include currentPath:
        else {
            if(currentPath.length > 0) {
                survivingPaths.push(currentPath);
            }
        }
        
        return survivingPaths;
    };
  
    
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
    simplePolygon.prototype.hasInside = function(p) {
        
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
    
    simplePolygon.prototype.getPointNotContainedIndex = function(op) {
        for(var i = 0; i < this.points.length; i++) {
            if(!op.hasInside(this.points[i][0])) {
                return i;
            }
        }
        
        return null;
    };
    
    //removes intersection with rop (Removed Outline Polygon):
    simplePolygon.prototype.removeIntersection = function(rop) {
        var controlPointIndex = this.getPointNotContainedIndex(rop);
        
        if(controlPointIndex === null) {
            return;
        }
        
        //get an angle from the control point to the prior point:
        var controlSegment = new segment(this.points[controlPointIndex][0], this.points[(controlPointIndex - 1 + this.points.length) % this.points.length][0]);
        var controlAngle = controlSegment.angle(controlSegment.a);
        
        //stuff both polygons into a complex polygon:
        var cp = new complexPolygon();
        cp.addPointsPath(this.getPointsPath());
        cp.addPointsPath(rop.getPointsPath());
        
        //get the point index out of cp in case it has changed since we found it in this.points:
        var controlPointIndex = cp.getPointIndex(this.points[controlPointIndex][0]);
        
        return cp.convertToSimplePolygon(controlPointIndex, controlAngle, false);
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
                    var brokenSegment1 = new segment(sp.segments[i].a, intersectionPoint);
                    var brokenSegment2 = new segment(intersectionPoint, sp.segments[i].b);
                    
                    //release reference to the broken segment if it exists and hold references to the new pieces:
                    for(var i3 = 0; i3 < intersectingSegments.length; i3++) {
                        if(intersectingSegments[i3][0].equals(sp.segments[i])) {
                            intersectingSegments.splice(i3, 1);
                        }
                    }
                    intersectingSegments.push([brokenSegment1, false]);
                    intersectingSegments.push([brokenSegment2, false]);
                    
                    //remove the broken segment and add its broken pieces:
                    sp.addSegment(brokenSegment1, i + 1);
                    sp.addSegment(brokenSegment2, i + 2);
                    sp.removeSegment(sp.segments[i]);
                    
                    //break the segments in this so that we don't get repeated intersections in further tests:
                    this.addSegment(new segment(this.segments[i2].a, intersectionPoint), i2 + 1);
                    this.addSegment(new segment(intersectionPoint, this.segments[i2].b), i2 + 2);
                    this.removeSegment(this.segments[i2]);
                }
            }
        }
        
        var intersectingPaths = [];
        
        //handle cases where there are no intersectingSegments:
        if(!intersectingSegments.length) {
            
            //sp is fully contained in this:
            if(this.hasInside(sp.points[0][0])) {
                intersectingPaths.push(sp.getPointsPath());
            }
        } else {
        
            //intersectingSegments is now a stable array; loop through until all have been processed:
            intersectingSegments.forEach(function(s) {
                
                //intersectingSegments can be processed inherently through processing others:
                if(!s[1]) {
                    
                    //test the midpoint of the segment to see if it's contained in this polygon:
                    if(this.hasInside(s[0].midpoint())) {
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
                        
                        while(sWalkingIndex !== sIndex && sWalkingIndex < sp.segments.length && this.hasInside(sp.segments[sWalkingIndex].midpoint())) {
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
                            
                            while(sWalkingIndex !== sIndex && sWalkingIndex >= 0 && this.hasInside(sp.segments[sWalkingIndex].midpoint())) {
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
    
    //returns points in walking order:
    simplePolygon.prototype.getPointsPath = function() {
        
        //find the smallest x points, and of those, take the greatest y:
        var controlPointIndex = 0;
        for(var i = 0; i < this.points.length; i++) {
            if((this.points[i][0].x < this.points[controlPointIndex][0].x)
                    || (this.points[i][0].x == this.points[controlPointIndex][0].x && this.points[i][0].y > this.points[controlPointIndex][0].y)) {
                controlPointIndex = i;
            }
        }
        
        var iP = controlPointIndex;
        var loopLimit = this.points.length; //limit the loop iterations in case there's a bug or the equality clause ends up needing an epsilon
        var firstIteration = true;
        var chosenSegment;
        var pointsPath = [];
        
        //choose the segment with the greater relative angle to set the walking orientation:
        var controlAngle = new angle((Math.PI / 2) + 0.0001);
        chosenSegment = 
            (this.segments[this.points[iP][1][0]].angle(this.points[iP][0]).subtract(controlAngle.radians).radians > this.segments[this.points[iP][1][1]].angle(this.points[iP][0]).subtract(controlAngle.radians).radians) 
            ? this.segments[this.points[iP][1][0]]
            : this.segments[this.points[iP][1][1]];
        
        //loop until the path has been traced:
        //TODO: test loopLimit for 'off by one' errors:
        while((loopLimit-- > 0) && !(!firstIteration && iP === controlPointIndex)) {
            firstIteration = false;
            pointsPath.push(this.points[iP][0]);
            var iPOld = iP;
            
            //the next point should be the endpoint of the segment that wasn't the prior point:
            if(chosenSegment.a.equals(this.points[iP][0])) {
                iP = this.getPointIndex(chosenSegment.b);
            } else {
                iP = this.getPointIndex(chosenSegment.a);
            }
            
            //the next segment should be the one that isn't shared by iPOld:
            chosenSegment =
                (this.points[iP][1][0] === this.points[iPOld][1][0] || this.points[iP][1][0] === this.points[iPOld][1][1])
                ? this.segments[this.points[iP][1][1]]
                : this.segments[this.points[iP][1][0]];
        }
        
        return pointsPath;
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
    
    graph.prototype.addSimplePath = function(rawPath, top, left) {
        var sp = new simplePath();
        sp.addRawPath(rawPath, top, left);
        return this.setProperty('simplePaths', sp);
    };
    
    graph.prototype.addComplexPath = function(rawPath, top, left, isFromEvent) {
        var cp = new complexPath();
        cp.addRawPath(rawPath, top, left, isFromEvent);
        return this.setProperty('complexPaths', cp);
    };
    
    graph.prototype.addSimplePolygon = function(rawPath, top, left) {
        var sp = new simplePolygon();
        sp.addRawPath(rawPath, top, left);
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
     
    /* polygon logic - end */
    
    /* roll20 object management - begin */
    
    var deleteObject = function(type, id) {
        var obj = getObj(type, id);
        if(obj) {
            obj.remove();
        }
    },
    
    drawPathObject = function(pageId, layer, strokeColor, fillColor, path, top, left, strokeWidth) {
        state.APIAreaMapper.tempIgnoreAddPath = true;
        
        if('undefined' === typeof(strokeWidth)) {
            strokeWidth = 1;
        }
        
        var obj = createObj('path', {
            layer: layer,
            pageid: pageId,
            top: top,
            left: left,
            stroke: strokeColor,
            stroke_width: strokeWidth,
            fill: fillColor,
            _path: path
        });
        
        state.APIAreaMapper.tempIgnoreAddPath = false;
        
        return obj;
    },
    
    createTokenObjectFromSegment = function(imgsrc, pageId, layer, segment, width) {
        var obj = createObj('graphic', {
            imgsrc: imgsrc,
            layer: layer,
            pageid: pageId,
            width: width,
            top: segment.b.y + ((segment.a.y - segment.b.y) / 2),
            left: segment.b.x + ((segment.a.x - segment.b.x) / 2),
            height: segment.length() + 14,
            rotation: segment.angleDegrees(segment.a) + 90
        });
        toFront(obj);
        return obj;
    },
    
    //creates a token object using a segment to define its dimensions:
    createTokenObject = function(imgsrc, pageId, layer, segment) {
        var obj = createObj('graphic', {
            imgsrc: imgsrc,
            layer: layer,
            pageid: pageId,
            top: segment.b.y + ((segment.a.y - segment.b.y) / 2),
            left: segment.b.x + ((segment.a.x - segment.b.x) / 2),
            height: segment.b.y - segment.a.y,
            width: segment.b.x - segment.a.x,
            rotation: 0
        });
        toFront(obj);
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
        //note: hightlight defaults to false
        
        //if(state.APIRoomManagement.uiPreference === 0) {
            if(highlight) {
                //TODO: pad around this?:
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
                ['blueprint mode', 'blueprint', state.APIAreaMapper.blueprintMode],
                ['create new area', 'areaCreate', (state.APIAreaMapper.recordAreaMode == 'areaCreate')],
                ['add to area', 'areaAppend', (state.APIAreaMapper.recordAreaMode == 'areaAppend')],
                ['remove from area', 'areaRemove', (state.APIAreaMapper.recordAreaMode == 'areaRemove')],
                ['remove edge walls', 'edgeWallRemove', (state.APIAreaMapper.recordAreaMode == 'edgeWallRemove')]
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
    
    toggleBlueprintMode = function() {
        state.APIAreaMapper.blueprintMode = !state.APIAreaMapper.blueprintMode;
        
        if(state.APIAreaMapper.activeArea) {
            var a = new area();
            a.setProperty('id', state.APIAreaMapper.activeArea);
            a.draw(state.APIAreaMapper.activePage);
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
                    case 'edgeWallRemove':
                        toggleOrSetAreaRecordMode(chatCommand[1]);
                        break;
                    case 'blueprint':
                        toggleBlueprintMode();
                        break;
                    default:
                        break;
                }
            }
        }
    },
    
    handlePathAdd = function(path) {
        if(!state.APIAreaMapper.tempIgnoreAddPath && state.APIAreaMapper.recordAreaMode) {
            switch(state.APIAreaMapper.recordAreaMode) {
                case 'areaCreate':
                    var a = new area();
                    a.create(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    state.APIAreaMapper.activeArea = a.getProperty('id');
                    state.APIAreaMapper.activePage = path.get('_pageid');
                   
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
                        log('An area needs to be active before doing removals.');
                        return;
                    }
                    
                    var a = new area();
                    a.setProperty('id', state.APIAreaMapper.activeArea);
                    a.load();
                    a.floorPlanRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
             
                    path.remove();
                    break;
                case 'edgeWallRemove':
                    if(!state.APIAreaMapper.activeArea) {
                        log('An area needs to be active before doing edge wall removals');
                        return;
                    }
                    
                    var a = new area();
                    a.setProperty('id', state.APIAreaMapper.activeArea);
                    a.load();
                    a.edgeWallRemove(path.get('_path'), path.get('_pageid'), path.get('top'), path.get('left'), true);
                    
                    path.remove();
                    break;
                default:
                    break;
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
