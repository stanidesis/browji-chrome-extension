// iframe
var iframe
// Trigger Input or Textarea
var triggeredEditable

// listen to the iframes/webpages message
window.addEventListener('message', onDomMessageReceived, false)

function onDomMessageReceived (event) {
  if (event.data.message === 'to_content:popup_loaded') {
    // Send width/height data to popup so it may reveal itself

    var top = 0
    var left = 0
    var query = ''

    if (triggeredEditable) {
      // Input mode, get the position of the cursor and input box
      var cumulativeOffset = triggeredEditable.getOffset()
      top = cumulativeOffset.top + cumulativeOffset.height - $(window).scrollTop()
      left = cumulativeOffset.left - $(window).scrollLeft()
      query = triggeredEditable.getQuery()
    }

    iframe.contentWindow.postMessage({
      message: 'to_popup:display_popup_with_coordinates',
      top: top,
      left: left,
      query: query,
      clipboardMode: !triggeredEditable
    }, '*')
  } else if (event.data.message === 'to_content:dismiss_popup') {
    focusOriginalTrigger()
    dismissPopup()
  } else if (event.data.message === 'to_content:selection_made') {
    if (event.data.method === 'copy') {
      sendUpdateWeightsRequest(event.data.query, event.data.selection)
      return
    }

    if (event.data.method === 'tab') {
      insertSelection(event.data.selection)
    } else if (event.data.method === 'return') {
      replaceWithSelection(event.data.selection)
    }
    focusOriginalTrigger()
    dismissPopup(function () {
      sendUpdateWeightsRequest(event.data.query, event.data.selection)
    })
  }
}

// Listen to messages from the background
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.message === 'to_content:display_popup') {
      displayPopup()
    }
  }
)

function displayPopup () {
  if (iframe) {
    dismissPopup(displayPopup)
    return
  }
  // This is where we need to present a little auto-complete search input
  triggeredEditable = getEditable()

  iframe = document.createElement('iframe')
  iframe.src = chrome.extension.getURL("html/popup.html")
  iframe.scrolling = 'no'
  iframe.frameBorder = 0
  var $iframe = $(iframe)
  $iframe.css('position', 'fixed')
  $iframe.css('width', $('html').width())
  $iframe.css('height', window.innerHeight)
  $iframe.css('top', '0')
  $iframe.css('left', '0')
  $iframe.css('z-index', '2147483648')
  $iframe.appendTo('body')
}

function dismissPopup (callback) {
  $(iframe).fadeOut('fast', function () {
    $(iframe).remove()
    iframe = null
    if (callback) callback()
  })
}

function sendUpdateWeightsRequest (query, selection) {
  chrome.runtime.sendMessage({
    message: 'to_background:update_weights',
    query: query,
    selection: selection})
}

function insertSelection (textToInsert) {
  if (!triggeredEditable) {
    return
  }
  triggeredEditable.insertSelection(textToInsert)
}

function replaceWithSelection (textToSwap) {
  if (!triggeredEditable) {
    return
  }
  triggeredEditable.replaceWithSelection(textToSwap)
}

function focusOriginalTrigger () {
  window.focus()
  if (triggeredEditable) {
    triggeredEditable.focus()
  }
}
