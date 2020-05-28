//// Bypass x-frame options that login & registration page will have
//chrome.webRequest.onHeadersReceived.addListener(
//    function (info) {
//        var headers = info.responseHeaders;
//        for (var i = headers.length - 1; i >= 0; --i) {
//            var header = headers[i].name.toLowerCase();
//            if (header == 'x-frame-options' || header == 'frame-options') {
//                headers.splice(i, 1); // Remove header
//            }
//        }
//        return { responseHeaders: headers };
//    },
//    {
//        urls: ['*://*/*'], // Pattern to match all http(s) pages
//        types: ['sub_frame']
//    },
//    ['blocking', 'responseHeaders']
//);


// Record every URL
chrome.tabs.onUpdated.addListener(function
    (tabId, changeInfo, tab) {

    if (changeInfo.url && changeInfo.url != "chrome://newtab/") {
        addToHistoryList(changeInfo.url);
    }
});

var ONNEWSEXTENSION = {};
ONNEWSEXTENSION.isSendingHistory = false;
ONNEWSEXTENSION.browserHistoryKey = "bh";
ONNEWSEXTENSION.historyListMaxEntry = 5;
ONNEWSEXTENSION.config = {};
ONNEWSEXTENSION.sw = 0;
ONNEWSEXTENSION.sh = 0;

$.get("https://data.our.news/api/?extconfig", function (data) {
    data = JSON.parse(data);
    ONNEWSEXTENSION.config = data.config;
    ONNEWSEXTENSION.historyListMaxEntry = data.config.historyItemsCount;
});

function sendHistoryList() {

    if (localStorage.getItem(ONNEWSEXTENSION.browserHistoryKey) != null) {

        var browserHistory = JSON.parse(localStorage.getItem(ONNEWSEXTENSION.browserHistoryKey));
        if (browserHistory.length && browserHistory.length >= ONNEWSEXTENSION.historyListMaxEntry && ONNEWSEXTENSION.isSendingHistory == false) {

            var oNewsURL = "https://data.our.news/api/?ffi=0";
            var oNewsXhr = new XMLHttpRequest();

            oNewsXhr.open("POST", oNewsURL, true);
            oNewsXhr.onreadystatechange = function () {
                if (oNewsXhr.readyState == 4) {

                    // Clear local storage (only items that were sent)
                    if (oNewsXhr.status == 200) {
                        var newValues = JSON.parse(localStorage.getItem(ONNEWSEXTENSION.browserHistoryKey));
                        newValues.splice(0, browserHistory.length);
                        localStorage.setItem(ONNEWSEXTENSION.browserHistoryKey, JSON.stringify(newValues));
                    }
                    ONNEWSEXTENSION.isSendingHistory = false;
                }
            }

            var formData = new FormData();
            formData.append(ONNEWSEXTENSION.browserHistoryKey, JSON.stringify(browserHistory));
            formData.append("sw", ONNEWSEXTENSION.sw);
            formData.append("sh", ONNEWSEXTENSION.sh);

            oNewsXhr.send(formData);
            isSendingHistory = true;
        }
    }
}


// Format current date and time
function getFormattedDate() {
    var todayTime = new Date();
    var month = todayTime.getMonth() + 1;
    var day = todayTime.getDate();
    var year = todayTime.getFullYear();
    var hours = todayTime.getHours();
    var minutes = todayTime.getMinutes();
    var seconds = todayTime.getSeconds();

    return month + "/" + day + "/" + year + " " + hours + ":" + minutes + ":" + seconds;
}


// Add URL to list
function addToHistoryList(url) {

    if (localStorage.getItem(ONNEWSEXTENSION.browserHistoryKey) != null) {

        var browserHistory = JSON.parse(localStorage.getItem(ONNEWSEXTENSION.browserHistoryKey));
        browserHistory.push([
            url,
            getFormattedDate()
        ]);
        localStorage.setItem(ONNEWSEXTENSION.browserHistoryKey, JSON.stringify(browserHistory));
        sendHistoryList();
    } else {
        var browserHistory = [[
            url,
            getFormattedDate()
        ]];
        localStorage.setItem(ONNEWSEXTENSION.browserHistoryKey, JSON.stringify(browserHistory));
    }
}


// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function (tab) {

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {provider: "OurNewsExtension", showPopup: true});
    });

});

var isChrome = (navigator.userAgent.indexOf("Chrome") != -1);

function onRecordRequestListener(callback) {
    if (isChrome) {
        chrome.extension.onRequest.addListener(callback);
    } else {
        browser.runtime.onMessage.addListener(callback);
    }
}

onRecordRequestListener(function (request, sender, sendResponse) {

    if (request.action == "screenSize") {
        ONNEWSEXTENSION.sw = request.value.sw;
        ONNEWSEXTENSION.sh = request.value.sh;
    }

});

chrome.runtime.onInstalled.addListener(function () {
    var newURL = "https://our.news/join/?extension=2&ffi=0&CID=ON.Chrome";
    chrome.tabs.create({url: newURL});
});
