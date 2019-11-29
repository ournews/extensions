﻿// Bypass x-frame options that login & registration page will have
browser.webRequest.onHeadersReceived.addListener(
    function (info) {
        var headers = info.responseHeaders;
        for (var i = headers.length - 1; i >= 0; --i) {
            var header = headers[i].name.toLowerCase();
            if (header == 'x-frame-options' || header == 'frame-options') {
                headers.splice(i, 1); // Remove header
            }
        }
        return { responseHeaders: headers };
    },
    {
        urls: ['*://*/*'], // Pattern to match all http(s) pages
        types: ['sub_frame']
    },
    ['blocking', 'responseHeaders']
);

// Called when the user clicks on the browser action.
browser.browserAction.onClicked.addListener(function (tab) {

    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        browser.tabs.sendMessage(tabs[0].id, { provider: "OurNewsExtension", showPopup: true });
    });

});

browser.runtime.onInstalled.addListener(function () {
    var newURL = "https://our.news/register/?extension=2&ffi=0&CID=ON.Firefox";
    browser.tabs.create({url: newURL});
});
