let notifyTimer = null;
const clipboard = new ClipboardJS('.clipboard-copy-button');
clipboard.on('success', function (e) {
    let trigger = e.trigger;
    let charName = trigger.dataset.unicodeName;
    let hex = e.text.hexEncode().toUpperCase();
    notify("Copied to clipboard", "U+" + hex, charName);
});
clipboard.on('error', function (e) {
    const chars = ["👎", "💩", "💀", "☠️", "👿", "🤬"];
    notify("📋❌ Failed to copy to the clipboard. " + chars[Math.floor(Math.random() * chars.length)]);
    console.log("failure", e);
});

String.prototype.hexEncode = function () {
    let hex, i;
    let result = "";
    for (i = 0; i < this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000" + hex).slice(-4);
    }

    return result
}

function hideNotification() {
    if (notifyTimer !== null) {
        clearTimeout(notifyTimer);
        notifyTimer = null;
    }

    let div = document.getElementById("clipboard-notification");
    if (div) {
        div.classList.remove("show");
    }
}

function notify(message, charCodepoint, charName) {
    if (notifyTimer !== null) {
        clearTimeout(notifyTimer);
        notifyTimer = null;
    }

    let div = document.getElementById("clipboard-notification");
    if (!div) {
        div = document.createElement("div");
        div.id = "clipboard-notification";
        document.body.appendChild(div);

        let inner = document.createElement("div");
        inner.id = "clipboard-notification-icon";
        inner.innerHTML = "&#xf0c5;"
        div.appendChild(inner);
    }

    div.innerHTML = '<div id="clipboard-notification-content">'
        + '<div id="clipboard-notification-content-text">' + message + '</div>'
        + '<div id="clipboard-notification-content-charCodepoint">' + charCodepoint + '</div>'
        + '<div id="clipboard-notification-content-charName">' + charName + '</div></div>'
        + '<div id="clipboard-notification-icon">'
        + '<span style="line-height:1em; vertical-align:middle;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="height:1em; width:1em"><path fill="currentColor" opacity="1" d="M272 0H396.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H272c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128H192v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z"></path></svg></span>'
        + '</div>';
    div.classList.add("show");
    notifyTimer = setTimeout(() => hideNotification(), 2000);
}
