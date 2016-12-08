(function () {
/*
 * "Borrowed" from http://stackoverflow.com/a/1496885/372884
 */
function isWhiteSpace(char) {
  return ' \t\n\r\v'.indexOf(char) != -1;
}

// Export it
window.isWhiteSpace = isWhiteSpace;

}());
