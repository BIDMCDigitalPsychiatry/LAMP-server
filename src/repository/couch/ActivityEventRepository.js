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
exports.ActivityEventRepository = void 0;
var Bootstrap_1 = require("../Bootstrap");
var ActivityEventRepository = /** @class */ (function () {
    function ActivityEventRepository() {
    }
    ActivityEventRepository.prototype._select = function (id, ignore_binary, activity_id_or_spec, from_date, to_date, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var all_res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.Database.use("activity_event").find({
                            selector: {
                                "#parent": id,
                                activity: activity_id_or_spec,
                                timestamp: from_date === undefined && to_date === undefined
                                    ? undefined
                                    : {
                                        $gte: from_date,
                                        $lt: from_date === to_date ? to_date + 1 : to_date
                                    }
                            },
                            sort: [
                                {
                                    timestamp: !!limit && limit < 0 ? "asc" : "desc"
                                },
                            ],
                            limit: Math.abs(limit !== null && limit !== void 0 ? limit : 1)
                        })];
                    case 1:
                        all_res = (_a.sent()).docs.map(function (x) {
                            var _a, _b;
                            delete x._id, x._rev, x["#parent"];
                            // Embedded binary audio data is excluded for performance reasons
                            if (!!ignore_binary) {
                                if (/^data:audio.+/.test((_a = x.static_data) === null || _a === void 0 ? void 0 : _a.url))
                                    (_b = x.static_data) === null || _b === void 0 ? true : delete _b.url;
                            }
                            return x;
                        });
                        return [2 /*return*/, all_res];
                }
            });
        });
    };
    ActivityEventRepository.prototype._insert = function (participant_id, objects) {
        return __awaiter(this, void 0, void 0, function () {
            var data, output;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_1.Database.use("activity_event").bulk({
                            docs: objects.map(function (x) {
                                var _a, _b, _c, _d;
                                return ({
                                    "#parent": participant_id,
                                    timestamp: (_a = Number.parse(x.timestamp)) !== null && _a !== void 0 ? _a : 0,
                                    duration: (_b = Number.parse(x.duration)) !== null && _b !== void 0 ? _b : 0,
                                    activity: String(x.activity),
                                    static_data: (_c = x.static_data) !== null && _c !== void 0 ? _c : {},
                                    temporal_slices: (_d = x.temporal_slices) !== null && _d !== void 0 ? _d : []
                                });
                            })
                        })];
                    case 1:
                        data = _a.sent();
                        output = data.filter(function (x) { return !!x.error; });
                        if (output.length > 0)
                            console.error(output);
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    return ActivityEventRepository;
}());
exports.ActivityEventRepository = ActivityEventRepository;
