import Q = require("q");
import {StateValueCombo} from "./StateValueCombo";
import {StateValueControl} from "./StateValueControl";
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

var control: StateValueControl;
var provider = () => {
    var ensureControl = () => {
        if (!control) {
            var inputs: IDictionaryStringTo<string> = VSS.getConfiguration().witInputs;
            var controlType: string = inputs["InputMode"];
             control = new StateValueCombo();
            control.initialize();
        }
        control.invalidate();
    };

    return {
        onLoaded: (args: WitExtensionContracts.IWorkItemLoadedArgs) => {
            ensureControl();
        },
        onUnloaded: (args: WitExtensionContracts.IWorkItemChangedArgs) => {
            if (control) {
                control.clear();
            }
        },
        onFieldChanged: (args: WitExtensionContracts.IWorkItemFieldChangedArgs) => {
            if (control && args.changedFields[control.statefieldName] !== undefined && args.changedFields[control.statefieldName] !== null) {
                control.invalidate();
            }
        }
    };
};

VSS.register(VSS.getContribution().id, provider);