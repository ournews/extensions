var isCSPDisabled = true;
var isInstalled = false;

var onHeadersReceived = function (details) {
    if (!isCSPDisabled || isInstalled) {
        return;
    }

    for (var i = 0; i < details.responseHeaders.length; i++) {
        if ('content-security-policy' === details.responseHeaders[i].name.toLowerCase()) {
            details.responseHeaders[i].value = '';
        } else if ('x-frame-options' === details.responseHeaders[i].name.toLowerCase()) {
            details.responseHeaders[i].value = '';
        } else if ('frame-options' === details.responseHeaders[i].name.toLowerCase()) {
            details.responseHeaders[i].value = '';
        }
    }

    return { responseHeaders: details.responseHeaders };
};

var filter = {
    urls: ["*://*/*"],
    types: ["main_frame", "sub_frame"]
};

chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived, filter, ["blocking", "responseHeaders"]);

//var extensionName = 'Newstrition Tool';
//chrome.webRequest.onHeadersReceived.addListener(function (details) {
//    chrome.management.getAll(function (extensions) {
//        var isInstalled = extensions.some(function (extensionInfo) {
//            return extensionInfo.name === extensionName && extensionInfo.enabled == true;
//        });

//        if (!isInstalled) {
//            onHeadersReceived(details);
//        }
//    });

//    onHeadersReceived(details);

//}, filter, ["blocking", "responseHeaders"]);

setInterval(function () {

    var extensionName = 'Newstrition Tool';
    chrome.management.getAll(function (extensions) {
        isInstalled = extensions.some(function (extensionInfo) {
            return extensionInfo.name === extensionName && extensionInfo.enabled == true;
        });
    });

}, 2000);