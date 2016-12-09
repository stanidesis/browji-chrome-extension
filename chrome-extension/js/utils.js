(function () {
/*
 * "Borrowed" from http://stackoverflow.com/a/1496885/372884
 */
function isWhiteSpace(char) {
  return ' \xa0\t\n\r\v'.indexOf(char) > -1;
}

/*
 * "Modified" from http://stackoverflow.com/a/14698158/372884
 */
function findElementAtSelector() {
  var sel, containerNode;
  if (window.getSelection) {
    sel = window.getSelection();
    if (sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      if (range.startContainer != range.endContainer) {
        // Multi-element selection
        return null;
      }
      containerNode = range.commonAncestorContainer;
      console.log(containerNode);
    }
  } else if ((sel = document.selection) && sel.type != "Control" ) {
    containerNode = sel.createRange().parentElement();
    console.log(containerNode);
  }
  return containerNode;
}

// Export it
window.isWhiteSpace = isWhiteSpace;
window.findElementAtSelector = findElementAtSelector;

}());
