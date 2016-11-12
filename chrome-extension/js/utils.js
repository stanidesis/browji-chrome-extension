(function () {
/*
 * "Borrowed" from: http://stackoverflow.com/a/1480137/372884
 */
function getCumulativeOffset(element) {
    var top = 0, left = 0;
    do {
        top += element.offsetTop  || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while(element);

    return {
        top: top,
        left: left
    };
}

// Export it
window.getCumulativeOffset = getCumulativeOffset;

}());
