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
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
exports.__esModule = true;
exports.RedisFactory = exports.Repository = exports.Bootstrap = exports.Decrypt = exports.Encrypt = exports.numeric_uuid = exports.uuid = exports.Database = exports.ApiResponseHeaders = exports.MongoClientDB = exports.nc = exports.RedisClient = void 0;
var nano_1 = require("nano");
var crypto_1 = require("crypto");
var nanoid_1 = require("nanoid");
var ts_nats_1 = require("ts-nats");
var mongodb_1 = require("mongodb");
var couch_1 = require("./couch");
var mongo_1 = require("./mongo");
var ioredis = require("ioredis");
var Queue_1 = require("../utils/queue/Queue");
exports.RedisClient = new ioredis.Redis();
exports.ApiResponseHeaders = {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'",
    "X-XSS-Protection": " 1; mode=block",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "deny",
    "Strict-Transport-Security": "max-age=31536000; includeSubdomains"
};
//initialize driver for db
var DB_DRIVER = "";
//Identifying the Database driver -- IF the DB in env starts with mongodb://, create mongodb connection
//--ELSEIF the DB/CDB in env starts with http or https, create couch db connection
if ((_a = process.env.DB) === null || _a === void 0 ? void 0 : _a.startsWith("mongodb://")) {
    DB_DRIVER = "mongodb";
}
else if (((_b = process.env.DB) === null || _b === void 0 ? void 0 : _b.startsWith("http")) || ((_c = process.env.DB) === null || _c === void 0 ? void 0 : _c.startsWith("https"))) {
    DB_DRIVER = "couchdb";
    console.log("COUCHDB adapter in use ");
}
else {
    if (((_d = process.env.CDB) === null || _d === void 0 ? void 0 : _d.startsWith("http")) || ((_e = process.env.CDB) === null || _e === void 0 ? void 0 : _e.startsWith("https"))) {
        DB_DRIVER = "couchdb";
        console.log("COUCHDB adapter in use ");
    }
    else {
        console.log("Missing repository adapter.");
    }
}
//IF the DB/CDB in env starts with http or https, create and export couch db connection
exports.Database = ((_f = process.env.DB) === null || _f === void 0 ? void 0 : _f.startsWith("http")) || ((_g = process.env.DB) === null || _g === void 0 ? void 0 : _g.startsWith("https"))
    ? (0, nano_1["default"])((_h = process.env.DB) !== null && _h !== void 0 ? _h : "")
    : ((_j = process.env.CDB) === null || _j === void 0 ? void 0 : _j.startsWith("http")) || ((_k = process.env.CDB) === null || _k === void 0 ? void 0 : _k.startsWith("https"))
        ? (0, nano_1["default"])((_l = process.env.CDB) !== null && _l !== void 0 ? _l : "")
        : "";
exports.uuid = (0, nanoid_1.customAlphabet)("1234567890abcdefghjkmnpqrstvwxyz", 20);
var numeric_uuid = function () { return "U".concat(Math.random().toFixed(10).slice(2, 12)); };
exports.numeric_uuid = numeric_uuid;
//Initialize redis client for cacheing purpose
/**
 * If the data could not be encrypted or is invalid, returns `undefined`.
 */
var Encrypt = function (data, mode) {
    if (mode === void 0) { mode = "Rijndael"; }
    try {
        if (mode === "Rijndael") {
            var cipher = crypto_1["default"].createCipheriv("aes-256-ecb", process.env.DB_KEY || "", "");
            return cipher.update(data, "utf8", "base64") + cipher.final("base64");
        }
        else if (mode === "AES256") {
            var ivl = crypto_1["default"].randomBytes(16);
            var cipher = crypto_1["default"].createCipheriv("aes-256-cbc", Buffer.from(process.env.ROOT_KEY || "", "hex"), ivl);
            return Buffer.concat([ivl, cipher.update(Buffer.from(data, "utf16le")), cipher.final()]).toString("base64");
        }
    }
    catch (_a) { }
    return undefined;
};
exports.Encrypt = Encrypt;
/**
 * If the data could not be decrypted or is invalid, returns `undefined`.
 */
var Decrypt = function (data, mode) {
    if (mode === void 0) { mode = "Rijndael"; }
    try {
        if (mode === "Rijndael") {
            var cipher = crypto_1["default"].createDecipheriv("aes-256-ecb", process.env.DB_KEY || "", "");
            return cipher.update(data, "base64", "utf8") + cipher.final("utf8");
        }
        else if (mode === "AES256") {
            var dat = Buffer.from(data, "base64");
            var cipher = crypto_1["default"].createDecipheriv("aes-256-cbc", Buffer.from(process.env.ROOT_KEY || "", "hex"), dat.slice(0, 16));
            return Buffer.concat([cipher.update(dat.slice(16)), cipher.final()]).toString("utf16le");
        }
    }
    catch (_a) { }
    return undefined;
};
exports.Decrypt = Decrypt;
// Initialize the CouchDB databases if any of them do not exist.
function Bootstrap() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var _db_list, p, e_1, client, error_1, db, error_2, DBs, dbs, _i, DBs_1, db, database, database, database, database, database, database, database, database, database, database, database, p, error_3;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (typeof process.env.REDIS_HOST === "string") {
                        try {
                            exports.RedisClient = RedisFactory.getInstance();
                            console.log("Trying to connect redis");
                            exports.RedisClient.on("connect", function () {
                                console.log("Connected to redis");
                                (0, Queue_1.initializeQueues)();
                            });
                            exports.RedisClient.on("error", function (err) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.log("redis connection error", err);
                                    exports.RedisClient = RedisFactory.getInstance();
                                    return [2 /*return*/];
                                });
                            }); });
                            exports.RedisClient.on("disconnected", function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.log("redis disconnected");
                                    exports.RedisClient = RedisFactory.getInstance();
                                    return [2 /*return*/];
                                });
                            }); });
                        }
                        catch (err) {
                            console.log("Error initializing redis", err);
                        }
                    }
                    return [4 /*yield*/, NatsConnect()];
                case 1:
                    _c.sent();
                    if (!(DB_DRIVER === "couchdb")) return [3 /*break*/, 28];
                    console.group("Initializing database connection...");
                    return [4 /*yield*/, exports.Database.db.list()];
                case 2:
                    _db_list = _c.sent();
                    if (!!_db_list.includes("activity_spec")) return [3 /*break*/, 4];
                    console.log("Initializing ActivitySpec database...");
                    return [4 /*yield*/, exports.Database.db.create("activity_spec")];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    console.log("ActivitySpec database online.");
                    if (!!_db_list.includes("sensor_spec")) return [3 /*break*/, 6];
                    console.log("Initializing SensorSpec database...");
                    return [4 /*yield*/, exports.Database.db.create("sensor_spec")];
                case 5:
                    _c.sent();
                    _c.label = 6;
                case 6:
                    console.log("SensorSpec database online.");
                    if (!!_db_list.includes("researcher")) return [3 /*break*/, 8];
                    console.log("Initializing Researcher database...");
                    return [4 /*yield*/, exports.Database.db.create("researcher")];
                case 7:
                    _c.sent();
                    exports.Database.use("researcher").bulk({
                        docs: [
                            {
                                _id: "_design/timestamp-index",
                                language: "query",
                                views: {
                                    timestamp: {
                                        map: {
                                            fields: {
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/parent-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/id-parent-timestamp-index",
                                language: "query",
                                views: {
                                    "id-parent-timestamp": {
                                        map: {
                                            fields: {
                                                _id: "asc",
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["_id", "#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 8;
                case 8:
                    console.log("Researcher database online.");
                    if (!!_db_list.includes("study")) return [3 /*break*/, 10];
                    console.log("Initializing Study database...");
                    return [4 /*yield*/, exports.Database.db.create("study")];
                case 9:
                    _c.sent();
                    exports.Database.use("study").bulk({
                        docs: [
                            {
                                _id: "_design/timestamp-index",
                                language: "query",
                                views: {
                                    timestamp: {
                                        map: {
                                            fields: {
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/parent-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/id-parent-timestamp-index",
                                language: "query",
                                views: {
                                    "id-parent-timestamp": {
                                        map: {
                                            fields: {
                                                _id: "asc",
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["_id", "#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 10;
                case 10:
                    console.log("Study database online.");
                    if (!!_db_list.includes("participant")) return [3 /*break*/, 12];
                    console.log("Initializing Participant database...");
                    return [4 /*yield*/, exports.Database.db.create("participant")];
                case 11:
                    _c.sent();
                    exports.Database.use("participant").bulk({
                        docs: [
                            {
                                _id: "_design/timestamp-index",
                                language: "query",
                                views: {
                                    timestamp: {
                                        map: {
                                            fields: {
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/parent-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/id-parent-timestamp-index",
                                language: "query",
                                views: {
                                    "id-parent-timestamp": {
                                        map: {
                                            fields: {
                                                _id: "asc",
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["_id", "#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 12;
                case 12:
                    console.log("Participant database online.");
                    if (!!_db_list.includes("activity")) return [3 /*break*/, 14];
                    console.log("Initializing Activity database...");
                    return [4 /*yield*/, exports.Database.db.create("activity")];
                case 13:
                    _c.sent();
                    exports.Database.use("activity").bulk({
                        docs: [
                            {
                                _id: "_design/timestamp-index",
                                language: "query",
                                views: {
                                    timestamp: {
                                        map: {
                                            fields: {
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/parent-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/id-parent-timestamp-index",
                                language: "query",
                                views: {
                                    "id-parent-timestamp": {
                                        map: {
                                            fields: {
                                                _id: "asc",
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["_id", "#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/id-timestamp-index",
                                language: "query",
                                views: {
                                    "id-timestamp": {
                                        map: {
                                            fields: {
                                                _id: "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["_id", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 14;
                case 14:
                    console.log("Activity database online.");
                    if (!!_db_list.includes("sensor")) return [3 /*break*/, 16];
                    console.log("Initializing Sensor database...");
                    return [4 /*yield*/, exports.Database.db.create("sensor")];
                case 15:
                    _c.sent();
                    exports.Database.use("sensor").bulk({
                        docs: [
                            {
                                _id: "_design/timestamp-index",
                                language: "query",
                                views: {
                                    timestamp: {
                                        map: {
                                            fields: {
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/parent-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/id-parent-timestamp-index",
                                language: "query",
                                views: {
                                    "id-parent-timestamp": {
                                        map: {
                                            fields: {
                                                _id: "asc",
                                                "#parent": "asc",
                                                timestamp: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["_id", "#parent", "timestamp"]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 16;
                case 16:
                    console.log("Sensor database online.");
                    if (!!_db_list.includes("activity_event")) return [3 /*break*/, 18];
                    console.log("Initializing ActivityEvent database...");
                    return [4 /*yield*/, exports.Database.db.create("activity_event")];
                case 17:
                    _c.sent();
                    exports.Database.use("activity_event").bulk({
                        docs: [
                            {
                                _id: "_design/parent-activity-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-activity-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "desc",
                                                activity: "desc",
                                                timestamp: "desc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: [
                                                    {
                                                        "#parent": "desc"
                                                    },
                                                    {
                                                        activity: "desc"
                                                    },
                                                    {
                                                        timestamp: "desc"
                                                    },
                                                ]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/parent-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "desc",
                                                timestamp: "desc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: [
                                                    {
                                                        "#parent": "desc"
                                                    },
                                                    {
                                                        timestamp: "desc"
                                                    },
                                                ]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 18;
                case 18:
                    console.log("ActivityEvent database online.");
                    if (!!_db_list.includes("sensor_event")) return [3 /*break*/, 20];
                    console.log("Initializing SensorEvent database...");
                    return [4 /*yield*/, exports.Database.db.create("sensor_event")];
                case 19:
                    _c.sent();
                    exports.Database.use("sensor_event").bulk({
                        docs: [
                            {
                                _id: "_design/parent-sensor-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-sensor-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "desc",
                                                sensor: "desc",
                                                timestamp: "desc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: [
                                                    {
                                                        "#parent": "desc"
                                                    },
                                                    {
                                                        sensor: "desc"
                                                    },
                                                    {
                                                        timestamp: "desc"
                                                    },
                                                ]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/parent-timestamp-index",
                                language: "query",
                                views: {
                                    "parent-timestamp": {
                                        map: {
                                            fields: {
                                                "#parent": "desc",
                                                timestamp: "desc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: [
                                                    {
                                                        "#parent": "desc"
                                                    },
                                                    {
                                                        timestamp: "desc"
                                                    },
                                                ]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 20;
                case 20:
                    console.log("SensorEvent database online.");
                    if (!!_db_list.includes("credential")) return [3 /*break*/, 25];
                    console.log("Initializing Credential database...");
                    return [4 /*yield*/, exports.Database.db.create("credential")];
                case 21:
                    _c.sent();
                    exports.Database.use("credential").bulk({
                        docs: [
                            {
                                _id: "_design/access_key-index",
                                language: "query",
                                views: {
                                    access_key: {
                                        map: {
                                            fields: {
                                                access_key: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["access_key"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/origin-index",
                                language: "query",
                                views: {
                                    origin: {
                                        map: {
                                            fields: {
                                                origin: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["origin"]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                _id: "_design/origin-access_key-index",
                                language: "query",
                                views: {
                                    "origin-access_key": {
                                        map: {
                                            fields: {
                                                origin: "asc",
                                                access_key: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["origin", "access_key"]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    console.dir("An initial administrator password was generated and saved for this installation.");
                    _c.label = 22;
                case 22:
                    _c.trys.push([22, 24, , 25]);
                    p = crypto_1["default"].randomBytes(32).toString("hex");
                    console.table({ "Administrator Password": p });
                    return [4 /*yield*/, exports.Database.use("credential").insert({
                            origin: null,
                            access_key: "admin",
                            secret_key: (0, exports.Encrypt)(p, "AES256"),
                            description: "System Administrator Credential"
                        })];
                case 23:
                    _c.sent();
                    return [3 /*break*/, 25];
                case 24:
                    e_1 = _c.sent();
                    console.dir(e_1);
                    return [3 /*break*/, 25];
                case 25:
                    console.log("Credential database online.");
                    if (!!_db_list.includes("tag")) return [3 /*break*/, 27];
                    console.log("Initializing Tag database...");
                    return [4 /*yield*/, exports.Database.db.create("tag")];
                case 26:
                    _c.sent();
                    exports.Database.use("tag").bulk({
                        docs: [
                            {
                                _id: "_design/parent-type-key-index",
                                language: "query",
                                views: {
                                    "parent-type-key": {
                                        map: {
                                            fields: {
                                                "#parent": "asc",
                                                type: "asc",
                                                key: "asc"
                                            },
                                            partial_filter_selector: {}
                                        },
                                        reduce: "_count",
                                        options: {
                                            def: {
                                                fields: ["#parent", "type", "key"]
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    });
                    _c.label = 27;
                case 27:
                    console.log("Tag database online.");
                    console.groupEnd();
                    console.log("Database verification complete.");
                    return [3 /*break*/, 98];
                case 28:
                    client = new mongodb_1.MongoClient("".concat(process.env.DB), {
                        useNewUrlParser: true,
                        useUnifiedTopology: true
                    });
                    _c.label = 29;
                case 29:
                    _c.trys.push([29, 31, , 32]);
                    return [4 /*yield*/, client.connect()];
                case 30:
                    _c.sent();
                    return [3 /*break*/, 32];
                case 31:
                    error_1 = _c.sent();
                    console.dir(error_1);
                    return [3 /*break*/, 32];
                case 32:
                    _c.trys.push([32, 36, , 37]);
                    console.group("Initializing database connection...");
                    if (!client.isConnected()) return [3 /*break*/, 34];
                    db = (_b = (_a = process.env.DB) === null || _a === void 0 ? void 0 : _a.split("/").reverse()[0]) === null || _b === void 0 ? void 0 : _b.split("?")[0];
                    return [4 /*yield*/, (client === null || client === void 0 ? void 0 : client.db(db))];
                case 33:
                    exports.MongoClientDB = _c.sent();
                    return [3 /*break*/, 35];
                case 34:
                    console.log("Database connection failed.");
                    _c.label = 35;
                case 35: return [3 /*break*/, 37];
                case 36:
                    error_2 = _c.sent();
                    console.log("Database connection failed.");
                    return [3 /*break*/, 37];
                case 37:
                    if (!!!exports.MongoClientDB) return [3 /*break*/, 97];
                    console.group("MONGODB adapter in use");
                    return [4 /*yield*/, exports.MongoClientDB.listCollections().toArray()];
                case 38:
                    DBs = _c.sent();
                    dbs = [];
                    _i = 0, DBs_1 = DBs;
                    _c.label = 39;
                case 39:
                    if (!(_i < DBs_1.length)) return [3 /*break*/, 42];
                    db = DBs_1[_i];
                    return [4 /*yield*/, dbs.push(db.name)];
                case 40:
                    _c.sent();
                    _c.label = 41;
                case 41:
                    _i++;
                    return [3 /*break*/, 39];
                case 42:
                    if (!!dbs.includes("activity_spec")) return [3 /*break*/, 46];
                    console.log("Initializing ActivitySpec database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("activity_spec")];
                case 43:
                    _c.sent();
                    return [4 /*yield*/, exports.MongoClientDB.collection("activity_spec")];
                case 44:
                    database = _c.sent();
                    return [4 /*yield*/, database.createIndex({ timestamp: 1 })];
                case 45:
                    _c.sent();
                    _c.label = 46;
                case 46:
                    console.log("ActivitySpec database online.");
                    if (!!dbs.includes("sensor_spec")) return [3 /*break*/, 50];
                    console.log("Initializing SensorSpec database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("sensor_spec")];
                case 47:
                    _c.sent();
                    return [4 /*yield*/, exports.MongoClientDB.collection("sensor_spec")];
                case 48:
                    database = _c.sent();
                    return [4 /*yield*/, database.createIndex({ timestamp: 1 })];
                case 49:
                    _c.sent();
                    _c.label = 50;
                case 50:
                    console.log("SensorSpec database online.");
                    if (!!dbs.includes("researcher")) return [3 /*break*/, 55];
                    console.log("Initializing Researcher database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("researcher")];
                case 51:
                    _c.sent();
                    database = exports.MongoClientDB.collection("researcher");
                    return [4 /*yield*/, database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })];
                case 52:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _parent: 1, timestamp: 1 })];
                case 53:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ timestamp: 1 })];
                case 54:
                    _c.sent();
                    _c.label = 55;
                case 55:
                    console.log("Researcher database online.");
                    if (!!dbs.includes("study")) return [3 /*break*/, 60];
                    console.log("Initializing Study database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("study")];
                case 56:
                    _c.sent();
                    database = exports.MongoClientDB.collection("study");
                    return [4 /*yield*/, database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })];
                case 57:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _parent: 1, timestamp: 1 })];
                case 58:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ timestamp: 1 })];
                case 59:
                    _c.sent();
                    _c.label = 60;
                case 60:
                    console.log("Study database online.");
                    if (!!dbs.includes("participant")) return [3 /*break*/, 65];
                    console.log("Initializing Participant database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("participant")];
                case 61:
                    _c.sent();
                    database = exports.MongoClientDB.collection("participant");
                    return [4 /*yield*/, database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })];
                case 62:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _parent: 1, timestamp: 1 })];
                case 63:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ timestamp: 1 })];
                case 64:
                    _c.sent();
                    _c.label = 65;
                case 65:
                    console.log("Participant database online.");
                    if (!!dbs.includes("activity")) return [3 /*break*/, 72];
                    console.log("Initializing Activity database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("activity")];
                case 66:
                    _c.sent();
                    return [4 /*yield*/, exports.MongoClientDB.collection("activity")];
                case 67:
                    database = _c.sent();
                    return [4 /*yield*/, database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })];
                case 68:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _parent: 1, timestamp: 1 })];
                case 69:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ timestamp: 1 })];
                case 70:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _id: 1, timestamp: 1 })];
                case 71:
                    _c.sent();
                    _c.label = 72;
                case 72:
                    console.log("Activity database online.");
                    if (!!dbs.includes("sensor")) return [3 /*break*/, 77];
                    console.log("Initializing Sensor database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("sensor")];
                case 73:
                    _c.sent();
                    database = exports.MongoClientDB.collection("sensor");
                    return [4 /*yield*/, database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })];
                case 74:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _parent: 1, timestamp: 1 })];
                case 75:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ timestamp: 1 })];
                case 76:
                    _c.sent();
                    _c.label = 77;
                case 77:
                    console.log("Sensor database online.");
                    if (!!dbs.includes("activity_event")) return [3 /*break*/, 81];
                    console.log("Initializing ActivityEvent database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("activity_event")];
                case 78:
                    _c.sent();
                    database = exports.MongoClientDB.collection("activity_event");
                    return [4 /*yield*/, database.createIndex({ _parent: -1, activity: -1, timestamp: -1 })];
                case 79:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _parent: -1, timestamp: -1 })];
                case 80:
                    _c.sent();
                    _c.label = 81;
                case 81:
                    console.log("ActivityEvent database online.");
                    if (!!dbs.includes("sensor_event")) return [3 /*break*/, 85];
                    console.log("Initializing SensorEvent database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("sensor_event")];
                case 82:
                    _c.sent();
                    database = exports.MongoClientDB.collection("sensor_event");
                    return [4 /*yield*/, database.createIndex({ _parent: -1, sensor: -1, timestamp: -1 })];
                case 83:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ _parent: -1, timestamp: -1 })];
                case 84:
                    _c.sent();
                    _c.label = 85;
                case 85:
                    console.log("SensorEvent database online.");
                    if (!!dbs.includes("tag")) return [3 /*break*/, 88];
                    console.log("Initializing Tag database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("tag")];
                case 86:
                    _c.sent();
                    database = exports.MongoClientDB.collection("tag");
                    return [4 /*yield*/, database.createIndex({ _parent: 1, type: 1, key: 1 })];
                case 87:
                    _c.sent();
                    _c.label = 88;
                case 88:
                    console.log("Tag database online.");
                    if (!!dbs.includes("credential")) return [3 /*break*/, 96];
                    console.log("Initializing Credential database...");
                    return [4 /*yield*/, exports.MongoClientDB.createCollection("credential")];
                case 89:
                    _c.sent();
                    database = exports.MongoClientDB.collection("credential");
                    return [4 /*yield*/, database.createIndex({ access_key: 1 })];
                case 90:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ origin: 1 })];
                case 91:
                    _c.sent();
                    return [4 /*yield*/, database.createIndex({ origin: 1, access_key: 1 })];
                case 92:
                    _c.sent();
                    console.dir("An initial administrator password was generated and saved for this installation.");
                    _c.label = 93;
                case 93:
                    _c.trys.push([93, 95, , 96]);
                    p = crypto_1["default"].randomBytes(32).toString("hex");
                    console.table({ "Administrator Password": p });
                    return [4 /*yield*/, database.insertOne({
                            _id: new mongodb_1.ObjectID(),
                            origin: null,
                            access_key: "admin",
                            secret_key: (0, exports.Encrypt)(p, "AES256"),
                            description: "System Administrator Credential",
                            _deleted: false
                        })];
                case 94:
                    _c.sent();
                    return [3 /*break*/, 96];
                case 95:
                    error_3 = _c.sent();
                    console.log(error_3);
                    return [3 /*break*/, 96];
                case 96:
                    console.log("Credential database online.");
                    console.groupEnd();
                    console.groupEnd();
                    console.log("Database verification complete.");
                    return [3 /*break*/, 98];
                case 97:
                    console.groupEnd();
                    console.log("Database verification failed.");
                    _c.label = 98;
                case 98: return [2 /*return*/];
            }
        });
    });
}
exports.Bootstrap = Bootstrap;
/**
 * nats connect
 */
function NatsConnect() {
    return __awaiter(this, void 0, void 0, function () {
        var intervalId;
        var _this = this;
        return __generator(this, function (_a) {
            intervalId = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                var error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, ts_nats_1.connect)({
                                    servers: ["".concat(process.env.NATS_SERVER)],
                                    payload: ts_nats_1.Payload.JSON,
                                    maxReconnectAttempts: -1,
                                    reconnect: true,
                                    reconnectTimeWait: 2000
                                })];
                        case 1:
                            exports.nc = _a.sent();
                            clearInterval(intervalId);
                            console.log("Connected to nats pub server");
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _a.sent();
                            console.log("Error in Connecting to nats pub server");
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); }, 3000);
            return [2 /*return*/];
        });
    });
}
/**
 * GET THE REPOSITORY TO USE(Mongo/Couch)
 */
var Repository = /** @class */ (function () {
    function Repository() {
    }
    //GET Researcher Repository
    Repository.prototype.getResearcherRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.ResearcherRepository() : new mongo_1.ResearcherRepository();
    };
    //GET Study Repository
    Repository.prototype.getStudyRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.StudyRepository() : new mongo_1.StudyRepository();
    };
    //GET Participant Repository
    Repository.prototype.getParticipantRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.ParticipantRepository() : new mongo_1.ParticipantRepository();
    };
    //GET Activity Repository
    Repository.prototype.getActivityRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.ActivityRepository() : new mongo_1.ActivityRepository();
    };
    //GET Activity Repository
    Repository.prototype.getSensorRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.SensorRepository() : new mongo_1.SensorRepository();
    };
    //GET ActivityEvent Repository
    Repository.prototype.getActivityEventRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.ActivityEventRepository() : new mongo_1.ActivityEventRepository();
    };
    //GET SensorEvent Repository
    Repository.prototype.getSensorEventRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.SensorEventRepository() : new mongo_1.SensorEventRepository();
    };
    //GET ActivitySpec Repository
    Repository.prototype.getActivitySpecRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.ActivitySpecRepository() : new mongo_1.ActivitySpecRepository();
    };
    //GET SensorSpec Repository
    Repository.prototype.getSensorSpecRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.SensorSpecRepository() : new mongo_1.SensorSpecRepository();
    };
    //GET Credential Repository
    Repository.prototype.getCredentialRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.CredentialRepository() : new mongo_1.CredentialRepository();
    };
    //GET TypeRepository Repository
    Repository.prototype.getTypeRepository = function () {
        return DB_DRIVER === "couchdb" ? new couch_1.TypeRepository() : new mongo_1.TypeRepository();
    };
    return Repository;
}());
exports.Repository = Repository;
/**
 * Creating singleton class for redis
*/
var RedisFactory = /** @class */ (function () {
    function RedisFactory() {
    }
    /**
     * @returns redis client instance
    */
    RedisFactory.getInstance = function () {
        var _a, _b;
        if (this.instance === undefined) {
            this.instance = new ioredis.Redis(parseInt("".concat((_a = process.env.REDIS_HOST.match(/([0-9]+)/g)) === null || _a === void 0 ? void 0 : _a[0])), (_b = process.env.REDIS_HOST.match(/\/\/([0-9a-zA-Z._]+)/g)) === null || _b === void 0 ? void 0 : _b[0], {
                reconnectOnError: function () {
                    return 1;
                },
                enableReadyCheck: true
            });
        }
        return this.instance;
    };
    return RedisFactory;
}());
exports.RedisFactory = RedisFactory;
