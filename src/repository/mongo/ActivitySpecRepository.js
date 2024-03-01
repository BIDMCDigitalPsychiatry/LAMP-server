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
exports.ActivitySpecRepository = void 0;
var Bootstrap_1 = require("../Bootstrap");
var ActivitySpecRepository = /** @class */ (function () {
    function ActivitySpecRepository() {
    }
    ActivitySpecRepository.prototype._select = function (id, ignore_binary) {
        return __awaiter(this, void 0, void 0, function () {
            var parents, data, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        parents = [];
                        if (!!!id) return [3 /*break*/, 2];
                        return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").find({ $or: [{ _deleted: false, _id: id }, { _deleted: undefined, _id: id }] }).maxTimeMS(60000).toArray()];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").find({ $or: [{ _deleted: false }, { _deleted: undefined }] }).maxTimeMS(60000).toArray()];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        data = _a;
                        return [2 /*return*/, data.map(function (x) { return (__assign(__assign({ id: x._id }, x), { _id: undefined, __v: undefined, executable: !!id && !ignore_binary ? x.executable : undefined, _deleted: undefined })); })];
                }
            });
        });
    };
    ActivitySpecRepository.prototype._insert = function (object) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function () {
            var res, res_1, error_1;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").findOne({ _id: object.name, _deleted: false })];
                    case 1:
                        res = _g.sent();
                        if (!(res !== null)) return [3 /*break*/, 2];
                        throw new Error("500.ActivitySpec-already-exists");
                    case 2: return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").findOne({ _id: object.name, _deleted: true })];
                    case 3:
                        res_1 = _g.sent();
                        if (!(res_1 === null)) return [3 /*break*/, 5];
                        return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").insertOne({
                                _id: object.name,
                                description: (_a = object.description) !== null && _a !== void 0 ? _a : null,
                                executable: (_b = object.executable) !== null && _b !== void 0 ? _b : null,
                                static_data: (_c = object.static_data) !== null && _c !== void 0 ? _c : {},
                                temporal_slices: (_d = object.temporal_slices) !== null && _d !== void 0 ? _d : {},
                                settings: (_e = object.settings) !== null && _e !== void 0 ? _e : {},
                                category: (_f = object.category) !== null && _f !== void 0 ? _f : null,
                                _deleted: false
                            })];
                    case 4:
                        _g.sent();
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").findOneAndUpdate({ _id: object.name }, {
                            $set: {
                                _deleted: false
                            }
                        })];
                    case 6:
                        _g.sent();
                        _g.label = 7;
                    case 7: return [2 /*return*/, {}];
                    case 8:
                        error_1 = _g.sent();
                        throw new Error("500.activityspec-creation-failed");
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    ActivitySpecRepository.prototype._update = function (id, object) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function () {
            var orig;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").findOne({ _id: id })];
                    case 1:
                        orig = _g.sent();
                        return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").findOneAndUpdate({ _id: orig._id }, {
                                $set: {
                                    description: (_a = object.description) !== null && _a !== void 0 ? _a : orig.description,
                                    executable: (_b = object.executable) !== null && _b !== void 0 ? _b : orig.executable,
                                    static_data: (_c = object.static_data) !== null && _c !== void 0 ? _c : orig.static_data,
                                    temporal_slices: (_d = object.temporal_slices) !== null && _d !== void 0 ? _d : orig.temporal_slices,
                                    settings: (_e = object.settings) !== null && _e !== void 0 ? _e : orig.settings,
                                    category: (_f = object.category) !== null && _f !== void 0 ? _f : orig.category
                                }
                            })];
                    case 2:
                        _g.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    ActivitySpecRepository.prototype._delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Bootstrap_1.MongoClientDB.collection("activity_spec").updateOne({ _id: id }, { $set: { _deleted: true } })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        throw new Error("500.deletion-failed");
                    case 3: return [2 /*return*/, {}];
                }
            });
        });
    };
    return ActivitySpecRepository;
}());
exports.ActivitySpecRepository = ActivitySpecRepository;
