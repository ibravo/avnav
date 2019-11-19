/**
 * Created by andreas on 10.10.16.
 */
import React from 'react';
import reactCreateClass from 'create-react-class';
import PropTypes from 'prop-types';
import routeobjects from '../nav/routeobjects.js';

const WayPointItem =(props)=>{
        let info;
        let formatted=routeobjects.formatRoutePoint(props);
        if (props.showLatLon){
            info=<div className="avn_route_point_ll">{formatted.latlon}</div>;
        }
        else{
            info=<div className="avn_route_point_course">{formatted.course}&#176;/{formatted.distance}nm</div>;
        }
        let classNames="avn_route_info_point "+props.className||"";
        if (props.selected) classNames+=" activeEntry";
        return(
        <div className={classNames} onClick={()=>{if (props.onClick)props.onClick();}}>
            <div className="avn_route_info_name">{props.name}</div>
            <span className="more"></span>
            {info}
        </div>
        );
};

WayPointItem.propTypes={
        idx:        PropTypes.number,
        name:       PropTypes.string,
        lat:        PropTypes.number,
        lon:        PropTypes.number,
        course:     PropTypes.number,
        distance:   PropTypes.number,
        className:  PropTypes.string,
        showLatLon: PropTypes.bool,
        onClick:    PropTypes.func,
        selected:   PropTypes.bool
    };

export default WayPointItem;