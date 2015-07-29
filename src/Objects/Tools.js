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