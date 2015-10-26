(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.imba = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(){
	
	if (typeof Imba === 'undefined') {
		require('./imba');
		require('./core.events');
		require('./dom');
		require('./dom.client');
		require('./dom.html');
		require('./dom.legacy');
		require('./dom.events');
		require('./dom.static');
		require('./dom.scheduler');
		return require('./selector');
	};

})()
},{"./core.events":2,"./dom":6,"./dom.client":3,"./dom.events":4,"./dom.html":5,"./dom.legacy":7,"./dom.scheduler":8,"./dom.static":9,"./imba":10,"./selector":11}],2:[function(require,module,exports){
(function(){
	
	
	function emit__(event,args,node){
		// var node = cbs[event]
		var prev,cb,ret;
		
		while ((prev = node) && (node = node.next)){
			if (cb = node.listener) {
				if (node.path && cb[node.path]) {
					ret = args ? (cb[node.path].apply(cb,args)) : (cb[node.path]());
				} else {
					// check if it is a method?
					ret = args ? (cb.apply(node,args)) : (cb.call(node));
				};
			};
			
			if (node.times && --node.times <= 0) {
				prev.next = node.next;
				node.listener = null;
			};
		};
		return;
	};
	
	// method for registering a listener on object
	Imba.listen = function (obj,event,listener,path){
		var $1;
		var cbs,list,tail;
		cbs = obj.__listeners__ || (obj.__listeners__ = {});
		list = cbs[($1 = event)] || (cbs[$1] = {});
		tail = list.tail || (list.tail = (list.next = {}));
		tail.listener = listener;
		tail.path = path;
		list.tail = tail.next = {};
		return tail;
	};
	
	Imba.once = function (obj,event,listener){
		var tail = Imba.listen(obj,event,listener);
		tail.times = 1;
		return tail;
	};
	
	Imba.unlisten = function (obj,event,cb,meth){
		var node,prev;
		var meta = obj.__listeners__;
		if (!meta) { return };
		
		if (node = meta[event]) {
			while ((prev = node) && (node = node.next)){
				if (node == cb || node.listener == cb) {
					prev.next = node.next;
					// check for correct path as well?
					node.listener = null;
					break;
				};
			};
		};
		return;
	};
	
	Imba.emit = function (obj,event,params){
		var cb;
		if (cb = obj.__listeners__) {
			if (cb[event]) { emit__(event,params,cb[event]) };
			if (cb.all) { emit__(event,[event,params],cb.all) }; // and event != 'all'
		};
		return;
	};
	
	return Imba.observeProperty = function (observer,key,trigger,target,prev){
		if (prev && typeof prev == 'object') {
			Imba.unlisten(prev,'all',observer,trigger);
		};
		if (target && typeof target == 'object') {
			Imba.listen(target,'all',observer,trigger);
		};
		return this;
	};

})()
},{}],3:[function(require,module,exports){
(function(){
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	
	
	var prefixes = ['-webkit-','-ms-','-moz-','-o-','-blink-'];
	var props = ['transform','transition','animation'];
	var styles = window.getComputedStyle(document.documentElement,'');
	Imba.CSSKeyMap = {};
	
	for (var i = 0, ary = iter$(styles), len = ary.length, prefixed; i < len; i++) {
		// really? this must be for the client ---
		// there is no way to set this otherwise?
		prefixed = ary[i];
		var unprefixed = prefixed.replace(/^-(webkit|ms|moz|o|blink)-/,'');
		var camelCase = unprefixed.replace(/-(\w)/g,function(m,a) { return a.toUpperCase(); });
		
		// if there exists an unprefixed version -- always use this
		if (prefixed != unprefixed) {
			if (styles.hasOwnProperty(unprefixed)) { continue };
		};
		
		// register the prefixes
		Imba.CSSKeyMap[unprefixed] = Imba.CSSKeyMap[camelCase] = prefixed;
	};
	
	return Imba.extendTag('htmlelement', function(tag){
		
		// override the original css method
		tag.prototype.css = function (key,val){
			if (key instanceof Object) {
				for (var i = 0, keys = Object.keys(key), l = keys.length; i < l; i++){
					this.css(keys[i],key[keys[i]]);
				};
				return this;
			};
			
			key = Imba.CSSKeyMap[key] || key;
			
			if (val == null) {
				this.dom().style.removeProperty(key);
			} else if (val == undefined) {
				return this.dom().style[key];
			} else {
				if ((typeof val=='number'||val instanceof Number) && key.match(/width|height|left|right|top|bottom/)) {
					val = val + "px";
				};
				this.dom().style[key] = val;
			};
			return this;
		};
	});

})()
},{}],4:[function(require,module,exports){
(function(){
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	var doc = document;
	var win = window;
	
	var hasTouchEvents = window && window.ontouchstart !== undefined; // .hasOwnProperty('ontouchstart')
	
	// Ringbuffer for events?
	
	Imba.RingBuffer = function RingBuffer(len){
		if(len === undefined) len = 10;
		this._array = [];
		this._keep = len;
		this._head = 0;
		this;
	};
	
	
	Imba.RingBuffer.prototype.__head = {name: 'head'};
	Imba.RingBuffer.prototype.head = function(v){ return this._head; }
	Imba.RingBuffer.prototype.setHead = function(v){ this._head = v; return this; };
	
	Imba.RingBuffer.prototype.push = function (obj){
		var i = this._head++;
		this._array[i % this._keep] = obj;
		return i;
	};
	
	Imba.RingBuffer.prototype.last = function (){
		return this._array[this._head % this._keep];
	};
	
	// really more like a pointer?
	Imba.Pointer = function Pointer(){
		this.setButton(-1);
		this.setEvents(new Imba.RingBuffer(10));
		this.setEvent({x: 0,y: 0,type: 'uninitialized'});
		this;
	};
	
	
	Imba.Pointer.prototype.__phase = {name: 'phase'};
	Imba.Pointer.prototype.phase = function(v){ return this._phase; }
	Imba.Pointer.prototype.setPhase = function(v){ this._phase = v; return this; }; // change: update
	
	Imba.Pointer.prototype.__prevEvent = {name: 'prevEvent'};
	Imba.Pointer.prototype.prevEvent = function(v){ return this._prevEvent; }
	Imba.Pointer.prototype.setPrevEvent = function(v){ this._prevEvent = v; return this; };
	
	Imba.Pointer.prototype.__button = {name: 'button'};
	Imba.Pointer.prototype.button = function(v){ return this._button; }
	Imba.Pointer.prototype.setButton = function(v){ this._button = v; return this; };
	
	Imba.Pointer.prototype.__event = {name: 'event'};
	Imba.Pointer.prototype.event = function(v){ return this._event; }
	Imba.Pointer.prototype.setEvent = function(v){ this._event = v; return this; };
	
	Imba.Pointer.prototype.__dirty = {name: 'dirty'};
	Imba.Pointer.prototype.dirty = function(v){ return this._dirty; }
	Imba.Pointer.prototype.setDirty = function(v){ this._dirty = v; return this; };
	
	Imba.Pointer.prototype.__events = {name: 'events'};
	Imba.Pointer.prototype.events = function(v){ return this._events; }
	Imba.Pointer.prototype.setEvents = function(v){ this._events = v; return this; };
	
	Imba.Pointer.prototype.__touch = {name: 'touch'};
	Imba.Pointer.prototype.touch = function(v){ return this._touch; }
	Imba.Pointer.prototype.setTouch = function(v){ this._touch = v; return this; };
	
	Imba.Pointer.prototype.update = function (e){
		// console.log(e)
		this.setEvent(e);
		// normalize the event / touch?
		this.events().push(e);
		this.setDirty(true);
		return this;
	};
	
	// this is just for regular mouse now
	Imba.Pointer.prototype.process = function (){
		var phase = this.phase();
		var e0 = this.prevEvent();
		var e1 = this.event();
		
		if (this.dirty()) {
			this.setPrevEvent(e1);
			this.setDirty(false);
			// button should only change on mousedown etc
			if (e1.type == 'mousedown') {
				this.setButton(e1.button);
				this.setTouch(new Imba.Touch(e1,this));
				this.touch().mousedown(e1,e1);
			} else if (e1.type == 'mousemove') {
				if (this.touch()) { this.touch().mousemove(e1,e1) };
			} else if (e1.type == 'mouseup') {
				this.setButton(-1);
				if (this.touch()) { this.touch().mouseup(e1,e1) };
				this.setTouch(null); // reuse?
				// trigger pointerup
			};
		} else {
			if (this.touch()) { this.touch().idle() };
		};
		return this;
	};
	
	Imba.Pointer.prototype.emit = function (name,target,pars){
		if(!pars||pars.constructor !== Object) pars = {};
		var bubble = pars.bubble !== undefined ? pars.bubble : true;
		return true;
	};
	
	Imba.Pointer.prototype.cleanup = function (){
		return Imba.POINTERS;
	};
	
	Imba.Pointer.prototype.x = function (){
		return this.event().x;
	};
	Imba.Pointer.prototype.y = function (){
		return this.event().y;
	};
	
	Imba.Pointer.update = function (){
		// console.log('update touch')
		for (var i = 0, ary = iter$(Imba.POINTERS), len = ary.length; i < len; i++) {
			ary[i].process();
		};
		// need to be able to prevent the default behaviour of touch, no?
		win.requestAnimationFrame(Imba.Pointer.update);
		return this;
	};
	
	var lastNativeTouchTimeStamp = 0;
	var lastNativeTouchTimeout = 50;
	
	// Imba.Touch
	// Began	A finger touched the screen.
	// Moved	A finger moved on the screen.
	// Stationary	A finger is touching the screen but hasn't moved.
	// Ended	A finger was lifted from the screen. This is the final phase of a touch.
	// Canceled The system cancelled tracking for the touch.
	Imba.Touch = function Touch(e,ptr){
		// @native  = false
		this.setEvent(e);
		this.setData({});
		this.setActive(true);
		this._suppress = false;
		this.setBubble(false);
		this.setPointer(ptr);
		this.setUpdates(0);
	};
	
	var multi = true;
	var touches = [];
	var count = 0;
	var identifiers = {};
	
	Imba.Touch.count = function (){
		return count;
	};
	
	Imba.Touch.lookup = function (item){
		// return touch if var touch = item:__touch__
		return item && (item.__touch__ || identifiers[item.identifier]);
		// look for lookup
		// var id = item:identifier
		// if id != undefined and (touch = IMBA_TOUCH_IDENTIFIERS{id})
		// 	return touch 
	};
	
	Imba.Touch.release = function (item,touch){
		var v_, $1;
		(((v_ = identifiers[item.identifier]),delete identifiers[item.identifier], v_));
		((($1 = item.__touch__),delete item.__touch__, $1));
		return;
	};
	
	Imba.Touch.ontouchstart = function (e){
		for (var i = 0, ary = iter$(e.changedTouches), len = ary.length, t; i < len; i++) {
			t = ary[i];
			if (this.lookup(t)) { continue };
			var touch = identifiers[t.identifier] = new this(e); // (e)
			t.__touch__ = touch;
			touches.push(touch);
			count++;
			touch.touchstart(e,t);
		};
		return this;
	};
	
	Imba.Touch.ontouchmove = function (e){
		var touch;
		for (var i = 0, ary = iter$(e.changedTouches), len = ary.length, t; i < len; i++) {
			t = ary[i];
			if (touch = this.lookup(t)) {
				touch.touchmove(e,t);
			};
		};
		
		return this;
	};
	
	Imba.Touch.ontouchend = function (e){
		var touch;
		for (var i = 0, ary = iter$(e.changedTouches), len = ary.length, t; i < len; i++) {
			t = ary[i];
			if (touch = this.lookup(t)) {
				touch.touchend(e,t);
				this.release(t,touch);
				count--;
			};
		};
		
		// e.preventDefault
		// not always supported!
		// touches = touches.filter(||)
		return this;
	};
	
	Imba.Touch.ontouchcancel = function (e){
		var touch;
		for (var i = 0, ary = iter$(e.changedTouches), len = ary.length, t; i < len; i++) {
			t = ary[i];
			if (touch = this.lookup(t)) {
				touch.touchcancel(e,t);
				this.release(t,touch);
				count--;
			};
		};
		return this;
	};
	
	Imba.Touch.onmousedown = function (e){
		return this;
	};
	
	Imba.Touch.onmousemove = function (e){
		return this;
	};
	
	Imba.Touch.onmouseup = function (e){
		return this;
	};
	
	
	Imba.Touch.prototype.__phase = {name: 'phase'};
	Imba.Touch.prototype.phase = function(v){ return this._phase; }
	Imba.Touch.prototype.setPhase = function(v){ this._phase = v; return this; };
	
	Imba.Touch.prototype.__active = {name: 'active'};
	Imba.Touch.prototype.active = function(v){ return this._active; }
	Imba.Touch.prototype.setActive = function(v){ this._active = v; return this; };
	
	Imba.Touch.prototype.__event = {name: 'event'};
	Imba.Touch.prototype.event = function(v){ return this._event; }
	Imba.Touch.prototype.setEvent = function(v){ this._event = v; return this; };
	
	Imba.Touch.prototype.__pointer = {name: 'pointer'};
	Imba.Touch.prototype.pointer = function(v){ return this._pointer; }
	Imba.Touch.prototype.setPointer = function(v){ this._pointer = v; return this; };
	
	Imba.Touch.prototype.__target = {name: 'target'};
	Imba.Touch.prototype.target = function(v){ return this._target; }
	Imba.Touch.prototype.setTarget = function(v){ this._target = v; return this; }; // if 'safe' we can cache multiple uses
	
	Imba.Touch.prototype.__handler = {name: 'handler'};
	Imba.Touch.prototype.handler = function(v){ return this._handler; }
	Imba.Touch.prototype.setHandler = function(v){ this._handler = v; return this; };
	
	Imba.Touch.prototype.__updates = {name: 'updates'};
	Imba.Touch.prototype.updates = function(v){ return this._updates; }
	Imba.Touch.prototype.setUpdates = function(v){ this._updates = v; return this; };
	
	Imba.Touch.prototype.__suppress = {name: 'suppress'};
	Imba.Touch.prototype.suppress = function(v){ return this._suppress; }
	Imba.Touch.prototype.setSuppress = function(v){ this._suppress = v; return this; };
	
	Imba.Touch.prototype.__data = {name: 'data'};
	Imba.Touch.prototype.data = function(v){ return this._data; }
	Imba.Touch.prototype.setData = function(v){ this._data = v; return this; };
	
	Imba.Touch.prototype.__bubble = {chainable: true,name: 'bubble'};
	Imba.Touch.prototype.bubble = function(v){ return v !== undefined ? (this.setBubble(v),this) : this._bubble; }
	Imba.Touch.prototype.setBubble = function(v){ this._bubble = v; return this; };
	
	
	Imba.Touch.prototype.__gestures = {name: 'gestures'};
	Imba.Touch.prototype.gestures = function(v){ return this._gestures; }
	Imba.Touch.prototype.setGestures = function(v){ this._gestures = v; return this; };
	// prop preventDefault
	
	
	Imba.Touch.prototype.__x0 = {name: 'x0'};
	Imba.Touch.prototype.x0 = function(v){ return this._x0; }
	Imba.Touch.prototype.setX0 = function(v){ this._x0 = v; return this; };
	
	Imba.Touch.prototype.__y0 = {name: 'y0'};
	Imba.Touch.prototype.y0 = function(v){ return this._y0; }
	Imba.Touch.prototype.setY0 = function(v){ this._y0 = v; return this; };
	
	// duration etc -- important
	
	Imba.Touch.prototype.preventDefault = function (){
		this._preventDefault = true;
		this.event() && this.event().preventDefault();
		// pointer.event.preventDefault
		return this;
	};
	
	Imba.Touch.prototype.extend = function (gesture){
		// console.log "added gesture!!!"
		this._gestures || (this._gestures = []);
		this._gestures.push(gesture);
		return this;
	};
	
	Imba.Touch.prototype.redirect = function (target){
		this._redirect = target;
		return this;
	};
	
	Imba.Touch.prototype.suppress = function (){
		// collision with the suppress property
		this._active = false;
		return this;
	};
	
	Imba.Touch.prototype.touchstart = function (e,t){
		// console.log 'native ontouchstart',e,t
		this._event = e;
		this._touch = t;
		this._x = t.clientX;
		this._y = t.clientY;
		this.began();
		if (e && this._suppress) { e.preventDefault() };
		return this;
	};
	
	Imba.Touch.prototype.touchmove = function (e,t){
		// console.log 'native ontouchmove',e,t
		this._event = e;
		this._x = t.clientX;
		this._y = t.clientY;
		this.update();
		if (e && this._suppress) { e.preventDefault() };
		return this;
	};
	
	Imba.Touch.prototype.touchend = function (e,t){
		// console.log 'native ontouchend',e,t,e:timeStamp
		this._event = e;
		// log "touchend"
		this._x = t.clientX;
		this._y = t.clientY;
		this.ended();
		
		lastNativeTouchTimeStamp = e.timeStamp;
		
		if (this._maxdr < 20) {
			var tap = new Imba.Event(e);
			tap.setType('tap');
			tap.process();
			if (tap._responder) { e.preventDefault() };
		};
		
		if (e && this._suppress) {
			e.preventDefault();
		};
		
		return this;
	};
	
	Imba.Touch.prototype.touchcancel = function (e,t){
		// log "touchcancel"
		return this;
	};
	
	
	Imba.Touch.prototype.mousedown = function (e,t){
		// log "mousedown"
		var self = this;
		self._x = t.clientX;
		self._y = t.clientY;
		self.began();
		
		self._mousemove = function(e) { return self.mousemove(e,e); };
		doc.addEventListener('mousemove',self._mousemove,true);
		// inside here -- start tracking mousemove directly
		
		return self;
	};
	
	Imba.Touch.prototype.mousemove = function (e,t){
		this._x = t.clientX;
		this._y = t.clientY;
		this._event = e;
		if (this._suppress) { e.preventDefault() };
		this.update();
		this.move();
		return this;
	};
	
	Imba.Touch.prototype.mouseup = function (e,t){
		this._x = t.clientX;
		this._y = t.clientY;
		this.ended();
		doc.removeEventListener('mousemove',this._mousemove,true);
		this._mousemove = null;
		return this;
	};
	
	Imba.Touch.prototype.idle = function (){
		return this.update();
	};
	
	Imba.Touch.prototype.began = function (){
		this._maxdr = this._dr = 0;
		this._x0 = this._x;
		this._y0 = this._y;
		
		var e = this.event();
		// var ptr = pointer
		var dom = this.event().target;
		var node = null;
		
		this._sourceTarget = dom && tag$wrap(dom);
		
		while (dom){
			node = tag$wrap(dom);
			if (node && node.ontouchstart) {
				this._bubble = false;
				this.setTarget(node);
				this.target().ontouchstart(this);
				if (!this._bubble) { break };
			};
			dom = dom.parentNode;
		};
		
		this._updates++;
		return this;
	};
	
	Imba.Touch.prototype.update = function (){
		if (!this._active) { return this };
		
		var dr = Math.sqrt(this.dx() * this.dx() + this.dy() * this.dy());
		if (dr > this._dr) { this._maxdr = dr };
		this._dr = dr;
		
		// catching a touch-redirect?!?
		if (this._redirect) {
			if (this._target && this._target.ontouchcancel) {
				this._target.ontouchcancel(this);
			};
			this.setTarget(this._redirect);
			this._redirect = null;
			if (this.target().ontouchstart) { this.target().ontouchstart(this) };
		};
		
		
		this._updates++;
		if (this._gestures) {
			for (var i = 0, ary = iter$(this._gestures), len = ary.length; i < len; i++) {
				ary[i].ontouchupdate(this);
			};
		};
		
		if (this.target() && this.target().ontouchupdate) { this.target().ontouchupdate(this) };
		return this;
	};
	
	Imba.Touch.prototype.move = function (){
		if (!this._active) { return this };
		
		if (this._gestures) {
			for (var i = 0, ary = iter$(this._gestures), len = ary.length, g; i < len; i++) {
				g = ary[i];
				if (g.ontouchmove) { g.ontouchmove(this,this._event) };
			};
		};
		
		if (this.target() && this.target().ontouchmove) { this.target().ontouchmove(this,this._event) };
		return this;
	};
	
	Imba.Touch.prototype.ended = function (){
		if (!this._active) { return this };
		
		this._updates++;
		
		if (this._gestures) {
			for (var i = 0, ary = iter$(this._gestures), len = ary.length; i < len; i++) {
				ary[i].ontouchend(this);
			};
		};
		
		if (this.target() && this.target().ontouchend) { this.target().ontouchend(this) };
		
		return this;
	};
	
	Imba.Touch.prototype.cancelled = function (){
		return this;
	};
	
	Imba.Touch.prototype.dr = function (){
		return this._dr;
	};
	Imba.Touch.prototype.dx = function (){
		return this._x - this._x0;
	};
	Imba.Touch.prototype.dy = function (){
		return this._y - this._y0;
	};
	Imba.Touch.prototype.x = function (){
		return this._x;
	};
	Imba.Touch.prototype.y = function (){
		return this._y;
	};
	
	Imba.Touch.prototype.button = function (){
		return this._pointer ? (this._pointer.button()) : (0);
	};
	
	Imba.Touch.prototype.sourceTarget = function (){
		return this._sourceTarget;
	};
	
	
	Imba.TouchGesture = function TouchGesture(){ };
	
	
	Imba.TouchGesture.prototype.__active = {'default': false,name: 'active'};
	Imba.TouchGesture.prototype.active = function(v){ return this._active; }
	Imba.TouchGesture.prototype.setActive = function(v){ this._active = v; return this; }
	Imba.TouchGesture.prototype._active = false;
	
	Imba.TouchGesture.prototype.ontouchstart = function (e){
		return this;
	};
	
	Imba.TouchGesture.prototype.ontouchupdate = function (e){
		return this;
	};
	
	Imba.TouchGesture.prototype.ontouchend = function (e){
		return this;
	};
	
	
	// A Touch-event is created on mousedown (always)
	// and while it exists, mousemove and mouseup will
	// be delegated to this active event.
	Imba.POINTER = new Imba.Pointer();
	Imba.POINTERS = [Imba.POINTER];
	
	
	// regular event stuff
	Imba.KEYMAP = {
		"8": 'backspace',
		"9": 'tab',
		"13": 'enter',
		"16": 'shift',
		"17": 'ctrl',
		"18": 'alt',
		"19": 'break',
		"20": 'caps',
		"27": 'esc',
		"32": 'space',
		"35": 'end',
		"36": 'home',
		"37": 'larr',
		"38": 'uarr',
		"39": 'rarr',
		"40": 'darr',
		"45": 'insert',
		"46": 'delete',
		"107": 'plus',
		"106": 'mult',
		"91": 'meta'
	};
	
	Imba.CHARMAP = {
		"%": 'modulo',
		"*": 'multiply',
		"+": 'add',
		"-": 'sub',
		"/": 'divide',
		".": 'dot'
	};
	
	
	Imba.Event = function Event(e){
		this.setEvent(e);
		this.setBubble(true);
	};
	
	
	Imba.Event.prototype.__event = {name: 'event'};
	Imba.Event.prototype.event = function(v){ return this._event; }
	Imba.Event.prototype.setEvent = function(v){ this._event = v; return this; };
	
	Imba.Event.prototype.__target = {name: 'target'};
	Imba.Event.prototype.target = function(v){ return this._target; }
	Imba.Event.prototype.setTarget = function(v){ this._target = v; return this; };
	
	Imba.Event.prototype.__prefix = {name: 'prefix'};
	Imba.Event.prototype.prefix = function(v){ return this._prefix; }
	Imba.Event.prototype.setPrefix = function(v){ this._prefix = v; return this; };
	
	Imba.Event.prototype.__data = {name: 'data'};
	Imba.Event.prototype.data = function(v){ return this._data; }
	Imba.Event.prototype.setData = function(v){ this._data = v; return this; };
	
	Imba.Event.prototype.__source = {name: 'source'};
	Imba.Event.prototype.source = function(v){ return this._source; }
	Imba.Event.prototype.setSource = function(v){ this._source = v; return this; };
	
	Imba.Event.prototype.__bubble = {name: 'bubble'};
	Imba.Event.prototype.bubble = function(v){ return this._bubble; }
	Imba.Event.prototype.setBubble = function(v){ this._bubble = v; return this; }; // getset: yes
	
	Imba.Event.wrap = function (e){
		return new this(e);
	};
	
	Imba.Event.prototype.setType = function (type){
		this._type = type;
		return this;
	};
	
	Imba.Event.prototype.type = function (){
		return this._type || this.event().type;
	};
	
	Imba.Event.prototype.name = function (){
		return this._name || (this._name = this.type().toLowerCase().replace(/\:/g,''));
	};
	
	// mimc getset
	Imba.Event.prototype.bubble = function (v){
		if (v != undefined) {
			this.setBubble(v);
			return this;
		};
		return this._bubble;
	};
	
	Imba.Event.prototype.halt = function (){
		this.setBubble(false);
		return this;
	};
	
	Imba.Event.prototype.cancel = function (){
		if (this.event().preventDefault) { this.event().preventDefault() };
		this._cancel = true;
		return this;
	};
	
	Imba.Event.prototype.isPrevented = function (){
		return this.event() && this.event().defaultPrevented || this._cancel;
	};
	
	Imba.Event.prototype.target = function (){
		return tag$wrap(this.event()._target || this.event().target);
	};
	
	Imba.Event.prototype.redirect = function (node){
		this._redirect = node;
		return this;
	};
	
	Imba.Event.prototype.keychar = function (){
		if (this.event() instanceof TextEvent) {
			return this.event().data;
		};
		
		if (this.event() instanceof KeyboardEvent) {
			var ki = this.event().keyIdentifier;
			var sym = Imba.KEYMAP[this.event().keyCode];
			
			// p 'keysym!',ki,sym
			
			if (!sym && ki.substr(0,2) == "U+") {
				sym = String.fromCharCode(parseInt(ki.substr(2),16));
			};
			return sym;
		};
		
		return null;
	};
	
	Imba.Event.prototype.keycombo = function (){
		var sym;
		if (!(sym = this.keychar())) { return };
		sym = Imba.CHARMAP[sym] || sym;
		var combo = [],e = this.event();
		if (e.ctrlKey) { combo.push('ctrl') };
		if (e.shiftKey) { combo.push('shift') };
		if (e.altKey) { combo.push('alt') };
		if (e.metaKey) { combo.push('cmd') };
		combo.push(sym);
		return combo.join("_").toLowerCase();
	};
	
	Imba.Event.prototype.process = function (){
		var node;
		var meth = ("on" + (this._prefix || '') + this.name());
		var args = null;
		var domtarget = this.event()._target || this.event().target;
		// var node = <{domtarget:_responder or domtarget}>
		
		var domnode = domtarget._responder || domtarget;
		var rerouter = null;
		var rerouted = false;
		
		// need to stop infinite redirect-rules here??!?
		
		var $1;while (domnode){
			this._redirect = null;
			if (node = tag$wrap(domnode)) { // not only tag 
				
				if ((typeof node[($1 = meth)]=='string'||node[$1] instanceof String)) {
					// should remember the receiver of the event
					meth = node[meth];
					continue;
				};
				
				if (node[meth] instanceof Array) {
					args = node[meth].concat(node);
					meth = args.shift();
					continue;
				};
				
				if (node[meth] instanceof Function) {
					this._responder || (this._responder = node);
					// should autostop bubble here?
					var res = args ? (node[meth].apply(node,args)) : (node[meth](this,this.data()));
				};
			};
			
			// add node.nextEventResponder as a separate method here?
			if (!(this.bubble() && (domnode = (this._redirect || (node ? (node.parent()) : (domnode.parentNode)))))) {
				break;
			};
		};
		
		this.processed();
		return this;
	};
	
	Imba.Event.prototype.processed = function (){
		Imba.emit(Imba,'event',[this]);
		return this;
	};
	
	Imba.Event.prototype.x = function (){
		return this.event().x;
	};
	Imba.Event.prototype.y = function (){
		return this.event().y;
	};
	Imba.Event.prototype.which = function (){
		return this.event().which;
	};
	
	Imba.EventManager = function EventManager(node,pars){
		var self = this;
		if(!pars||pars.constructor !== Object) pars = {};
		var events = pars.events !== undefined ? pars.events : [];
		self.setRoot(node);
		self.setCount(0);
		self.setListeners([]);
		self.setDelegators({});
		self.setDelegator(function(e) {
			// console.log "delegating event?! {e}"
			self.delegate(e);
			return true;
		});
		
		for (var i = 0, ary = iter$(events), len = ary.length; i < len; i++) {
			self.register(ary[i]);
		};
		self;
	};
	
	
	Imba.EventManager.prototype.__root = {name: 'root'};
	Imba.EventManager.prototype.root = function(v){ return this._root; }
	Imba.EventManager.prototype.setRoot = function(v){ this._root = v; return this; };
	
	Imba.EventManager.prototype.__count = {name: 'count'};
	Imba.EventManager.prototype.count = function(v){ return this._count; }
	Imba.EventManager.prototype.setCount = function(v){ this._count = v; return this; };
	
	Imba.EventManager.prototype.__enabled = {'default': false,watch: 'enabledDidSet',name: 'enabled'};
	Imba.EventManager.prototype.enabled = function(v){ return this._enabled; }
	Imba.EventManager.prototype.setEnabled = function(v){
		var a = this.enabled();
		if(v != a) { v = this._enabled = v; }
		if(v != a) { this.enabledDidSet && this.enabledDidSet(v,a,this.__enabled) }
		return this;
	}
	Imba.EventManager.prototype._enabled = false;
	
	Imba.EventManager.prototype.__listeners = {name: 'listeners'};
	Imba.EventManager.prototype.listeners = function(v){ return this._listeners; }
	Imba.EventManager.prototype.setListeners = function(v){ this._listeners = v; return this; };
	
	Imba.EventManager.prototype.__delegators = {name: 'delegators'};
	Imba.EventManager.prototype.delegators = function(v){ return this._delegators; }
	Imba.EventManager.prototype.setDelegators = function(v){ this._delegators = v; return this; };
	
	Imba.EventManager.prototype.__delegator = {name: 'delegator'};
	Imba.EventManager.prototype.delegator = function(v){ return this._delegator; }
	Imba.EventManager.prototype.setDelegator = function(v){ this._delegator = v; return this; };
	
	Imba.EventManager.prototype.enabledDidSet = function (bool){
		bool ? (this.onenable()) : (this.ondisable());
		return this;
	};
	
	Imba.EventManager.prototype.register = function (name,handler){
		if(handler === undefined) handler = true;
		if (name instanceof Array) {
			for (var i = 0, ary = iter$(name), len = ary.length; i < len; i++) {
				this.register(ary[i],handler);
			};
			return this;
		};
		
		if (this.delegators()[name]) { return this };
		// console.log("register for event {name}")
		var fn = this.delegators()[name] = handler instanceof Function ? (handler) : (this.delegator());
		if (this.enabled()) { return this.root().addEventListener(name,fn,true) };
	};
	
	Imba.EventManager.prototype.listen = function (name,handler,capture){
		if(capture === undefined) capture = true;
		this.listeners().push([name,handler,capture]);
		if (this.enabled()) { this.root().addEventListener(name,handler,capture) };
		return this;
	};
	
	Imba.EventManager.prototype.delegate = function (e){
		var $1, v_;
		((this.setCount(v_ = this.count() + 1),v_)) - 1;
		var event = Imba.Event.wrap(e);
		event.process();
		return this;
	};
	
	Imba.EventManager.prototype.create = function (type,target,pars){
		if(!pars||pars.constructor !== Object) pars = {};
		var data = pars.data !== undefined ? pars.data : null;
		var source = pars.source !== undefined ? pars.source : null;
		var event = Imba.Event.wrap({type: type,target: target});
		if (data) { (event.setData(data),data) };
		if (source) { (event.setSource(source),source) };
		return event;
	};
	
	// use create instead?
	Imba.EventManager.prototype.trigger = function (){
		var $1;
		return this.create.apply(this,arguments).process();
	};
	
	Imba.EventManager.prototype.onenable = function (){
		for (var o = this.delegators(), i = 0, keys = Object.keys(o), l = keys.length; i < l; i++){
			this.root().addEventListener(keys[i],o[keys[i]],true);
		};
		
		for (var j = 0, ary = iter$(this.listeners()), len = ary.length, item; j < len; j++) {
			item = ary[j];
			this.root().addEventListener(item[0],item[1],item[2]);
		};
		return this;
	};
	
	Imba.EventManager.prototype.ondisable = function (){
		for (var o = this.delegators(), i = 0, keys = Object.keys(o), l = keys.length; i < l; i++){
			this.root().removeEventListener(keys[i],o[keys[i]],true);
		};
		
		for (var j = 0, ary = iter$(this.listeners()), len = ary.length, item; j < len; j++) {
			item = ary[j];
			this.root().removeEventListener(item[0],item[1],item[2]);
		};
		return this;
	};
	
	
	ED = Imba.Events = new Imba.EventManager(document,{events: [
		'keydown','keyup','keypress','textInput','input','change','submit',
		'focusin','focusout','blur','contextmenu','dblclick',
		'mousewheel','wheel'
	]});
	
	// should set these up inside the Imba.Events object itself
	// so that we can have different EventManager for different roots
	
	if (hasTouchEvents) {
		Imba.Events.listen('touchstart',function(e) {
			var Events_, v_;
			(((Events_ = Imba.Events).setCount(v_ = Events_.count() + 1),v_)) - 1;
			return Imba.Touch.ontouchstart(e);
		});
		
		Imba.Events.listen('touchmove',function(e) {
			var Events_, v_;
			(((Events_ = Imba.Events).setCount(v_ = Events_.count() + 1),v_)) - 1;
			return Imba.Touch.ontouchmove(e);
		});
		
		Imba.Events.listen('touchend',function(e) {
			var Events_, v_;
			(((Events_ = Imba.Events).setCount(v_ = Events_.count() + 1),v_)) - 1;
			return Imba.Touch.ontouchend(e);
		});
		
		Imba.Events.listen('touchcancel',function(e) {
			var Events_, v_;
			(((Events_ = Imba.Events).setCount(v_ = Events_.count() + 1),v_)) - 1;
			return Imba.Touch.ontouchcancel(e);
		});
	};
	
	Imba.Events.register('click',function(e) {
		
		if ((e.timeStamp - lastNativeTouchTimeStamp) > lastNativeTouchTimeout) {
			var tap = new Imba.Event(e);
			tap.setType('tap');
			tap.process();
			if (tap._responder) {
				return e.preventDefault();
			};
		};
		// delegate the real click event
		return Imba.Events.delegate(e);
	});
	
	Imba.Events.listen('mousedown',function(e) {
		if ((e.timeStamp - lastNativeTouchTimeStamp) > lastNativeTouchTimeout) {
			if (Imba.POINTER) { return Imba.POINTER.update(e).process() };
		};
	});
	
	// Imba.Events.listen(:mousemove) do |e|
	// 	# console.log 'mousemove',e:timeStamp
	// 	if (e:timeStamp - lastNativeTouchTimeStamp) > lastNativeTouchTimeout
	// 		Imba.POINTER.update(e).process if Imba.POINTER # .process if touch # should not happen? We process through 
	
	Imba.Events.listen('mouseup',function(e) {
		// console.log 'mouseup',e:timeStamp
		if ((e.timeStamp - lastNativeTouchTimeStamp) > lastNativeTouchTimeout) {
			if (Imba.POINTER) { return Imba.POINTER.update(e).process() };
		};
	});
	
	
	Imba.Events.register(['mousedown','mouseup']);
	return (Imba.Events.setEnabled(true),true);

})()
},{}],5:[function(require,module,exports){
(function(){
	
	// predefine all supported html tags
	Imba.extendTag('htmlelement', function(tag){
		
		
		tag.prototype.__id = {name: 'id'};
		tag.prototype.id = function(v){ return this.getAttribute('id'); }
		tag.prototype.setId = function(v){ this.setAttribute('id',v); return this; };
		
		tag.prototype.__tabindex = {name: 'tabindex'};
		tag.prototype.tabindex = function(v){ return this.getAttribute('tabindex'); }
		tag.prototype.setTabindex = function(v){ this.setAttribute('tabindex',v); return this; };
		
		tag.prototype.__title = {name: 'title'};
		tag.prototype.title = function(v){ return this.getAttribute('title'); }
		tag.prototype.setTitle = function(v){ this.setAttribute('title',v); return this; };
		
		tag.prototype.__role = {name: 'role'};
		tag.prototype.role = function(v){ return this.getAttribute('role'); }
		tag.prototype.setRole = function(v){ this.setAttribute('role',v); return this; };
	});
	
	
	Imba.defineTag('fragment','htmlelement', function(tag){
		
		tag.createNode = function (){
			return Imba.document().createDocumentFragment();
		};
	});
	
	Imba.defineTag('a', function(tag){
		
		tag.prototype.__href = {dom: true,name: 'href'};
		tag.prototype.href = function(v){ return this.getAttribute('href'); }
		tag.prototype.setHref = function(v){ this.setAttribute('href',v); return this; };
	});
	
	Imba.defineTag('abbr');
	Imba.defineTag('address');
	Imba.defineTag('area');
	Imba.defineTag('article');
	Imba.defineTag('aside');
	Imba.defineTag('audio');
	Imba.defineTag('b');
	Imba.defineTag('base');
	Imba.defineTag('bdi');
	Imba.defineTag('bdo');
	Imba.defineTag('big');
	Imba.defineTag('blockquote');
	Imba.defineTag('body');
	Imba.defineTag('br');
	
	Imba.defineTag('button', function(tag){
		
		tag.prototype.__autofocus = {name: 'autofocus'};
		tag.prototype.autofocus = function(v){ return this.getAttribute('autofocus'); }
		tag.prototype.setAutofocus = function(v){ this.setAttribute('autofocus',v); return this; };
		
		tag.prototype.__type = {dom: true,name: 'type'};
		tag.prototype.type = function(v){ return this.getAttribute('type'); }
		tag.prototype.setType = function(v){ this.setAttribute('type',v); return this; };
		
		tag.prototype.__disabled = {dom: true,name: 'disabled'};
		tag.prototype.disabled = function(v){ return this.getAttribute('disabled'); }
		tag.prototype.setDisabled = function(v){ this.setAttribute('disabled',v); return this; };
	});
	
	Imba.defineTag('canvas', function(tag){
		tag.prototype.setWidth = function (val){
			if (this.width() != val) { this.dom().width = val };
			return this;
		};
		
		tag.prototype.setHeight = function (val){
			if (this.height() != val) { this.dom().height = val };
			return this;
		};
		
		tag.prototype.width = function (){
			return this.dom().width;
		};
		
		tag.prototype.height = function (){
			return this.dom().height;
		};
	});
	
	
	Imba.defineTag('caption');
	Imba.defineTag('cite');
	Imba.defineTag('code');
	Imba.defineTag('col');
	Imba.defineTag('colgroup');
	Imba.defineTag('data');
	Imba.defineTag('datalist');
	Imba.defineTag('dd');
	Imba.defineTag('del');
	Imba.defineTag('details');
	Imba.defineTag('dfn');
	Imba.defineTag('div');
	Imba.defineTag('dl');
	Imba.defineTag('dt');
	Imba.defineTag('em');
	Imba.defineTag('embed');
	Imba.defineTag('fieldset');
	Imba.defineTag('figcaption');
	Imba.defineTag('figure');
	Imba.defineTag('footer');
	
	Imba.defineTag('form', function(tag){
		
		tag.prototype.__method = {dom: true,name: 'method'};
		tag.prototype.method = function(v){ return this.getAttribute('method'); }
		tag.prototype.setMethod = function(v){ this.setAttribute('method',v); return this; };
		
		tag.prototype.__action = {dom: true,name: 'action'};
		tag.prototype.action = function(v){ return this.getAttribute('action'); }
		tag.prototype.setAction = function(v){ this.setAttribute('action',v); return this; };
	});
	
	Imba.defineTag('h1');
	Imba.defineTag('h2');
	Imba.defineTag('h3');
	Imba.defineTag('h4');
	Imba.defineTag('h5');
	Imba.defineTag('h6');
	Imba.defineTag('head');
	Imba.defineTag('header');
	Imba.defineTag('hr');
	Imba.defineTag('html');
	Imba.defineTag('i');
	
	Imba.defineTag('iframe', function(tag){
		
		tag.prototype.__src = {name: 'src'};
		tag.prototype.src = function(v){ return this.getAttribute('src'); }
		tag.prototype.setSrc = function(v){ this.setAttribute('src',v); return this; };
	});
	
	Imba.defineTag('img', function(tag){
		
		tag.prototype.__src = {name: 'src'};
		tag.prototype.src = function(v){ return this.getAttribute('src'); }
		tag.prototype.setSrc = function(v){ this.setAttribute('src',v); return this; };
	});
	
	Imba.defineTag('input', function(tag){
		// can use attr instead
		
		tag.prototype.__name = {dom: true,name: 'name'};
		tag.prototype.name = function(v){ return this.getAttribute('name'); }
		tag.prototype.setName = function(v){ this.setAttribute('name',v); return this; };
		
		tag.prototype.__type = {dom: true,name: 'type'};
		tag.prototype.type = function(v){ return this.getAttribute('type'); }
		tag.prototype.setType = function(v){ this.setAttribute('type',v); return this; };
		
		tag.prototype.__value = {dom: true,name: 'value'};
		tag.prototype.value = function(v){ return this.getAttribute('value'); }
		tag.prototype.setValue = function(v){ this.setAttribute('value',v); return this; }; // dom property - NOT attribute
		
		tag.prototype.__required = {dom: true,name: 'required'};
		tag.prototype.required = function(v){ return this.getAttribute('required'); }
		tag.prototype.setRequired = function(v){ this.setAttribute('required',v); return this; };
		
		tag.prototype.__disabled = {dom: true,name: 'disabled'};
		tag.prototype.disabled = function(v){ return this.getAttribute('disabled'); }
		tag.prototype.setDisabled = function(v){ this.setAttribute('disabled',v); return this; };
		
		tag.prototype.__placeholder = {dom: true,name: 'placeholder'};
		tag.prototype.placeholder = function(v){ return this.getAttribute('placeholder'); }
		tag.prototype.setPlaceholder = function(v){ this.setAttribute('placeholder',v); return this; };
		
		
		tag.prototype.__autofocus = {name: 'autofocus'};
		tag.prototype.autofocus = function(v){ return this.getAttribute('autofocus'); }
		tag.prototype.setAutofocus = function(v){ this.setAttribute('autofocus',v); return this; };
		
		tag.prototype.value = function (){
			return this.dom().value;
		};
		
		tag.prototype.setValue = function (v){
			if (v != this.dom().value) { this.dom().value = v };
			return this;
		};
		
		tag.prototype.setPlaceholder = function (v){
			if (v != this.dom().placeholder) { this.dom().placeholder = v };
			return this;
		};
		
		tag.prototype.checked = function (){
			return this.dom().checked;
		};
		
		tag.prototype.setChecked = function (bool){
			if (bool != this.dom().checked) { this.dom().checked = bool };
			return this;
		};
	});
	
	Imba.defineTag('ins');
	Imba.defineTag('kbd');
	Imba.defineTag('keygen');
	Imba.defineTag('label');
	Imba.defineTag('legend');
	Imba.defineTag('li');
	
	Imba.defineTag('link', function(tag){
		
		tag.prototype.__rel = {dom: true,name: 'rel'};
		tag.prototype.rel = function(v){ return this.getAttribute('rel'); }
		tag.prototype.setRel = function(v){ this.setAttribute('rel',v); return this; };
		
		tag.prototype.__type = {dom: true,name: 'type'};
		tag.prototype.type = function(v){ return this.getAttribute('type'); }
		tag.prototype.setType = function(v){ this.setAttribute('type',v); return this; };
		
		tag.prototype.__href = {dom: true,name: 'href'};
		tag.prototype.href = function(v){ return this.getAttribute('href'); }
		tag.prototype.setHref = function(v){ this.setAttribute('href',v); return this; };
		
		tag.prototype.__media = {dom: true,name: 'media'};
		tag.prototype.media = function(v){ return this.getAttribute('media'); }
		tag.prototype.setMedia = function(v){ this.setAttribute('media',v); return this; };
	});
	
	Imba.defineTag('main');
	Imba.defineTag('map');
	Imba.defineTag('mark');
	Imba.defineTag('menu');
	Imba.defineTag('menuitem');
	
	Imba.defineTag('meta', function(tag){
		
		tag.prototype.__name = {dom: true,name: 'name'};
		tag.prototype.name = function(v){ return this.getAttribute('name'); }
		tag.prototype.setName = function(v){ this.setAttribute('name',v); return this; };
		
		tag.prototype.__content = {dom: true,name: 'content'};
		tag.prototype.content = function(v){ return this.getAttribute('content'); }
		tag.prototype.setContent = function(v){ this.setAttribute('content',v); return this; };
		
		tag.prototype.__charset = {dom: true,name: 'charset'};
		tag.prototype.charset = function(v){ return this.getAttribute('charset'); }
		tag.prototype.setCharset = function(v){ this.setAttribute('charset',v); return this; };
	});
	
	Imba.defineTag('meter');
	Imba.defineTag('nav');
	Imba.defineTag('noscript');
	Imba.defineTag('object');
	Imba.defineTag('ol');
	Imba.defineTag('optgroup');
	
	Imba.defineTag('option', function(tag){
		
		tag.prototype.__value = {dom: true,name: 'value'};
		tag.prototype.value = function(v){ return this.getAttribute('value'); }
		tag.prototype.setValue = function(v){ this.setAttribute('value',v); return this; };
	});
	
	Imba.defineTag('output');
	Imba.defineTag('p');
	Imba.defineTag('param');
	Imba.defineTag('pre');
	Imba.defineTag('progress');
	Imba.defineTag('q');
	Imba.defineTag('rp');
	Imba.defineTag('rt');
	Imba.defineTag('ruby');
	Imba.defineTag('s');
	Imba.defineTag('samp');
	
	Imba.defineTag('script', function(tag){
		
		tag.prototype.__src = {dom: true,name: 'src'};
		tag.prototype.src = function(v){ return this.getAttribute('src'); }
		tag.prototype.setSrc = function(v){ this.setAttribute('src',v); return this; };
		
		tag.prototype.__type = {dom: true,name: 'type'};
		tag.prototype.type = function(v){ return this.getAttribute('type'); }
		tag.prototype.setType = function(v){ this.setAttribute('type',v); return this; };
	});
	
	Imba.defineTag('section');
	
	Imba.defineTag('select', function(tag){
		
		tag.prototype.__multiple = {dom: true,name: 'multiple'};
		tag.prototype.multiple = function(v){ return this.getAttribute('multiple'); }
		tag.prototype.setMultiple = function(v){ this.setAttribute('multiple',v); return this; };
		
		tag.prototype.value = function (){
			return this.dom().value;
		};
		
		tag.prototype.setValue = function (v){
			if (v != this.dom().value) { this.dom().value = v };
			return this;
		};
	});
	
	
	Imba.defineTag('small');
	Imba.defineTag('source');
	Imba.defineTag('span');
	Imba.defineTag('strong');
	Imba.defineTag('style');
	Imba.defineTag('sub');
	Imba.defineTag('summary');
	Imba.defineTag('sup');
	Imba.defineTag('table');
	Imba.defineTag('tbody');
	Imba.defineTag('td');
	
	Imba.defineTag('textarea', function(tag){
		
		tag.prototype.__name = {dom: true,name: 'name'};
		tag.prototype.name = function(v){ return this.getAttribute('name'); }
		tag.prototype.setName = function(v){ this.setAttribute('name',v); return this; };
		
		tag.prototype.__disabled = {dom: true,name: 'disabled'};
		tag.prototype.disabled = function(v){ return this.getAttribute('disabled'); }
		tag.prototype.setDisabled = function(v){ this.setAttribute('disabled',v); return this; };
		
		tag.prototype.__required = {dom: true,name: 'required'};
		tag.prototype.required = function(v){ return this.getAttribute('required'); }
		tag.prototype.setRequired = function(v){ this.setAttribute('required',v); return this; };
		
		tag.prototype.__placeholder = {dom: true,name: 'placeholder'};
		tag.prototype.placeholder = function(v){ return this.getAttribute('placeholder'); }
		tag.prototype.setPlaceholder = function(v){ this.setAttribute('placeholder',v); return this; };
		
		tag.prototype.__value = {dom: true,name: 'value'};
		tag.prototype.value = function(v){ return this.getAttribute('value'); }
		tag.prototype.setValue = function(v){ this.setAttribute('value',v); return this; };
		
		tag.prototype.__rows = {dom: true,name: 'rows'};
		tag.prototype.rows = function(v){ return this.getAttribute('rows'); }
		tag.prototype.setRows = function(v){ this.setAttribute('rows',v); return this; };
		
		tag.prototype.__cols = {dom: true,name: 'cols'};
		tag.prototype.cols = function(v){ return this.getAttribute('cols'); }
		tag.prototype.setCols = function(v){ this.setAttribute('cols',v); return this; };
		
		
		tag.prototype.__autofocus = {name: 'autofocus'};
		tag.prototype.autofocus = function(v){ return this.getAttribute('autofocus'); }
		tag.prototype.setAutofocus = function(v){ this.setAttribute('autofocus',v); return this; };
		
		tag.prototype.value = function (){
			return this.dom().value;
		};
		
		tag.prototype.setValue = function (v){
			if (v != this.dom().value) { this.dom().value = v };
			return this;
		};
		
		tag.prototype.setPlaceholder = function (v){
			if (v != this.dom().placeholder) { this.dom().placeholder = v };
			return this;
		};
	});
	
	Imba.defineTag('tfoot');
	Imba.defineTag('th');
	Imba.defineTag('thead');
	Imba.defineTag('time');
	Imba.defineTag('title');
	Imba.defineTag('tr');
	Imba.defineTag('track');
	Imba.defineTag('u');
	Imba.defineTag('ul');
	Imba.defineTag('video');
	return Imba.defineTag('wbr');

})()
},{}],6:[function(require,module,exports){
(function(){
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	
	var ElementTag = require('./tag').ElementTag;
	
	Imba.document = function (){
		return window.document;
	};
	
	Imba.defineTag('htmlelement','element', function(tag){
		tag.inherit = function (child){
			child.prototype._empty = true;
			child._protoDom = null;
			
			if (this._nodeType) {
				child._nodeType = this._nodeType;
				
				var className = "_" + child._name.replace(/_/g,'-');
				return child._classes = this._classes.concat(className);
			} else {
				child._nodeType = child._name;
				return child._classes = [];
			};
		};
		
		tag.buildNode = function (){
			var dom = Imba.document().createElement(this._nodeType);
			var cls = this._classes.join(" ");
			if (cls) { dom.className = cls };
			return dom;
		};
		
		tag.createNode = function (){
			var proto = (this._protoDom || (this._protoDom = this.buildNode()));
			return proto.cloneNode(false);
		};
		
		tag.dom = function (){
			return this._protoDom || (this._protoDom = this.buildNode());
		};
		
		tag.prototype.setChildren = function (nodes){
			this._empty ? (this.append(nodes)) : (this.empty().append(nodes));
			this._children = null;
			return this;
		};
		
		tag.prototype.text = function (v){
			if (arguments.length) { return ((this.setText(v),v),this) };
			return this._dom.textContent;
		};
		
		tag.prototype.setText = function (txt){
			this._empty = false;
			this._dom.textContent = txt == null ? (txt = "") : (txt);
			return this;
		};
		
		tag.prototype.empty = function (){
			while (this._dom.firstChild){
				this._dom.removeChild(this._dom.firstChild);
			};
			this._children = null;
			this._empty = true;
			return this;
		};
		
		tag.prototype.remove = function (node){
			var par = this.dom();
			var el = node && node.dom();
			if (el && el.parentNode == par) { par.removeChild(el) };
			return this;
		};
		
		tag.prototype.parent = function (){
			return tag$wrap(this.dom().parentNode);
		};
		
		tag.prototype.log = function (){
			var $0 = arguments, i = $0.length;
			var args = new Array(i>0 ? i : 0);
			while(i>0) args[i-1] = $0[--i];
			args.unshift(console);
			Function.prototype.call.apply(console.log,args);
			return this;
		};
		
		tag.prototype.emit = function (name,pars){
			if(!pars||pars.constructor !== Object) pars = {};
			var data = pars.data !== undefined ? pars.data : null;
			var bubble = pars.bubble !== undefined ? pars.bubble : true;
			Imba.Events.trigger(name,this,{data: data,bubble: bubble});
			return this;
		};
		
		tag.prototype.css = function (key,val){
			if (key instanceof Object) {
				for (var i = 0, keys = Object.keys(key), l = keys.length; i < l; i++){
					this.css(keys[i],key[keys[i]]);
				};
			} else if (val == null) {
				this.dom().style.removeProperty(key);
			} else if (val == undefined) {
				return this.dom().style[key];
			} else {
				if ((typeof val=='number'||val instanceof Number) && key.match(/width|height|left|right|top|bottom/)) {
					val = val + "px";
				};
				this.dom().style[key] = val;
			};
			return this;
		};
		
		tag.prototype.dataset = function (key,val){
			if (key instanceof Object) {
				for (var i = 0, keys = Object.keys(key), l = keys.length; i < l; i++){
					this.dataset(keys[i],key[keys[i]]);
				};
				return this;
			};
			
			if (arguments.length == 2) {
				this.setAttribute(("data-" + key),val);
				return this;
			};
			
			if (key) {
				return this.getAttribute(("data-" + key));
			};
			
			var dataset = this.dom().dataset;
			
			if (!dataset) {
				dataset = {};
				for (var i1 = 0, ary = iter$(this.dom().attributes), len = ary.length, atr; i1 < len; i1++) {
					atr = ary[i1];
					if (atr.name.substr(0,5) == 'data-') {
						dataset[Imba.toCamelCase(atr.name.slice(5))] = atr.value;
					};
				};
			};
			
			return dataset;
		};
		
		// selectors / traversal
		tag.prototype.find = function (sel){
			return new Imba.Selector(sel,this);
		};
		
		tag.prototype.first = function (sel){
			return sel ? (this.find(sel).first()) : (tag$wrap(this.dom().firstElementChild));
		};
		
		tag.prototype.last = function (sel){
			return sel ? (this.find(sel).last()) : (tag$wrap(this.dom().lastElementChild));
		};
		
		tag.prototype.child = function (i){
			return tag$wrap(this.dom().children[i || 0]);
		};
		
		tag.prototype.children = function (sel){
			var nodes = new Imba.Selector(null,this,this._dom.children);
			return sel ? (nodes.filter(sel)) : (nodes);
		};
		
		tag.prototype.orphanize = function (){
			var par;
			if (par = this.dom().parentNode) { par.removeChild(this._dom) };
			return this;
		};
		
		tag.prototype.matches = function (sel){
			var fn;
			if (sel instanceof Function) {
				return sel(this);
			};
			
			if (sel.query) { sel = sel.query() };
			if (fn = (this._dom.webkitMatchesSelector || this._dom.matches)) { return fn.call(this._dom,sel) };
			// TODO support other browsers etc?
		};
		
		tag.prototype.closest = function (sel){
			if (!sel) { return this.parent() }; // should return self?!
			var node = this;
			if (sel.query) { sel = sel.query() };
			
			while (node){
				if (node.matches(sel)) { return node };
				node = node.parent();
			};
			return null;
		};
		
		tag.prototype.path = function (sel){
			var node = this;
			var nodes = [];
			if (sel && sel.query) { sel = sel.query() };
			
			while (node){
				if (!sel || node.matches(sel)) { nodes.push(node) };
				node = node.parent();
			};
			return nodes;
		};
		
		tag.prototype.parents = function (sel){
			var par = this.parent();
			return par ? (par.path(sel)) : ([]);
		};
		
		tag.prototype.up = function (sel){
			if (!sel) { return this.parent() };
			return this.parent() && this.parent().closest(sel);
		};
		
		tag.prototype.siblings = function (sel){
			var par, self = this;
			if (!(par = this.parent())) { return [] }; // FIXME
			var ary = this.dom().parentNode.children;
			var nodes = new Imba.Selector(null,this,ary);
			return nodes.filter(function(n) { return n != self && (!sel || n.matches(sel)); });
		};
		
		tag.prototype.next = function (sel){
			if (sel) {
				var el = this;
				while (el = el.next()){
					if (el.matches(sel)) { return el };
				};
				return null;
			};
			return tag$wrap(this.dom().nextElementSibling);
		};
		
		tag.prototype.prev = function (sel){
			if (sel) {
				var el = this;
				while (el = el.prev()){
					if (el.matches(sel)) { return el };
				};
				return null;
			};
			return tag$wrap(this.dom().previousElementSibling);
		};
		
		tag.prototype.contains = function (node){
			return this.dom().contains(node && node._dom || node);
		};
		
		tag.prototype.index = function (){
			var i = 0;
			var el = this.dom();
			while (el.previousSibling){
				el = el.previousSibling;
				i++;
			};
			return i;
		};
		
		
		tag.prototype.insert = function (node,pars){
			if(!pars||pars.constructor !== Object) pars = {};
			var before = pars.before !== undefined ? pars.before : null;
			var after = pars.after !== undefined ? pars.after : null;
			if (after) { before = after.next() };
			if (node instanceof Array) {
				node = (t$('fragment').setContent(node,0).end());
			};
			if (before) {
				this.dom().insertBefore(node.dom(),before.dom());
			} else {
				this.append(node);
			};
			return this;
		};
		
		tag.prototype.focus = function (){
			this.dom().focus();
			return this;
		};
		
		tag.prototype.blur = function (){
			this.dom().blur();
			return this;
		};
		
		tag.prototype.template = function (){
			return null;
		};
		
		tag.prototype.prepend = function (item){
			var first = this._dom.childNodes[0];
			first ? (this.insertBefore(item,first)) : (this.appendChild(item));
			return this;
		};
		
		tag.prototype.append = function (item){
			// possible to append blank
			// possible to simplify on server?
			if (!item) { return this };
			
			if (item instanceof Array) {
				for (var i = 0, ary = iter$(item), len = ary.length, member; i < len; i++) {
					member = ary[i];
					member && this.append(member);
				};
			} else if ((typeof item=='string'||item instanceof String) || (typeof item=='number'||item instanceof Number)) {
				var node = Imba.document().createTextNode(item);
				this._dom.appendChild(node);
				if (this._empty) { this._empty = false };
			} else {
				this._dom.appendChild(item._dom || item);
				if (this._empty) { this._empty = false };
			};
			
			return this;
		};
		
		
		tag.prototype.insertBefore = function (node,rel){
			if ((typeof node=='string'||node instanceof String)) { node = Imba.document().createTextNode(node) };
			if (node && rel) { this.dom().insertBefore((node._dom || node),(rel._dom || rel)) };
			return this;
		};
		
		tag.prototype.appendChild = function (node){
			if ((typeof node=='string'||node instanceof String)) { node = Imba.document().createTextNode(node) };
			if (node) { this.dom().appendChild(node._dom || node) };
			return this;
		};
		
		tag.prototype.removeChild = function (node){
			if (node) { this.dom().removeChild(node._dom || node) };
			return this;
		};
		
		tag.prototype.toString = function (){
			return this._dom.toString(); // really?
		};
		
		tag.prototype.classes = function (){
			return this._dom.classList;
		};
		
		tag.prototype.flags = function (){
			return this._dom.classList;
		};
		
		tag.prototype.flag = function (ref,toggle){
			// it is most natural to treat a second undefined argument as a no-switch
			// so we need to check the arguments-length
			if (arguments.length == 2 && !toggle) {
				this._dom.classList.remove(ref);
			} else {
				this._dom.classList.add(ref);
			};
			return this;
		};
		
		tag.prototype.unflag = function (ref){
			this._dom.classList.remove(ref);
			return this;
		};
		
		tag.prototype.toggleFlag = function (ref){
			this._dom.classList.toggle(ref);
			return this;
		};
		
		tag.prototype.hasFlag = function (ref){
			return this._dom.classList.contains(ref);
		};
	});
	
	return Imba.defineTag('svgelement','htmlelement');

})()
},{"./tag":12}],7:[function(require,module,exports){
(function(){
	if (!document.documentElement.classList) {
		Imba.extendTag('htmlelement', function(tag){
			
			tag.prototype.hasFlag = function (ref){
				return new RegExp('(^|\\s)' + ref + '(\\s|$)').test(this._dom.className);
			};
			
			tag.prototype.addFlag = function (ref){
				if (this.hasFlag(ref)) { return this };
				this._dom.className += (this._dom.className ? (' ') : ('')) + ref;
				return this;
			};
			
			tag.prototype.unflag = function (ref){
				if (!this.hasFlag(ref)) { return this };
				var regex = new RegExp('(^|\\s)*' + ref + '(\\s|$)*','g');
				this._dom.className = this._dom.className.replace(regex,'');
				return this;
			};
			
			tag.prototype.toggleFlag = function (ref){
				return this.hasFlag(ref) ? (this.unflag(ref)) : (this.flag(ref));
			};
			
			tag.prototype.flag = function (ref,bool){
				if (arguments.length == 2 && bool == false) {
					return this.unflag(ref);
				};
				return this.addFlag(ref);
			};
		});
		
		return true;
	};

})()
},{}],8:[function(require,module,exports){
(function (global){
(function(){
	function idx$(a,b){
		return (b && b.indexOf) ? b.indexOf(a) : [].indexOf.call(a,b);
	};
	
	
	var raf; // very simple raf polyfill
	raf || (raf = global.requestAnimationFrame);
	raf || (raf = global.webkitRequestAnimationFrame);
	raf || (raf = global.mozRequestAnimationFrame);
	raf || (raf = function(blk) { return setTimeout(blk,1000 / 60); });
	
	// add methods to element
	Imba.extendTag('element', function(tag){
		
		tag.prototype.scheduler = function (){
			return this._scheduler == null ? (this._scheduler = new Scheduler(this)) : (this._scheduler);
		};
		
		tag.prototype.schedule = function (o){
			if(o === undefined) o = {};
			this.scheduler().configure(o).activate();
			return this;
		};
		
		tag.prototype.unschedule = function (){
			if (this._scheduler) { this.scheduler().deactivate() };
			return this;
		};
		
		tag.prototype.tick = function (){
			this.render();
			return this;
		};
	});
	
	function Scheduler(target){
		var self = this;
		self._target = target;
		self._marked = false;
		self._active = false;
		self._marker = function() { return self.mark(); };
		self._ticker = function(e) { return self.tick(e); };
		
		self._events = true;
		self._fps = 1;
		
		self._dt = 0;
		self._timestamp = 0;
		self._ticks = 0;
		self._flushes = 0;
		self;
	};
	
	exports.Scheduler = Scheduler; // export class 
	Scheduler.prototype.active = function (){
		return this._active;
	};
	
	Scheduler.prototype.dt = function (){
		return this._dt;
	};
	
	Scheduler.prototype.configure = function (o){
		if (o.events != null) { this._events = o.events };
		if (o.fps != null) { this._fps = o.fps };
		return this;
	};
	
	Scheduler.prototype.reschedule = function (){
		raf(this._ticker);
		// requestAnimationFrame(@ticker)
		return this;
	};
	
	Scheduler.prototype.mark = function (){
		this._marked = true;
		return this;
	};
	
	Scheduler.prototype.flush = function (){
		this._marked = false;
		this._flushes++;
		this._target.tick();
		return this;
	};
	
	// WARN this expects raf to run at 60 fps
	Scheduler.prototype.tick = function (d){
		this._ticks++;
		this._dt = d;
		
		var fps = this._fps;
		
		if (fps == 60) {
			this._marked = true;
		} else if (fps == 30) {
			if (this._ticks % 2) { this._marked = true };
		} else if (fps) {
			// if it is less round - we trigger based
			// on date, for consistent rendering.
			// ie, if you want to render every second
			// it is important that no two renders
			// happen during the same second (according to Date)
			var period = ((60 / fps) / 60) * 1000;
			var beat = Math.floor(Date.now() / period);
			
			if (this._beat != beat) {
				this._beat = beat;
				this._marked = true;
			};
		};
		
		if (this._marked) this.flush();
		if (this._active) this.reschedule();
		return this;
	};
	
	Scheduler.prototype.activate = function (){
		if (!this._active) {
			this._active = true;
			
			// override target#commit while this is active
			this._commit = this._target.commit;
			this._target.commit = function() { return this; };
			if (this._events) { Imba.listen(Imba,'event',this,'onevent') };
			this.tick(0); // start ticking
		};
		return this;
	};
	
	Scheduler.prototype.deactivate = function (){
		if (this._active) {
			this._active = false;
			this._target.commit = this._commit;
			Imba.unlisten(Imba,'event',this);
		};
		return this;
	};
	
	Scheduler.prototype.track = function (){
		return this._marker;
	};
	
	Scheduler.prototype.onevent = function (e){
		var $1;
		if (this._events instanceof Function) {
			if (this._events(e)) this.mark();
		} else if (this._events instanceof Array) {
			if (idx$(($1 = e) && $1.type  &&  $1.type(),this._events) >= 0) this.mark();
		} else if (this._events) {
			if (e._responder) this.mark();
		};
		return this;
	};
	return Scheduler;

})()
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
(function(){
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	var ImbaTag = Imba.TAGS.element;
	
	function removeNested(root,node,caret){
		// if node/nodes isa String
		// 	we need to use the caret to remove elements
		// 	for now we will simply not support this
		if (node instanceof ImbaTag) {
			root.removeChild(node);
		} else if (node instanceof Array) {
			for (var i = 0, ary = iter$(node), len = ary.length; i < len; i++) {
				removeNested(root,ary[i],caret);
			};
		} else {
			// what if this is not null?!?!?
			// take a chance and remove a text-elementng
			var next = caret ? (caret.nextSibling) : (root._dom.firstChild);
			if ((next instanceof Text) && next.textContent == node) {
				root.removeChild(next);
			} else {
				throw 'cannot remove string';
			};
		};
		
		return caret;
	};
	
	function replaceNestedWithString(root,new$,old,caret){
		return this;
	};
	
	function appendNested(root,node){
		if (node instanceof ImbaTag) {
			root.appendChild(node);
		} else if (node instanceof Array) {
			for (var i = 0, ary = iter$(node), len = ary.length; i < len; i++) {
				appendNested(root,ary[i]);
			};
		} else if (node != null && node !== false) {
			root.appendChild(Imba.document().createTextNode(node));
		};
		
		return;
	};
	
	function setOnlyChild(root,node){
		return;
		
		//	if nodes isa Array
		//		if nodes:static
		//			reconcileNested(self,nodes,@children,null,null,0)
		//		else
		//			reconcileCollection(self,nodes,@children,null)
		//		# reconcile nested
		//		# reconcileNested(self,nodes,@children,null,null,0)
		//	elif nodes isa ImbaTag
		//		empty
		//		appendChild(nodes)
		//	else
		//		text = nodes
	};
	
	// insert nodes before a certain node
	// does not need to return any tail, as before
	// will still be correct there
	// before must be an actual domnode
	function insertNestedBefore(root,node,before){
		if (node instanceof ImbaTag) {
			root.insertBefore(node,before);
		} else if (node instanceof Array) {
			for (var i = 0, ary = iter$(node), len = ary.length; i < len; i++) {
				insertNestedBefore(root,ary[i],before);
			};
		} else if (node != null && node !== false) {
			root.insertBefore(Imba.document().createTextNode(node),before);
		};
		
		return before;
	};
	
	// after must be an actual domnode
	function insertNestedAfter(root,node,after){
		var before = after ? (after.nextSibling) : (root._dom.firstChild);
		
		if (before) {
			insertNestedBefore(root,node,before);
			return before.previousSibling;
		} else {
			appendNested(root,node);
			return root._dom.lastChild;
		};
	};
	
	function reconcileCollectionChanges(root,new$,old,caret){
		
		var newLen = new$.length;
		var oldLen = old.length;
		var lastNew = new$[newLen - 1];
		
		// This re-order algorithm is based on the following principle:
		// 
		// We build a "chain" which shows which items are already sorted.
		// If we're going from [1, 2, 3] -> [2, 1, 3], the tree looks like:
		//
		// 	3 ->  0 (idx)
		// 	2 -> -1 (idx)
		// 	1 -> -1 (idx)
		//
		// This tells us that we have two chains of ordered items:
		// 
		// 	(1, 3) and (2)
		// 
		// The optimal re-ordering then becomes two keep the longest chain intact,
		// and move all the other items.
		
		var newPosition = [];
		
		// The tree/graph itself
		var prevChain = [];
		// The length of the chain
		var lengthChain = [];
		
		// Keep track of the longest chain
		var maxChainLength = 0;
		var maxChainEnd = 0;
		
		for (var idx = 0, ary = iter$(old), len = ary.length, node; idx < len; idx++) {
			node = ary[idx];
			var newPos = new$.indexOf(node);
			newPosition.push(newPos);
			
			if (newPos == -1) {
				root.removeChild(node);
				prevChain.push(-1);
				lengthChain.push(-1);
				continue;
			};
			
			var prevIdx = newPosition.length - 2;
			
			// Build the chain:
			while (prevIdx >= 0){
				if (newPosition[prevIdx] == -1) {
					prevIdx--;
				} else if (newPos > newPosition[prevIdx]) {
					// Yay, we're bigger than the previous!
					break;
				} else {
					// Nope, let's walk back the chain
					prevIdx = prevChain[prevIdx];
				};
			};
			
			prevChain.push(prevIdx);
			
			var currLength = (prevIdx == -1) ? (0) : (lengthChain[prevIdx] + 1);
			
			if (currLength > maxChainLength) {
				maxChainLength = currLength;
				maxChainEnd = idx;
			};
			
			lengthChain.push(currLength);
		};
		
		var stickyNodes = [];
		
		// Now we can walk the longest chain backwards and mark them as "sticky",
		// which implies that they should not be moved
		var cursor = newPosition.length - 1;
		while (cursor >= 0){
			if (newPosition[cursor] == -1) {
				// do nothing. it was removed.
				null
			} else if (cursor == maxChainEnd) {
				stickyNodes[newPosition[cursor]] = true;
				maxChainEnd = prevChain[maxChainEnd];
			};
			
			cursor -= 1;
		};
		
		// And let's iterate forward, but only move non-sticky nodes
		for (var idx1 = 0, ary = iter$(new$), len = ary.length; idx1 < len; idx1++) {
			if (!stickyNodes[idx1]) {
				var after = new$[idx1 - 1];
				insertNestedAfter(root,ary[idx1],(after && after._dom) || caret);
			};
		};
		
		// should trust that the last item in new list is the caret
		return lastNew && lastNew._dom || caret;
	};
	
	
	// expects a flat non-sparse array of nodes in both new and old, always
	function reconcileCollection(root,new$,old,caret){
		var k = new$.length;
		var i = k;
		var last = new$[k - 1];
		
		
		if (k == old.length && new$[0] === old[0]) {
			// running through to compare
			while (i--){
				if (new$[i] !== old[i]) { break };
			};
		};
		
		if (i == -1) {
			return last && last._dom || caret;
		} else {
			return reconcileCollectionChanges(root,new$,old,caret);
		};
	};
	
	// the general reconciler that respects conditions etc
	// caret is the current node we want to insert things after
	function reconcileNested(root,new$,old,caret){
		
		// if new == null or new === false or new === true
		// 	if new === old
		// 		return caret
		// 	if old && new != old
		// 		removeNested(root,old,caret) if old
		// 
		// 	return caret
		
		// var skipnew = new == null or new === false or new === true
		var newIsNull = new$ == null || new$ === false;
		var oldIsNull = old == null || old === false;
		
		
		if (new$ === old) {
			// remember that the caret must be an actual dom element
			// we should instead move the actual caret? - trust
			if (newIsNull) {
				return caret;
			} else if (new$ && new$._dom) {
				return new$._dom;
			} else {
				return caret ? (caret.nextSibling) : (root._dom.firstChild);
			};
		} else if (new$ instanceof Array) {
			if (old instanceof Array) {
				if (new$.static || old.static) {
					// if the static is not nested - we could get a hint from compiler
					// and just skip it
					if (new$.static == old.static) {
						for (var i = 0, ary = iter$(new$), len = ary.length; i < len; i++) {
							// this is where we could do the triple equal directly
							caret = reconcileNested(root,ary[i],old[i],caret);
						};
						return caret;
					} else {
						removeNested(root,old,caret);
					};
					
					// if they are not the same we continue through to the default
				} else {
					return reconcileCollection(root,new$,old,caret);
				};
			} else if (old instanceof ImbaTag) {
				root.removeChild(old);
			} else if (!oldIsNull) {
				// old was a string-like object?
				root.removeChild(caret ? (caret.nextSibling) : (root._dom.firstChild));
			};
			
			return insertNestedAfter(root,new$,caret);
			// remove old
		} else if (new$ instanceof ImbaTag) {
			if (!oldIsNull) { removeNested(root,old,caret) };
			insertNestedAfter(root,new$,caret);
			return new$;
		} else if (newIsNull) {
			if (!oldIsNull) { removeNested(root,old,caret) };
			return caret;
		} else {
			// if old did not exist we need to add a new directly
			var nextNode;
			// if old was array or imbatag we need to remove it and then add
			if (old instanceof Array) {
				removeNested(root,old,caret);
			} else if (old instanceof ImbaTag) {
				root.removeChild(old);
			} else if (!oldIsNull) {
				// ...
				nextNode = caret ? (caret.nextSibling) : (root._dom.firstChild);
				if ((nextNode instanceof Text) && nextNode.textContent != new$) {
					nextNode.textContent = new$;
					return nextNode;
				};
			};
			
			// now add the textnode
			return insertNestedAfter(root,new$,caret);
		};
	};
	
	
	return Imba.extendTag('htmlelement', function(tag){
		
		tag.prototype.setChildren = function (new$,typ){
			var old = this._children;
			// var isArray = nodes isa Array
			if (new$ === old) {
				return this;
			};
			
			if (!old) {
				this.empty();
				appendNested(this,new$);
			} else if (typ == 2) {
				return this;
			} else if (typ == 1) {
				// here we _know _that it is an array with the same shape
				// every time
				var caret = null;
				for (var i = 0, ary = iter$(new$), len = ary.length; i < len; i++) {
					// prev = old[i]
					caret = reconcileNested(this,ary[i],old[i],caret);
				};
			} else if (typ == 3) {
				// this is possibly fully dynamic. It often is
				// but the old or new could be static while the other is not
				// this is not handled now
				// what if it was previously a static array? edgecase - but must work
				if (new$ instanceof ImbaTag) {
					this.empty();
					this.appendChild(new$);
				} else if (new$ instanceof Array) {
					if (old instanceof Array) {
						// is this not the same as setting staticChildren now but with the
						reconcileCollection(this,new$,old,null);
					} else {
						this.empty();
						appendNested(this,new$);
					};
				} else {
					this.setText(new$);
					return this;
				};
			} else if ((new$ instanceof Array) && (old instanceof Array)) {
				reconcileCollection(this,new$,old,null);
			} else {
				this.empty();
				appendNested(this,new$);
			};
			
			this._children = new$;
			return this;
		};
		
		
		// only ever called with array as argument
		tag.prototype.setStaticChildren = function (new$){
			var old = this._children;
			
			var caret = null;
			for (var i = 0, ary = iter$(new$), len = ary.length; i < len; i++) {
				// prev = old[i]
				caret = reconcileNested(this,ary[i],old[i],caret);
			};
			
			this._children = new$;
			return this;
		};
		
		tag.prototype.content = function (){
			return this._content || this.children().toArray();
		};
		
		tag.prototype.setText = function (text){
			if (text != this._children) {
				this._children = text;
				this.dom().textContent = text == null || text === false ? ('') : (text);
			};
			return this;
		};
	});

})()
},{}],10:[function(require,module,exports){
(function(){
	// externs;
	
	if (typeof window !== 'undefined') {
		global = window;
	};
	
	Imba = {
		VERSION: '0.13.8'
	};
	
	var reg = /-./g;
	
	
	Imba.subclass = function (obj,sup){
		;
		for (var k in sup){
			if (sup.hasOwnProperty(k)) { obj[k] = sup[k] };
		};
		
		obj.prototype = Object.create(sup.prototype);
		obj.__super__ = obj.prototype.__super__ = sup.prototype;
		obj.prototype.initialize = obj.prototype.constructor = obj;
		return obj;
	};
	
	Imba.iterable = function (o){
		return o ? ((o.toArray ? (o.toArray()) : (o))) : ([]);
	};
	
	Imba.await = function (o){
		if (this.a() instanceof Array) {
			return Promise.all(this.a());
		} else if (this.a() && this.a().then) {
			return this.a();
		} else {
			return Promise.resolve(this.a());
		};
	};
	
	Imba.toCamelCase = function (str){
		return str.replace(reg,function(m) { return m.charAt(1).toUpperCase(); });
	};
	
	Imba.indexOf = function (a,b){
		return (b && b.indexOf) ? (b.indexOf(a)) : ([].indexOf.call(a,b));
	};
	
	// trackable timeout
	Imba.setTimeout = function (delay,block){
		return setTimeout(function() {
			block();
			return Imba.emit(Imba,'timeout',[block]);
		},delay);
	};
	
	// trackable interval
	Imba.setInterval = function (interval,block){
		return setInterval(function() {
			block();
			return Imba.emit(Imba,'interval',[block]);
		},interval);
	};
	
	Imba.clearInterval = function (interval){
		return clearInterval(interval);
	};
	
	return Imba.clearTimeout = function (timeout){
		return clearTimeout(timeout);
	};

})()
},{}],11:[function(require,module,exports){
(function(){
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	
	Imba.Selector = function Selector(sel,scope,nodes){
		
		this._query = sel instanceof Imba.Selector ? (sel.query()) : (sel);
		this._context = scope;
		
		if (nodes) {
			for (var i = 0, ary = iter$(nodes), len = ary.length, res = []; i < len; i++) {
				res.push(tag$wrap(ary[i]));
			};
			this._nodes = res;
		};
		
		this._lazy = !nodes;
		return this;
	};
	
	
	Imba.Selector.prototype.__query = {name: 'query'};
	Imba.Selector.prototype.query = function(v){ return this._query; }
	Imba.Selector.prototype.setQuery = function(v){ this._query = v; return this; };
	
	Imba.Selector.prototype.reload = function (){
		this._nodes = null;
		return this;
	};
	
	Imba.Selector.prototype.scope = function (){
		var ctx;
		if (this._scope) { return this._scope };
		if (!(ctx = this._context)) { return Imba.document() };
		return this._scope = ctx.toScope ? (ctx.toScope()) : (ctx);
	};
	
	Imba.Selector.prototype.first = function (){
		if (this._lazy) { return tag$wrap(this._first || (this._first = this.scope().querySelector(this.query()))) } else {
			return this.nodes()[0];
		};
	};
	
	Imba.Selector.prototype.last = function (){
		return this.nodes()[this._nodes.length - 1];
	};
	
	Imba.Selector.prototype.nodes = function (){
		if (this._nodes) { return this._nodes };
		var items = this.scope().querySelectorAll(this.query());
		for (var i = 0, ary = iter$(items), len = ary.length, res = []; i < len; i++) {
			res.push(tag$wrap(ary[i]));
		};
		this._nodes = res;
		this._lazy = false;
		return this._nodes;
	};
	
	Imba.Selector.prototype.count = function (){
		return this.nodes().length;
	};
	Imba.Selector.prototype.len = function (){
		return this.nodes().length;
	};
	Imba.Selector.prototype.any = function (){
		return this.count();
	};
	
	Imba.Selector.prototype.at = function (idx){
		return this.nodes()[idx];
	};
	
	Imba.Selector.prototype.forEach = function (block){
		this.nodes().forEach(block);
		return this;
	};
	
	Imba.Selector.prototype.map = function (block){
		return this.nodes().map(block);
	};
	
	Imba.Selector.prototype.toArray = function (){
		return this.nodes();
	};
	
	// Get the first element that matches the selector, 
	// beginning at the current element and progressing up through the DOM tree
	Imba.Selector.prototype.closest = function (sel){
		// seems strange that we alter this selector?
		this._nodes = this.map(function(node) { return node.closest(sel); });
		return this;
	};
	
	// Get the siblings of each element in the set of matched elements, 
	// optionally filtered by a selector.
	// TODO remove duplicates?
	Imba.Selector.prototype.siblings = function (sel){
		this._nodes = this.map(function(node) { return node.siblings(sel); });
		return this;
	};
	
	// Get the descendants of each element in the current set of matched 
	// elements, filtered by a selector.
	Imba.Selector.prototype.find = function (sel){
		this._nodes = this.__query__(sel.query(),this.nodes());
		return this;
	};
	
	// TODO IMPLEMENT
	// Get the children of each element in the set of matched elements, 
	// optionally filtered by a selector.
	Imba.Selector.prototype.children = function (sel){
		return true;
	};
	
	// TODO IMPLEMENT
	// Reduce the set of matched elements to those that have a descendant that
	// matches the selector or DOM element.
	Imba.Selector.prototype.has = function (){
		return true;
	};
	
	// TODO IMPLEMENT
	Imba.Selector.prototype.__union = function (){
		this.p("called Imba.Selector.__union");
		return this;
	};
	
	// TODO IMPLEMENT
	Imba.Selector.prototype.__intersect = function (){
		this.p("called Imba.Selector.__union");
		return this;
	};
	
	Imba.Selector.prototype.reject = function (blk){
		return this.filter(blk,false);
	};
	
	Imba.Selector.prototype.filter = function (blk,bool){
		if(bool === undefined) bool = true;
		var fn = (blk instanceof Function) && blk || function(n) { return n.matches(blk); };
		var ary = this.nodes().filter(function(n) { return fn(n) == bool; });
		// if we want to return a new selector for this, we should do that for
		// others as well
		return new Imba.Selector("",this._scope,ary);
	};
	
	Imba.Selector.prototype.__query__ = function (query,contexts){
		var nodes = [];
		var i = 0;
		var l = contexts.length;
		
		while (i < l){
			nodes.push.apply(nodes,contexts[i++].querySelectorAll(query));
		};
		return nodes;
	};
	
	Imba.Selector.prototype.__matches__ = function (){
		return true;
	};
	
	// Proxies
	Imba.Selector.prototype.flag = function (flag){
		return this.forEach(function(n) { return n.flag(flag); });
	};
	
	Imba.Selector.prototype.unflag = function (flag){
		return this.forEach(function(n) { return n.unflag(flag); });
	};
	
	Imba.Selector.prototype.call = function (meth,args){
		var self = this;
		if(args === undefined) args = [];
		return self.forEach(function(n) { var $1;
		if ((self.setFn(n[($1 = meth)]),n[$1])) { return self.fn().apply(n,args) }; });
	};
	
	q$ = function(sel,scope) { return new Imba.Selector(sel,scope); };
	
	q$$ = function(sel,scope) {
		var el = (scope || Imba.document()).querySelector(sel);
		return el && tag$wrap(el) || null;
	};
	
	// extending tags with query-methods
	// must be a better way to reopen classes
	return Imba.extendTag('element', function(tag){
		tag.prototype.querySelectorAll = function (q){
			return this._dom.querySelectorAll(q);
		};
		tag.prototype.querySelector = function (q){
			return this._dom.querySelector(q);
		};
		tag.prototype.find = function (sel){
			return new Imba.Selector(sel,this);
		};
	});
	

})()
},{}],12:[function(require,module,exports){
(function(){
	function idx$(a,b){
		return (b && b.indexOf) ? b.indexOf(a) : [].indexOf.call(a,b);
	};
	
	Imba.static = function (items,nr){
		items.static = nr;
		return items;
	};
	
	function ElementTag(dom){
		this.setDom(dom);
		this;
	};
	
	exports.ElementTag = ElementTag; // export class 
	
	ElementTag.prototype.__object = {name: 'object'};
	ElementTag.prototype.object = function(v){ return this._object; }
	ElementTag.prototype.setObject = function(v){ this._object = v; return this; };
	
	ElementTag.prototype.dom = function (){
		return this._dom;
	};
	
	ElementTag.prototype.setDom = function (dom){
		dom._tag = this;
		this._dom = dom;
		return this;
	};
	
	ElementTag.prototype.setRef = function (ref){
		this.flag(this._ref = ref);
		return this;
	};
	
	ElementTag.prototype.setHandler = function (event,handler,ctx){
		var key = 'on' + event;
		
		if (handler instanceof Function) {
			this[key] = handler;
		} else if (handler instanceof Array) {
			var fn = handler.shift();
			this[key] = function(e) { return ctx[fn].apply(ctx,handler.concat(e)); };
		} else {
			this[key] = function(e) { return ctx[handler](e); };
		};
		return this;
	};
	
	ElementTag.prototype.setId = function (id){
		this.dom().id = id;
		return this;
	};
	
	ElementTag.prototype.id = function (){
		return this.dom().id;
	};
	
	ElementTag.prototype.setAttribute = function (key,new$){
		var old = this.dom().getAttribute(key);
		
		if (old == new$) {
			return new$;
		} else if (new$ != null && new$ !== false) {
			return this.dom().setAttribute(key,new$);
		} else {
			return this.dom().removeAttribute(key);
		};
	};
	
	ElementTag.prototype.removeAttribute = function (key){
		return this.dom().removeAttribute(key);
	};
	
	ElementTag.prototype.getAttribute = function (key){
		return this.dom().getAttribute(key);
	};
	
	ElementTag.prototype.setContent = function (content,typ){
		this.setChildren(content,typ);
		return this;
	};
	
	ElementTag.prototype.setChildren = function (nodes,typ){
		throw "Not implemented";
	};
	
	ElementTag.prototype.text = function (v){
		throw "Not implemented";
	};
	
	ElementTag.prototype.setText = function (txt){
		throw "Not implemented";
	};
	
	ElementTag.prototype.dataset = function (key,val){
		throw "Not implemented";
	};
	
	// bind / present
	// should deprecate / remove
	ElementTag.prototype.bind = function (obj){
		this.setObject(obj);
		return this;
	};
	
	ElementTag.prototype.render = function (){
		return this;
	};
	
	ElementTag.prototype.build = function (){
		this.render();
		return this;
	};
	
	ElementTag.prototype.commit = function (){
		this.render();
		return this;
	};
	
	ElementTag.prototype.end = function (){
		if (this._built) {
			this.commit();
		} else {
			this._built = true;
			this.build();
		};
		return this;
	};
	
	// called whenever a node has rendered itself like in <self> <div> ...
	ElementTag.prototype.synced = function (){
		return this;
	};
	
	// called when the node is awakened in the dom - either automatically
	// upon attachment to the dom-tree, or the first time imba needs the
	// tag for a domnode that has been rendered on the server
	ElementTag.prototype.awaken = function (){
		return this;
	};
	
	ElementTag.prototype.flag = function (ref,toggle){
		throw "Not implemented";
	};
	
	ElementTag.createNode = function (){
		throw "Not implemented";
	};
	
	ElementTag.prototype.initialize = ElementTag;
	
	HTML_TAGS = "a abbr address area article aside audio b base bdi bdo big blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input ins kbd keygen label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead time title tr track u ul var video wbr".split(" ");
	HTML_TAGS_UNSAFE = "article aside header section".split(" ");
	SVG_TAGS = "circle defs ellipse g line linearGradient mask path pattern polygon polyline radialGradient rect stop svg text tspan".split(" ");
	
	Imba.TAGS = {
		element: ElementTag
	};
	
	Imba.SINGLETONS = {};
	IMBA_TAGS = Imba.TAGS;
	
	function extender(obj,sup){
		for (var i = 0, keys = Object.keys(sup), l = keys.length; i < l; i++){
			obj[($1 = keys[i])] == null ? (obj[$1] = sup[keys[i]]) : (obj[$1]);
		};
		
		obj.prototype = Object.create(sup.prototype);
		obj.__super__ = obj.prototype.__super__ = sup.prototype;
		obj.prototype.initialize = obj.prototype.constructor = obj;
		if (sup.inherit) { sup.inherit(obj) };
		return obj;
	};
	
	Imba.defineTag = function (name,supr,body){
		if(body==undefined && typeof supr == 'function') body = supr,supr = '';
		if(supr==undefined) supr = '';
		supr || (supr = (idx$(name,HTML_TAGS) >= 0) ? ('htmlelement') : ('div'));
		
		var superklass = Imba.TAGS[supr];
		
		var fname = name == 'var' ? ('vartag') : (name);
		// should drop this in production / optimized mode, but for debug
		// we create a constructor with a recognizeable name
		var klass = new Function(("return function " + fname.replace(/[\s\-\:]/g,'_') + "(dom)\{ this.setDom(dom); \}"))();
		klass._name = name;
		
		extender(klass,superklass);
		
		Imba.TAGS[name] = klass;
		
		if (body) { body.call(klass,klass,klass.prototype) };
		return klass;
	};
	
	Imba.defineSingletonTag = function (id,supr,body){
		if(body==undefined && typeof supr == 'function') body = supr,supr = '';
		if(supr==undefined) supr = '';
		var superklass = Imba.TAGS[supr || 'div'];
		
		// should drop this in production / optimized mode, but for debug
		// we create a constructor with a recognizeable name
		var klass = new Function(("return function " + id.replace(/[\s\-\:]/g,'_') + "(dom)\{ this.setDom(dom); \}"))();
		klass._name = null;
		
		extender(klass,superklass);
		
		Imba.SINGLETONS[id] = klass;
		
		if (body) { body.call(klass,klass,klass.prototype) };
		return klass;
	};
	
	Imba.extendTag = function (name,body){
		var klass = ((typeof name=='string'||name instanceof String) ? (Imba.TAGS[name]) : (name));
		if (body) { body && body.call(klass,klass,klass.prototype) };
		return klass;
	};
	
	Imba.tag = function (name){
		var typ = Imba.TAGS[name];
		if (!typ) { throw new Error(("tag " + name + " is not defined")) };
		return new typ(typ.createNode());
	};
	
	Imba.tagWithId = function (name,id){
		var typ = Imba.TAGS[name];
		if (!typ) { throw new Error(("tag " + name + " is not defined")) };
		var dom = typ.createNode();
		dom.id = id;
		return new typ(dom);
	};
	
	// TODO: Can we move these out and into dom.imba in a clean way?
	// These methods depends on Imba.document.getElementById
	
	Imba.getTagSingleton = function (id){
		var klass;
		var dom,node;
		
		if (klass = Imba.SINGLETONS[id]) {
			if (klass && klass.Instance) { return klass.Instance };
			
			// no instance - check for element
			if (dom = Imba.document().getElementById(id)) {
				// we have a live instance - when finding it through a selector we should awake it, no?
				// console.log('creating the singleton from existing node in dom?',id,type)
				node = klass.Instance = new klass(dom);
				node.awaken(dom); // should only awaken
				return node;
			};
			
			dom = klass.createNode();
			dom.id = id;
			node = klass.Instance = new klass(dom);
			node.end().awaken(dom);
			return node;
		} else if (dom = Imba.document().getElementById(id)) {
			return Imba.getTagForDom(dom);
		};
	};
	
	var svgSupport = typeof SVGElement !== 'undefined';
	
	Imba.getTagForDom = function (dom){
		var m;
		if (!dom) { return null };
		if (dom._dom) { return dom }; // could use inheritance instead
		if (dom._tag) { return dom._tag };
		if (!dom.nodeName) { return null };
		
		var ns = null;
		var id = dom.id;
		var type = dom.nodeName.toLowerCase();
		var cls = dom.className;
		
		if (id && Imba.SINGLETONS[id]) {
			// FIXME control that it is the same singleton?
			// might collide -- not good?
			return Imba.getTagSingleton(id);
		};
		// look for id - singleton
		
		// need better test here
		if (svgSupport && (dom instanceof SVGElement)) {
			ns = "svg";
			cls = dom.className.baseVal;
		};
		
		if (cls) {
			// there can be several matches here - should choose the last
			// should fall back to less specific later? - otherwise things may fail
			// TODO rework this
			if (m = cls.match(/\b_([a-z\-]+)\b(?!\s*_[a-z\-]+)/)) {
				type = m[1].replace(/-/g,'_');
			};
			
			if (m = cls.match(/\b([a-z]+)_\b/)) {
				ns = m[1];
			};
		};
		
		var spawner = Imba.TAGS[type];
		return spawner ? (new spawner(dom).awaken(dom)) : (null);
	};
	
	t$ = Imba.tag;
	tc$ = Imba.tagWithFlags;
	ti$ = Imba.tagWithId;
	tic$ = Imba.tagWithIdAndFlags;
	id$ = Imba.getTagSingleton;
	return tag$wrap = Imba.getTagForDom;
	

})()
},{}]},{},[1])(1)
});