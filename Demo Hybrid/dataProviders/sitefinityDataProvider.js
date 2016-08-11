'use strict';

(function() {
    var provider = app.data.sitefinityDataProvider = new Sitefinity({
            serviceUrl: 'https://ssldbpsandbox.cloudapp.net/api/default'
        }),
        accessTokenCacheKey = "sf_access_token",
        providerAuthentication = provider.authentication,
        providerLogin = providerAuthentication.login,
        providerLogout = providerAuthentication.logout,
        authentication = {
            setCachedAccessToken: function(token) {
                if (localStorage) {
                    localStorage.setItem(accessTokenCacheKey, JSON.stringify(token));
                } else {
                    app[accessTokenCacheKey] = token;
                }
            },
            getCachedAccessToken: function() {
                if (localStorage) {
                    return JSON.parse(localStorage.getItem(accessTokenCacheKey));
                } else {
                    return app[accessTokenCacheKey];
                }
            },
            getCacheAccessTokenFn: function(callback) {
                return function cacheAccessToken(data) {
                    if (data) {
                        authentication.setCachedAccessToken(data);
                    }

                    callback(data);
                };
            },
            clearCacheAccessTokenFn: function(callback) {
                return function clearAccessToken(data) {
                    if (localStorage) {
                        localStorage.removeItem(accessTokenCacheKey);
                    } else {
                        app[accessTokenCacheKey] = null;
                    }

                    callback(data);
                };
            },
            loadCachedAccessToken: function() {
                var token = authentication.getCachedAccessToken();

                if (token) {
                    providerAuthentication.setToken(token);
                }
            }
        };

    authentication.loadCachedAccessToken();
    providerAuthentication.login = function cacheAccessTokenLogin(
        email, password, success, error) {
        providerLogin.call(this, email, password,
            authentication.getCacheAccessTokenFn(success), error);
    };
    providerAuthentication.logout = function clearAccessTokenLogout(success, error) {
        providerLogout.call(this,
            authentication.clearCacheAccessTokenFn(success), error);
    };
    providerAuthentication.isAuthorized = function _isAuthorized() {
        var url = provider.profileUrl,
            token = provider.authentication.getToken(),
            headers = {
                'X-SF-Service-Request': true
            };

        if (token) {
            headers.Authorization = token;
        }

        return $.ajax({
            url: url,
            headers: headers
        });
    };
}());

// START_CUSTOM_CODE_sitefinityDataProvider
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_sitefinityDataProvider