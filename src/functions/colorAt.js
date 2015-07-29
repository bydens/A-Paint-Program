module.exports = function(cx, x, y) {
  var pixel = cx.getImageData(x, y, 1, 1).data;
  return "rgb(" + pixel[0] + ", " + pixel[1] + ", " + pixel[2] + ")";
};