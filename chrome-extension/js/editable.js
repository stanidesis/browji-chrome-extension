function getEditable () {
  if (!document || !document.activeElement) {
    return null
  }
  var activeElement = document.activeElement
  if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
    if (activeElement.type === 'email') {
      // Selection start/end are unavailable for email input
      return null
    }
    return new InputTextAreaEditable(activeElement)
  } else {
    // Determine whether we're editing a root div or a child node
    var node = findTextNodeAtSelector()
    if (typeof node === 'undefined' || typeof node.textNode === 'undefined' ||
      $(node.textNode).closest('[contenteditable]').length === 0) {
      return null
    }
    return new NodeEditable(node.textNode,
      node.startOfRange, node.endOfRange)
  }
}

class Editable {
  /**
   * Basic constructor sets up the presumed
   * properties for each object
   */
  constructor (element) {
    this.$element = $(element)
    this.selectionStart = null
    this.selectionEnd = null
    this.queryStart = null
    this.queryEnd = null
    this.query = null
  }

  /**
   * Given an emoji string, return the new taxt value after
   * swapping the query with the emoji
   */
  swapQuery (emoji) {
    var originalText = this.getText()
    return originalText.substring(0, this.queryStart) +
      emoji + originalText.substring(this.queryEnd)
  }

  /**
   * Get the query, if any, from the element
   */
  getQuery () {
    if (this.query) {
      return this.query
    }
    var text = this.getText()
    if (this.selectionStart < this.selectionEnd) {
      return text.substring(this.selectionStart, this.selectionEnd)
    } else {
      // Find the first whitespace before the selection
      var startOfQuery = this.selectionEnd - 1
      for (; startOfQuery >= 0; startOfQuery--) {
        if (isWhiteSpace(text.charAt(startOfQuery))) {
          break
        }
      }
      startOfQuery++
      // Find the end of the selection
      var endOfQuery = this.selectionEnd
      for (; endOfQuery < text.length; endOfQuery++) {
        if (isWhiteSpace(text.charAt(endOfQuery))) {
          break
        }
      }
      var query = text.substring(startOfQuery, endOfQuery)
      if (query && query.trim().length !== 0) {
        this.queryStart = startOfQuery
        this.queryEnd = endOfQuery
        return query
      }
    }
    return null
  }

  /**
   * Recover the offset. By default, handles both div and input/text elements
   */
  getOffset () {
    return this.$element.caret('offset')
  }

  /**
  * Return the value in the Editable
  */
  getText () {}

  /**
   * Replace the original query within the editable with the provided
   * emoji string.
   */
  replaceWithSelection (emoji) {}

  /**
   * Append the selection to the end of the original selection.
   */
  insertSelection (emoji) {}

  /**
   * Focus the element
   */
  focus () {}

  dumpToConsole () {
    console.log(this)
    console.log(this.$element[0])
    console.log('Value: ' + this.getText())
    console.log('Start(' + this.selectionStart + '), End(' + this.selectionEnd + ')')
    console.log('Query Start(' + this.queryStart + '), End(' + this.queryEnd + ')')
    console.log('Query: ' + this.getQuery())
  }
}

/**
 * Handles both Input and TextArea elements.
 */
class InputTextAreaEditable extends Editable {
  constructor (element) {
    super(element)
    this.selectionStart = element.selectionStart
    this.selectionEnd = element.selectionEnd
    this.queryStart = element.selectionStart
    this.queryEnd = element.selectionEnd
    this.query = this.getQuery()
  }

  getText () {
    return this.$element.val()
  }

  focus () {
    this.$element.focus()
  }

  insertSelection (emoji) {
    this.$element.val(
      this.getText().substring(0, this.selectionEnd) +
      emoji +
      this.getText().substring(this.selectionEnd, this.getText().length)
    )
    this.$element[0].setSelectionRange(this.selectionEnd + emoji.length,
      this.selectionEnd + emoji.length)
  }

  replaceWithSelection (emoji) {
    this.$element.val(this.swapQuery(emoji))
    this.$element[0].setSelectionRange(this.queryStart + emoji.length,
      this.queryStart + emoji.length)
  }
}

class NodeEditable extends Editable {
  constructor (element, startOfRange, endOfRange) {
    super(element)
    this.selectionStart = Math.min(startOfRange, endOfRange)
    this.selectionEnd = Math.max(startOfRange, endOfRange)
    this.queryStart = this.selectionStart
    this.queryEnd = this.selectionEnd
    this.query = this.getQuery()
  }

  getOffset () {
    return this.$element.closest('[contenteditable]').caret('offset')
  }

  getText () {
    return this.$element.text()
  }

  focus () {
    this.$element.closest('[contenteditable]').focus()
  }

  insertSelection (emoji) {
    // Active selection
    this.$element[0].data = this.getText().substring(0, this.selectionEnd) +
    emoji + this.getText().substring(this.selectionEnd, this.getText().length)
    this.setNewRange(this.selectionEnd + emoji.length, this.selectionEnd + emoji.length)
  }

  replaceWithSelection (emoji) {
    // The case where they hit `return` but have no query, insert instead
    if (this.queryStart === this.queryEnd) {
      this.insertSelection(emoji)
      return
    }
    this.$element[0].data = this.swapQuery(emoji)
    this.setNewRange(this.queryStart + emoji.length, this.queryStart + emoji.length)
  }

  setNewRange (start, end) {
    var selection = window.getSelection()
    selection.removeAllRanges()
    var newRange = document.createRange()
    newRange.setStart(this.$element[0], start)
    newRange.setEnd(this.$element[0], end)
    selection.addRange(newRange)
  }
}
