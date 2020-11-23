import React from 'react';
import PropTypes from 'prop-types';
import Promise from 'promise';
import OverlayDialog,{dialogHelper,stateHelper} from './OverlayDialog.jsx';
import assign from 'object-assign';
import {Input,Checkbox,InputReadOnly,InputSelect,ColorSelector,Radio} from './Inputs.jsx';
import DB from './DialogButton.jsx';
import Button from './Button.jsx';
import ItemList from './ItemList.jsx';
import Requests from '../util/requests.js';
import Toast from './Toast.jsx';
import Helper from '../util/helper.js';
import GuiHelpers from '../util/GuiHelpers.js';
import {readFeatureInfoFromGpx} from '../map/gpxchartsource';
import {getOverlayConfigName} from '../map/chartsourcebase'
import globalStore from "../util/globalstore";
import keys from '../util/keys';
import OverlayConfig from '../map/overlayconfig';

const filterOverlayItem=(item,opt_itemInfo)=>{
    let rt=undefined;
    if (item.type === 'chart') {
        rt=Helper.filteredAssign({chartKey:true,type:true,opacity:true,enabled:true},item)
    }
    else {
        rt = assign({}, item);
    }
    for (let k in rt){
        if (typeof rt[k] === 'function'){
            delete rt[k];
        }
    }
    delete rt.selected;
    delete rt.index;
    delete rt.disabled;
    let dstyles=['style.lineWidth','style.lineColor'];
    if (opt_itemInfo){
        dstyles.forEach((st)=> {
            if (!opt_itemInfo[st]) delete rt[st];
        })
        if (! opt_itemInfo.hasSymbols && ! opt_itemInfo.hasLinks){
            delete rt.icons;
        }
    }
    return rt;
};
const KNOWN_OVERLAY_EXTENSIONS=['gpx'];
const KNOWN_ICON_FILE_EXTENSIONS=['zip'];
class OverlayItemDialog extends React.Component{
    constructor(props) {
        super(props);
        this.dialogHelper = dialogHelper(this);
        this.state= {
            itemsFetchCount: 0,
            itemInfo: undefined,
            loading: false
        }
        this.stateHelper = stateHelper(this, props.current || {},'item');
        this.state.itemsFetchCount = 0;
        //we make them only a variable as we consider them to be static
        this.itemLists={icons:[{label:"--none--"}],chart:[],overlay:[],images:[],user:[],knownOverlays:[],iconFiles:[{label:"--none--"}]};
        if (props.current && props.current.url && props.current.type !== 'chart') {
            this.analyseOverlay(props.current.url);
        }
        this.getItemList('chart');
        this.getItemList('overlay');
        this.getItemList('images');
        this.getItemList('user');
    }
    getItemList(type){
        Requests.getJson("",{},{
            request: 'listdir',
            type: type
        })
        .then((data)=>{
                this.itemLists[type]=data.items;
                if (type == 'user' || type == 'images' || type == 'overlay') {
                    data.items.forEach((item)=>{
                        if (GuiHelpers.IMAGES.indexOf(Helper.getExt(item.name)) >= 0) {
                            let el=assign({},item);
                            el.label=el.url;
                            this.itemLists.icons.push(el);
                        }
                    })
                }
                if (type == 'chart'){
                    //prepare select list
                    data.items.forEach((item)=>{
                        item.label=item.name;
                        item.value=item.chartKey;
                    });
                }
                if (type == 'overlay'){
                    data.items.forEach((item)=>{
                        item.label=item.name;
                        item.value=item.url;
                        if (KNOWN_OVERLAY_EXTENSIONS.indexOf(Helper.getExt(item.name))>=0){
                            this.itemLists.knownOverlays.push(item);
                        }
                        if (KNOWN_ICON_FILE_EXTENSIONS.indexOf(Helper.getExt(item.name))>=0){
                            this.itemLists.iconFiles.push(assign({},item,{label:item.url}));
                        }
                    });
                }
                this.setState({itemsFetchCount:this.state.itemsFetchCount+1})
            })
        .catch((error)=>{
                Toast("error fetching list of "+type+": "+error);
            })
    }
    changeType(newType){
        if (newType == this.stateHelper.getValue('type')) return;
        let newState={
            type: newType,
            opacity: 1
        };
        this.stateHelper.setState(newState,true);
    }
    analyseOverlay(url){
        this.setState({loading:true,itemInfo:undefined});
        Requests.getHtmlOrText(url)
            .then((data)=>{
                try {
                    let featureInfo = readFeatureInfoFromGpx(data);
                    if (! featureInfo.hasAny){
                        Toast(url+" is no valid gpx file");
                        this.setState({loading:false,itemInfo:{}});
                        this.stateHelper.setValue('name',undefined);
                    }
                    let newState={loading:false,itemInfo: featureInfo}
                    this.setState(newState);
                }catch (e){
                    Toast(url+" is no valid gpx: "+e.message);
                    this.setState({loading:false,itemInfo:{}});
                    this.stateHelper.setValue('name',undefined);
                }
            })
            .catch((error)=>{
                Toast("unable to load "+url+": "+error)
                this.setState({loading:false,itemInfo:{}});
                this.stateHelper.setValue('name',undefined);
            })
    }
    render(){
        let hasChanges=this.stateHelper.isChanged();
        let currentType=this.stateHelper.getValue('type');
        let itemInfo=this.state.itemInfo||{ };
        let defaultLineWith=(itemInfo.hasRoute)?globalStore.getData(keys.properties.routeWidth):
            globalStore.getData(keys.properties.trackWidth);
        let defaultColor=(itemInfo.hasRoute)?globalStore.getData(keys.properties.routeColor):
            globalStore.getData(keys.properties.routeColor);
        return(
            <React.Fragment>
                <div className="selectDialog editOverlayItemDialog">
                    <h3 className="dialogTitle">{this.props.title || 'Edit Overlay'}</h3>
                    <div className="dialogRow info"><span
                        className="inputLabel">Overlay</span>{this.stateHelper.getValue('name')}</div>
                    {this.state.isLoading ?
                        <div className="loadingIndicator">Analyzing...</div>
                        :
                        <React.Fragment>
                            <Checkbox
                                className="enabled"
                                dialogRow={true}
                                label="enabled"
                                onChange={(nv) => this.stateHelper.setState({enabled: nv})}
                                value={this.stateHelper.getValue("enabled") || false}/>
                            <Radio
                                className="type"
                                dialogRow={true}
                                label="type"
                                value={currentType}
                                itemList={[{label: 'overlay', value: 'overlay'}, {label: 'chart', value: 'chart'}]}
                                onChange={(nv) => this.changeType(nv)}
                            />
                            <Input
                                className="opacity"
                                dialogRow={true}
                                label="opacity"
                                value={this.stateHelper.getValue('opacity')}
                                onChange={(nv) => this.stateHelper.setValue('opacity', nv)}
                                type="number"
                            />
                            {(currentType == 'chart') ?
                                <React.Fragment>
                                    <InputSelect
                                        dialogRow={true}
                                        label="chart name"
                                        value={{
                                            value: this.stateHelper.getValue('chartKey'),
                                            label: this.stateHelper.getValue('name')
                                        }}
                                        list={this.itemLists.chart}
                                        fetchCount={this.state.itemsFetchCount}
                                        showDialogFunction={this.dialogHelper.showDialog}
                                        onChange={(nv) => {
                                            this.stateHelper.setState({chartKey: nv.chartKey, name: nv.name});
                                        }}
                                    />
                                </React.Fragment> :
                                <React.Fragment>
                                    <InputSelect
                                        dialogRow={true}
                                        label="overlay name"
                                        value={this.stateHelper.getValue('name')}
                                        list={this.itemLists.knownOverlays}
                                        fetchCount={this.state.itemsFetchCount}
                                        showDialogFunction={this.dialogHelper.showDialog}
                                        onChange={(nv) => {
                                            this.stateHelper.setState({url: nv.url, name: nv.name});
                                            this.analyseOverlay(nv.url);
                                        }}
                                    />
                                    {(itemInfo.hasSymbols || itemInfo.hasLinks) && <InputSelect
                                        dialogRow={true}
                                        label="icon file"
                                        value={this.stateHelper.getValue('icons')}
                                        list={this.itemLists.iconFiles}
                                        fetchCount={this.state.itemsFetchCount}
                                        showDialogFunction={this.dialogHelper.showDialog}
                                        onChange={(nv) => {
                                            this.stateHelper.setState({icons: nv.url});
                                        }}
                                    />
                                    }
                                    {itemInfo['style.lineWidth'] &&
                                        <Input
                                            dialogRow={true}
                                            type="number"
                                            label="line width"
                                            value={this.stateHelper.getValue('style.lineWidth',defaultLineWith)}
                                            onChange={(nv)=>this.stateHelper.setValue('style.lineWidth',nv)}
                                            />
                                    }
                                    {itemInfo['style.lineColor'] &&
                                    <ColorSelector
                                        dialogRow={true}
                                        label="line color"
                                        value={this.stateHelper.getValue('style.lineColor',defaultColor)}
                                        onChange={(nv)=>this.stateHelper.setValue('style.lineColor',nv)}
                                        showDialogFunction={this.dialogHelper.showDialog}
                                    />
                                    }
                                    <Input
                                        dialogRow={true}
                                        type="number"
                                        label="min zoom"
                                        value={this.stateHelper.getValue('minZoom') || 0}
                                        onChange={(nv) => this.stateHelper.setValue('minZoom', nv)}
                                    />
                                    <Input
                                        dialogRow={true}
                                        type="number"
                                        label="max zoom"
                                        value={this.stateHelper.getValue('maxZoom') || 0}
                                        onChange={(nv) => this.stateHelper.setValue('maxZoom', nv)}
                                    />
                                    {itemInfo.hasSymbols && <Input
                                        dialogRow={true}
                                        type="number"
                                        label="min scale"
                                        value={this.stateHelper.getValue('minScale') || 0}
                                        onChange={(nv) => this.stateHelper.setValue('minScale', nv)}
                                    />}
                                    {itemInfo.hasSymbols && <Input
                                        dialogRow={true}
                                        type="number"
                                        label="max scale"
                                        value={this.stateHelper.getValue('maxScale') || 0}
                                        onChange={(nv) => this.stateHelper.setValue('maxScale', nv)}
                                    />}
                                    {itemInfo.hasSymbols &&<InputSelect
                                        dialogRow={true}
                                        label="default icon"
                                        value={this.stateHelper.getValue('defaultIcon') || '--none--'}
                                        list={this.itemLists.icons}
                                        fetchCount={this.state.itemsFetchCount}
                                        showDialogFunction={this.dialogHelper.showDialog}
                                        onChange={(nv) => {
                                            this.stateHelper.setState({defaultIcon: nv.url});
                                        }}
                                    />}
                                </React.Fragment>
                            }
                        </React.Fragment>
                    }
                    <div className="dialogButtons">
                        <DB name="cancel" onClick={this.props.closeCallback}>Cancel</DB>
                        {this.props.updateCallback ?
                            <DB
                                name="ok"
                                onClick={() => {
                                    let changes = this.stateHelper.getValues(true);
                                    if (changes.opacity < 0) changes.opacity = 0;
                                    if (changes.opacity > 1) changes.opacity = 1;
                                    this.props.updateCallback(changes);
                                }}
                                disabled={!hasChanges}
                            >Ok</DB>
                            : null}

                    </div>
                </div>
            </React.Fragment>);
    }


}



const OverlayElement=(props)=>{
    return (
        <div className={"listEntry overlayElement "+(props.selected?"activeEntry":"")+(props.enabled?"":" disabled")+(props.isDefault?" defaultOverlay":"")} onClick={()=>props.onClick('select')}>
            <div className="itemInfo">
                <div className="infoRow">
                    <span className="inputLabel">Name</span><span className="valueText">{props.name}</span>
                </div>
                <div className="infoRow">
                    <span className="inputLabel">Type</span><span className="valueText">{props.type+(props.isDefault?"   [default]":"")}</span>
                </div>
            </div>
            <div className="actions">
                {props.type !== 'base' &&
                <Checkbox
                    className="overlayEnabled"
                    value={props.enabled || false}
                    onChange={(nv) => {
                        props.onClick(nv ? "enable" : "disable")
                    }}
                />
                }
                {props.type !== 'base' &&
                <Button name="Edit"
                        className={"smallButton " + ((props.isDefault || props.preventEdit) ? "disabled" : "")}
                        onClick={(ev) => {
                            ev.stopPropagation();
                            props.onClick('edit')
                        }}
                />
                }
            </div>
        </div>
    );
};

const CombinedOverlayElement=(props)=> {
    return(
        <ItemList
            className="defaultOverlayItems"
            itemClass={OverlayElement}
            itemList={props.items}
            onItemClick={(item,data)=>{
                props.onClick({item:item,data:data});
            }}
            />
    );
}

const HiddenCombinedOverlayElement=(props)=>{
    return <div className="empty"></div>
}

/**
 * convert the list of overlays into the list for displaying it
 * by grouping default items into a combined item
 * @param overlayList
 * @param updateCallback
 * @returns {[]}
 */
const displayListFromOverlays=(overlayList)=>{
    let rt=[];
    if (! overlayList) return rt;
    let lastBucket=undefined;
    overlayList.forEach((overlay)=>{
        if (overlay.isDefault){
            if (! lastBucket){
                lastBucket={
                    itemClass:CombinedOverlayElement,
                    items:[],
                    disabled:true
                };
            }
            lastBucket.items.push(overlay);
            return;
        }
        if (lastBucket) rt.push(lastBucket);
        lastBucket=undefined;
        rt.push(assign({},overlay,{disabled:overlay.type==='base'}));
    })
    if (lastBucket) rt.push(lastBucket);
    return rt;
}

const displayListToOverlays=(displayList)=>{
    let rt=[];
    if (! displayList) return rt;
    displayList.forEach((element)=>{
        if (element.itemClass === CombinedOverlayElement){
            element.items.forEach((item)=>{
                rt.push(filterOverlayItem(item));
            });
        }
        else{
            rt.push(filterOverlayItem(element));
        }
    });
    return rt;
}

class EditOverlaysDialog extends React.Component{
    constructor(props){
        super(props);
        this.state={};
        this.state.selectedIndex=-1;
        let itemList=this.props.current.getOverlayList(true);
        for (let i = 0; i < itemList.length; i++) {
            itemList[i].itemKey=i;
            this.maxKey=i;
        }
        this.state.list=displayListFromOverlays(itemList);
        this.maxKey++;
        this.state.useDefault=this.props.current.getUseDefault();
        this.state.isChanged=false;
        this.dialogHelper=dialogHelper(this);
        this.sizeCount=0;
        this.reset=this.reset.bind(this);
        this.updateList=this.updateList.bind(this);
    }

    updateList(opt_newList){
        this.setState({list:opt_newList?opt_newList:this.state.list.slice(),isChanged:true});
    }
    getNewKey(){
        this.maxKey++;
        return this.maxKey;
    }


    updateDimensions(){
        if (this.props.updateDimensions){
            this.props.updateDimensions();
        }
    }

    showItemDialog(item){
        return new Promise((resolve,reject)=>{
            this.dialogHelper.showDialog((props)=>{
                return <OverlayItemDialog
                    {...props}
                    closeCallback={()=>{
                        props.closeCallback();
                        reject(0);
                    }}
                    updateCallback={(changed)=>{
                        this.updateDimensions();
                        if (!changed.name) reject(0);
                        else resolve(changed);
                        props.closeCallback();
                    }}
                    current={item}
                    title={item?"Edit Overlay":"New Overlay"}
                    />
            })
        })
    }
    insert(before){
        if (this.props.preventEdit) return;
        if (before) {
            if (this.state.selectedIndex < 0 || this.state.selectedIndex >= this.state.list.length) return;
        }
        let idx=this.state.selectedIndex;
        if (idx < 0) idx=0;
        this.showItemDialog({type:'overlay',opacity:1})
            .then((overlay)=>{
                let overlays=this.state.list.slice();
                overlay.itemKey=this.getNewKey();
                overlays.splice(before?idx:idx+1,0,overlay);
                this.updateList(overlays);
            })
            .catch((reason)=>{if (reason) Toast(reason);});
    }
    editItem(item){
        if (this.props.preventEdit) return;
        if (item.disabled) return;
        this.showItemDialog(item)
            .then((changedItem)=>{
                this.updateItem(item.itemKey,changedItem);
            })
            .catch((reason)=>{if (reason) Toast(reason);})
    }
    updateItem(itemKey,newValues){
        let overlays=this.state.list;
        let hasChanged=false;
        overlays.forEach((element)=>{
            if (element.items){
                //combined...
                element.items.forEach((item)=>{
                    if (item.itemKey === itemKey){
                        assign(item,newValues);
                        hasChanged=true;
                    }
                });
            }
            else{
                if (element.itemKey === itemKey){
                    assign(element,newValues);
                    hasChanged=true;
                }
            }
        })
        if (hasChanged){
            this.updateList(overlays);
        }
    }
    deleteItem(item){
        if (this.props.preventEdit) return;
        if (item.disabled) return;
        if (item.itemKey === undefined) return;
        let overlays=this.state.list.slice();
        for (let i=0;i<overlays.length;i++) {
            //not allowed for combined...
            if (overlays[i].itemKey===item.itemKey) {
                overlays.splice(i, 1);
                this.updateList(overlays);
                this.updateDimensions();
            }
        }
    }
    moveItem(oldIndex,newIndex){
        let overlays=this.state.list.slice();
        if (oldIndex < 0 || oldIndex >= overlays.length) return;
        if (newIndex < 0 || newIndex >= overlays.length) return;
        let item=overlays[oldIndex];
        overlays.splice(oldIndex,1);
        overlays.splice(newIndex,0,item)
        this.updateList(overlays);
    }
    reset(){
        if (this.props.resetCallback){
            this.props.closeCallback();
            this.props.resetCallback();
            return;
        }
        this.setState({
            list:displayListFromOverlays(this.props.current.getOverlayList()),
            useDefault: this.props.current.getUseDefault(),
            selectedIndex:0,
            isChanged:true
        })
    }
    render () {
        let self=this;
        if (! this.props.current){
            this.props.closeCallback();
            return null;
        }
        let hasCurrent=this.props.current.getName() !== undefined;
        if (this.sizeCount !== this.state.sizeCount && this.props.updateDimensions){
            this.sizeCount=this.state.sizeCount;
            window.setTimeout(self.props.updateDimensions,100);
        }
        let hasOverlays=true; //TODO
        let hasDefaults=this.props.current.hasDefaults();
        let selectedItem;
        if (this.state.selectedIndex >=0 && this.state.selectedIndex <= this.state.list.length){
            selectedItem=this.state.list[this.state.selectedIndex];
        }
        return (
            <React.Fragment>
            <div className={"selectDialog editOverlaysDialog"+(this.props.preventEdit?" preventEdit":"")}>
                <h3 className="dialogTitle">{this.props.title||'Edit Overlays'}</h3>
                <div className="dialogRow info"><span className="inputLabel">Chart</span>{this.props.chartName}</div>
                {(!this.props.noDefault && ! this.props.preventEdit && hasDefaults) && <Checkbox
                    className="useDefault"
                    dialogRow={true}
                    label="use default"
                    onChange={(nv)=>{
                        this.setState({useDefault:nv,selectedIndex:0,isChanged:true});
                        this.updateDimensions();
                        }}
                    value={this.state.useDefault||false}/>}
                <ItemList
                    dragdrop={!this.props.preventEdit}
                    onSortEnd={(oldIndex,newIndex)=>{
                        this.moveItem(oldIndex,newIndex);
                        this.setState({selectedIndex:newIndex});
                    }}
                    className="overlayItems"
                    itemCreator={(item)=>{
                        if (item.itemClass === CombinedOverlayElement){
                            if (this.state.useDefault) return CombinedOverlayElement
                            else return HiddenCombinedOverlayElement
                        }
                        else return OverlayElement;
                    }}
                    selectedIndex={this.props.preventEdit?undefined:this.state.selectedIndex}
                    onItemClick={(item,data)=>{
                        if (data === 'select'){
                            this.setState({selectedIndex:item.index});
                            return;
                        }
                        if (data === 'edit'){
                            this.editItem(item);
                            return;
                        }
                        if (data === 'disable'){
                            this.updateItem(item.itemKey,{enabled:false});
                            return;
                        }
                        if (data === 'enable'){
                            this.updateItem(item.itemKey,{enabled:true});
                            return;
                        }
                        //the combined items will give us the action as an object
                        if (typeof data === 'object'){
                            if (! data.item) return;
                            let itemKey=data.item.itemKey;
                            if (itemKey === undefined) return;
                            if (data.data === 'enable'){
                                this.updateItem(itemKey,{enabled:true});
                                return;
                            }
                            if (data.data === 'disable'){
                                this.updateItem(itemKey,{enabled:false});
                                return;
                            }
                        }
                     }}
                    itemList={this.state.list}
                    />
                <div className="insertButtons">
                    {selectedItem?<DB name="delete" onClick={()=>this.deleteItem(selectedItem)}>Delete</DB>:null}
                    {selectedItem || this.props.editCallback?
                        <DB name="edit" onClick={()=>{
                            if (this.props.editCallback){
                                if (this.props.editCallback(selectedItem)){
                                    this.props.closeCallback();
                                }
                            }
                            else {
                                this.editItem(selectedItem);
                            }
                        }}>Edit</DB>
                        :null
                    }
                    {(hasOverlays && ! this.props.preventEdit)?<DB name="before" onClick={()=>this.insert(true)}>Insert Before</DB>:null}
                    {!this.props.preventEdit && <DB name="after" onClick={()=>this.insert(false)}>Insert After</DB>}
                </div>
                <div className="dialogButtons">
                    <DB
                        name="reset"
                        onClick={this.reset}
                    >Reset
                    </DB>
                    <DB name="cancel" onClick={this.props.closeCallback}>Cancel</DB>
                    {this.props.updateCallback?
                        <DB
                            name="ok"
                            onClick={()=>{
                                this.props.closeCallback();
                                let updatedOverlays=this.props.current.copy();
                                updatedOverlays.writeBack(displayListToOverlays(this.state.list));
                                updatedOverlays.setUseDefault(this.state.useDefault);
                                this.props.updateCallback(updatedOverlays);
                                }}
                            disabled={!this.state.isChanged}
                            >{this.props.preventEdit?"Ok":"Save"}</DB>
                    :null}
                </div>
            </div>
            </React.Fragment>
        );
    }
}

EditOverlaysDialog.propTypes={
    title: PropTypes.string,
    current:PropTypes.instanceOf(OverlayConfig), //the current config
    updateCallback: PropTypes.func,
    resetCallback: PropTypes.func,
    editCallback: PropTypes.func,  //only meaningful if preventEdit is set
    closeCallback: PropTypes.func.isRequired,
    preventEdit: PropTypes.bool
};

/**
 *
 * @param chartItem
 * @return {boolean}
 */
EditOverlaysDialog.createDialog=(chartItem,opt_noDefault,opt_callback)=>{
    if (! chartItem.chartKey) return;
    let getParameters={
        request: 'api',
        type: 'chart',
        overlayConfig: getOverlayConfigName(chartItem),
        command: 'getConfig',
        expandCharts: true,
        mergeDefault: !opt_noDefault
    };
    Requests.getJson("",{},getParameters)
        .then((config)=>{
            if (! config.data) return;
            if (config.data.useDefault === undefined) config.data.useDefault=true;
            let overlayConfig=new OverlayConfig(config.data);
            OverlayDialog.dialog((props)=> {
                return <EditOverlaysDialog
                    {...props}
                    chartName={chartItem.name}
                    title="Edit Overlays"
                    current={overlayConfig}
                    updateCallback={(newConfig) => {
                        if (newConfig.isEmpty()) {
                            //we can tell the server to delete the config
                            let param={
                                request:'delete',
                                type:'chart',
                                name:overlayConfig.getName()
                            }
                            Requests.getJson('',{},param)
                                .then(()=>{
                                    if (opt_callback) opt_callback(newConfig.getWriteBackData());
                                })
                                .catch((err)=>{
                                    Toast("unable to save overlay config: " + error);
                                    if (opt_callback) opt_callback();
                                })
                        } else {
                            let postParam = {
                                request: 'upload',
                                type: 'chart',
                                name: overlayConfig.getName(),
                                overwrite: true
                            };
                            Requests.postPlain("", JSON.stringify(newConfig.getWriteBackData(), undefined, 2), {}, postParam)
                                .then((res) => {
                                    if (opt_callback) opt_callback(newConfig.getWriteBackData());
                                })
                                .catch((error) => {
                                    Toast("unable to save overlay config: " + error);
                                    if (opt_callback) opt_callback();
                                });
                        }
                    }}
                    noDefault={opt_noDefault||false}
                    />
            });
        })
        .catch((error)=>{Toast("unable to get config: "+error);});

    return true;
};

export const DEFAULT_OVERLAY_CONFIG="default.cfg";

export default  EditOverlaysDialog;