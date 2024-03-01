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
exports.ActivityRepository = void 0;
var Bootstrap_1 = require("../Bootstrap");
var ActivityRepository = /** @class */ (function () {
    function ActivityRepository() {
    }
    ActivityRepository.prototype._select = function (id, parent, ignore_binary) {
        if (parent === void 0) { parent = false; }
        if (ignore_binary === void 0) { ignore_binary = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.Database.use("activity").find({
                            selector: id === null ? {} : (_a = {}, _a[parent ? "#parent" : "_id"] = id, _a),
                            sort: [{ timestamp: "asc" }],
                            limit: 2147483647 /* 32-bit INT_MAX */
                        })];
                    case 1: return [2 /*return*/, (_b.sent()).docs.map(function (x) { return (__assign(__assign({ id: x._id }, x), { _id: undefined, _rev: undefined, "#parent": undefined, settings: ignore_binary ? undefined : x.settings, timestamp: undefined })); })];
                }
            });
        });
    };
    ActivityRepository.prototype._insert = function (study_id, object) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            var _id;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _id = (0, Bootstrap_1.uuid)();
                        return [4 /*yield*/, Bootstrap_1.Database.use("activity").insert({
                                _id: _id,
                                "#parent": study_id,
                                timestamp: new Date().getTime(),
                                spec: (_a = object.spec) !== null && _a !== void 0 ? _a : "__broken_link__",
                                name: (_b = object.name) !== null && _b !== void 0 ? _b : "",
                                settings: (_c = object.settings) !== null && _c !== void 0 ? _c : {},
                                schedule: (_d = object.schedule) !== null && _d !== void 0 ? _d : [],
                                category: (_e = object.category) !== null && _e !== void 0 ? _e : null
                            })];
                    case 1:
                        _f.sent();
                        return [2 /*return*/, _id];
                }
            });
        });
    };
    ActivityRepository.prototype._update = function (activity_id, object) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            var orig, schedules, newSchedules, _i, schedules_1, schedule, notificationId, custNotids, _f, _g, customTimes, notificationId;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.Database.use("activity").get(activity_id)];
                    case 1:
                        orig = _h.sent();
                        schedules = (_a = object.schedule) !== null && _a !== void 0 ? _a : undefined;
                        newSchedules = [];
                        if (!!!schedules) return [3 /*break*/, 7];
                        _i = 0, schedules_1 = schedules;
                        _h.label = 2;
                    case 2:
                        if (!(_i < schedules_1.length)) return [3 /*break*/, 7];
                        schedule = schedules_1[_i];
                        if (!(schedule.repeat_interval !== "custom")) return [3 /*break*/, 4];
                        notificationId = Math.floor(Math.random() * 1000000) + 1;
                        schedule = __assign(__assign({}, schedule), { notification_ids: [notificationId] });
                        return [4 /*yield*/, newSchedules.push(schedule)];
                    case 3:
                        _h.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        if (!!!schedule.custom_time) return [3 /*break*/, 6];
                        custNotids = [];
                        //find notification id for multiple custom times
                        for (_f = 0, _g = schedule.custom_time; _f < _g.length; _f++) {
                            customTimes = _g[_f];
                            notificationId = Math.floor(Math.random() * 1000000) + 1;
                            custNotids.push(notificationId);
                        }
                        schedule = __assign(__assign({}, schedule), { notification_ids: custNotids });
                        return [4 /*yield*/, newSchedules.push(schedule)];
                    case 5:
                        _h.sent();
                        _h.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [4 /*yield*/, Bootstrap_1.Database.use("activity").bulk({
                            docs: [
                                __assign(__assign({}, orig), { name: (_b = object.name) !== null && _b !== void 0 ? _b : orig.name, settings: (_c = object.settings) !== null && _c !== void 0 ? _c : orig.settings, category: (_d = object.category) !== null && _d !== void 0 ? _d : orig.category, schedule: (_e = (newSchedules.length !== 0 ? newSchedules : object.schedule)) !== null && _e !== void 0 ? _e : orig.schedule }),
                            ]
                        })];
                    case 8:
                        _h.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    ActivityRepository.prototype._delete = function (activity_id) {
        return __awaiter(this, void 0, void 0, function () {
            var orig, data, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Bootstrap_1.Database.use("activity").get(activity_id)];
                    case 1:
                        orig = _a.sent();
                        return [4 /*yield*/, Bootstrap_1.Database.use("activity").bulk({
                                docs: [__assign(__assign({}, orig), { _deleted: true })]
                            })];
                    case 2:
                        data = _a.sent();
                        if (data.filter(function (x) { return !!x.error; }).length > 0)
                            throw new Error();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.error(e_1);
                        throw new Error("500.deletion-failed");
                    case 4: return [2 /*return*/, {}];
                }
            });
        });
    };
    /** get activities.There would be a need for pagination of the data without settings. So, its seperately written
     *
     * @param id
     * @param parent
     * @returns Array Activity[]
     */
    ActivityRepository.prototype._lookup = function (id, parent) {
        if (parent === void 0) { parent = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.Database.use("activity").find({
                            selector: id === null ? {} : (_a = {}, _a[parent ? "#parent" : "_id"] = id, _a),
                            sort: [{ timestamp: "asc" }],
                            fields: ["_id", "name", "spec", "schedule", "#parent", "category"],
                            limit: 2147483647 /* 32-bit INT_MAX */
                        })];
                    case 1: return [2 /*return*/, (_b.sent()).docs.map(function (x) { return (__assign(__assign({ id: x._id }, x), { _id: undefined, _rev: undefined, "#parent": undefined, settings: undefined, study_id: x["#parent"], timestamp: undefined })); })];
                }
            });
        });
    };
    return ActivityRepository;
}());
exports.ActivityRepository = ActivityRepository;
