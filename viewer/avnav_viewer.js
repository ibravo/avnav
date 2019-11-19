/*
# vim: ts=2 sw=2 et
###############################################################################
# Copyright (c) 2014, Andreas Vogel andreas@wellenvogel.net
# parts of software from movable-type
# http://www.movable-type.co.uk/
# for their license see the file latlon.js
#
#  Permission is hereby granted, free of charge, to any person obtaining a
#  copy of this software and associated documentation files (the "Software"),
#  to deal in the Software without restriction, including without limitation
#  the rights to use, copy, modify, merge, publish, distribute, sublicense,
#  and/or sell copies of the Software, and to permit persons to whom the
#  Software is furnished to do so, subject to the following conditions:
#
#  The above copyright notice and this permission notice shall be included
#  in all copies or substantial portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
#  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
#  DEALINGS IN THE SOFTWARE.
###############################################################################

icons partly from http://www.tutorial9.net/downloads/108-mono-icons-huge-set-of-minimal-icons/
                  http://ionicons.com/ (MIT license)
*/

avnav.provide('avnav.main');

var NavData=require('./nav/navdata');
var React=require('react');
var ReactDOM=require('react-dom');
var OverlayDialog=require('./components/OverlayDialog.jsx');
var propertyHandler=require('./util/propertyhandler');
ol.DEFAULT_TILE_CACHE_HIGH_WATER_MARK=256;
var App=require('./App.jsx');
var history=require('./util/history');
var MapHolder=require('./map/mapholder');
var keys=require('./util/keys.jsx').default;
var globalStore=require('./util/globalstore.jsx');





function getParam(key)
{
    // Find the key and everything up to the ampersand delimiter
    var value=RegExp(""+key+"[^&]+").exec(window.location.search);

    // Return the unescaped value minus everything starting from the equals sign or an empty string
    return unescape(!!value ? value.toString().replace(/^[^=]+./,"") : "");
}

/**
 * main function called when dom is loaded
 *
 */
avnav.main=function() {
    //some workaround for lees being broken on IOS browser
    //less.modifyVars();
    $("body").show();

    if (getParam('log')) avnav.debugMode=true;
    var navurl=getParam('navurl');
    if (navurl){
        globalStore.storeData(keys.properties.navUrl,navurl,true);
        globalStore.storeData(keys.properties.routingServerError,false,true);
    }
    else {
        globalStore.storeData(keys.properties.routingServerError,true,true);
    }

    if (getParam('onAndroid')){
        globalStore.storeData(keys.gui.global.onAndroid,true,true);
    }
    else {
        globalStore.storeData(keys.gui.global.onAndroid,false,true);
    }
    var ro="readOnlyServer";
    if (getParam(ro) && getParam(ro) == "true"){
        globalStore.storeData(keys.properties.connectedMode,false,true);
    }
    //make the android API available as avnav.android
    if (window.avnavAndroid){
        avnav.log("android integration enabled");
        globalStore.storeData(keys.gui.global.onAndroid,true,true);
        avnav.android=window.avnavAndroid;
        globalStore.storeData(keys.properties.routingServerError,false,true);
        globalStore.storeData(keys.properties.connectedMode,true,true);
        window.avnav_version=avnav.android.getVersion();
        avnav.android.applicationStarted();
    }
    history.push('mainpage');
    ReactDOM.render(<App/>,document.getElementById('new_pages'));

    //ios browser sometimes has issues with less...
    setTimeout(function(){
        propertyHandler.incrementSequence();
    },1000);
    avnav.log("avnav loaded");
};

