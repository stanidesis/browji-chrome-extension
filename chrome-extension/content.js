// // Listen to messages from the background
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'display_popup_at_cursor') {
      dismissPopup();
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
        var $emojiPopup = $('#eac-popup');
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

        // Setup form intercept
        $emojiPopup.find('form')[0].onsubmit = function(event) {
          // TODO this will actually insert the first suggestion,
          // if present.
          event.preventDefault();
          dismissPopup();
        }

        // Focus the input element
        $emojiPopup.find('input')[0].focus();

        // Setup click outside eac-popup ("borrowed" from http://stackoverflow.com/a/3028037/372884)
        $(document).on('click.eac', function(event) {
          if(!$(event.target).closest('#eac-popup').length) {
            if($('#eac-popup').is(':visible')) {
              dismissPopup();
            }
          }
        });

        // Bind to escape key
        $(document).on('keyup.eac', function(event) {
          if (event.keyCode == 27) {
            dismissPopup();
          }
        });
      });
    }
  }
);

function dismissPopup() {
  $(document).off('click.eac');
  $(document).off('keyup.eac');
  $('#eac-popup').fadeOut('fast', function() {
    $('#eac-style').remove();
    $('#eac-link-style').remove();
    $('#eac-popup').remove();
  });
}
