var $ = jQuery;

function injectScript(file, node) {
    var th = document.getElementsByTagName(node)[0];
    var s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', file);
    th.appendChild(s);
}

function checkOwnDomain() {
    if (location.host == "our.news") {
        injectScript(chrome.extension.getURL('/pagelevel.js'), 'body');
    }
}

checkOwnDomain();

$(function () {

    var isChrome = (navigator.userAgent.indexOf("Chrome") != -1);

    var container = "";
    var config = {};
    var isIndexed = false;
    var isExcluded = false;
    var isInLogin = false;
    var isInProgress = false;
    var isAppEventsRegistered = false;
    var isExclusiveOverride = false;
    var isSocial = false;
    var isLimitedAccess = false;
    var refreshCount = 0;

    var urlDetails = {
        location: "",
        origin: "",
        pubURL: "",
        path: ""
    }

    // START LISTENING
    init();

    var VIEW_LIST = {
        LOADING: "on-loading-view",
        NEWSTRITION: "on-newstrition",
        FACTCHECK: "on-fact-check",
        QUICKRATE: "on-quick-rate",
        ADVANCEDRATINGS: "on-advanced-ratings",
        ADDSOURCE: "on-add-source-modal",
        ADDDOMAIN: "on-add-article",
        DOMAINPREVIEW: "on-domain-preview",
        DOMAINADDINGWIP: "on-url-adding-wip",
        EXCLUDED: "on-url-excluded",
        ADDETECTED: "on-ad-blocker-detected",
        ERROR: "on-error-message"
    }

    function detectAdBlocker() {
        var adBlock = '<div id="wrapfabtest">' +
            '	<div class="adBanner" style="width:1px;height:1px;">' +
            '		This is an ad' +
            '	</div>' +
            '</div>';

        $(document.body).append(adBlock);
        if ($("#wrapfabtest").height() > 0) {
            return false;
        } else {
            return true;
        }
    }

    function showView(VIEW_TYPE) {
        $(container).find('[data-target-container]').closest(".on-nav-item").removeClass("on-active");
        $(container).find('[data-target-container="' + VIEW_TYPE + '"]').closest(".on-nav-item").addClass("on-active");
        $(container).find(".on-target-container").removeClass("on-hidden").addClass("on-hidden");
        $(container).find("#" + VIEW_TYPE).removeClass("on-hidden");
    }

    function updateLocation() {
        if (location.host == "our.news") {
            var dd = $(document.body).attr("data-ext");
            if (dd) {
                dd = JSON.parse(dd);
                urlDetails.location = dd.actual_url;
                isExclusiveOverride = true;
            } else {
                urlDetails.location = window.location.href;
                urlDetails.origin = window.location.origin;
                urlDetails.path = window.location.pathname;
                isExclusiveOverride = false;
            }

        } else if (!isSocial) {
            urlDetails.location = window.location.href;
            urlDetails.origin = window.location.origin;
            urlDetails.path = window.location.pathname;
        }
    }

    function showLoader() {
        isInProgress = true;
        $(container).find(".on-loader").show();
    }

    function hideLoader() {
        isInProgress = false;
        $(container).find(".on-loader").hide();
    }

    function preventEvents() {
        // Prevent any nav menu clicks
        $(document.body).delegate('#on-container [data-target-container]', "click", function (e) {
            if (isExcluded) {
                e.preventDefault();
                return false;
            }
        });

        $(document.body).delegate("#on-container .on-nav-item .dropdown", "click", function (e) {
            if (isExcluded) {
                e.preventDefault();
                return false;
            }
        });
    }

    function registerNavEvents() {
        $(document.body).undelegate('#on-container [data-target-container]', "click");
        $(document.body).delegate('#on-container [data-target-container]', "click", function () {

            $(container).find(".on-nav-item").removeClass("on-active");
            var targetContainer = $(this).data("target-container");

            if (isLimitedAccess && (targetContainer == VIEW_LIST.FACTCHECK ||
                targetContainer == VIEW_LIST.QUICKRATE ||
                targetContainer == VIEW_LIST.ADVANCEDRATINGS)) {
                showView(VIEW_LIST.EXCLUDED);

            } else if (!isIndexed && (targetContainer == VIEW_LIST.FACTCHECK ||
                targetContainer == VIEW_LIST.QUICKRATE ||
                targetContainer == VIEW_LIST.ADVANCEDRATINGS)) {
                showView(VIEW_LIST.ADDDOMAIN);

            } else {
                $(this).closest(".on-nav-item").addClass("on-active");
                $(".on-target-container").removeClass("on-hidden").addClass("on-hidden");
                $("#" + targetContainer).removeClass("on-hidden");
            }

            if (targetContainer == VIEW_LIST.FACTCHECK) {
                sendRequest({
                    action: "post",
                    key: "FactcheckCard",
                    value: {
                        factcheckcard: urlDetails.location,
                    }
                }, function () { });
            }

            return false;

        });
    }

    function sendRequest(data, callback) {
        if (isChrome) {
            chrome.extension.sendRequest(data, callback);
        } else {
            browser.runtime.sendMessage(data, callback);
        }
    }

    function getImageURL(str) {
        if (isChrome) {
            return chrome.extension.getURL(str);
        } else {
            return browser.runtime.getURL(str);
        }
    }

    function authenticated(callback) {

        // Check if already authenticated
        if (config.isUserLoggedIn) {
            callback();
        } else {
            function showLoginScreen() {
                $(container).addClass("onhasframe");
                $(container).append("<iframe src='https://our.news/wp-login.php?extension=1&redirect_to=https://our.news/extension/view.php' width='390' height='680' style='position:absolute;top:0;left:0;'></iframe>");
                hideLoader();
                isInLogin = true;

                var authInterval = setInterval(function () {

                    sendRequest({
                        action: "auth"
                    }, function (result) {

                        if (!result.status) {
                            clearInterval(authInterval);
                            $(container).removeClass("onhasframe");
                            $(container).find("iframe").remove();
                            isInLogin = false;
                            callback();
                        }
                    });

                }, 2000);
            }

            if (config.isUserLoggedIn == false) {
                showLoginScreen();
            } else {
                sendRequest({
                    action: "auth"
                }, function (result) {
                    if (!result.status) {
                        config.isUserLoggedIn = true;
                        callback();
                    } else {
                        config.isUserLoggedIn = false;
                        showLoginScreen();
                    }
                });
            }

        }
    }

    function iconClickHandler(isShowPopup) {

        if ($("#on-container").length && $("#on-container").hasClass("ff-container")) {
            alert("You already running Freedom Forum Institute extension, only one can be opened in a page");
            return;
        }

        if (isShowPopup) {
            if (container && $(container).is(":visible")) {
                hidePopup();
            } else if (container) {
                showPopup(function () {
                    updateLocation();
                    refreshPopup();
                });
            } else {
                showPopup(function () {
                    preventEvents();
                    updateLocation();
                    refreshPopup();
                    //showView(VIEW_LIST.NEWSTRITION);
                });

            }
        }
    }

    function init() {

        if (isChrome) {
            chrome.runtime.onMessage.addListener(function (request, sender) {
                iconClickHandler(request.showPopup);
            });
        } else {
            browser.runtime.onMessage.addListener(function (request, sender) {
                iconClickHandler(request.showPopup);
            });
        }

        if (location.host == "www.facebook.com") {
            urlDetails.location = location.href;
            markFacebookPosts();
            isSocial = true;

        } else if (location.host == "twitter.com") {
            urlDetails.location = location.href;
            markTwitterPosts();
            isSocial = true;
        }

    }

    function recordEventPopupShow() {
        setTimeout(function () {
            if (config.isUserLoggedIn) {
                sendRequest({
                    action: "post",
                    key: "PopupOpened",
                    value: {
                        popupopened: urlDetails.location,
                    }
                }, function () { });
            }
        }, 1500);
    }

    function showPopup(callback) {
        if (!container) {
            // send request to backend and initialize
            sendRequest({
                action: "loadFile"
            }, function (data) {

                config = data.config;
                var $html = $('<div />', {
                    html: data.htmlContent
                });

                $html.find("img").each(function (i, e) {
                    $(e).attr("src", getImageURL($(e).attr("src")));
                });

                $(document.body).append($html.html());
                container = $("#on-container");
                recordEventPopupShow();

                // Fix width of nav icons
                $(container).find("#on-nav .on-nav-item").not(".no-effects").each(function (i, e) {
                    $(e).width($(e).width());
                });
                if (callback) callback();
            });

        } else {
            $(container).show();
            recordEventPopupShow();
            if (callback) callback();
        }
    }

    function hidePopup() {
        $(container).hide();
    }

    function excludedURL(callback) {

        // If URL is excluded, do not show any values
        sendRequest({
            action: "excludedURL",
            urlDetails: urlDetails
        }, function (result) {
            if (result == "false") {
                if (urlDetails.location && urlDetails.path) {
                    if (urlDetails.path == "/" || urlDetails.path == "") {
                        callback("true", true);
                        return;
                    }
                }
            }

            callback(result);
        });
    }

    function refreshPopup() {

        showLoader();
        updateLocation();
        var hasErroredOut = false;
        var timeout = setTimeout(function () {

            // show error view
            hasErroredOut = true;
            showView(VIEW_LIST.ERROR);
            hideLoader();
            isIndexed = false;
            isExcluded = true;

        }, 10000);

        sendRequest({
            "action": "init",
            "urlDetails": urlDetails
        }, function (result) {

            clearTimeout(timeout);

            if (hasErroredOut) {
                hideLoader();
                return;
            }

            if (!result) {
                hideLoader();
                refreshPopup();
            }

            config.isUserLoggedIn = result.config.isUserLoggedIn;

            // Refresh every 10 seconds
            if (refreshCount > 1) {
                refreshCount--;

            } else {
                refreshCount--;
                requestTimeout(function () {
                    // there should not be already ongoing POST
                    if (!isInProgress && !isInLogin && container.is(":visible")) {
                        // user should not be in login process
                        refreshPopup();
                    }
                }, 10000);

                refreshCount++;
            }

            if (config.isUserLoggedIn) {
                $(container).find(".on-auth-only").removeClass("on-hidden");
            } else {
                $(container).find(".on-auth-only").addClass("on-hidden");
                $(container).find(".on-noauth-only").removeClass("on-hidden");
            }

            // SHOW USERNAME & POINTS
            // Reset Context Menu (Me)
            $(container).find(".on-cm-my-creds").text("0");
            $(container).find(".on-cm-my-notifications").text("0");
            $(container).find(".on-dropdown-my-profile").attr("href", "");

            if (result.me) {
                $(container).find(".on-auth-only").removeClass("on-hidden");
                $(container).find(".on-cm-my-creds").text(result.me.creds + "");
                $(container).find(".on-cm-my-notifications").text(result.me.notifycount + "");
                $(container).find(".on-cm-my-notifications-top").text(result.me.notifycount + "");
                $(container).find(".on-cm-my-notifications-top").closest("a").attr("href", result.me.profilelink + "notifications");
                $(container).find(".on-dropdown-my-profile").attr("href", result.me.profilelink);
                $(container).find(".on-dropdown-my-notifs").attr("href", result.me.profilelink + "notifications");

                $(container).find(".on-welcome-name").text(result.me.name);
                $(container).find(".on-welcome-name").closest("a").attr("href", result.me.profilelink);
                $(container).find(".on-welcome-point").text(result.me.points + "");
                $(container).find(".on-welcome-point-tooltip").text(result.me.pointsdesc + "");
                $(container).find(".on-welcome-notifs-tooltip").text(result.me.notifsdesc + "");

            } else {
                $(container).find(".on-auth-only").addClass("on-hidden");
                $(container).find(".on-noauth-only").removeClass("on-hidden");
            }

            if (detectAdBlocker()) {
                $(container).find(".on-nav-item").removeClass("on-active");
                showView(VIEW_LIST.ADDETECTED);
                isIndexed = false;
                isExcluded = true;
                isLimitedAccess = false;
                hideLoader();

            } else {

                if (isExclusiveOverride) {
                    getFullOnData();

                } else {

                    excludedURL(function (data, limitedAccess) {
                        if (data == "true" && limitedAccess) {
                            // Show excluded view
                            $(container).find(".on-nav-item").removeClass("on-active");
                            showView(VIEW_LIST.NEWSTRITION);
                            isIndexed = false;
                            isExcluded = true;
                            isLimitedAccess = true;
                            hideLoader();
                            getFullOnData();

                        } else if (data == "true" && !limitedAccess) {
                            // Show excluded view
                            $(container).find(".on-nav-item").removeClass("on-active");
                            showView(VIEW_LIST.EXCLUDED);
                            isIndexed = false;
                            isExcluded = true;
                            isLimitedAccess = false;
                            hideLoader();

                        } else {
                            isExcluded = false;
                            isLimitedAccess = false;
                            getFullOnData();
                        }
                    });
                }
            }


            function getFullOnData() {

                // If article is included in database or not
                if (result.error == "TRUE") {
                    isIndexed = false;

                } else {
                    isIndexed = true;
                }

                // Mandatory show Newstrition
                if ((!$(container).find("#on-loading-view").hasClass("on-hidden")) ||
                    (!$(container).find("#on-url-excluded").hasClass("on-hidden"))) {
                    showView(VIEW_LIST.NEWSTRITION);
                }

                // Newstrition
                $(container).find(".on-newstrition-hide-on-na").removeClass("on-hidden");
                $(container).find(".on-newstrition-hide-off-na").addClass("on-hidden");

                if (result.newstrition && result.newstrition.name) {
                    if (result.newstrition.image) {
                        $(container).find(".on-newstrition-publisher").removeClass("on-hidden");
                        $(container).find(".on-newstrition-logo").removeClass("on-hidden").attr("src", result.newstrition.image);
                        $(container).find(".on-newstrition-logo-link").attr("href", "//" + result.newstrition.url);
                    } else {
                        $(container).find(".on-newstrition-logo").addClass("on-hidden");
                        $(container).find(".on-newstrition-publisher").removeClass("on-hidden").text(result.newstrition.name);
                    }
                    if (result.newstrition.launchdate) {
                        $(container).find(".on-newstrition-est").removeClass(".on-hidden").text("Est. " + result.newstrition.launchdate);
                    } else {
                        $(container).find(".on-newstrition-est").addClass("on-hidden");
                    }

                    // TODO
                    $(container).find(".on-newstrition-verified").text(result.newstrition.verified);
                    $(container).find(".on-newstrition-verified-help-text").text(result.newstrition.verifiedhelp);
                    $(container).find(".on-newstrition-desc").text(result.newstrition.description);
                    $(container).find(".on-newstrition-hqlocation").text(result.newstrition.hqlocation);
			$(container).find(".on-newstrition-allsides").text(result.newstrition.allsides);
			$(container).find(".on-newstrition-allsides").attr("href", result.newstrition.allsidesurl);

                    if (result.newstrition.ownedby) {
                        $(container).find(".on-newstrition-owned-by").text(result.newstrition.ownedby);
                        $(container).find(".on-newstrition-ownership").removeClass("on-hidden");
                    } else {
                        $(container).find(".on-newstrition-ownership").addClass("on-hidden");
                    }

                    if (result.newstrition.claimedlink) {
                        $(container).find(".on-newstrition-claimedby").text("Profile Owner: " + result.newstrition.claimedby);
                        $(container).find(".on-newstrition-claimedby").removeClass("on-hidden");
                        $(container).find(".on-newstrition-claimedby-none").addClass("on-hidden");
                    }
                    else {
                        $(container).find(".on-newstrition-claimedby-none").removeClass("on-hidden");
                        $(container).find(".on-newstrition-claimlink").attr("href", "https://our.news/publisher/?pid=" + result.newstrition.pid);
                    }

                    $(container).find(".on-newstrition-more").attr("href", "https://our.news/publisher/?pid=" + result.newstrition.pid);

                    if (result.newstrition.facebook) {
                        $(container).find(".on-newstrition-social-icons-fb").removeClass("on-hidden").attr("href", result.newstrition.facebook);
                    } else {
                        $(container).find(".on-newstrition-social-icons-fb").addClass("on-hidden");
                    }

                    if (result.newstrition.twitter) {
                        $(container).find(".on-newstrition-social-icons-twitter").removeClass("on-hidden").attr("href", result.newstrition.twitter);
                    } else {
                        $(container).find(".on-newstrition-social-icons-twitter").addClass("on-hidden");
                    }

                    if (result.newstrition.wikipedia) {
                        $(container).find(".on-newstrition-social-icons-wikipedia").removeClass("on-hidden").attr("href", result.newstrition.wikipedia);
                    } else {
                        $(container).find(".on-newstrition-social-icons-wikipedia").addClass("on-hidden");
                    }

                } else {

                    // no publisher data
                    $(container).find(".on-newstrition-hide-on-na").addClass("on-hidden");
                    $(container).find(".on-newstrition-hide-off-na").removeClass("on-hidden");
                }

                // Quick Rate
                $('[data-group="group1"]').removeClass("on-active");
                $('[data-group="group2"]').removeClass("on-active");
                $('[data-group="group3"]').removeClass("on-active");

                if (result.mine && result.mine.quicks.length) {

                    $.each(result.mine.quicks, function (i, e) {

                        if (e == "accept" || e == "reject") {

                            $('[data-value="' + e + '"]').addClass("on-active");

                        } else if (e == "biasleft" || e == "biasright" || e == "nobias") {

                            $('[data-value="' + e + '"]').addClass("on-active");

                        } else if (e == "real" || e == "bait" || e == "opinion" || e == "satire" || e == "notnews") {

                            $('[data-value="' + e + '"]').addClass("on-active");

                        }
                    });
                }

                // Tripple dot menus
                if (result.meta && result.meta.oururl) {
                    $(container).find(".on-dropdown-share").show();
                    $(container).find(".on-dropdown-comments").show();
                    $(container).find(".on-dropdown-facebook").show();
                    $(container).find(".on-dropdown-twitter").show();

                    $(container).find("#on-popup-share-link").text(result.meta.oururl);
                    $(container).find(".on-dropdown-comments").attr("href", result.meta.oururl + "#comments");
                    $(container).find(".on-dropdown-facebook").attr("href", "https://www.facebook.com/sharer/sharer.php?u=" + result.meta.oururl);
                    $(container).find(".on-dropdown-twitter").attr("href", "https://twitter.com/intent/tweet?text=" + result.meta.oururl);

                } else {
                    $(container).find(".on-dropdown-share").hide();
                    $(container).find(".on-dropdown-comments").hide();
                    $(container).find(".on-dropdown-facebook").hide();
                    $(container).find(".on-dropdown-twitter").hide();
                }


                // Fact Check 
                if (result.meta) {
                    $(container).find(".onarm-date").text(result.meta.date);
                    $(container).find(".onarm-publisher").text(result.meta.publisher);
                    $(container).find(".onarm-pub-link").attr("href", "https://our.news/publisher/?pid=" + result.meta.pid);

                    $(container).find(".onarm-author").text(result.meta.author);
                    $(container).find(".onarm-auth-link").attr("href", "https://our.news/a/?aid=" + result.meta.aid);

		$(container).find(".onarm-editor-link").attr("href", "https://our.news/editor/?eid=" + result.meta.eid);
		$(container).find(".onarm-editor").text(result.meta.editor);

                    $(container).find(".onarm-trending-score").text(result.meta.trending);
                    $(container).find(".onarm-total-ratings").text(result.meta.totalratings);

                    $(container).find("#on-popup-share-link").text(result.meta.oururl);
                }


                if (result.sources) {

                    // Article Sources
                    $(container).find(".article-source-item").remove();
                    var articleCount = 0;
                    for (var i = 0; i < result.sources.length && articleCount < 5; i++) {

                        if (result.sources[i].uid == 0 || (result.sources[i].uid == "" && result.sources[i].uid == null)) {
                            var sourceItem = $(container).find(".article-source-item-template").clone().removeClass("article-source-item-template").removeClass("on-hidden");
                            sourceItem.addClass("article-source-item");
                            var displaysource = result.sources[i].displaysource.length > 33 ? result.sources[i].displaysource.substring(0, 33) + "..." : result.sources[i].displaysource;

                            $(sourceItem).data("URL", result.sources[i].url);
                            var link = $("<a>").attr("href", result.sources[i].url).attr("target", "_blank").text(displaysource);
                            sourceItem.find(".article-source-url").append(link);
                            if (result.mine && result.mine.sourcevotes) {
                                $.each(result.mine.sourcevotes, function (u, v) {
                                    if (v.fid == result.sources[i].fid) {
                                        if (v.updown == "1") {
                                            $(sourceItem).find(".article-source-thumbs-up img").addClass("active");
                                        } else {
                                            $(sourceItem).find(".article-source-thumbs-down img").addClass("active");
                                        }
                                    }
                                });
                            }
                            sourceItem.find(".article-source-votes").text(result.sources[i].votes);
                            $(container).find(".article-source-item-template").parent().append(sourceItem);
                            articleCount++;
                        }
                    }

                    if (articleCount == 0) {
                        var sourceItem = $(container).find(".article-source-item-template").clone().removeClass("article-source-item-template").removeClass("on-hidden");
                        sourceItem.addClass("article-source-item");
                        sourceItem.text("No sources found yet.");
                        $(container).find(".article-source-item-template").parent().append(sourceItem);
                    }

                    // User Contributed Sources
                    $(container).find(".contributed-source-item").remove();
                    var contributedCount = 0;
                    for (var i = 0; i < result.sources.length && contributedCount < 5; i++) {

                        if (result.sources[i].uid != "" && result.sources[i].uid != null) {
                            var sourceItem = $(container).find(".contributed-source-item-template").clone().removeClass("contributed-source-item-template").removeClass("on-hidden");
                            sourceItem.addClass("contributed-source-item");
                            var displaysource = result.sources[i].displaysource.length > 26 ? result.sources[i].displaysource.substring(0, 26) + "..." : result.sources[i].displaysource;

                            $(sourceItem).data("URL", result.sources[i].url);
                            var link = $("<a>").attr("href", result.sources[i].url).attr("target", "_blank").text(displaysource);
                            sourceItem.find(".contributed-source-url").append(link);
                            if (result.mine && result.mine.sourcevotes) {
                                $.each(result.mine.sourcevotes, function (u, v) {
                                    if (v.fid == result.sources[i].fid) {
                                        if (v.updown == "1") {
                                            $(sourceItem).find(".contributed-source-thumbs-up img").addClass("active");
                                        } else {
                                            $(sourceItem).find(".contributed-source-thumbs-down img").addClass("active");
                                        }
                                    }
                                });
                            }
                            sourceItem.find(".contributed-source-votes").text(result.sources[i].votes);

                            if (result.sources[i].type != "" && result.sources[i].type != null) {
                                var sourcetype = result.sourcetypes;
                                var type = "";
                                for (var k = 0; k < sourcetype.length; k++) {
                                    if (sourcetype[k].sourcetypeid == result.sources[i].type) {
                                        type = sourcetype[k].type;
                                    }
                                }

                                if (type) {
                                    sourceItem.find(".contributed-source-label").text(type);
                                } else {
                                    sourceItem.find(".contributed-source-label").hide();
                                }
                            }

                            $(container).find(".contributed-source-item-template").parent().append(sourceItem);
                            contributedCount++;
                        }
                    }

                    if (contributedCount == 0) {
                        var sourceItem = $(container).find(".contributed-source-item-template").clone().removeClass("contributed-source-item-template").removeClass("on-hidden")
                        sourceItem.addClass("contributed-source-item");
                        sourceItem.text("No sources added yet.");
                        $(container).find(".contributed-source-item-template").parent().append(sourceItem);
                    }
                }

                if (result.sourcetypes) {
                    // Add source types
                    if (!$(container).find("#on-select-sourcetypes option").length) {
                        $.each(result.sourcetypes, function (i, e) {
                            $(container).find("#on-select-sourcetypes").append("<option value='" + e.sourcetypeid + "'>" + e.type + "</option>");
                        });
                    }
                }

                // Fact Check Top Indicators
                if (result.meta) {

                    // Article Preview
                    if (result.meta.thumb) {
                        var articlePreview = $(container).find(".on-article-preview").eq(0).clone().removeClass("on-hidden");
                        $(container).find(".on-article-preview").remove();
                        $(container).find("#on-quick-rate, #on-fact-check,#on-advanced-ratings").prepend(articlePreview);

                        $(container).find(".on-article-preview").show();
                        $(container).find(".on-article-preview-thumb").attr("src", result.meta.thumb);
                        var previewTitle = result.meta.title.length > 75 ? result.meta.title.substring(0, 75) + "..." : result.meta.title;
                        $(container).find(".on-article-preview-heading").html(previewTitle);
                    } else {
                        $(container).find(".on-article-preview").hide();
                    }

                    // Fact Check Top Indicators
                    $(container).find(".on-top-indicators").addClass("on-hidden");
                    $(container).find(".on-top-indicators-item").remove();

                    if (result.meta.indicators && result.meta.indicators.length) {
                        $.each(result.meta.indicators, function (x, y) {

                            var iitem = $(container).find(".on-top-indicators-item-template").clone().removeClass("on-hidden").removeClass("on-top-indicators-item-template").addClass("on-top-indicators-item");
                            $(iitem).find(".on-top-indicators-name").text(y.name);
                            $(iitem).find(".on-top-indicators-score").attr("href", y.url);
                            $(iitem).find(".on-top-indicators-score span").text(y.value);

                            $(container).find(".on-top-indicators-item-template").parent().append(iitem);
                        });
                        $(container).find(".on-top-indicators").removeClass("on-hidden");
                    }
                }


                // Populate Tags
                if (config.tags) {
                    if (!$(container).find("#selectOnTags option").length) {

                        $.each(config.tags, function (i, e) {
                            $(container).find("#selectOnTags").append("<option value='" + e.type + "'>" + e.displaytext + "</option>");
                        });
                    }
                }


                // Advanced Ratings
                var advancedRatings = $(container).find("#on-advanced-ratings");

                advancedRatings.find(".onar-spin .onar-spin-range").val(50);
                advancedRatings.find(".onar-spin .onar-spin-yours").text("NA");
                advancedRatings.find(".onar-political .onar-political-left").text("None");

                advancedRatings.find(".onar-trust .onar-trust-range").val(50);
                advancedRatings.find(".onar-trust .onar-trust-yours").text("NA");

                advancedRatings.find(".onar-accuracy .onar-accuracy-range").val(50);
                advancedRatings.find(".onar-accuracy .onar-accuracy-yours").text("NA");

                advancedRatings.find(".onar-relevance .onar-accuracy-range").val(50);
                advancedRatings.find(".onar-relevance .onar-accuracy-yours").text("NA");

                advancedRatings.find(".on-you-rated").addClass("on-hidden");
                advancedRatings.find(".on-you-rated-date").text("");


                if (result.mine && result.mine.ratings.length) {

                    $.each(result.mine.ratings, function (i, e) {

                        if (e.spin) {
                            var spinInt = parseInt(parseFloat(e.spin) * 100);
                            var spinLabel = "Left";
                            var spinInPercent = 0;

                            if (spinInt < 0) {
                                spinLabel = "Left";
                                spinInPercent = (100 - Math.abs(spinInt)) / 2;

                            } else if (spinInt > 0) {
                                spinLabel = "Right";
                                spinInPercent = (100 + Math.abs(spinInt)) / 2;
                            }

                            advancedRatings.find(".onar-spin .onar-spin-range").val(Math.abs(spinInPercent));
                            advancedRatings.find(".onar-spin .onar-spin-yours").text(Math.abs(spinInt) + "%");
                            advancedRatings.find(".onar-political .onar-political-left").text(spinLabel);

                        } else if (e.trust) {
                            advancedRatings.find(".onar-trust .onar-trust-range").val(parseInt(e.trust));
                            advancedRatings.find(".onar-trust .onar-trust-yours").text(e.trust + "%");

                        } else if (e.accuracy) {
                            advancedRatings.find(".onar-accuracy .onar-accuracy-range").val(parseInt(e.accuracy));
                            advancedRatings.find(".onar-accuracy .onar-accuracy-yours").text(e.accuracy + "%");

                        } else if (e.relevance) {
                            $(container).find("#selectOnTags").val(e.relevance.toUpperCase());
                            //advancedRatings.find(".onar-relevance .onar-accuracy-range").val(parseInt(e.relevance));
                            //advancedRatings.find(".onar-relevance .onar-accuracy-yours").text(e.relevance + "%");

                        } else if (e.date) {
                            var ddd = new Date(e.date);
                            var formatDate = ('0' + (ddd.getMonth() + 1)).slice(-2) + "/" + ('0' + ddd.getDate()).slice(-2) + "/" + ddd.getFullYear();
                            advancedRatings.find(".on-you-rated-date").text(formatDate);
                            advancedRatings.find(".on-you-rated").removeClass("on-hidden");
                        }

                    });

                }

                if (result.ratings && result.ratings.ratings) {
                    $(".on-ratings-total").text(result.ratings.ratings.total);

                    // TOTAL SETTINGS
                    if (result.ratings.ratings.spin == "None") {
                        advancedRatings.find(".onar-political .onar-political-right").text("None");
                    } else {
                        advancedRatings.find(".onar-political .onar-political-right").text(result.ratings.ratings.spin);
                    }

                    if (result.ratings.ratings.spinvalue == 0) {
                        advancedRatings.find(".onar-spin .onar-spin-totals").text("NA");
                    } else {
                        advancedRatings.find(".onar-spin .onar-spin-totals").text(Math.round(result.ratings.ratings.spinvalue) + "%");
                    }

                    if (result.ratings.ratings.trust == 0) {
                        advancedRatings.find(".onar-trust .onar-trust-totals").text("NA");
                    } else {
                        advancedRatings.find(".onar-trust .onar-trust-totals").text(Math.round(result.ratings.ratings.trust) + "%");
                    }

                    if (result.ratings.ratings.accuracy == 0) {
                        advancedRatings.find(".onar-accuracy .onar-accuracy-totals").text("NA");
                    } else {
                        advancedRatings.find(".onar-accuracy .onar-accuracy-totals").text(Math.round(result.ratings.ratings.accuracy) + "%");
                    }
                }

                if (result.ratings && result.ratings.ratings) {
                    // Quality Ratings
                    var qualityRate = Math.round(result.ratings.ratings.quality);

                    if (qualityRate == 0) {
                        $(container).find(".on-score").text("NA");
                    } else {
                        $(container).find(".on-score").text(qualityRate + "%");
                    }
                } else {
                    $(container).find(".on-score").text("NA");
                }
                // RATINGS END


                // Raters
                $(container).find(".on-ratings-top-raters").empty();
                $(container).find(".on-ratings-top-raters-label").removeClass("on-hidden");
                $(container).find(".on-ratings-login-view").addClass("on-hidden");


                if (result.raters && result.raters.length) {
                    $.each(result.raters, function (i, e) {
                        $(".on-ratings-top-raters").append("<a target='_blank' href='" + e.userlink + "' class='on-tag'>" + e.nicename + " <span class='on-point'>" + e.totalpoints + "</span>" + "</a>");
                    });
                } else {

                    // If not authorized, show login hyperlink
                    if (!config.isUserLoggedIn) {
                        $(container).find(".on-ratings-login-view").removeClass("on-hidden");
                        $(container).find(".on-ratings-top-raters-label").addClass("on-hidden");
                    }
                }

                // Relevance Tags
                if (result.ratings && result.ratings.rating) {
                    $(container).find(".on-ratings-relevance-tags").empty();
                    if (result.ratings.ratings.relevance && result.ratings.ratings.relevancevalue) {
                        $(container).find(".on-ratings-relevance-tags").append("<span class='on-tag'>" +
                            result.ratings.ratings.relevance + "<span class='on-point'>" +
                            Math.round(result.ratings.ratings.relevancevalue) + "%</span></span>").show();
                    }
                }

                if (result.quality) {
                    // Quality text
                    $(container).find(".on-quality-score-description").text(result.quality.quality);
                }

                registerNavEvents();
                hideLoader();
            }

            // *********************************
            // POST ACTIONS STARTS HERE
            // *********************************

            // Return if already registered
            if (isAppEventsRegistered) return;

            $(document.body).delegate(".on-dropdown-facebook,.on-dropdown-twitter", "click", function (e) {
                var t = e.target;
                var link = $(t).attr("href");
                window.open(link, '', 'scrollbars=1,height=500,width=500');

                e.preventDefault();
            });

            $(document.body).delegate(".on-tooltip", "mouseenter", function () {
                if ($.trim($(this).parent().find(".on-tooltiptext").text()).length) {
                    $(this).parent().find(".on-tooltiptext").show();
                }
            });

            $(document.body).delegate(".on-tooltip", "mouseleave", function () {
                $(this).parent().find(".on-tooltiptext").hide();
            });

            $(document.body).delegate(".on-tooltip-notifs", "mouseenter", function () {
                if ($.trim($(this).parent().find(".on-tooltiptext-notifs").text()).length) {
                    $(this).parent().find(".on-tooltiptext-notifs").show();
                }
            });

            $(document.body).delegate(".on-tooltip-notifs", "mouseleave", function () {
                $(this).parent().find(".on-tooltiptext-notifs").hide();
            });

            $(document.body).delegate("#on-container .on-dropdown-share", "click", function (e) {

                $(container).find(".on-nav-item .dropdown").removeClass("is-active");
                $(container).find("#on-popup-share-link").show();
                e.stopPropagation();
                e.preventDefault();

            });

            $(document.body).delegate("#on-container .on-nav-item .dropdown", "click", function (e) {

                if (!isExcluded && ($(e.target).is("img") || !$(e.target).hasClass("dropdown-item"))) {

                    if ($(".on-nav-item .dropdown").hasClass("is-active")) {
                        $(".on-nav-item .dropdown").removeClass("is-active");
                    } else {
                        $(".on-nav-item .dropdown").addClass("is-active");
                    }

                    e.stopPropagation();
                    e.preventDefault();
                }

            });

            $(document.body).click(function (e) {
                $(".on-nav-item .dropdown").removeClass("is-active");
                if ($(e.target).attr("id") != "on-popup-share-link") {
                    $(container).find("#on-popup-share-link").hide();
                }
            });

            $(container).mousedown(function () {
                isInProgress = true;
            });

            $(container).mouseup(function () {
                isInProgress = false;
            });

            // Record events
            $(document.body).delegate("#on-container .article-source-url a", "click", function () {
                if (config.isUserLoggedIn) {
                    sendRequest({
                        action: "post",
                        key: "SourceClick",
                        value: {
                            sourceclick: urlDetails.location,
                        }
                    }, function () { });
                }
            });

            // Quick ratings
            $(container).find(".onqr-action").on("click", function (e) {

                var that = this;

                authenticated(function () {
                    var value = $(that).attr("data-value").toLowerCase();
                    showLoader();
                    sendRequest({
                        action: "post",
                        key: "Quicks",
                        value: {
                            quickurl: urlDetails.location,
                            quicktype: value
                        }
                    }, refreshPopup);

                });

                return false;

            });

            // Add Source
            $(container).find(".btnOnAddSourceURL").on("click", function (e) {
                var that = this;

                authenticated(function () {
                    var url = $(container).find("#txtOnAddSourceURL").val();
                    var sourcetypeid = $(container).find("#on-select-sourcetypes").val();
                    $(container).find("#txtOnAddSourceURL").val("");

                    if (url) {
                        showLoader();
                        sendRequest({
                            action: "post",
                            key: "Sources",
                            value: {
                                sourceurl: urlDetails.location,
                                sourceurlnew: url,
                                sourcetypeid: sourcetypeid
                            }
                        }, function () {

                            showView(VIEW_LIST.FACTCHECK);

                            refreshPopup();

                        });
                    }

                });

                return false;

            });

            // Add Source + Voting
            $(document.body).delegate("#on-container .article-source-thumbs-up", "click", function (e) {

                var that = this;

                authenticated(function () {
                    var dataURL = $(that).closest(".article-source-item").data("URL");
                    showLoader();
                    sendRequest({
                        action: "post",
                        key: "Sources",
                        value: {
                            sourceurl: dataURL,
                            vote: 1
                        }
                    }, refreshPopup);
                });

                return false;
            });

            // Add Source - Voting
            $(document.body).delegate("#on-container .article-source-thumbs-down", "click", function (e) {

                var that = this;

                authenticated(function () {
                    var dataURL = $(that).closest(".article-source-item").data("URL");
                    showLoader();
                    sendRequest({
                        action: "post",
                        key: "Sources",
                        value: {
                            sourceurl: dataURL,
                            vote: -1
                        }
                    }, refreshPopup);
                });

                return false;
            });

            // User Contributed Tags
            // Add Source + Voting
            $(document.body).delegate("#on-container .contributed-source-thumbs-up", "click", function (e) {

                var that = this;

                authenticated(function () {
                    var dataURL = $(that).closest(".contributed-source-item").data("URL");
                    showLoader();
                    sendRequest({
                        action: "post",
                        key: "Sources",
                        value: {
                            sourceurl: dataURL,
                            vote: 1
                        }
                    }, refreshPopup);
                });

                return false;
            });

            // User Contributed Tags
            // Add Source - Voting
            $(document.body).delegate("#on-container .contributed-source-thumbs-down", "click", function (e) {

                var that = this;

                authenticated(function () {
                    var dataURL = $(that).closest(".contributed-source-item").data("URL");
                    showLoader();
                    sendRequest({
                        action: "post",
                        key: "Sources",
                        value: {
                            sourceurl: dataURL,
                            vote: -1
                        }
                    }, refreshPopup);
                });

                return false;
            });


            $(container).find('[type="range"]').on("input", function (e) {

                var that = this;
                authenticated(function () {

                    if ($(e.target).closest("tr").hasClass("onar-spin")) {

                        var val = $(e.target).val();

                        if (val < 50) {
                            $(".onar-spin .onar-spin-yours").text(100 - (val * 2) + "%");
                        } else if (val > 50) {
                            $(".onar-spin .onar-spin-yours").text(((val * 2) - 100) + "%");
                        } else {
                            $(".onar-spin .onar-spin-yours").text("NA");
                        }

                        if ($(e.target).val() < 50) {
                            $(e.target).closest("tr").next().find(".onar-political-left").text("Left");
                        } else {
                            $(e.target).closest("tr").next().find(".onar-political-left").text("Right");
                        }
                    } else {

                        $(e.target).closest("tr").find(".onar-yours").text($(e.target).val() + "%");
                    }
                });

                return false;

            });

            $(container).find('[type="range"]').on("change", function (e) {

                var that = this;

                authenticated(function () {
                    // POST TO BACKEND
                    var ratingType = $(that).data("value");
                    var rating = $(that).val();
                    var value = "";

                    switch (ratingType) {
                        case "SPIN":

                            var finalValue = rating;

                            if (finalValue < 50) {

                                finalValue = (100 - (finalValue * 2));
                                finalValue = -(finalValue / 100);

                            } else if (finalValue > 50) {

                                finalValue = ((finalValue * 2) - 100);
                                finalValue = finalValue / 100;
                            }

                            value = {
                                multibarurl: urlDetails.location,
                                spin: finalValue
                            }
                            break;
                        case "TRUST":
                            value = {
                                multibarurl: urlDetails.location,
                                trust: rating
                            }
                            break;
                        case "ACCURACY":
                            value = {
                                multibarurl: urlDetails.location,
                                accuracy: rating
                            }
                            break;
                    }

                    showLoader();
                    sendRequest({
                        action: "post",
                        key: "Ratings",
                        value: value
                    }, refreshPopup);

                });

                return false;

            });

            // Tags
            $(container).find(".btnSelectOnTags").on("click", function () {

                var that = this;

                authenticated(function () {
                    var selectedVal = $(container).find("#selectOnTags").val()
                    var value = {
                        multibarurl: urlDetails.location,
                        relevance: selectedVal
                    };

                    showLoader();
                    sendRequest({
                        action: "post",
                        key: "Ratings",
                        value: value
                    }, refreshPopup);
                });

                return false;
            });


            // Add article source
            $(document.body).delegate("#btnOnAddSource", "click", function () {

                var that = this;

                authenticated(function () {
                    $(container).find("#on-add-source-modal").removeClass("on-hidden");
                });

                return false;
            });

            isAppEventsRegistered = true;

        }); // end of local method

    } // end of method


    // Use this instead of setinterval
    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function ( /* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    var prevCallDate = new Date().getTime();

    function requestTimeout(fn, delay) {
        if (!window.requestAnimationFrame &&
            !window.webkitRequestAnimationFrame &&
            !(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && // Firefox 5 ships without cancel support
            !window.oRequestAnimationFrame &&
            !window.msRequestAnimationFrame)
            return window.setTimeout(fn, delay);

        var start = new Date().getTime(),
            handle = new Object();

        function loop() {
            var current = new Date().getTime(),
                delta = current - start;

            if (delta >= delay && (current - prevCallDate) >= delay) {
                prevCallDate = new Date().getTime();
                fn.call()
            } else {
                handle.value = requestAnimFrame(loop)
            };
        };

        handle.value = requestAnimFrame(loop);
        return handle;
    };

    // PREVIEW URL TO DB
    $(document.body).delegate("#btnOnAddURLPreview", "click", function () {

        // POST current URL to backend
        authenticated(function () {
            var value = {
                urlpreview: urlDetails.location
            };

            showLoader();
            sendRequest({
                action: "post",
                key: "NewDomain",
                value: value
            }, function (d) {

                d = JSON.parse(d.responseText);
                var currentFrame = $(container).find("#on-domain-preview");

                showView(VIEW_LIST.DOMAINPREVIEW);

                currentFrame.find(".on-preview-content-title").text(d.title);
                currentFrame.find(".on-preview-content-desc").text(d.description.substring(0, 200) + "...");
                currentFrame.find(".on-preview-content-image").attr("src", d.imageurl);

                // load categories
                $(container).find(".on-select-category").empty();

                if (config.categories.length) {

                    var defaultCategory = config.defaultCategory;

                    $.each(config.categories, function (i, e) {
                        if (e.id == defaultCategory) {
                            $(container).find(".on-select-category").append("<option selected value='" + e.id + "'>" + e.name + "</option>");
                        } else {
                            $(container).find(".on-select-category").append("<option value='" + e.id + "'>" + e.name + "</option>");
                        }
                    });
                }

                hideLoader();
                refreshPopup();

            });
        });

        return false;

    });

    $(document.body).delegate(".on-ratings-login-view a", "click", function () {

        authenticated(function () {
            showView(VIEW_LIST.ADVANCEDRATINGS);

            refreshPopup();
        });

    });


    // ADD URL TO DB
    $(document.body).delegate("#btnOnAddURLIndexing", "click", function () {

        // POST current URL to backend
        authenticated(function () {

            var selectedCategory = $(container).find(".on-select-category").val();

            var value = {
                submiturl: urlDetails.location,
                categoryid: selectedCategory
            };

            showLoader();

            showView(VIEW_LIST.DOMAINADDINGWIP);

            sendRequest({
                action: "post",
                key: "NewDomain",
                value: value
            }, function () {
                hideLoader();
                showView(VIEW_LIST.FACTCHECK);
                refreshPopup();

            });
        });

        return false;

    });


    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    //           SOCIAL POST HANDLING
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

    function markTwitterPosts() {
        $(".js-stream-item").each(function (i, e) {

            // Twitter threads
            if ($(e).closest(".ThreadedDescendants").length) return;

            //if ($(e).closest(".js-stream-item").length) return;

            if ($(e).hasClass("on-marked")) return;
            if ($(e).hasClass("js-activity")) return;

            var injectClick = $("<span>").addClass("on-one-click-btn");
            injectClick.html("<img width='24px' src='" + getImageURL("images/logo-64.png") + "' />");
            //$(e).find(".ProfileTweet-action").append(injectClick);

            $(e).find(".content").eq(0).css("position", "relative").append(injectClick);

            $(injectClick).click(function (ele) {

                ele.preventDefault();
                ele.stopPropagation();

                if ($(ele.currentTarget).data("activated") == "active") {
                    hidePopup();
                    $(ele.currentTarget).data("activated", "");
                    return;
                }

                showPopup(function () {
                    showView(VIEW_LIST.LOADING);
                    $(".on-one-click-fb-btn").data("activated", "");
                    $(ele.currentTarget).data("activated", "active");
                });

                var finalURL = "";
                var iframeContainer = $(e).find(".js-macaw-cards-iframe-container");

                if (iframeContainer.length) {
                    finalURL = iframeContainer.attr("data-card-url")

                } else if ($(e).find(".tweet-text").length) {
                    var firstExternalLink = $(e).find(".tweet-text").find('a[target="_blank"]');
                    if (firstExternalLink.length) {
                        finalURL = firstExternalLink.eq(0).attr("href");
                    }
                }

                urlDetails.pubURL = $(e).find(".username").eq(0).text();
                if (!finalURL) {
                    //urlDetails.pubURL = $(".DashboardProfileCard-content .username").text();
                    finalURL = location.origin + $(e).find('.tweet').eq(0).attr("data-permalink-path");
                }

                urlDetails.location = finalURL;
                authenticated(function () {
                    sendRequest({
                        "action": "finalURL",
                        "urlDetails": urlDetails
                    }, function (data) {
                        if (data.link) {
                            urlDetails.location = data.link;
                        }
                        refreshPopup();
                    });

                });
            });

            $(e).addClass("on-marked");
        });

        setTimeout(function () {
            markTwitterPosts();
        }, 2500);
    }


    function markFacebookPosts() {
        $(".userContentWrapper").each(function (i, e) {

            if ($(e).hasClass("on-marked")) return;
            $(e).find(".on-one-click-fb-btn").remove();

            if ($(e).find(".userContentWrapper").length) return;

            var datatooltip = $(e).find('[data-tooltip-content]').eq(0);

            //if (datatooltip.attr("data-tooltip-content").startsWith("Shared with") && datatooltip.is(":visible")) {
            //    return;
            //}

            if ($(e).find(".fbStreamPrivacy").length == 0 || $(e).find(".fbStreamPrivacy").attr("data-tooltip-content") != "Public") {
                return;
            }

            if ($(e).find("span:contains('Suggested Post')").length) return;
            if ($(e).find("span:contains('Sponsored Posts')").length) return;

            var hasParent = false;
            if ($(e).closest(".userContentWrapper").length) {
                hasParent = true;
            }

            if ($(e).find("div[id^=feed_subtitle]").eq(0).find("[data-tooltip-content^='Shared with']").length) return;

            var injectClick = $("<span>").addClass("on-one-click-fb-btn");
            if (hasParent) { }

            injectClick.html("<img width='24px' src='" + getImageURL("images/logo-64.png") + "' />");
            //$(e).find('[rel="toggle"]').eq(0).css("display", "inline-block");
            $(e).find('[rel="toggle"]').eq(0).parent().append(injectClick);

            $(injectClick).click(function (ele) {

                if ($(ele.currentTarget).data("activated") == "active") {
                    hidePopup();
                    $(ele.currentTarget).data("activated", "");
                    return;
                }

                showPopup(function () {
                    showView(VIEW_LIST.LOADING);
                    $(".on-one-click-fb-btn").data("activated", "");
                    $(ele.currentTarget).data("activated", "active");
                });

                var userContent = $(e).find(".userContent");
                var finalURL = "";

                // Find external link
                var externalLink = userContent.find("a[target='_blank']");
                if (externalLink.length) {
                    // Pick the first one & get the final URL from backend
                    finalURL = $(externalLink).attr("href");
                } else {
                    // Check if post has link (image)
                    var fbStoryAttachmentImage = $(e).find(".userContent").next().find(".fbStoryAttachmentImage");
                    if (fbStoryAttachmentImage.length) {
                        finalURL = $(fbStoryAttachmentImage).closest("a").attr("href");
                    } else {
                        var anyLinkInside = $(e).find(".userContent").next().find("a[target='_blank']");
                        if (anyLinkInside.length) {
                            finalURL = anyLinkInside.eq(0).attr("href");
                        }
                    }
                }

                var profileLink = $(e).find("a[href^='https://www.facebook.com']").eq(0).attr("href");
                profileLink = profileLink.replace("https://www.facebook.com/", "");
                var username = profileLink.split("/")[0];

                urlDetails.pubURL = "facebook.com/" + username;

                if (!finalURL) {
                    finalURL = "https://www.facebook.com" + $(e).find(".timestampContent").closest("a").attr("href");
                }

                if (finalURL.startsWith("https://l.facebook.com/l.php?u=")) {
                    finalURL = finalURL.replace("https://l.facebook.com/l.php?u=", "");
                    finalURL = decodeURIComponent(finalURL);
                }

                urlDetails.location = finalURL.replace("https://l.facebook.com/l.php?u=", "");

                authenticated(function () {
                    sendRequest({
                        "action": "finalURL",
                        "urlDetails": urlDetails

                    }, function (data) {
                        if (data.link) {
                            urlDetails.location = data.link;
                        }
                        refreshPopup();

                    });

                })

            });

            $(e).addClass("on-marked");

        });

        setTimeout(function () {
            markFacebookPosts();
        }, 1500);
    }


    // LESS IMPORTANT CALLS
    sendRequest({
        action: "screenSize",
        value: {
            sw: window.screen.width,
            sh: window.screen.height
        }
    }, function () { });


});
