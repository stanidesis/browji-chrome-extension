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
      displayPopup();
    }
  }
);

function displayPopup() {
  // Add stuff to jQuery
  apppendToJquery();
  // Dismiss an active popup if present
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

    // On click, submit selection
    $emojiPopup.on('click', 'li', function() {
      insertSelection();
    });

    // On Hover, remove .active class for list items
    $emojiPopup.on('mouseover', 'li', function() {
      $('#eac-popup .eac-active').removeClass('eac-active');
      $(this).addClass('eac-active');
    });

    // Focus the input element
    $emojiPopup.find('input')[0].focus();

    // Listen for input changes and perform the query
    $emojiPopup.on('input', 'input', function() {
      var query = $(this).val().trim();
      if (query == '') {
        // TODO: Remove results
        return;
      }
      chrome.runtime.sendMessage({message: 'perform_query', query: query},
        function(response) {
          console.log('Response:' + response.result);
        }
      );
      // TODO: actually connect to search results
      var result = $(this).val();

      var $list = $emojiPopup.find('ul');
      // No results scenario
      if (result.length == 0) {
        // Reveal the tip and hide the list
        $emojiPopup.find('.eac-tip-container').show();
        $list.hide();
        return;
      }
      // Otherwise, fill it with data
      $list.empty();
      // Hide the tip
      $emojiPopup.find('.eac-tip-container').hide();
      $.get(chrome.extension.getURL('/template/search-result.html'), function(data) {
        for (var i = 0; i < 15; i++) {
          var replaced = data.replace('{{replace-me}}', result + ' ' + i);
          $($.parseHTML(replaced)).appendTo($list);
        }
        if ($list.is(':hidden')) {
          $list.show();
        }
      });
    });

    // Setup click outside eac-popup ("borrowed" from http://stackoverflow.com/a/3028037/372884)
    $(document).on('click.eac', function(event) {
      if(!$(event.target).closest('#eac-popup').length) {
        if($('#eac-popup').is(':visible')) {
          dismissPopup();
        }
      }
    });

    // Bind to keydown listener
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
          // The newly selected element
          var $newActiveElement;
          // Remove the active class
          $activeListItem.removeClass('eac-active');
          var index = $resultList.index($activeListItem);
          var length = $resultList.length;
          if (goUp) {
            if (index > 0) {
              $newActiveElement = $activeListItem.prev();
              // Add it to the next item
              $newActiveElement.addClass('eac-active');
            } else {
              // Focus the search
              $('#eac-search')[0].focus();
            }
          } else {
            if (index < length - 1) {
              $newActiveElement = $activeListItem.next();
              // Add it to the next item
              $newActiveElement.addClass('eac-active');
            } else {
              // Focus the search
              $('#eac-search')[0].focus();
            }
          }
          // Scroll to the newly selected item
          if ($newActiveElement) {
            $activeListItem.parents('div').scrollTo($newActiveElement, 100);
          }
        }
      }
    });

    // Adjust the Popup's bounds if necessary
    chrome.runtime.sendMessage({message: 'get_window_size'},
      function(response) {
        // TODO: Maybe move this out to reuse it when the user resizes the window?
        var $eacPopup = $('#eac-popup');
        var rect = $eacPopup[0].getBoundingClientRect();
        // Too far to the left
        if (rect.left <= 0) {
          $eacPopup.css('left', 10);
        }
        // Too far up
        if (rect.top <= 0) {
          $eacPopup.css('top', 10);
        }
        // Too far down
        if (rect.bottom > response.height && rect.height <= response.height) {
          $eacPopup.css('top', response.height - rect.height - 10);
        }
        // Too far right
        if (rect.right > response.width) {
          $eacPopup.css('left', response.width - rect.width - 10);
        }
      }
    );
  });
}

function dismissPopup() {
  // Remove Listeners
  $(document).off('click.eac');
  $(document).off('keydown.eac');
  $('#eac-popup').off();
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

function apppendToJquery() {
  // Swiped from http://stackoverflow.com/a/18927969/372884
  $.fn.scrollTo = function(elem, speed) {
    $(this).animate({
        scrollTop:  $(this).scrollTop() - $(this).offset().top + $(elem).offset().top
    }, speed == undefined ? 1000 : speed);
    return this;
  };
}
