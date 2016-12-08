// iframe
var iframe;
// Trigger Input or Textarea
var triggeredElement;
// The cursor location at which we replace the content
var triggeredSelectionStart;
// The cursor location at which we insert the content
var triggeredSelectionEnd;
// Original query, null if not present
var originalQuery;

// listen to the iframes/webpages message
window.addEventListener("message", onDomMessageReceived, false);

function onDomMessageReceived(event) {
  if (event.data.message === 'to_content:popup_loaded') {
    // Send width/height data to popup so it may reveal itself

    // Get the position of the cursor and input box
    var cumulativeOffset = $(triggeredElement).caret('offset');

    iframe.contentWindow.postMessage({
      message: 'to_popup:display_popup_with_coordinates',
      top: cumulativeOffset.top + cumulativeOffset.height - $(window).scrollTop(),
      left: cumulativeOffset.left - $(window).scrollLeft(),
      query: originalQuery
    }, '*');
  } else if (event.data.message === 'to_content:dismiss_popup') {
    focusOriginalTrigger();
  } else if (event.data.message === 'to_content:selection_made') {
    insertSelection(event.data.selection);
  }
}

// Listen to messages from the background
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'to_content:display_popup_at_cursor') {
      displayPopup();
    }
  }
);

function displayPopup() {
  if (iframe) {
    dismissPopup(displayPopup);
    return;
  }
  // This is where we need to present a little auto-complete search input
  var activeElement = document.activeElement;
  if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
    // Active element is not an input area
    return;
  }
  triggeredElement = activeElement;
  triggeredSelectionStart = activeElement.selectionStart;
  triggeredSelectionEnd = activeElement.selectionEnd;
  // Check if the user highlighted text within the input area
  if (triggeredSelectionEnd > triggeredSelectionStart) {
    originalQuery = triggeredElement.value
      .substring(triggeredSelectionStart, triggeredSelectionEnd);
  } else {
    // Find the first whitespace before the selection
    var startOfQuery = triggeredSelectionEnd - 1;
    for (; startOfQuery >= 0; startOfQuery--) {
      if (isWhiteSpace(triggeredElement.value.charAt(startOfQuery))) {
        break;
      }
    }
    startOfQuery++;
    // Find the end of the selection
    var endOfQuery = triggeredSelectionEnd;
    for (; endOfQuery < triggeredElement.value.length; endOfQuery++) {
      if (isWhiteSpace(triggeredElement.value.charAt(endOfQuery))) {
        break;
      }
    }
    originalQuery = triggeredElement.value
      .substring(startOfQuery, endOfQuery);
    if (originalQuery && originalQuery.trim().length != 0) {
      triggeredSelectionStart = startOfQuery;
      triggeredSelectionEnd = endOfQuery;
    } else {
      originalQuery = null;
    }
  }
  iframe = document.createElement('iframe');
  iframe.src = chrome.extension.getURL("html/popup.html");
  iframe.scrolling = 'no';
  iframe.frameBorder = 0;
  var $iframe = $(iframe);
  $iframe.css('position', 'fixed');
  $iframe.css('width', $('body').width());
  $iframe.css('height', $('body').height());
  $iframe.css('top', '0');
  $iframe.css('left', '0');
  $iframe.css('z-index', '10000000000');
  $iframe.appendTo('body');
}

function dismissPopup(callback) {
  $(iframe).fadeOut('fast', function() {
    $(iframe).remove();
    iframe = null;
    if (callback) callback();
  });
}

function insertSelection(textToInsert) {
  if (!triggeredElement) {
    return;
  }
  var $triggeredElement = $(triggeredElement);
  var originalText = $triggeredElement.val();
  var newVal = originalText.substring(0, triggeredSelectionStart)
    + textToInsert + originalText.substring(triggeredSelectionEnd);
  $triggeredElement.val(newVal);
  triggeredElement.setSelectionRange(triggeredSelectionStart + textToInsert.length,
    triggeredSelectionStart + textToInsert.length);
  focusOriginalTrigger();
}

function focusOriginalTrigger() {
  if (triggeredElement) {
    triggeredElement.focus();
    triggeredElement = null;
    triggeredSelectionStart = null;
    triggeredSelectionEnd = null;
    originalQuery = null;
  }
  dismissPopup();
}
