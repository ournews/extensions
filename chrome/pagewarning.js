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

            const warningImgURL = `https://cdn.our.news/img/caution.png`;
            const warningImg = `<img width='28px' src='${warningImgURL}'/>`;

            if (result.indicators) {
                const helpTxt = `This content has been fact checked. <span id="on-top-warning-link" style="cursor: pointer">Click to view.</span>`;
                const warningURL = result.indicators.url;

                // Prepend in body tag
                const warningbox = "<div id='on-top-warning' " +
                    "style='text-align: center;background-color: #ff9300;cursor:default;" +
                    "color: white;font-size: 22px;font-weight: bold;font-family: sans-serif;padding:10px 0;'>" +
                    warningImg + " " + helpTxt + " " +
                    warningImg + "</div>";
                $(document.body).prepend(warningbox);

                $("#on-top-warning-link").on("click", function () {
                    document.location.href = warningURL;
                });

            } else if (result.verified && result.verified == "Problematic") {
                const helpTxt = result.verifiedhelp;
                const pubLink = "https://our.news/publisher/?pid=" + result.pid;

                // Prepend in body tag
                const warningbox = "<div id='on-top-warning' " +
                    "style='text-align: center;background-color: #ff9300;cursor:pointer;" +
                    "color: white;font-size: 22px;font-weight: bold;font-family: sans-serif;padding:10px 0;'>" +
                    warningImg + " " + helpTxt + " " +
                    warningImg + "</div>";
                $(document.body).prepend(warningbox);

                $("#on-top-warning").on("click", function () {
                    document.location.href = pubLink;
                })

            }
        }
    });

});
