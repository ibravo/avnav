var WidgetUpdater=require("./WidgetUpdater.jsx");
var Formatter=require('../util/formatter');
var React=require("react");
var assign=require("object-assign");
var widgetList=require('./WidgetList');


class WidgetFactory{
    constructor(){
        this.createWidget=this.createWidget.bind(this);
    }
    /**
     * find a complete widget description
     * @param widget - either a name or a widget description with a name field
     * @returns {*}
     */
    findWidget(widget){
        var i=this.findWidgetIndex(widget);
        if (i < 0) return undefined;
        return widgetList[i];
    }

    /**
     * find teh index for a widget
     * @param widget - either a name or a widget description with a name field
     * @returns {number} - -1 omn error
     */
    findWidgetIndex(widget){
        if (widget === undefined) return -1;
        var search=widget;
        if (typeof(widget) !== "string"){
            search=widget.name;
        }
        var i;
        for (i=0;i<widgetList.length;i++) {
            var e = widgetList[i];
            if ((e.name !== undefined && e.name == search ) || (e.caption == search)) {
                return i;
            }
        }
        return -1;
    }
    createWidget(props: Object){
        if (! props.name) return;
        var e=this.findWidget(props.name);
        if (e) {
            var rt={};
            rt.props=avnav.assign({},e,props);
            rt.element=WidgetUpdater(e.wclass);
            return rt;
        }
    }
    getWidget(index: Number){
        if (index < 0 || index >= widgetList.length) return undefined;
        var el=assign({},widgetList[index]);
        if (el.name === undefined) el.name=el.caption;
        if (el.description === undefined)el.description=el.name;
        return el;
    }
    getAvailableWidgets(){
        var rt=[];
        var i;
        for (i=0;i< widgetList.length;i++){
            var el=this.getWidget(i);
            rt.push(el);
        }
        return rt;
    }
}

module.exports=new WidgetFactory();