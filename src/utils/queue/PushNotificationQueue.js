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
exports.sendNotification = exports.PushNotificationQueueProcess = void 0;
var node_fetch_1 = require("node-fetch");
/** Queue Process
 *
 * @param job
 */
function PushNotificationQueueProcess(job) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            job.data.payload.url = "/participant/".concat(job.data.payload.participant_id);
            sendNotification(job.data.device_token, job.data.device_type, job.data.payload);
            return [2 /*return*/];
        });
    });
}
exports.PushNotificationQueueProcess = PushNotificationQueueProcess;
/** send notifications
 *
 * @param device_token
 * @param device_type
 * @param payload
 */
function sendNotification(device_token, device_type, payload) {
    console.dir({ device_token: device_token, device_type: device_type, payload: payload });
    // Send this specific page URL to the device to show the actual activity.
    // eslint-disable-next-line prettier/prettier
    var url = payload.url;
    var notificationId = !!payload.notificationId ? payload.notificationId : Math.floor(Math.random() * 1000000) + 1;
    var gatewayURL = !!process.env.APP_GATEWAY
        ? "https://".concat(process.env.APP_GATEWAY, "/push")
        : "".concat(process.env.PUSH_GATEWAY);
    var gatewayApiKey = !!process.env.PUSH_API_KEY
        ? "".concat(process.env.PUSH_API_KEY)
        : "".concat(process.env.PUSH_GATEWAY_APIKEY);
    console.log(url);
    try {
        if ("undefined" === gatewayURL) {
            throw new Error("Push gateway address is not defined");
        }
        if ("undefined" === gatewayApiKey) {
            throw new Error("Push gateway apikey is not defined");
        }
        switch (device_type) {
            case "android.watch":
            case "android":
                try {
                    var opts = {
                        push_type: "gcm",
                        api_key: gatewayApiKey,
                        device_token: device_token,
                        payload: {
                            priority: "high",
                            data: {
                                title: "".concat(payload.title),
                                message: "".concat(payload.message),
                                page: "".concat(url),
                                notificationId: notificationId,
                                actions: [{ name: "Open App", page: "".concat(process.env.DASHBOARD_URL) }],
                                expiry: 21600000
                            }
                        }
                    };
                    //connect to api gateway and send notifications
                    (0, node_fetch_1["default"])(gatewayURL, {
                        method: "post",
                        body: JSON.stringify(opts),
                        headers: { "Content-Type": "application/json" }
                    })
                        .then(function (res) {
                        if (!res.ok) {
                            throw new Error("HTTP error! status");
                        }
                    })["catch"](function (e) {
                        console.log("Error encountered sending GCM push notification.");
                    });
                }
                catch (error) {
                    console.log("\"Error encountered sending GCM push notification\"-".concat(error));
                }
                break;
            case "ios":
                try {
                    //preparing curl request
                    var opts = {
                        push_type: "apns",
                        api_key: gatewayApiKey,
                        device_token: device_token,
                        payload: {
                            aps: {
                                alert: "".concat(payload.message),
                                badge: 0,
                                sound: "default",
                                "mutable-content": 1,
                                "content-available": 1,
                                "push-type": "alert",
                                "collapse-id": "".concat(notificationId),
                                expiration: 10
                            },
                            notificationId: "".concat(notificationId),
                            expiry: 21600000,
                            page: "".concat(url),
                            actions: [{ name: "Open App", page: "".concat(url) }]
                        }
                    };
                    //connect to api gateway and send notifications
                    (0, node_fetch_1["default"])(gatewayURL, {
                        method: "post",
                        body: JSON.stringify(opts),
                        headers: { "Content-Type": "application/json" }
                    })
                        .then(function (res) {
                        console.log("response", res);
                        if (!res.ok) {
                            throw new Error("HTTP error!");
                        }
                    })["catch"](function (e) {
                        console.log("Error encountered sending APN push notification-".concat(e));
                    });
                }
                catch (error) {
                    console.log("Error encountered sending APN push notification-".concat(error));
                }
                break;
            case "ios.watch":
                try {
                    //preparing curl request
                    var opts = {
                        push_type: "apns",
                        api_key: gatewayApiKey,
                        device_token: device_token,
                        payload: {
                            aps: {
                                alert: "".concat(payload.message),
                                badge: 0,
                                sound: "default",
                                "mutable-content": 1,
                                "content-available": 1,
                                "push-type": "background",
                                "collapse-id": "".concat(notificationId),
                                expiration: 10
                            },
                            notificationId: "".concat(notificationId),
                            expiry: 21600000,
                            page: "".concat(url),
                            actions: [{ name: "Open App", page: "".concat(url) }]
                        }
                    };
                    //connect to api gateway and send notifications
                    (0, node_fetch_1["default"])(gatewayURL, {
                        method: "post",
                        body: JSON.stringify(opts),
                        headers: { "Content-Type": "application/json" }
                    })
                        .then(function (res) {
                        console.log("response", res);
                        if (!res.ok) {
                            throw new Error("HTTP error!");
                        }
                    })["catch"](function (e) {
                        console.log("\"Error encountered sending APN push notification.\"--".concat(e));
                    });
                }
                catch (error) {
                    console.log("\"Error encountered sending APN push notification\"-".concat(error));
                }
                break;
            default:
                break;
        }
    }
    catch (error) {
        console.log(error.message);
    }
}
exports.sendNotification = sendNotification;
