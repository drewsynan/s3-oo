;(function(definition){
	if(typeof global === "object" && typeof module === "object") { // NodeJS
		definition(module.exports);
	} else if(typeof window === "object") { // Browser
		definition(window.s3 = Object.create(null));
	} else {
		throw new Error("Unsupported environment. Could not load s3-oo");
	}
}(function(ENV){
var CLASS_ATTR 		= "__s3class__";
var TRACKER_CLASS 	= "__s3classtracker__";

function bless(x) {
	x.useMethod 	= useMethod;
	x.nextMethod 	= nextMethod;
	return x;
}

function classOf(x, setter) {
	function coerce(primitive) {
		var obj = Object.valueOf.call(primitive);
		obj[CLASS_ATTR] = typeof primitive;
		return obj;
	}

	function getClass(obj) {
		if (typeof obj === "undefined" || obj === null) { // undefined and null have no class
			return undefined;
		} else if (obj[CLASS_ATTR]) { 
			return obj[CLASS_ATTR]; 
		} else if (Array.isArray(obj)) { 
			return ["array"]; 
		} else if (typeof obj === "object") { 
			return ["object"]; 
		} else {
			return [typeof obj];
		}		
	}

	function setClass(obj, classes) {
		// modifies in place, returns object copies
		// of immutable values

		if(!getClass(obj)) {
			console.warn('Cannot set class of null or undefined');
			return obj;
		}
		if(typeof obj !== "function" || typeof obj !== "object") {
			obj = coerce(obj);
		}

		obj[CLASS_ATTR] = [].concat(classes);
		return obj;
	}

	return (setter === undefined ? getClass(x) : setClass(x, setter));
}

function environment() { return ENV; }

function failure(fail) { throw new Error("fail"); }

function generic(f) {
	if( !f.name ) return failure("Name of function for generic method not given: s3.generic needs to be used with named functions.");
	var g = bless(f).bind(bless({}));
	ENV[f.name] = g;

	return g;
}

function hasClass(x, c) { return classOf(x).indexOf(c) >= 0; }

function method(methodName, obj/*, args, ...*/) {
	if(!hasClass(this, TRACKER_CLASS)) { return failure("className in classTracker not set !"); }
	
	var className = this.class;
	var env = environment();
	var objectClassList = classOf(obj);
	var methodArgs = Array.prototype.slice.call(arguments).slice(1);

	var method = env[methodName];
	if(!method) { return failure("Method " + methodName + " is not defined."); }

	var reifiedMethods = new Set(Object.keys(method));
	var dispatched = reifiedMethods.has(className)? method[className] : method.default;

	if(!dispatched) { return failure("Could not find " + methodName + " method for " + className); } 

	var classTracker = bless({class: className});
	classOf(classTracker, TRACKER_CLASS);

	return dispatched.apply(classTracker, methodArgs);
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
	if(!nextClassName) { return failure("No next class for " + baseClassName)}

	var classTracker = bless({class: nextClassName});
	classOf(classTracker, TRACKER_CLASS);

	return method.apply(classTracker, [methodName, obj].concat(methodArgs));
}

function useMethod(methodName, obj/*, args... */) {
	var methodArgs = Array.prototype.slice.call(arguments).slice(2);
	var className = classOf(obj).slice(-1)[0]; // last class, no ancestors

	var classTracker = bless({class: className});
	classOf(classTracker, TRACKER_CLASS);

	return method.apply(classTracker, [methodName, obj].concat(methodArgs));
}

var exports = {
	generic: bless(generic),
	classOf: classOf,
	appendClass: function addClass(x, c) { return classOf(x, classOf(x).concat(c)); }
};

Object.assign(ENV, exports);

}));
