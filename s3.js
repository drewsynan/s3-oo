;(function(ENV){
var CLASS_PROP = "__class__";
var TRACKER_CLASS = "__classTracker__";

function environment() { return ENV; }

function method(methodName, obj/*, args, ...*/) {

	if(!hasClass(this, TRACKER_CLASS)) {
		throw new Error("className in classTracker not set !");
	}

	var className = this.class;

	var env = environment();
	var objectClassList = classOf(obj);
	var methodArgs = Array.prototype.slice.call(arguments).slice(1);

	var method = env[methodName];
	if(method === undefined) {
		throw new Error("Method " + methodName + " is not defined.");
	}

	var definedMethods = new Set(Object.keys(method));
	var dispatched = definedMethods.has(className)? method[className] : method.default;
	var conflictingDefs = Object.keys(method).filter(function(key){ return key === className; }).length > 1;

	if(dispatched === undefined) {
		throw new Error ("Could not find " + methodName + " method for " + className);
	} else if (conflictingDefs) {
		throw new Error("Multiple " + methodName + " method definitions found for " + className);
	}

	var classTracker = bless({class: className});
	classOf(classTracker, TRACKER_CLASS);

	return dispatched.apply(classTracker, methodArgs);
} 

function useMethod(methodName, obj/*, args... */) {
	var methodArgs = Array.prototype.slice.call(arguments).slice(2);
	var className = classOf(obj).slice(-1)[0]; // last class, no ancestors

	var classTracker = bless({class: className});
	classOf(classTracker, TRACKER_CLASS);

	return method.apply(classTracker, [methodName, obj].concat(methodArgs));
}

function nextMethod(methodName, obj/*, args ... */) {
	var methodArgs = Array.prototype.slice.call(arguments).slice(2);
	var classList = classOf(obj);
	var baseClassName;

	if(!hasClass(this, TRACKER_CLASS)) {
		baseClassName = classList[classList.length - 1];
	} else {
		baseClassName = this.class;
	}

	var nextClassName = classList[classList.indexOf(baseClassName) - 1];
	if(nextClassName === undefined) { throw new Error("No next class for " + baseClassName)}

	var classTracker = bless({class: nextClassName});
	classOf(classTracker, TRACKER_CLASS);

	return method.apply(classTracker, [methodName, obj].concat(methodArgs));
}

function classOf(x, setter) {
	function getClass(obj) {
		if (obj[CLASS_PROP]) return obj[CLASS_PROP];
		if(typeof obj === "object") {
			if(Array.isArray(obj)) {
				return ["array"];
			} else {
				return ["object"];
			}
		} else if (typeof obj !== undefined) {
			return [typeof obj];
		} else {
			return undefined;
		}		
	}

	function setClass(obj, classes) {
		obj[CLASS_PROP] = [].concat(classes);
		return obj[CLASS_PROP];
	}

	if(setter === undefined) {
		return getClass(x);
	} else {
		return setClass(x, setter);
	}
}

function hasClass(x, c) {
	return classOf(x).indexOf(c) >= 0;
}

function bless(o) {
	o.useMethod = useMethod;
	o.nextMethod = nextMethod;
	return o;
}

function generic(f) {
	if(! f.name ) throw new Error("Name of function for generic method not given: s3.generic needs to be used with named functions.");
	var g = bless(f).bind(bless({}));
	ENV[f.name] = g;

	return g;
}

var exports = {
	generic: bless(generic),
	classOf: classOf,
	appendClass: function addClass(x, c) { return classOf(x, classOf(x).concat(c)); }
};

Object.assign(ENV, exports);

}(module ? module.exports : window));
