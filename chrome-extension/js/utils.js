(function () {
/*
 * "Borrowed" from http://stackoverflow.com/a/1496885/372884
 */
function isWhiteSpace(char) {
  return ' \t\n\r\v'.indexOf(char) != -1;
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
      containerNode = sel.getRangeAt(0).commonAncestorContainer;
    }
  } else if ((sel = document.selection) && sel.type != "Control" ) {
    containerNode = sel.createRange().parentElement();
  }
  return containerNode;
}

function getValue($el) {
  if (isInputOrTextArea($el)) {
    return $el.val();
  }
  return $el.text();
}

function setValue($el, value) {
  if (isInputOrTextArea($el)) {
    $el.val(value);
    return;
  }
  $el.text(value);
}

function isInputOrTextArea($el) {
  return $el[0].tagName == 'INPUT' || $el[0].tagName == 'TEXTAREA';
}

// Export it
window.isWhiteSpace = isWhiteSpace;
window.findElementAtSelector = findElementAtSelector;
window.getValue = getValue;
window.setValue = setValue;
window.isInputOrTextArea = isInputOrTextArea;
}());
