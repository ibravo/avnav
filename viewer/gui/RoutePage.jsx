/**
 * Created by andreas on 02.05.14.
 */

import Dynamic from '../hoc/Dynamic.jsx';
import Visible from '../hoc/Visible.jsx';
import Button from '../components/Button.jsx';
import ItemList from '../components/ItemList.jsx';
import globalStore from '../util/globalstore.jsx';
import keys,{KeyHelper} from '../util/keys.jsx';
import React from 'react';
import PropertyHandler from '../util/propertyhandler.js';
import history from '../util/history.js';
import Page from '../components/Page.jsx';
import Toast from '../util/overlay.js';
import MapHolder from '../map/mapholder.js';
import GuiHelpers from '../util/GuiHelpers.js';
import Helper from '../util/helper.js';
import WaypointListItem from '../components/WayPointListItem.jsx';
import WayPointDialog from '../components/WaypointDialog.jsx';
import Formatter from '../util/formatter.js';
import OverlayDialog from '../components/OverlayDialog.jsx';
import NavHandler from '../nav/navdata.js';
import assign from 'object-assign';
import RouteObjects from '../nav/routeobjects.js';
import RouteEdit,{StateHelper} from '../nav/routeeditor.js';

const editor=new RouteEdit(RouteEdit.MODES.PAGE);
const activeRoute=new RouteEdit(RouteEdit.MODES.ACTIVE);

const isActiveRoute=()=>{
    let activeName=activeRoute.getRouteName();
    if (activeName && activeName == editor.getRouteName()) return true;
    return false;
};

const DynamicPage=Dynamic(Page);
const RouteHandler=NavHandler.getRoutingHandler();

const Heading = (props)=>{
    if (! props.currentRoute) return null;
    let len=props.currentRoute.computeLength(0);
    return (
        <div className="routeCurrent" onClick={props.onClick}>
            <div className="routeName">{props.currentRoute.name||''}</div>
            <div className="routeInfo">{props.currentRoute.points.length||0}Points,{Formatter.formatDecimal(len,6,2)}nm</div>
            <span className="more"> </span>
        </div>
    );
};

const WaypointForList=(props)=>{
    let formattedProps=RouteObjects.formatRoutePoint(props);
    return <WaypointListItem {...formattedProps}/>
};

const createNewRouteDialog=(name,okCallback)=> {
    class Dialog extends React.Component{
        constructor(props){
            super(props);
            this.state={
                name: name,
                copyPoints: true
            };
            this.nameChanged=this.nameChanged.bind(this);
            this.changeValue=this.changeValue.bind(this);
            this.okFunction=this.okFunction.bind(this);
            this.cancelFunction=this.cancelFunction.bind(this);
        }
        nameChanged(event) {
            this.setState({name: event.target.value});
        }
        changeValue(name,newValue) {
            let ns={};
            ns[name]=newValue;
            this.setState(ns);
        }
        okFunction(event) {
            let rt = okCallback(this.state,this.props.closeCallback);
            if (rt ) this.props.closeCallback();
        }
        cancelFunction(event) {
            this.props.closeCallback();
        }
        render () {
            let self=this;
            let html = (
                <div className="editRouteName">
                    <h3 className="dialogTitle">Save as New</h3>
                    <div>
                        <div className="row">
                            <input type="text" name="value" value={this.state.name} onChange={this.nameChanged}/>
                        </div>
                        <div className="row" onClick={function () {
                                self.changeValue('copyPoints', !self.state.copyPoints);
                            }} >
                            <label>
                                Copy Points
                            </label>
                            <span className={'avnCheckbox' + (this.state.copyPoints ? ' checked' : '')}/>
                        </div>
                    </div>
                    <button name="ok" onClick={this.okFunction}>Ok</button>
                    <button name="cancel" onClick={this.cancelFunction}>Cancel</button>
                    <div className="clear"></div>
                </div>
            );
            return html;
        }
    };
    return Dialog;
};


const checkWritable=()=>{
     if (!editor.isRouteWritable()){
         OverlayDialog.confirm("you cannot edit this route as you are disconnected. Please select a new name");
         return false;
     }
    return true;
};

const onHeadingClick=()=> {
    if (!editor.hasRoute()) return;
    const okCallback = (values, closeFunction)=> {
        if (! editor.hasRoute()) return;
        let name = values.name || "";
        if (name == editor.getRouteName()) return true;
        if (name != globalStore.getData(keys.gui.routepage.initialName)) {
            //check if a route with this name already exists
            RouteHandler.fetchRoute(name, false,
                (data)=> {
                    Toast.Toast("route with name " + name + " already exists");
                },
                (er)=> {
                    let newRoute = editor.getRoute().clone();
                    newRoute.setName(name);
                    if (!values.copyPoints) {
                        newRoute.points = [];
                    }
                    if (!globalStore.getData(keys.properties.connectedMode, false)) newRoute.server = false;
                    editor.setRouteAndIndex(newRoute,-1);
                    closeFunction();
                });
            return false;
        }
        return true;
    };
    OverlayDialog.dialog(createNewRouteDialog(editor.getRouteName(),
        okCallback));
};


const startWaypointDialog=(item,index)=>{
    const wpChanged=(newWp,close)=>{
        if (! checkWritable()) return;
        let changedWp=WayPointDialog.updateWaypoint(item,newWp,function(err){
            Toast.Toast(Helper.escapeHtml(err));
        });
        if (changedWp) {
            if (! editor.checkChangePossible(changedWp,index)){
                Toast.Toast("unable to set waypoint, already exists");
                return false;
            }
            editor.changeSelectedWaypoint(changedWp,index);
            return true;
        }
        return false;
    };
    let RenderDialog=function(props){
        return <WayPointDialog
            {...props}
            waypoint={item}
            okCallback={wpChanged}/>
    };
    OverlayDialog.dialog(RenderDialog);
};

const storeRoute=(route,startNav)=>{
    if (globalStore.getData(keys.gui.routepage.initialName,"") != route.name){
        route.server=globalStore.getData(keys.properties.connectedMode,false);
    }

    let current=editor.getPointAt();
    if (current) MapHolder.setCenter(current);
    editor.setNewRoute(route); //potentially we changed the server flag - so write it again
    editor.setNewIndex(editor.getIndexFromPoint(current,true));
    editor.syncTo(RouteEdit.MODES.EDIT);
    if (isActiveRoute()){
        activeRoute.setNewRoute(route);
    }
    if (startNav && current){
            RouteHandler.wpOn(current,true);
    }
    return true;
};

class RoutePage extends React.Component{
    constructor(props){
        super(props);
        let self=this;
        this.listRef=undefined;
        this.buttons=[
            {
                name:'RoutePageOk',
                onClick:()=>{
                    self.storeRouteAndReturn(false);
                }
            },
            {
                name:'NavGoto',
                onClick:()=>{
                    self.storeRouteAndReturn(true);
                }
            },
            {
                name:'NavInvert',
                onClick: ()=>{
                    if (! checkWritable())return;
                    editor.invertRoute();
                }
            },
            {
                name:'NavDeleteAll',
                onClick: ()=>{
                    if (! checkWritable()) return;
                    editor.emptyRoute();
                }
            },
            {
                name:'RoutePageDownload',
                onClick:()=>{
                    history.push("downloadpage",{
                        downloadtype:'route',
                        allowChange: false,
                        selectItemCallback: (item)=>{
                            RouteHandler.fetchRoute(item.name,!item.server,
                                (route)=>{
                                    editor.setRouteAndIndex(route,0);
                                    globalStore.storeData(keys.gui.routepage.initialName,route.name);
                                    history.pop();
                                },
                                function(err){
                                    Toast.Toast("unable to load route");
                                }
                            );
                        }
                    });
                }
            },
            {
                name: 'Cancel',
                onClick: ()=>{history.pop()}
            }
        ];
        this.storeRouteAndReturn=this.storeRouteAndReturn.bind(this);
        globalStore.storeData(keys.gui.routepage.initialName,editor.getRouteName());
    }

    componentDidMount(){
        if (this.listRef){
            let el=this.listRef.querySelector('.activeEntry');
            if (el){
                let mode=GuiHelpers.scrollInContainer(this.listRef,el);
                if (mode >= 1 || mode <= 2) el.scrollIntoView(mode==1);
            }
        }
    }


    storeRouteAndReturn(startNav){
        if (!editor.hasRoute()){
            history.pop();
            return;
        }
        let currentName=editor.getRouteName();
        let current=editor.getRoute();
        if (currentName != globalStore.getData(keys.gui.routepage.initialName,"") ){
            //check if a route with this name already exists
            RouteHandler.fetchRoute(currentName,!current.server,
                function(data){
                    Toast.Toast("route with name "+currentName+" already exists");
                },
                function(er){
                    if(storeRoute(current.clone(),startNav)) history.pop();
                });
            return;
        }
        if (storeRoute(current.clone(),startNav)) history.pop();
        return true;
    }


    render(){
        let self=this;
        const MainContent=Dynamic((props)=> {
            let [route,index,isActive]=StateHelper.getRouteIndexFlag(props);
            if (! route) return null;
            return(
            <React.Fragment>
                <Heading
                    onClick={onHeadingClick}
                    currentRoute={route}
                    />
                <ItemList
                    itemList={route.getRoutePoints(index)}
                    itemClass={WaypointForList}
                    scrollable={true}
                    onItemClick={(item,data)=>{
                        if (data=='btnDelete'){
                            if (!checkWritable()) return;
                            editor.setNewIndex(item.idx);
                            editor.deleteWaypoint();
                            return;
                        }
                        if (item.idx == editor.getIndex()){
                            startWaypointDialog(item,item.idx);
                            return;
                        }
                        editor.setNewIndex(item.idx);
                    }}
                    listRef={(el)=>{self.listRef=el;}}
                    />

            </React.Fragment>
            );
        });
        return (
            <DynamicPage
                style={this.props.style}
                id="routepage"
                mainContent={
                            <MainContent
                                storeKeys={editor.getStoreKeys()}
                            />
                        }
                buttonList={self.buttons}
                storeKeys={KeyHelper.flattenedKeys(editor.getStoreKeys())
                                    .concat(KeyHelper.flattenedKeys(activeRoute.getStoreKeys()))}
                updateFunction={(state)=>{
                    let isActive=isActiveRoute();
                    return{
                        title:isActive?"Active Route":"Inactive Route",
                        className:isActive?"activeRoute":""
                    };
                }}
                />
        );
    }
}

module.exports=RoutePage;