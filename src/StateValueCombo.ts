import * as WitService from "TFS/WorkItemTracking/Services";
import Q = require("q");
import * as VSSUtilsCore from "VSS/Utils/Core";
import { StateValueControl } from "./StateValueControl";
import { callDevApi } from "./RestCall";
import { timeStamp } from "VSS/Diag";
import { empty } from "VSS/Utils/String";

export class StateValueCombo extends StateValueControl {
    /* 
    * UI elements for the control.
    */
    public globalUrl: string;
    private _selectedValuesWrapper: JQuery;
    private _selectedValuesContainer: JQuery;
    private _checkboxValuesContainer: JQuery;

    private _chevron: JQuery;

    private _statesuggestedValues: string[];

    private _valueToCheckboxMap: IDictionaryStringTo<JQuery>;
    private _valueToLabelMap: IDictionaryStringTo<JQuery>;

    private _maxSelectedToShow = 100;
    private _chevronDownClass = "bowtie-chevron-down-light";
    private _chevronUpClass = "bowtie-chevron-up-light";

    private _toggleThrottleDelegate: Function;
    /**
     * Initialize a new instance of MultiValueControl
     */
    public initialize(): void {
        this._selectedValuesWrapper = $("<div>").addClass("selectedValuesWrapper").appendTo(this.statecontainerElement);
        this._selectedValuesContainer = $("<div>").addClass("selectedValuesContainer").attr("tabindex", "-1").appendTo(this._selectedValuesWrapper);
        this._chevron = $("<span />").addClass("bowtie-icon " + this._chevronDownClass).appendTo(this._selectedValuesWrapper);
        this._checkboxValuesContainer = $("<div>").addClass("checkboxValuesContainer").appendTo(this.statecontainerElement);

        this._valueToCheckboxMap = {};
        this._valueToLabelMap = {};

        this._getSuggestedValues().then(
            (values: string[]) => {
                this._statesuggestedValues = values;
                // this._suggestedValues = values.filter((s: string): boolean => {
                //     return s.trim() !== "";
                // });
                this._populateCheckBoxes();
                super.initialize();
            }
        );

        this._toggleThrottleDelegate = VSSUtilsCore.throttledDelegate(this, 100, () => {
            this._toggleCheckBoxContainer();
        });

        $(window).blur(() => {
            this._hideCheckBoxContainer();
            return false;
        });

        $(window).focus(() => {
            this._toggleThrottleDelegate.call(this);
            return false;
        });

        this._selectedValuesWrapper.click(() => {
            this._toggleThrottleDelegate.call(this);
            return false;
        });

        this._chevron.click(() => {
            this._toggleThrottleDelegate.call(this);
            return false;
        });
    }

    public GetStateSuggestedValue(): void {
        this._getSuggestedValues().then(
            (values: string[]) => {
                this._statesuggestedValues = values;
                // this._suggestedValues = values.filter((s: string): boolean => {
                //     return s.trim() !== "";
                // });
                this._populateCheckBoxes();
                super.initialize();
            }
        );
    }

    public clear(): void {
        var checkboxes: JQuery = $("input", this._checkboxValuesContainer);
        var labels: JQuery = $(".checkboxLabel", this._checkboxValuesContainer);
        checkboxes.prop("checked", false);
        checkboxes.removeClass("selectedCheckbox");
        this._selectedValuesContainer.empty();
    }
    protected getValue(): string {
        return this._selectedValuesContainer.text();
    }

    protected setValue(value: string): void {
        this.clear();
        var selectedValues = value ? value.split(";") : [];

        this._showValues(selectedValues);

        $.each(selectedValues, (i, value) => {
            if (value) {
                // mark the checkbox as checked
                var checkbox = this._valueToCheckboxMap[value];
                var label = this._valueToLabelMap[value];
                if (checkbox) {
                    checkbox.prop("checked", true);
                    checkbox.addClass("selectedCheckbox");
                }
            }
        });
    }

    private _toggleCheckBoxContainer() {
        if (this._checkboxValuesContainer.is(":visible")) {
            this._hideCheckBoxContainer();
        }
        else {
            this._showCheckBoxContainer();
        }
    }


    private _showCheckBoxContainer() {
        this._chevron.removeClass(this._chevronDownClass).addClass(this._chevronUpClass);
        this.statecontainerElement.addClass("expanded").removeClass("collapsed");
        this._checkboxValuesContainer.show();
        this.resize();
    }

    private _hideCheckBoxContainer() {
        this._chevron.removeClass(this._chevronUpClass).addClass(this._chevronDownClass);
        this.statecontainerElement.removeClass("expanded").addClass("collapsed");
        this._checkboxValuesContainer.hide();
        this.resize();
    }

    private _showValues(values: string[]) {
        if (values.length <= 0) {
            this._selectedValuesContainer.append("<div class='noSelection'>No selection made</div>");
        }
        else {
            $.each(values, (i, value) => {
                var control;
                // only show first N selections and the rest as more.
                if (i < this._maxSelectedToShow) {
                    control = this._createSelectedValueControl(value);
                }
                else {
                    control = this._createSelectedValueControl(values.length - i + " more")
                    control.attr("title", values.slice(i).join(";"));
                    return false;
                }
            });
        }
        this.resize();
    }
    private _refreshValues() {
        var rawValue = this.getValue();
        var values = rawValue ? rawValue.split(";") : [];
        this._selectedValuesContainer.empty();
        this._showValues(values);
    }

    private _refreshValue(currentSelectedValue) {
        this._selectedValuesContainer.empty();
        var val = [currentSelectedValue];
        this._showValues(val);
    }


    private _createSelectedValueControl(value: string): JQuery {
        var control = $("<div />");
        if (value) {
            control.text(value);
            control.attr("title", value);
            // control.addClass("selected");
            this._selectedValuesContainer.empty();
            this._selectedValuesContainer.append(control);
        }

        return control;
    }
    /**
  * Populates the UI with the list of checkboxes to choose the value from.
  */
    private _populateCheckBoxes(): void {
        if (!this._statesuggestedValues || this._statesuggestedValues.length === 0) {
            this.showError("No values to select.");
        }
        else {
            // Add the select all method
            //let selectAllBox = this._createSelectAllControl();
            $.each(this._statesuggestedValues, (i, value) => {
                this._createCheckBoxControl(value);
            });
        }
    }

    private _createSelectAllControl() {
        let value = "Select All 1";
        let label = this._createValueLabel(value);
        let checkbox = this._createCheckBox(value, label, () => {
            let checkBoxes = $("input.valueOption", this._checkboxValuesContainer);
            if (checkbox.prop("checked")) {
                checkBoxes.prop("checked", true);
            } else {
                checkBoxes.prop("checked", false);
            }
        });
        var container = $("<div />").addClass("checkboxContainer selectAllControlContainer");
        checkbox.addClass("selectAllOption");
        this._valueToCheckboxMap[value] = checkbox;
        this._valueToLabelMap[value] = label;
        this._checkboxValuesContainer.append(container);
        return checkbox;
    }

    private _createCheckBoxControl(value: string) {
        console.log(value);
        var inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;
        var getprop: string = inputs["StateProperty"];
        var propValue = value;
        let label = this._createValueLabel(propValue[getprop]);
        let checkbox = this._createCheckBox(propValue[getprop], label);
        let container = $("<div />").addClass("checkboxContainer");
        checkbox.addClass("valueOption");
        this._valueToCheckboxMap[value] = checkbox;
        this._valueToLabelMap[value] = label;
        container.append(checkbox);
        container.append(label);
        this._checkboxValuesContainer.append(container);
    }

    // loads values at first time
    private _getSuggestedValues(): IPromise<string[]> {
        var defer = Q.defer<any>();
        var inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;
        var url: string = inputs["StateUrl"];
        this.globalUrl = url;
        console.log("got "+ url);
        callDevApi(url, "GET", undefined, undefined, (data) => {
            console.log("calling url 2");
            defer.resolve(this._findArr(data));
        }, (error) => {
            defer.reject(error);
        });
        return defer.promise;
    }

    //Get respective values on country changes

    public _getRespectiveValues(value: string): IPromise<string[]> {
        var defer = Q.defer<any>();
        var inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;
        var url: string = "https://restcountries.eu/rest/v2/name/india";
        var urlSplit = url.split('/');
        urlSplit[urlSplit.length - 1] = value;
        url = urlSplit.join('/');
        callDevApi(url, "GET", undefined, undefined, (data) => {
            defer.resolve(this._findArr(data));
        }, (error) => {
            defer.reject(error);
        });
        return defer.promise;
    }
    private _createOptionControl(value: string) {
        this._checkboxValuesContainer = $("<div>").addClass("checkboxValuesContainer").appendTo(this.statecontainerElement);
        console.log(value);
        let label = this._createValueLabel(value);
        let checkbox = this._createCheckBox(value, label);
        let container = $("<div />").addClass("checkboxContainer");
        checkbox.addClass("valueOption");
        container.append(checkbox);
        container.append(label);
        this._checkboxValuesContainer.append(container);
        this.statecontainerElement.append(this._checkboxValuesContainer);
        console.log(this.statecontainerElement);
    }
    private _populateOptions(): void {
        if (!this._statesuggestedValues || this._statesuggestedValues.length === 0) {
            this.showError("No values to select.");
        }
        else {
            $.each(this._statesuggestedValues, (i, value) => {
                console.log("_populateCheckBoxes " + value);
                this._createOptionControl(value);
            });
        }
    }

    private _createValueLabel(value: string) {
        let label = $("<label />");
        label.attr("for", "checkbox" + value);
        label.text(value);
        label.attr("title", value);
        label.addClass("checkboxLabel");
        return label;
    }

    private _createCheckBox(value: string, label: JQuery, action?: Function) {
        let checkbox = $("<input  />");
        checkbox.attr("type", "checkbox");
        checkbox.attr("name", value);
        checkbox.attr("value", value);
        checkbox.attr("tabindex", -1);
        checkbox.attr("id", "checkbox" + value);
        checkbox.attr("style", "visibility:hidden");
        checkbox.change((e) => {
            if (action) {
                action.call(this);
            }
            this._refreshValue($(e.currentTarget).attr("value"));
            this.flush();
        });
        return checkbox;
    }

    public getCountryValue(): void {
        this._getCurrentValue().then(
            (value: string) => {
                this._getRespectiveValues(value).then(
                    (values: string[]) => {
                        console.log(values);
                        this._statesuggestedValues = values;
                        console.log(this._statesuggestedValues);
                        this._statesuggestedValues = values.filter((s: string): boolean => {
                            return s.trim() !== "";
                        });
                        $('.statecontainer  .checkboxContainer').empty();
                        this._populateOptions();
                    }
                );
            }
        );
    }
    private _getCurrentValue(): IPromise<string> {
        var defer = Q.defer();
        WitService.WorkItemFormService.getService().then(
            (service) => {
                service.getFieldValues([this.countryName]).then(
                    (values) => {
                        defer.resolve(values[this.countryName]);
                    }
                );
            }
        );
        return defer.promise.then();
    }

    // Convert unknown data type to string[]
    private _findArr(data: object): string[] {
        const inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;
        var property: string = inputs["Property"];
        // Look for an array: object itself or one of its properties
        const objs: object[] = [data];
        for (let obj = objs.shift(); obj; obj = objs.shift()) {
            if (Array.isArray(obj)) {
                // If configuration has a the Property property set then map from objects to strings
                // Otherwise assume already strings
                return property ? obj.map(o => o[property]) : obj;
            } else if (typeof obj === "object") {
                for (const key in obj) {
                    objs.push(obj[key]);
                }
            }
        }
    }
}