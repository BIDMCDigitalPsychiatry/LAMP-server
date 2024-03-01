"use strict";
exports.__esModule = true;
exports.SensorEvent = exports.SocialContext = exports.LocationContext = exports.SensorName = void 0;
var SensorName;
(function (SensorName) {
    SensorName["Analytics"] = "lamp.analytics";
    SensorName["Accelerometer"] = "lamp.accelerometer";
    SensorName["Bluetooth"] = "lamp.bluetooth";
    SensorName["Calls"] = "lamp.calls";
    SensorName["DeviceState"] = "lamp.device_state";
    SensorName["SMS"] = "lamp.sms";
    SensorName["WiFi"] = "lamp.wifi";
    SensorName["Audio"] = "lamp.audio_recordings";
    SensorName["Location"] = "lamp.gps";
    SensorName["ContextualLocation"] = "lamp.gps.contextual";
    SensorName["Height"] = "lamp.height";
    SensorName["Weight"] = "lamp.weight";
    SensorName["HeartRate"] = "lamp.heart_rate";
    SensorName["BloodPressure"] = "lamp.blood_pressure";
    SensorName["RespiratoryRate"] = "lamp.respiratory_rate";
    SensorName["Sleep"] = "lamp.sleep";
    SensorName["Steps"] = "lamp.steps";
    SensorName["Flights"] = "lamp.flights";
    SensorName["Segment"] = "lamp.segment";
    SensorName["Distance"] = "lamp.distance";
})(SensorName = exports.SensorName || (exports.SensorName = {}));
var LocationContext;
(function (LocationContext) {
    LocationContext["Home"] = "home";
    LocationContext["School"] = "school";
    LocationContext["Work"] = "work";
    LocationContext["Hospital"] = "hospital";
    LocationContext["Outside"] = "outside";
    LocationContext["Shopping"] = "shopping";
    LocationContext["Transit"] = "transit";
})(LocationContext = exports.LocationContext || (exports.LocationContext = {}));
var SocialContext;
(function (SocialContext) {
    SocialContext["Alone"] = "alone";
    SocialContext["Friends"] = "friends";
    SocialContext["Family"] = "family";
    SocialContext["Peers"] = "peers";
    SocialContext["Crowd"] = "crowd";
})(SocialContext = exports.SocialContext || (exports.SocialContext = {}));
var SensorEvent = /** @class */ (function () {
    function SensorEvent() {
    }
    return SensorEvent;
}());
exports.SensorEvent = SensorEvent;
