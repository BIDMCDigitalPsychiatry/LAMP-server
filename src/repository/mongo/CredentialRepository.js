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
exports.CredentialRepository = void 0;
var Bootstrap_1 = require("../Bootstrap");
var Bootstrap_2 = require("../Bootstrap");
var mongodb_1 = require("mongodb");
var CredentialRepository = /** @class */ (function () {
    function CredentialRepository() {
    }
    // if used with secret_key, will throw error if mismatch, else, will return confirmation of existence
    CredentialRepository.prototype._find = function (access_key, secret_key) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential")
                            .find({ _deleted: false, access_key: access_key })
                            .limit(2147483647)
                            .maxTimeMS(60000)
                            .toArray()];
                    case 1:
                        res = (_a.sent()).filter(function (x) { return (!!secret_key ? (0, Bootstrap_1.Decrypt)(x.secret_key, "AES256") === secret_key : true); });
                        if (res.length !== 0)
                            return [2 /*return*/, res[0].origin];
                        throw new Error("403.no-such-credentials");
                }
            });
        });
    };
    CredentialRepository.prototype._select = function (type_id) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential")
                            .find({ _deleted: false, origin: type_id })
                            .limit(2147483647)
                            .maxTimeMS(60000)
                            .toArray()];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res.map(function (x) { return (__assign(__assign({}, x), { secret_key: null, _id: undefined, _deleted: undefined })); })];
                }
            });
        });
    };
    CredentialRepository.prototype._insert = function (type_id, credential) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (credential.origin === "me" || credential.origin === null) {
                            // FIXME: context substitution doesn't actually work within the object here, so do it manually.
                            credential.origin = type_id;
                        }
                        // Verify this is "our" credential correctly
                        if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
                            throw new Error("400.malformed-credential-object");
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential").findOne({
                                _deleted: false,
                                access_key: credential.access_key
                            })];
                    case 1:
                        res = _a.sent();
                        if (res !== null)
                            throw new Error("403.access-key-already-in-use");
                        //save Credential via Credential model
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential").insert({
                                _id: new mongodb_1.ObjectID(),
                                origin: credential.origin,
                                access_key: credential.access_key,
                                secret_key: (0, Bootstrap_1.Encrypt)(credential.secret_key, "AES256"),
                                description: credential.description,
                                _deleted: false
                            })];
                    case 2:
                        //save Credential via Credential model
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    CredentialRepository.prototype._update = function (type_id, access_key, credential) {
        return __awaiter(this, void 0, void 0, function () {
            var res, oldCred;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential").findOne({ origin: type_id, access_key: access_key })];
                    case 1:
                        res = _a.sent();
                        if (res === null)
                            throw new Error("404.no-such-credentials");
                        oldCred = res._id;
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential").findOneAndUpdate({ _id: oldCred }, {
                                $set: {
                                    secret_key: !!credential.secret_key ? (0, Bootstrap_1.Encrypt)(credential.secret_key, "AES256") : res.secret_key,
                                    description: !!credential.description ? credential.description : res.description
                                }
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    CredentialRepository.prototype._delete = function (type_id, access_key) {
        return __awaiter(this, void 0, void 0, function () {
            var res, oldCred;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential").findOne({ origin: type_id, access_key: access_key })];
                    case 1:
                        res = _a.sent();
                        if (res === null)
                            throw new Error("404.no-such-credentials");
                        oldCred = res._id;
                        return [4 /*yield*/, Bootstrap_2.MongoClientDB.collection("credential").findOneAndUpdate({ _id: oldCred }, { $set: { _deleted: true } })
                            // await CredentialModel.deleteOne({ _id: oldCred })
                        ];
                    case 2:
                        _a.sent();
                        // await CredentialModel.deleteOne({ _id: oldCred })
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    return CredentialRepository;
}());
exports.CredentialRepository = CredentialRepository;
