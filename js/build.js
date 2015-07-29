(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//-----------------------------Controls-----------------------------------------
var Tools = require('./Tools'),
    elt = require('../functions/elt'),
    loadImageURL = require('../functions/loadImageURL');

var Controls = Object.create(null);

Controls.tool = function(cx) {
  var select = elt("select");
  for (var name in Tools)
    select.appendChild(elt("option", null, name));

  cx.canvas.addEventListener("mousedown", function(event) {
    if (event.which == 1) {
      Tools[select.value](event, cx);
      event.preventDefault();
    }
  });

  return elt("span", null, "Tool: ", select);
};

Controls.color = function(cx) {
  var input = elt("input", {type: "color"});
  input.addEventListener("change", function() {
    cx.fillStyle = input.value;
    cx.strokeStyle = input.value;
  });
  return elt("span", null, "Color: ", input);
};

Controls.brushSize = function(cx) {
  var select = elt("select");
  var sizes = [1, 2, 3, 5, 8, 12, 25, 35, 50, 75, 100];
  sizes.forEach(function(size) {
    select.appendChild(elt("option", {value: size},
                           size + " pixels"));
  });
  select.addEventListener("change", function() {
    cx.lineWidth = select.value;
  });
  return elt("span", null, "Brush size: ", select);
};

Controls.save = function(cx) {
  var link = elt("a", {href: "/"}, "Save");
  function update() {
    try {
      link.href = cx.canvas.toDataURL();
    } catch (e) {
      if (e instanceof SecurityError)
        link.href = "javascript:alert(" +
          JSON.stringify("Can't save: " + e.toString()) + ")";
      else
        throw e;
    }
  }
  link.addEventListener("mouseover", update);
  link.addEventListener("focus", update);
  return link;
};

Controls.openFile = function(cx) {
  var input = elt("input", {type: "file"});
  input.addEventListener("change", function() {
    if (input.files.length === 0) return;
    var reader = new FileReader();
    reader.addEventListener("load", function() {
      loadImageURL(cx, reader.result);
    });
    reader.readAsDataURL(input.files[0]);
  });
  return elt("div", null, "Open file: ", input);
};

Controls.openURL = function(cx) {
  var input = elt("input", {type: "text"});
  var form = elt("form", null,
                 "Open URL: ", input,
                 elt("button", {type: "submit"}, "load"));
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    loadImageURL(cx, form.querySelector("input").value);
  });
  return form;
};

module.exports = Controls;
},{"../functions/elt":4,"../functions/loadImageURL":7,"./Tools":2}],2:[function(require,module,exports){
//-------------------------------Tools--------------------------------------
var relativePos = require('../functions/relativePos'),
    randomPointInRadius = require('../functions/randomPointInRadius'),
    rectangleFrom = require('../functions/rectangleFrom'),
    forAllNeighbors = require('../functions/forAllNeighbors'),
    isSameColor = require('../functions/isSameColor'),
    trackDrag = require('../functions/trackDrag');

var Tools = Object.create(null);

Tools.Line = function(event, cx, onEnd) {
  cx.lineCap = "round";

  var pos = relativePos(event, cx.canvas);
  trackDrag(function(event) {
    cx.beginPath();
    cx.moveTo(pos.x, pos.y);
    pos = relativePos(event, cx.canvas);
    cx.lineTo(pos.x, pos.y);
    cx.stroke();
  }, onEnd);
};

Tools.Erase = function(event, cx) {
  cx.globalCompositeOperation = "destination-out";
  Tools.Line(event, cx, function() {
    cx.globalCompositeOperation = "source-over";
  });
};

Tools.Text = function(event, cx) {
  var text = prompt("Text:", "");
  if (text) {
    var pos = relativePos(event, cx.canvas);
    cx.font = Math.max(17, cx.lineWidth) + "px sans-serif";
    cx.fillText(text, pos.x, pos.y);
  }
};

Tools.Spray = function(event, cx) {
  var radius = cx.lineWidth / 2;
  var area = radius * radius * Math.PI;
  var dotsPerTick = Math.ceil(area / 30);

  var currentPos = relativePos(event, cx.canvas);
  var spray = setInterval(function() {
    for (var i = 0; i < dotsPerTick; i++) {
      var offset = randomPointInRadius(radius);
      cx.fillRect(currentPos.x + offset.x,
                  currentPos.y + offset.y, 1, 1);
    }
  }, 25);
  trackDrag(function(event) {
    currentPos = relativePos(event, cx.canvas);
  }, function() {
    clearInterval(spray);
  });
};

Tools.Rectangle = function(event, cx) {
  var relativeStart = relativePos(event, cx.canvas);
  var pageStart = {x: event.pageX, y: event.pageY};

  var trackingNode = document.createElement("div");
  trackingNode.style.position = "absolute";
  trackingNode.style.background = cx.fillStyle;
  document.body.appendChild(trackingNode);

  trackDrag(function(event) {
    var rect = rectangleFrom(pageStart, {x: event.pageX, y: event.pageY});
    trackingNode.style.left = rect.left + "px";
    trackingNode.style.top = rect.top + "px";
    trackingNode.style.width = rect.width + "px";
    trackingNode.style.height = rect.height + "px";
  }, function(event) {
    var rect = rectangleFrom(relativeStart, relativePos(event, cx.canvas));
    cx.fillRect(rect.left, rec.top, rec.width, rec.height);
    document.body.removeChild(trackingNode);
  });
};

Tools["Flood fill"] = function(event, cx) {
  var startPos = relativePos(event, cx.canvas);

  var data = cx.getImageData(0, 0, cx.canvas.width, cx. canvas.height);
  var alreadyFilled = new Array(data.width * data.height);
  var workList = [startPos];
  while (workList.length) {
    var pos = workList.pop();
    var offset = pos.x + data.width * pos.y;
    if (alreadyFilled[offset]) 
      continue;

    cx.fillRect(pos.x, pos.y, 1, 1);
    alreadyFilled[offset] = true;

    forAllNeighbors(pos, function(neighbor) {
      if (neighbor.x >= 0 && neighbor.x < data.width &&
          neighbor.y >= 0 && neighbor.y <data.height &&
          isSameColor(data, startPos, neighbor))
        workList.push(neighbor);
    });
  }
};

module.exports = Tools;
},{"../functions/forAllNeighbors":5,"../functions/isSameColor":6,"../functions/randomPointInRadius":8,"../functions/rectangleFrom":9,"../functions/relativePos":10,"../functions/trackDrag":11}],3:[function(require,module,exports){
var elt = require('./elt');
var Controls = require('../Objects/Controls');

module.exports = function (parent) {
  var canvas = elt("canvas", {width: 700, height: 450});
  var cx = canvas.getContext("2d");
  var toolbar = elt("div", {class: "toolbar"});
  for (var name in Controls)
    toolbar.appendChild(Controls[name](cx));

  var panel = elt("div", {class: "picturepanel"}, canvas);
  parent.appendChild(elt("div", null, panel, toolbar));
};
},{"../Objects/Controls":1,"./elt":4}],4:[function(require,module,exports){
module.exports = function(name, attributes) {
  var node = document.createElement(name);
  if (attributes) {
    for (var attr in attributes)
      if (attributes.hasOwnProperty(attr))
        node.setAttribute(attr, attributes[attr]);
  }
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];
    if (typeof child == "string")
      child = document.createTextNode(child);
    node.appendChild(child);
  }
  return node;
};
},{}],5:[function(require,module,exports){
module.exports = function (point, fn) {
  fn({x: point.x, y: point.y + 1});
  fn({x: point.x, y: point.y - 1});
  fn({x: point.x + 1, y: point.y});
  fn({x: point.x - 1, y: point.y});
};
},{}],6:[function(require,module,exports){
module.exports = function (data, pos1, pos2) {
  var offset1 = (pos1.x + pos1.y * data.width) * 4;
  var offset2 = (pos2.x + pos2.y * data.width) * 4;
  for (var i = 0; i < 4; i++) {
    if (data.data[offset1 + i] != data.data[offset2 + i])
      return false;
  }
  return true;
};
},{}],7:[function(require,module,exports){
module.exports = function (cx, url) {
  var image = document.createElement("img");
  image.addEventListener("load", function() {
    var color = cx.fillStyle, size = cx.lineWidth;
    cx.canvas.width = image.width;
    cx.canvas.height = image.height;
    cx.drawImage(image, 0, 0);
    cx.fillStyle = color;
    cx.strokeStyle = color;
    cx.lineWidth = size;
  });
  image.src = url;
};
},{}],8:[function(require,module,exports){
module.exports = function (radius) {
  for (;;) {
    var x = Math.random() * 2 - 1;
    var y = Math.random() * 2 - 1;
    if (x * x + y * y <= 1)
      return {x: x * radius, y: y * radius};
  }
};
},{}],9:[function(require,module,exports){
module.exports = function (a, b) {
  return {left: Math.min(a.x, b.x),
          top: Math.min(a.y, b.y),
          width: Math.abs(a.x - b.x),
          height: Math.abs(a.y - b.y)};
};
},{}],10:[function(require,module,exports){
module.exports = function (event, element) {
  var rect = element.getBoundingClientRect();
  return {x: Math.floor(event.clientX - rect.left),
          y: Math.floor(event.clientY - rect.top)};
};
},{}],11:[function(require,module,exports){
module.exports = function (onMove, onEnd) {
  function end(event) {
    removeEventListener("mousemove", onMove);
    removeEventListener("mouseup", end);
    if (onEnd)
      onEnd(event);
  }
  addEventListener("mousemove", onMove);
  addEventListener("mouseup", end);
};
},{}],12:[function(require,module,exports){
var createPaint = require('./functions/createPaint');

createPaint(document.body);
},{"./functions/createPaint":3}]},{},[12]);
