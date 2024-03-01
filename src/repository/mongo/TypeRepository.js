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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.TypeRepository = void 0;
//import { ScriptRunner } from "../../utils"
var Bootstrap_1 = require("../../repository/Bootstrap");
var Bootstrap_2 = require("../Bootstrap");
// FIXME: Support application/json;indent=:spaces format mime type!
var TypeRepository = /** @class */ (function () {
    function TypeRepository() {
    }
    TypeRepository.prototype._parent = function (type_id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, repo, TypeRepository, _i, _a, parent_type, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        result = {} // obj['_parent'] === [null, undefined] -> top-level object
                        ;
                        repo = new Bootstrap_1.Repository();
                        TypeRepository = repo.getTypeRepository();
                        _i = 0;
                        return [4 /*yield*/, TypeRepository._parent_type(type_id)];
                    case 1:
                        _a = _d.sent();
                        _d.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        parent_type = _a[_i];
                        _b = result;
                        _c = parent_type;
                        return [4 /*yield*/, TypeRepository._parent_id(type_id, parent_type)];
                    case 3:
                        _b[_c] = _d.sent();
                        _d.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, result];
                }
            });
        });
    };
    TypeRepository.prototype._self_type = function (type_id) {
        return __awaiter(this, void 0, void 0, function () {
            var data, e_1, data, e_2, data, e_3, data, e_4, data, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant").findOne({
                                _deleted: false,
                                _id: type_id
                            })];
                    case 1:
                        data = _a.sent();
                        if (null !== data)
                            return [2 /*return*/, "Participant"];
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        return [3 /*break*/, 3];
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("researcher").findOne({ _deleted: false, _id: type_id })];
                    case 4:
                        data = _a.sent();
                        if (null !== data)
                            return [2 /*return*/, "Researcher"];
                        return [3 /*break*/, 6];
                    case 5:
                        e_2 = _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("study").findOne({ _deleted: false, _id: type_id })];
                    case 7:
                        data = _a.sent();
                        if (null !== data)
                            return [2 /*return*/, "Study"];
                        return [3 /*break*/, 9];
                    case 8:
                        e_3 = _a.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("activity").findOne({ _deleted: false, _id: type_id })];
                    case 10:
                        data = _a.sent();
                        if (null !== data)
                            return [2 /*return*/, "Activity"];
                        return [3 /*break*/, 12];
                    case 11:
                        e_4 = _a.sent();
                        return [3 /*break*/, 12];
                    case 12:
                        _a.trys.push([12, 14, , 15]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: type_id })];
                    case 13:
                        data = _a.sent();
                        if (null !== data)
                            return [2 /*return*/, "Sensor"];
                        return [3 /*break*/, 15];
                    case 14:
                        e_5 = _a.sent();
                        return [3 /*break*/, 15];
                    case 15: return [2 /*return*/, "__broken_id__"];
                }
            });
        });
    };
    TypeRepository.prototype._owner = function (type_id) {
        return __awaiter(this, void 0, void 0, function () {
            var e_6, data, e_7, e_8, e_9, e_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant").findOne({ _deleted: false, _id: type_id })];
                    case 1: return [2 /*return*/, (_a.sent())._parent];
                    case 2:
                        e_6 = _a.sent();
                        return [3 /*break*/, 3];
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("researcher").findOne({ _deleted: false, _id: type_id })];
                    case 4:
                        data = _a.sent();
                        if (null !== data)
                            return [2 /*return*/, null];
                        return [3 /*break*/, 6];
                    case 5:
                        e_7 = _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("study").findOne({ _deleted: false, _id: type_id })];
                    case 7: return [2 /*return*/, (_a.sent())._parent];
                    case 8:
                        e_8 = _a.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("activity").findOne({ _deleted: false, _id: type_id })];
                    case 10: return [2 /*return*/, (_a.sent())._parent];
                    case 11:
                        e_9 = _a.sent();
                        return [3 /*break*/, 12];
                    case 12:
                        _a.trys.push([12, 14, , 15]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: type_id })];
                    case 13: return [2 /*return*/, (_a.sent())._parent];
                    case 14:
                        e_10 = _a.sent();
                        return [3 /*break*/, 15];
                    case 15: throw new Error("404.resource-not-found");
                }
            });
        });
    };
    TypeRepository.prototype._parent_type = function (type_id) {
        return __awaiter(this, void 0, void 0, function () {
            var parent_types, repo, TypeRepository, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        parent_types = {
                            Researcher: [],
                            Study: ["Researcher"],
                            Participant: ["Study", "Researcher"],
                            Activity: ["Study", "Researcher"],
                            Sensor: ["Study", "Researcher"]
                        };
                        repo = new Bootstrap_1.Repository();
                        TypeRepository = repo.getTypeRepository();
                        _a = parent_types;
                        return [4 /*yield*/, TypeRepository._self_type(type_id)];
                    case 1: return [2 /*return*/, _a[_b.sent()]];
                }
            });
        });
    };
    TypeRepository.prototype._parent_id = function (type_id, type) {
        return __awaiter(this, void 0, void 0, function () {
            var self_type, repo, TypeRepository, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        self_type = {
                            Researcher: Researcher_parent_id,
                            Study: Study_parent_id,
                            Participant: Participant_parent_id,
                            Activity: Activity_parent_id,
                            Sensor: Sensor_parent_id
                        };
                        repo = new Bootstrap_1.Repository();
                        TypeRepository = repo.getTypeRepository();
                        _a = self_type;
                        return [4 /*yield*/, TypeRepository._self_type(type_id)];
                    case 1: return [4 /*yield*/, _a[_b.sent()](type_id, type)];
                    case 2: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    TypeRepository.prototype._set = function (mode, type, type_id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var deletion, output;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        deletion = value === undefined || value === null;
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("tag").findOneAndUpdate({ _parent: type_id, type: type, key: key }, {
                                $set: {
                                    _deleted: deletion,
                                    value: deletion ? null : JSON.stringify(value)
                                },
                                $setOnInsert: {
                                    _parent: type_id,
                                    type: type,
                                    key: key
                                }
                            }, { upsert: true, maxTimeMS: 60000 })];
                    case 1:
                        output = _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    TypeRepository.prototype._get = function (mode, type_id, attachment_key) {
        return __awaiter(this, void 0, void 0, function () {
            var repo, TypeRepository, self_type, _a, parents, _b, _c, _d, _e, conditions, _i, conditions_1, condition, value, error_1;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        repo = new Bootstrap_1.Repository();
                        TypeRepository = repo.getTypeRepository();
                        if (!(type_id === null)) return [3 /*break*/, 1];
                        _a = undefined;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, TypeRepository._self_type(type_id)];
                    case 2:
                        _a = _f.sent();
                        _f.label = 3;
                    case 3:
                        self_type = _a;
                        if (!(type_id === null)) return [3 /*break*/, 4];
                        _b = new Array;
                        return [3 /*break*/, 6];
                    case 4:
                        _c = [[null]];
                        _e = (_d = Object).values;
                        return [4 /*yield*/, TypeRepository._parent(type_id)];
                    case 5:
                        _b = __spreadArray.apply(void 0, _c.concat([_e.apply(_d, [_f.sent()]).reverse(), true]));
                        _f.label = 6;
                    case 6:
                        parents = _b;
                        conditions = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], parents.map(function (pid) { return ({ _deleted: false, _parent: pid, type: type_id, key: attachment_key }); }), true), parents.map(function (pid) { return ({ _deleted: false, _parent: pid, type: self_type, key: attachment_key }); }), true), parents.map(function (pid) { return ({ _deleted: false, _parent: pid, type: "*", key: attachment_key }); }), true), [
                            // Explicit self-ownership.
                            { _deleted: false, _parent: type_id, type: type_id, key: attachment_key },
                            // Implicit self-ownership.
                            { _deleted: false, _parent: type_id, type: "me", key: attachment_key },
                        ], false);
                        _i = 0, conditions_1 = conditions;
                        _f.label = 7;
                    case 7:
                        if (!(_i < conditions_1.length)) return [3 /*break*/, 12];
                        condition = conditions_1[_i];
                        _f.label = 8;
                    case 8:
                        _f.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("tag").find(condition).limit(1).maxTimeMS(60000).toArray()];
                    case 9:
                        value = _f.sent();
                        if (value.length > 0)
                            return [2 /*return*/, value.map(function (x) { return JSON.parse(x.value); })[0]];
                        return [3 /*break*/, 11];
                    case 10:
                        error_1 = _f.sent();
                        console.error(error_1, "Failed to search Tag index for ".concat(condition._parent, ":").concat(condition.type, "."));
                        return [3 /*break*/, 11];
                    case 11:
                        _i++;
                        return [3 /*break*/, 7];
                    case 12: 
                    // No such Tag was found, so return an error (for legacy purposes).
                    throw new Error("404.object-not-found");
                }
            });
        });
    };
    TypeRepository.prototype._list = function (mode, type_id) {
        return __awaiter(this, void 0, void 0, function () {
            var repo, TypeRepository, self_type, _a, parents, _b, _c, _d, _e, conditions, all_keys, _i, conditions_2, condition, value, error_2;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        repo = new Bootstrap_1.Repository();
                        TypeRepository = repo.getTypeRepository();
                        if (!(type_id === null)) return [3 /*break*/, 1];
                        _a = undefined;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, TypeRepository._self_type(type_id)];
                    case 2:
                        _a = _f.sent();
                        _f.label = 3;
                    case 3:
                        self_type = _a;
                        if (!(type_id === null)) return [3 /*break*/, 4];
                        _b = new Array;
                        return [3 /*break*/, 6];
                    case 4:
                        _c = [[null]];
                        _e = (_d = Object).values;
                        return [4 /*yield*/, TypeRepository._parent(type_id)];
                    case 5:
                        _b = __spreadArray.apply(void 0, _c.concat([_e.apply(_d, [_f.sent()]).reverse(), true]));
                        _f.label = 6;
                    case 6:
                        parents = _b;
                        conditions = [];
                        conditions = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], parents.map(function (pid) { return ({ _deleted: false, _parent: pid, type: type_id, key: { $ne: null } }); }), true), parents.map(function (pid) { return ({ _deleted: false, _parent: pid, type: self_type, key: { $ne: null } }); }), true), parents.map(function (pid) { return ({ _deleted: false, _parent: pid, type: "*", key: { $ne: null } }); }), true), [
                            // Explicit self-ownership.
                            { _deleted: false, _parent: type_id, type: type_id, key: { $ne: null } },
                            // Implicit self-ownership.
                            { _deleted: false, _parent: type_id, type: "me", key: { $ne: null } },
                        ], false);
                        all_keys = [];
                        _i = 0, conditions_2 = conditions;
                        _f.label = 7;
                    case 7:
                        if (!(_i < conditions_2.length)) return [3 /*break*/, 12];
                        condition = conditions_2[_i];
                        _f.label = 8;
                    case 8:
                        _f.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("tag")
                                .find(condition)
                                .limit(2147483647)
                                .maxTimeMS(60000)
                                .toArray()];
                    case 9:
                        value = _f.sent();
                        all_keys = __spreadArray(__spreadArray([], all_keys, true), value.map(function (x) { return x.key; }), true);
                        return [3 /*break*/, 11];
                    case 10:
                        error_2 = _f.sent();
                        console.error(error_2, "Failed to search Tag index for ".concat(condition._parent, ":").concat(condition.type, "."));
                        return [3 /*break*/, 11];
                    case 11:
                        _i++;
                        return [3 /*break*/, 7];
                    case 12:
                        // Return all the Tag keys we found; converting to a Set and back to an Array
                        // removes any duplicates (i.e. parent-specified Tag taking precedence over self-Tag).
                        // Else, if no such Tags were found, return an error (for legacy purposes).
                        if (all_keys.length > 0)
                            return [2 /*return*/, __spreadArray([], new Set(all_keys), true)];
                        else
                            throw new Error("404.object-not-found");
                        return [2 /*return*/];
                }
            });
        });
    };
    return TypeRepository;
}());
exports.TypeRepository = TypeRepository;
function Researcher_parent_id(id, type) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (type) {
                default:
                    return [2 /*return*/, undefined
                        // throw new Error('400.invalid-identifier')
                    ];
                // throw new Error('400.invalid-identifier')
            }
            return [2 /*return*/];
        });
    });
}
function Study_parent_id(id, type) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, obj;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = type;
                    switch (_a) {
                        case "Researcher": return [3 /*break*/, 1];
                    }
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("study").findOne({ _deleted: false, _id: id })];
                case 2:
                    obj = _b.sent();
                    return [2 /*return*/, obj._parent];
                case 3: throw new Error("400.invalid-identifier");
            }
        });
    });
}
function Participant_parent_id(id, type) {
    return __awaiter(this, void 0, void 0, function () {
        var obj, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = type;
                    switch (_a) {
                        case "Study": return [3 /*break*/, 1];
                        case "Researcher": return [3 /*break*/, 3];
                    }
                    return [3 /*break*/, 6];
                case 1: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant").findOne({ _deleted: false, _id: id })];
                case 2:
                    obj = _b.sent();
                    return [2 /*return*/, obj._parent];
                case 3: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant").findOne({ _deleted: false, _id: id })];
                case 4:
                    obj = _b.sent();
                    return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("study").findOne({ _deleted: false, _id: obj._parent })];
                case 5:
                    obj = _b.sent();
                    return [2 /*return*/, obj._parent];
                case 6: throw new Error("400.invalid-identifier");
            }
        });
    });
}
function Activity_parent_id(id, type) {
    return __awaiter(this, void 0, void 0, function () {
        var obj, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = type;
                    switch (_a) {
                        case "Study": return [3 /*break*/, 1];
                        case "Researcher": return [3 /*break*/, 3];
                    }
                    return [3 /*break*/, 6];
                case 1: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("activity").findOne({ _deleted: false, _id: id })];
                case 2:
                    obj = _b.sent();
                    return [2 /*return*/, obj._parent];
                case 3: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("activity").findOne({ _deleted: false, _id: id })];
                case 4:
                    obj = _b.sent();
                    return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("study").findOne({ _deleted: false, _id: obj._parent })];
                case 5:
                    obj = _b.sent();
                    return [2 /*return*/, obj._parent];
                case 6: throw new Error("400.invalid-identifier");
            }
        });
    });
}
function Sensor_parent_id(id, type) {
    return __awaiter(this, void 0, void 0, function () {
        var obj, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = type;
                    switch (_a) {
                        case "Study": return [3 /*break*/, 1];
                        case "Researcher": return [3 /*break*/, 3];
                    }
                    return [3 /*break*/, 6];
                case 1: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: id })];
                case 2:
                    obj = _b.sent();
                    return [2 /*return*/, obj._parent];
                case 3: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: id })];
                case 4:
                    obj = _b.sent();
                    return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("study").findOne({ _deleted: false, _id: obj._parent })];
                case 5:
                    obj = _b.sent();
                    return [2 /*return*/, obj._parent];
                case 6: throw new Error("400.invalid-identifier");
            }
        });
    });
}
