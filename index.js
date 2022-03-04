"use strict";
/**
 * cory.foundation :: Translink
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var hyperswarm_1 = __importDefault(require("hyperswarm"));
var events_1 = __importDefault(require("events"));
var bluebird_1 = __importDefault(require("bluebird"));
var msgpack5_1 = __importDefault(require("msgpack5"));
var RequestError = /** @class */ (function () {
    function RequestError(args) {
        this.message = args.message;
        this.code = args.code;
    }
    return RequestError;
}());
var Translink = /** @class */ (function () {
    function Translink(opts) {
        var _this = this;
        var _a;
        this.client = null;
        this.net = null;
        this.nodeID = null;
        this.heartbeatTimer = null;
        this.eventEmitter = new events_1["default"]();
        this.respondEmitter = new events_1["default"]();
        this.nodes = new Map();
        this.packer = msgpack5_1["default"]();
        this.opts = opts;
        this.nodeID =
            (_a = this.opts.nodeID) !== null && _a !== void 0 ? _a : Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        if (!this.opts.namespace)
            throw new Error("Namespace has not been set in options!");
        if (!this.opts.logErrors)
            this.opts.logErrors = true;
        if (!this.opts.logger)
            this.opts.logger = console;
        if (!this.opts.encoding)
            this.opts.encoding = "utf8";
        if (!this.opts.requestTimeout)
            this.opts.requestTimeout = 10 * 1000;
        if (!this.opts.heartbeatInterval)
            this.opts.heartbeatInterval = 5 * 1000;
        if (!this.opts.heartbeatTimeout)
            this.opts.heartbeatTimeout = 10 * 1000;
        if (!this.opts.maxClientConnections)
            this.opts.maxClientConnections = Infinity;
        if (!this.opts.maxServerConnections)
            this.opts.maxServerConnections = Infinity;
        if (!this.opts.maxPeers)
            this.opts.maxPeers = Infinity;
        if (!this.opts.maxParallel)
            this.opts.maxParallel = Infinity;
        if (!this.opts.broadcastReqConcurrency)
            this.opts.broadcastReqConcurrency = 5;
        if (!this.opts.broadcastReqTimeout)
            this.opts.broadcastReqTimeout = 1000;
        if (!this.opts.waitForPeer)
            this.opts.waitForPeer = true;
        this.heartbeatTimer = setInterval(function () { return _this.heartbeatCheck(); }, this.opts.heartbeatInterval);
    }
    Translink.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            var _a;
                            _this.client = new hyperswarm_1["default"]({
                                maxPeers: _this.opts.maxPeers,
                                maxClientConnections: _this.opts.maxClientConnections,
                                maxServerConnections: _this.opts.maxServerConnections,
                                maxParallel: _this.opts.maxParallel
                            });
                            _this.client.on("connection", _this.onConnection.bind(_this));
                            _this.client.on("error", function (err) {
                                return _this.logErr("hyperswarm error", err);
                            });
                            _this.net = _this.client.join(Buffer.alloc(32).fill(String(_this.opts.namespace)), { server: true, client: true });
                            if (_this.opts.log)
                                _this.log("=> announcing");
                            (_a = _this.net) === null || _a === void 0 ? void 0 : _a.flushed().then(function () {
                                if (_this.opts.log)
                                    _this.log("=> announced");
                                var interval = setInterval(function () {
                                    if (_this.nodes.size > 0 || !_this.opts.waitForPeer) {
                                        _this.log("=> connected");
                                        clearInterval(interval);
                                        resolve(true);
                                    }
                                }, 500);
                            })["catch"](reject);
                        })];
                }
                catch (err) {
                    this.logErr("Connection error", err);
                }
                return [2 /*return*/];
            });
        });
    };
    Translink.prototype.onConnection = function (node) {
        var _this = this;
        try {
            // Inform about the connection
            node.on("data", function (data) { return _this.onMessage(data, node); });
            node.on("error", function (error) {
                return _this.logErr("hyperswarm error", error);
            });
            node.write(this._prepareOutgoingData([
                ":peer",
                this.nodeID,
                this.eventEmitter.eventNames(),
            ]));
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("onConnection() error", err);
        }
    };
    Translink.prototype.onMessage = function (data, node) {
        try {
            var preparedData = this._prepareIncomingData(data);
            this.processMessageEvent(preparedData, node);
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("onMessage() error", err);
        }
    };
    Translink.prototype.processMessageEvent = function (data, node) {
        try {
            var eventName = String(data[0]);
            //Informing about the connection
            if (eventName === ":peer") {
                // Set node id
                node.userData = String(data[1]);
                this.nodes.set(node.userData, {
                    listenerNames: __spreadArray([], __read(data[2])),
                    node: node,
                    heartbeat: Date.now()
                });
                // Inform to console
                if (this.opts.log)
                    this.log("connected =>", { nodeID: node.userData });
            }
            else if (eventName === ":res") {
                var reqId = String(data[2]);
                if (this.opts.log)
                    this.log("response =>", reqId, { nodeID: node.userData });
                this.respondEmitter.emit(reqId, data[1]);
            }
            else if (eventName === ":err") {
                var reqId = String(data[2]);
                if (this.opts.log)
                    this.log("error response =>", reqId, { nodeID: node.userData });
                this.respondEmitter.emit(reqId, JSON.parse(data[1]), true);
            }
            else if (eventName === ":hb") {
                var $node = this.nodes.get(node.userData);
                if (!$node)
                    return;
                $node.heartbeat = Date.now();
                this.nodes.set(node.userData, $node);
            }
            else {
                var nodeCell = this.nodes.get(node.userData);
                if (!nodeCell) {
                    if (this.opts.log)
                        this.log("node not found =>", { nodeID: node.userData });
                    return;
                }
                data.push(node.userData);
                if (this.opts.log)
                    this.log("executing =>", { eventName: eventName });
                var success = this.eventEmitter.emit(eventName, data);
                if (!success && this.opts.log)
                    this.log("is not success =>", { eventName: eventName });
                return success;
            }
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("processMessageEvent() error", err);
        }
    };
    Translink.prototype.heartbeatCheck = function () {
        var _this = this;
        this.nodes.forEach(function (node, key) {
            var _a;
            if (Date.now() - node.heartbeat > Number((_a = _this.opts) === null || _a === void 0 ? void 0 : _a.heartbeatTimeout)) {
                if (_this.opts.log)
                    _this.log("heartbeat timeout =>", { nodeID: node.node.userData });
                _this.nodes["delete"](key);
            }
            else {
                node.node.write(_this._prepareOutgoingData([":hb"]));
            }
        });
    };
    Translink.prototype.emit = function (eventId, data) {
        try {
            var node = this._findAvailableNode(eventId);
            if (!node)
                throw new RequestError({
                    code: "EVENT_NOT_EXIST",
                    message: "Event " + eventId + " not exist in network"
                });
            node === null || node === void 0 ? void 0 : node.node.write(this._prepareOutgoingData([eventId, data]));
            return true;
        }
        catch (err) {
            throw err;
        }
    };
    Translink.prototype.get = function (eventId, data, node) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                // Trying to find node with this event
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        try {
                            if (!node)
                                node = _this._findAvailableNode(eventId);
                            if (!node)
                                throw new RequestError({
                                    code: "EVENT_NOT_EXIST",
                                    message: "Event " + eventId + " not exist in network"
                                });
                            var timer_1 = setTimeout(function () {
                                return _this.respondEmitter.emit(reqId_1, new Error("Request timeout"), true);
                            }, _this.opts.requestTimeout);
                            var reqId_1 = Math.random().toString(36).substring(2, 9);
                            _this.respondEmitter.once(reqId_1, function (data, isError) {
                                if (isError === void 0) { isError = false; }
                                clearTimeout(timer_1);
                                if (!isError)
                                    resolve(data);
                                else
                                    reject(data);
                            });
                            if (_this.opts.log)
                                _this.log("request sent =>", {
                                    eventId: eventId,
                                    reqId: reqId_1,
                                    nodeID: node.node.userData
                                });
                            node === null || node === void 0 ? void 0 : node.node.write(_this._prepareOutgoingData([eventId, data, reqId_1]));
                        }
                        catch (err) {
                            reject(err);
                        }
                    })];
            });
        });
    };
    Translink.prototype.broadcast = function (eventId, data) {
        var _this = this;
        try {
            var nodes = Array.from(this.nodes.values()).filter(function (cell) { return cell.listenerNames.indexOf(eventId) !== -1; });
            if (nodes.length === 0)
                throw new RequestError({
                    code: "EVENT_NOT_REGISTERED",
                    message: "Event " + eventId + " not registered in network"
                });
            nodes.map(function (node) {
                return node.node.write(_this._prepareOutgoingData([eventId, data]));
            });
        }
        catch (err) {
            throw err;
        }
    };
    Translink.prototype.broadcastToAllNodes = function (eventId, data) {
        var _this = this;
        try {
            this.nodes.forEach(function (node) {
                return node.node.write(_this._prepareOutgoingData([eventId, data]));
            });
        }
        catch (err) {
            throw err;
        }
    };
    Translink.prototype.broadcastReq = function (eventId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var promises_1, results, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        promises_1 = [];
                        this._findAvailableNodes(eventId).forEach(function (node) {
                            promises_1.push(new Promise(function (resolve) {
                                var timer = setTimeout(function () { return resolve(null); }, _this.opts.broadcastReqTimeout);
                                _this.get(eventId, data, node)
                                    .then(function (res) { return resolve(res); })["catch"](function () { return resolve(null); })["finally"](function () { return clearTimeout(timer); });
                            }));
                        });
                        return [4 /*yield*/, bluebird_1["default"].Promise.map(promises_1, function (promise) {
                                return promise;
                            }, { concurrency: this.opts.broadcastReqConcurrency })];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.filter(function (r) { return r !== null; })];
                    case 2:
                        err_1 = _a.sent();
                        throw err_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Translink.prototype.subscribe = function (eventId, listener) {
        try {
            this.eventEmitter.on(eventId, function (data) { return listener(data[1]); });
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("subscribe() error", err);
        }
    };
    Translink.prototype.subscribeReq = function (eventId, listener) {
        var _this = this;
        try {
            this.eventEmitter.on(eventId, function (data) {
                return _this._bindReqResult(listener, data);
            });
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("subscribeReq() error", err);
        }
    };
    Translink.prototype._prepareIncomingData = function (data) {
        try {
            return this.packer.decode(data);
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("_prepareIncomingData() error", err);
            return {};
        }
    };
    Translink.prototype._prepareOutgoingData = function (data) {
        try {
            return this.opts.encoding === "utf8"
                ? typeof data === "object"
                    ? this.packer.encode(data)
                    : data
                : data;
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("_prepareOutgoingData() error", err);
            return "{}";
        }
    };
    Translink.prototype._findAvailableNode = function (eventId) {
        try {
            var nodes = Array.from(this.nodes.values()).filter(function (cell) { return cell.listenerNames.indexOf(eventId) !== -1; });
            return nodes[Math.floor(Math.random() * nodes.length)];
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("_findAvailableNode() error", err);
            return null;
        }
    };
    Translink.prototype._findAvailableNodes = function (eventId) {
        try {
            var nodes = Array.from(this.nodes.values()).filter(function (cell) { return cell.listenerNames.indexOf(eventId) !== -1; });
            return nodes;
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("_findAvailableNode() error", err);
            return null;
        }
    };
    Translink.prototype._bindReqResult = function (listener, data) {
        var _this = this;
        try {
            var reqId_2 = data[2];
            var nodeID_1 = data[3];
            var node_1 = this.nodes.get(nodeID_1);
            if (this.opts.log)
                this.log("incoming =>", { reqId: reqId_2, nodeID: nodeID_1 });
            listener(data[1], data[3])
                .then(function (result) {
                var _a;
                if (_this.opts.log)
                    _this.log("listener response =>", { reqId: reqId_2, nodeID: nodeID_1 });
                (_a = node_1 === null || node_1 === void 0 ? void 0 : node_1.node) === null || _a === void 0 ? void 0 : _a.write(_this._prepareOutgoingData([":res", result, reqId_2]));
            })["catch"](function (err) {
                var _a;
                (_a = node_1 === null || node_1 === void 0 ? void 0 : node_1.node) === null || _a === void 0 ? void 0 : _a.write(_this._prepareOutgoingData([
                    ":err",
                    JSON.stringify(err, Object.getOwnPropertyNames(err)),
                    reqId_2,
                ]));
            });
        }
        catch (err) {
            if (this.opts.logErrors)
                this.logErr("_bindReqResult() error", err);
        }
    };
    Translink.prototype.log = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.opts.log)
            return;
        (_a = this.opts.logger) === null || _a === void 0 ? void 0 : _a.info.apply(_a, __spreadArray([], __read(args)));
    };
    Translink.prototype.logErr = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.opts.log)
            return;
        (_a = this.opts.logger) === null || _a === void 0 ? void 0 : _a.error.apply(_a, __spreadArray([], __read(args)));
    };
    return Translink;
}());
exports["default"] = Translink;
