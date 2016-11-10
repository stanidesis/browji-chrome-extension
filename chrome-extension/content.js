// // Listen to messages from the background
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'display_popup_at_cursor') {
      // This is where we need to present a little auto-complete search input
      var activeElement = document.activeElement;
      console.log('Active Element: ' + activeElement.tagName);
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        // Active element is not an input area
        return;
      }
      // Get the position of the cursor and input box
      var coordinates = getCaretCoordinates(activeElement, activeElement.selectionEnd);
      var cumulativeOffset = getCumulativeOffset(activeElement);
      // Calculate the height offset to place the box immediately below/right
      // of the cursor (for now -- might need a smarter calculation in the future?)
      var fontSize = $(activeElement).css('font-size');
      var lineHeight = Math.floor(parseInt(fontSize.replace('px','')) * 2.0);
      // Append popup.html to the body
      $.get(chrome.extension.getURL('/popup.html'), function(data) {
        $($.parseHTML(data)).appendTo('body');
        // Adjust the absolute position of the popup
        var $emojiPopup = $('#emoji-autocomplete-popup');
        $emojiPopup.css('left', (cumulativeOffset.left + coordinates.left));
        $emojiPopup.css('top', cumulativeOffset.top + lineHeight);
        // Initialize MDL: Copied from Material.js
        if ('classList' in document.createElement('div') &&
            'querySelector' in document &&
            'addEventListener' in window && Array.prototype.forEach) {
          document.documentElement.classList.add('mdl-js');
          componentHandler.upgradeAllRegistered();
        } else {
          componentHandler.upgradeElement = function() {};
          componentHandler.register = function() {};
        }
        // End copy of Material.js initialization

        // Focus the input element
        $emojiPopup.find('input')[0].focus();
      });
    }
  }
);
