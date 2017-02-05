// 10 Mb should be more than enough
var DESIRED_CAPACITY = 20 * 1024;
var DB_DOC_KEY = "emoji-database";
var DB_DOC_ATTACHMENT = "sqlite-file";
var LATEST_DB_VERSION = 1;
var storage;

// True if the popup was revealed
var popupRevealedAtCursor = false;
// Master DB File
var db;

// Remove then create context menu
chrome.contextMenus.removeAll(function () {
  chrome.contextMenus.create({
    id: 'eac-context-menu',
    title: 'Find an Emoji',
    contexts: ['editable']
  });
})

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  activateEAC();
})

chrome.commands.onCommand.addListener(function(command) {
  if (command === 'emoji-auto-complete') {
    activateEAC();
  }
});

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'alarm:fallback_to_copy_paste' && !popupRevealedAtCursor) {
    console.log('Fallback to Copy/Paste!');
  }
})

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
    } else if (request.message == 'to_background:update_weights') {
      updateWeights(request.query, request.selection);
    } else if (request.message == 'to_background:popup_revealed_at_cursor') {
      popupRevealedAtCursor = true;
    } else if (request.message === 'to_background:open_options') {
      if (chrome.runtime.openOptionsPage) {
        // New way to open options pages, if supported (Chrome 42+).
        chrome.runtime.openOptionsPage(function() {
          console.log(chrome.runtime.lastError);
        });
      } else {
        // Reasonable fallback.
        window.open(chrome.runtime.getURL('html/options.html'));
      }
    }
});

function activateEAC() {
  if (db == null) {
    initializeDb(sendDisplayPopupAtCursorMessage);
    return;
  }
  sendDisplayPopupAtCursorMessage();
}

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
  var exactMatchQuery = '';
  var partialMatchQuery = '';
  for (var term of query.trim().split(' ')) {
    exactMatchQuery += `keyword="${term}" OR `;
    partialMatchQuery += `keyword MATCH '${escapeParens(term)}*' OR `;
  }
  exactMatchQuery = exactMatchQuery.substring(0, exactMatchQuery.length - 4);
  partialMatchQuery = partialMatchQuery.substring(0, partialMatchQuery.length - 4);
  var sqlQuery = `SELECT emojicon, weight, SUM(CASE WHEN ${exactMatchQuery} THEN 1 ELSE 0 END) AS exactMatches
  FROM emojis WHERE ${partialMatchQuery} GROUP BY emojicon
  ORDER BY exactMatches DESC, weight DESC LIMIT 20`;
  var sqlStmt = db.prepare(sqlQuery);
  var result = [];
  while (sqlStmt.step()) {
    result.push(sqlStmt.getAsObject().emojicon);
  }
  sqlStmt.free();
  callback(result);
}

/**
 * In this version of SQLite, the parentheses are fubar'd in MATCH queries
 */
function escapeParens(term) {
  if (term.includes('(') || term.includes(')')) {
    return `"${term}"`;
  }
  return term;
}

function updateWeights(query, selection) {
  for (var term of query.trim().split(' ')) {
    var incrementedRow = null;
    var sqlQuery = `SELECT * FROM emojis WHERE emojicon = '${selection}' AND keyword = '${term}' LIMIT 1`;
    var sqlStmt = db.prepare(sqlQuery);
    sqlStmt.bind();
    while (sqlStmt.step()) {
      incrementedRow = sqlStmt.getAsObject();
    }
    if (incrementedRow) {
      // Update existing row
      var increments = incrementedRow.increments + 1;
      var weight = 0.5 + calculateWeightOffset(increments);
      db.run(`UPDATE emojis SET weight = '${weight}', increments = '${increments}' WHERE emojicon = '${selection}' AND keyword = '${term}'`);
    } else {
      // Create a new row with increments at 1
      db.run(`INSERT INTO emojis VALUES ('${selection}', '${term}', '${0.5 + calculateWeightOffset(1)}', '1', '0')`);
    }
    sqlStmt.free();
    // Decrement all other matches
    sqlQuery = `SELECT * FROM emojis WHERE emojicon != '${selection}' AND keyword = '${term}'`;
    sqlStmt = db.prepare(sqlQuery);
    sqlStmt.bind();
    while (sqlStmt.step()) {
      var row = sqlStmt.getAsObject();
      var increments = row.increments - 1;
      var weight = 0.5 + calculateWeightOffset(increments);
      db.run(`UPDATE emojis SET weight = '${weight}', increments = '${increments}' WHERE emojicon = '${row.emojicon}' AND keyword = '${row.keyword}'`);
    }
    sqlStmt.free();
  }
  saveDbToStorage();
}

function calculateWeightOffset(incrementCount) {
  var absInc = Math.abs(incrementCount);
  var inc = 0;
  while (absInc > 0) {
    inc += Math.pow(2, -(absInc-- + 1));
  }
  return incrementCount > 0 ? inc : -1 * inc;
}

function sendDisplayPopupAtCursorMessage() {
  popupRevealedAtCursor = false;
  // Received the main keyboard command
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {'message': 'to_content:display_popup_at_cursor'});
  });
  chrome.alarms.create('alarm:fallback_to_copy_paste', {when: Date.now() + 500});
}

function loadDefaultDbFromStorage(callback) {
  // Open the default Db
  var xhr = new XMLHttpRequest();
  xhr.open('GET','/database/defaults.sqlite', true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function(e) {
    callback(new SQL.Database(new Uint8Array(this.response)));
  };
  xhr.send();
}

function loadDbFromStorage(callback) {
  storage.getAttachment(DB_DOC_KEY, DB_DOC_ATTACHMENT).then(function(dbStorageFile) {
    var fileReader = new FileReader();
    fileReader.onloadend = function() {
      var Uints = new Uint8Array(fileReader.result);
      db = new SQL.Database(Uints);
      // Perform an upgrade if necessary
      if (LATEST_DB_VERSION > getDbVersion()) {
        upgradeDb(callback);
      } else if (callback) callback();
    }
    fileReader.readAsArrayBuffer(dbStorageFile);
  }).catch(function(error) {
    // File not found
    if (error.code === 8) {
      loadDefaultDbFromStorage(function(defaultDb) {
        db = defaultDb;
        saveDbToStorage(callback);
      });
      return;
    }
    console.error(error);
  });
}

/**
 * Recover the current DB's version
 */
function getDbVersion() {
  var stmt = db.prepare('PRAGMA user_version');
  stmt.bind();
  stmt.step();
  var result = stmt.get()[0];
  stmt.free();
  return result;
}

/**
 * Set the Db version
 */
function setDbVersion(version) {
  db.run(`PRAGMA user_version=${version}`);
}

/**
 * Run through the upgrade process
 */
function upgradeDb(callback) {
  var activeVersion = getDbVersion();
  switch(activeVersion) {
    default:
      // Do nothing for now
  }
  if (activeVersion < LATEST_DB_VERSION) {
    importLatestDefinitions(activeVersion, function () {
      setDbVersion(LATEST_DB_VERSION);
      saveDbToStorage(callback);
    });
    return;
  }
  if (callback) callback();
}

/**
 * This function adds definitions from the default database
 * that do not yet exist in the client's database.
 */
function importLatestDefinitions(activeVersion, callback) {
  loadDefaultDbFromStorage(function(defaultDb) {
    var stmt = defaultDb.prepare(`SELECT * FROM emojis WHERE version > ${activeVersion}`);
    stmt.bind();
    while(stmt.step()) {
      var row = stmt.get();
      // Insert the row
      db.run(`INSERT INTO emojis VALUES('${row.emojicon}','${row.keyword}','${row.weight}','${row.increments}','${row.version}')`);
    }
    stmt.free();
    saveDbToStorage(callback);
  });
}

function saveDbToStorage(callback) {
  storage.setAttachment(DB_DOC_KEY, DB_DOC_ATTACHMENT,
    new Blob([db.export()], {type: 'mimeString'})).then(function() {
      if (callback) callback();
    }).catch(function(error) {
      console.error(error);
      if (callback) callback();
    });
}
