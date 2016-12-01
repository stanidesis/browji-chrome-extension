// Keycodes
var ENTER = 13;
var UP = 38;
var DOWN = 40;
var ESC = 27;

var Popup = function () {
  var $emojiPopup;
  // Initialize
  this.init = function() {
    // Ammend jQuery with a Scroll feature
    apppendToJquery();
    // Find EmojiPopup
    $emojiPopup = $('#eac-popup');
    // Listen to messages from content.js
    window.addEventListener("message", onDomMessageReceived, false);
    // Let content.js know the popup is ready
    window.parent.postMessage({message: 'to_content:popup_loaded'}, '*');
  };

  // Private functions

  function onDomMessageReceived(event) {
    if (event.data.message === 'to_popup:display_popup_with_coordinates') {
      $emojiPopup.css('left', event.data.left);
      $emojiPopup.css('top', event.data.top);
      displayPopup();
    }
  }

  function displayPopup() {
    // Fade that sucker in
    $emojiPopup.fadeIn();
    // Setup form intercept
    $emojiPopup.find('form')[0].onsubmit = function(event) {
      event.preventDefault();
      // Check if any results are present
      if ($emojiPopup.find('li').length == 0) {
        // TODO: notify the user that they need to improve their search?
        return;
      }
      if ($emojiPopup.find('.eac-active').length == 0) {
        $emojiPopup.find('li').first().addClass('eac-active');
      }
      notifySelectionMade();
    }

    // On click, submit selection
    $emojiPopup.on('click', 'li', function() {
      notifySelectionMade();
    });

    // On Hover, remove .active class for list items
    $emojiPopup.on('mouseover', 'li', function() {
      $emojiPopup.find('.eac-active').removeClass('eac-active');
      $(this).addClass('eac-active');
    });

    // Focus the input element
    $emojiPopup.find('input')[0].focus();

    // Listen for input changes and perform the query
    $emojiPopup.on('input', 'input', function() {
      var query = $(this).val().trim();
      if (query == '' || query.length < 2) {
        // Fill with empty results
        populateWithResults([]);
        return;
      }
      chrome.runtime.sendMessage({message: 'to_background:perform_query', query: query},
        function(response) {
          populateWithResults(response.result);
        }
      );
    });

    // Setup click outside eac-popup ("borrowed" from http://stackoverflow.com/a/3028037/372884)
    $(document).on('click.eac', function(event) {
      if(!$(event.target).closest('#eac-popup').length) {
        if($emojiPopup.is(':visible')) {
          dismissPopup();
        }
      }
    });

    // Bind to keydown listener
    $(document).on('keydown.eac', function(event) {
      if (event.keyCode == ESC) {
        dismissPopup();
      } else if (event.keyCode == ENTER) {
        if ($emojiPopup.find('.eac-active').length == 0) {
          return;
        }
        event.preventDefault();
        notifySelectionMade();
      } else if (event.keyCode == DOWN || event.keyCode == UP) {
        var $resultList = $emojiPopup.find('li');
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
          || $emojiPopup.find('.eac-active').length == 0) {
          document.activeElement.blur();
          // Remove any actively selected item
          $resultList.removeClass('eac-active');
          var $newActiveElement;
          if (goUp) {
            // Render the last result as active
            $newActiveElement = $resultList.last();
            $newActiveElement.addClass('eac-active');
          } else {
            // Render the first result as active
            $newActiveElement = $resultList.first();
            $newActiveElement.addClass('eac-active');
          }
          $newActiveElement.parents('div').scrollTo($newActiveElement, 100);
        // We have an active selection already
        } else {
          var $activeListItem = $emojiPopup.find('.eac-active');
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
    chrome.runtime.sendMessage({message: 'to_background:get_window_size'},
      function(response) {
        // TODO: Maybe move this out to reuse it when the user resizes the window?
        var rect = $emojiPopup[0].getBoundingClientRect();
        // Too far to the left
        if (rect.left <= 0) {
          $emojiPopup.css('left', 10);
        }
        // Too far up
        if (rect.top <= 0) {
          $emojiPopup.css('top', 10);
        }
        // Too far down
        if (rect.bottom > response.height && rect.height <= response.height) {
          $emojiPopup.css('top', response.height - rect.height - 10);
        }
        // Too far right
        if (rect.right > response.width) {
          $emojiPopup.css('left', response.width - rect.width - 10);
        }
      }
    );
  }

  function populateWithResults(results) {
    var $list = $emojiPopup.find('ul');
    // No results scenario
    if (results.length == 0) {
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
      for (var i = 0; i < results.length; i++) {
        var replaced = data.replace('{{replace-me}}', results[i]);
        $($.parseHTML(replaced)).appendTo($list);
      }
      if ($list.is(':hidden')) {
        $list.show();
      }
    });
  }

  function dismissPopup() {
    window.parent.postMessage({message: 'to_content:dismiss_popup'}, '*');
  }

  function notifySelectionMade() {
    var textToInsert = $emojiPopup.find('.eac-active').first().find('span').text().trim();
    window.parent.postMessage({message: 'to_content:selection_made', selection: textToInsert}, '*');
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

};

document.addEventListener("DOMContentLoaded", function() {new Popup().init();}, false);
