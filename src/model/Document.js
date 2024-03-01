"use strict";
exports.__esModule = true;
exports.DurationIntervalLegacy = exports.DurationInterval = exports.Document = exports.Metadata = exports.AccessCitation = void 0;
var AccessCitation = /** @class */ (function () {
    function AccessCitation() {
        this["in"] = "";
        this.at = "";
        this.on = 0;
        this.by = "";
    }
    return AccessCitation;
}());
exports.AccessCitation = AccessCitation;
var Metadata = /** @class */ (function () {
    function Metadata() {
        this.access = new AccessCitation();
    }
    return Metadata;
}());
exports.Metadata = Metadata;
var Document = /** @class */ (function () {
    function Document() {
        this.meta = new Metadata();
        this.data = [];
    }
    return Document;
}());
exports.Document = Document;
var DurationInterval = /** @class */ (function () {
    function DurationInterval() {
    }
    return DurationInterval;
}());
exports.DurationInterval = DurationInterval;
var RepeatTypeLegacy;
(function (RepeatTypeLegacy) {
    RepeatTypeLegacy["hourly"] = "hourly";
    RepeatTypeLegacy["every3h"] = "every3h";
    RepeatTypeLegacy["every6h"] = "every6h";
    RepeatTypeLegacy["every12h"] = "every12h";
    RepeatTypeLegacy["daily"] = "daily";
    RepeatTypeLegacy["weekly"] = "weekly";
    RepeatTypeLegacy["biweekly"] = "biweekly";
    RepeatTypeLegacy["monthly"] = "monthly";
    RepeatTypeLegacy["bimonthly"] = "bimonthly";
    RepeatTypeLegacy["custom"] = "custom";
    RepeatTypeLegacy["none"] = "none";
})(RepeatTypeLegacy || (RepeatTypeLegacy = {}));
var DurationIntervalLegacy = /** @class */ (function () {
    function DurationIntervalLegacy() {
    }
    return DurationIntervalLegacy;
}());
exports.DurationIntervalLegacy = DurationIntervalLegacy;
