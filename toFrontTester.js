var APIToFrontTester = APIToFrontTester || (function() {
    
    var graphicUrl1 = 'https://s3.amazonaws.com/files.d20.io/images/48971/thumb.jpg?1340229647',
        graphicUrl2 = 'https://s3.amazonaws.com/files.d20.io/images/3243309/fbP3iGSXAjodjtPzJfNy-Q/thumb.jpg?1393492761', 
        graphicUrl3 = 'https://s3.amazonaws.com/files.d20.io/images/224431/2KRtd2Vic84zocexdHKSDg/thumb.jpg?1348140031',
        pathColor1 = '#ff0000',
        pathColor2 = '#00ff00',
        pathColor3 = '#0000ff',
    
    displayUi = function() {
        sendChat('Area API',
            '[run](!api-toFrontTester run)'
            + ' [clear](!api-toFrontTester clear)'
        );
    },
    
    getRectanglePath = function(height, width) {
        return "[[\"M\",0,0],[\"L\",0," + height + "],[\"L\"," + width + "," + height + "],[\"L\"," + width + ",0],[\"L\",0,0]]";
    },
    
    createPathObject = function(layer, strokeColor, fillColor, size, top, left) {
        var obj = createObj('path', {
            layer: layer,
            pageid: Campaign().get('playerpageid'),
            top: top,
            left: left,
            stroke: strokeColor,
            stroke_width: 1,
            fill: fillColor,
            _path: getRectanglePath(size, size),
            rotation: 0
        });
        
        if(obj) {
            var objectInfo = ['path', obj.id];
            state.APIToFrontTester.objects.push(objectInfo);
            return objectInfo;
        }
        
        return null;
    },
    
    createGraphicObject = function(imgsrc, layer, size, top, left) {
        var obj = createObj('graphic', {
            imgsrc: imgsrc,
            layer: layer,
            pageid: Campaign().get('playerpageid'),
            top: top + (size / 2),
            left: left + (size / 2),
            height: size,
            width: size,
            rotation: 0
        });
        
        if(obj) {
            var objectInfo = ['graphic', obj.id];
            state.APIToFrontTester.objects.push(objectInfo);
            return objectInfo;
        }
        
        return null;
    },
    
    createTextObject = function(text, top, left) {
        var obj = createObj('text', {
            layer: 'objects',
            pageid: Campaign().get('playerpageid'),
            top: top,
            left: left,
            text: text,
            width: 300,
            font_size: 16
        });
        
        if(obj) {
            var objectInfo = ['text', obj.id];
            state.APIToFrontTester.objects.push(objectInfo);
            return objectInfo;
        }
        
        return null;
    },
    
    toFrontObject = function(type, id) {
        var obj = getObj(type, id);
        if(obj) {
            toFront(obj);
        }
    },
    
    toBackObject = function(type, id) {
        var obj = getObj(type, id);
        if(obj) {
            toBack(obj);
        }
    },
    
    run = function() {
        var graphics = [];
        graphics.push(graphicUrl1);
        graphics.push(graphicUrl2);
        graphics.push(graphicUrl3);
        
        var colors = [];
        colors.push(pathColor1);
        colors.push(pathColor2);
        colors.push(pathColor3);
        
        var graphicIndex = 0,
            pathIndex = 0;
        
        var testTop = 50,
            testLeft = 150;
            
        
        var itemTop = testTop,
            itemLeft = testLeft;
        createTextObject('graphics - natural insertion', testTop, testLeft + 50);
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            createGraphicObject(graphics[graphicIndex++ % graphics.length], 'objects', 100, itemTop, itemLeft);
        }
        
        
        testLeft += 200;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('paths - natural insertion', testTop, testLeft + 50);
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            createPathObject('objects', colors[pathIndex++ % colors.length], colors[pathIndex % colors.length], 100, itemTop, itemLeft);
        }
        
        
        testLeft += 200;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('mixed - natural insertion', testTop, testLeft + 50);
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            if(i % 2) {
                createGraphicObject(graphics[graphicIndex++ % graphics.length], 'objects', 100, itemTop, itemLeft);
            } else {    
                createPathObject('objects', colors[pathIndex++ % colors.length], colors[pathIndex % colors.length], 100, itemTop, itemLeft);
            }
        }
        
        
        testLeft += 200;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('graphic - toFront from bottom', testTop, testLeft + 50);
        var objects = [];
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            objects.unshift(createGraphicObject(graphics[graphicIndex++ % graphics.length], 'objects', 100, itemTop, itemLeft));
        }
        //toFront in reverse order:
        objects.forEach(function(o) {
            toFrontObject(o[0], o[1]);
        }, this);
        
        
        testLeft += 200;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('graphic - toBack from top', testTop, testLeft + 50);
        objects = [];
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            objects.push(createGraphicObject(graphics[graphicIndex++ % graphics.length], 'objects', 100, itemTop, itemLeft));
        }
        //toBack in regular order:
        objects.forEach(function(o) {
            toBackObject(o[0], o[1]);
        }, this);
        
        
        testLeft += 200;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('path - toBack from top', testTop, testLeft + 50);
        objects = [];
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            objects.push(createPathObject('objects', colors[pathIndex++ % colors.length], colors[pathIndex % colors.length], 100, itemTop, itemLeft));
        }
        //toBack in regular order:
        objects.forEach(function(o) {
            toBackObject(o[0], o[1]);
        }, this);
        
        
        testLeft += 200;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('mixed - toFront from bottom', testTop, testLeft + 50);
        var objects = [];
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            if(i % 2) {
                objects.unshift(createGraphicObject(graphics[graphicIndex++ % graphics.length], 'objects', 100, itemTop, itemLeft));
            } else {    
                objects.unshift(createPathObject('objects', colors[pathIndex++ % colors.length], colors[pathIndex % colors.length], 100, itemTop, itemLeft));
            }
        }
        //toFront in reverse order:
        objects.forEach(function(o) {
            toFrontObject(o[0], o[1]);
        }, this);
        
        
        testLeft += 200;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('mixed - toBack from top', testTop, testLeft + 50);
        objects = [];
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            if(i % 2) {
                objects.push(createGraphicObject(graphics[graphicIndex++ % graphics.length], 'objects', 100, itemTop, itemLeft));
            } else {    
                objects.push(createPathObject('objects', colors[pathIndex++ % colors.length], colors[pathIndex % colors.length], 100, itemTop, itemLeft));
            }
        }
        //toBack in regular order:
        objects.forEach(function(o) {
            toBackObject(o[0], o[1]);
        }, this);
        
        
        testLeft += 250;
        itemTop = testTop;
        itemLeft = testLeft;
        graphicIndex = 0;
        pathIndex = 0;
        createTextObject('mixed, delayed - toFront from bottom', testTop, testLeft + 50);
        var objects = [];
        for(var i = 0; i < 10; i++) {
            itemTop += 30;
            itemLeft += 30;
            if(i % 2) {
                objects.unshift(createGraphicObject(graphics[graphicIndex++ % graphics.length], 'objects', 100, itemTop, itemLeft));
            } else {    
                objects.unshift(createPathObject('objects', colors[pathIndex++ % colors.length], colors[pathIndex % colors.length], 100, itemTop, itemLeft));
            }
        }
        //toFront in reverse order:
        setTimeout(function() { 
            objects.forEach(function(o) {
                toFrontObject(o[0], o[1]);
            }, this);
        }, 500);
    },
    
    deleteObject = function(type, id) {
        var obj = getObj(type, id);
        if(obj) {
            obj.remove();
        }
    },
    
    clearObjects = function() {
        if(state.APIToFrontTester && state.APIToFrontTester.objects) {
            state.APIToFrontTester.objects.forEach(function(obj) {
                deleteObject(obj[0], obj[1]);
            }, this);
        }
        
        state.APIToFrontTester.objects = [];
    },
    
    handleUserInput = function(msg) {
        if(msg.type == 'api' && msg.content.match(/^!api-toFrontTester/)) {
            
            var chatCommand = msg.content.split(' ');
            
            if(chatCommand.length === 1) {
                displayUi();
            } else {
                switch(chatCommand[1]) {
                    case 'run':
                        run();
                        break;
                    case 'clear':
                        clearObjects();
                        break;
                    default:
                        displayUi();
                        break;
                }
            }
        }
    },
    
    registerEventHandlers = function() {
        if(!_.has(state, 'APIToFrontTester')) {
            state.APIToFrontTester = {
                objects: []
            }
        }
        
        on('chat:message', handleUserInput);
    };
    
    //expose public functions:
    return {
        registerEventHandlers: registerEventHandlers,
        displayUi: displayUi
    };
})();
    

on('ready', function() {
    'use strict';
    
    APIToFrontTester.registerEventHandlers();
    APIToFrontTester.displayUi();
});