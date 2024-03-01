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
exports.SensorEventRepository = void 0;
var Bootstrap_1 = require("../Bootstrap");
// FIXME: does not support filtering by Sensor yet.
var SensorEventRepository = /** @class */ (function () {
    function SensorEventRepository() {
    }
    SensorEventRepository.prototype._select = function (id, ignore_binary, sensor_spec, from_date, to_date, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var filteredQuery, all_res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filteredQuery = {};
                        if (!!id) {
                            filteredQuery._parent = id;
                        }
                        if (!!sensor_spec) {
                            filteredQuery.sensor = sensor_spec;
                        }
                        if (!!from_date) {
                            filteredQuery.timestamp = { $gte: from_date };
                        }
                        if (!!to_date) {
                            filteredQuery.timestamp = { $lt: from_date === to_date ? to_date + 1 : to_date };
                        }
                        if (!!from_date && !!to_date) {
                            filteredQuery.timestamp = { $gte: from_date, $lt: from_date === to_date ? to_date + 1 : to_date };
                        }
                        return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("sensor_event")
                                .find(filteredQuery)
                                .sort({ timestamp: !!limit && limit < 0 ? 1 : -1 })
                                .limit(limit !== null && limit !== void 0 ? limit : 1)
                                .maxTimeMS(60000)
                                .toArray()];
                    case 1:
                        all_res = _a.sent();
                        return [2 /*return*/, all_res.map(function (x) {
                                if (!!ignore_binary) {
                                    delete x.data;
                                }
                                return (__assign(__assign({}, x), { _id: undefined, __v: undefined, _parent: undefined, _deleted: undefined }));
                            })];
                }
            });
        });
    };
    SensorEventRepository.prototype._insert = function (participant_id, objects) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var data, _i, objects_1, object;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = [];
                        _i = 0, objects_1 = objects;
                        _b.label = 1;
                    case 1:
                        if (!(_i < objects_1.length)) return [3 /*break*/, 4];
                        object = objects_1[_i];
                        return [4 /*yield*/, data.push(__assign(__assign({}, object), { _parent: participant_id, timestamp: Number.parse(object.timestamp), sensor: String(object.sensor), data: (_a = object.data) !== null && _a !== void 0 ? _a : {} }))];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("sensor_event").insertMany(data)];
                    case 5:
                        _b.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    /** write to db in bulk (argument does not contain participant_id, as participant_id will be present in the array objects given as argument)
     *
     * @param objects
     * @returns
     */
    SensorEventRepository.prototype._bulkWrite = function (objects) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("sensor_event").insertMany(objects)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.log(error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, {}];
                }
            });
        });
    };
    return SensorEventRepository;
}());
exports.SensorEventRepository = SensorEventRepository;
