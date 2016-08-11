'use strict';

app.coffeeShops = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});

// START_CUSTOM_CODE_coffeeShops
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_coffeeShops
(function(parent) {
    var dataProvider = app.data.testJiterz,
        fetchFilteredData = function(paramFilter, searchFilter) {
            var model = parent.get('coffeeShopsModel'),
                dataSource = model.get('dataSource');

            if (paramFilter) {
                model.set('paramFilter', paramFilter);
            } else {
                model.set('paramFilter', undefined);
            }

            if (paramFilter && searchFilter) {
                dataSource.filter({
                    logic: 'and',
                    filters: [paramFilter, searchFilter]
                });
            } else if (paramFilter || searchFilter) {
                dataSource.filter(paramFilter || searchFilter);
            } else {
                dataSource.filter({});
            }
        },
        processImage = function(img) {

            function isAbsolute(img) {
                if  (img && (img.slice(0,  5)  ===  'http:' || img.slice(0,  6)  ===  'https:' || img.slice(0,  2)  ===  '//'  ||  img.slice(0,  5)  ===  'data:')) {
                    return true;
                }
                return false;
            }

            if (!img) {
                var empty1x1png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=';
                img = 'data:image/png;base64,' + empty1x1png;
            } else if (!isAbsolute(img)) {
                var setup = dataProvider.setup || {};
                img = setup.scheme + ':' + setup.url + setup.appId + '/Files/' + img + '/Download';
            }

            return img;
        },
        flattenLocationProperties = function(dataItem) {
            var propName, propValue,
                isLocation = function(value) {
                    return propValue && typeof propValue === 'object' &&
                        propValue.longitude && propValue.latitude;
                };

            for (propName in dataItem) {
                if (dataItem.hasOwnProperty(propName)) {
                    propValue = dataItem[propName];
                    if (isLocation(propValue)) {
                        dataItem[propName] =
                            kendo.format('Latitude: {0}, Longitude: {1}',
                                propValue.latitude, propValue.longitude);
                    }
                }
            }
        },
        getLocation = function(options) {
            var d = new $.Deferred();

            if (options === undefined) {
                options = {
                    enableHighAccuracy: true
                };
            }

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    d.resolve(position);
                },
                function(error) {
                    d.reject(error);
                },
                options);

            return d.promise();
        },
        setupMap = function() {
            if (!coffeeShopsModel.map) {
                coffeeShopsModel.map = L.map('coffeeShopsModelMap');
                coffeeShopsModel.markersLayer = new L.FeatureGroup();

                var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    id: 'mapbox.streets',
                    accessToken: "pk.eyJ1IjoidmRyYWdvZXYiLCJhIjoiY2lvY3R3NnR6MDA2bHdjbTVjNTM2N3NsayJ9.uAmfrn1-RB74TWFFg5ASjQ"
                });

                coffeeShopsModel.map.addLayer(tileLayer);

                coffeeShopsModel.map.addLayer(coffeeShopsModel.markersLayer);
                coffeeShopsModel.map.on('click', function(e) {
                    coffeeShopsModel.set("itemDetailsVisible", false);
                });
            }

            addMarkers();
        },
        addMarkers = function() {
            getLocation()
                .then(function(userPosition) {
                    var marker,
                        currentMarker, currentMarkerIcon,
                        latLang,
                        position,
                        mapBounds,
                        data = coffeeShopsModel.get('dataSource').data(),
                        userLatLang = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude);

                    coffeeShopsModel.map.setView(userLatLang, 15, {
                        animate: false
                    });
                    mapBounds = coffeeShopsModel.map.getBounds();
                    coffeeShopsModel.markersLayer.clearLayers();

                    for (var i = 0; i < data.length; i++) {

                        position = data[i].Location || {};

                        if (position.hasOwnProperty('latitude') && position.hasOwnProperty('longitude')) {
                            latLang = [position.latitude, position.longitude];
                        } else if (position.hasOwnProperty('Latitude') && position.hasOwnProperty('Longitude')) {
                            latLang = [position.Latitude, position.Longitude];
                        }

                        if (latLang && latLang[0] !== undefined && latLang[1] !== undefined) {
                            marker = L.marker(latLang, {
                                uid: data[i].uid
                            });
                            mapBounds.extend(latLang);
                            coffeeShopsModel.markersLayer.addLayer(marker);
                        }
                    }

                    currentMarkerIcon = L.divIcon({
                        className: 'current-marker',
                        iconSize: [20, 20],
                        iconAnchor: [20, 20]
                    });

                    currentMarker = L.marker(userLatLang, {
                        icon: currentMarkerIcon
                    });

                    coffeeShopsModel.markersLayer.addLayer(currentMarker);

                    coffeeShopsModel.markersLayer.on('click', function(e) {
                        var marker, newItem;

                        marker = e.layer;
                        if (marker.options.icon.options.className.indexOf("current-marker") >= 0) {
                            return;
                        }

                        newItem = coffeeShopsModel.setCurrentItemByUid(marker.options.uid);
                        coffeeShopsModel.set("itemDetailsVisible", true);
                    });

                    coffeeShopsModel.set("mapVisble", true);
                    coffeeShopsModel.map.invalidateSize({
                        reset: true
                    });
                    coffeeShopsModel.map.fitBounds(mapBounds, {
                        padding: [20, 20]
                    });
                    app.mobileApp.pane.loader.hide();
                })
                .then(null, function(error) {
                    app.mobileApp.pane.loader.hide();
                    alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
                });
        },

        dataSourceOptions = {
            type: 'everlive',
            transport: {
                read: {
                    headers: {
                        'X-Everlive-Expand': {
                            "Drinks": {
                                "TargetTypeName": "CoffeeDrinks"
                            }
                        }
                    }
                },
                typeName: 'CoffeeShops',
                dataProvider: dataProvider
            },
            change: function(e) {
                var data = this.data();
                for (var i = 0; i < data.length; i++) {
                    var dataItem = data[i];

                }
            },
            error: function(e) {
                app.mobileApp.pane.loader.hide();
                if (e.xhr) {
                    alert(JSON.stringify(e.xhr));
                }
            },
            schema: {
                model: {
                    fields: {
                        'Name': {
                            field: 'Name',
                            defaultValue: ''
                        },
                    }
                }
            },
            serverFiltering: true,
        },
        dataSource = new kendo.data.DataSource(dataSourceOptions),
        coffeeShopsModel = kendo.observable({
            dataSource: dataSource,
            fixHierarchicalData: function(data) {
                var result = {},
                    layout = {
                        "Drinks": [{}]
                    };

                $.extend(true, result, data);

                (function removeNulls(obj) {
                    var i, name,
                        names = Object.getOwnPropertyNames(obj);

                    for (i = 0; i < names.length; i++) {
                        name = names[i];

                        if (obj[name] === null) {
                            delete obj[name];
                        } else if ($.type(obj[name]) === 'object') {
                            removeNulls(obj[name]);
                        }
                    }
                })(result);

                (function fix(source, layout) {
                    var i, j, name, srcObj, ltObj, type,
                        names = Object.getOwnPropertyNames(layout);

                    for (i = 0; i < names.length; i++) {
                        name = names[i];
                        srcObj = source[name];
                        ltObj = layout[name];
                        type = $.type(srcObj);

                        if (type === 'undefined' || type === 'null') {
                            source[name] = ltObj;
                        } else {
                            if (srcObj.length > 0) {
                                for (j = 0; j < srcObj.length; j++) {
                                    fix(srcObj[j], ltObj[0]);
                                }
                            } else {
                                fix(srcObj, ltObj);
                            }
                        }
                    }
                })(result, layout);

                return result;
            },
            itemClick: function(e) {
                var dataItem = e.dataItem || coffeeShopsModel.originalItem;

                app.mobileApp.navigate('#components/coffeeShops/details.html?uid=' + dataItem.uid);

            },
            addClick: function() {
                app.mobileApp.navigate('#components/coffeeShops/add.html');
            },
            editClick: function() {
                var uid = this.originalItem.uid;
                app.mobileApp.navigate('#components/coffeeShops/edit.html?uid=' + uid);
            },
            deleteItem: function() {
                var dataSource = coffeeShopsModel.get('dataSource');

                dataSource.remove(this.originalItem);

                dataSource.one('sync', function() {
                    app.mobileApp.navigate('#:back');
                });

                dataSource.one('error', function() {
                    dataSource.cancelChanges();
                });

                dataSource.sync();
            },
            deleteClick: function() {
                var that = this;

                navigator.notification.confirm(
                    "Are you sure you want to delete this item?",
                    function(index) {
                        //'OK' is index 1
                        //'Cancel' - index 2
                        if (index === 1) {
                            that.deleteItem();
                        }
                    },
                    '', ["OK", "Cancel"]
                );
            },
            detailsShow: function(e) {
                coffeeShopsModel.setCurrentItemByUid(e.view.params.uid);
            },
            setCurrentItemByUid: function(uid) {
                var item = uid,
                    dataSource = coffeeShopsModel.get('dataSource'),
                    itemModel = dataSource.getByUid(item);

                if (!itemModel.Name) {
                    itemModel.Name = String.fromCharCode(160);
                }

                coffeeShopsModel.set('originalItem', itemModel);
                coffeeShopsModel.set('currentItem',
                    coffeeShopsModel.fixHierarchicalData(itemModel));

                return itemModel;
            },
            linkBind: function(linkString) {
                var linkChunks = linkString.split('|');
                if (linkChunks[0].length === 0) {
                    return this.get("currentItem." + linkChunks[1]);
                }
                return linkChunks[0] + this.get("currentItem." + linkChunks[1]);
            },
            imageBind: function(imageField) {
                if (imageField.indexOf("|") > -1) {
                    return processImage(this.get("currentItem." + imageField.split("|")[0]));
                }
                return processImage(imageField);
            },
            currentItem: {
                "Drinks": []
            }
        });

    parent.set('addItemViewModel', kendo.observable({
        onShow: function(e) {
            // Reset the form data.
            this.set('addFormData', {
                openNowOrClosed: '',
                shopAddresses: '',
                shopName: '',
            });
        },
        onSaveClick: function(e) {
            var addFormData = this.get('addFormData'),
                addModel = {
                    OpenClosedNow: addFormData.openNowOrClosed,
                    Address: addFormData.shopAddresses,
                    Name: addFormData.shopName,
                },
                filter = coffeeShopsModel && coffeeShopsModel.get('paramFilter'),
                dataSource = coffeeShopsModel.get('dataSource');

            dataSource.add(addModel);
            dataSource.one('change', function(e) {
                app.mobileApp.navigate('#:back');
            });

            dataSource.sync();
        }
    }));

    parent.set('editItemViewModel', kendo.observable({
        editFormData: {},
        onShow: function(e) {
            var itemUid = e.view.params.uid,
                dataSource = coffeeShopsModel.get('dataSource'),
                itemData = dataSource.getByUid(itemUid),
                fixedData = coffeeShopsModel.fixHierarchicalData(itemData);

            this.set('itemData', itemData);
            this.set('editFormData', {
                openNowOrClosed: itemData.OpenClosedNow,
                shopAddresses: itemData.Address,
                shopName: itemData.Name,
            });
        },
        linkBind: function(linkString) {
            var linkChunks = linkString.split(':');
            return linkChunks[0] + ':' + this.get("itemData." + linkChunks[1]);
        },
        onSaveClick: function(e) {
            var editFormData = this.get('editFormData'),
                itemData = this.get('itemData'),
                dataSource = coffeeShopsModel.get('dataSource');

            // prepare edit
            itemData.set('OpenClosedNow', editFormData.openNowOrClosed);
            itemData.set('Address', editFormData.shopAddresses);
            itemData.set('Name', editFormData.shopName);

            dataSource.one('sync', function(e) {
                app.mobileApp.navigate('#:back');
            });

            dataSource.one('error', function() {
                dataSource.cancelChanges(itemData);
            });

            dataSource.sync();
        }
    }));

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('coffeeShopsModel', coffeeShopsModel);
        });
    } else {
        parent.set('coffeeShopsModel', coffeeShopsModel);
    }

    parent.set('onShow', function(e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper');

        if (param || isListmenu) {
            backbutton.show();
            backbutton.css('visibility', 'visible');
        } else {
            if (e.view.element.find('header [data-role="navbar"] [data-role="button"]').length) {
                backbutton.hide();
            } else {
                backbutton.css('visibility', 'hidden');
            }
        }

        app.mobileApp.pane.loader.show();
        coffeeShopsModel.set("mapVisble", false);
        coffeeShopsModel.set("itemDetailsVisible", false);

        dataSource.one("change", setupMap);
        fetchFilteredData(param);
    });
    parent.set('onHide', function() {
        dataSource.unbind("change", setupMap);
    });
})(app.coffeeShops);

// START_CUSTOM_CODE_coffeeShopsModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_coffeeShopsModel