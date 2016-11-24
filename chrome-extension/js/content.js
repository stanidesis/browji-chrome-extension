// iframe
var iframe;
// Trigger Input or Textarea
var triggeredElement;
// The cursor location at which we insert the content
var triggeredSelectionEnd;
// listen to the iframes/webpages message
window.addEventListener("message", onDomMessageReceived, false);

function onDomMessageReceived(event) {
  if (event.data.message === 'to_content:popup_loaded') {
    // Send width/height data to popup so it may reveal itself

    // Get the position of the cursor and input box
    var coordinates = getCaretCoordinates(triggeredElement, triggeredSelectionEnd);
    var cumulativeOffset = getCumulativeOffset(triggeredElement);
    // Calculate the height offset to place the box immediately below/right
    // of the cursor (for now -- might need a smarter calculation in the future?)
    var fontSize = $(triggeredElement).css('font-size');
    var lineHeight = Math.floor(parseInt(fontSize.replace('px','')) * 2.0);

    iframe.contentWindow.postMessage({
      message: 'to_popup:display_popup_with_coordinates',
      coordinates: coordinates,
      cumulativeOffset: cumulativeOffset,
      lineHeight: lineHeight
    }, '*');
  } else if (event.data.message === 'to_content:dismiss_popup') {
    dismissPopup();
  } else if (event.data.message === 'to_content:selection_made') {
    insertSelection(event.data.selection);
  }
}

// Listen to messages from the background
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'display_popup_at_cursor') {
      // This is where we need to present a little auto-complete search input
      var activeElement = document.activeElement;
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        // Active element is not an input area
        return;
      }
      triggeredElement = activeElement;
      triggeredSelectionEnd = activeElement.selectionEnd;
      // displayPopup();
      iframe = document.createElement('iframe');
      iframe.src = chrome.extension.getURL("html/popup.html");
      iframe.frameBorder = 0;
      var $iframe = $(iframe);
      $iframe.css('position', 'absolute');
      $iframe.css('width', '100%');
      $iframe.css('height', '100%');
      $iframe.css('top', '0');
      $iframe.css('left', '0');
      // $iframe.css('background-color', 'red');
      $iframe.css('z-index', '10000000000');
      $iframe.appendTo('body');
    }
  }
);

function dismissPopup() {
  $(iframe).fadeOut('fast', function() {
    $(iframe).remove();
    iframe = null;
  });
}

function insertSelection(textToInsert) {
  if (!triggeredElement) {
    return;
  }
  var $triggeredElement = $(triggeredElement);
  var originalText = $triggeredElement.val();
  $triggeredElement.val(originalText.substring(0, triggeredSelectionEnd)
    + textToInsert + originalText.substring(triggeredSelectionEnd));
  triggeredElement.setSelectionRange(triggeredSelectionEnd + textToInsert.length,
    triggeredSelectionEnd + textToInsert.length);
  focusOriginalTrigger();
}

function focusOriginalTrigger() {
  if (triggeredElement) {
    triggeredElement.focus();
    triggeredElement = null;
    triggeredSelectionEnd = null;
  }
  dismissPopup();
}
