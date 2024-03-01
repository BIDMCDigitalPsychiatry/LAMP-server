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
exports.BulkDataWriteQueueProcess = void 0;
var Bootstrap_1 = require("../../repository/Bootstrap");
var Queue_1 = require("./Queue");
var async_mutex_1 = require("async-mutex");
var clientLock = new async_mutex_1.Mutex();
/** Queue Process
 *
 * @param job
 */
function BulkDataWriteQueueProcess(job) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, release, write, Cache_Size, Store_Size, Store_Data, Size_, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = job.data.key;
                    switch (_a) {
                        case "sensor_event": return [3 /*break*/, 1];
                    }
                    return [3 /*break*/, 9];
                case 1: return [4 /*yield*/, clientLock.acquire()];
                case 2:
                    release = _b.sent();
                    write = false;
                    Cache_Size = Number(process.env.CACHE_SIZE);
                    return [4 /*yield*/, (Bootstrap_1.RedisClient === null || Bootstrap_1.RedisClient === void 0 ? void 0 : Bootstrap_1.RedisClient.llen("se_Q"))];
                case 3:
                    Store_Size = (_b.sent());
                    Store_Data = new Array();
                    if (!(Store_Size > Cache_Size)) return [3 /*break*/, 8];
                    console.log("Store_Size", "".concat(Store_Size));
                    Size_ = !!process.env.CACHE_FLUSH_ALL
                        ? process.env.CACHE_FLUSH_ALL === "true"
                            ? Store_Size
                            : Cache_Size
                        : Cache_Size;
                    console.log("Size_ to be processed", "".concat(Size_));
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, (Bootstrap_1.RedisClient === null || Bootstrap_1.RedisClient === void 0 ? void 0 : Bootstrap_1.RedisClient.lrange("se_Q", 0, Size_ - 1))];
                case 5:
                    Store_Data = (_b.sent());
                    write = true;
                    return [4 /*yield*/, (Bootstrap_1.RedisClient === null || Bootstrap_1.RedisClient === void 0 ? void 0 : Bootstrap_1.RedisClient.ltrim("se_Q", Size_, -1))];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _b.sent();
                    console.log("error in trimming data", error_1);
                    return [3 /*break*/, 8];
                case 8:
                    release();
                    console.log("should write", write);
                    if (write) {
                        //delayed write
                        SaveSensorEvent(Store_Data);
                        // SaveSensorEvent(Store_Data.slice(20001,40002),15000)
                        // SaveSensorEvent(Store_Data.slice(40002,60001),30000)
                    }
                    return [3 /*break*/, 10];
                case 9: return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.BulkDataWriteQueueProcess = BulkDataWriteQueueProcess;
/** push to db from redis batch wise
 *
 */
function PushFromRedis(Q_Name, Store_Size) {
    return __awaiter(this, void 0, void 0, function () {
        var i, start, end, Store_Data, error_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Store_Size to be processed for db write", "".concat(Q_Name, "--").concat(Store_Size));
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < Store_Size)) return [3 /*break*/, 6];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    start = i === 0 ? i : i + 1;
                    end = i + 501;
                    if (start >= Store_Size)
                        return [3 /*break*/, 6];
                    return [4 /*yield*/, (Bootstrap_1.RedisClient === null || Bootstrap_1.RedisClient === void 0 ? void 0 : Bootstrap_1.RedisClient.lrange(Q_Name, start, end))];
                case 3:
                    Store_Data = (_a.sent());
                    SaveSensorEvent(Store_Data);
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    return [3 /*break*/, 5];
                case 5:
                    i = i + 501;
                    return [3 /*break*/, 1];
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    console.log("---Store_Size to be processed for trimming", "".concat(Q_Name, "--").concat(Store_Size));
                    //Remove data from redis store
                    return [4 /*yield*/, (Bootstrap_1.RedisClient === null || Bootstrap_1.RedisClient === void 0 ? void 0 : Bootstrap_1.RedisClient.ltrim(Q_Name, Store_Size, -1))];
                case 7:
                    //Remove data from redis store
                    _a.sent();
                    return [3 /*break*/, 9];
                case 8:
                    error_3 = _a.sent();
                    console.log(error_3);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/** save bulk sensor event data via queue
 *
 * @param datas
 */
function SaveSensorEvent(datas, delay) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (datas.length > 0) {
                Queue_1.BulkDataWriteSlaveQueue === null || Queue_1.BulkDataWriteSlaveQueue === void 0 ? void 0 : Queue_1.BulkDataWriteSlaveQueue.add({
                    key: "sensor_event",
                    payload: datas
                }, {
                    attempts: 3,
                    backoff: 10000,
                    removeOnComplete: true,
                    removeOnFail: true,
                    delay: delay === undefined ? 1000 : delay
                });
            }
            return [2 /*return*/];
        });
    });
}
