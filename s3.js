;(function(definition){
	if(typeof global === "object" && typeof module === "object") { // NodeJS
		definition(module.exports);
	} else if(typeof window === "object") { // Browser
		definition(window.s3 = Object.create(null));
	} else {
		throw new Error("Unsupported environment. Could not load s3-oo");
	}
}(function(ENV){
var exports = {
	__env__: Object.create(null),
	generic: appendClass(generic, "s3Builtin"),
	classOf: appendClass(classOf, "s3Builtin"),
	hasClass: appendClass(hasClass, "s3Builtin"),
	appendClass: appendClass(appendClass, "s3Builtin"),
	methods: appendClass(methods, "s3Builtin"),
	lastClass: appendClass(lastClass, "s3Builtin"),
};
Object.assign(ENV, exports);

var CLASS_ATTR = "__s3class__";
var ENV_ATTR = "__env__";

function appendClass(obj/*<object>*/, cls/*<string>*/) { /** Add a class to the end of the class chain */
	return classOf(obj, [].concat(cls, classOf(obj))); // class list reads from the front (like R)
}
function classBefore(ojb/*<object>*/, cls/*<string>*/) { /** Return the class before the first occurence of the given class */
	return classOf(ojb)[classOf(ojb).indexOf(cls) + 1]; // class list reads from the front (like R)
}
function classOf(x/*<object>*/, setter/*<string or [string]>*/) { /** Get or set the s3 class of an object */
	function coerce(primitive) { // force object representation of primatives
		return _set(Object.valueOf.call(primitive), typeof primitive); 
	}
	function _get(obj/*<object>*/) { // get the s3 class list
		return obj[CLASS_ATTR]; 
	}
	function getClass(obj/*<object>*/) { // get the stored or computed s3 class list
		if (typeof obj === "undefined" || obj === null) { // undefined and null have no class
			return undefined;
		} else if (_get(obj)) { // if a class attribute is defined, return that value
			return _get(obj); 
		} else if (Array.isArray(obj)) { // otherwise, compute it
			return ["array"]; 
		} else if (typeof obj === "object") { 
			return [getConstructor(obj)]; 
		} else {
			return [typeof obj];
		}
	}
	function getConstructor(obj/*<object>*/) { /** get the name of the constructor of an object */
		// could make this recurse up the prototype chain, but idk how useful that would actually be
		if(Object.getPrototypeOf(obj) && Object.getPrototypeOf(obj).constructor && Object.getPrototypeOf(obj).constructor.name) {
			var constructorName = Object.getPrototypeOf(obj).constructor.name;
			var className = constructorName[0].toLowerCase() + constructorName.slice(1);
			return className;
		} else {
			return typeof obj;
		}
	}
	function _set(obj/*<object>*/, className/*<string>*/) { /** set the s3 class list */
		obj[CLASS_ATTR] = [].concat(className);
		return obj;
	}
	function setClass(obj/*<object>*/, classes/*<string or [string]>*/) { /** in-place modify the s3 class list object */
		if(!getClass(obj)) return obj; // can't set class of null or undefined		
		if(typeof obj !== "function" && typeof obj !== "object") {
			obj = coerce(obj);
		}

		return _set(obj, classes);
	}

	return (setter === undefined ? getClass(x) : setClass(x, setter));
}
function environment() { /** return the s3 environment */
	return ENV[ENV_ATTR]; 
}
function generic(f/*<function>*/, name/*<string?>*/, env/*<object?>*/) { /** create a generic function */
	if(!f.name && !name) {
		throw new Error("Named function or name parameter not given. Call again with a named function, or pass a method name as the second argument");
	}
	env = env || environment();
	var methodName = name || f.name; // use overriding name before function name
	var proto = Object.setPrototypeOf({
		useMethod: useMethod,
		nextMethod: nextMethod,
		methodName: methodName
	}, null);

	Object.setPrototypeOf(f, Object.assign(Object.getPrototypeOf(f), proto)); // magic to make direct class method calls work
	var g = appendClass(f.bind(proto), "genericFn");
	env[methodName] = g;

	return g;
}

function hasClass(x/*<object>*/, c/*<string>*/) { /** check to see if an object has a class in the class chain */
	return classOf(x).indexOf(c) >= 0; 
}
function lastClass(x/*<object*/) { /** the last class added to an object */
	return classOf(x) ? classOf(x)[0] : undefined; // class list reads from the front (like R)
}
function method(methodName/*<string?>*/, className/*<string>*/, obj/*<object>*//*, methodArgs...*/) { /** execute a method on an object */
	var methodDef = environment()[methodName];
	var methodArgs = Array.prototype.slice.call(arguments).slice(2);
	if(!methodDef) {
		throw new Error("Method " + methodName + " is not defined.");
	}

	var dispatched = methodDef[className] ? methodDef[className] : methodDef['default'];
	if(!dispatched) { throw new Error(methodName + "." + className + " method not defined."); }

	var methodContext = {className: className};
	classOf(methodContext, classOf(obj));
	Object.setPrototypeOf(methodContext, null);
	Object.assign(methodContext, this);

	return dispatched.apply(methodContext, methodArgs);
}
function methods(nameOrFunc/*<string or function>*/) { /** list class methods registered with a generic function */
	if(typeof nameOrFunc === 'string') {
		var foundMethod = this[ENV_ATTR][nameOrFunc];
		if(foundMethod) {
			return Object.keys(foundMethod)
				.filter(function(k){ return k !== CLASS_ATTR; })
				.map(function(k){ return nameOrFunc + "." + k; });
		} else {
			return [];
		}
	} else {
		return Object.keys(nameOrFunc)
				.filter(function(k){ return k !== CLASS_ATTR; })
				.map(function(k){ return nameOrFunc.name.replace(/bound /,"") + "." + k; });
	}
}
function nextMethod(maybeName/*<string?>*/, maybeObj/*<object?>*//*, methodArgs... */) { /** call the next method on the class chain */
	var args = processArgs(this, arguments);
	var methodName = args.methodName;
	var methodArgs = args.methodArgs;
	var obj = args.obj;

	if(typeof methodName !== 'string') {
		throw new Error("nextMethod: method name is not a string. Got " + methodName);
	}
	if(!classOf(obj)) {
		throw new Error("nextMethod: object not given for method use. Got '" + obj + "'");
	}

	var methodContext = Object.assign(Object.create(null), this);

	if(!this.nextClass) {
		methodContext.currentClass = lastClass(obj);
		methodContext.nextClass = classBefore(obj, lastClass(obj));
	} else {
		methodContext.currentClass = this.nextClass;
		methodContext.nextClass = classBefore(obj, this.nextClass);
	}

	if(!methodContext.nextClass) {
		throw new Error("No next '" + methodName + "' method to call after nextMethod call from " + methodName + "." + methodContext.currentClass);
	}

	return method.apply(methodContext, [methodName, methodContext.nextClass, obj].concat(methodArgs));

}
function processArgs(thisScope/*<object>*/, args/*<arguments or array>*/) { /** process args for useMethod and nextMethod, variable function signature helper */
	args = Array.prototype.slice.call(args);
	var methodName, methodArgs, obj;

	if(typeof args[0] === 'string' && classOf(args[1])) {
		methodName = args[0];
		methodArgs = args.slice(2);
		obj = args[1];
	} else {
		methodName = thisScope.methodName;
		methodArgs = args.slice(1);
		obj = args[0];
	}

	if(!methodName) {
		throw new Error("No method name passed (implicitly or explicitly).");
	}

	if(!classOf(obj)) {
			throw new Error("No object passed to " + methodName + ".");
	}

	return {
		methodName: methodName,
		methodArgs: methodArgs,
		obj: obj
	};
}
function useMethod(maybeName/*<string?>*/, maybeObj/*<object?>*//*, methodArgs... */) { /** dispatch a method on an object */
	var args = processArgs(this, arguments);
	var methodName = args.methodName;
	var methodArgs = args.methodArgs;
	var obj = args.obj;
	var className = lastClass(obj); // last class name in the class chain (i.e. most recent class added)
	
	if(typeof methodName !== 'string') {
		throw new Error("useMethod: method name is not a string. Got " + methodName);
	}
	if(!classOf(obj)) {
		throw new Error("useMethod: object not given for method use. Got " + obj);
	}

	return method.apply(this, [methodName, className, obj].concat(methodArgs));
}

}));


