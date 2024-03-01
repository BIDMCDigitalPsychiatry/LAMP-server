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
exports.ParticipantRepository = void 0;
var Bootstrap_1 = require("../Bootstrap");
var ParticipantRepository = /** @class */ (function () {
    function ParticipantRepository() {
    }
    ParticipantRepository.prototype._select = function (id, parent) {
        if (parent === void 0) { parent = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.Database.use("participant").find({
                            selector: id === null ? {} : (_a = {}, _a[parent ? "#parent" : "_id"] = id, _a),
                            sort: [{ timestamp: "asc" }],
                            limit: 2147483647 /* 32-bit INT_MAX */
                        })];
                    case 1: return [2 /*return*/, (_b.sent()).docs.map(function (doc) { return ({
                            id: doc._id
                        }); })];
                }
            });
        });
    };
    // eslint-disable-next-line
    ParticipantRepository.prototype._insert = function (study_id, object) {
        return __awaiter(this, void 0, void 0, function () {
            var _id, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _id = (0, Bootstrap_1.numeric_uuid)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Bootstrap_1.Database.use("participant").insert({
                                _id: _id,
                                "#parent": study_id,
                                timestamp: new Date().getTime()
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.error(e_1);
                        throw new Error("500.participant-creation-failed");
                    case 4: return [2 /*return*/, { id: _id }];
                }
            });
        });
    };
    // eslint-disable-next-line
    ParticipantRepository.prototype._update = function (participant_id, object) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("503.unimplemented");
            });
        });
    };
    ParticipantRepository.prototype._delete = function (participant_id) {
        return __awaiter(this, void 0, void 0, function () {
            var orig, data, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Bootstrap_1.Database.use("participant").get(participant_id)];
                    case 1:
                        orig = _a.sent();
                        return [4 /*yield*/, Bootstrap_1.Database.use("participant").bulk({
                                docs: [__assign(__assign({}, orig), { _deleted: true })]
                            })];
                    case 2:
                        data = _a.sent();
                        if (data.filter(function (x) { return !!x.error; }).length > 0)
                            throw new Error();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        console.error(e_2);
                        throw new Error("500.deletion-failed");
                    case 4: return [2 /*return*/, {}];
                }
            });
        });
    };
    /**  get Participants. There would be a need for pagination of the data. So, its seperately written
     *
     * @param id
     * @param parent
     * @returns Array Participant[]
     */
    ParticipantRepository.prototype._lookup = function (id, parent) {
        if (parent === void 0) { parent = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.Database.use("participant").find({
                            selector: id === null ? {} : (_a = {}, _a[parent ? "#parent" : "_id"] = id, _a),
                            sort: [{ timestamp: "asc" }],
                            limit: 2147483647 /* 32-bit INT_MAX */
                        })];
                    case 1: return [2 /*return*/, (_b.sent()).docs.map(function (doc) { return ({
                            id: doc._id,
                            study_id: doc["#parent"]
                        }); })];
                }
            });
        });
    };
    return ParticipantRepository;
}());
exports.ParticipantRepository = ParticipantRepository;
