$(function () {

    var isChrome = (navigator.userAgent.indexOf("Chrome") != -1);

    function sendRequest(data, callback) {
        if (isChrome) {
            chrome.extension.sendRequest(data, callback);
        } else {
            browser.runtime.sendMessage(data, callback);
        }
    }

    sendRequest({
        action: "pagewarning",
        pageUrl: document.location.href
    }, function (result) {
        if (result) {
            result = JSON.parse(result);
            if (result.verified && result.verified == "Problematic") {
                var helpTxt = result.verifiedhelp;
                var pubLink = "https://our.news/publisher/?pid=" + result.pid;

                // Prepend in body tag
                var warningbox = "<div id='on-top-warning' " +
                    "style='text-align: center;background-color: #ff9300;cursor:pointer;" +
                    "color: white;font-size: 22px;font-weight: bold;font-family: sans-serif;padding:10px 0;'>" +
                    "<img width='28px' src='https://cdn.our.news/img/caution.png'/> " + helpTxt + " " +
                    "<img width='28px' src='https://cdn.our.news/img/caution.png'/></div>";
                $(document.body).prepend(warningbox);

                $("#on-top-warning").on("click", function () {
                    document.location.href = pubLink;
                })

            }
        }
    });

});
