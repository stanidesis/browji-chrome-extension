(function () {
/*
 * "Borrowed" from http://stackoverflow.com/a/1496885/372884
 */
function isWhiteSpace(char) {
  return ' \t\n\r\v'.indexOf(char) > -1
   || char == String.fromCharCode(160)
   || char == String.fromCharCode(32);
}

/*
 * "Borrowed" from http://stackoverflow.com/a/4399718/372884
 */
function getTextNodesIn(node, includeWhitespaceNodes) {
  var textNodes = [], nonWhitespaceMatcher = /\S/;

  function getTextNodes(node) {4
    if (node.nodeType == 3) {
      if (includeWhitespaceNodes || nonWhitespaceMatcher.test(node.nodeValue)) {
        textNodes.push(node);
      }
    } else {
      for (var i = 0, len = node.childNodes.length; i < len; ++i) {
        getTextNodes(node.childNodes[i]);
      }
    }
  }

  getTextNodes(node);
  return textNodes;
}

/*
 * "Modified" from http://stackoverflow.com/a/14698158/372884
 */
function findTextNodeAtSelector() {
  var sel, foundNode, startOfRange, endOfRange;
  if (window.getSelection) {
    sel = window.getSelection();
    if (sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      if (range.startContainer != range.endContainer) {
        // Multi-element selection
        return null;
      }

      var containerNode = range.commonAncestorContainer;
      startOfRange = range.startOffset;
      endOfRange = range.endOffset;
      if (containerNode.nodeType != 3) {
        var allTextNodes = getTextNodesIn(containerNode, true);
        if (allTextNodes.length == 0) {
          foundNode = document.createTextNode('');
          containerNode.appendChild(foundNode);
        } else {
          foundNode = allTextNodes[allTextNodes.length - 1];
        }
      } else {
        foundNode = containerNode;
      }
    }
  }
  return {
    textNode: foundNode,
    startOfRange: startOfRange,
    endOfRange: endOfRange
  }
}

// Export it
window.isWhiteSpace = isWhiteSpace;
window.findTextNodeAtSelector = findTextNodeAtSelector;
}());
