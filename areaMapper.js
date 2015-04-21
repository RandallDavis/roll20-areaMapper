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
        
        if(!_.has(state,'APIAreaMapper') || state.APIAreaMapper.version !== schemaVersion) {
            log('APIAreaMapper: Resetting state.');
            state.APIAreaMapper = {
                version: schemaVersion
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
    
    /* area - begin */
    
    var area = function() {
        typedObject.call(this);
        this._type.push('area');
    };
    
    area.prototype.setProperty = function(property, value) {
        switch(property) {
            //type state:
            case 'floorPlan': //TODO: implement as path-ready polygon
                this['_' + property] = value;
                break;
            //instance state:
            case 'floorPolygon': //TODO: implement as path object, allow only one per page
                this['_' + property].push(['path', value]);
                break;
            default:
                typedObject.prototype.setProperty.call(this, property, value);
                break;
        }
    };
    
    area.prototype.initializeCollectionProperty = function(property) {
        switch(property) {
            case 'floorPolygon':
                this['_' + property] = new Array();
                break;
            default:
                typedObject.prototype.initializeCollectionProperty.call(this, property);
                break;
        }
    };
    
    area.prototype.create = function(floorPlan) {
        this.setProperty('floorPlan', floorPlan);
    };
    
    area.prototype.draw = function(pageid) {
        //TODO: remove existing floorPolygon
        //TODO: create new floorPolygon on map layer
    };
    
    area.prototype.load = function() {
        //TODO
    };
    
    area.prototype.save = function() {
        //TODO
    };
    
    area.prototype.alterInstance = function(pageid, relativeRotation, relativeScaleX, relativeScaleY, relativePositionX, relativePositionY) {
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
        
        //it's illogical to return a segment's index, becuse it might have been broken into pieces:
        //it's also inconvient to do early detection of the segment being new, because of segment breaking:
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
            
            //add old broken segments:
            brokenSegments.forEach(function(seg) {
                if(!seg.a.equals(seg.b)) {
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
        
        addPath = function(path) {
            path = JSON.parse(path);
            
            if(path && path.length > 1) {
                
                var pStart, //start point
                    pPrior, //prior point
                    iPrior; //index of prior point
                    
                path.forEach(function(pCurrentRaw) {
                    var pCurrent = new point(pCurrentRaw[1], pCurrentRaw[2]); //current point
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
                if(!pPrior.equals(pStart)) {
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
        },
        
        //draws individual segments (for debugging):
        drawSegments = function() {
            segments.forEach(function(s) {
                drawSegment(s, '#0000ff');
            });
        },
        
        getCleanPolygon = function() {
            //find the smallest x points, and of those, take the greatest y:
            var iTopLeftPoint = 0;
            for(var i = 0; i < points.length; i++) {
                if((points[i][0].x < points[iTopLeftPoint][0].x)
                        || (points[i][0].x == points[iTopLeftPoint][0].x && points[i][0].y > points[iTopLeftPoint][0].y)) {
                    iTopLeftPoint = i;
                }
            }
            
            //the output of this function will be a path that is ready to be drawn:
            var cleanPolygon = '[[\"M\",' + points[iTopLeftPoint][0].x + ',' + points[iTopLeftPoint][0].y + ']';
            
            var iP = iTopLeftPoint; //index of current point
            var a = new angle(Math.PI / 2); //angle of prior segment; for first pass, initialize to facing up
            
            var loopLimit = 5000; //limit the loop iterations in case there's a bug or the equality clause ends up needing an epsilon
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
                cleanPolygon += ',[\"L\",' + points[iP][0].x + ',' + points[iP][0].y + ']';
            }
            
            cleanPolygon = cleanPolygon + ']';
            
            return cleanPolygon;
        };
        
        return {
            points: points,
            segments: segments,
            addPath: addPath,
            drawSegments: drawSegments,
            getCleanPolygon: getCleanPolygon
        };
    },
    
    /* polygon logic - end */
    
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
                        
                        log(path.get('_path'));
                        log(g);
                        
                        var cp = g.getCleanPolygon();
                        state.APIAreaMapper.tempArea = cp;
                        
                        log(state.APIAreaMapper.tempArea);
                        
                        state.APIAreaMapper.tempIgnoreAddPath = true;
                        createObj('path', {
                            layer: 'objects',
                            pageid: Campaign().get('playerpageid'),
                            top: 50,
                            left: 50,
                            stroke: '#ff0000',
                            stroke_width: 3,
                            _path: cp
                        });
                        state.APIAreaMapper.tempIgnoreAddPath = false;
                        
                        state.APIAreaMapper.recordAreaMode = 'areaAppend';
                        break;
                    case 'areaAppend':
                        
                        //TODO: this should take top/left, scale, & rotation into account so that the new polygon will be interpreted as a user would expect
                        
                        log(state.APIAreaMapper.tempArea);
                        log(path.get('_path'));
                        
                        var g = new graph();
                        g.addPath(state.APIAreaMapper.tempArea);
                        log(g);
                        g.addPath(path.get('_path'));
                        
                        log(g);
                        
                        var cp = g.getCleanPolygon();
                        state.APIAreaMapper.tempArea = cp;
                        
                        log(state.APIAreaMapper.tempArea);
                        
                        state.APIAreaMapper.tempIgnoreAddPath = true;
                        createObj('path', {
                            layer: 'objects',
                            pageid: Campaign().get('playerpageid'),
                            top: 50,
                            left: 50,
                            stroke: '#ff0000',
                            stroke_width: 3,
                            _path: cp
                        });
                        state.APIAreaMapper.tempIgnoreAddPath = false;
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
