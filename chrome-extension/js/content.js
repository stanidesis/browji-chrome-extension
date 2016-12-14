// iframe
var iframe;
// Trigger Input or Textarea
var triggeredEditable;

// listen to the iframes/webpages message
window.addEventListener("message", onDomMessageReceived, false);

function onDomMessageReceived(event) {
  if (event.data.message === 'to_content:popup_loaded') {
    // Send width/height data to popup so it may reveal itself

    // Get the position of the cursor and input box
    var cumulativeOffset = triggeredEditable.getOffset();

    iframe.contentWindow.postMessage({
      message: 'to_popup:display_popup_with_coordinates',
      top: cumulativeOffset.top + cumulativeOffset.height - $(window).scrollTop(),
      left: cumulativeOffset.left - $(window).scrollLeft(),
      query: triggeredEditable.getQuery()
    }, '*');
  } else if (event.data.message === 'to_content:dismiss_popup') {
    focusOriginalTrigger();
  } else if (event.data.message === 'to_content:selection_made') {
    chrome.runtime.sendMessage({message: 'to_background:update_weights',
      query: event.data.query, selection: event.data.selection});
    if (event.data.tabbed) {
      insertSelection(event.data.selection);
    } else {
      replaceWithSelection(event.data.selection);
    }
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
  triggeredEditable = getEditable();
  if (!triggeredEditable) {
    // TODO: popup instead? Or disregard and apply to the end element only
    console.log('EAC: Please highlight a single line :D');
    return;
  }

  iframe = document.createElement('iframe');
  iframe.src = chrome.extension.getURL("html/popup.html");
  iframe.scrolling = 'no';
  iframe.frameBorder = 0;
  var $iframe = $(iframe);
  $iframe.css('position', 'fixed');
  $iframe.css('width', $('html').width());
  $iframe.css('height', window.innerHeight);
  $iframe.css('top', '0');
  $iframe.css('left', '0');
  $iframe.css('z-index', '2147483648');
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
  if (!triggeredEditable) {
    return;
  }
  triggeredEditable.insertSelection(textToInsert);
  focusOriginalTrigger();
}

function replaceWithSelection(textToSwap) {
  if (!triggeredEditable) {
    return;
  }
  triggeredEditable.replaceWithSelection(textToSwap);
  focusOriginalTrigger();
}

function focusOriginalTrigger() {
  if (triggeredEditable) {
    triggeredEditable.focus();
    triggeredEditable = null;
  }
  dismissPopup();
}
