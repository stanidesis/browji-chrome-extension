// Keycodes
var TAB = 9;
var ENTER = 13;
var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;
var ESC = 27;

// Selector for all search results
var RESULTS_SELECTOR = 'div.mdl-cell';
// Selector that holds all the results
var RESULTS_CONTAINER_SELECTOR = 'div.mdl-grid';

// The latest query performed
var latestQuery;

// Setup before functions
var typingTimer; // Timer identifier
var doneTypingInterval = 300;  // Time in ms, .5 seconds for example

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
      displayPopup(event.data.query);
    }
  }

  function setActiveResultItem($col) {
    $emojiPopup.find('.eac-active').removeClass('eac-active');
    if ($col) {
      $col.addClass('eac-active');
    }
  }

  function displayPopup(withQuery) {
    // Fade that sucker in
    $emojiPopup.fadeIn();
    // Setup form intercept
    $emojiPopup.find('form')[0].onsubmit = function(event) {
      event.preventDefault();
      // Check if any results are present
      if ($emojiPopup.find(RESULTS_SELECTOR).length == 0) {
        // TODO: notify the user that they need to improve their search?
        return;
      }
      if ($emojiPopup.find('.eac-active').length == 0) {
        setActiveResultItem($emojiPopup.find(RESULTS_SELECTOR).first());
      }
      notifySelectionMade(false);
    }

    $emojiPopup.on('click', '#settings_icon', function() {
      dismissPopup();
      chrome.runtime.sendMessage({message: 'to_background:open_options'});
    })

    // On click, submit selection
    $emojiPopup.on('click', RESULTS_SELECTOR, function() {
      notifySelectionMade(false);
    });

    // On Hover, remove .active class for list items
    $emojiPopup.on('mouseover', RESULTS_SELECTOR, function() {
      setActiveResultItem($(this));
    });

    var oneTime = true;
    $emojiPopup.on('focus', 'input', function() {
      // Check for a baked-in query
      if (withQuery && oneTime) {
        oneTime = false;
        $(this).val(withQuery);
        // This is super ugly and necessary because setting
        // the value programmatically doesn't dirty the field
        $(this).parent().addClass("is-dirty");
        performQuery(withQuery);
      }
    })

    // Listen for input changes
    $emojiPopup.on('input', 'input', function() {
      var query = $(this).val();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(function () {performQuery(query)},
        doneTypingInterval);
    })

    // Focus the input element
    $emojiPopup.find('input')[0].focus();

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
      } else if (event.keyCode == ENTER || event.keyCode == TAB) {
        if ($emojiPopup.find('.eac-active').length == 0) {
          return;
        }
        event.preventDefault();
        notifySelectionMade(event.keyCode == TAB);
      } else if (event.keyCode >= LEFT && event.keyCode <= DOWN) {
        var $resultList = $emojiPopup.find(RESULTS_SELECTOR);
        // with no results, just bail
        if ($resultList.length == 0) {
          // No list to scroll through
          return;
        }
        // If the text input is selected
        if (document.activeElement.id === 'eac-search'
          || $emojiPopup.find('.eac-active').length == 0) {
          // Left or right, good user?
          if (event.keyCode == LEFT || event.keyCode == RIGHT) {
            // Allow the keypress to proceed as natural
            return;
          }
          event.preventDefault();
          document.activeElement.blur();
          var goUp = event.keyCode == UP;
          var $newActiveElement = goUp? $resultList.last() : $resultList.first();
          setActiveResultItem($newActiveElement)
          $newActiveElement.parents('div').scrollTo($newActiveElement, 100);
        } else {
          // Don't do the default thing, please :D
          event.preventDefault();
          // Get the active selection
          var $activeListItem = $emojiPopup.find('.eac-active');
          // Determine direction
          var constraintOptions = ['left', 'top', 'right', 'bottom'];
          var $newActiveElement = $activeListItem.nearest(RESULTS_SELECTOR,
            {directionConstraints:[constraintOptions[event.keyCode - LEFT]]});
          if ($newActiveElement.size() > 0) {
            // Set new active result
            setActiveResultItem($newActiveElement);
            $activeListItem.parents('div').scrollTo($newActiveElement, 100);
          } else if (event.keyCode == DOWN || event.keyCode == UP) {
            setActiveResultItem();
            $emojiPopup.find('input')[0].focus();
          }
        }
      } else if ($emojiPopup.find('input').is(':focus') == false) {
        // If the input isn't focused, focus it
        $emojiPopup.find('input')[0].focus();
      }
    });

    // Adjust the Popup's bounds if necessary
    chrome.runtime.sendMessage({message: 'to_background:get_window_size'},
      function(response) {
        var rect = $emojiPopup[0].getBoundingClientRect();
        // Too far down
        if (rect.bottom > response.height) {
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
    var $resultsContainer = $emojiPopup.find(RESULTS_CONTAINER_SELECTOR);
    // No results scenario
    if (results.length == 0) {
      // Reveal the tip and hide the list
      $emojiPopup.find('.eac-tip-container').show();
      $resultsContainer.hide();
      return;
    }
    // Otherwise, fill it with data
    $resultsContainer.empty();
    // Hide the tip
    $emojiPopup.find('.eac-tip-container').hide();
    $.get(chrome.extension.getURL('/template/search-result.html'), function(data) {
      for (var i = 0; i < results.length; i++) {
        var replaced = data.replace('{{replace-me}}', results[i]);
        $($.parseHTML(replaced)).appendTo($resultsContainer);
      }
      if ($resultsContainer.is(':hidden')) {
        $resultsContainer.show();
      }
    });
  }

  function performQuery(query) {
    query = query.trim().toLowerCase();
    if (query === '') {
      populateWithResults([]);
      return;
    } else if (query == latestQuery) {
      return;
    }
    chrome.runtime.sendMessage({message: 'to_background:perform_query', query: query},
      function(response) {
        latestQuery = query;
        populateWithResults(response.result);
      }
    );
  }

  function dismissPopup() {
    window.parent.postMessage({message: 'to_content:dismiss_popup'}, '*');
  }

  function notifySelectionMade(tabbed) {
    var textToInsert = $emojiPopup.find('.eac-active').first().find('span').first().text().trim();
    window.parent.postMessage({message: 'to_content:selection_made',
      selection: textToInsert,
      tabbed: tabbed,
      query: $emojiPopup.find('input').val().trim()}, '*');
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
