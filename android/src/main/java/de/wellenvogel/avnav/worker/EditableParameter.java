package de.wellenvogel.avnav.worker;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import de.wellenvogel.avnav.util.AvnUtil;

public class EditableParameter {

    public static interface ListBuilder<T>{
        List<T> buildList(StringListParameter param);
    }
    public static interface EditableParameterInterface{
        public String getType();
        public String getName();
        public JSONObject toJson() throws JSONException;
        public void checkJson(JSONObject o) throws JSONException;
    }
    public static abstract class EditableParameterBase<T> implements AvnUtil.IJsonObect,EditableParameterInterface {
        String name;
        T defaultValue;
        String description;
        int descriptionId=-1;
        boolean mandatory=false;

        EditableParameterBase(String name, int descriptionId, T defaultValue) {
            this.name = name;
            this.descriptionId = descriptionId;
            this.defaultValue = defaultValue;
            mandatory = defaultValue == null;

        }
        EditableParameterBase(String name) {
            this.name = name;
            mandatory=true;
        }
        EditableParameterBase(EditableParameterBase<T> other){
            name=other.name;
            defaultValue=other.defaultValue;
            description=other.description;
            descriptionId=other.descriptionId;
            mandatory=other.mandatory;
        }
        public void write(JSONObject target,T value) throws JSONException {
            target.put(name,value);
        }
        @Override
        public String getName() {
            return name;
        }
        @Override
        public void checkJson(JSONObject o) throws JSONException {
            fromJson(o);
        }
        public abstract String getType();
        abstract public T fromJson(JSONObject o) throws JSONException;
        @Override
        public JSONObject toJson() throws JSONException {
            JSONObject rt = new JSONObject();
            rt.put("name", name);
            rt.put("type", getType());
            rt.put("default",defaultValue);
            rt.put("editable",true);
            rt.put("mandatory",mandatory);
            if (description != null) rt.put("description",description);
            if (descriptionId >= 0) rt.put("descriptionId",descriptionId);
            return rt;
        }
    }
    public static class StringParameter extends EditableParameterBase<String>{

        public StringParameter(String name, int descriptionId, String defaultValue) {
            super(name, descriptionId, defaultValue);
        }

        StringParameter(String name) {
            super(name);
        }

        @Override
        public String getType() {
            return "STRING";
        }

        @Override
        public String fromJson(JSONObject o) throws JSONException {
            return mandatory?o.getString(name):o.optString(name,defaultValue);
        }
    }
    public static class IntegerParameter extends EditableParameterBase<Integer>{

        public IntegerParameter(String name, int descriptionId, Integer defaultValue) {
            super(name, descriptionId, defaultValue);
        }

        IntegerParameter(String name) {
            super(name);
        }

        @Override
        public String getType() {
            return "NUMBER";
        }

        @Override
        public Integer fromJson(JSONObject o) throws JSONException {
            return (mandatory||o.has(name))?o.getInt(name):o.optInt(name,defaultValue);
        }
    }
    public static class BooleanParameter extends EditableParameterBase<Boolean>{

        public BooleanParameter(String name, int descriptionId, Boolean defaultValue) {
            super(name, descriptionId, defaultValue);
        }

        BooleanParameter(String name) {
            super(name);
        }
        @Override
        public String getType() {
            return "BOOLEAN";
        }

        @Override
        public Boolean fromJson(JSONObject o) throws JSONException {
            return (mandatory||o.has(name))?o.getBoolean(name):o.optBoolean(name,defaultValue);
        }

        BooleanParameter(EditableParameterBase<Boolean> other) {
            super(other);
        }
        public BooleanParameter clone(Boolean newDefault){
            BooleanParameter rt=new BooleanParameter(this);
            rt.defaultValue=newDefault;
            return rt;
        }
    }
    public static class FloatParameter extends EditableParameterBase<Float>{
        public FloatParameter(String name, int descriptionId, Float defaultValue) {
            super(name, descriptionId, defaultValue);
        }

        FloatParameter(String name) {
            super(name);
        }
        @Override
        public String getType() {
            return "FLOAT";
        }

        @Override
        public Float fromJson(JSONObject o) throws JSONException {
            return (mandatory||o.has(name))?(float)o.getDouble(name):(float)o.optDouble(name,defaultValue);
        }
    }
    public static class StringListParameter extends EditableParameterBase<String>{
        public List<String> list;
        public ListBuilder<String> listBuilder=null;

        StringListParameter(String name, int descriptionId,String defaultValue){
            super(name,descriptionId,defaultValue);
        }
        StringListParameter(String name, int descriptionId){
            super(name,descriptionId,null);
        }


        StringListParameter(String name, int descriptionId, String defaultValue,String... values) {
            super(name, descriptionId, defaultValue);
            list=new ArrayList<String>();
            list.addAll(Arrays.asList(values));
        }
        StringListParameter(String name,List<String> values) {
            super(name);
            list=values;
        }

        public StringListParameter(StringListParameter stringListParameter) {
            super(stringListParameter);
            list=stringListParameter.list;
        }


        @Override
        public String getType() {
            return "SELECT";
        }

        @Override
        public String fromJson(JSONObject o) throws JSONException {
            return mandatory?o.getString(name):o.optString(name,defaultValue);
        }

        @Override
        public JSONObject toJson() throws JSONException {
            JSONObject rt=super.toJson();
            if (listBuilder != null){
                list=listBuilder.buildList(this);
            }
            if (list != null){
                JSONArray liarr=new JSONArray();
                for (String i : list){
                    liarr.put(i);
                }
                rt.put("rangeOrList",liarr);
            }
            return rt;
        }
    }
    public static class ParameterList extends ArrayList<EditableParameterInterface>{
        public JSONArray toJson(Context context) throws JSONException {
            JSONArray rt=new JSONArray();
            for (EditableParameterInterface i : this){
                JSONObject jp=i.toJson();
                if (! jp.has("description") && jp.has("descriptionId")){
                    jp.put("description",context.getString(jp.getInt("descriptionId")));
                }
                rt.put(jp);
            }
            return rt;
        }
        public void check(JSONObject o) throws JSONException{
            for (EditableParameterInterface i:this){
                i.checkJson(o);
            }
        }
        public ParameterList(EditableParameterInterface... param){
            this.addAll(Arrays.asList(param));
        }
        public void addParams(EditableParameterInterface... param){
            this.addAll(Arrays.asList(param));
        }
        public boolean has(EditableParameterInterface parameter){
            for (EditableParameterInterface p:this){
                if (p.getName().equals(parameter.getName())) return true;
            }
            return false;
        }

    }
}