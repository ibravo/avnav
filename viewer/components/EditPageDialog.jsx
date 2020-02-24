import React from 'react';
import PropTypes from 'prop-types';
import Promise from 'promise';
import LayoutHandler from '../util/layouthandler.js';
import OverlayDialog from './OverlayDialog.jsx';
import DialogContainer from './OverlayDialogDisplay.jsx';
import assign from 'object-assign';

const OPTION_COMBINATIONS=[
    {
        display: 'small',
        options: [LayoutHandler.OPTIONS.SMALL]
    },
    {
        display: 'anchor',
        options: [LayoutHandler.OPTIONS.ANCHOR]
    },
    {
        display: 'anchor+small',
        options: [LayoutHandler.OPTIONS.ANCHOR,LayoutHandler.OPTIONS.SMALL]
    }
];

const getFilteredOptions=(handledOptions)=>{
    let rt=[];
    for (let i in OPTION_COMBINATIONS){
        let required=OPTION_COMBINATIONS[i].options;
        let matches=true;
        for (let k in required){
            if (handledOptions.indexOf(required[k])<0){
                matches=false;
                break;
            }
        }
        if (matches){
            rt.push(OPTION_COMBINATIONS[i]);
        }
    }
    return rt;
};
const optionListToObject=(optionList,opt_false)=>{
    let option={};
    optionList.forEach((el)=>{option[el]=opt_false?false:true;});
    return option;
};
class PanelListEntry{
    constructor(pagename,basename,handledOptions){
        this.pagename=pagename;
        this.handledOptions=handledOptions;
        this.basename=basename;
        //array of the same length like OPTION_COMBINATIONS
        this.foundCombinations=[];
        this.removed=false;
    }
    hasOptionCombination(index){
        if (index < 0 || index >= this.foundCombinations.length) return false;
        return this.foundCombinations[index];
    }
    fillCombinations(){
        let combinations=getFilteredOptions(this.handledOptions);
        for (let i in combinations){
            let definition=combinations[i];
            let tryList=LayoutHandler.getPanelTryList(this.basename,optionListToObject(definition.options));
            //first element has the panel we check for
            let panelData=LayoutHandler.getDirectPanelData(this.pagename,tryList[0]);
            if (panelData && panelData.length > 0){
                this.foundCombinations.push(true);
            }
            else{
                this.foundCombinations.push(false);
            }
        }
    }
    writePanelsToLayout(opt_removeAll){
        opt_removeAll|=this.removed;
        let combinations=getFilteredOptions(this.handledOptions);
        for (let i=0;i<this.foundCombinations.length;i++){
            let definition=combinations[i];
            let shouldExist=this.foundCombinations[i];
            let tryList=LayoutHandler.getPanelTryList(this.basename,optionListToObject(definition.options));
            if (! shouldExist || opt_removeAll){
                LayoutHandler.removePanel(this.pagename,tryList[0]);
            }
            else
            {
                LayoutHandler.getDirectPanelData(this.pagename,tryList[0],true);
            }
        }
    }
    removePanels(){
        this.writePanelsToLayout(true);
    }
    clone(){
        let rt=new PanelListEntry(this.pagename,this.basename,this.handledOptions);
        rt.foundCombinations=this.foundCombinations.slice(0);
        rt.removed=this.removed;
    }
}
const getPanelList=(page,panelNames,handledOptions)=>{
    let rt={};
    panelNames.forEach((pn)=>{
        let pe=new PanelListEntry(page,pn,handledOptions);
        pe.fillCombinations();
        rt[pn]=pe;
    });
    return rt;
};

class EditPageDialog extends React.Component{
    constructor(props){
        super(props);
        this.state= {
            page:props.page,
            currentOptions: optionListToObject(props.handledOptions,true),
            panelList:getPanelList(props.page,props.panelNames,props.handledOptions),
            sizeCount: 0
        };
        this.sizeCount=0;
        this.setMode=this.setMode.bind(this);
    }
    getPanelsAsArray(){
        let rt=[];
        for (let k in this.state.panelList){
            rt.push(this.state.panelList[k]);
        }
        return rt;
    }
    setMode(option){
        let nv=assign({},this.state.currentOptions);
        nv[option]=!nv[option];
        this.setState({currentOptions:nv});
    }
    setCombination(panel,index){
        let nv=assign({},this.state.panelList);
        nv[panel.basename].foundCombinations[index]=!nv[panel.basename].foundCombinations[index];
        this.setState({panelList:nv});
    }
    render () {
        let self=this;
        let panels=this.state.panelList;
        return (
            <React.Fragment>
            <div className="selectDialog editPageDialog">
                <h3 className="dialogTitle">{this.props.title}</h3>
                <div className="info"><span className="label">Page:</span>{this.props.page}</div>
                <div className="selectCurrent" >
                    <div className="currentHeadline">Current Conditions</div>
                    {this.props.handledOptions.map((option)=>{
                            let className="select checkBox ";
                            if (this.state.currentOptions[option]) className+="checked";
                            return(
                                <div className="modeSelect" onClick={()=>{this.setMode(option)}} key={option}>
                                    <span className="label">{option}</span>
                                    <span className= {className} ></span>
                                </div>
                                )
                            }
                    )}
                </div>
                <div className="panelList">
                    <div className="panelHeadlin">Panels</div>
                {this.getPanelsAsArray().map((panel)=>{
                    return <div className={"editPanel "+panel.basename} key={panel.basename.replace(/  */,'')}>
                        <span className="label">{panel.basename}</span>
                        { getFilteredOptions(this.props.handledOptions).map((combination,index)=>{
                            let current=panel.foundCombinations[index];
                            let className="select checkBox ";
                            if (current) className+="checked";
                            return(
                                <div className="combinationSelect" onClick={()=>{this.setCombination(panel,index)}} key={combination.display}>
                                    <span className="label">{combination.display}</span>
                                    <span className={className} ></span>
                                </div>
                            )
                        })}
                        </div>
                })}
                </div>
                <div className="dialogButtons">
                    <button name="cancel" onClick={this.props.closeCallback}>Cancel</button>
                    <button name="ok" onClick={()=>{
                        this.props.closeCallback();
                        this.props.okCallback(this.state);
                    }}>Ok</button>
                <div className="clear"></div>
                </div>
            </div>
            </React.Fragment>
        );
    }
}

EditPageDialog.propTypes={
    title: PropTypes.string,
    page: PropTypes.string,
    panelNames: PropTypes.array,
    supportedOptions: PropTypes.array,
    okCallback: PropTypes.func,
    closeCallback: PropTypes.func.isRequired
};

/**
 *
 * @param pagename
 * @param panelnames
 * @return {boolean}
 */
EditPageDialog.createDialog=(pagename,panelnames,handledOptions,callback)=>{
    if (! LayoutHandler.isEditing()) return false;
    OverlayDialog.dialog((props)=> {
        return <EditPageDialog
            {...props}
            title="Edit Page Layout"
            page={pagename}
            panelNames={panelnames}
            handledOptions={handledOptions}
            okCallback={(changes)=>{
                console.log(changes)
            }}
            />
    });
    return true;
};

EditPageDialog.getButtonDef=(pagename,panelNames,handledOptions,callback)=>{
    return{
        name: 'EditPage',
        editOnly: true,
        onClick:()=>{
            EditPageDialog.createDialog(pagename,panelNames,handledOptions,callback);
        },
        toggle: true
    }

};

export default EditPageDialog;