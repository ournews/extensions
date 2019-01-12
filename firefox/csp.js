var isCSPDisabled = true;

var onHeadersReceived = function (details) {
    if (!isCSPDisabled) {
        return;
    }

    var extensionName = 'Newstrition Tool';
    var isInstalled = false;
    browser.management.getAll(function (extensions) {
        isInstalled = extensions.some(function (extensionInfo) {
            return extensionInfo.name === extensionName && extensionInfo.enabled == true;
        });
    });

    if (!isInstalled) {
        for (var i = 0; i < details.responseHeaders.length; i++) {
            if ('content-security-policy' === details.responseHeaders[i].name.toLowerCase()) {
                details.responseHeaders[i].value = '';
            }
        }
        return {
            responseHeaders: details.responseHeaders
        };
    }
};

var filter = {
    urls: ["*://*/*"],
    types: ["main_frame", "sub_frame"]
};

browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, filter, ["blocking", "responseHeaders"]);