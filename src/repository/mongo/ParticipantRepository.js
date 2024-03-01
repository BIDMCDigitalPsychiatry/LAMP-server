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
exports.ParticipantRepository = void 0;
var Bootstrap_1 = require("../Bootstrap");
var Bootstrap_2 = require("../Bootstrap");
var ParticipantRepository = /** @class */ (function () {
    function ParticipantRepository() {
    }
    ParticipantRepository.prototype._select = function (id, parent) {
        if (parent === void 0) { parent = false; }
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant")
                            .find(!!id ? (parent ? { _parent: id, _deleted: false } : { _id: id, _deleted: false }) : { _deleted: false })
                            .sort({ timestamp: 1 })
                            .limit(2147483647)
                            .maxTimeMS(60000)
                            .toArray()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.map(function (x) { return ({
                                id: x._id
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
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant").insertOne({
                                _id: _id,
                                _parent: study_id,
                                timestamp: new Date().getTime(),
                                _deleted: false
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
            var e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant").updateOne({ _id: participant_id }, { $set: { _deleted: true } })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_2 = _a.sent();
                        console.error(e_2);
                        throw new Error("500.deletion-failed");
                    case 3: return [2 /*return*/, {}];
                }
            });
        });
    };
    /** get Participants. There would be a need for pagination of the data. So, its seperately written
     *
     * @param id
     * @param parent
     * @returns Array Participant[]
     */
    ParticipantRepository.prototype._lookup = function (id, parent) {
        if (parent === void 0) { parent = false; }
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("participant")
                            .aggregate([
                            parent
                                ? { $match: !!id ? { _parent: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } }
                                : { $match: !!id ? { _id: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } },
                            { $project: { _parent: 1 } },
                            { $sort: { timestamp: 1 } },
                            { $limit: 2147483647 },
                        ])
                            .maxTimeMS(120000)
                            .toArray()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.map(function (x) { return ({
                                id: x._id,
                                study_id: x._parent,
                                _deleted: undefined,
                                _parent: undefined
                            }); })];
                }
            });
        });
    };
    return ParticipantRepository;
}());
exports.ParticipantRepository = ParticipantRepository;
