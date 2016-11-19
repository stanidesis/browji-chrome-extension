// Master DB File
var db;

chrome.commands.onCommand.addListener(function(command) {
  if (command === 'emoji-auto-complete') {
    if (db == null) {
      // Open the default DB for now
      var xhr = new XMLHttpRequest();
      xhr.open('GET','/database/defaults.sqlite', true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
        db = new SQL.Database(new Uint8Array(this.response));
        sendDisplayPopupAtCursorMessage();
      };
      xhr.send();
      return;
    }
    sendDisplayPopupAtCursorMessage();
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message == 'get_window_size') {
      chrome.windows.getCurrent(function(window) {
        sendResponse({width: window.width, height: window.height});
      });
      return true;
    }
});

function sendDisplayPopupAtCursorMessage() {
  // Received the main keyboard command
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {'message': 'display_popup_at_cursor'});
  });
}
