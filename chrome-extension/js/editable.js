function getEditable() {
  var activeElement = document.activeElement;
  if (activeElement.tagName == 'INPUT' || activeElement.tagName == 'TEXTAREA') {
    return new InputTextAreaEditable(activeElement);
  } else if (typeof(activeElement.contentEditable) != 'undefined' && activeElement.contentEditable == 'true') {
    // Determine whether we're editing a root div or a child node
    var elementAtSelector = findElementAtSelector();
    if (!elementAtSelector) {
      return null;
    }
    if (elementAtSelector == activeElement) {
      // They're editing within the main div (most likely)
      return new ContentEditable(activeElement);
    } else {
      return new ChildEditable(elementAtSelector);
    }
  }
}

class Editable {
  /**
   * Basic constructor sets up the presumed
   * properties for each object
   */
  constructor(element) {
    this.$element = $(element);
    this.selectionStart = null;
    this.selectionEnd = null;
    this.originalQuery = null;
  }

  /**
   * Return the value in the Editable
   */
  getText() {}

  /**
   * Given an emoji string, return the new value
   * of the editable.
   */
  getNewText(emoji) {
    var originalText = this.getText();
    return originalText.substring(0, this.selectionStart)
      + emoji + originalText.substring(this.selectionEnd);
  }

  /**
   * Get the query, if any, from the element
   */
  getQuery() {
    var text = this.getText();
    if (this.selectionStart < this.selectionEnd) {
      this.originalQuery = text.substring(this.selectionStart, this.selectionEnd);
    } else {
      // Find the first whitespace before the selection
      var startOfQuery = this.selectionEnd - 1;
      for (; startOfQuery >= 0; startOfQuery--) {
        console.log('Is \'' + text.charAt(startOfQuery) + '\' whitespace?');
        if (isWhiteSpace(text.charAt(startOfQuery))) {
          console.log('Stopping start loop');
          break;
        }
      }
      startOfQuery++;
      // Find the end of the selection
      var endOfQuery = this.selectionEnd;
      for (; endOfQuery < text.length; endOfQuery++) {
        console.log('Is \'' + text.charAt(endOfQuery) + '\' whitespace?');
        if (isWhiteSpace(text.charAt(endOfQuery))) {
          console.log('Stopping end loop');
          break;
        }
      }
      this.originalQuery = text.substring(startOfQuery, endOfQuery);
      if (this.originalQuery && this.originalQuery.trim().length != 0) {
        this.selectionStart = startOfQuery;
        this.selectionEnd = endOfQuery;
      } else {
        this.originalQuery = null;
      }
    }
    return this.originalQuery;
  }

  /**
   * Recover the offset. By default, handles both div and input/text elements
   */
  getOffset() {
    return this.$element.caret('offset');
  }

  /**
   * Replace the original query within the editable with the provided
   * emoji string.
   */
  insertSelection(emoji) {}

  /**
   * Focus the element
   */
  focus() {}

  dumpToConsole() {
    console.log(this);
    console.log(this.$element[0]);
    console.log('Value: ' + this.getText());
    console.log('Start(' + this.selectionStart + '), End(' + this.selectionEnd + ')');
    console.log('Query: ' + this.getQuery());
  }
}

/**
 * Handles both Input and TextArea elements.
 */
class InputTextAreaEditable extends Editable {
  constructor(element) {
    super(element);
    this.selectionStart = element.selectionStart;
    this.selectionEnd = element.selectionEnd;
  }

  getText() {
    return this.$element.val();
  }

  focus() {
    this.$element[0].focus();
  }

  insertSelection(emoji) {
    this.$element.val(this.getNewText(emoji));
    this.$element[0].setSelectionRange(this.selectionStart + emoji.length,
      this.selectionStart + emoji.length);
  }
}

/**
 * In apps like Google's Inbox, the first line of the email is a text
 * node within the ContentEditable div itself, the subsequent lines
 * are paragraphs within this div.
 *
 * Why, I don't know.
 *
 * But this handles cases where the user is editing directly within one large div.
 */
class ContentEditable extends Editable {
  constructor(element) {
    if (typeof element.tagName == 'undefined') {
      super(element.parentElement);
    } else {
      super(element);
    }
    var anchorOffset = window.getSelection().anchorOffset;
    var extentOffset = window.getSelection().extentOffset;
    this.selectionStart = Math.min(anchorOffset, extentOffset);
    this.selectionEnd = Math.max(anchorOffset, extentOffset);
  }

  getText() {
    return this.$element.text();
  }

  focus() {
    this.$element[0].focus();
  }

  insertSelection(emoji) {
    this.$element.text(this.getNewText(emoji));
    var selection = window.getSelection();
    selection.removeAllRanges();
    var newRange = document.createRange();
    newRange.setStart(this.$element[0].firstChild, this.selectionStart + emoji.length);
    newRange.setEnd(this.$element[0].firstChild, this.selectionStart + emoji.length);
    selection.addRange(newRange);
  }
}

/**
 * This covers the case of span, h, a, p, and divs that lie within a
 * div which is `[contenteditable]`.
 */
class ChildEditable extends ContentEditable {
  constructor(element) {
    super(element);
  }

  getOffset() {
    return this.$element.closest('[contenteditable]').caret('offset');
  }

  focus() {
    this.$element.closest('[contenteditable]')[0].focus();
  }
}
