<?php

// Initialize WordPress
require_once "wp-load.php";

$currentURL = $_REQUEST["curURL"];
$isHTTP = $_REQUEST["isHTTP"];

?>

<?php
if (is_user_logged_in()) {

    echo "<div style='font-family:Arial, sans-serif;padding: 15px; text-align: center;word-break: break-all;'>";
    echo "<h2>Authorized!</h2>";
    echo "</div>";
    ?>

    <script>

        if (window.opener) {
            window.opener.postMessage("Authorized", "*");
        }

    </script>

    <?php

} else {

    echo "<div style='font-family:Arial, sans-serif;padding: 15px; text-align: center;word-break: break-all;'>";
    echo "<h3><a id='openLoginWindow' style='color: blue;' href='https://our.news/wp-login.php?extension=1&redirect_to=https://our.news/viewExtension.php'>" . $currentURL . "</a></h3>";
    echo "</div>";

}

if (!empty($isHTTP)) {
    ?>

    <script>

        var win;

        var link = document.getElementById("openLoginWindow");
        if (link) {
            link.onclick = function (e) {
                win = window.open("https://our.news/wp-login.php?extension=1&redirect_to=https://our.news/viewExtension.php");
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }

        window.addEventListener("message", function (message) {

            if (message.data && message.data == "Authorized") {
                win.close();
                setTimeout(function () {
                    location.href = "https://our.news/viewExtension.php";
                }, 500);
            }

        }, false);


    </script>

    <?php
}

?>
<?php

// Initialize WordPress
require_once "wp-load.php";

$currentURL = $_REQUEST["curURL"];
$isHTTP = $_REQUEST["isHTTP"];

?>

<?php
if (is_user_logged_in()) {

    echo "<div style='font-family:Arial, sans-serif;padding: 15px; text-align: center;word-break: break-all;'>";
    echo "<h2>Authorized!</h2>";
    echo "</div>";
    ?>

    <script>

        if (window.opener) {
            window.opener.postMessage("Authorized", "*");
        }

    </script>

    <?php

} else {

    echo "<div style='font-family:Arial, sans-serif;padding: 15px; text-align: center;word-break: break-all;'>";
    echo "<h3><a id='openLoginWindow' style='color: blue;' href='https://our.news/wp-login.php?extension=1&redirect_to=https://our.news/viewExtension.php'>" . $currentURL . "</a></h3>";
    echo "</div>";

}

if (!empty($isHTTP)) {
    ?>

    <script>

        var win;

        var link = document.getElementById("openLoginWindow");
        if (link) {
            link.onclick = function (e) {
                win = window.open("https://our.news/wp-login.php?extension=1&redirect_to=https://our.news/viewExtension.php");
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }

        window.addEventListener("message", function (message) {

            if (message.data && message.data == "Authorized") {
                win.close();
                setTimeout(function () {
                    location.href = "https://our.news/viewExtension.php";
                }, 500);
            }

        }, false);


    </script>

    <?php
}

?>

