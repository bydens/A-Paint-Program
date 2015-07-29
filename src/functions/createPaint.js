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