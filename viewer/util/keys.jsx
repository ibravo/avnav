/**
 * Created by andreas on 27.07.19.
 */

import assign from 'object-assign';

const K=999; //the real value does not matter

export const PropertyType={
    CHECKBOX:0,
    RANGE:1,
    LIST:2,
    COLOR:3
};

/**
 * data holder for property description
 * @param defaultv
 * @param opt_label
 * @param opt_type
 * @param opt_values either min,max,[step],[decimal] for range or a list of value:label for list
 * @constructor
 */
export const Property=function(defaultv,opt_label,opt_type,opt_values){
    this.defaultv=defaultv;
    this.label=opt_label;
    this.type=(opt_type !== undefined)?opt_type:PropertyType.RANGE;
    this.values=(opt_values !== undefined)?opt_values:[0,1000]; //assume range 0...1000
};

/**
 * key with description
 * @param description
 * @constructor
 */
const D=function(description){
    this.description=description;
};

let keyDescriptions={}; //will be filled on first module loading

export class KeyNode{
    constructor(original,path){
        assign(this,original);
        this.__path=path;
    }
}

//the global definition of all used store keys
//every leaf entry having the value "K" will be replaced with its path as a string
let keys={
    nav:{
        gps:{
            lat:K,
            lon:K,
            position: new D("an instance of navobjects.Point"),
            course: K,
            speed: K,
            rtime: K,
            raw: K,
            valid: K,
            windAngle: K,
            windSpeed: K,
            windReference: K,
            positionAverageOn:K,
            speedAverageOn: K,
            courseAverageOn: K,
            depthBelowTransducer: K,
            alarms: K,
            sequence: K //will be incremented as last operation on each receive
        },
        center:{
            course: K,
            distance: K,
            markerCourse: K,
            markerDistance: K
        },
        wp:{
            course: K,
            distance: K,
            eta: K,
            xte: K,
            vmg: K,
            position: K,
            name: K
        },
        anchor:{
            distance: K,
            direction:K,
            watchDistance: K
        },
        route:{
            name: K,
            numPoints: K,
            len:K,
            remain: K,
            eta: K,
            nextCourse: K,
            isApproaching: K
        },

        ais:{
            nearest: K, //to be displayed
            list:K,
            trackedMmsi: K,
            updateCount:K
        },
        routeHandler:{
            activeName: K,
            routeForPage: K,
            pageRouteIndex: K,
            editingRoute:K,
            editingIndex: K,
            currentLeg: new D("the current leg used for routing"),
            currentIndex: new D("the index when working directly on the active route (currentLeg)")
        },
        track:{
            currentTrack:K
        }
    },
    map:{
        lockPosition: K,
        courseUp: K,
        currentZoom:K,
        requiredZoom:K,
        centerPosition:K,
        url:K,
        chartBase: K,
        },
    gui:{
        global:{
            smallDisplay: K,
            pageName: K,
            pageOptions:K,
            onAndroid:K,
            propertySequence:K,
            hasActiveInputs: K,
            currentDialog: K, //holds the data for the currently visible dialog - if any
            windowDimensions: K,
            layout: K, //the loaded layout object
            layoutSequence: K, //updated on layout load
            reloadSequence: K, //will be changed if new data from server
            buttonFontSize: K,
            toastText:K,
            toastTimeout:K,
            toastCallback:K
        },
        mainpage:{
            chartList: K,
            status: K,
            addOns: K,
        },
        gpspage:{
            pageNumber:K,
        },
        aispage:{
            sortField:K,
        },
        addonpage:{
            activeAddOn:K,
        },
        addresspage:{
            addressList:K
        },
        statuspage:{
            wpa:K,
            addresses:K,
            shutdown: K,
            statusItems:    K,
            serverError: K,
        },
        wpapage:{
            interface:K,
            wpaItems:K,
            showAccess:K
        },
        routepage:{
            initialName:K,
        },
        downloadpage:{
            type:K,
            currentItems:K,
            downloadParameters:K,
            fileInputKey:K,
            enableUpload:K,
            uploadInfo:K,
        },
        settingspage:{
            hasChanges:K,
            values:K,
            section:K,
            leftPanelVisible: K
        },
        navpage:{
            selectedWp:K,

        },
        editroutepage:{
            selectedWp:K,
            lastCenteredWp:K
        }

    },
    //all keys below this one are the former properties
    //they will be written to local storage on change
    //and the store will be filled with initial values on start
    properties: {
        layers: {
            ais: new Property(true, "AIS", PropertyType.CHECKBOX),
            track: new Property(true, "Track", PropertyType.CHECKBOX),
            nav: new Property(true, "Navigation", PropertyType.CHECKBOX),
            boat: new Property(true, "Boat", PropertyType.CHECKBOX),
            grid: new Property(true, "Grid", PropertyType.CHECKBOX),
            compass: new Property(true, "Compass", PropertyType.CHECKBOX)
        },
        localAlarmSound: new Property(true, "Alarm Sound", PropertyType.CHECKBOX),
        connectedMode: new Property(true, "connected", PropertyType.CHECKBOX),
        readOnlyServer: new Property(false),
        NM: new Property(1852), //one mile
        silenceSound: new Property("sounds/1-minute-of-silence.mp3"),
        buttonUpdateTime: new Property(500), //timer for button updates
        slideTime: new Property(300), //time in ms for upzoom
        slideLevels: new Property(3), //start with that many lower zoom levels
        maxUpscale: new Property(2), //2 levels upscale (otherwise we need too much mem)
        hideLower: new Property(true), //if set, hide smaller zoom layers when completely covered
        maxZoom: new Property(21),  //only allow upscaling up to this zom level
        courseAverageFactor: new Property(0.5), //moving average for course up
        courseAverageTolerance: new Property(15, "Rotation Tolerance", PropertyType.RANGE, [1, 30]), //tolerance for slow rotation
        minGridLedvel: new Property(10),
        loggingEnabled: new Property(true),
        maxButtons: new Property(8),
        positionQueryTimeout: new Property(1000, "Position (ms)", PropertyType.RANGE, [500, 5000, 10]), //1000ms
        trackQueryTimeout: new Property(5000, "Track (ms)", PropertyType.RANGE, [500, 10000, 10]), //5s in ms
        routeQueryTimeout: new Property(1000, "Route (ms)", PropertyType.RANGE, [500, 10000, 10]), //5s in ms
        courseAverageInterval: new Property(0, "Course average", PropertyType.RANGE, [0, 20, 1]), //unit: query interval
        speedAverageInterval: new Property(0, "Speed average", PropertyType.RANGE, [0, 20, 1]), //unit: query interval
        positionAverageInterval: new Property(0, "Position average", PropertyType.RANGE, [0, 20, 1]), //unit: query interval
        bearingColor: new Property("#DDA01F", "Color", PropertyType.COLOR),
        bearingWidth: new Property(3, "Width", PropertyType.RANGE, [1, 10]),
        routeColor: new Property("#27413B", "Color", PropertyType.COLOR),
        routeWidth: new Property(2, "Width", PropertyType.RANGE, [1, 10]),
        routeWpSize: new Property(7, "WPSize", PropertyType.RANGE, [5, 30]),
        routeApproach: new Property(200, "Approach(m)", PropertyType.RANGE, [20, 2000]),
        routeShowLL: new Property(false, "showLatLon", PropertyType.CHECKBOX), //show latlon or leg course/len
        navCircleColor: new Property("#D71038", "Circle Color", PropertyType.COLOR),
        navCircleWidth: new Property(1, "Circle Width", PropertyType.RANGE, [1, 10]),
        anchorCircleColor: new Property("#D71038", "Anchor Circle Color", PropertyType.COLOR),
        anchorCircleWidth: new Property(1, "Anchor Circle Width", PropertyType.RANGE, [1, 10]),
        navCircle1Radius: new Property(300, "Circle 1 Radius(m)", PropertyType.RANGE, [0, 5000, 10]),
        navCircle2Radius: new Property(1000, "Circle 2 Radius(m)", PropertyType.RANGE, [0, 5000, 10]),
        navCircle3Radius: new Property(0, "Circle 3 Radius(m)", PropertyType.RANGE, [0, 10000, 10]),
        anchorWatchDefault: new Property(300, "AnchorWatch(m)", PropertyType.RANGE, [0, 1000, 1]),
        gpsXteMax: new Property(1, "XTE(nm)", PropertyType.RANGE, [0.1, 5, 0.1, 1]),
        trackColor: new Property("#942eba", "Color", PropertyType.COLOR),
        trackWidth: new Property(3, "Width", PropertyType.RANGE, [1, 10]),
        trackInterval: new Property(30, "Point Dist.(s)", PropertyType.RANGE, [5, 300]), //seconds
        initialTrackLength: new Property(24, "Length(h)", PropertyType.RANGE, [1, 48]), //in h
        aisQueryTimeout: new Property(5000, "AIS (ms)", PropertyType.RANGE, [1000, 10000, 10]), //ms
        aisDistance: new Property(20, "AIS-Range(nm)", PropertyType.RANGE, [1, 100]), //distance for AIS query in nm
        aisClickTolerance: new Property(80, "Click Tolerance", PropertyType.RANGE, [10, 100]),
        maxAisErrors: new Property(3), //after that many errors AIS display will be switched off
        minAISspeed: new Property(0.2), //minimal speed in kn that we consider when computing cpa/tcpa
        maxAisTPA: new Property(3),    //max. computed AIS TPA time in h (otherwise we do not consider this)
        aisWarningCpa: new Property(500, "AIS Warning-CPA(m)", PropertyType.RANGE, [100, 5000, 10]), //m for AIS warning (500m)
        aisWarningTpa: new Property(900, "AIS-Warning-TPA(s)", PropertyType.RANGE, [30, 3600, 10]), //in s - max time for tpa warning (15min)
        aisTextSize: new Property(14, "Text Size(px)", PropertyType.RANGE, [8, 24]), //in px
        //images are not used any more, just keeping for fallback
        aisNormalImage: new Property('images/ais-default.png'),
        aisNearestImage: new Property('images/ais-nearest.png'),
        aisWarningImage: new Property('images/ais-warning.png'),
        aisBrowserWorkaround: new Property(600, "Browser AisPage Workaround(ms)", PropertyType.RANGE, [0, 6000, 10]),
        statusQueryTimeout: new Property(3000), //ms
        wpaQueryTimeout: new Property(4000), //ms
        centerDisplayTimeout: new Property(45000), //ms - auto hide measure display (0 - no auto hide)
        navUrl: new Property("/viewer/avnav_navi.php"),
        maxGpsErrors: new Property(3), //after that much invalid responses/timeouts the GPS is dead
        settingsName: new Property("avnav.settings"), //storage name
        routingDataName: new Property("avnav.routing"),
        routeName: new Property("avnav.route"), //prefix for route names
        routingServerError: new Property(true, "ServerError", PropertyType.CHECKBOX), //notify comm errors to server
        routingTextSize: new Property(14, "Text Size(px)", PropertyType.RANGE, [8, 36]), //in px
        centerName: new Property("avnav.center"),
        statusErrorImage: new Property("images/RedBubble40.png"),
        statusOkImage: new Property("images/GreenBubble40.png"),
        statusYellowImage: new Property("images/YellowBubble40.png"),
        statusUnknownImage: new Property("images/GreyBubble40.png"),
        statusIcons: {
            INACTIVE: new Property("images/GreyBubble40.png"),
            STARTED: new Property("images/YellowBubble40.png"),
            RUNNING: new Property("images/YellowBubble40.png"),
            NMEA: new Property("images/GreenBubble40.png"),
            ERROR: new Property("images/RedBubble40.png")
        },
        nightFade: new Property(50, "NightDim(%)", PropertyType.RANGE, [1, 99]), //in px
        nightChartFade: new Property(30, "NightChartDim(%)", PropertyType.RANGE, [1, 99]), //in %
        baseFontSize: new Property(14, "Base Font(px)", PropertyType.RANGE, [8, 28]),
        widgetFontSize: new Property(16, "Widget Base Font(px)", PropertyType.RANGE, [8, 28]),
        allowTwoWidgetRows: new Property(true, "2 widget rows", PropertyType.CHECKBOX),
        showClock: new Property(true, "show clock", PropertyType.CHECKBOX),
        showZoom: new Property(true, "show zoom", PropertyType.CHECKBOX),
        showWind: new Property(true, "show wind", PropertyType.CHECKBOX),
        showDepth: new Property(true, "show depth", PropertyType.CHECKBOX),
        autoZoom: new Property(true, "automatic zoom", PropertyType.CHECKBOX),
        windKnots: new Property(true, "wind knots", PropertyType.CHECKBOX),
        nightMode: new Property(false, "NightMode", PropertyType.CHECKBOX),
        nightColorDim: new Property(60, "Night Dim for Colors", PropertyType.RANGE, [5, 100]), //should match @nightModeVale in less
        smallBreak: new Property(480, "portrait layout below (px)", PropertyType.RANGE, [200, 9999]),
        iosWorkaroundTime: new Property(300, "time to ignore events after page show", PropertyType.RANGE, [0, 1000]),

        style: {
            buttonSize: new Property(60, "Button Size(px)", PropertyType.RANGE, [35, 100]),
            aisWarningColor: new Property("#FA584A", "Warning", PropertyType.COLOR),
            aisNormalColor: new Property("#EBEB55", "Normal", PropertyType.COLOR),
            aisNearestColor: new Property('#70F3AF', "Nearest", PropertyType.COLOR),
            aisTrackingColor: new Property('#CAD5BE', "Tracking", PropertyType.COLOR),
            routeApproachingColor: new Property('#FA584A', "Approach", PropertyType.COLOR),
            widgetMargin: new Property(3, "Widget Margin(px)", PropertyType.RANGE, [1, 20])
        }

    }
};

//replace all leaf values with their path as string
function update_keys(base,name){
    for (let k in base){
        let cname=name?(name+"."+k):k;
        if (base[k] === K){
            base[k]=cname;
            continue;
        }
        let current=base[k];
        if (typeof (current) === 'object'){
            if (current instanceof D || current instanceof Property){
                keyDescriptions[cname]=current;
                base[k]=cname;
                continue;
            }
            update_keys(base[k],cname);
            base[k]=new KeyNode(base[k],cname);
        }
    }
}

update_keys(keys);


export const KeyHelper = {
    keyNodeToString:(keyNode)=> {
        if (!keyNode) return;
        if (typeof(keyNode.__path) === undefined) return;
        return keyNode.__path;
    },
    /**
    * get the default values in a form suitable
    * for calling storeMultiple at the store API
    */
    getDefaultKeyValues:()=> {
        let values = {};
        for (let k in keyDescriptions) {
            let description = keyDescriptions[k];
            if (description.defaultv !== undefined) {
                values[k] = description.defaultv;
            }
        }
        return values;
    },
    getKeyDescriptions:(opt_propertiesOnly)=> {
        if (!opt_propertiesOnly) return keyDescriptions;
        let rt = {};
        for (let k in keyDescriptions) {
            if (keyDescriptions[k] instanceof Property) {
                rt[k] = keyDescriptions[k];
            }
        }
        return rt;
    },
    /**
     * return all the keys as an arry of strings
     * the input can be any type that can be used in store functions
     * @param keyObject: string, array of strings, key objects (keys being the values, can be nested)
     */
    flattenedKeys:(keyObject)=>{
        if (keyObject instanceof Array) return keyObject;
        if (keyObject instanceof Object){
            let rt=[];
            for (let k in keyObject){
                let kv=keyObject[k];
                if (kv instanceof Object){
                    rt=rt.concat(KeyHelper.flattenedKeys(kv))
                }
                else{
                    rt.push(kv);
                }
            }
            return rt;
        }
        return [keyObject]

    }
};

export default keys;

