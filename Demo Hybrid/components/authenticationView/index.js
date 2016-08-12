'use strict';

app.authenticationView = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});

// START_CUSTOM_CODE_authenticationView
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_authenticationView
(function(parent) {
    var provider = app.data.sitefinityDataProvider,

        signinRedirect = 'coffeeShopsLocation',
        rememberKey = 'sitefinityDataProvider_authData_authenticationViewModel',
        init = function(error, result) {
            $('.status').text('');

            if (error) {
                if (error.message) {
                    $('.status').text(error.message);
                }
                try {
                    var err = JSON.parse(error.responseText);
                    if (err) {
                        if (err.error) {
                            if (err.error.innererror && err.error.innererror.message) {
                                $('.status').text(err.error.innererror.message);
                            } else if (err.error.message) {
                                $('.status').text(err.error.message);
                            }
                        }
                    }
                } catch (e) {}

                return false;
            }

            var activeView = '.signin-view',
                model = parent.authenticationViewModel;

            if (provider.setup && provider.setup.offlineStorage && !app.isOnline()) {
                $('.signin-view', 'signup-view').hide();
                $('.offline').show();
            } else {
                $('.offline').hide();

                $(activeView).show();
            }

            if (model && model.set) {
                model.set('logout', null);
            }

            var rememberedData = localStorage ? JSON.parse(localStorage.getItem(rememberKey)) : app[rememberKey];
            if (rememberedData && rememberedData.email && rememberedData.password) {

                parent.authenticationViewModel.set('email', rememberedData.email);
                parent.authenticationViewModel.set('password', rememberedData.password);
                parent.authenticationViewModel.signin();
            }
        },
        successHandler = function(data) {
            var redirect = signinRedirect,
                model = parent.authenticationViewModel || {},
                logout = model.logout;

            if (logout) {
                model.set('logout', null);
            }
            if (data) {
                if (logout) {
                    provider.authentication.logout(init.bind(null, null), init);
                    return;
                }
                var rememberedData = {
                    email: model.email,
                    password: model.password
                };
                if (model.rememberme && rememberedData.email && rememberedData.password) {
                    if (localStorage) {
                        localStorage.setItem(rememberKey, JSON.stringify(rememberedData));
                    } else {
                        app[rememberKey] = rememberedData;
                    }
                }

                setTimeout(function() {
                    app.mobileApp.navigate('components/' + redirect + '/view.html');
                }, 0);
            } else {
                init();
            }
        },
        authenticationViewModel = kendo.observable({
            displayName: '',
            email: '',
            password: '',
            errorMessage: '',
            validateData: function(data) {
                var model = authenticationViewModel;

                if (!data.email && !data.password) {
                    model.set('errorMessage', 'Missing credentials.');
                    return false;
                }

                if (!data.email) {
                    model.set('errorMessage', 'Missing username or email.');
                    return false;
                }

                if (!data.password) {
                    model.set('errorMessage', 'Missing password.');
                    return false;
                }

                return true;
            },
            signin: function() {
                var model = authenticationViewModel,
                    email = model.email.toLowerCase(),
                    password = model.password;

                if (!model.validateData(model)) {
                    return false;
                }

                provider.authentication.login(email, password, successHandler, init);

            }
        });

    parent.set('authenticationViewModel', authenticationViewModel);
    parent.set('afterShow', function(e) {
        if (e && e.view && e.view.params && e.view.params.logout) {
            if (localStorage) {
                localStorage.setItem(rememberKey, null);
            } else {
                app[rememberKey] = null;
            }
            authenticationViewModel.set('logout', true);
        }
        if (provider.authentication.getToken()) {
            provider.authentication.isAuthorized().then(successHandler, init);
        } else {
            init();
        }
    });
})(app.authenticationView);

// START_CUSTOM_CODE_authenticationViewModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_authenticationViewModel