;(function(definition){
	if(typeof global === "object" && typeof module === "object") { // NodeJS
		definition(module.exports);
	} else if(typeof window === "object") { // Browser
		definition(window.s3 = Object.create(null));
	} else {
		throw new Error("Unsupported environment. Could not load s3-oo");
	}
}(function(ENV){

var DEBUG = true;
var DEBUG_LEVEL = 99;
var DEBUG_STACK = true;

function dbg(/*args*/) {
	/* Debug to the console if debugging is enabled */
	/* Passes all called arguments on to console.debug */

	if(DEBUG) {
		var args = Array.prototype.slice.call(arguments);
		console.debug.apply(console, [".:.: S3 :.:.\n"].concat(args));
	}
}

function dbgFn(fn, thisScope, args, stack, debugLevel) {
	/* Debug a function call if debugging is enabled */
	/* fn => reference to named function or function object */
	/* thisScope => the this property passed from inside the function */
	/* args => arguments object passed from inside the function */
	/* stack => stack trace passed from calling (new Error()).stack at the debug site */
	/* debugLevel => which level of debugging to debug in, defaults to 0 (most verbose) */

	args = Array.prototype.slice.call(args);
	stack = stack || "";
	debugLevel = +debugLevel;

	function argNames(f) {
		return (f + '')
			.replace(/[/][/].*$/mg,'') // strip single-line comments
      		.replace(/\s+/g, '') // strip white space
      		.replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  
      		.split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters  
      		.replace(/=[^,]+/g, '') // strip any ES6 defaults  
      		.split(',').filter(Boolean); // split & filter [""]
	}

	if(DEBUG_STACK) {
		stack = "\n" + stack.replace(/Error\n/,"");
	} else {
		stack = "";
	}

	if(DEBUG && debugLevel >= DEBUG_LEVEL) {
		var namedArgs = argNames(fn);
		var prettyPrintArgs = [];
		namedArgs.forEach(function(arg, i){
			prettyPrintArgs.push("\n  "+arg+"->", args[i]);
		});

		console.debug.apply(console, 
			[
			 ".:.: S3 :.:.", 
			 "\n" + fn.name + "(" + namedArgs.join(",") + ")", 
			 "=>",
			 "\n  (this)->",
			 thisScope,
			].concat(prettyPrintArgs, stack)
		);
	}

}

function environment() { return ENV.__env__; }

function classOf(x, setter) {
	dbgFn(classOf, this, arguments, (new Error()).stack, 1);

	var CLASS_ATTR = "__s3class__";

	function _set(obj, className) {
		dbgFn(_set, this, arguments, (new Error()).stack);

		obj[CLASS_ATTR] = [].concat(className);
		return obj;
	}

	function _get(obj) {
		dbgFn(_get, this, arguments, (new Error()).stack);

		return obj[CLASS_ATTR];
	}

	function coerce(primitive) {
		/* Force object representatino of primitives */
		dbgFn(coerce, this, arguments, (new Error()).stack);

		return _set(Object.valueOf.call(primitive), typeof primitive);
	}

	function getConstructor(obj) {
		// could make this recurse up the prototype chain, but idk how useful that would actually be

		if(Object.getPrototypeOf(obj) && Object.getPrototypeOf(obj).constructor && Object.getPrototypeOf(obj).constructor.name) {
			var constructorName = Object.getPrototypeOf(obj).constructor.name;
			var className = constructorName[0].toLowerCase() + constructorName.slice(1);
			return className;
		} else {
			return typeof obj;
		}
	}

	function getClass(obj) {
		dbgFn(getClass, this, arguments, (new Error()).stack);

		if (typeof obj === "undefined" || obj === null) { // undefined and null have no class
			return undefined;
		} else if (_get(obj)) { 
			return _get(obj); 
		} else if (Array.isArray(obj)) { 
			return ["array"]; 
		} else if (typeof obj === "object") { 
			return [getConstructor(obj)]; 
		} else {
			return [typeof obj];
		}
	}

	function setClass(obj, classes) {
		dbgFn(setClass, this, arguments, (new Error()).stack);

		// modifies in place, returns object copies
		// of immutable values

		// TODO: need a way of filtering/dealing with duplicate class names

		if(!getClass(obj)) {
			console.warn('Cannot set class of null or undefined');
			return obj;
		}

		// filter out extraneous function and object class 
		// declarations

		if(typeof obj !== "function" && typeof obj !== "object") {
			obj = coerce(obj);
		}

		return _set(obj, classes);
	}

	return (setter === undefined ? getClass(x) : setClass(x, setter));

}

function hasClass(x, c) {
	dbgFn(hasClass, this, arguments, (new Error()).stack, 1);

	return classOf(x).indexOf(c) >= 0;
}

function lastClass(x) {
	dbgFn(lastClass, this, arguments, (new Error()).stack, 1);

	//return classOf(x)? classOf(x).slice(-1)[0]: undefined; /* class list reads from the end */
	return classOf(x)? classOf(x)[0] : undefined; /* class list reads from the front (like R) */
}

function classBefore(o, c) {
	dbgFn(classBefore, this, arguments, (new Error()).stack, 1);

	var classList = classOf(o);
	//return classList[classList.indexOf(c) - 1]; /* class list reads from the end */
	return classList[classList.indexOf(c) + 1]; /* class list reads from the front (like R) */
}

function appendClass(obj, c) {
	dbgFn(appendClass, this, arguments, (new Error()).stack, 1);

	//return classOf(obj, classOf(obj).concat(c)); /* class list reads from the end */
	return classOf(obj, [].concat(c, classOf(obj))); /* class list reads from the front (like R) */
}

function generic(f, name, env) {
	dbgFn(generic, this, arguments, (new Error()).stack, 2);

	if(!f.name && !name) {
		throw new Error("Named function or name parameter not given. Call again with a named function, or pass a method name as the second argument");
	}
	env = env || environment();
	var methodName = name || f.name; // use overriding name before function name
	var proto = Object.create(null);

	proto.useMethod = useMethod;//maybeName.call(proto, useMethod);
	proto.nextMethod = nextMethod;//maybeName.call(proto, nextMethod);
	proto.methodName = methodName;
	proto.dbgFn = dbgFn;

	var expandedProto = Object.assign(Object.getPrototypeOf(f), proto);
	Object.setPrototypeOf(f, expandedProto);
	var g = f.bind(proto);
	appendClass(g, "genericFn");
	env[methodName] = g;

	//Object.assign(g, proto); 
	/* make this.nextMethod and this.useMethod functions available when method.class functions are
	   called directly without binding to a context */

	return g;
}

function method(methodName, className, obj/*, args...*/) {
	dbgFn(method, this, arguments, (new Error()).stack, 2);

	var env = environment();
	var methodArgs = Array.prototype.slice.call(arguments).slice(2);
	if(!env[methodName]) {
		throw new Error("Method " + methodName + " is not defined.");
	}

	var dispatched = env[methodName][className] ? env[methodName][className] : env[methodName]['default'];

	if(!dispatched) {
		throw new Error(methodName + "." + className + " method not defined.");
	}

	var methodContext = Object.create(null);
	classOf(methodContext, classOf(obj));
	methodContext.className = className;
	Object.assign(methodContext, this);

	return dispatched.apply(methodContext, methodArgs);
}

function processArgs(thisScope, args) {
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

function useMethod(maybeName, maybeObj/*, methodArgs... */) {
	var args = processArgs(this, arguments);
	var methodName = args.methodName;
	var methodArgs = args.methodArgs;
	var obj = args.obj;

	dbgFn(useMethod, this, arguments, (new Error()).stack, 2);

	if(typeof methodName !== 'string') {
		throw new Error("useMethod: method name is not a string. Got " + methodName);
	}
	if(!classOf(obj)) {
		throw new Error("useMethod: object not given for method use. Got " + obj);
	}

	var className = lastClass(obj); // last class name in the class chain (i.e. most recent class added)

	return method.apply(this, [methodName, className, obj].concat(methodArgs));
}

function nextMethod(maybeName, maybeObj/*, methodArgs... */) {
	var args = processArgs(this, arguments);
	var methodName = args.methodName;
	var methodArgs = args.methodArgs;
	var obj = args.obj;

	dbgFn(nextMethod, this, arguments, (new Error()).stack, 2);

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

function methods(nameOrFunc) {
	if(typeof nameOrFunc === 'string') {
		var foundMethod = this.__env__[nameOrFunc];
		if(foundMethod) {
			return Object.keys(foundMethod)
				.filter(function(k){ return k !== "__s3class__"; })
				.map(function(k){ return nameOrFunc + "." + k; });
		} else {
			return [];
		}
	} else {
		return Object.keys(nameOrFunc)
				.filter(function(k){ return k !== "__s3class__"; })
				.map(function(k){ return nameOrFunc.name.replace(/bound /,"") + "." + k; });
	}
}

var exports = {
	__env__: Object.create(null),
	generic: appendClass(generic, "s3Builtin"),
	classOf: appendClass(classOf, "s3Builtin"),
	hasClass: appendClass(hasClass, "s3Builtin"),
	appendClass: appendClass(appendClass, "s3Builtin"),
	methods: appendClass(methods, "s3Builtin"),
	lastClass: appendClass(lastClass, "s3Builtin"),
	dbgFn: appendClass(dbgFn, "s3Builtin"),
	dbg: appendClass(dbg, "s3Builtin")
};

Object.assign(ENV, exports);

}));


