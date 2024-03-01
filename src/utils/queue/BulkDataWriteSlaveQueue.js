"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.BulkDataWriteSlaveQueueProcess = void 0;
var Bootstrap_1 = require("../../repository/Bootstrap");
/** Queue Process
 *
 * @param job
 */
function BulkDataWriteSlaveQueueProcess(job) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, repo, SensorEventRepository, datas, sensor_events, _i, datas_1, data, participant_id, sensor_event, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = job.data.key;
                    switch (_b) {
                        case "sensor_event": return [3 /*break*/, 1];
                    }
                    return [3 /*break*/, 12];
                case 1:
                    console.log("write started timestamp", "".concat(job.id, "-").concat(Date.now()));
                    repo = new Bootstrap_1.Repository();
                    SensorEventRepository = repo.getSensorEventRepository();
                    datas = job.data.payload;
                    sensor_events = [];
                    _i = 0, datas_1 = datas;
                    _c.label = 2;
                case 2:
                    if (!(_i < datas_1.length)) return [3 /*break*/, 8];
                    data = datas_1[_i];
                    participant_id = JSON.parse(data).participant_id;
                    sensor_event = JSON.parse(data);
                    return [4 /*yield*/, delete sensor_event.participant_id];
                case 3:
                    _c.sent();
                    if (!((_a = process.env.DB) === null || _a === void 0 ? void 0 : _a.startsWith("mongodb://"))) return [3 /*break*/, 5];
                    return [4 /*yield*/, sensor_events.push(__assign(__assign({}, sensor_event), { _parent: participant_id }))];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, sensor_events.push(__assign(__assign({}, sensor_event), { "#parent": participant_id }))];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8:
                    _c.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, SensorEventRepository._bulkWrite(sensor_events)];
                case 9:
                    _c.sent();
                    console.log("write finished timestamp", "".concat(job.id, "-").concat(Date.now()));
                    return [3 /*break*/, 11];
                case 10:
                    error_1 = _c.sent();
                    console.log("db write error", error_1);
                    return [3 /*break*/, 11];
                case 11: return [3 /*break*/, 13];
                case 12: return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
exports.BulkDataWriteSlaveQueueProcess = BulkDataWriteSlaveQueueProcess;
