// // Listen to messages from the background
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === "display_popup_at_cursor") {
      // This is where we need to present a little auto-complete search input
      var activeElement = document.activeElement;
      console.log("Active Element: " + activeElement.tagName);
      if (activeElement.tagName !== "INPUT" && activeElement.tagName !== "TEXTAREA") {
        // Active element is not an input area
        return;
      }
      var coordinates = getCaretCoordinates(activeElement, activeElement.selectionEnd);
      console.log(coordinates.top);
      console.log(coordinates.left);
      var cumulativeOffset = getCumulativeOffset(activeElement);
      console.log(cumulativeOffset.left);
      console.log(cumulativeOffset.top);
      var fontSize = $(activeElement).css('font-size');
      var lineHeight = Math.floor(parseInt(fontSize.replace('px','')) * 2.0);
      $.get(chrome.extension.getURL('/popup.html'), function(data) {
        $($.parseHTML(data)).appendTo('body');
        var $emojiPopup = $("#emoji-autocomplete-popup");
        $emojiPopup.css("left", (cumulativeOffset.left + coordinates.left));
        $emojiPopup.css("top", cumulativeOffset.top + lineHeight);
        $.getScript(chrome.extension.getURL('/material.min.js'), function() {
          console.log("Running Material Min");
        });
      });
    }
  }
);
