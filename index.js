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
var Translink = /** @class */ (function () {
    function Translink(opts) {
        var _a;
        this.client = null;
        this.net = null;
        this.nodeID = null;
        this.eventEmitter = new events_1["default"]();
        this.respondEmitter = new events_1["default"]();
        this.nodes = new Map();
        this.opts = opts;
        this.nodeID =
            (_a = this.opts.nodeID) !== null && _a !== void 0 ? _a : Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        if (!this.opts.namespace)
            throw new Error("Namespace has not been set in options!");
        if (!this.opts.logger)
            this.opts.logger = console;
        if (!this.opts.encoding)
            this.opts.encoding = "utf8";
    }
    Translink.prototype.connect = function () {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        this.client = new hyperswarm_1["default"]({
                            maxPeers: Infinity,
                            maxClientConnections: Infinity,
                            maxServerConnections: Infinity
                        });
                        this.client.on("connection", this.onConnection.bind(this));
                        this.net = this.client.join(Buffer.alloc(32).fill(String(this.opts.namespace)), { server: true, client: true });
                        if (this.opts.log)
                            (_b = (_a = this.opts) === null || _a === void 0 ? void 0 : _a.logger) === null || _b === void 0 ? void 0 : _b.info("Translink :: Waiting to announcing...");
                        return [4 /*yield*/, ((_c = this.net) === null || _c === void 0 ? void 0 : _c.flushed())];
                    case 1:
                        _f.sent();
                        if (this.opts.log)
                            (_e = (_d = this.opts) === null || _d === void 0 ? void 0 : _d.logger) === null || _e === void 0 ? void 0 : _e.info("Translink :: Joined to network.");
                        return [2 /*return*/];
                }
            });
        });
    };
    Translink.prototype.onConnection = function (node) {
        var _this = this;
        // Inform about the connection
        node.write(this._prepareOutgoingData([
            ":peer",
            this.nodeID,
            this.eventEmitter.eventNames(),
        ]));
        node.on("data", function (data) { return _this.onMessage(data, node); });
    };
    Translink.prototype.onMessage = function (data, node) {
        var preparedData = this._prepareIncomingData(data);
        this.processMessageEvent(preparedData, node);
    };
    Translink.prototype.processMessageEvent = function (data, node) {
        var _a;
        var eventName = String(data[0]);
        //Informing about the connection
        if (eventName === ":peer") {
            // Set node id
            node.userData = String(data[1]);
            this.nodes.set(node.userData, { listenerNames: __spreadArray([], __read(data[2])), node: node });
            // Inform to console
            if (this.opts.log)
                (_a = this.opts.logger) === null || _a === void 0 ? void 0 : _a.info("Translink :: Node", node.userData, "connected");
        }
        else if (eventName === ":res") {
            this.respondEmitter.emit(String(data[2]), data[1]);
        }
        else if (eventName === ":err") {
            this.respondEmitter.emit(String(data[2]), data[1], true);
        }
        else {
            var nodeCell = this.nodes.get(node.userData);
            if (!nodeCell)
                return;
            data.push(node.userData);
            var success = this.eventEmitter.emit(eventName, data);
            if (!success)
                return;
        }
    };
    Translink.prototype.emit = function (eventId, data) {
        var node = this._findAvailableNode(eventId);
        if (!node)
            throw "Event " + eventId + " not exist in network";
        node === null || node === void 0 ? void 0 : node.node.write(this._prepareOutgoingData([eventId, data]));
        return true;
    };
    Translink.prototype.get = function (eventId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                // Trying to find node with this event
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        try {
                            var node = _this._findAvailableNode(eventId);
                            if (!node)
                                throw "Event " + eventId + " not exist in network";
                            var reqId = Math.random().toString(36).substring(2, 9);
                            _this.respondEmitter.once(reqId, function (data, isError) {
                                if (isError === void 0) { isError = false; }
                                if (!isError)
                                    resolve(data);
                                else
                                    reject(data);
                            });
                            node === null || node === void 0 ? void 0 : node.node.write(_this._prepareOutgoingData([eventId, data, reqId]));
                        }
                        catch (err) {
                            reject(err);
                        }
                    })];
            });
        });
    };
    Translink.prototype.subscribe = function (eventId, listener) {
        this.eventEmitter.on(eventId, listener);
    };
    Translink.prototype.subscribeReq = function (eventId, listener) {
        var _this = this;
        this.eventEmitter.on(eventId, function (data) {
            return _this._bindReqResult(listener, data);
        });
    };
    Translink.prototype._prepareIncomingData = function (data) {
        if (this.opts.encoding === "utf8") {
            data = data.toString();
            return data.indexOf("[") !== -1 || data.indexOf("{") !== -1
                ? JSON.parse(data)
                : data;
        }
        else
            return Buffer.from(data);
    };
    Translink.prototype._prepareOutgoingData = function (data) {
        return this.opts.encoding === "utf8"
            ? typeof data === "object"
                ? JSON.stringify(data)
                : data
            : data;
    };
    Translink.prototype._findAvailableNode = function (eventId) {
        var nodes = Array.from(this.nodes.values()).filter(function (cell) { return cell.listenerNames.indexOf(eventId) !== -1; });
        return nodes[Math.floor(Math.random() * nodes.length)];
    };
    Translink.prototype._bindReqResult = function (listener, data) {
        var _this = this;
        var reqId = data[2];
        var nodeID = data[3];
        var node = this.nodes.get(nodeID);
        listener(data[1], data[3])
            .then(function (result) { var _a; return (_a = node === null || node === void 0 ? void 0 : node.node) === null || _a === void 0 ? void 0 : _a.write(_this._prepareOutgoingData([":res", result, reqId])); })["catch"](function (err) {
            var _a, _b;
            (_a = node === null || node === void 0 ? void 0 : node.node) === null || _a === void 0 ? void 0 : _a.write(_this._prepareOutgoingData([":err", (_b = err.stack) !== null && _b !== void 0 ? _b : err, reqId]));
        });
    };
    return Translink;
}());
exports["default"] = Translink;
