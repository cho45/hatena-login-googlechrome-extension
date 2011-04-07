D().define(this);
var http = Deferred.http;

function debug (obj) {
    webkitNotifications.createNotification('48.png','Hatena',JSON.stringify(obj)).show();
}

Hatena = {};
Hatena.Login = {};
Hatena.Login.API = {
    identify : function () {
        return next(function () {
            return http.get('http://n.hatena.ne.jp/applications/my.json?t=' + new Date().getTime()).
            next(function (r) {
                var data = JSON.parse(r.responseText);
                return data.url_name || null;
            }).
            error(function () {
                return null;
            });
        });
    },

    setRk : function (rk) {
        chrome.cookies.set({
            url : "http://www.hatena.ne.jp/",
            name : "rk",
            value : rk,
            domain : ".hatena.ne.jp",
            path : "/",
            expirationDate : new Date().getTime() + 60 * 60 * 24 * 365
        });

        var self = this;
        return next(function check () {
            return self.getRk().next(function (val) {
                if (val == rk) {
                    return true;
                } else {
                    webkitNotifications.createNotification(
                        '48.png',
                        'Hatena',
                        'failed to set rk'
                    ).show();
                    return wait(0.2).next(check);
                }
            });
        });
    },

    getRk : function () {
        var ret = new Deferred();
        chrome.cookies.get(
            {
                url : "http://www.hatena.ne.jp/",
                name: "rk",
            },
            function (cookie) {
                ret.call(cookie ? cookie.value : null);
            }
        );
        return ret;
    },

    openLogin : function (message, user) {
        localStorage['loginMessage'] = 'Hatena::Login extension: ' + message;
        localStorage['loginUser'] = user;

        return Hatena.Login.API.identify().
        next(function (iuser) {
            Hatena.Login.API.getRk().
            next(function (cookie) {
                if (cookie && iuser) {
                    window.open('https://www.hatena.ne.jp/logout?location=' + encodeURIComponent('https://www.hatena.ne.jp/login'));
                } else {
                    window.open('https://www.hatena.ne.jp/login');
                }
            });
        });
    }
};
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
            chrome.browserAction.setBadgeBackgroundColor({ color: [100, 100, 100, 200] });
            chrome.browserAction.setBadgeText({ text : val || '' });
            chrome.browserAction.setTitle({ title : val || '' });
            chrome.browserAction.setIcon({ path : '16.png' });
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = 19;
                canvas.height = 19;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 18, 18);
                chrome.browserAction.setIcon({ imageData : ctx.getImageData(0, 0, 18, 18) });
            };
            img.src = 'http://www.st-hatena.com/users/' + val.substring(0, 2) + '/' + val + '/profile.gif';
            localStorage['current'] = val;
        }
        return localStorage['current'];
    }
};

Hatena.Login['background'] = function () {
    Hatena.Login.API.identify().
    next(function (user) {
        Hatena.Login.Setting.current(user);
        if (user) {
            Hatena.Login.API.getRk().
            next(function (cookie) {
                if (cookie) {
                    Hatena.Login.Setting.add(user, cookie);
                }
            });
        }
    });

    chrome.cookies.onChanged.addListener(function (e) {
        if (e.cookie.domain == ".hatena.ne.jp" && e.cookie.name == "rk") {
            if (!e.removed) {
                var rk = e.cookie.value;
                Hatena.Login.API.identify().
                next(function (user) {
                    Hatena.Login.Setting.current(user);

                    var old = Hatena.Login.Setting.get()[user];
                    if (old != rk) {
                        Hatena.Login.Setting.add(user, rk);
                        var notification = webkitNotifications.createNotification(
                            '48.png',
                            'Hatena',
                            user + 'を記憶しました。'
                        );
                        notification.show();
                        setTimeout(function () {
                            notification.cancel();
                        }, 5000);
                    }
                });
            } else {
                Hatena.Login.Setting.current(null);
            }
        }
    });

    chrome.extension.onRequest.addListener(function (req, sender, callback) {
        if (req.action == 'onLogin') {
            var message = localStorage['loginMessage'];
            var user    = localStorage['loginUser'];
            delete localStorage['loginMessage'];
            delete localStorage['loginUser'];
            callback({
                message : message,
                user    : user
            });
        }
    });
};

Hatena.Login['options'] = function init () {
    var parent = document.getElementById('list');
    parent.innerHTML = '';

    Hatena.Login.Setting.del('undefined');

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
            if (confirm(user + "を解除しますか? (はてなのIDが消えたりはしません)")) {
                Hatena.Login.Setting.del(user);
                init();
            }
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
        Hatena.Login.API.openLogin('ログインすると拡張がユーザ情報を保存し、切替えられるようになります。', "");
    }, false);
    parent.appendChild(li);
};

Hatena.Login['popup'] = function () {
    var parent = document.getElementById('list');
    parent.innerHTML = '';

    Hatena.Login.Setting.del('undefined');

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
            Hatena.Login.Setting.current(user);
            Hatena.Login.API.setRk(rk).
            next(function () {
                Hatena.Login.API.identify().
                next(function (iuser) {
                    if (iuser == user) {
                        chrome.tabs.getSelected(undefined, function (tab) {
                            chrome.tabs.executeScript(tab.id, { code : 'location.reload(true)' }, function () {});
                            window.close();
                        });
                    } else {
                        Hatena.Login.API.openLogin('クッキーがきれたので再ログインしてください。', user).error(function (e) { console.log(e); });
                    }
                });
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
        Hatena.Login.API.openLogin('ログインすると拡張がユーザ情報を保存し、切替えられるようになります。', "");
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
