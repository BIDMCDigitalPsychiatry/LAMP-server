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
exports.PubSubAPIListenerQueueProcess = void 0;
var Bootstrap_1 = require("../../repository/Bootstrap");
var async_mutex_1 = require("async-mutex");
var clientLock = new async_mutex_1.Mutex();
/** Queue Process
 *
 * @param job
 */
function PubSubAPIListenerQueueProcess(job, done) {
    return __awaiter(this, void 0, void 0, function () {
        var publishStatus, repo, TypeRepository, maxPayloadSize, parent_1, error_1, parent_2, error_2, parent_3, error_3, parent_4, error_4, repo_1, ActivityRepository, _i, _a, payload, release, Data, activity_detail, size, dataNew, error_5, _b, _c, payload, release, Data, inputSensor, sensor_, size, dataNew, error_6, release, Data, size, dataNew, _d, error_7, error_8;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    publishStatus = true;
                    repo = new Bootstrap_1.Repository();
                    TypeRepository = repo.getTypeRepository();
                    maxPayloadSize = 10000000 //1047846
                    ;
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 60, , 61]);
                    if (!((job.data.topic === "study.*.participant" ||
                        job.data.topic === "participant.*" ||
                        job.data.topic === "participant") &&
                        job.data.payload.action === "update")) return [3 /*break*/, 5];
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, TypeRepository._parent(job.data.payload.participant_id)];
                case 3:
                    parent_1 = _e.sent();
                    job.data.payload.study_id = parent_1["Study"];
                    //form the token for the consumer
                    job.data.token = "study.".concat(parent_1["Study"], ".participant.").concat(job.data.payload.participant_id);
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _e.sent();
                    publishStatus = false;
                    console.log("Error fetching Study");
                    return [3 /*break*/, 5];
                case 5:
                    if (!((job.data.topic === "study" || job.data.topic === "study.*" || job.data.topic === "researcher.*.study") &&
                        job.data.payload.action === "update")) return [3 /*break*/, 9];
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, TypeRepository._parent(job.data.payload.study_id)];
                case 7:
                    parent_2 = _e.sent();
                    job.data.payload.researcher_id = parent_2["Researcher"];
                    //form the token for the consumer
                    job.data.token = "researcher.".concat(parent_2["Researcher"], ".study.").concat(job.data.payload.study_id);
                    return [3 /*break*/, 9];
                case 8:
                    error_2 = _e.sent();
                    publishStatus = false;
                    console.log("Error fetching participants");
                    return [3 /*break*/, 9];
                case 9:
                    if (!((job.data.topic === "activity" || job.data.topic === "activity.*" || job.data.topic === "study.*.activity") &&
                        job.data.payload.action === "update")) return [3 /*break*/, 13];
                    _e.label = 10;
                case 10:
                    _e.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, TypeRepository._parent(job.data.payload.activity_id)];
                case 11:
                    parent_3 = _e.sent();
                    job.data.payload.study_id = parent_3["Study"];
                    //form the token for the consumer
                    job.data.token = "study.".concat(parent_3["Study"], ".activity.").concat(job.data.payload.activity_id);
                    return [3 /*break*/, 13];
                case 12:
                    error_3 = _e.sent();
                    publishStatus = false;
                    console.log("Error fetching Study");
                    return [3 /*break*/, 13];
                case 13:
                    if (!((job.data.topic === "sensor" || job.data.topic === "sensor.*" || job.data.topic === "study.*.sensor") &&
                        job.data.payload.action === "update")) return [3 /*break*/, 17];
                    _e.label = 14;
                case 14:
                    _e.trys.push([14, 16, , 17]);
                    return [4 /*yield*/, TypeRepository._parent(job.data.payload.sensor_id)];
                case 15:
                    parent_4 = _e.sent();
                    job.data.payload.study_id = parent_4["Study"];
                    //form the token for the consumer
                    job.data.token = "study.".concat(parent_4["Study"], ".sensor.").concat(job.data.payload.sensor_id);
                    return [3 /*break*/, 17];
                case 16:
                    error_4 = _e.sent();
                    publishStatus = false;
                    console.log("Error fetching Study");
                    return [3 /*break*/, 17];
                case 17:
                    if (!(job.data.topic === "activity_event" ||
                        job.data.topic === "participant.*.activity_event" ||
                        job.data.topic === "activity.*.activity_event" ||
                        job.data.topic === "participant.*.activity.*.activity_event")) return [3 /*break*/, 29];
                    repo_1 = new Bootstrap_1.Repository();
                    ActivityRepository = repo_1.getActivityRepository();
                    _i = 0, _a = job.data.payload;
                    _e.label = 18;
                case 18:
                    if (!(_i < _a.length)) return [3 /*break*/, 28];
                    payload = _a[_i];
                    return [4 /*yield*/, clientLock.acquire()];
                case 19:
                    release = _e.sent();
                    _e.label = 20;
                case 20:
                    _e.trys.push([20, 26, , 27]);
                    Data = {};
                    payload.topic = job.data.topic;
                    payload.participant_id = job.data.participant_id;
                    payload.action = job.data.action;
                    return [4 /*yield*/, ActivityRepository._select(payload.activity, false, true)];
                case 21:
                    activity_detail = _e.sent();
                    if (activity_detail.length !== 0) {
                        payload.static_data =
                            !!activity_detail[0].spec && activity_detail[0].spec === "lamp.recording"
                                ? undefined
                                : payload.static_data;
                    }
                    Data.data = JSON.stringify(payload);
                    //form the token for the consumer
                    Data.token = "activity.".concat(payload.activity, ".participant.").concat(job.data.participant_id);
                    size = Buffer.byteLength(Data.data);
                    if (!(size > maxPayloadSize)) return [3 /*break*/, 23];
                    console.log('size > maxPayloadSize ae', size);
                    dataNew = {};
                    dataNew.data = JSON.stringify({
                        activity: payload.activity,
                        subject_id: job.data.participant_id,
                        timestamp: job.data.timestamp
                    });
                    // throw new Error("Nats maximum payload error")
                    return [4 /*yield*/, publishIDs(job.data.topic, dataNew)];
                case 22:
                    // throw new Error("Nats maximum payload error")
                    _e.sent();
                    return [3 /*break*/, 25];
                case 23: 
                //publish activity_event data seperately
                return [4 /*yield*/, publishActivityEvent(payload.topic, Data)];
                case 24:
                    //publish activity_event data seperately
                    _e.sent();
                    _e.label = 25;
                case 25:
                    release();
                    return [3 /*break*/, 27];
                case 26:
                    error_5 = _e.sent();
                    release();
                    publishStatus = false;
                    console.log("activity_event_payload_size", Buffer.byteLength(JSON.stringify(payload)));
                    console.log("activity_event_payload", payload);
                    console.log(error_5);
                    return [3 /*break*/, 27];
                case 27:
                    _i++;
                    return [3 /*break*/, 18];
                case 28:
                    publishStatus = false;
                    _e.label = 29;
                case 29:
                    if (!(job.data.topic === "sensor_event" ||
                        job.data.topic === "participant.*.sensor_event" ||
                        job.data.topic === "sensor.*.sensor_event" ||
                        job.data.topic === "participant.*.sensor.*.sensor_event")) return [3 /*break*/, 40];
                    _b = 0, _c = job.data.payload;
                    _e.label = 30;
                case 30:
                    if (!(_b < _c.length)) return [3 /*break*/, 39];
                    payload = _c[_b];
                    return [4 /*yield*/, clientLock.acquire()];
                case 31:
                    release = _e.sent();
                    _e.label = 32;
                case 32:
                    _e.trys.push([32, 37, , 38]);
                    Data = {};
                    payload.topic = job.data.topic;
                    payload.action = job.data.action;
                    payload.participant_id = job.data.participant_id;
                    inputSensor = payload.sensor.split(".");
                    sensor_ = inputSensor[inputSensor.length - 1];
                    payload.sensor = sensor_;
                    Data.data = JSON.stringify(payload);
                    //form the token for the consumer
                    job.data.token = "sensor.".concat(sensor_, ".participant.").concat(payload.participant_id);
                    Data.token = job.data.token;
                    size = Buffer.byteLength(Data.data);
                    if (!(size > maxPayloadSize)) return [3 /*break*/, 34];
                    console.log('size > maxPayloadSize se', size);
                    dataNew = {};
                    dataNew.data = JSON.stringify({
                        subject_id: job.data.participant_id,
                        sensor: payload.sensor,
                        timestamp: job.data.timestamp
                    });
                    return [4 /*yield*/, publishIDs(job.data.topic, dataNew)];
                case 33:
                    _e.sent();
                    return [3 /*break*/, 36];
                case 34: 
                //publish sensor_event data seperately
                return [4 /*yield*/, publishSensorEvent(payload.topic, Data)];
                case 35:
                    //publish sensor_event data seperately
                    _e.sent();
                    _e.label = 36;
                case 36:
                    release();
                    return [3 /*break*/, 38];
                case 37:
                    error_6 = _e.sent();
                    release();
                    publishStatus = false;
                    console.log("sensor_event_payload_size", Buffer.byteLength(JSON.stringify(payload)));
                    console.log("sensor_event_payload", payload);
                    console.log(error_6);
                    return [3 /*break*/, 38];
                case 38:
                    _b++;
                    return [3 /*break*/, 30];
                case 39:
                    publishStatus = false;
                    _e.label = 40;
                case 40:
                    if (!publishStatus) return [3 /*break*/, 59];
                    return [4 /*yield*/, clientLock.acquire()];
                case 41:
                    release = _e.sent();
                    _e.label = 42;
                case 42:
                    _e.trys.push([42, 58, , 59]);
                    Data = {};
                    job.data.payload.topic = job.data.topic;
                    Data.data = JSON.stringify(job.data.payload);
                    Data.token = job.data.token;
                    size = Buffer.byteLength(Data.data);
                    if (!(size > maxPayloadSize)) return [3 /*break*/, 55];
                    console.log('size > maxPayloadSize ', size);
                    dataNew = {};
                    _d = job.data.topic;
                    switch (_d) {
                        case "researcher": return [3 /*break*/, 43];
                        case "researcher.*": return [3 /*break*/, 43];
                        case "study": return [3 /*break*/, 45];
                        case "study.*": return [3 /*break*/, 45];
                        case "researcher.*.study": return [3 /*break*/, 45];
                        case "participant": return [3 /*break*/, 47];
                        case "participant.*": return [3 /*break*/, 47];
                        case "study.*.participant": return [3 /*break*/, 47];
                        case "activity": return [3 /*break*/, 49];
                        case "activity.*": return [3 /*break*/, 49];
                        case "study.*.activity": return [3 /*break*/, 49];
                        case "sensor": return [3 /*break*/, 51];
                        case "sensor.*": return [3 /*break*/, 51];
                        case "study.*.sensor": return [3 /*break*/, 51];
                    }
                    return [3 /*break*/, 53];
                case 43:
                    dataNew.data = JSON.stringify({
                        action: job.data.payload.action,
                        subject_id: job.data.payload.researcher_id
                    });
                    return [4 /*yield*/, publishIDs(job.data.topic, dataNew)];
                case 44:
                    _e.sent();
                    return [3 /*break*/, 54];
                case 45:
                    if (job.data.payload.action !== "delete") {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.study_id
                        });
                    }
                    else {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.study_id,
                            researcher_id: job.data.payload.researcher_id
                        });
                    }
                    return [4 /*yield*/, publishIDs(job.data.topic, dataNew)];
                case 46:
                    _e.sent();
                    return [3 /*break*/, 54];
                case 47:
                    if (job.data.payload.action !== "delete") {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.participant_id
                        });
                    }
                    else {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.participant_id,
                            study_id: job.data.payload.study_id
                        });
                    }
                    return [4 /*yield*/, publishIDs(job.data.topic, dataNew)];
                case 48:
                    _e.sent();
                    return [3 /*break*/, 54];
                case 49:
                    if (job.data.payload.action !== "delete") {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.activity_id
                        });
                    }
                    else {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.activity_id,
                            study_id: job.data.payload.study_id
                        });
                    }
                    return [4 /*yield*/, publishIDs(job.data.topic, dataNew)];
                case 50:
                    _e.sent();
                    return [3 /*break*/, 54];
                case 51:
                    if (job.data.payload.action !== "delete") {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.sensor_id
                        });
                    }
                    else {
                        dataNew.data = JSON.stringify({
                            action: job.data.payload.action,
                            subject_id: job.data.payload.sensor_id,
                            study_id: job.data.payload.study_id
                        });
                    }
                    return [4 /*yield*/, publishIDs(job.data.topic, dataNew)];
                case 52:
                    _e.sent();
                    return [3 /*break*/, 54];
                case 53: return [3 /*break*/, 54];
                case 54: return [3 /*break*/, 57];
                case 55:
                    ;
                    return [4 /*yield*/, Bootstrap_1.nc];
                case 56:
                    (_e.sent()).publish(job.data.topic, Data);
                    _e.label = 57;
                case 57:
                    release();
                    return [3 /*break*/, 59];
                case 58:
                    error_7 = _e.sent();
                    console.log('size > maxPayloadSize ', error_7);
                    release();
                    console.log(error_7);
                    return [3 /*break*/, 59];
                case 59: return [3 /*break*/, 61];
                case 60:
                    error_8 = _e.sent();
                    console.log("Nats  error 3", error_8);
                    return [3 /*break*/, 61];
                case 61:
                    done();
                    return [2 /*return*/];
            }
        });
    });
}
exports.PubSubAPIListenerQueueProcess = PubSubAPIListenerQueueProcess;
/** publishing sensor event
 *
 * @param topic
 * @param data
 */
function publishSensorEvent(topic, data) {
    return __awaiter(this, void 0, void 0, function () {
        var error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    ;
                    return [4 /*yield*/, Bootstrap_1.nc];
                case 1:
                    (_a.sent()).publish(topic, data);
                    return [3 /*break*/, 3];
                case 2:
                    error_9 = _a.sent();
                    console.log("Nats server is disconnected2", error_9);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** publishing activity event
 *
 * @param topic
 * @param data
 */
function publishActivityEvent(topic, data) {
    return __awaiter(this, void 0, void 0, function () {
        var error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    ;
                    return [4 /*yield*/, Bootstrap_1.nc];
                case 1:
                    (_a.sent()).publish(topic, data);
                    return [3 /*break*/, 3];
                case 2:
                    error_10 = _a.sent();
                    console.log("Nats server is disconnected3", error_10);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** publish IDs if size is greater tha maximum payload size
 *
 */
function publishIDs(topic, Data) {
    return __awaiter(this, void 0, void 0, function () {
        var error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    ;
                    return [4 /*yield*/, Bootstrap_1.nc];
                case 1:
                    (_a.sent()).publish(topic, Data);
                    return [3 /*break*/, 3];
                case 2:
                    error_11 = _a.sent();
                    console.log("Nats server is disconnected4", error_11);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
