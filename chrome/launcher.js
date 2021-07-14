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
            if (result.indicators) {
                showLauncher();
            }
        }
    });

    function showLauncher() {
        let launcherContainer = $("<div>").attr('id', 'on-launcher');
        let logo = $('<img>').addClass('logo').attr("src", chrome.extension.getURL('/images/launcher.png'));
        let dragHolder = $("<div>").addClass('drag');
        let dragImage = $("<img>").attr('src', chrome.extension.getURL('/images/launcher-drag.png'));
        dragHolder.append(dragImage);
        launcherContainer.append(logo);
        launcherContainer.append(dragHolder);
        $(document.body).append(launcherContainer);

        $(logo).on("click", () => {
            sendRequest({action: 'warning_load_popup', pageUrl: document.location.href}, () => {
            });
            setTimeout(() => {
                launcherContainer.remove();
            }, 500)
        })

        dragElement(document.getElementById("on-launcher"));
    }

    function dragElement(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "header")) {
            // if present, the header is where you move the DIV from:
            document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
});
