function addConfigToBody() {
    if (window.ON_EXT_CONFIG) {
        var el = document.querySelector('body');
        el.setAttribute('data-ext', JSON.stringify(window.ON_EXT_CONFIG));
    } else {
        var el = document.querySelector('body');
        el.setAttribute('data-ext', "");
    }
}

setInterval(function () {
    addConfigToBody();
}, 500);

addConfigToBody();