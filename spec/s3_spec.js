describe("s3 main object", function(){
	var s3 = require('../s3.js');
	if("should be an object", function(){
		expect(typeof s3).toEqual("object");
	});

	it("should have the following methods defined", function(){
		expect(Object.keys(s3).sort()).toEqual([
			"__env__", 
			"appendClass", 
			"classOf", 
			"generic", 
			"hasClass",
			"lastClass", 
			"methods"
		]);
	});
});

describe("classes of builtins and objects", function(){
	var s3 = require('../s3.js');

	it("should class builtins (except for special cases of object) the same as using typeof", function(){
		expect(s3.classOf('string')).toEqual(['string']);
		expect(s3.classOf(3)).toEqual(['number']);
		expect(s3.classOf(false)).toEqual(['boolean']);
		expect(s3.classOf(function(){})).toEqual(['function']);
		expect(s3.classOf({})).toEqual(['object']);
	});

	it("should deal with object versions of primitives", function(){
		expect(s3.classOf(new String('string'))).toEqual(['string']);
		expect(s3.classOf(new Number(3))).toEqual(['number']);
		expect(s3.classOf(new Boolean(true))).toEqual(['boolean']);
		expect(s3.classOf(new Function())).toEqual(['function']);
	});

	it("should not assign classes to null or undefined", function(){
		expect(s3.classOf(undefined)).toBe(undefined);
		expect(s3.classOf(null)).toBe(undefined);
	});

	it("should convert constructors of builtin classes", function(){
			expect(s3.classOf(new Date())).toEqual(['date']);
	});

	it("should convert constructor names of user-defined classes", function(){
			function MyOb() {
				this.test = '1';
			}
			expect(s3.classOf(new MyOb())).toEqual(['myOb']);
	});

	it("should fallback to typeof when constructor names aren't available", function(){
		expect(s3.classOf(new (function(){})())).toEqual(['object']);
	});

});

describe("setting and modifying classes", function(){
	var s3 = require('../s3.js');
	it("should be able set a class", function(){
		var x = s3.classOf({}, "myClass");
		expect(s3.classOf(x)).toEqual(["myClass"]);

		var y = s3.classOf({}, ["myClass"]);
		expect(s3.classOf(x)).toEqual(["myClass"]);
	});
	it("should return a new object when classing a primitive", function(){
		var x = 3;
		var y = s3.classOf(x, "myNumber");

		expect(s3.classOf(x)).toEqual(['number']);
		expect(x.__s3class__).toBe(undefined);

		expect(y.__proto__.constructor.name).toBe("Number");
		expect(s3.classOf(y)).toEqual(['myNumber']);
	});
	it("should be able to append a class to the class chain", function(){
		var x = Object.create(null);
		s3.appendClass(x, "myClass");
		expect(s3.classOf(x)).toEqual(['myClass', 'object']);
		expect(s3.lastClass(x)).toBe('myClass');

		s3.appendClass(x, ["myThirdClass", "mySecondClass"]);
		expect(s3.classOf(x)).toEqual(['myThirdClass', 'mySecondClass', 'myClass', 'object']);
		expect(s3.lastClass(x)).toBe('myThirdClass');

	});
	it("should be be able to overwrite the entire class chain", function(){
		var x = s3.classOf({}, ["firstClass", "secondClass"]);
		expect(s3.classOf(x)).toEqual(["firstClass", "secondClass"]);

		s3.classOf(x, ["thirdClass", "fourthClass"]);
		expect(s3.classOf(x)).toEqual(["thirdClass", "fourthClass"]);
	});
	it("should be able to tell if an object has a class in the chain", function(){
		var x = s3.classOf({}, ["firstClass", "secondClass"]);
		expect(s3.hasClass(x, "firstClass")).toBe(true);
		expect(s3.hasClass(x, "secondClass")).toBe(true);
		expect(s3.hasClass(x, "object")).toBe(false);
	});
});

describe("creating generic functions", function(){
	var s3 = require('../s3.js');

	it("should be able to create a generic function", function(){
		var info = s3.generic(function info(x){
			this.useMethod(x);
		});
		expect(typeof info).toBe('function');
		expect(s3.hasClass(info, 'genericFn')).toBe(true);
		expect(typeof s3.__env__.info).toBe('function');
	});

	it("should have useMethod, nextMethod, and methodName available inside the generic function", function(){
		var info = s3.generic(function info(x){
			return this;
		});

		var infoThis = info();
		expect(typeof infoThis.useMethod).toBe('function');
		expect(typeof infoThis.nextMethod).toBe('function');
		expect(typeof infoThis.methodName).toBe('string');

	});

	it("should be able to create a generic function from an external name parameter", function(){
		var deets = s3.generic(function stuff(x){
			return this.methodName;
		}, 'nameFromParameter');

		expect(deets()).toBe('nameFromParameter');
		expect(deets.methodName).toBe('nameFromParameter');
		expect(typeof s3.__env__.nameFromParameter).toBe('function');
	});

});

describe("dispatching generic functions", function(){
	var s3 = require('../s3.js');

	it("should be able to register class methods", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.string = function stringInfo() {
			return "this is a string";
		};
		info.myClass = function myClassInfo() {
			return "this is a myClass";
		};

		expect(s3.methods(info).sort()).toEqual(['info.myClass', 'info.string']);
		expect(s3.methods('info').sort()).toEqual(['info.myClass', 'info.string']);

	});

	it("should be able to dispatch on type", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.string = function stringInfo(x) {
			return "this is a string";
		};
		info.myClass = function myClassInfo(x) {
			return "this is a myClass";
		}

		var s = s3.classOf({}, "string");
		var m = s3.classOf({}, "myClass");

		expect(info(s)).toBe("this is a string");
		expect(info(m)).toBe("this is a myClass");

	});

	it("should be able to give an explicit method name when dispatching", function(){
		var info = s3.generic(function info(x){
			return this.useMethod('info', x);
		});
		info.string = function stringInfo(x) {
			return "this is a string";
		};
		info.myClass = function myClassInfo(x) {
			return this.useMethod('sekrit', x);
		};

		var sekrit = s3.generic(function sekrit(x){
			return this.useMethod('sekrit', x);
		});
		sekrit.myClass = function sekritMyClass(x) {
			return 'sekrit';
		};

		expect(info('hello')).toBe('this is a string');
		expect(info(s3.classOf({},'myClass'))).toBe('sekrit');
	});

	it("should fail when a class method can't be dispatched", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.string = function stringInfo() {
			return "this is a string";
		};

		expect(function() {
			info(3)
		}).toThrowError();
	});

	it("should be able to call a class method directly", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.myClass = function myInfo(x) {
			return this.nextMethod(x);
		};
		info.string = function stringInfo() {
			return "this is a string";
		};

		var myVal = s3.appendClass("hey there", "myClass");
		expect(info.myClass(myVal)).toBe("this is a string");
	});
});

describe("dispatching down the class chain", function(){
	var s3 = require('../s3.js');

	it("should be able to dispatch on the next method in the prototype chain", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.myClass = function myInfo(x) {
			return "myClassWasHere: " + this.nextMethod(x);
		}
		info.string = function stringInfo() {
			return "this is a string";
		}

		var myVal = s3.appendClass("Suzanne", "myClass");

		expect(info(myVal)).toBe("myClassWasHere: this is a string");

	});

	it("should throw an error when there isn't a next method defined", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.myClass = function myInfo(x) {
			return this.nextMethod(x);
		};

		var myVal = s3.appendClass("Suzanne", "myClass");

		expect(function(){ info(myVal)}).toThrowError();
	});
	it("should throw an error when there isn't a next class in the chain", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.string = function stringInfo(x) {
			return "this is a string";
		};
		info.myClass = function myInfo(x) {
			return this.nextMethod(x);
		};

		var myVal = s3.classOf("Suzanne", "myClass");

		expect(function(){ info(myVal)}).toThrowError();
	});

	it("should be able to explicitly state the method name and call to a different method in the nextMethod call", function(){
		var info = s3.generic(function info(x){
			return this.useMethod(x);
		});
		info.string = function stringInfo(x) {
			return this.nextMethod(x);
		};
		info.myClass = function myInfo(x) {
			return this.nextMethod('greet', x);
		};

		var greet = s3.generic(function greet(x){
			return this.useMethod(x);
		});
		greet.Suzanne = function hiSuzanne() {
			return "it's Suzanne!";
		};

		var myVal = s3.classOf({}, ['string', 'myClass', 'Suzanne']);

		expect(info(myVal)).toBe("it's Suzanne!");

	});

});