
chrome.extension.sendRequest({'action' : 'onLogin'}, function (data) {
    var message = data['message'];
    var user = data['user'];
    if (typeof user != 'undefined' && typeof message != 'undefined') {
        var name = document.getElementById('login-name');
        name.value = user;

        var before = document.querySelector('#body form .window table.config');
        var container = document.createElement('div');
        container.className = 'error-message';
        var p = document.createElement('p');
        p.appendChild(document.createTextNode(message));
        container.appendChild(p);

        before.parentNode.insertBefore(container, before);

        if (user) {
            document.querySelector('input.password').focus();
        }
    }
});
