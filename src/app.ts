import { StateValueCombo } from './StateValueCombo';
import {MultiValueCombo} from "./MultiValueCombo";
import {StateValueControl} from "./StateValueControl";
import {BaseMultiValueControl} from "./BaseMultiValueControl";
import * as WitExtensionContracts  from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";

// save on ctr + s
$(window).bind("keydown", function (event: JQueryEventObject) {
    if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which) === "S") {
            event.preventDefault();
            WorkItemFormService.getService().then((service) => service.beginSaveWorkItem($.noop, $.noop));
        }
    }
});

var control: BaseMultiValueControl;
var stateControl: StateValueControl;
var stateValueCombo: StateValueCombo;
var provider = () => {
    var ensureControl = () => {
        if (!control) {
            var inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;
            var controlType: string = inputs["InputMode"];
             control = new MultiValueCombo();
            control.initialize();
        }
        control.invalidate();
    };

    var ensureSateControl  = () => {
        if(!stateControl){
            var inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;
            var controlType: string = inputs["InputMode"];
            stateControl = new StateValueCombo();
            stateValueCombo = new StateValueCombo();
            stateControl.initialize();
        }
        stateControl.invalidate();
    };

    return {
        onLoaded: (args: WitExtensionContracts.IWorkItemLoadedArgs) => {
            ensureControl();
            ensureSateControl();
        },
        onUnloaded: (args: WitExtensionContracts.IWorkItemChangedArgs) => {
            if (control) {
                control.clear();
                stateControl.clear();
            }
        },
        onFieldChanged: (args: WitExtensionContracts.IWorkItemFieldChangedArgs) => {
            if (control && args.changedFields[control.fieldName] !== undefined && args.changedFields[control.fieldName] !== null) {
                control.invalidate();
                stateControl.invalidate();
                stateValueCombo.getCountryValue();
            }
        }
    };
};

VSS.register(VSS.getContribution().id, provider);

