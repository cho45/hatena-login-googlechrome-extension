D().define(this);
var http = Deferred.http;

Hatena = {};
Hatena.Login = {};
Hatena.Login.Setting = {
    _get : function () {
        return JSON.parse(localStorage['users'] || '{}');
    },

    _set : function (users) {
       localStorage['users'] = JSON.stringify(users);
    },

    add : function (user, rk) {
        var users = this._get();
        users[user] = rk;
        this._set(users);
    },

    del : function (user) {
        var users = this._get();
        delete users[user];
        this._set(users);
    },

    get : function () {
        return this._get();
    },

    current : function (val) {
        if (typeof val != "undefined") {
            localStorage['current'] = val;
        }
        localStorage['current'];
    }
};

Hatena.Login['background'] = function () {
    chrome.cookies.onChanged.addListener(function (e) {
        if (e.cookie.domain == ".hatena.ne.jp" && e.cookie.name == "rk") {
            if (!e.removed) {
                var rk = e.cookie.value;
                http.get('http://n.hatena.ne.jp/applications/my.json').next(function (r) { return JSON.parse(r.responseText) }).
                next(function (data) {
                    var old = Hatena.Login.Setting.get()[data.url_name];
                    if (old != rk) {
                        Hatena.Login.Setting.add(data.url_name, rk);
                        var notification = webkitNotifications.createNotification(
                            '48.png',
                            'Hatena',
                            'Hatena extension saved this account: ' + data.url_name
                        );
                        notification.show();
                        setTimeout(function () {
                            notification.cancel();
                        }, 5000);
                    }
                });
            } else {
            }
        }
    });
};

Hatena.Login['popup'] = function () {

    var parent = document.getElementById('list');
    parent.innerHTML = '';

    var current = Hatena.Login.Setting.current();
    var users = Hatena.Login.Setting.get();
    for (var key in users) if (users.hasOwnProperty(key)) {
        var val = users[key];
        var li = document.createElement('li');
        var img = document.createElement('img');
        img.src = 'http://www.st-hatena.com/users/' + key.substring(0, 2) + '/' + key + '/profile.gif';
        li._rk = val;
        li._user = key;
        li.appendChild(img);
        li.appendChild(document.createTextNode(key));
        if (current == key) li.className = 'current';

        li.addEventListener('click', function (e) {
            var user = e.target._user;
            var rk   = e.target._rk;
            chrome.cookies.set({
                url : "http://www.hatena.ne.jp/",
                name : "rk",
                value : rk,
                domain : ".hatena.ne.jp",
                path : "/",
                expirationDate : new Date().getTime() + 60 * 60 * 24 * 365
            });
            http.get('http://n.hatena.ne.jp/applications/my.json').next(function (r) { return JSON.parse(r.responseText) }).
            next(function (data) {
                if (data.url_name == user) {
                    chrome.tabs.getSelected(undefined, function (tab) {
                        chrome.tabs.executeScript(tab.id, { code : 'location.reload(true)' }, function () {});
                    });
                } else {
                    window.open('http://www.hatena.ne.jp/login');
                }
            });
        }, false);
        parent.appendChild(li);
    }

    var li = document.createElement('li');
    li.className = 'sep';
    parent.appendChild(li);

    var li = document.createElement('li');
    var img = document.createElement('img');
    li.appendChild(img);
    li.appendChild(document.createTextNode('Add user...'));
    li.addEventListener('click', function (e) {
        chrome.cookies.get(
            {
                url : "http://www.hatena.ne.jp/",
                name: "rk",
            },
            function (cookie) {
                if (cookie) {
                    window.open('http://www.hatena.ne.jp/logout?location=' + encodeURIComponent('http://www.hatena.ne.jp/login'));
                } else {
                    window.open('http://www.hatena.ne.jp/login');
                }
            }
        );
    }, false);
    parent.appendChild(li);
};

window.onload = function () {
    var title = document.title;
    try {
        Hatena.Login[title]();
    } catch (e) {
        //alert(e)
        console.log(e);
    }
};
