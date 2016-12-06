// 10 Mb should be more than enough
var DESIRED_CAPACITY = 10 * 1024;
var DB_DOC_KEY = "emoji-database";
var DB_DOC_ATTACHMENT = "sqlite-file";
var storage;

// Master DB File
var db;

chrome.commands.onCommand.addListener(function(command) {
  if (command === 'emoji-auto-complete') {
    if (db == null) {
      initializeDb(sendDisplayPopupAtCursorMessage);
      return;
    }
    sendDisplayPopupAtCursorMessage();
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message == 'to_background:get_window_size') {
      chrome.windows.getCurrent(function(window) {
        sendResponse({width: window.width, height: window.height});
      });
      return true;
    } else if (request.message == 'to_background:perform_query') {
      queryEmoji(request.query, function(queryResult) {
        sendResponse({result: queryResult});
      });
    }
});

function initializeDb(callback) {
  if (storage != null) {
    loadDbFromStorage(callback);
    return;
  }
  // Initialize storage
  storage = new LargeLocalStorage({size: DESIRED_CAPACITY, name: 'myStorage'});
  storage.initialized.then(function(storageResult) {
    storage = storageResult;
    var grantedCapacity = storageResult.getCapacity();
    if (grantedCapacity != -1 && grantedCapacity != DESIRED_CAPACITY) {
      // FUBAR?
      console.log('uh oh: ' + grantedCapacity);
    }
    loadDbFromStorage(callback);
  });
}

function queryEmoji(query, callback) {
  if (!callback) {
    return;
  }
  if (db == null) {
    initializeDb(function() {
      queryEmoji(query, callback);
    });
    return;
  }
  var sqlQuery = "SELECT emojicon, COUNT(*) as frequency FROM emojis WHERE ";
  for (var term of query.trim().split(' ')) {
    sqlQuery += `keyword LIKE "%${term}%" OR `;
  }
  sqlQuery = sqlQuery.substring(0, sqlQuery.length - 3);
  sqlQuery += `GROUP BY emojicon ORDER BY COUNT(*) DESC LIMIT 12`;
  var sqlStmt = db.prepare(sqlQuery);
  sqlStmt.bind();
  var result = [];
  while (sqlStmt.step()) {
    result.push(sqlStmt.getAsObject().emojicon);
  }
  callback(result);
}

function sendDisplayPopupAtCursorMessage() {
  // Received the main keyboard command
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {'message': 'to_content:display_popup_at_cursor'});
  });
}

function populateAndSaveDefaultDb(callback) {
  // Open the default Db
  var xhr = new XMLHttpRequest();
  xhr.open('GET','/database/defaults.sqlite', true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function(e) {
    db = new SQL.Database(new Uint8Array(this.response));
    saveDbToStorage(callback);
  };
  xhr.send();
}

function loadDbFromStorage(callback) {
  storage.getAttachment(DB_DOC_KEY, DB_DOC_ATTACHMENT).then(function(dbStorageFile) {
    var fileReader = new FileReader();
    fileReader.onloadend = function() {
      var Uints = new Uint8Array(fileReader.result);
      db = new SQL.Database(Uints);
      if (callback) callback();
    }
    fileReader.readAsArrayBuffer(dbStorageFile);
  }).catch(function(error) {
    // File not found
    if (error.code === 8) {
      populateAndSaveDefaultDb(callback);
      return;
    }
    console.error(error);
  });
}

function saveDbToStorage(callback) {
  storage.setAttachment(DB_DOC_KEY, DB_DOC_ATTACHMENT,
    new Blob([db.export()], {type: 'mimeString'})).then(function() {
      if (callback) callback();
    }).catch(function(error) {
      console.error(error);
    });
}
