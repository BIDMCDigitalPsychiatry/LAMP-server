"use strict";
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
exports.__esModule = true;
exports.initializeQueues = exports.BulkDataWriteSlaveQueue = exports.BulkDataWriteQueue = exports.CacheDataQueue = exports.PubSubAPIListenerQueue = exports.PushNotificationQueue = void 0;
var bull_1 = require("bull");
var PushNotificationQueue_1 = require("./PushNotificationQueue");
var PubSubAPIListenerQueue_1 = require("./PubSubAPIListenerQueue");
var BulkDataWriteQueue_1 = require("./BulkDataWriteQueue");
var BulkDataWriteSlaveQueue_1 = require("./BulkDataWriteSlaveQueue");
/**Initialize queues and its process
 *
 */
function initializeQueues() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_e) {
            try {
                exports.PushNotificationQueue = new bull_1["default"]("PushNotification", (_a = process.env.REDIS_HOST) !== null && _a !== void 0 ? _a : "", {
                    redis: { enableReadyCheck: true, maxRetriesPerRequest: null }
                });
                exports.PubSubAPIListenerQueue = new bull_1["default"]("PubSubAPIListener", (_b = process.env.REDIS_HOST) !== null && _b !== void 0 ? _b : "", {
                    redis: { enableReadyCheck: true, maxRetriesPerRequest: null }
                });
                exports.BulkDataWriteQueue = new bull_1["default"]("BulkDataWrite", (_c = process.env.REDIS_HOST) !== null && _c !== void 0 ? _c : "", {
                    redis: { enableReadyCheck: true, maxRetriesPerRequest: null }
                });
                exports.BulkDataWriteSlaveQueue = new bull_1["default"]("BulkDataWriteSlave", (_d = process.env.REDIS_HOST) !== null && _d !== void 0 ? _d : "", {
                    redis: { enableReadyCheck: true, maxRetriesPerRequest: null }
                });
                exports.PushNotificationQueue.process(function (job) {
                    (0, PushNotificationQueue_1.PushNotificationQueueProcess)(job);
                });
                exports.PubSubAPIListenerQueue.process(function (job, done) {
                    (0, PubSubAPIListenerQueue_1.PubSubAPIListenerQueueProcess)(job, done);
                });
                exports.BulkDataWriteQueue.process(function (job) {
                    (0, BulkDataWriteQueue_1.BulkDataWriteQueueProcess)(job);
                });
                exports.BulkDataWriteSlaveQueue.process(function (job) {
                    (0, BulkDataWriteSlaveQueue_1.BulkDataWriteSlaveQueueProcess)(job);
                });
            }
            catch (error) {
                console.log(error);
            }
            return [2 /*return*/];
        });
    });
}
exports.initializeQueues = initializeQueues;
