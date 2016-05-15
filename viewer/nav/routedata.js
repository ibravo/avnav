/**
 * Created by andreas on 04.05.14.
 */


/**
 * the handler for the routing data
 * query the server...
 * basically it can work in 2 modes:
 * active route mode - the currentleg and the editingRoute will kept in sync
 * editing mode      - the editing route is different from the one in the leg
 * @param {avnav.util.PropertyHandler} propertyHandler
 * @param {avnav.nav.NavObject} navobject
 * @constructor
 */
avnav.nav.RouteData=function(propertyHandler,navobject){
    /** @private */
    this.propertyHandler=propertyHandler;
    /** @private */
    this.navobject=navobject;
    /** @private
     * @type {}
     * */
    this.serverLeg=new avnav.nav.Leg();
    this.currentLeg=new avnav.nav.Leg(
            new avnav.nav.navdata.WayPoint(0,0),
            new avnav.nav.navdata.WayPoint(0,0),
            false);
    /**
     * name of the default route
     * @type {string}
     */
    this.DEFAULTROUTE="default";
    this.FALLBACKROUTENAME="avnav.defaultRoute"; //a fallback name for the default route
    this.currentLeg.approachDistance=this.propertyHandler.getProperties().routeApproach+0;

    try {
        var raw=localStorage.getItem(this.propertyHandler.getProperties().routingDataName);
        if (raw){
            this.currentLeg.fromJsonString(raw);
        }
    }catch(e){
        log("Exception reading currentLeg "+e);
    }
    if (this.currentLeg.name && ! this.currentLeg.currentRoute){
        //migrate from old stuff
        var route=this._loadRoute(this.currentLeg.name);
        if (route){
            this.currentLeg.currentRoute=route;
            this.currentLeg.name=route.name;
        }
        else {
            this.currentLeg.currentRoute=new avnav.nav.Route(this.currentLeg.name);
        }
    }
    if (avnav.android){
        var data=avnav.android.getLeg();
        if (data && data != ""){
            log("android: get leg from server");
            try {
                var nLeg = new avnav.nav.Leg();
                nLeg.fromJsonString(data);
                this.currentLeg=nLeg;
            }catch (e){
                log("unable to get leg from server");
            }
        }
    }
    /**
     * @private
     * @type {boolean}
     */
    this.connectMode=this.propertyHandler.getProperties().connectedMode;

    /**
     * the current coordinates of the active WP (if set)
     * @private
     * @type {avnav.nav.navdata.WayPoint}
     */
    this.editingWp=this.currentLeg.to;

    /**
     * the current route that we edit
     * if undefined we do not edit a route
     * the route is either the active route (in this case it is a ref to the active route) or another route
     * @private
     * @type {avnav.nav.Route}
     */
    this.editingRoute=undefined;

    /**
     * the last received route from server
     * initially we set this to our route to get the route from the server if it differs
     * @type {avnav.nav.Route}
     */
    this.serverRoute=undefined;


    /**legChanged
     * @private
     * @type {null}
     */
    this.timer=null;
    /**
     * @private
     * @type {number}
     */
    this.routeErrors=0;
    this.serverConnected=false;

    /**
     * last distance to current WP
     * @private
     * @type {number}
     */
    this.lastDistanceToCurrent=-1;
    /**
     * last distance to next wp
     * @private
     * @type {number}
     */
    this.lastDistanceToNext=-1;
    /**
     * approaching next wp in route
     * @private
     * @type {boolean}
     */
    this.isApproaching=false;
    /**
     * @private
     * @type {avnav.util.Formatter}
     */
    this.formatter=new avnav.util.Formatter();

    var self=this;
    $(document).on(avnav.util.PropertyChangeEvent.EVENT_TYPE, function(ev,evdata){
        self._propertyChange(evdata);
    });

    this._startQuery();
};
/*---------------------------------------------------------
 get raw data functions
 ----------------------------------------------------------*/
/**
 * return the current leg - never modify this directly
 * @returns {avnav.nav.Leg}
 */
avnav.nav.RouteData.prototype.getCurrentLeg=function(){
    return this.currentLeg;
};
/**
 * get the current lock state (i.e. are we routing?)
 * @returns {boolean}
 */
avnav.nav.RouteData.prototype.getLock=function(){
    return this.currentLeg.active;
};

/**
 * check if we currently have an active route
 * @returns {boolean}
 */
avnav.nav.RouteData.prototype.hasActiveRoute=function(){
    if (! this.currentLeg.active) return false;
    if (! this.currentLeg.name) return false;
    if (! this.currentLeg.currentRoute) return false;
    return true;
};

/**
 * get the current route target wp (or undefined)
 * @returns {avnav.nav.navdata.WayPoint|undefined}
 */
avnav.nav.RouteData.prototype.getCurrentLegTarget=function(){
    return this.currentLeg.to;
};
/**
 * get the next wp if there is one
 * @returns {avnav.nav.navdata.WayPoint|undefined}
 */
avnav.nav.RouteData.prototype.getCurrentLegNextWp=function(){
    if (! this.currentLeg.currentRoute) return undefined;
    return this.currentLeg.currentRoute.getPointAtIndex(this.currentLeg.getCurrentTargetIdx()+1);
};

/**
 * get the start wp of the current leg (if any)
 * @returns {avnav.nav.navdata.WayPoint}
 */
avnav.nav.RouteData.prototype.getCurrentLegStartWp=function(){
    if (! this.currentLeg) return undefined;
    if (! this.currentLeg.from) return undefined;
    return this.currentLeg.from;
};

/**
 * get the remaining length of the active route
 * @returns {Number} length in nm
 */
avnav.nav.RouteData.prototype.getRemain=function(){
    if (this.hasActiveRoute()) return 0;
    var startIdx=this.currentLeg.getCurrentTargetIdx();
    return avnav.nav.NavCompute.computeRouteLength(startIdx,this.currentLeg.currentRoute);
};

avnav.nav.RouteData.prototype.getApproaching=function(){
    return this.isApproaching;
};

/**
 * check if a waypoint is the current target
 * @param {avnav.nav.navdata.WayPoint} compare
 * @returns {boolean}
 */
avnav.nav.RouteData.prototype.isCurrentRoutingTarget=function(compare){
    if (! compare ) return false;
    if (! this.currentLeg.to) return false;
    if (! this.currentLeg.active) return false;
    return this.currentLeg.to.compare(compare);
};

/**
 * get a waypoint at a given offset to the point (if it belongs to a route)
 * @param {avnav.nav.navdata.WayPoint} wp
 * @param {number }offset
 * @returns {avnav.nav.navdata.WayPoint|undefined}
 */
avnav.nav.RouteData.prototype.getPointAtOffset=function(wp,offset){
    var rn=wp.routeName;
    if (! rn) return undefined;
    var route=this.getRouteByName(rn);
    if (! route) return undefined;
    return route.getPointAtOffset(wp,offset);
};

/**
 * return the current route (if any)
 * @returns {avnav.nav.Route}
 */

avnav.nav.RouteData.prototype.getRoute=function(){
    if (this.editingRoute) return this.editingRoute;
    if (! this.getLock()) return undefined;
    return this.currentLeg.currentRoute;
};

/**
 * return either the active route or the editing route if their name match
 * @param {string} name
 * @returns {avnav.nav.Route}
 */

avnav.nav.RouteData.prototype.getRouteByName=function(name){
    if (! name) return undefined;
    if (this.editingRoute && this.editingRoute.name == name) return this.editingRoute;
    if (! this.currentLeg.currentRoute) return undefined;
    if (this.currentLeg.currentRoute.name == name) return this.currentLeg.currentRoute;
    return undefined;
};

/**
 * check if the waypoint is still valid
 * either it is the current target
 * or it belongs to either the active or the editing route
 * @param {avnav.nav.navdata.WayPoint} wp
 * @returns {boolean}
 */
avnav.nav.RouteData.prototype.checkWp=function(wp){
    if (! wp) return false;
    if (wp.compare(this.currentLeg.to)) return true;
    var rt=this.getRouteByName(wp.routeName);
    if (! rt) return false;
    return (rt.getIndexFromPoint(wp)>=0);
};

/**
 * compute the length of the route from the given startpoint
 * @param {number} startIdx
 * @param {avnav.nav.Route} route
 * @returns {number} distance in nm
 */
avnav.nav.RouteData.prototype.computeLength=function(startIdx,route){
    if (startIdx == -1) startIdx=this.currentLeg.getCurrentTargetIdx();
    return avnav.nav.NavCompute.computeRouteLength(startIdx,route);
};


/*---------------------------------------------------------
  editing functions - only if editingRoute is set
 ----------------------------------------------------------*/

/**
 * change the name of the route
 * @param name {string}
 * @param setLocal {boolean} if set make the route a local route
 */
avnav.nav.RouteData.prototype.changeRouteName=function(name,setLocal){
    if (! this.editingRoute){
        return;
    }
    this.editingRoute.setName(name);
    log("switch to new route "+name);
    if (setLocal) this.editingRoute.server=false;
    if (this._updateLeg()) return;
    this.saveRoute();
    this.navobject.routeEvent();
};
/**
 * save the route (locally and on the server)
 * @param {avnav.nav.Route} rte
 * @param {function} opt_callback
 */
avnav.nav.RouteData.prototype.saveRoute=function(rte,opt_callback) {
    var route=this._saveRouteLocal(rte);
    if (! route ) return;
    if (avnav.android){
        avnav.android.storeRoute(route.toJsonString());
    }
    if (this.connectMode) this._sendRoute(route, opt_callback);
    else {
        if (opt_callback) setTimeout(function () {
            opt_callback(true);
        }, 0);
    }

};

/**
 * check if the current route is active
 * @returns {boolean}
 */
avnav.nav.RouteData.prototype.isEditingActiveRoute=function(){
    if (! this.editingRoute) return false;
    if (! this.currentLeg.currentRoute) return false;
    return this.editingRoute.name == this.currentLeg.currentRoute.name;
};

/**
 *
 * @param {number} id the index in the route
 */
avnav.nav.RouteData.prototype.setEditingWpIdx=function(id){
    var route=this.editingRoute;
    if (! route) return;
    this.editingWp=route.getPointAtIndex(id);
    this.navobject.routeEvent();
};
/**
 * set the editing waypoint
 * TODO: currently no check if it matches the route
 * @param {avnav.nav.navdata.WayPoint} wp
 */
avnav.nav.RouteData.prototype.setEditingWp=function(wp){
    this.editingWp=wp;
    this.navobject.routeEvent();
};
avnav.nav.RouteData.prototype.moveEditingWp=function(diff){
    var route=this.getRoute();
    if (! route) return;
    var nwp=route.getPointAtOffset(this.editingWp,diff);
    if (! nwp) return;
    this.editingWp=nwp;
    this.navobject.routeEvent();
};

/**
 * get the active wp
 * @returns {avnav.nav.navdata.WayPoint}
 */
avnav.nav.RouteData.prototype.getEditingWp=function(){
    return this.editingWp;
};

/**
 * get the index of the active wp from the current route
 * @return {number}
 */
avnav.nav.RouteData.prototype.getEditingWpIdx=function(){
    var wp=this.getEditingWp();
    if (! wp) return -1;
    var route=this.getRoute();
    if (! route) return -1;
    return route.getIndexFromPoint(wp);
};

/**
 * returns the waypoint with the given index from the editing route
 * @param {number} idx
 * @returns {avnav.nav.navdata.WayPoint}
 */

avnav.nav.RouteData.prototype.getWp=function(idx){
    var route=this.editingRoute;
    if (! route) return undefined;
    return route.getPointAtIndex(idx);
};

avnav.nav.RouteData.prototype.getIdForMinusOne=function(id){
    if (id >= 0) return id;
    if (! this.editingRoute) return -1;
    return this.editingRoute.getIndexFromPoint(this.getEditingWp());
};
/**
 * delete a point from the current route
 * @param {number} id - the index, -1 for active
 */
avnav.nav.RouteData.prototype.deleteWp=function(id){
    id=this.getIdForMinusOne(id);
    if (id < 0) return;
    if (! this.editingRoute) return;
    var old=this.editingRoute.getPointAtIndex(id);
    var newWp=this.editingRoute.deletePoint(id); //this returns the next point
    if (newWp){
        this.editingWp=newWp;
    }
    else{
        this._findBestMatchingPoint();
    }
    if (this._updateLeg(old ,newWp)) return; // set a new target if we deleted the active one
    this.saveRoute(this.editingRoute);
    this.navobject.routeEvent();
};
/**
 * change a point in the route
 * @param {number} id the index, -1 for current
 * @param {avnav.nav.navdata.Point|avnav.nav.navdata.WayPoint} point
 */
avnav.nav.RouteData.prototype.changeWpByIdx=function(id, point){
    id=this.getIdForMinusOne(id);
    if (id < 0) return undefined;
    if (! this.editingRoute) return undefined;
    var old=this.editingRoute.getPointAtIndex(id);
    if (! old) return;
    var wp=this.editingRoute.changePointAtIndex(id);
    if (! wp) return undefined;
    this.editingWp=wp;
    if (this._updateLeg(old,wp)) return;
    this.saveRoute(this.editingRoute);
    this.navobject.routeEvent();
    return wp;
};

/**
 * add a point to the route
 * @param {number} id the index, -1 for current - point is added after
 * @param {avnav.nav.navdata.Point|avnav.nav.navdata.WayPoint} point
 */
avnav.nav.RouteData.prototype.addWp=function(id,point){
    id=this.getIdForMinusOne(id);
    if (! this.editingRoute) return;
    this.editingWp=this.editingRoute.addPoint(id,point);
    if (this._updateLeg()) return;
    this.saveRoute(this.editingRoute);
    this.navobject.routeEvent();
};
/**
 * delete all points from the route
 */
avnav.nav.RouteData.prototype.emptyRoute=function(){
    this.editingWp=undefined;
    if (! this.editingRoute) return;
    this.editingRoute.points=[];
    if(this._updateLeg()) return;
    this.saveRoute();
    this.navobject.routeEvent();
};

/**
 * invert the order of waypoints in the route
 */
avnav.nav.RouteData.prototype.invertRoute=function(){
    if (! this.editingRoute) return;
    this.editingRoute.swap();
    if (this._updateLeg()) return;
    this.saveRoute(this.editingRoute);
    this.navobject.routeEvent();
};

/**
 * set a new route to be edited
 * @param {avnav.nav.Route} route
 */

avnav.nav.RouteData.prototype.setNewEditingRoute=function(route){
    this.editingRoute=route.clone();
    this._findBestMatchingPoint();
    this.navobject.routeEvent();
};

/**
 * check whether the editing route is writable
 * @returns {boolean}
 */
avnav.nav.RouteData.prototype.isRouteWritable=function(){
    if (this.connectMode) return true;
    if (this.isEditingActiveRoute()) return ! this.currentLeg.currentRoute.server;
    if (! this.editingRoute) return false;
    return ! this.editingRoute.server;
};


/*---------------------------------------------------------
 editing functions - always
 ----------------------------------------------------------*/
/**
 * change a waypoint
 * the old point can be:
 *   - a point from the current (editing) route
 *   - the currentLeg to point
 * @param {avnav.nav.navdata.WayPoint} oldPoint
 * @param {avnav.nav.navdata.WayPoint} point
 * @returns undefined if the point cannot be changed
 */
avnav.nav.RouteData.prototype.changeWp=function(oldPoint, point){
    if (oldPoint.routeName) {
        var route = this.getRouteByName(oldPoint.routeName);
        if (route) {
            var idx = route.getIndexFromPoint(oldPoint);
            if (idx < 0) return undefined; //cannot find old point
            route.changePointAtIndex(idx,point);
        }
        else {
            return undefined; //old point is from a route - but we do not have one
        }
    }
    else{
        if (! oldPoint.compare(this.currentLeg.to)) return undefined; //the old point is not the current target
    }
    if (this._updateLeg(oldPoint,point)) return true;
    this.saveRoute();
    this.navobject.routeEvent();
    return true;
};
/*---------------------------------------------------------
 state changes (edit on/route on/off...)
 ----------------------------------------------------------*/
/**
 * set the editing route from the active leg (if we have an active route)
 * if not set to the default route
 *
 */
avnav.nav.RouteData.prototype.cloneActiveToEditing=function() {
    if (this.currentLeg.currentRoute){
        this.editingRoute=this.currentLeg.currentRoute.clone();
        this.editingWp=this.editingRoute.getPointAtIndex(
            this.editingRoute.getIndexFromPoint(this.currentLeg.to));
    }
    else {
        this.editingRoute = this._loadRoute(this.DEFAULTROUTE);
        this.editingWp = this.editingRoute.getPointAtIndex(0);
    }
    this.saveRoute();
    this.navobject.routeEvent();
};

/**
 * stop the route editing mode (throw away the editing route)
 * also setting the editing WP
 */
avnav.nav.RouteData.prototype.stopEditingRoute=function(){
    this.editingRoute=undefined;
    this.editingWp=this.currentLeg.to;
};
/**
 * start the route edit mode
 * if we already have a route (either active or editing) only the waypoint will be set
 */
avnav.nav.RouteData.prototype.startEditingRoute=function(){
    if (this.hasActiveRoute()){
        this.editingWp=this.currentLeg.to.clone();
        this.editingRoute=this.currentLeg.currentRoute;
        return;
    }
    if (! this.editingRoute){
        this.editingRoute=this._loadRoute(this.DEFAULTROUTE);
        this.editingWp=this.editingRoute.getPointAtIndex(0);
        return;
    }
    this.editingWp=this._findBestMatchingPoint();
};
/**
 *
 * @param {avnav.nav.navdata.WayPoint} wp
 * @param opt_keep_from
 */
avnav.nav.RouteData.prototype.wpOn=function(wp,opt_keep_from) {
    var stwp=new avnav.nav.navdata.WayPoint.fromPlain(wp);
    if (wp.routeName){
        //if the waypoint seems to be part of a route
        //check if this is our current active/editing one - if yes, start routing mode
        stwp.routeName=wp.routeName;
        var rt=this.getRouteByName(wp.routeName);
        if (!(rt  && rt.getIndexFromPoint(stwp) >= 0)){
            stwp.routeName=undefined;
        }
    }
    if (stwp.routeName){
        this.editingWp=stwp.clone();
        this._startRouting(avnav.nav.RoutingMode.ROUTE, stwp, opt_keep_from);
    }
    else {
        this._startRouting(avnav.nav.RoutingMode.WP, stwp, opt_keep_from);
    }
};

/**
 *
 * @param {avnav.nav.navdata.WayPoint} wp
 * @param opt_keep_from
 */
avnav.nav.RouteData.prototype.wpOnInactive=function(wp,opt_keep_from) {
    var stwp=new avnav.nav.navdata.WayPoint.fromPlain(wp);
    this._startRouting(avnav.nav.RoutingMode.WPINACTIVE,stwp,opt_keep_from);
};
/**
 *
 * @param mode
 * @param {avnav.nav.navdata.WayPoint} newWp
 * @param {boolean} opt_keep_from
 * @returns {boolean}
 * @private
 */
avnav.nav.RouteData.prototype._startRouting=function(mode,newWp,opt_keep_from){
    this.currentLeg.approachDistance=this.propertyHandler.getProperties().routeApproach+0;
    this.currentLeg.active=true;
    var pfrom;
    var gps=this.navobject.getGpsHandler().getGpsData();
    var center=this.navobject.getMapCenter();
    if (gps.valid){
        pfrom=new avnav.nav.navdata.WayPoint(gps.lon,gps.lat);
    }
    else{
        pfrom=new avnav.nav.navdata.WayPoint();
        center.assign(pfrom);
    }
    if (! opt_keep_from) this.currentLeg.from=pfrom;
    if (mode == avnav.nav.RoutingMode.WP){
        this.currentLeg.to=newWp;
        this.currentLeg.name=undefined;
        this.currentLeg.currentRoute=undefined;
        this.currentLeg.active=true;
        this._legChanged();
        return true;
    }
    if (mode == avnav.nav.RoutingMode.WPINACTIVE){
        this.currentLeg.to=newWp;
        this.currentLeg.name=undefined;
        this.currentLeg.currentRoute=undefined;
        this.currentLeg.active=false;
        this._legChanged();
        return true;
    }
    if (mode == avnav.nav.RoutingMode.ROUTE){
        if (! newWp || ! newWp.routeName) return;
        var route=this.getRouteByName(newWp.routeName);
        if (! route) return;
        var idx=route.getIndexFromPoint(newWp);
        if (idx <0) return;
        this.currentLeg.currentRoute = route;
        this.currentLeg.name = route.name;
        this.currentLeg.to = newWp;
        this.currentLeg.active=true;
        this._legChanged();
        return true;
    }
    return false;
};


avnav.nav.RouteData.prototype.routeOff=function(){
    if (! this.getLock()) return; //is already off
    this.currentLeg.active=false;
    this.currentLeg.name=undefined;
    this.currentLeg.currentRoute=undefined;
    this.currentLeg.to.routeName=undefined;
    this._legChanged(); //send deactivate
};

/*---------------------------------------------------------
 route management functions (list, remove...)
 ----------------------------------------------------------*/

/**
 * list functions for routes
 * works async
 * @param server
 * @param okCallback function that will be called with a list of RouteInfo
 * @param opt_failCallback
 */
avnav.nav.RouteData.prototype.listRoutesServer=function(okCallback,opt_failCallback,opt_callbackData){
    return this._remoteRouteOperation("listroutes",{
        okcallback:function(data,param){
            if ((data.status && data.status!='OK') || (!data.items)) {
                if (opt_failCallback) {
                    opt_failCallback(data.status || "no items", param.callbackdata)
                    return;
                }
            }
            var items = [];
            var i;
            for (i = 0; i < data.items.length; i++) {
                var ri = new avnav.nav.RouteInfo();
                avnav.assign(ri, data.items[i]);
                ri.server = true;
                ri.time=ri.time*1e3; //we receive TS in s
                items.push(ri);
            }
            okCallback(items, param.callbackdata);

        },
        errorcallback:function(err,param){
            if (opt_failCallback){
                opt_failCallback(err,param.callbackdata)
            }
        },
        callbackdata:opt_callbackData

    });
};
/**
 * list local routes
 * returns a list of RouteInfo
 */
avnav.nav.RouteData.prototype.listRoutesLocal=function(){
    var rt=[];
    var i=0;
    var key,rtinfo,route;
    var routeprfx=this.propertyHandler.getProperties().routeName+".";
    for (i=0;i<localStorage.length;i++){
        key=localStorage.key(i);
        if (key.substr(0,routeprfx.length)==routeprfx){
            rtinfo=new avnav.nav.RouteInfo(key.substr(routeprfx.length));
            try {
                route=new avnav.nav.Route();
                route.fromJsonString(localStorage.getItem(key));
                if (route.points) rtinfo.numpoints=route.points.length;
                rtinfo.length=this.computeLength(0,route);
                rtinfo.time=route.time;

            } catch(e){}
            rt.push(rtinfo);
        }

    }
    return rt;
};
/**
 * delete a route both locally and on server
 * @param name
 * @param opt_errorcallback
 */
avnav.nav.RouteData.prototype.deleteRoute=function(name,opt_okcallback,opt_errorcallback,opt_localonly){
    try{
        localStorage.removeItem(this.propertyHandler.getProperties().routeName+"."+name);
    }catch(e){}
    if (this.connectMode && ! opt_localonly){
        this._remoteRouteOperation("deleteroute",{
            name:name,
            errorcallback:opt_errorcallback,
            okcallback:opt_okcallback
        });
    }
    else {
        if (opt_okcallback){
            setTimeout(function(){
                opt_okcallback();
            },0);
        }
    }
};

avnav.nav.RouteData.prototype.fetchRoute=function(name,localOnly,okcallback,opt_errorcallback){
    var route;
    if (localOnly){
        route=this._loadRoute(name);
        if (route){
            setTimeout(function(){
                okcallback(route);
            },0);
        }
        else if (opt_errorcallback){
            setTimeout(function(){
                opt_errorcallback(name);
            },0);
        }
        return;
    }
    this._remoteRouteOperation("getroute",{
        name:name,
        self:this,
        f_okcallback:okcallback,
        f_errorcallback:opt_errorcallback,
        okcallback: function(data,param){
            var rt=new avnav.nav.Route(param.name);
            rt.fromJson(data);
            rt.server=true;
            if (rt.time) rt.time=rt.time*1000;
            param.self._saveRouteLocal(rt,true);
            if (param.f_okcallback){
                param.f_okcallback(rt);
            }
        },
        errorcallback:function(status,param){
            if (param.f_errorcallback){
                param.f_errorcallback(param.name);
            }
        }
    });
};

/*---------------------------------------------------------
 routing (next wp...)
 ----------------------------------------------------------*/

/**
 * @private
 * check if we have to switch to the next WP
 */
avnav.nav.RouteData.prototype._checkNextWp=function(){
    if (! this.currentLeg.active || ! this.currentLeg.name || ! this.currentLeg.currentRoute) {
        this.currentLeg.approach=false;
        this.isApproaching=false;
        return;
    }
    var boat=this.navobject.getGpsHandler().getGpsData();
    //TODO: switch of routing?!
    if (! boat.valid) return;
    var nextWpNum=this.currentLeg.getCurrentTargetIdx()+1;
    var nextWp=this.currentLeg.currentRoute.getPointAtIndex(nextWpNum);
    var approach=this.propertyHandler.getProperties().routeApproach;
    try {
        var dst = avnav.nav.NavCompute.computeDistance(boat, this.currentLeg.to);
        //TODO: some handling for approach
        if (dst.dts <= approach){
            this.isApproaching=true;
            this.currentLeg.approach=true;
            var nextDst=new avnav.nav.navdata.Distance();
            if (nextWp){
                nextDst=avnav.nav.NavCompute.computeDistance(boat, nextWp);
            }
            if (this.lastDistanceToCurrent < 0 || this.lastDistanceToNext < 0){
                //seems to be the first time
                this.lastDistanceToCurrent=dst.dts;
                this.lastDistanceToNext=nextDst.dts;
                return;
            }
            //check if the distance to own wp increases and to the nex decreases
            var diffcurrent=dst.dts-this.lastDistanceToCurrent;
            if (diffcurrent <= 0){
                //still decreasing
                this.lastDistanceToCurrent=dst.dts;
                this.lastDistanceToNext=nextDst.dts;
                return;
            }
            var diffnext=nextDst.dts-this.lastDistanceToNext;
            if (diffnext > 0){
                //increases to next
                this.lastDistanceToCurrent=dst.dts;
                this.lastDistanceToNext=nextDst.dts;
                return;
            }
            //should we wait for some time???
            if (nextWp) {
                this.currentLeg.to=nextWp;
                this.routeOn();
                if (this.isEditingActiveRoute()) {
                    this.editingWp = nextWp;
                }
                log("switching to next WP");
                //TODO: should we fire a route event?
            }
            else {
                this.routeOff();
                log("end of route reached");
            }
        }
        else{
            this.isApproaching=false;
            this.currentLeg.approach=false;
        }
    } catch (ex){} //ignore errors
};

/*---------------------------------------------------------
 internal helpers
 ----------------------------------------------------------*/
/**
 * check if any change in the route we are editing affects the current leg
 * this will happen (potentially) if we are editing the active route
 * @param {avnav.nav.navdata.WayPoint} oldWp - if set - compare this to the current "to" and set a new destination (new WP) if equal
 * @param {avnav.nav.navdata.WayPoint} newWp - if set make this the new routing target
 * @returns {boolean} true if we already saved, otherwise saveRoute must be called
 * @private
 */
avnav.nav.RouteData.prototype._updateLeg=function(oldWp,newWp){
    var route=undefined;
    if (! oldWp || ! newWp) {
        if (!this.isEditingActiveRoute()) return false;
    }
    else{
        route=this.getRouteByName(newWp.routeName);
    }
    var changed=false;
    if (oldWp){
        if (oldWp.compare(this.currentLeg.to)){
            changed=true;
            if (newWp) this.currentLeg.to=newWp;
            else this.routeOff();
        }
    }
    if (this.currentLeg.currentRoute){
        if (this.currentLeg.to.routeName !=this.currentLeg.currentRoute.name){
            this.currentLeg.to.routeName =this.currentLeg.currentRoute.name;
            changed=true;
        }
        if (this.currentLeg.currentRoute.points.length ==0){
            this.routeOff();
            changed=true;
        }
        if (route && route.name == this.currentLeg.currentRoute.name){
            changed=true;
        }
    }
    if (changed) this._legChanged();
    //we must return false to indicate that saveRoute should be called
    return !(this.editingRoute != null && !this.isEditingActiveRoute());
};

/**
 *
 * @param data
 * @private
 * @return {Boolean} - true if data has changed
 */
avnav.nav.RouteData.prototype._handleLegResponse=function(data) {
    if (!data) {
        this.serverConnected = false;
        return false;
    }
    this.routeErrors=0;
    this.serverConnected=true;
    if (! data.to || ! data.from) return false;
    var nleg=new avnav.nav.Leg();
    nleg.fromJson(data);
    if (!nleg.differsTo(this.serverLeg)) {
        return false;
    }
    this.serverLeg=nleg;

    if (this.connectMode ) {
        if (this.serverLeg.differsTo(this.currentLeg)) {
            var editActive=this.isEditingActiveRoute();
            this.currentLeg = this.serverLeg.clone();
            if (this.currentLeg.name){
                if (! this.currentLeg.currentRoute){
                    var route=this._loadRoute(this.currentLeg.name);
                    if (route){
                        this.currentLeg.currentRoute=route;
                        this.currentLeg.name=route.name;
                    }
                    else{
                        this.currentLeg.currentRoute=new avnav.nav.Route(this.currentLeg.name);
                    }
                }
            }
            if (editActive){
                this.editingRoute=this.currentLeg.currentRoute;
            }
            this._saveLegLocal();
            if (this.isEditingActiveRoute()){
                this._findBestMatchingPoint();
            }
            this.navobject.routeEvent();
        }
    }
};
/**
 *
 * @param operation: getroute,listroutes,setroute,deleteroute
 * @param param {object}
 *        okcallback(data,param)
 *        errorcallback(errdata,param)
 *        name for operation load
 *        route for operation save
 * @private
 *
 */
avnav.nav.RouteData.prototype._remoteRouteOperation=function(operation, param) {
    var url = this.propertyHandler.getProperties().navUrl + "?request=routing&command=" + operation;
    var type="GET";
    var data=undefined;
    if (operation == "getroute" || operation=="deleteroute") {
        url += "&name=" + encodeURIComponent(param.name);
    }
    if(operation=="setroute"){
        if (avnav.android){
            log("android: setRoute");
            var status=avnav.android.storeRoute(param.route.toJsonString());
            var jstatus=JSON.parse(status);
            if (jstatus.status == "OK" && param.okcallback){
                setTimeout(function(){
                   param.okcallback(jstatus,param);
                },0);
            }
            if (param.errorcallback){
                setTimeout(function(){
                    param.errorcallback(jstatus.status,param);
                },0);
            }
            return;
        }
        type="POST";
        data=param.route.toJsonString();
    }
    var responseType="json";
    log("remoteRouteOperation, operation="+operation+", response="+responseType+", type="+type);
    param.operation=operation;
    $.ajax({
        url: url,
        type: type,
        data: data?data:undefined,
        dataType: responseType,
        contentType: "application/json; charset=utf-8",
        cache: false,
        success: function (data, status) {
            if (responseType == "json" && data.status && data.status != "OK") {
                //seems to be some error
                log("query route error: " + data.status);
                if (param.errorcallback){
                    param.errorcallback(data.status,param);
                }
                return;
            }
            if (param.okcallback) {
                if (responseType=="text" && operation=="getroute"){
                    log("convert route from xml: "+data);
                    var route=new avnav.nav.Route();
                    route.fromXml(data);
                    data=route.toJson();
                    log("converted Route: "+route.toJsonString());
                }
                param.okcallback(data, param);
            }
        },
        error: function (status, data, error) {
            log("query route error");
            if (param.errorcallback){
                param.errorcallback(error,param);
            }
        },
        timeout: 10000
    });
};

/**
 * @private
 */
avnav.nav.RouteData.prototype._startQuery=function() {
    this._checkNextWp();
    var url = this.propertyHandler.getProperties().navUrl+"?request=routing&command=getleg";
    var timeout = this.propertyHandler.getProperties().routeQueryTimeout; //in ms!
    var self = this;
    if (! this.connectMode || avnav.android){
        self.timer=window.setTimeout(function() {
            self._startQuery();
        },timeout);
        return;
    }
    else {
        $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            success: function (data, status) {
                var change = self._handleLegResponse(data);
                log("leg data change=" + change);
                self.timer = window.setTimeout(function () {
                    self._startQuery();
                }, timeout);
            },
            error: function (status, data, error) {
                log("query leg error");
                this.routeErrors++;
                if (this.routeErrors > 10) {
                    log("lost route");
                    this.serverConnected = false;
                }
                self.timer = window.setTimeout(function () {
                    self._startQuery();
                }, timeout);
            },
            timeout: 10000
        });
    }
    //we only query the route separately if it is currently not active
    if (! this.isEditingActiveRoute()) {
        if (! this.editingRoute) return;
        if (! this.connectMode) return;
        if (! this.editingRoute.server) return;
        this._remoteRouteOperation("getroute",{
            name:this.editingRoute.name,
            okcallback:function(data,param){
                var nRoute = new avnav.nav.Route();
                nRoute.fromJson(data);
                var change = nRoute.differsTo(self.serverRoute)
                log("route data change=" + change);
                if (change) {
                    self.serverRoute = nRoute;
                    if (!self.isEditingActiveRoute() && self.editingRoute && self.editingRoute.differsTo(self.serverRoute)) {
                        self.editingRoute = self.serverRoute.clone();
                        self.saveRoute();
                        self._findBestMatchingPoint();
                        self.navobject.routeEvent();
                    }

                }
            },
            errorcallback: function(status,param){

            }
        });

    }
};



/**
 * @private
 */
avnav.nav.RouteData.prototype._saveRouteLocal=function(opt_route, opt_keepTime) {
    var route = opt_route;
    if (!route) {
        route = this.getRoute();
        if (!route) return route;

    }
    if (! opt_keepTime || ! route.time) route.time = new Date().getTime();
    if (! route.server) {
        var str = route.toJsonString();
        localStorage.setItem(this.propertyHandler.getProperties().routeName + "." + route.name, str);
    }
    return route;
};


/**
 * load a locally stored route
 * @private
 * @param name
 * @returns {avnav.nav.Route}
 */
avnav.nav.RouteData.prototype._loadRoute=function(name){
    var rt=new avnav.nav.Route(name);
    try{
        var raw=localStorage.getItem(this.propertyHandler.getProperties().routeName+"."+name);
        if (! raw && name == this.DEFAULTROUTE){
            //fallback to load the old default route
            raw=localStorage.getItem(this.FALLBACKROUTENAME);
        }
        if (raw) {
            log("route "+name+" successfully loaded");
            rt.fromJsonString(raw);
            return rt;
        }
    }catch(ex){}
    return rt;
};

/**
 * save the current leg info
 * @private
 */
avnav.nav.RouteData.prototype._saveLegLocal=function(){
    var raw=this.currentLeg.toJsonString();
    localStorage.setItem(this.propertyHandler.getProperties().routingDataName,raw);
};

/**
 * @private
 * try to set the active waypoint to the one that is closest to the position
 * we had before
 */
avnav.nav.RouteData.prototype._findBestMatchingPoint=function(){
    if (! this.editingRoute) return;
    if (! this.editingWp) return;
    var idx;
    var mindistance=undefined;
    var bestPoint=undefined;
    var dst;
    for (idx=0;idx<this.editingRoute.points.length;idx++){
        dst=avnav.nav.NavCompute.computeDistance(this.editingWp,this.editingRoute.points[idx]);
        if (bestPoint === undefined || dst.dts<mindistance){
            bestPoint=this.editingRoute.points[idx];
            mindistance=dst.dts;
        }
    }
    this.editingWp=bestPoint;
};


/**
 * send the route
 * @private
 * @param {avnav.nav.Route} route
 * @param {function} opt_callback -. will be called on result, param: true on success
 */
avnav.nav.RouteData.prototype._sendRoute=function(route, opt_callback){
    //send route to server
    var self=this;
    var sroute=route.clone();
    if (sroute.time) sroute.time=sroute.time/1000;
    this._remoteRouteOperation("setroute",{
        route:route,
        self:self,
        okcallback:function(data,param){
            log("route sent to server");
            if (opt_callback)opt_callback(true);
        },
        errorcallback:function(status,param){
            if (param.self.propertyHandler.getProperties().routingServerError) alert("unable to send route to server:" + errMsg);
            if (opt_callback) opt_callback(false);
        }
    });
};


/**
 * leg has changed - save it and reset approach data
 * @returns {boolean}
 * @private
 */
avnav.nav.RouteData.prototype._legChanged=function(){
    //reset approach handling
    this.lastDistanceToCurrent=-1;
    this.lastDistanceToNext=-1;
    this._saveLegLocal();
    this.navobject.routeEvent();
    var self=this;
    if (avnav.android){
        avnav.android.setLeg(this.currentLeg.toJsonString());
        return;
    }
    if (this.connectMode){
        $.ajax({
            type: "POST",
            url: this.propertyHandler.getProperties().navUrl+"?request=routing&command=setleg",
            data: this.currentLeg.toJsonString(),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(data){
                log("new leg sent to server");
            },
            error: function(errMsg,x) {
                if (self.propertyHandler.getProperties().routingServerError) alert("unable to send leg to server:" +errMsg);
            }
        });
    }
    return true;
};


/**
 * @private
 * @param evdata
 */
avnav.nav.RouteData.prototype._propertyChange=function(evdata) {
    var oldcon=this.connectMode;
    this.connectMode=this.propertyHandler.getProperties().connectedMode;
    if (oldcon != this.connectMode && this.connectMode){
        //newly connected
        var oldActive;
        if (this.serverConnected && this.serverRoute) {
            this.editingRoute = this.serverRoute.clone();
        }
        if (this.serverConnected && this.serverLeg){
            this.currentLeg=this.serverLeg.clone();
        }
        this.navobject.routeEvent();
    }
};

