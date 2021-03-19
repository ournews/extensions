var API_URL = "https://data.our.news/api/";
var EXTENSION_URL = "https://data.our.news/extension/";

$.ajaxSetup({
    cache: false,
    beforeSend: (jqXHR, settings) => {
        settings.url = settings.url + '&lang=en';
    }
});

var config = {};
config.isUserLoggedIn = false;
config.excludedUrlList = [];
config.categories = [];
config.tags = [];
var isChrome = (navigator.userAgent.indexOf("Chrome") != -1);

$.get(API_URL + "?extconfig", function (data) {

    if (data) {
        data = JSON.parse(data);
        config = data.config;
        config.excludedUrlList = data.excludes;
        config.categories = data.categories;
        config.tags = data.tags;
    }

});


function extractHostname(url) {
    var hostname;
    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    } else {
        hostname = url.split('/')[0];
    }
    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];
    return hostname;
}

function extractRootDomain(url) {
    var domain = extractHostname(url),
        splitArr = domain.split('.'),
        arrLen = splitArr.length;
    if (arrLen > 2) {
        domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
        if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
            domain = splitArr[arrLen - 3] + '.' + domain;
        }
    }
    return domain;
}

function getOnUrl(currentURL, socialURL) {

    /*var pureURL = currentURL;
    currentURL = encodeURIComponent(currentURL);
    var hostname = extractHostname(pureURL).startsWith("www") ? extractRootDomain(pureURL) : extractHostname(pureURL);*/

    var hostname = currentURL;

    if (socialURL) {
        hostname = encodeURIComponent(socialURL);
    }

    currentURL = encodeURIComponent(currentURL);

    return {
        META: API_URL + "?meta=" + currentURL,
        MINE: API_URL + "?mine=" + currentURL,
        ME: API_URL + "?me=" + currentURL,
        // QUALITY: API_URL + "?quality=" + currentURL,
        RATERS: API_URL + "?raters=" + currentURL,
        RATINGS: API_URL + "?ratings=" + currentURL,
        SOURCES: API_URL + "?sources=" + currentURL,
        TAGS: API_URL + "?tags",
        NEWSTRITION_URL: API_URL + "?publink=" + currentURL,
        PUBLIC: API_URL + "?exturlpublic=" + currentURL,
        PRIVATE: API_URL + "?exturlprivate=" + currentURL
        //LINK_FOLLOWER: API_URL + "?linkfollower=" + (linkFollower ? linkFollower : currentURL)
    }
}

function isUserLoggedIn() {
    return $.get(API_URL + "?logintest=true");
}

function onRequestListener(callback) {
    if (isChrome) {
        chrome.extension.onRequest.addListener(callback);
    } else {
        browser.runtime.onMessage.addListener(callback);
    }
}

function loadData(request, sendResponse) {

    var currentURL = request.urlDetails.location;
    var socialURL = request.urlDetails.pubURL;

    if (config.isUserLoggedIn) {

        $.when($.get(getOnUrl(currentURL).ME), $.get(getOnUrl(currentURL).PRIVATE),
            $.get(getOnUrl(currentURL, socialURL).NEWSTRITION_URL)).done(
            function (me, group, newstrition) {

                var result = {};
                result.error = "";
                result.errorMsg = "";

                // Must load
                result.me = JSON.parse(me[0]);
                result.config = config;

                if (JSON.parse(group[0]).error) {
                    result.error = "TRUE";
                    result.errorMsg = JSON.parse(group[0]).error.details;
                    if (result.errorMsg.toLowerCase().indexOf("link not eligible") != -1) {
                        config.excludedUrlList.push(currentURL);
                    }
                    result.newstrition = JSON.parse(newstrition[0]);

                } else {
                    result.meta = JSON.parse(group[0]).results.meta;
                    result.mine = JSON.parse(group[0]).results.mine;
                    // result.quality = JSON.parse(quality[0]);
                    result.raters = JSON.parse(group[0]).results.raters;

                    //if (result.raters.length) {
                    //    result.raters = result.raters.slice(0, config.topratersCount);
                    //}

                    result.ratings = JSON.parse(group[0]).results.ratings;
                    result.newstrition = JSON.parse(newstrition[0]);
                    result.sources = JSON.parse(group[0]).results.sources;
                    result.sourcetypes = JSON.parse(group[0]).results.sourcetypes;
                    result.questions = JSON.parse(group[0]).results.questions;
                }

                console.log(result);
                sendResponse(result);

            });


    } else {

        $.when($.get(getOnUrl(currentURL).PUBLIC),
            $.get(getOnUrl(currentURL, socialURL).NEWSTRITION_URL)).done(
            function (group, newstrition) {

                var result = {};
                result.error = "";
                result.errorMsg = "";

                result.config = config;

                if (JSON.parse(group[0]).error) {
                    result.error = "TRUE";
                    result.errorMsg = JSON.parse(group[0]).error.details;
                    if (result.errorMsg.toLowerCase().indexOf("link not eligible") != -1) {
                        config.excludedUrlList.push(currentURL);
                    }
                    result.newstrition = JSON.parse(newstrition[0]);

                } else {

                    result.meta = JSON.parse(group[0]).results.meta;
                    // result.quality = JSON.parse(quality[0]);
                    result.ratings = JSON.parse(group[0]).results.ratings;
                    result.newstrition = JSON.parse(newstrition[0]);
                    result.sources = JSON.parse(group[0]).results.sources;
                    result.sourcetypes = JSON.parse(group[0]).results.sourcetypes;
                    result.questions = JSON.parse(group[0]).results.questions;
                }

                console.log(result);
                sendResponse(result);

            });

    }

}

function makeAjaxPost(value, callback) {
    $.ajax({
        url: API_URL,
        type: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: $.param(value),
        complete: function (d) {
            callback(d);
        }
    });
}


onRequestListener(function (request, sender, sendResponse) {

    if (request.action == "loadFile") {

        if (isChrome) {
            $.ajax({
                url: chrome.extension.getURL("content.html"),
                dataType: "html",
                success: function (data) {
                    sendResponse({htmlContent: data, config: config});
                }
            });
        } else {
            $.ajax({
                url: browser.runtime.getURL("content.html"),
                dataType: "html",
                success: function (data) {
                    sendResponse({htmlContent: data, config: config});
                }
            });
        }

    } else if (request.action == "init" && request.urlDetails) {

        // Check if user is loggedin or not
        $.get(API_URL + "?logintest=true").always(function (response) {

            if (!response.status) {
                config.isUserLoggedIn = true;
                loadData(request, sendResponse);
            } else {
                config.isUserLoggedIn = false;
                loadData(request, sendResponse);
            }

        });

    } else if (request.action == "finalURL") {

        var stripURL = request.urlDetails.location;

        $.get(API_URL + "?linkfollower=" + encodeURIComponent(stripURL)).always(function (response) {

            var result = JSON.parse(response);
            console.log(result);
            sendResponse(result);

        });

    } else if (request.action == "post") {

        switch (request.key) {

            case "Quicks":
                var quicksURL = API_URL + "";
                value = request.value;
                makeAjaxPost(value, sendResponse);
                break;

            case "Ratings":
                value = request.value;
                makeAjaxPost(value, sendResponse);
                break;

            case "Reactions":
                break;

            case "Sources":
                value = request.value;
                makeAjaxPost(value, sendResponse);
                break;

            case "NewDomain":
                value = request.value;

                if (value.urlpreview) {
                    makeAjaxPost(value, sendResponse);
                } else {
                    makeAjaxPost(value, function () {
                        setTimeout(function () {
                            sendResponse();
                        }, 3200);
                    });
                }
                break;

            case "SourceClick":
                value = request.value;
                makeAjaxPost(value, sendResponse);
                break;

            case "PopupOpened":
                value = request.value;
                makeAjaxPost(value, sendResponse);
                break;

            case "FactcheckCard":
                value = request.value;
                makeAjaxPost(value, sendResponse);
                break;

            default:
                break;

        }

    } else if (request.action == "auth") {

        $.get(API_URL + "?logintest=true").always(function (response) {
            sendResponse(response);
        });

    } else if (request.action == "questionanswer") {

        var value = request.value;
        makeAjaxPost(value, sendResponse);

    } else if (request.action == "qrquestionanswer") {

        var value = request.value;
        makeAjaxPost(value, sendResponse);

    } else if (request.action == "marker") {

        var value = request.value;
        makeAjaxPost(value, sendResponse);

    } else if (request.action == "excludedURL") {

        var cLocation = request.urlDetails.location;
        var cOrigin = request.urlDetails.origin || request.urlDetails.location;
        var found = false;

        // Check if file extension is allowed
        if (config.excludedFileExtensions.length) {

            var currLoc = cLocation;

            if (currLoc.endsWith("#")) {
                currLoc = currLoc.substring(0, currLoc.length - 1);
            }

            $.each(config.excludedFileExtensions, function (i, e) {
                if (currLoc.endsWith(e)) {
                    found = true;
                    sendResponse("true");
                }
            });
        }

        $(config.excludedUrlList).each(function (i, e) {
            if (e.startsWith(cOrigin)) {
                if (e.endsWith("*") || e == cLocation || e + "/" == cLocation) {
                    found = true;
                    sendResponse("true");
                }
            }
        });

        if (!found) {
            sendResponse("false");
        }

    } else if (request.action == "pagewarning") {
        var cLocation = request.pageUrl;
        $.get(API_URL + "?probcheck=" + cLocation).always(function (response) {
            sendResponse(response);
        });
    } else if (request.action === "warning_load_popup") {
        browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
            browser.tabs.sendMessage(tabs[0].id, {provider: "OurNewsExtension", showPopup: true});
        });
    }

    // Refresh UI
    if (!isChrome) {
        return true;
    }

});
