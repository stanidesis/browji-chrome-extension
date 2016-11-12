// Keycodes
var ENTER = 13;
var UP = 38;
var DOWN = 40;
var ESC = 27;

// Trigger Input or Textarea
var triggeredElement;
// The cursor location at which we insert the content
var triggeredSelectionEnd;

// Listen to messages from the background
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'display_popup_at_cursor') {
      dismissPopup();
      // This is where we need to present a little auto-complete search input
      var activeElement = document.activeElement;
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        // Active element is not an input area
        return;
      }
      triggeredElement = activeElement;
      triggeredSelectionEnd = activeElement.selectionEnd;
      // Get the position of the cursor and input box
      var coordinates = getCaretCoordinates(triggeredElement, triggeredSelectionEnd);
      var cumulativeOffset = getCumulativeOffset(triggeredElement);
      // Calculate the height offset to place the box immediately below/right
      // of the cursor (for now -- might need a smarter calculation in the future?)
      var fontSize = $(activeElement).css('font-size');
      var lineHeight = Math.floor(parseInt(fontSize.replace('px','')) * 2.0);
      // Append popup.html to the body
      $.get(chrome.extension.getURL('/html/popup.html'), function(data) {
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

        // On Hover, remove .active class for list items
        $emojiPopup.find('li').mouseover(function() {
          $('#eac-popup .eac-active').removeClass('eac-active');
          $(this).addClass('eac-active');
        });


        // On click, do it!
        $emojiPopup.find('li').click(function() {
          insertSelection();
        });

        // Setup form intercept
        $emojiPopup.find('form')[0].onsubmit = function(event) {
          event.preventDefault();
          // Check if any results are present
          if ($('#eac-popup li').length == 0) {
            // TODO: notify the user that they need to improve their search?
            return;
          }
          if ($('#eac-popup .eac-active').length == 0) {
            $('#eac-popup li').first().addClass('eac-active');
          }
          insertSelection();
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
        $(document).on('keydown.eac', function(event) {
          if (event.keyCode == ESC) {
            dismissPopup();
          } else if (event.keyCode == ENTER) {
            if ($('#eac-popup .eac-active').length == 0) {
              return;
            }
            event.preventDefault();
            insertSelection();
          } else if (event.keyCode == DOWN || event.keyCode == UP) {
            var $resultList = $('#eac-popup li');
            // with no results, just bail
            if ($resultList.length == 0) {
              // No list to scroll through
              return;
            }
            // Don't do the default thing, please :D
            event.preventDefault();
            // Up or down, good user?
            var goUp = event.keyCode == UP;
            // If the text input is selected
            if (document.activeElement.id === 'eac-search'
              || $('#eac-popup .eac-active').length == 0) {
              document.activeElement.blur();
              // Remove any actively selected item
              $resultList.removeClass('eac-active');
              if (goUp) {
                // Render the last result as active
                $resultList.last().addClass('eac-active');
              } else {
                // Render the first result as active
                $resultList.first().addClass('eac-active');
              }
            // We have an active selection already
            } else {
              var $activeListItem = $('#eac-popup .eac-active');
              // Remove the active class
              $activeListItem.removeClass('eac-active');
              var index = $resultList.index($activeListItem);
              var length = $resultList.length;
              if (goUp) {
                if (index > 0) {
                  // Add it to the next item
                  $activeListItem.prev().addClass('eac-active');
                } else {
                  // Focus the search
                  $('#eac-search')[0].focus();
                }
              } else {
                if (index < length - 1) {
                  // Add it to the next item
                  $activeListItem.next().addClass('eac-active');
                } else {
                  // Focus the search
                  $('#eac-search')[0].focus();
                }
              }
            }
          }
        });
      });
    }
  }
);

function dismissPopup() {
  // Remove Listeners
  $(document).off('click.eac');
  $(document).off('keydown.eac');
  // Remove Interface Elements
  $('#eac-popup').fadeOut('fast', function() {
    $('#eac-container').remove();
  });
}

function insertSelection() {
  if (!triggeredElement) {
    return;
  }
  var $triggeredElement = $(triggeredElement);
  var originalText = $triggeredElement.val();
  var textToInsert = $('#eac-popup .eac-active').first().find('span').text().trim();
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
