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

 Load all the necessary js files
 code is taken from the ol3 examples
 */

window.avnav={};
(function () {
    require('./version.js');
    require('./base.js');
    require('./util/formatter.js');
    require('./util/propertyhandler.js');
    require('./util/helper.js');
    require('./util/overlay.js');
    require('./nav/navdata.js');
    require('./nav/routeobjects.js');
    require('./nav/navcompute.js');
    require('./nav/navobject.js');
    require('./nav/trackdata.js');
    require('./nav/gpsdata.js');
    require('./nav/aisdata.js');
    require('./nav/routedata.js');
    require('./map/drawing.js');
    require('./map/mapholder.js');
    require('./map/navlayer.js');
    require('./map/aislayer.js');
    require('./map/tracklayer.js');
    require('./map/routelayer.js');
    require('./gui/handler.js');
    require('./gui/page.js');
    require('./gui/mainpage.js');
    require('./gui/navpage.js');
    require('./gui/aispage.js');
    require('./gui/aisinfopage.js');
    require('./gui/boatinfopage.js');
    require('./gui/wpinfopage.js');
    require('./gui/settingspage.js');
    require('./gui/statuspage.js');
    require('./gui/gpspage.js');
    require('./gui/routepage.js');
    require('./gui/downloadpage.js');
    require('./gui/wpapage.js');
    require('./avnav_viewer.js');
}());