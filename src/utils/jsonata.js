// @ts-nocheck
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jsonata = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
    /**
     * © Copyright IBM Corp. 2018 All Rights Reserved
     *   Project name: JSONata
     *   This project is licensed under the MIT License, see LICENSE
     */
    
    const utils = require('./utils');
    
    /**
     * DateTime formatting and parsing functions
     * Implements the xpath-functions format-date-time specification
     * @type {{formatInteger, formatDateTime, parseInteger, parseDateTime}}
     */
    const dateTime = (function () {
        'use strict';
    
        const stringToArray = utils.stringToArray;
    
        const few = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const ordinals = ['Zeroth', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
            'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth'];
        const decades = ['Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety', 'Hundred'];
        const magnitudes = ['Thousand', 'Million', 'Billion', 'Trillion'];
    
        /**
         * converts a number into english words
         * @param {string} value - the value to format
         * @param {boolean} ordinal - ordinal or cardinal form
         * @returns {string} - representation in words
         */
        function numberToWords(value, ordinal) {
            var lookup = function (num, prev, ord) {
                var words = '';
                if (num <= 19) {
                    words = (prev ? ' and ' : '') + (ord ? ordinals[num] : few[num]);
                } else if (num < 100) {
                    const tens = Math.floor(num / 10);
                    const remainder = num % 10;
                    words = (prev ? ' and ' : '') + decades[tens - 2];
                    if (remainder > 0) {
                        words += '-' + lookup(remainder, false, ord);
                    } else if (ord) {
                        words = words.substring(0, words.length - 1) + 'ieth';
                    }
                } else if (num < 1000) {
                    const hundreds = Math.floor(num / 100);
                    const remainder = num % 100;
                    words = (prev ? ', ' : '') + few[hundreds] + ' Hundred';
                    if (remainder > 0) {
                        words += lookup(remainder, true, ord);
                    } else if (ord) {
                        words += 'th';
                    }
                } else {
                    var mag = Math.floor(Math.log10(num) / 3);
                    if (mag > magnitudes.length) {
                        mag = magnitudes.length; // the largest word
                    }
                    const factor = Math.pow(10, mag * 3);
                    const mant = Math.floor(num / factor);
                    const remainder = num - mant * factor;
                    words = (prev ? ', ' : '') + lookup(mant, false, false) + ' ' + magnitudes[mag - 1];
                    if (remainder > 0) {
                        words += lookup(remainder, true, ord);
                    } else if (ord) {
                        words += 'th';
                    }
                }
                return words;
            };
    
            var words = lookup(value, false, ordinal);
            return words;
        }
    
        const wordValues = {};
        few.forEach(function (word, index) {
            wordValues[word.toLowerCase()] = index;
        });
        ordinals.forEach(function (word, index) {
            wordValues[word.toLowerCase()] = index;
        });
        decades.forEach(function (word, index) {
            const lword = word.toLowerCase();
            wordValues[lword] = (index + 2) * 10;
            wordValues[lword.substring(0, word.length - 1) + 'ieth'] = wordValues[lword];
        });
        wordValues.hundredth = 100;
        magnitudes.forEach(function (word, index) {
            const lword = word.toLowerCase();
            const val = Math.pow(10, (index + 1) * 3);
            wordValues[lword] = val;
            wordValues[lword + 'th'] = val;
        });
    
        /**
         * Converts a number in english words to numeric value
         * @param {string} text - the number in words
         * @returns {number} - the numeric value
         */
        function wordsToNumber(text) {
            const parts = text.split(/,\s|\sand\s|[\s\\-]/);
            const values = parts.map(part => wordValues[part]);
            let segs = [0];
            values.forEach(value => {
                if (value < 100) {
                    let top = segs.pop();
                    if (top >= 1000) {
                        segs.push(top);
                        top = 0;
                    }
                    segs.push(top + value);
                } else {
                    segs.push(segs.pop() * value);
                }
            });
            const result = segs.reduce((a, b) => a + b, 0);
            return result;
        }
    
        const romanNumerals = [
            [1000, 'm'],
            [900, 'cm'],
            [500, 'd'],
            [400, 'cd'],
            [100, 'c'],
            [90, 'xc'],
            [50, 'l'],
            [40, 'xl'],
            [10, 'x'],
            [9, 'ix'],
            [5, 'v'],
            [4, 'iv'],
            [1, 'i']
        ];
    
        const romanValues = {'M': 1000, 'D': 500, 'C': 100, 'L': 50, 'X': 10, 'V': 5, 'I': 1};
    
        /**
         * converts a number to roman numerals
         * @param {number} value - the number
         * @returns {string} - the number in roman numerals
         */
        function decimalToRoman(value) {
            for (var index = 0; index < romanNumerals.length; index++) {
                const numeral = romanNumerals[index];
                if (value >= numeral[0]) {
                    return numeral[1] + decimalToRoman(value - numeral[0]);
                }
            }
            return '';
        }
    
        /**
         * converts roman numerals to a number
         * @param {string} roman - roman number
         * @returns {number} - the numeric value
         */
        function romanToDecimal(roman) {
            var decimal = 0;
            var max = 1;
            for (var i = roman.length - 1; i >= 0; i--) {
                const digit = roman[i];
                const value = romanValues[digit];
                if (value < max) {
                    decimal -= value;
                } else {
                    max = value;
                    decimal += value;
                }
            }
            return decimal;
        }
    
        /**
         * converts a number to spreadsheet style letters
         * @param {number} value - the number
         * @param {string} aChar - the character representing the start of the sequence, e.g. 'A'
         * @returns {string} - the letters
         */
        function decimalToLetters(value, aChar) {
            var letters = [];
            var aCode = aChar.charCodeAt(0);
            while (value > 0) {
                letters.unshift(String.fromCharCode((value - 1) % 26 + aCode));
                value = Math.floor((value - 1) / 26);
            }
            return letters.join('');
        }
    
        /**
         * converts spreadsheet style letters to a number
         * @param {string} letters - the letters
         * @param {string} aChar - the character representing the start of the sequence, e.g. 'A'
         * @returns {number} - the numeric value
         */
        function lettersToDecimal(letters, aChar) {
            var aCode = aChar.charCodeAt(0);
            var decimal = 0;
            for (var i = 0; i < letters.length; i++) {
                decimal += (letters.charCodeAt(letters.length - i - 1) - aCode + 1) * Math.pow(26, i);
            }
            return decimal;
        }
    
        /**
         * Formats an integer as specified by the XPath fn:format-integer function
         * See https://www.w3.org/TR/xpath-functions-31/#func-format-integer
         * @param {number} value - the number to be formatted
         * @param {string} picture - the picture string that specifies the format
         * @returns {string} - the formatted number
         */
        function formatInteger(value, picture) {
            if (typeof value === 'undefined') {
                return undefined;
            }
    
            value = Math.floor(value);
    
            const format = analyseIntegerPicture(picture);
            return _formatInteger(value, format);
        }
    
        const formats = {
            DECIMAL: 'decimal',
            LETTERS: 'letters',
            ROMAN: 'roman',
            WORDS: 'words',
            SEQUENCE: 'sequence'
        };
    
        const tcase = {
            UPPER: 'upper',
            LOWER: 'lower',
            TITLE: 'title'
        };
    
        /**
         * formats an integer using a preprocessed representation of the picture string
         * @param {number} value - the number to be formatted
         * @param {object} format - the preprocessed representation of the pucture string
         * @returns {string} - the formatted number
         * @private
         */
        function _formatInteger(value, format) {
            let formattedInteger;
            const negative = value < 0;
            value = Math.abs(value);
            switch (format.primary) {
                case formats.LETTERS:
                    formattedInteger = decimalToLetters(value, format.case === tcase.UPPER ? 'A' : 'a');
                    break;
                case formats.ROMAN:
                    formattedInteger = decimalToRoman(value);
                    if (format.case === tcase.UPPER) {
                        formattedInteger = formattedInteger.toUpperCase();
                    }
                    break;
                case formats.WORDS:
                    formattedInteger = numberToWords(value, format.ordinal);
                    if (format.case === tcase.UPPER) {
                        formattedInteger = formattedInteger.toUpperCase();
                    } else if (format.case === tcase.LOWER) {
                        formattedInteger = formattedInteger.toLowerCase();
                    }
                    break;
                case formats.DECIMAL:
                    formattedInteger = '' + value;
                    // TODO use functionPad
                    var padLength = format.mandatoryDigits - formattedInteger.length;
                    if (padLength > 0) {
                        var padding = (new Array(padLength + 1)).join('0');
                        formattedInteger = padding + formattedInteger;
                    }
                    if (format.zeroCode !== 0x30) {
                        formattedInteger = stringToArray(formattedInteger).map(code => {
                            return String.fromCodePoint(code.codePointAt(0) + format.zeroCode - 0x30);
                        }).join('');
                    }
                    // insert the grouping-separator-signs, if any
                    if (format.regular) {
                        const n = Math.floor((formattedInteger.length - 1) / format.groupingSeparators.position);
                        for (let ii = n; ii > 0; ii--) {
                            const pos = formattedInteger.length - ii * format.groupingSeparators.position;
                            formattedInteger = formattedInteger.substr(0, pos) + format.groupingSeparators.character + formattedInteger.substr(pos);
                        }
                    } else {
                        format.groupingSeparators.reverse().forEach(separator => {
                            const pos = formattedInteger.length - separator.position;
                            formattedInteger = formattedInteger.substr(0, pos) + separator.character + formattedInteger.substr(pos);
                        });
                    }
    
                    if (format.ordinal) {
                        var suffix123 = {'1': 'st', '2': 'nd', '3': 'rd'};
                        var lastDigit = formattedInteger[formattedInteger.length - 1];
                        var suffix = suffix123[lastDigit];
                        if (!suffix || (formattedInteger.length > 1 && formattedInteger[formattedInteger.length - 2] === '1')) {
                            suffix = 'th';
                        }
                        formattedInteger = formattedInteger + suffix;
                    }
                    break;
                case formats.SEQUENCE:
                    throw {
                        code: 'D3130',
                        value: format.token
                    };
            }
            if (negative) {
                formattedInteger = '-' + formattedInteger;
            }
    
            return formattedInteger;
        }
    
        //TODO what about decimal groups in the unicode supplementary planes (surrogate pairs) ???
        const decimalGroups = [0x30, 0x0660, 0x06F0, 0x07C0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0x0DE6, 0x0E50, 0x0ED0, 0x0F20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10];
    
        /**
         * preprocesses the picture string
         * @param {string} picture - picture string
         * @returns {{type: string, primary: string, case: string, ordinal: boolean}} - analysed picture
         */
        function analyseIntegerPicture(picture) {
            const format = {
                type: 'integer',
                primary: formats.DECIMAL,
                case: tcase.LOWER,
                ordinal: false
            };
    
            let primaryFormat, formatModifier;
            const semicolon = picture.lastIndexOf(';');
            if (semicolon === -1) {
                primaryFormat = picture;
            } else {
                primaryFormat = picture.substring(0, semicolon);
                formatModifier = picture.substring(semicolon + 1);
                if (formatModifier[0] === 'o') {
                    format.ordinal = true;
                }
            }
    
            /* eslnt-disable-next no-fallthrough */
            switch (primaryFormat) {
                case 'A':
                    format.case = tcase.UPPER;
                /* eslnt-disable-next-line no-fallthrough */
                case 'a':
                    format.primary = formats.LETTERS;
                    break;
                case 'I':
                    format.case = tcase.UPPER;
                /* eslnt-disable-next-line no-fallthrough */
                case 'i':
                    format.primary = formats.ROMAN;
                    break;
                case 'W':
                    format.case = tcase.UPPER;
                    format.primary = formats.WORDS;
                    break;
                case 'Ww':
                    format.case = tcase.TITLE;
                    format.primary = formats.WORDS;
                    break;
                case 'w':
                    format.primary = formats.WORDS;
                    break;
                default: {
                    // this is a decimal-digit-pattern if it contains a decimal digit (from any unicode decimal digit group)
                    let zeroCode = null;
                    let mandatoryDigits = 0;
                    let optionalDigits = 0;
                    let groupingSeparators = [];
                    let separatorPosition = 0;
                    const formatCodepoints = stringToArray(primaryFormat).map(c => c.codePointAt(0)).reverse(); // reverse the array to determine positions of grouping-separator-signs
                    formatCodepoints.forEach((codePoint) => {
                        // step though each char in the picture to determine the digit group
                        let digit = false;
                        for (let ii = 0; ii < decimalGroups.length; ii++) {
                            const group = decimalGroups[ii];
                            if (codePoint >= group && codePoint <= group + 9) {
                                // codepoint is part of this decimal group
                                digit = true;
                                mandatoryDigits++;
                                separatorPosition++;
                                if (zeroCode === null) {
                                    zeroCode = group;
                                } else if (group !== zeroCode) {
                                    // error! different decimal groups in the same pattern
                                    throw {
                                        code: 'D3131'
                                    };
                                }
                                break;
                            }
                        }
                        if (!digit) {
                            if (codePoint === 0x23) { // # - optional-digit-sign
                                separatorPosition++;
                                optionalDigits++;
                            } else {
                                // neither a decimal-digit-sign ot optional-digit-sign, assume it is a grouping-separator-sign
                                groupingSeparators.push({
                                    position: separatorPosition,
                                    character: String.fromCodePoint(codePoint)
                                });
                            }
                        }
                    });
                    if (mandatoryDigits > 0) {
                        format.primary = formats.DECIMAL;
                        // TODO validate decimal-digit-pattern
    
                        // the decimal digit family (codepoint offset)
                        format.zeroCode = zeroCode;
                        // the number of mandatory digits
                        format.mandatoryDigits = mandatoryDigits;
                        // the number of optional digits
                        format.optionalDigits = optionalDigits;
                        // grouping separator template
                        // are the grouping-separator-signs 'regular'?
                        const regularRepeat = function (separators) {
                            // are the grouping positions regular? i.e. same interval between each of them
                            // is there at least one separator?
                            if (separators.length === 0) {
                                return 0;
                            }
                            // are all the characters the same?
                            const sepChar = separators[0].character;
                            for (let ii = 1; ii < separators.length; ii++) {
                                if (separators[ii].character !== sepChar) {
                                    return 0;
                                }
                            }
                            // are they equally spaced?
                            const indexes = separators.map(separator => separator.position);
                            const gcd = function (a, b) {
                                return b === 0 ? a : gcd(b, a % b);
                            };
                            // find the greatest common divisor of all the positions
                            const factor = indexes.reduce(gcd);
                            // is every position separated by this divisor? If so, it's regular
                            for (let index = 1; index <= indexes.length; index++) {
                                if (indexes.indexOf(index * factor) === -1) {
                                    return 0;
                                }
                            }
                            return factor;
                        };
    
                        const regular = regularRepeat(groupingSeparators);
                        if (regular > 0) {
                            format.regular = true;
                            format.groupingSeparators = {
                                position: regular,
                                character: groupingSeparators[0].character
                            };
                        } else {
                            format.regular = false;
                            format.groupingSeparators = groupingSeparators;
                        }
    
                    } else {
                        // this is a 'numbering sequence' which the spec says is implementation-defined
                        // this implementation doesn't support any numbering sequences at the moment.
                        format.primary = formats.SEQUENCE;
                        format.token = primaryFormat;
                    }
                }
            }
    
            return format;
        }
    
        const defaultPresentationModifiers = {
            Y: '1', M: '1', D: '1', d: '1', F: 'n', W: '1', w: '1', X: '1', x: '1', H: '1', h: '1',
            P: 'n', m: '01', s: '01', f: '1', Z: '01:01', z: '01:01', C: 'n', E: 'n'
        };
    
        // §9.8.4.1 the format specifier is an array of string literals and variable markers
        /**
         * analyse the date-time picture string
         * @param {string} picture - picture string
         * @returns {{type: string, parts: Array}} - the analysed string
         */
        function analyseDateTimePicture(picture) {
            var spec = [];
            const format = {
                type: 'datetime',
                parts: spec
            };
            const addLiteral = function (start, end) {
                if (end > start) {
                    let literal = picture.substring(start, end);
                    // replace any doubled ]] with single ]
                    // what if there are instances of single ']' ? - the spec doesn't say
                    literal = literal.split(']]').join(']');
                    spec.push({type: 'literal', value: literal});
                }
            };
    
            var start = 0, pos = 0;
            while (pos < picture.length) {
                if (picture.charAt(pos) === '[') {
                    // check it's not a doubled [[
                    if (picture.charAt(pos + 1) === '[') {
                        // literal [
                        addLiteral(start, pos);
                        spec.push({type: 'literal', value: '['});
                        pos += 2;
                        start = pos;
                        continue;
                    }
                    // start of variable marker
                    // push the string literal (if there is one) onto the array
                    addLiteral(start, pos);
                    start = pos;
                    // search forward to closing ]
                    pos = picture.indexOf(']', start);
                    // TODO handle error case if pos === -1
                    if(pos === -1) {
                        // error - no closing bracket
                        throw {
                            code: 'D3135'
                        };
                    }
                    let marker = picture.substring(start + 1, pos);
                    // whitespace within a variable marker is ignored (i.e. remove it)
                    marker = marker.split(/\s+/).join('');
                    var def = {
                        type: 'marker',
                        component: marker.charAt(0)  // 1. The component specifier is always present and is always a single letter.
                    };
                    var comma = marker.lastIndexOf(','); // 2. The width modifier may be recognized by the presence of a comma
                    var presMod; // the presentation modifiers
                    if (comma !== -1) {
                        // §9.8.4.2 The Width Modifier
                        const widthMod = marker.substring(comma + 1);
                        const dash = widthMod.indexOf('-');
                        let min, max;
                        const parseWidth = function (wm) {
                            if (typeof wm === 'undefined' || wm === '*') {
                                return undefined;
                            } else {
                                // TODO validate wm is an unsigned int
                                return parseInt(wm);
                            }
                        };
                        if (dash === -1) {
                            min = widthMod;
                        } else {
                            min = widthMod.substring(0, dash);
                            max = widthMod.substring(dash + 1);
                        }
                        const widthDef = {
                            min: parseWidth(min),
                            max: parseWidth(max)
                        };
                        def.width = widthDef;
                        presMod = marker.substring(1, comma);
                    } else {
                        presMod = marker.substring(1);
                    }
                    if (presMod.length === 1) {
                        def.presentation1 = presMod; // first presentation modifier
                        //TODO validate the first presentation modifier - it's either N, n, Nn or it passes analyseIntegerPicture
                    } else if (presMod.length > 1) {
                        var lastChar = presMod.charAt(presMod.length - 1);
                        if ('atco'.indexOf(lastChar) !== -1) {
                            def.presentation2 = lastChar;
                            if (lastChar === 'o') {
                                def.ordinal = true;
                            }
                            // 'c' means 'cardinal' and is the default (i.e. not 'ordinal')
                            // 'a' & 't' are ignored (not sure of their relevance to English numbering)
                            def.presentation1 = presMod.substring(0, presMod.length - 1);
                        } else {
                            def.presentation1 = presMod;
                            //TODO validate the first presentation modifier - it's either N, n, Nn or it passes analyseIntegerPicture,
                            // doesn't use ] as grouping separator, and if grouping separator is , then must have width modifier
                        }
                    } else {
                        // no presentation modifier specified - apply the default;
                        def.presentation1 = defaultPresentationModifiers[def.component];
                    }
                    if (typeof def.presentation1 === 'undefined') {
                        // unknown component specifier
                        throw {
                            code: 'D3132',
                            value: def.component
                        };
                    }
                    if (def.presentation1[0] === 'n') {
                        def.names = tcase.LOWER;
                    } else if (def.presentation1[0] === 'N') {
                        if (def.presentation1[1] === 'n') {
                            def.names = tcase.TITLE;
                        } else {
                            def.names = tcase.UPPER;
                        }
                    } else if ('YMDdFWwXxHhmsf'.indexOf(def.component) !== -1) {
                        var integerPattern = def.presentation1;
                        if (def.presentation2) {
                            integerPattern += ';' + def.presentation2;
                        }
                        def.integerFormat = analyseIntegerPicture(integerPattern);
                        if (def.width && def.width.min !== undefined) {
                            if (def.integerFormat.mandatoryDigits < def.width.min) {
                                def.integerFormat.mandatoryDigits = def.width.min;
                            }
                        }
                        if (def.component === 'Y') {
                            // §9.8.4.4
                            def.n = -1;
                            if (def.width && def.width.max !== undefined) {
                                def.n = def.width.max;
                                def.integerFormat.mandatoryDigits = def.n;
                            } else {
                                var w = def.integerFormat.mandatoryDigits + def.integerFormat.optionalDigits;
                                if (w >= 2) {
                                    def.n = w;
                                }
                            }
                        }
                    }
                    if (def.component === 'Z' || def.component === 'z') {
                        def.integerFormat = analyseIntegerPicture(def.presentation1);
                    }
                    spec.push(def);
                    start = pos + 1;
                }
                pos++;
            }
            addLiteral(start, pos);
            return format;
        }
    
        const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const millisInADay = 1000 * 60 * 60 * 24;
    
        const startOfFirstWeek = function (ym) {
            // ISO 8601 defines the first week of the year to be the week that contains the first Thursday
            // XPath F&O extends this same definition for the first week of a month
            // the week starts on a Monday - calculate the millis for the start of the first week
            // millis for given 1st Jan of that year (at 00:00 UTC)
            const jan1 = Date.UTC(ym.year, ym.month);
            var dayOfJan1 = (new Date(jan1)).getUTCDay();
            if (dayOfJan1 === 0) {
                dayOfJan1 = 7;
            }
            // if Jan 1 is Fri, Sat or Sun, then add the number of days (in millis) to jan1 to get the start of week 1
            return dayOfJan1 > 4 ? jan1 + (8 - dayOfJan1) * millisInADay : jan1 - (dayOfJan1 - 1) * millisInADay;
        };
    
        const yearMonth = function (year, month) {
            return {
                year: year,
                month: month,
                nextMonth: function () {
                    return (month === 11) ? yearMonth(year + 1, 0) : yearMonth(year, month + 1);
                },
                previousMonth: function () {
                    return (month === 0) ? yearMonth(year - 1, 11) : yearMonth(year, month - 1);
                },
                nextYear: function () {
                    return yearMonth(year + 1, month);
                },
                previousYear: function () {
                    return yearMonth(year - 1, month);
                }
            };
        };
    
        const deltaWeeks = function (start, end) {
            return (end - start) / (millisInADay * 7) + 1;
        };
    
        const getDateTimeFragment = (date, component) => {
            let componentValue;
            switch (component) {
                case 'Y': // year
                    componentValue = date.getUTCFullYear();
                    break;
                case 'M': // month in year
                    componentValue = date.getUTCMonth() + 1;
                    break;
                case 'D': // day in month
                    componentValue = date.getUTCDate();
                    break;
                case 'd': { // day in year
                    // millis for given date (at 00:00 UTC)
                    const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
                    // millis for given 1st Jan of that year (at 00:00 UTC)
                    const firstJan = Date.UTC(date.getUTCFullYear(), 0);
                    componentValue = (today - firstJan) / millisInADay + 1;
                    break;
                }
                case 'F': // day of week
                    componentValue = date.getUTCDay();
                    if (componentValue === 0) {
                        // ISO 8601 defines days 1-7: Mon-Sun
                        componentValue = 7;
                    }
                    break;
                case 'W': { // week in year
                    const thisYear = yearMonth(date.getUTCFullYear(), 0);
                    const startOfWeek1 = startOfFirstWeek(thisYear);
                    const today = Date.UTC(thisYear.year, date.getUTCMonth(), date.getUTCDate());
                    let week = deltaWeeks(startOfWeek1, today);
                    if (week > 52) {
                        // might be first week of the following year
                        const startOfFollowingYear = startOfFirstWeek(thisYear.nextYear());
                        if (today >= startOfFollowingYear) {
                            week = 1;
                        }
                    } else if (week < 1) {
                        // must be end of the previous year
                        const startOfPreviousYear = startOfFirstWeek(thisYear.previousYear());
                        week = deltaWeeks(startOfPreviousYear, today);
                    }
                    componentValue = Math.floor(week);
                    break;
                }
                case 'w': { // week in month
                    const thisMonth = yearMonth(date.getUTCFullYear(), date.getUTCMonth());
                    const startOfWeek1 = startOfFirstWeek(thisMonth);
                    const today = Date.UTC(thisMonth.year, thisMonth.month, date.getUTCDate());
                    let week = deltaWeeks(startOfWeek1, today);
                    if (week > 4) {
                        // might be first week of the following month
                        const startOfFollowingMonth = startOfFirstWeek(thisMonth.nextMonth());
                        if (today >= startOfFollowingMonth) {
                            week = 1;
                        }
                    } else if (week < 1) {
                        // must be end of the previous month
                        const startOfPreviousMonth = startOfFirstWeek(thisMonth.previousMonth());
                        week = deltaWeeks(startOfPreviousMonth, today);
                    }
                    componentValue = Math.floor(week);
                    break;
                }
                case 'X': { // ISO week-numbering year
                    // Extension: The F&O spec says nothing about how to access the year associated with the week-of-the-year
                    // e.g. Sat 1 Jan 2005 is in the 53rd week of 2004.
                    // The 'W' component specifier gives 53, but 'Y' will give 2005.
                    // I propose to add 'X' as the component specifier to give the ISO week-numbering year (2004 in this example)
                    const thisYear = yearMonth(date.getUTCFullYear(), 0);
                    const startOfISOYear = startOfFirstWeek(thisYear);
                    const endOfISOYear = startOfFirstWeek(thisYear.nextYear());
                    const now = date.getTime();
                    if (now < startOfISOYear) {
                        componentValue = thisYear.year - 1;
                    } else if (now >= endOfISOYear) {
                        componentValue = thisYear.year + 1;
                    } else {
                        componentValue = thisYear.year;
                    }
                    break;
                }
                case 'x': { // ISO week-numbering month
                    // Extension: The F&O spec says nothing about how to access the month associated with the week-of-the-month
                    // e.g. Sat 1 Jan 2005 is in the 5th week of December 2004.
                    // The 'w' component specifier gives 5, but 'W' will give January and 'Y' will give 2005.
                    // I propose to add 'x' as the component specifier to give the 'week-numbering' month (December in this example)
                    const thisMonth = yearMonth(date.getUTCFullYear(), date.getUTCMonth());
                    const startOfISOMonth = startOfFirstWeek(thisMonth);
                    const nextMonth = thisMonth.nextMonth();
                    const endOfISOMonth = startOfFirstWeek(nextMonth);
                    const now = date.getTime();
                    if (now < startOfISOMonth) {
                        componentValue = thisMonth.previousMonth().month + 1;
                    } else if (now >= endOfISOMonth) {
                        componentValue = nextMonth.month + 1;
                    } else {
                        componentValue = thisMonth.month + 1;
                    }
                    break;
                }
                case 'H': // hour in day (24 hours)
                    componentValue = date.getUTCHours();
                    break;
                case 'h': // hour in half-day (12 hours)
                    componentValue = date.getUTCHours();
                    componentValue = componentValue % 12;
                    if (componentValue === 0) {
                        componentValue = 12;
                    }
                    break;
                case 'P': // am/pm marker
                    componentValue = date.getUTCHours() >= 12 ? 'pm' : 'am';
                    break;
                case 'm': // minute in hour
                    componentValue = date.getUTCMinutes();
                    break;
                case 's': // second in minute
                    componentValue = date.getUTCSeconds();
                    break;
                case 'f': // fractional seconds
                    componentValue = date.getUTCMilliseconds();
                    break;
                case 'Z': // timezone
                case 'z':
                    // since the date object is constructed from epoch millis, the TZ component is always be UTC.
                    break;
                case 'C': // calendar name
                    componentValue = 'ISO';
                    break;
                case 'E': // era
                    componentValue = 'ISO';
                    break;
            }
            return componentValue;
        };
    
        let iso8601Spec = null;
    
        /**
         * formats the date/time as specified by the XPath fn:format-dateTime function
         * @param {number} millis - the timestamp to be formatted, in millis since the epoch
         * @param {string} picture - the picture string that specifies the format
         * @param {string} timezone - the timezone to use
         * @returns {string} - the formatted timestamp
         */
        function formatDateTime(millis, picture, timezone) {
            var offsetHours = 0;
            var offsetMinutes = 0;
    
            if (typeof timezone !== 'undefined') {
                // parse the hour and minute offsets
                // assume for now the format supplied is +hhmm
                const offset = parseInt(timezone);
                offsetHours = Math.floor(offset / 100);
                offsetMinutes = offset % 100;
            }
    
            var formatComponent = function (date, markerSpec) {
                var componentValue = getDateTimeFragment(date, markerSpec.component);
    
                // §9.8.4.3 Formatting Integer-Valued Date/Time Components
                if ('YMDdFWwXxHhms'.indexOf(markerSpec.component) !== -1) {
                    if (markerSpec.component === 'Y') {
                        // §9.8.4.4 Formatting the Year Component
                        if (markerSpec.n !== -1) {
                            componentValue = componentValue % Math.pow(10, markerSpec.n);
                        }
                    }
                    if (markerSpec.names) {
                        if (markerSpec.component === 'M' || markerSpec.component === 'x') {
                            componentValue = months[componentValue - 1];
                        } else if (markerSpec.component === 'F') {
                            componentValue = days[componentValue];
                        } else {
                            throw {
                                code: 'D3133',
                                value: markerSpec.component
                            };
                        }
                        if (markerSpec.names === tcase.UPPER) {
                            componentValue = componentValue.toUpperCase();
                        } else if (markerSpec.names === tcase.LOWER) {
                            componentValue = componentValue.toLowerCase();
                        }
                        if (markerSpec.width && componentValue.length > markerSpec.width.max) {
                            componentValue = componentValue.substring(0, markerSpec.width.max);
                        }
                    } else {
                        componentValue = _formatInteger(componentValue, markerSpec.integerFormat);
                    }
                } else if (markerSpec.component === 'f') {
                    // TODO §9.8.4.5 Formatting Fractional Seconds
                    componentValue = _formatInteger(componentValue, markerSpec.integerFormat);
                } else if (markerSpec.component === 'Z' || markerSpec.component === 'z') {
                    // §9.8.4.6 Formatting timezones
                    const offset = offsetHours * 100 + offsetMinutes;
                    if (markerSpec.integerFormat.regular) {
                        componentValue = _formatInteger(offset, markerSpec.integerFormat);
                    } else {
                        const numDigits = markerSpec.integerFormat.mandatoryDigits;
                        if (numDigits === 1 || numDigits === 2) {
                            componentValue = _formatInteger(offsetHours, markerSpec.integerFormat);
                            if (offsetMinutes !== 0) {
                                componentValue += ':' + formatInteger(offsetMinutes, '00');
                            }
                        } else if (numDigits === 3 || numDigits === 4) {
                            componentValue = _formatInteger(offset, markerSpec.integerFormat);
                        } else {
                            throw {
                                code: 'D3134',
                                value: numDigits
                            };
                        }
                    }
                    if (offset >= 0) {
                        componentValue = '+' + componentValue;
                    }
                    if (markerSpec.component === 'z') {
                        componentValue = 'GMT' + componentValue;
                    }
                    if (offset === 0 && markerSpec.presentation2 === 't') {
                        componentValue = 'Z';
                    }
                }
                return componentValue;
            };
    
            let formatSpec;
            if(typeof picture === 'undefined') {
                // default to ISO 8601 format
                if (iso8601Spec === null) {
                    iso8601Spec = analyseDateTimePicture('[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01].[f001][Z01:01t]');
                }
                formatSpec = iso8601Spec;
            } else {
                formatSpec = analyseDateTimePicture(picture);
            }
    
            const offsetMillis = (60 * offsetHours + offsetMinutes) * 60 * 1000;
            const dateTime = new Date(millis + offsetMillis);
    
            let result = '';
            formatSpec.parts.forEach(function (part) {
                if (part.type === 'literal') {
                    result += part.value;
                } else {
                    result += formatComponent(dateTime, part);
                }
            });
    
            return result;
        }
    
        /**
         * Generate a regex to parse integers or timestamps
         * @param {object} formatSpec - object representing the format
         * @returns {object} - regex
         */
        function generateRegex(formatSpec) {
            var matcher = {};
            if (formatSpec.type === 'datetime') {
                matcher.type = 'datetime';
                matcher.parts = formatSpec.parts.map(function (part) {
                    var res = {};
                    if (part.type === 'literal') {
                        res.regex = part.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    } else if (part.component === 'Z' || part.component === 'z') {
                        // timezone
                        let separator;
                        if (!Array.isArray(part.integerFormat.groupingSeparators)) {
                            separator = part.integerFormat.groupingSeparators;
                        }
                        res.regex = '';
                        if (part.component === 'z') {
                            res.regex = 'GMT';
                        }
                        res.regex += '[-+][0-9]+';
                        if (separator) {
                            res.regex += separator.character + '[0-9]+';
                        }
                        res.parse = function(value) {
                            if (part.component === 'z') {
                                value = value.substring(3); // remove the leading GMT
                            }
                            let offsetHours = 0, offsetMinutes = 0;
                            if (separator) {
                                offsetHours = Number.parseInt(value.substring(0, value.indexOf(separator.character)));
                                offsetMinutes = Number.parseInt(value.substring(value.indexOf(separator.character) + 1));
                            } else {
                                // depends on number of digits
                                const numdigits = value.length - 1;
                                if (numdigits <= 2) {
                                    // just hour offset
                                    offsetHours = Number.parseInt(value);
                                } else {
                                    offsetHours = Number.parseInt(value.substring(0, 3));
                                    offsetMinutes = Number.parseInt(value.substring(3));
                                }
                            }
                            return offsetHours * 60 + offsetMinutes;
                        };
                    } else if (part.integerFormat) {
                        res = generateRegex(part.integerFormat);
                    } else {
                        // must be a month or day name
                        res.regex = '[a-zA-Z]+';
                        var lookup = {};
                        if (part.component === 'M' || part.component === 'x') {
                            // months
                            months.forEach(function (name, index) {
                                if (part.width && part.width.max) {
                                    lookup[name.substring(0, part.width.max)] = index + 1;
                                } else {
                                    lookup[name] = index + 1;
                                }
                            });
                        } else if (part.component === 'F') {
                            // days
                            days.forEach(function (name, index) {
                                if (index > 0) {
                                    if (part.width && part.width.max) {
                                        lookup[name.substring(0, part.width.max)] = index;
                                    } else {
                                        lookup[name] = index;
                                    }
                                }
                            });
                        } else if (part.component === 'P') {
                            lookup = {'am': 0, 'AM': 0, 'pm': 1, 'PM': 1};
                        } else {
                            // unsupported 'name' option for this component
                            throw {
                                code: 'D3133',
                                value: part.component
                            };
                        }
                        res.parse = function (value) {
                            return lookup[value];
                        };
                    }
                    res.component = part.component;
                    return res;
                });
            } else { // type === 'integer'
                matcher.type = 'integer';
                const isUpper = formatSpec.case === tcase.UPPER;
                switch (formatSpec.primary) {
                    case formats.LETTERS:
                        matcher.regex = isUpper ? '[A-Z]+' : '[a-z]+';
                        matcher.parse = function (value) {
                            return lettersToDecimal(value, isUpper ? 'A' : 'a');
                        };
                        break;
                    case formats.ROMAN:
                        matcher.regex = isUpper ? '[MDCLXVI]+' : '[mdclxvi]+';
                        matcher.parse = function (value) {
                            return romanToDecimal(isUpper ? value : value.toUpperCase());
                        };
                        break;
                    case formats.WORDS:
                        matcher.regex = '(?:' + Object.keys(wordValues).concat('and', '[\\-, ]').join('|') + ')+';
                        matcher.parse = function (value) {
                            return wordsToNumber(value.toLowerCase());
                        };
                        break;
                    case formats.DECIMAL:
                        matcher.regex = '[0-9]+';
                        if (formatSpec.ordinal) {
                            // ordinals
                            matcher.regex += '(?:th|st|nd|rd)';
                        }
                        matcher.parse = function (value) {
                            let digits = value;
                            if (formatSpec.ordinal) {
                                // strip off the suffix
                                digits = value.substring(0, value.length - 2);
                            }
                            // strip out the separators
                            if (formatSpec.regular) {
                                digits = digits.split(',').join('');
                            } else {
                                formatSpec.groupingSeparators.forEach(sep => {
                                    digits = digits.split(sep.character).join('');
                                });
                            }
                            if (formatSpec.zeroCode !== 0x30) {
                                // apply offset
                                digits = digits.split('').map(char => String.fromCodePoint(char.codePointAt(0) - formatSpec.zeroCode + 0x30)).join('');
                            }
                            return parseInt(digits);
                        };
                        break;
                    case formats.SEQUENCE:
                        throw {
                            code: 'D3130',
                            value: formatSpec.token
                        };
                }
    
            }
            return matcher;
        }
    
        /**
         * parse a string containing an integer as specified by the picture string
         * @param {string} value - the string to parse
         * @param {string} picture - the picture string
         * @returns {number} - the parsed number
         */
        function parseInteger(value, picture) {
            if (typeof value === 'undefined') {
                return undefined;
            }
    
            const formatSpec = analyseIntegerPicture(picture);
            const matchSpec = generateRegex(formatSpec);
            //const fullRegex = '^' + matchSpec.regex + '$';
            //const matcher = new RegExp(fullRegex);
            // TODO validate input based on the matcher regex
            const result = matchSpec.parse(value);
            return result;
        }
    
        /**
         * parse a string containing a timestamp as specified by the picture string
         * @param {string} timestamp - the string to parse
         * @param {string} picture - the picture string
         * @returns {number} - the parsed timestamp in millis since the epoch
         */
        function parseDateTime(timestamp, picture) {
            const formatSpec = analyseDateTimePicture(picture);
            const matchSpec = generateRegex(formatSpec);
            const fullRegex = '^' + matchSpec.parts.map(part => '(' + part.regex + ')').join('') + '$';
    
            const matcher = new RegExp(fullRegex, 'i'); // TODO can cache this against the picture
            var info = matcher.exec(timestamp);
            if (info !== null) {
                // validate what we've just parsed - do we have enough information to create a timestamp?
                // rules:
                // The date is specified by one of:
                //    {Y, M, D}    (dateA)
                // or {Y, d}       (dateB)
                // or {Y, x, w, F} (dateC)
                // or {X, W, F}    (dateD)
                // The time is specified by one of:
                //    {H, m, s, f}    (timeA)
                // or {P, h, m, s, f} (timeB)
                // All sets can have an optional Z
                // To create a timestamp (epoch millis) we need both date and time, but we can default missing
                // information according to the following rules:
                // - line up one combination of the above from date, and one from time, most significant value (MSV) to least significant (LSV
                // - for the values that have been captured, if there are any gaps between MSV and LSV, then throw an error
                //     (e.g.) if hour and seconds, but not minutes is given - throw
                //     (e.g.) if month, hour and minutes, but not day-of-month is given - throw
                // - anything right of the LSV should be defaulted to zero
                //     (e.g.) if hour and minutes given, default seconds and fractional seconds to zero
                //     (e.g.) if date only given, default the time to 0:00:00.000 (midnight)
                // - anything left of the MSV should be defaulted to the value of that component returned by $now()
                //     (e.g.) if time only given, default the date to today
                //     (e.g.) if month and date given, default to this year (and midnight, by previous rule)
                //   -- default values for X, x, W, w, F will be derived from the values returned by $now()
    
                // implement the above rules
                // determine which of the above date/time combinations we have by using bit masks
    
                //        Y X M x W w d D F P H h m s f Z
                // dateA  1 0 1 0 0 0 0 1 ?                     0 - must not appear
                // dateB  1 0 0 0 0 0 1 0 ?                     1 - can appear - relevant
                // dateC  0 1 0 1 0 1 0 0 1                     ? - can appear - ignored
                // dateD  0 1 0 0 1 0 0 0 1
                // timeA                    0 1 0 1 1 1
                // timeB                    1 0 1 1 1 1
    
                // create bitmasks based on the above
                //    date mask             YXMxWwdD
                const dmA = 161;  // binary 10100001
                const dmB = 130;  // binary 10000010
                const dmC = 84;   // binary 01010100
                const dmD = 72;   // binary 01001000
                //    time mask             PHhmsf
                const tmA = 23;   // binary 010111
                const tmB = 47;   // binary 101111
    
                const components = {};
                for (let i = 1; i < info.length; i++) {
                    const mpart = matchSpec.parts[i - 1];
                    if (mpart.parse) {
                        components[mpart.component] = mpart.parse(info[i]);
                    }
                }
    
                if(Object.getOwnPropertyNames(components).length === 0) {
                    // nothing specified
                    return undefined;
                }
    
                let mask = 0;
    
                const shift = bit => {
                    mask <<= 1;
                    mask += bit ? 1 : 0;
                };
    
                const isType = type => {
                    // shouldn't match any 0's, must match at least one 1
                    return !(~type & mask) && !!(type & mask);
                };
    
                'YXMxWwdD'.split('').forEach(part => shift(components[part]));
    
                const dateA = isType(dmA);
                const dateB = !dateA && isType(dmB);
                const dateC = isType(dmC);
                const dateD = !dateC && isType(dmD);
    
                mask = 0;
                'PHhmsf'.split('').forEach(part => shift(components[part]));
    
                const timeA = isType(tmA);
                const timeB = !timeA && isType(tmB);
    
                // should only be zero or one date type and zero or one time type
    
                const dateComps = dateB ? 'YD' : dateC ? 'XxwF' : dateD? 'XWF' : 'YMD';
                const timeComps = timeB ? 'Phmsf' : 'Hmsf';
    
                const comps = dateComps + timeComps;
    
                // step through the candidate parts from most significant to least significant
                // default the most significant unspecified parts to current timestamp component
                // default the least significant unspecified parts to zero
                // if any gaps in between the specified parts, throw an error
    
                const now = this.environment.timestamp; // must get the fixed timestamp from jsonata
    
                let startSpecified = false;
                let endSpecified = false;
                comps.split('').forEach(part => {
                    if(typeof components[part] === 'undefined') {
                        if(startSpecified) {
                            // past the specified block - default to zero
                            components[part] = ('MDd'.indexOf(part) !== -1) ? 1 : 0;
                            endSpecified = true;
                        } else {
                            // haven't hit the specified block yet, default to current timestamp
                            components[part] = getDateTimeFragment(now, part);
                        }
                    } else {
                        startSpecified = true;
                        if(endSpecified) {
                            throw {
                                code: 'D3136'
                            };
                        }
                    }
                });
    
                // validate and fill in components
                if (components.M > 0) {
                    components.M -= 1;  // Date.UTC requires a zero-indexed month
                } else {
                    components.M = 0; // default to January
                }
                if (dateB) {
                    // millis for given 1st Jan of that year (at 00:00 UTC)
                    const firstJan = Date.UTC(components.Y, 0);
                    const offsetMillis = (components.d - 1) * 1000 * 60 * 60 * 24;
                    const derivedDate = new Date(firstJan + offsetMillis);
                    components.M = derivedDate.getUTCMonth();
                    components.D = derivedDate.getUTCDate();
                }
                if (dateC) {
                    // TODO implement this
                    // parsing this format not currently supported
                    throw {
                        code: 'D3136'
                    };
                }
                if (dateD) {
                    // TODO implement this
                    // parsing this format (ISO week date) not currently supported
                    throw {
                        code: 'D3136'
                    };
                }
                if (timeB) {
                    // 12hr to 24hr
                    components.H = components.h === 12 ? 0 : components.h;
                    if (components.P === 1) {
                        components.H += 12;
                    }
                }
    
                var millis = Date.UTC(components.Y, components.M, components.D, components.H, components.m, components.s, components.f);
                if(components.Z || components.z) {
                    // adjust for timezone
                    millis -= (components.Z || components.z) * 60 * 1000;
                }
                return millis;
            }
        }
    
        // Regular expression to match an ISO 8601 formatted timestamp
        var iso8601regex = new RegExp('^\\d{4}(-[01]\\d)*(-[0-3]\\d)*(T[0-2]\\d:[0-5]\\d:[0-5]\\d)*(\\.\\d+)?([+-][0-2]\\d:?[0-5]\\d|Z)?$');
    
        /**
         * Converts an ISO 8601 timestamp to milliseconds since the epoch
         *
         * @param {string} timestamp - the timestamp to be converted
         * @param {string} [picture] - the picture string defining the format of the timestamp (defaults to ISO 8601)
         * @returns {Number} - milliseconds since the epoch
         */
        function toMillis(timestamp, picture) {
            // undefined inputs always return undefined
            if(typeof timestamp === 'undefined') {
                return undefined;
            }
    
            if(typeof picture === 'undefined') {
                if (!iso8601regex.test(timestamp)) {
                    throw {
                        stack: (new Error()).stack,
                        code: "D3110",
                        value: timestamp
                    };
                }
    
                return Date.parse(timestamp);
            } else {
                return parseDateTime.call(this, timestamp, picture);
            }
        }
    
        /**
         * Converts milliseconds since the epoch to an ISO 8601 timestamp
         * @param {Number} millis - milliseconds since the epoch to be converted
         * @param {string} [picture] - the picture string defining the format of the timestamp (defaults to ISO 8601)
         * @param {string} [timezone] - the timezone to format the timestamp in (defaults to UTC)
         * @returns {String} - the formatted timestamp
         */
        function fromMillis(millis, picture, timezone) {
            // undefined inputs always return undefined
            if(typeof millis === 'undefined') {
                return undefined;
            }
    
            return formatDateTime.call(this, millis, picture, timezone);
        }
    
        return {
            formatInteger, parseInteger, fromMillis, toMillis
        };
    })();
    
    module.exports = dateTime;
    
    },{"./utils":6}],2:[function(require,module,exports){
    (function (global){(function (){
    /**
     * © Copyright IBM Corp. 2016, 2018 All Rights Reserved
     *   Project name: JSONata
     *   This project is licensed under the MIT License, see LICENSE
     */
    
    var utils = require('./utils');
    
    const functions = (() => {
        'use strict';
    
        var isNumeric = utils.isNumeric;
        var isArrayOfStrings = utils.isArrayOfStrings;
        var isArrayOfNumbers = utils.isArrayOfNumbers;
        var createSequence = utils.createSequence;
        var isSequence = utils.isSequence;
        var isFunction = utils.isFunction;
        var isLambda = utils.isLambda;
        var isPromise = utils.isPromise;
        var getFunctionArity = utils.getFunctionArity;
        var deepEquals = utils.isDeepEqual;
        var stringToArray = utils.stringToArray;
    
        /**
         * Sum function
         * @param {Object} args - Arguments
         * @returns {number} Total value of arguments
         */
        function sum(args) {
            // undefined inputs always return undefined
            if (typeof args === 'undefined') {
                return undefined;
            }
    
            var total = 0;
            args.forEach(function (num) {
                total += num;
            });
            return total;
        }
    
        /**
         * Count function
         * @param {Object} args - Arguments
         * @returns {number} Number of elements in the array
         */
        function count(args) {
            // undefined inputs always return undefined
            if (typeof args === 'undefined') {
                return 0;
            }
    
            return args.length;
        }
    
        /**
         * Max function
         * @param {Object} args - Arguments
         * @returns {number} Max element in the array
         */
        function max(args) {
            // undefined inputs always return undefined
            if (typeof args === 'undefined' || args.length === 0) {
                return undefined;
            }
    
            return Math.max.apply(Math, args);
        }
    
        /**
         * Min function
         * @param {Object} args - Arguments
         * @returns {number} Min element in the array
         */
        function min(args) {
            // undefined inputs always return undefined
            if (typeof args === 'undefined' || args.length === 0) {
                return undefined;
            }
    
            return Math.min.apply(Math, args);
        }
    
        /**
         * Average function
         * @param {Object} args - Arguments
         * @returns {number} Average element in the array
         */
        function average(args) {
            // undefined inputs always return undefined
            if (typeof args === 'undefined' || args.length === 0) {
                return undefined;
            }
    
            var total = 0;
            args.forEach(function (num) {
                total += num;
            });
            return total / args.length;
        }
    
        /**
         * Stringify arguments
         * @param {Object} arg - Arguments
         * @param {boolean} [prettify] - Pretty print the result
         * @returns {String} String from arguments
         */
        function string(arg, prettify = false) {
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            var str;
    
            if (typeof arg === 'string') {
                // already a string
                str = arg;
            } else if (isFunction(arg)) {
                // functions (built-in and lambda convert to empty string
                str = '';
            } else if (typeof arg === 'number' && !isFinite(arg)) {
                throw {
                    code: "D3001",
                    value: arg,
                    stack: (new Error()).stack
                };
            } else {
                var space = prettify ? 2 : 0;
                if(Array.isArray(arg) && arg.outerWrapper) {
                    arg = arg[0];
                }
                str = JSON.stringify(arg, function (key, val) {
                    return (typeof val !== 'undefined' && val !== null && val.toPrecision && isNumeric(val)) ? Number(val.toPrecision(15)) :
                        (val && isFunction(val)) ? '' : val;
                }, space);
            }
            return str;
        }
    
        /**
         * Create substring based on character number and length
         * @param {String} str - String to evaluate
         * @param {Integer} start - Character number to start substring
         * @param {Integer} [length] - Number of characters in substring
         * @returns {string|*} Substring
         */
        function substring(str, start, length) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            var strArray = stringToArray(str);
            var strLength = strArray.length;
    
            if (strLength + start < 0) {
                start = 0;
            }
    
            if (typeof length !== 'undefined') {
                if (length <= 0) {
                    return '';
                }
                var end = start >= 0 ? start + length : strLength + start + length;
                return strArray.slice(start, end).join('');
            }
    
            return strArray.slice(start).join('');
        }
    
        /**
         * Create substring up until a character
         * @param {String} str - String to evaluate
         * @param {String} chars - Character to define substring boundary
         * @returns {*} Substring
         */
        function substringBefore(str, chars) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            var pos = str.indexOf(chars);
            if (pos > -1) {
                return str.substr(0, pos);
            } else {
                return str;
            }
        }
    
        /**
         * Create substring after a character
         * @param {String} str - String to evaluate
         * @param {String} chars - Character to define substring boundary
         * @returns {*} Substring
         */
        function substringAfter(str, chars) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            var pos = str.indexOf(chars);
            if (pos > -1) {
                return str.substr(pos + chars.length);
            } else {
                return str;
            }
        }
    
        /**
         * Lowercase a string
         * @param {String} str - String to evaluate
         * @returns {string} Lowercase string
         */
        function lowercase(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            return str.toLowerCase();
        }
    
        /**
         * Uppercase a string
         * @param {String} str - String to evaluate
         * @returns {string} Uppercase string
         */
        function uppercase(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            return str.toUpperCase();
        }
    
        /**
         * length of a string
         * @param {String} str - string
         * @returns {Number} The number of characters in the string
         */
        function length(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            return stringToArray(str).length;
        }
    
        /**
         * Normalize and trim whitespace within a string
         * @param {string} str - string to be trimmed
         * @returns {string} - trimmed string
         */
        function trim(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            // normalize whitespace
            var result = str.replace(/[ \t\n\r]+/gm, ' ');
            if (result.charAt(0) === ' ') {
                // strip leading space
                result = result.substring(1);
            }
            if (result.charAt(result.length - 1) === ' ') {
                // strip trailing space
                result = result.substring(0, result.length - 1);
            }
            return result;
        }
    
        /**
         * Pad a string to a minimum width by adding characters to the start or end
         * @param {string} str - string to be padded
         * @param {number} width - the minimum width; +ve pads to the right, -ve pads to the left
         * @param {string} [char] - the pad character(s); defaults to ' '
         * @returns {string} - padded string
         */
        function pad(str, width, char) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            if (typeof char === 'undefined' || char.length === 0) {
                char = ' ';
            }
    
            var result;
            var padLength = Math.abs(width) - length(str);
            if (padLength > 0) {
                var padding = (new Array(padLength + 1)).join(char);
                if (char.length > 1) {
                    padding = substring(padding, 0, padLength);
                }
                if (width > 0) {
                    result = str + padding;
                } else {
                    result = padding + str;
                }
            } else {
                result = str;
            }
            return result;
        }
    
        /**
         * Evaluate the matcher function against the str arg
         *
         * @param {*} matcher - matching function (native or lambda)
         * @param {string} str - the string to match against
         * @returns {object} - structure that represents the match(es)
         */
        async function evaluateMatcher(matcher, str) {
            var result = matcher.apply(this, [str]); // eslint-disable-line no-useless-call
            if(isPromise(result)) {
                result = await result;
            }
            if(result && !(typeof result.start === 'number' || result.end === 'number' || Array.isArray(result.groups) || isFunction(result.next))) {
                // the matcher function didn't return the correct structure
                throw {
                    code: "T1010",
                    stack: (new Error()).stack,
                };
            }
            return result;
        }
    
        /**
         * Tests if the str contains the token
         * @param {String} str - string to test
         * @param {String} token - substring or regex to find
         * @returns {Boolean} - true if str contains token
         */
        async function contains(str, token) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            var result;
    
            if (typeof token === 'string') {
                result = (str.indexOf(token) !== -1);
            } else {
                var matches = await evaluateMatcher(token, str);
                result = (typeof matches !== 'undefined');
            }
    
            return result;
        }
    
        /**
         * Match a string with a regex returning an array of object containing details of each match
         * @param {String} str - string
         * @param {String} regex - the regex applied to the string
         * @param {Integer} [limit] - max number of matches to return
         * @returns {Array} The array of match objects
         */
        async function match(str, regex, limit) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            // limit, if specified, must be a non-negative number
            if (limit < 0) {
                throw {
                    stack: (new Error()).stack,
                    value: limit,
                    code: 'D3040',
                    index: 3
                };
            }
    
            var result = createSequence();
    
            if (typeof limit === 'undefined' || limit > 0) {
                var count = 0;
                var matches = await evaluateMatcher(regex, str);
                if (typeof matches !== 'undefined') {
                    while (typeof matches !== 'undefined' && (typeof limit === 'undefined' || count < limit)) {
                        result.push({
                            match: matches.match,
                            index: matches.start,
                            groups: matches.groups
                        });
                        matches = await evaluateMatcher(matches.next);
                        count++;
                    }
                }
            }
    
            return result;
        }
    
        /**
         * Match a string with a regex returning an array of object containing details of each match
         * @param {String} str - string
         * @param {String} pattern - the substring/regex applied to the string
         * @param {String} replacement - text to replace the matched substrings
         * @param {Integer} [limit] - max number of matches to return
         * @returns {Array} The array of match objects
         */
        async function replace(str, pattern, replacement, limit) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            var self = this;
    
            // pattern cannot be an empty string
            if (pattern === '') {
                throw {
                    code: "D3010",
                    stack: (new Error()).stack,
                    value: pattern,
                    index: 2
                };
            }
    
            // limit, if specified, must be a non-negative number
            if (limit < 0) {
                throw {
                    code: "D3011",
                    stack: (new Error()).stack,
                    value: limit,
                    index: 4
                };
            }
    
            var replacer;
            if (typeof replacement === 'string') {
                replacer = function (regexMatch) {
                    var substitute = '';
                    // scan forward, copying the replacement text into the substitute string
                    // and replace any occurrence of $n with the values matched by the regex
                    var position = 0;
                    var index = replacement.indexOf('$', position);
                    while (index !== -1 && position < replacement.length) {
                        substitute += replacement.substring(position, index);
                        position = index + 1;
                        var dollarVal = replacement.charAt(position);
                        if (dollarVal === '$') {
                            // literal $
                            substitute += '$';
                            position++;
                        } else if (dollarVal === '0') {
                            substitute += regexMatch.match;
                            position++;
                        } else {
                            var maxDigits;
                            if (regexMatch.groups.length === 0) {
                                // no sub-matches; any $ followed by a digit will be replaced by an empty string
                                maxDigits = 1;
                            } else {
                                // max number of digits to parse following the $
                                maxDigits = Math.floor(Math.log(regexMatch.groups.length) * Math.LOG10E) + 1;
                            }
                            index = parseInt(replacement.substring(position, position + maxDigits), 10);
                            if (maxDigits > 1 && index > regexMatch.groups.length) {
                                index = parseInt(replacement.substring(position, position + maxDigits - 1), 10);
                            }
                            if (!isNaN(index)) {
                                if (regexMatch.groups.length > 0) {
                                    var submatch = regexMatch.groups[index - 1];
                                    if (typeof submatch !== 'undefined') {
                                        substitute += submatch;
                                    }
                                }
                                position += index.toString().length;
                            } else {
                                // not a capture group, treat the $ as literal
                                substitute += '$';
                            }
                        }
                        index = replacement.indexOf('$', position);
                    }
                    substitute += replacement.substring(position);
                    return substitute;
                };
            } else {
                replacer = replacement;
            }
    
            var result = '';
            var position = 0;
    
            if (typeof limit === 'undefined' || limit > 0) {
                var count = 0;
                if (typeof pattern === 'string') {
                    var index = str.indexOf(pattern, position);
                    while (index !== -1 && (typeof limit === 'undefined' || count < limit)) {
                        result += str.substring(position, index);
                        result += replacement;
                        position = index + pattern.length;
                        count++;
                        index = str.indexOf(pattern, position);
                    }
                    result += str.substring(position);
                } else {
                    var matches = await evaluateMatcher(pattern, str);
                    if (typeof matches !== 'undefined') {
                        while (typeof matches !== 'undefined' && (typeof limit === 'undefined' || count < limit)) {
                            result += str.substring(position, matches.start);
                            var replacedWith = replacer.apply(self, [matches]);
                            if (isPromise(replacedWith)) {
                                replacedWith = await replacedWith;
                            }
                            // check replacedWith is a string
                            if (typeof replacedWith === 'string') {
                                result += replacedWith;
                            } else {
                                // not a string - throw error
                                throw {
                                    code: "D3012",
                                    stack: (new Error()).stack,
                                    value: replacedWith
                                };
                            }
                            position = matches.start + matches.match.length;
                            count++;
                            matches = await evaluateMatcher(matches.next);
                        }
                        result += str.substring(position);
                    } else {
                        result = str;
                    }
                }
            } else {
                result = str;
            }
    
            return result;
        }
    
        /**
         * Base64 encode a string
         * @param {String} str - string
         * @returns {String} Base 64 encoding of the binary data
         */
        function base64encode(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
            // Use btoa in a browser, or Buffer in Node.js
    
            var btoa = typeof window !== 'undefined' ?
                /* istanbul ignore next */ window.btoa :
                function (str) {
                    // Simply doing `new Buffer` at this point causes Browserify to pull
                    // in the entire Buffer browser library, which is large and unnecessary.
                    // Using `global.Buffer` defeats this.
                    return new global.Buffer.from(str, 'binary').toString('base64'); // eslint-disable-line new-cap
                };
            return btoa(str);
        }
    
        /**
         * Base64 decode a string
         * @param {String} str - string
         * @returns {String} Base 64 encoding of the binary data
         */
        function base64decode(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
            // Use btoa in a browser, or Buffer in Node.js
            var atob = typeof window !== 'undefined' ?
                /* istanbul ignore next */ window.atob :
                function (str) {
                    // Simply doing `new Buffer` at this point causes Browserify to pull
                    // in the entire Buffer browser library, which is large and unnecessary.
                    // Using `global.Buffer` defeats this.
                    return new global.Buffer.from(str, 'base64').toString('binary'); // eslint-disable-line new-cap
                };
            return atob(str);
        }
    
        /**
         * Encode a string into a component for a url
         * @param {String} str - String to encode
         * @returns {string} Encoded string
         */
        function encodeUrlComponent(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            // Catch URIErrors when URI sequence is malformed
            var returnVal;
            try {
                returnVal = encodeURIComponent(str);
            } catch (e) {
                throw {
                    code: "D3140",
                    stack: (new Error()).stack,
                    value: str,
                    functionName: "encodeUrlComponent"
                };
            }
            return returnVal;
        }
    
        /**
         * Encode a string into a url
         * @param {String} str - String to encode
         * @returns {string} Encoded string
         */
        function encodeUrl(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            // Catch URIErrors when URI sequence is malformed
            var returnVal;
            try {
                returnVal = encodeURI(str);
            } catch (e) {
                throw {
                    code: "D3140",
                    stack: (new Error()).stack,
                    value: str,
                    functionName: "encodeUrl"
                };
            }
            return returnVal;
        }
    
        /**
         * Decode a string from a component for a url
         * @param {String} str - String to decode
         * @returns {string} Decoded string
         */
        function decodeUrlComponent(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            // Catch URIErrors when URI sequence is malformed
            var returnVal;
            try {
                returnVal = decodeURIComponent(str);
            } catch (e) {
                throw {
                    code: "D3140",
                    stack: (new Error()).stack,
                    value: str,
                    functionName: "decodeUrlComponent"
                };
            }
            return returnVal;
        }
    
        /**
         * Decode a string from a url
         * @param {String} str - String to decode
         * @returns {string} Decoded string
         */
        function decodeUrl(str) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            // Catch URIErrors when URI sequence is malformed
            var returnVal;
            try {
                returnVal = decodeURI(str);
            } catch (e) {
                throw {
                    code: "D3140",
                    stack: (new Error()).stack,
                    value: str,
                    functionName: "decodeUrl"
                };
            }
            return returnVal;
        }
    
        /**
         * Split a string into an array of substrings
         * @param {String} str - string
         * @param {String} separator - the token or regex that splits the string
         * @param {Integer} [limit] - max number of substrings
         * @returns {Array} The array of string
         */
        async function split(str, separator, limit) {
            // undefined inputs always return undefined
            if (typeof str === 'undefined') {
                return undefined;
            }
    
            // limit, if specified, must be a non-negative number
            if (limit < 0) {
                throw {
                    code: "D3020",
                    stack: (new Error()).stack,
                    value: limit,
                    index: 3
                };
            }
    
            var result = [];
    
            if (typeof limit === 'undefined' || limit > 0) {
                if (typeof separator === 'string') {
                    result = str.split(separator, limit);
                } else {
                    var count = 0;
                    var matches = await evaluateMatcher(separator, str);
                    if (typeof matches !== 'undefined') {
                        var start = 0;
                        while (typeof matches !== 'undefined' && (typeof limit === 'undefined' || count < limit)) {
                            result.push(str.substring(start, matches.start));
                            start = matches.end;
                            matches = await evaluateMatcher(matches.next);
                            count++;
                        }
                        if (typeof limit === 'undefined' || count < limit) {
                            result.push(str.substring(start));
                        }
                    } else {
                        result.push(str);
                    }
                }
            }
    
            return result;
        }
    
        /**
         * Join an array of strings
         * @param {Array} strs - array of string
         * @param {String} [separator] - the token that splits the string
         * @returns {String} The concatenated string
         */
        function join(strs, separator) {
            // undefined inputs always return undefined
            if (typeof strs === 'undefined') {
                return undefined;
            }
    
            // if separator is not specified, default to empty string
            if (typeof separator === 'undefined') {
                separator = "";
            }
    
            return strs.join(separator);
        }
    
        /**
         * Formats a number into a decimal string representation using XPath 3.1 F&O fn:format-number spec
         * @param {number} value - number to format
         * @param {String} picture - picture string definition
         * @param {Object} [options] - override locale defaults
         * @returns {String} The formatted string
         */
        function formatNumber(value, picture, options) {
            // undefined inputs always return undefined
            if (typeof value === 'undefined') {
                return undefined;
            }
    
            var defaults = {
                "decimal-separator": ".",
                "grouping-separator": ",",
                "exponent-separator": "e",
                "infinity": "Infinity",
                "minus-sign": "-",
                "NaN": "NaN",
                "percent": "%",
                "per-mille": "\u2030",
                "zero-digit": "0",
                "digit": "#",
                "pattern-separator": ";"
            };
    
            // if `options` is specified, then its entries override defaults
            var properties = defaults;
            if (typeof options !== 'undefined') {
                Object.keys(options).forEach(function (key) {
                    properties[key] = options[key];
                });
            }
    
            var decimalDigitFamily = [];
            var zeroCharCode = properties['zero-digit'].charCodeAt(0);
            for (var ii = zeroCharCode; ii < zeroCharCode + 10; ii++) {
                decimalDigitFamily.push(String.fromCharCode(ii));
            }
    
            var activeChars = decimalDigitFamily.concat([properties['decimal-separator'], properties['exponent-separator'], properties['grouping-separator'], properties.digit, properties['pattern-separator']]);
    
            var subPictures = picture.split(properties['pattern-separator']);
    
            if (subPictures.length > 2) {
                throw {
                    code: 'D3080',
                    stack: (new Error()).stack
                };
            }
    
            var splitParts = function (subpicture) {
                var prefix = (function () {
                    var ch;
                    for (var ii = 0; ii < subpicture.length; ii++) {
                        ch = subpicture.charAt(ii);
                        if (activeChars.indexOf(ch) !== -1 && ch !== properties['exponent-separator']) {
                            return subpicture.substring(0, ii);
                        }
                    }
                })();
                var suffix = (function () {
                    var ch;
                    for (var ii = subpicture.length - 1; ii >= 0; ii--) {
                        ch = subpicture.charAt(ii);
                        if (activeChars.indexOf(ch) !== -1 && ch !== properties['exponent-separator']) {
                            return subpicture.substring(ii + 1);
                        }
                    }
                })();
                var activePart = subpicture.substring(prefix.length, subpicture.length - suffix.length);
                var mantissaPart, exponentPart, integerPart, fractionalPart;
                var exponentPosition = subpicture.indexOf(properties['exponent-separator'], prefix.length);
                if (exponentPosition === -1 || exponentPosition > subpicture.length - suffix.length) {
                    mantissaPart = activePart;
                    exponentPart = undefined;
                } else {
                    mantissaPart = activePart.substring(0, exponentPosition);
                    exponentPart = activePart.substring(exponentPosition + 1);
                }
                var decimalPosition = mantissaPart.indexOf(properties['decimal-separator']);
                if (decimalPosition === -1) {
                    integerPart = mantissaPart;
                    fractionalPart = suffix;
                } else {
                    integerPart = mantissaPart.substring(0, decimalPosition);
                    fractionalPart = mantissaPart.substring(decimalPosition + 1);
                }
                return {
                    prefix: prefix,
                    suffix: suffix,
                    activePart: activePart,
                    mantissaPart: mantissaPart,
                    exponentPart: exponentPart,
                    integerPart: integerPart,
                    fractionalPart: fractionalPart,
                    subpicture: subpicture
                };
            };
    
            // validate the picture string, F&O 4.7.3
            var validate = function (parts) {
                var error;
                var ii;
                var subpicture = parts.subpicture;
                var decimalPos = subpicture.indexOf(properties['decimal-separator']);
                if (decimalPos !== subpicture.lastIndexOf(properties['decimal-separator'])) {
                    error = 'D3081';
                }
                if (subpicture.indexOf(properties.percent) !== subpicture.lastIndexOf(properties.percent)) {
                    error = 'D3082';
                }
                if (subpicture.indexOf(properties['per-mille']) !== subpicture.lastIndexOf(properties['per-mille'])) {
                    error = 'D3083';
                }
                if (subpicture.indexOf(properties.percent) !== -1 && subpicture.indexOf(properties['per-mille']) !== -1) {
                    error = 'D3084';
                }
                var valid = false;
                for (ii = 0; ii < parts.mantissaPart.length; ii++) {
                    var ch = parts.mantissaPart.charAt(ii);
                    if (decimalDigitFamily.indexOf(ch) !== -1 || ch === properties.digit) {
                        valid = true;
                        break;
                    }
                }
                if (!valid) {
                    error = 'D3085';
                }
                var charTypes = parts.activePart.split('').map(function (char) {
                    return activeChars.indexOf(char) === -1 ? 'p' : 'a';
                }).join('');
                if (charTypes.indexOf('p') !== -1) {
                    error = 'D3086';
                }
                if (decimalPos !== -1) {
                    if (subpicture.charAt(decimalPos - 1) === properties['grouping-separator'] || subpicture.charAt(decimalPos + 1) === properties['grouping-separator']) {
                        error = 'D3087';
                    }
                } else if (parts.integerPart.charAt(parts.integerPart.length - 1) === properties['grouping-separator']) {
                    error = 'D3088';
                }
                if (subpicture.indexOf(properties['grouping-separator'] + properties['grouping-separator']) !== -1) {
                    error = 'D3089';
                }
                var optionalDigitPos = parts.integerPart.indexOf(properties.digit);
                if (optionalDigitPos !== -1 && parts.integerPart.substring(0, optionalDigitPos).split('').filter(function (char) {
                    return decimalDigitFamily.indexOf(char) > -1;
                }).length > 0) {
                    error = 'D3090';
                }
                optionalDigitPos = parts.fractionalPart.lastIndexOf(properties.digit);
                if (optionalDigitPos !== -1 && parts.fractionalPart.substring(optionalDigitPos).split('').filter(function (char) {
                    return decimalDigitFamily.indexOf(char) > -1;
                }).length > 0) {
                    error = 'D3091';
                }
                var exponentExists = (typeof parts.exponentPart === 'string');
                if (exponentExists && parts.exponentPart.length > 0 && (subpicture.indexOf(properties.percent) !== -1 || subpicture.indexOf(properties['per-mille']) !== -1)) {
                    error = 'D3092';
                }
                if (exponentExists && (parts.exponentPart.length === 0 || parts.exponentPart.split('').filter(function (char) {
                    return decimalDigitFamily.indexOf(char) === -1;
                }).length > 0)) {
                    error = 'D3093';
                }
                if (error) {
                    throw {
                        code: error,
                        stack: (new Error()).stack
                    };
                }
            };
    
            // analyse the picture string, F&O 4.7.4
            var analyse = function (parts) {
                var getGroupingPositions = function (part, toLeft) {
                    var positions = [];
                    var groupingPosition = part.indexOf(properties['grouping-separator']);
                    while (groupingPosition !== -1) {
                        var charsToTheRight = (toLeft ? part.substring(0, groupingPosition) : part.substring(groupingPosition)).split('').filter(function (char) {
                            return decimalDigitFamily.indexOf(char) !== -1 || char === properties.digit;
                        }).length;
                        positions.push(charsToTheRight);
                        groupingPosition = parts.integerPart.indexOf(properties['grouping-separator'], groupingPosition + 1);
                    }
                    return positions;
                };
                var integerPartGroupingPositions = getGroupingPositions(parts.integerPart);
                var regular = function (indexes) {
                    // are the grouping positions regular? i.e. same interval between each of them
                    if (indexes.length === 0) {
                        return 0;
                    }
                    var gcd = function (a, b) {
                        return b === 0 ? a : gcd(b, a % b);
                    };
                    // find the greatest common divisor of all the positions
                    var factor = indexes.reduce(gcd);
                    // is every position separated by this divisor? If so, it's regular
                    for (var index = 1; index <= indexes.length; index++) {
                        if (indexes.indexOf(index * factor) === -1) {
                            return 0;
                        }
                    }
                    return factor;
                };
    
                var regularGrouping = regular(integerPartGroupingPositions);
                var fractionalPartGroupingPositions = getGroupingPositions(parts.fractionalPart, true);
    
                var minimumIntegerPartSize = parts.integerPart.split('').filter(function (char) {
                    return decimalDigitFamily.indexOf(char) !== -1;
                }).length;
                var scalingFactor = minimumIntegerPartSize;
    
                var fractionalPartArray = parts.fractionalPart.split('');
                var minimumFactionalPartSize = fractionalPartArray.filter(function (char) {
                    return decimalDigitFamily.indexOf(char) !== -1;
                }).length;
                var maximumFactionalPartSize = fractionalPartArray.filter(function (char) {
                    return decimalDigitFamily.indexOf(char) !== -1 || char === properties.digit;
                }).length;
                var exponentPresent = typeof parts.exponentPart === 'string';
                if (minimumIntegerPartSize === 0 && maximumFactionalPartSize === 0) {
                    if (exponentPresent) {
                        minimumFactionalPartSize = 1;
                        maximumFactionalPartSize = 1;
                    } else {
                        minimumIntegerPartSize = 1;
                    }
                }
                if (exponentPresent && minimumIntegerPartSize === 0 && parts.integerPart.indexOf(properties.digit) !== -1) {
                    minimumIntegerPartSize = 1;
                }
                if (minimumIntegerPartSize === 0 && minimumFactionalPartSize === 0) {
                    minimumFactionalPartSize = 1;
                }
                var minimumExponentSize = 0;
                if (exponentPresent) {
                    minimumExponentSize = parts.exponentPart.split('').filter(function (char) {
                        return decimalDigitFamily.indexOf(char) !== -1;
                    }).length;
                }
    
                return {
                    integerPartGroupingPositions: integerPartGroupingPositions,
                    regularGrouping: regularGrouping,
                    minimumIntegerPartSize: minimumIntegerPartSize,
                    scalingFactor: scalingFactor,
                    prefix: parts.prefix,
                    fractionalPartGroupingPositions: fractionalPartGroupingPositions,
                    minimumFactionalPartSize: minimumFactionalPartSize,
                    maximumFactionalPartSize: maximumFactionalPartSize,
                    minimumExponentSize: minimumExponentSize,
                    suffix: parts.suffix,
                    picture: parts.subpicture
                };
            };
    
            var parts = subPictures.map(splitParts);
            parts.forEach(validate);
    
            var variables = parts.map(analyse);
    
            var minus_sign = properties['minus-sign'];
            var zero_digit = properties['zero-digit'];
            var decimal_separator = properties['decimal-separator'];
            var grouping_separator = properties['grouping-separator'];
    
            if (variables.length === 1) {
                variables.push(JSON.parse(JSON.stringify(variables[0])));
                variables[1].prefix = minus_sign + variables[1].prefix;
            }
    
            // TODO cache the result of the analysis
    
            // format the number
            // bullet 1: TODO: NaN - not sure we'd ever get this in JSON
            var pic;
            // bullet 2:
            if (value >= 0) {
                pic = variables[0];
            } else {
                pic = variables[1];
            }
            var adjustedNumber;
            // bullet 3:
            if (pic.picture.indexOf(properties.percent) !== -1) {
                adjustedNumber = value * 100;
            } else if (pic.picture.indexOf(properties['per-mille']) !== -1) {
                adjustedNumber = value * 1000;
            } else {
                adjustedNumber = value;
            }
            // bullet 4:
            // TODO: infinity - not sure we'd ever get this in JSON
            // bullet 5:
            var mantissa, exponent;
            if (pic.minimumExponentSize === 0) {
                mantissa = adjustedNumber;
            } else {
                // mantissa * 10^exponent = adjustedNumber
                var maxMantissa = Math.pow(10, pic.scalingFactor);
                var minMantissa = Math.pow(10, pic.scalingFactor - 1);
                mantissa = adjustedNumber;
                exponent = 0;
                while (mantissa < minMantissa) {
                    mantissa *= 10;
                    exponent -= 1;
                }
                while (mantissa > maxMantissa) {
                    mantissa /= 10;
                    exponent += 1;
                }
            }
            // bullet 6:
            var roundedNumber = round(mantissa, pic.maximumFactionalPartSize);
            // bullet 7:
            var makeString = function (value, dp) {
                var str = Math.abs(value).toFixed(dp);
                if (zero_digit !== '0') {
                    str = str.split('').map(function (digit) {
                        if (digit >= '0' && digit <= '9') {
                            return decimalDigitFamily[digit.charCodeAt(0) - 48];
                        } else {
                            return digit;
                        }
                    }).join('');
                }
                return str;
            };
            var stringValue = makeString(roundedNumber, pic.maximumFactionalPartSize);
            var decimalPos = stringValue.indexOf('.');
            if (decimalPos === -1) {
                stringValue = stringValue + decimal_separator;
            } else {
                stringValue = stringValue.replace('.', decimal_separator);
            }
            while (stringValue.charAt(0) === zero_digit) {
                stringValue = stringValue.substring(1);
            }
            while (stringValue.charAt(stringValue.length - 1) === zero_digit) {
                stringValue = stringValue.substring(0, stringValue.length - 1);
            }
            // bullets 8 & 9:
            decimalPos = stringValue.indexOf(decimal_separator);
            var padLeft = pic.minimumIntegerPartSize - decimalPos;
            var padRight = pic.minimumFactionalPartSize - (stringValue.length - decimalPos - 1);
            stringValue = (padLeft > 0 ? new Array(padLeft + 1).join(zero_digit) : '') + stringValue;
            stringValue = stringValue + (padRight > 0 ? new Array(padRight + 1).join(zero_digit) : '');
            decimalPos = stringValue.indexOf(decimal_separator);
            // bullet 10:
            if (pic.regularGrouping > 0) {
                var groupCount = Math.floor((decimalPos - 1) / pic.regularGrouping);
                for (var group = 1; group <= groupCount; group++) {
                    stringValue = [stringValue.slice(0, decimalPos - group * pic.regularGrouping), grouping_separator, stringValue.slice(decimalPos - group * pic.regularGrouping)].join('');
                }
            } else {
                pic.integerPartGroupingPositions.forEach(function (pos) {
                    stringValue = [stringValue.slice(0, decimalPos - pos), grouping_separator, stringValue.slice(decimalPos - pos)].join('');
                    decimalPos++;
                });
            }
            // bullet 11:
            decimalPos = stringValue.indexOf(decimal_separator);
            pic.fractionalPartGroupingPositions.forEach(function (pos) {
                stringValue = [stringValue.slice(0, pos + decimalPos + 1), grouping_separator, stringValue.slice(pos + decimalPos + 1)].join('');
            });
            // bullet 12:
            decimalPos = stringValue.indexOf(decimal_separator);
            if (pic.picture.indexOf(decimal_separator) === -1 || decimalPos === stringValue.length - 1) {
                stringValue = stringValue.substring(0, stringValue.length - 1);
            }
            // bullet 13:
            if (typeof exponent !== 'undefined') {
                var stringExponent = makeString(exponent, 0);
                padLeft = pic.minimumExponentSize - stringExponent.length;
                if (padLeft > 0) {
                    stringExponent = new Array(padLeft + 1).join(zero_digit) + stringExponent;
                }
                stringValue = stringValue + properties['exponent-separator'] + (exponent < 0 ? minus_sign : '') + stringExponent;
            }
            // bullet 14:
            stringValue = pic.prefix + stringValue + pic.suffix;
            return stringValue;
        }
    
        /**
         * Converts a number to a string using a specified number base
         * @param {number} value - the number to convert
         * @param {number} [radix] - the number base; must be between 2 and 36. Defaults to 10
         * @returns {string} - the converted string
         */
        function formatBase(value, radix) {
            // undefined inputs always return undefined
            if (typeof value === 'undefined') {
                return undefined;
            }
    
            value = round(value);
    
            if (typeof radix === 'undefined') {
                radix = 10;
            } else {
                radix = round(radix);
            }
    
            if (radix < 2 || radix > 36) {
                throw {
                    code: 'D3100',
                    stack: (new Error()).stack,
                    value: radix
                };
    
            }
    
            var result = value.toString(radix);
    
            return result;
        }
    
        /**
         * Cast argument to number
         * @param {Object} arg - Argument
         * @returns {Number} numeric value of argument
         */
        function number(arg) {
            var result;
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            if (typeof arg === 'number') {
                // already a number
                result = arg;
            } else if (typeof arg === 'string' && /^-?[0-9]+(\.[0-9]+)?([Ee][-+]?[0-9]+)?$/.test(arg) && !isNaN(parseFloat(arg)) && isFinite(arg)) {
                result = parseFloat(arg);
            } else if (arg === true) {
                // boolean true casts to 1
                result = 1;
            } else if (arg === false) {
                // boolean false casts to 0
                result = 0;
            } else {
                throw {
                    code: "D3030",
                    value: arg,
                    stack: (new Error()).stack,
                    index: 1
                };
            }
            return result;
        }
    
        /**
         * Absolute value of a number
         * @param {Number} arg - Argument
         * @returns {Number} absolute value of argument
         */
        function abs(arg) {
            var result;
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            result = Math.abs(arg);
            return result;
        }
    
        /**
         * Rounds a number down to integer
         * @param {Number} arg - Argument
         * @returns {Number} rounded integer
         */
        function floor(arg) {
            var result;
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            result = Math.floor(arg);
            return result;
        }
    
        /**
         * Rounds a number up to integer
         * @param {Number} arg - Argument
         * @returns {Number} rounded integer
         */
        function ceil(arg) {
            var result;
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            result = Math.ceil(arg);
            return result;
        }
    
        /**
         * Round to half even
         * @param {Number} arg - Argument
         * @param {Number} [precision] - number of decimal places
         * @returns {Number} rounded integer
         */
        function round(arg, precision) {
            var result;
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            if (precision) {
                // shift the decimal place - this needs to be done in a string since multiplying
                // by a power of ten can introduce floating point precision errors which mess up
                // this rounding algorithm - See 'Decimal rounding' in
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
                // Shift
                var value = arg.toString().split('e');
                arg = +(value[0] + 'e' + (value[1] ? (+value[1] + precision) : precision));
    
            }
    
            // round up to nearest int
            result = Math.round(arg);
            var diff = result - arg;
            if (Math.abs(diff) === 0.5 && Math.abs(result % 2) === 1) {
                // rounded the wrong way - adjust to nearest even number
                result = result - 1;
            }
            if (precision) {
                // Shift back
                value = result.toString().split('e');
                /* istanbul ignore next */
                result = +(value[0] + 'e' + (value[1] ? (+value[1] - precision) : -precision));
            }
            if (Object.is(result, -0)) { // ESLint rule 'no-compare-neg-zero' suggests this way
                // JSON doesn't do -0
                result = 0;
            }
            return result;
        }
    
        /**
         * Square root of number
         * @param {Number} arg - Argument
         * @returns {Number} square root
         */
        function sqrt(arg) {
            var result;
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            if (arg < 0) {
                throw {
                    stack: (new Error()).stack,
                    code: "D3060",
                    index: 1,
                    value: arg
                };
            }
    
            result = Math.sqrt(arg);
    
            return result;
        }
    
        /**
         * Raises number to the power of the second number
         * @param {Number} arg - the base
         * @param {Number} exp - the exponent
         * @returns {Number} rounded integer
         */
        function power(arg, exp) {
            var result;
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            result = Math.pow(arg, exp);
    
            if (!isFinite(result)) {
                throw {
                    stack: (new Error()).stack,
                    code: "D3061",
                    index: 1,
                    value: arg,
                    exp: exp
                };
            }
    
            return result;
        }
    
        /**
         * Returns a random number 0 <= n < 1
         * @returns {number} random number
         */
        function random() {
            return Math.random();
        }
    
        /**
         * Evaluate an input and return a boolean
         * @param {*} arg - Arguments
         * @returns {boolean} Boolean
         */
        function boolean(arg) {
            // cast arg to its effective boolean value
            // boolean: unchanged
            // string: zero-length -> false; otherwise -> true
            // number: 0 -> false; otherwise -> true
            // null -> false
            // array: empty -> false; length > 1 -> true
            // object: empty -> false; non-empty -> true
            // function -> false
    
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            var result = false;
            if (Array.isArray(arg)) {
                if (arg.length === 1) {
                    result = boolean(arg[0]);
                } else if (arg.length > 1) {
                    var trues = arg.filter(function (val) {
                        return boolean(val);
                    });
                    result = trues.length > 0;
                }
            } else if (typeof arg === 'string') {
                if (arg.length > 0) {
                    result = true;
                }
            } else if (isNumeric(arg)) {
                if (arg !== 0) {
                    result = true;
                }
            } else if (arg !== null && typeof arg === 'object') {
                if (Object.keys(arg).length > 0) {
                    result = true;
                }
            } else if (typeof arg === 'boolean' && arg === true) {
                result = true;
            }
            return result;
        }
    
        /**
         * returns the Boolean NOT of the arg
         * @param {*} arg - argument
         * @returns {boolean} - NOT arg
         */
        function not(arg) {
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            return !boolean(arg);
        }
    
        /**
         * Helper function to build the arguments to be supplied to the function arg of the
         * HOFs map, filter, each, sift and single
         * @param {function} func - the function to be invoked
         * @param {*} arg1 - the first (required) arg - the value
         * @param {*} arg2 - the second (optional) arg - the position (index or key)
         * @param {*} arg3 - the third (optional) arg - the whole structure (array or object)
         * @returns {*[]} the argument list
         */
        function hofFuncArgs(func, arg1, arg2, arg3) {
            var func_args = [arg1]; // the first arg (the value) is required
            // the other two are optional - only supply it if the function can take it
            var length = getFunctionArity(func);
            if (length >= 2) {
                func_args.push(arg2);
            }
            if (length >= 3) {
                func_args.push(arg3);
            }
            return func_args;
        }
    
        /**
         * Create a map from an array of arguments
         * @param {Array} [arr] - array to map over
         * @param {Function} func - function to apply
         * @returns {Array} Map array
         */
        async function map(arr, func) {
            // undefined inputs always return undefined
            if (typeof arr === 'undefined') {
                return undefined;
            }
    
            var result = createSequence();
            // do the map - iterate over the arrays, and invoke func
            for (var i = 0; i < arr.length; i++) {
                var func_args = hofFuncArgs(func, arr[i], i, arr);
                // invoke func
                var res = await func.apply(this, func_args);
                if (typeof res !== 'undefined') {
                    result.push(res);
                }
            }
    
            return result;
        }
    
        /**
         * Create a map from an array of arguments
         * @param {Array} [arr] - array to filter
         * @param {Function} func - predicate function
         * @returns {Array} Map array
         */
        async function filter(arr, func) { // eslint-disable-line 
            // undefined inputs always return undefined
            if (typeof arr === 'undefined') {
                return undefined;
            }
    
            var result = createSequence();
    
            for (var i = 0; i < arr.length; i++) {
                var entry = arr[i];
                var func_args = hofFuncArgs(func, entry, i, arr);
                // invoke func
                var res = await func.apply(this, func_args);
                if (boolean(res)) {
                    result.push(entry);
                }
            }
    
            return result;
        }
    
        /**
         * Given an array, find the single element matching a specified condition
         * Throws an exception if the number of matching elements is not exactly one
         * @param {Array} [arr] - array to filter
         * @param {Function} [func] - predicate function
         * @returns {*} Matching element
         */
        async function single(arr, func) { // eslint-disable-line 
            // undefined inputs always return undefined
            if (typeof arr === 'undefined') {
                return undefined;
            }
    
            var hasFoundMatch = false;
            var result;
    
            for (var i = 0; i < arr.length; i++) {
                var entry = arr[i];
                var positiveResult = true;
                if (typeof func !== 'undefined') {
                    var func_args = hofFuncArgs(func, entry, i, arr);
                    // invoke func
                    var res = await func.apply(this, func_args);
                    positiveResult = boolean(res);
                }
                if (positiveResult) {
                    if(!hasFoundMatch) {
                        result = entry;
                        hasFoundMatch = true;
                    } else {
                        throw {
                            stack: (new Error()).stack,
                            code: "D3138",
                            index: i
                        };
                    }
                }
            }
    
            if(!hasFoundMatch) {
                throw {
                    stack: (new Error()).stack,
                    code: "D3139"
                };
            }
    
            return result;
        }
    
        /**
         * Convolves (zips) each value from a set of arrays
         * @param {Array} [args] - arrays to zip
         * @returns {Array} Zipped array
         */
        function zip() {
            // this can take a variable number of arguments
            var result = [];
            var args = Array.prototype.slice.call(arguments);
            // length of the shortest array
            var length = Math.min.apply(Math, args.map(function (arg) {
                if (Array.isArray(arg)) {
                    return arg.length;
                }
                return 0;
            }));
            for (var i = 0; i < length; i++) {
                var tuple = args.map((arg) => {
                    return arg[i];
                });
                result.push(tuple);
            }
            return result;
        }
    
        /**
         * Fold left function
         * @param {Array} sequence - Sequence
         * @param {Function} func - Function
         * @param {Object} init - Initial value
         * @returns {*} Result
         */
        async function foldLeft(sequence, func, init) {
            // undefined inputs always return undefined
            if (typeof sequence === 'undefined') {
                return undefined;
            }
    
            var result;
    
            var arity = getFunctionArity(func);
            if (arity < 2) {
                throw {
                    stack: (new Error()).stack,
                    code: "D3050",
                    index: 1
                };
            }
    
            var index;
            if (typeof init === 'undefined' && sequence.length > 0) {
                result = sequence[0];
                index = 1;
            } else {
                result = init;
                index = 0;
            }
    
            while (index < sequence.length) {
                var args = [result, sequence[index]];
                if (arity >= 3) {
                    args.push(index);
                }
                if (arity >= 4) {
                    args.push(sequence);
                }
                result = await func.apply(this, args);
                index++;
            }
    
            return result;
        }
    
        /**
         * Return keys for an object
         * @param {Object} arg - Object
         * @returns {Array} Array of keys
         */
        function keys(arg) {
            var result = createSequence();
    
            if (Array.isArray(arg)) {
                // merge the keys of all of the items in the array
                var merge = {};
                arg.forEach(function (item) {
                    var allkeys = keys(item);
                    allkeys.forEach(function (key) {
                        merge[key] = true;
                    });
                });
                result = keys(merge);
            } else if (arg !== null && typeof arg === 'object' && !(isLambda(arg))) {
                Object.keys(arg).forEach(key => result.push(key));
            }
            return result;
        }
    
        /**
         * Return value from an object for a given key
         * @param {Object} input - Object/Array
         * @param {String} key - Key in object
         * @returns {*} Value of key in object
         */
        function lookup(input, key) {
            // lookup the 'name' item in the input
            var result;
            if (Array.isArray(input)) {
                result = createSequence();
                for(var ii = 0; ii < input.length; ii++) {
                    var res =  lookup(input[ii], key);
                    if (typeof res !== 'undefined') {
                        if (Array.isArray(res)) {
                            res.forEach(val => result.push(val));
                        } else {
                            result.push(res);
                        }
                    }
                }
            } else if (input !== null && typeof input === 'object') {
                result = input[key];
            }
            return result;
        }
    
        /**
         * Append second argument to first
         * @param {Array|Object} arg1 - First argument
         * @param {Array|Object} arg2 - Second argument
         * @returns {*} Appended arguments
         */
        function append(arg1, arg2) {
            // disregard undefined args
            if (typeof arg1 === 'undefined') {
                return arg2;
            }
            if (typeof arg2 === 'undefined') {
                return arg1;
            }
            // if either argument is not an array, make it so
            if (!Array.isArray(arg1)) {
                arg1 = createSequence(arg1);
            }
            if (!Array.isArray(arg2)) {
                arg2 = [arg2];
            }
            return arg1.concat(arg2);
        }
    
        /**
         * Determines if the argument is undefined
         * @param {*} arg - argument
         * @returns {boolean} False if argument undefined, otherwise true
         */
        function exists(arg) {
            if (typeof arg === 'undefined') {
                return false;
            } else {
                return true;
            }
        }
    
        /**
         * Splits an object into an array of object with one property each
         * @param {*} arg - the object to split
         * @returns {*} - the array
         */
        function spread(arg) {
            var result = createSequence();
    
            if (Array.isArray(arg)) {
                // spread all of the items in the array
                arg.forEach(function (item) {
                    result = append(result, spread(item));
                });
            } else if (arg !== null && typeof arg === 'object' && !isLambda(arg)) {
                for (var key in arg) {
                    var obj = {};
                    obj[key] = arg[key];
                    result.push(obj);
                }
            } else {
                result = arg;
            }
            return result;
        }
    
        /**
         * Merges an array of objects into a single object.  Duplicate properties are
         * overridden by entries later in the array
         * @param {*} arg - the objects to merge
         * @returns {*} - the object
         */
        function merge(arg) {
            // undefined inputs always return undefined
            if (typeof arg === 'undefined') {
                return undefined;
            }
    
            var result = {};
    
            arg.forEach(function (obj) {
                for (var prop in obj) {
                    result[prop] = obj[prop];
                }
            });
            return result;
        }
    
        /**
         * Reverses the order of items in an array
         * @param {Array} arr - the array to reverse
         * @returns {Array} - the reversed array
         */
        function reverse(arr) {
            // undefined inputs always return undefined
            if (typeof arr === 'undefined') {
                return undefined;
            }
    
            if (arr.length <= 1) {
                return arr;
            }
    
            var length = arr.length;
            var result = new Array(length);
            for (var i = 0; i < length; i++) {
                result[length - i - 1] = arr[i];
            }
    
            return result;
        }
    
        /**
         *
         * @param {*} obj - the input object to iterate over
         * @param {*} func - the function to apply to each key/value pair
         * @returns {Array} - the resultant array
         */
        async function each(obj, func) {
            var result = createSequence();
    
            for (var key in obj) {
                var func_args = hofFuncArgs(func, obj[key], key, obj);
                // invoke func
                var val = await func.apply(this, func_args);
                if(typeof val !== 'undefined') {
                    result.push(val);
                }
            }
    
            return result;
        }
    
        /**
         *
         * @param {string} [message] - the message to attach to the error
         * @throws custom error with code 'D3137'
         */
        function error(message) {
            throw {
                code: "D3137",
                stack: (new Error()).stack,
                message: message || "$error() function evaluated"
            };
        }
    
        /**
         *
         * @param {boolean} condition - the condition to evaluate
         * @param {string} [message] - the message to attach to the error
         * @throws custom error with code 'D3137'
         * @returns {undefined}
         */
        function assert(condition, message) {
            if(!condition) {
                throw {
                    code: "D3141",
                    stack: (new Error()).stack,
                    message: message || "$assert() statement failed"
                };
            }
    
            return undefined;
        }
    
        /**
         *
         * @param {*} [value] - the input to which the type will be checked
         * @returns {string} - the type of the input
         */
        function type(value) {
            if (value === undefined) {
                return undefined;
            }
    
            if (value === null) {
                return 'null';
            }
    
            if (isNumeric(value)) {
                return 'number';
            }
    
            if (typeof value === 'string') {
                return 'string';
            }
    
            if (typeof value === 'boolean') {
                return 'boolean';
            }
    
            if(Array.isArray(value)) {
                return 'array';
            }
    
            if(isFunction(value)) {
                return 'function';
            }
    
            return 'object';
        }
    
        /**
         * Implements the merge sort (stable) with optional comparator function
         *
         * @param {Array} arr - the array to sort
         * @param {*} comparator - comparator function
         * @returns {Array} - sorted array
         */
        async function sort(arr, comparator) {
            // undefined inputs always return undefined
            if (typeof arr === 'undefined') {
                return undefined;
            }
    
            if (arr.length <= 1) {
                return arr;
            }
    
            var comp;
            if (typeof comparator === 'undefined') {
                // inject a default comparator - only works for numeric or string arrays
                if (!isArrayOfNumbers(arr) && !isArrayOfStrings(arr)) {
                    throw {
                        stack: (new Error()).stack,
                        code: "D3070",
                        index: 1
                    };
                }
    
                comp = async function (a, b) {  // eslint-disable-line 
                    return a > b;
                };
            } else {
                // for internal usage of functionSort (i.e. order-by syntax)
                comp = comparator;
            }
    
            var merge = async function (l, r) {
                var merge_iter = async function (result, left, right) {
                    if (left.length === 0) {
                        Array.prototype.push.apply(result, right);
                    } else if (right.length === 0) {
                        Array.prototype.push.apply(result, left);
                    } else if (await comp(left[0], right[0])) { // invoke the comparator function
                        // if it returns true - swap left and right
                        result.push(right[0]);
                        await merge_iter(result, left, right.slice(1));
                    } else {
                        // otherwise keep the same order
                        result.push(left[0]);
                        await merge_iter(result, left.slice(1), right);
                    }
                };
                var merged = [];
                await merge_iter(merged, l, r);
                return merged;
            };
    
            var msort = async function (array) {
                if (!Array.isArray(array) || array.length <= 1) {
                    return array;
                } else {
                    var middle = Math.floor(array.length / 2);
                    var left = array.slice(0, middle);
                    var right = array.slice(middle);
                    left = await msort(left);
                    right = await msort(right);
                    return await merge(left, right);
                }
            };
    
            var result = await msort(arr);
    
            return result;
        }
    
        /**
         * Randomly shuffles the contents of an array
         * @param {Array} arr - the input array
         * @returns {Array} the shuffled array
         */
        function shuffle(arr) {
            // undefined inputs always return undefined
            if (typeof arr === 'undefined') {
                return undefined;
            }
    
            if (arr.length <= 1) {
                return arr;
            }
    
            // shuffle using the 'inside-out' variant of the Fisher-Yates algorithm
            var result = new Array(arr.length);
            for (var i = 0; i < arr.length; i++) {
                var j = Math.floor(Math.random() * (i + 1)); // random integer such that 0 ≤ j ≤ i
                if (i !== j) {
                    result[i] = result[j];
                }
                result[j] = arr[i];
            }
    
            return result;
        }
    
        /**
         * Returns the values that appear in a sequence, with duplicates eliminated.
         * @param {Array} arr - An array or sequence of values
         * @returns {Array} - sequence of distinct values
         */
        function distinct(arr) {
            // undefined inputs always return undefined
            if (typeof arr === 'undefined') {
                return undefined;
            }
    
            if(!Array.isArray(arr) || arr.length <= 1) {
                return arr;
            }
    
            var results = isSequence(arr) ? createSequence() : [];
    
            for(var ii = 0; ii < arr.length; ii++) {
                var value = arr[ii];
                // is this value already in the result sequence?
                var includes = false;
                for(var jj = 0; jj < results.length; jj++) {
                    if (deepEquals(value, results[jj])) {
                        includes = true;
                        break;
                    }
                }
                if(!includes) {
                    results.push(value);
                }
            }
            return results;
        }
    
        /**
         * Applies a predicate function to each key/value pair in an object, and returns an object containing
         * only the key/value pairs that passed the predicate
         *
         * @param {object} arg - the object to be sifted
         * @param {object} func - the predicate function (lambda or native)
         * @returns {object} - sifted object
         */
        async function sift(arg, func) {
            var result = {};
    
            for (var item in arg) {
                var entry = arg[item];
                var func_args = hofFuncArgs(func, entry, item, arg);
                // invoke func
                var res = await func.apply(this, func_args);
                if (boolean(res)) {
                    result[item] = entry;
                }
            }
    
            // empty objects should be changed to undefined
            if (Object.keys(result).length === 0) {
                result = undefined;
            }
    
            return result;
        }
    
        return {
            sum, count, max, min, average,
            string, substring, substringBefore, substringAfter, lowercase, uppercase, length, trim, pad,
            match, contains, replace, split, join,
            formatNumber, formatBase, number, floor, ceil, round, abs, sqrt, power, random,
            boolean, not,
            map, zip, filter, single, foldLeft, sift,
            keys, lookup, append, exists, spread, merge, reverse, each, error, assert, type, sort, shuffle, distinct,
            base64encode, base64decode,  encodeUrlComponent, encodeUrl, decodeUrlComponent, decodeUrl
        };
    })();
    
    module.exports = functions;
    
    }).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    },{"./utils":6}],3:[function(require,module,exports){
    /**
     * © Copyright IBM Corp. 2016, 2017 All Rights Reserved
     *   Project name: JSONata
     *   This project is licensed under the MIT License, see LICENSE
     */
    
    /**
     * @module JSONata
     * @description JSON query and transformation language
     */
    
    var datetime = require('./datetime');
    var fn = require('./functions');
    var utils = require('./utils');
    var parser = require('./parser');
    var parseSignature = require('./signature');
    
    /**
     * jsonata
     * @function
     * @param {Object} expr - JSONata expression
     * @returns {{evaluate: evaluate, assign: assign}} Evaluated expression
     */
    var jsonata = (function() {
        'use strict';
    
        var isNumeric = utils.isNumeric;
        var isArrayOfStrings = utils.isArrayOfStrings;
        var isArrayOfNumbers = utils.isArrayOfNumbers;
        var createSequence = utils.createSequence;
        var isSequence = utils.isSequence;
        var isFunction = utils.isFunction;
        var isLambda = utils.isLambda;
        var isIterable = utils.isIterable;
        var isAsyncIterable = utils.isAsyncIterable;
        var isPromise = utils.isPromise;
        var getFunctionArity = utils.getFunctionArity;
        var isDeepEqual = utils.isDeepEqual;
    
        // Start of Evaluator code
    
        var staticFrame = createFrame(null);
    
        /**
         * Evaluate expression against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluate(expr, input, environment) {
            var result;
    
            var entryCallback = environment.lookup('__evaluate_entry');
            if(entryCallback) {
                // env.isParallelCall will be true if this evaluation 
                // was not the first parallel execution from a .map()
                await entryCallback(expr, input, environment);
            }
    
            switch (expr.type) {
                case 'path':
                    result = await evaluatePath(expr, input, environment);
                    break;
                case 'binary':
                    result = await evaluateBinary(expr, input, environment);
                    break;
                case 'unary':
                    result = await evaluateUnary(expr, input, environment);
                    break;
                case 'name':
                    result = evaluateName(expr, input, environment);
                    break;
                case 'string':
                case 'number':
                case 'value':
                    result = evaluateLiteral(expr, input, environment);
                    break;
                case 'wildcard':
                    result = evaluateWildcard(expr, input, environment);
                    break;
                case 'descendant':
                    result = evaluateDescendants(expr, input, environment);
                    break;
                case 'parent':
                    result = environment.lookup(expr.slot.label);
                    break;
                case 'condition':
                    result = await evaluateCondition(expr, input, environment);
                    break;
                case 'block':
                    result = await evaluateBlock(expr, input, environment);
                    break;
                case 'bind':
                    result = await evaluateBindExpression(expr, input, environment);
                    break;
                case 'regex':
                    result = evaluateRegex(expr, input, environment);
                    break;
                case 'function':
                    result = await evaluateFunction(expr, input, environment);
                    break;
                case 'variable':
                    result = evaluateVariable(expr, input, environment);
                    break;
                case 'lambda':
                    result = evaluateLambda(expr, input, environment);
                    break;
                case 'partial':
                    result = await evaluatePartialApplication(expr, input, environment);
                    break;
                case 'apply':
                    result = await evaluateApplyExpression(expr, input, environment);
                    break;
                case 'transform':
                    result = evaluateTransformExpression(expr, input, environment);
                    break;
            }
    
            if (Object.prototype.hasOwnProperty.call(expr, 'predicate')) {
                for(var ii = 0; ii < expr.predicate.length; ii++) {
                    result = await evaluateFilter(expr.predicate[ii].expr, result, environment);
                }
            }
    
            if (expr.type !== 'path' && Object.prototype.hasOwnProperty.call(expr, 'group')) {
                result = await evaluateGroupExpression(expr.group, result, environment);
            }
    
            var exitCallback = environment.lookup('__evaluate_exit');
            if(exitCallback) {
                // env.isParallelCall will be true if this evaluation 
                // was not the first parallel execution from a .map()
                await exitCallback(expr, input, environment, result);
            }
    
            if(result && isSequence(result) && !result.tupleStream) {
                if(expr.keepArray) {
                    result.keepSingleton = true;
                }
                if(result.length === 0) {
                    result = undefined;
                } else if(result.length === 1) {
                    result =  result.keepSingleton ? result : result[0];
                }
    
            }
    
            return result;
        }
    
        /**
         * Evaluate path expression against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluatePath(expr, input, environment) {
            var inputSequence;
            // expr is an array of steps
            // if the first step is a variable reference ($...), including root reference ($$),
            //   then the path is absolute rather than relative
            if (Array.isArray(input) && expr.steps[0].type !== 'variable') {
                inputSequence = input;
            } else {
                // if input is not an array, make it so
                inputSequence = createSequence(input);
            }
    
            var resultSequence;
            var isTupleStream = false;
            var tupleBindings = undefined;
    
            // evaluate each step in turn
            for(var ii = 0; ii < expr.steps.length; ii++) {
                var step = expr.steps[ii];
    
                if(step.tuple) {
                    isTupleStream = true;
                }
    
                // if the first step is an explicit array constructor, then just evaluate that (i.e. don't iterate over a context array)
                if(ii === 0 && step.consarray) {
                    resultSequence = await evaluate(step, inputSequence, environment);
                } else {
                    if(isTupleStream) {
                        tupleBindings = await evaluateTupleStep(step, inputSequence, tupleBindings, environment);
                    } else {
                        resultSequence = await evaluateStep(step, inputSequence, environment, ii === expr.steps.length - 1);
                    }
                }
    
                if (!isTupleStream && (typeof resultSequence === 'undefined' || resultSequence.length === 0)) {
                    break;
                }
    
                if(typeof step.focus === 'undefined') {
                    inputSequence = resultSequence;
                }
    
            }
    
            if(isTupleStream) {
                if(expr.tuple) {
                    // tuple stream is carrying ancestry information - keep this
                    resultSequence = tupleBindings;
                } else {
                    resultSequence = createSequence();
                    for (ii = 0; ii < tupleBindings.length; ii++) {
                        resultSequence.push(tupleBindings[ii]['@']);
                    }
                }
            }
    
            if(expr.keepSingletonArray) {
                if(!isSequence(resultSequence)) {
                    resultSequence = createSequence(resultSequence);
                }
                resultSequence.keepSingleton = true;
            }
    
            if (expr.hasOwnProperty('group')) {
                resultSequence = await evaluateGroupExpression(expr.group, isTupleStream ? tupleBindings : resultSequence, environment)
            }
    
            return resultSequence;
        }
    
        function createFrameFromTuple(environment, tuple) {
            var frame = createFrame(environment);
            for(const prop in tuple) {
                frame.bind(prop, tuple[prop]);
            }
            return frame;
        }
    
        /**
         * Evaluate a step within a path
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @param {boolean} lastStep - flag the last step in a path
         * @returns {*} Evaluated input data
         */
        async function evaluateStep(expr, input, environment, lastStep) {
            var result;
            if(expr.type === 'sort') {
                 result = await evaluateSortExpression(expr, input, environment);
                 if(expr.stages) {
                     result = await evaluateStages(expr.stages, result, environment);
                 }
                 return result;
            }
    
            result = createSequence();
            let generators = await Promise.all(input
                .map(async (inputPart, idx) => {
                    environment.isParallelCall = idx > 0
                    return await evaluate(expr, inputPart, environment)
                }))  
            for(let generator of generators) {
                let res = generator
                if(expr.stages) {
                    for(let ss = 0; ss < expr.stages.length; ss++) {
                        res = await evaluateFilter(expr.stages[ss].expr, res, environment);
                    }
                }
    
                if(typeof res !== 'undefined') {
                    result.push(res);
                }
            }
    
            var resultSequence = createSequence();
            if(lastStep && result.length === 1 && Array.isArray(result[0]) && !isSequence(result[0])) {
                resultSequence = result[0];
            } else {
                // flatten the sequence
                result.forEach(function(res) {
                    if (!Array.isArray(res) || res.cons) {
                        // it's not an array - just push into the result sequence
                        resultSequence.push(res);
                    } else {
                        // res is a sequence - flatten it into the parent sequence
                        res.forEach(val => resultSequence.push(val));
                    }
                });
            }
    
            return resultSequence;
        }
    
        async function evaluateStages(stages, input, environment) {
            var result = input;
            for(var ss = 0; ss < stages.length; ss++) {
                var stage = stages[ss];
                switch(stage.type) {
                    case 'filter':
                        result = await evaluateFilter(stage.expr, result, environment);
                        break;
                    case 'index':
                        for(var ee = 0; ee < result.length; ee++) {
                            var tuple = result[ee];
                            tuple[stage.value] = ee;
                        }
                        break;
                }
            }
            return result;
        }
    
        /**
         * Evaluate a step within a path
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} tupleBindings - The tuple stream
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateTupleStep(expr, input, tupleBindings, environment) {
            var result;
            if(expr.type === 'sort') {
                if(tupleBindings) {
                    result = await evaluateSortExpression(expr, tupleBindings, environment);
                } else {
                    var sorted = await evaluateSortExpression(expr, input, environment);
                    result = createSequence();
                    result.tupleStream = true;
                    for(var ss = 0; ss < sorted.length; ss++) {
                        var tuple = {'@': sorted[ss]};
                        tuple[expr.index] = ss;
                        result.push(tuple);
                    }
                }
                if(expr.stages) {
                    result = await evaluateStages(expr.stages, result, environment);
                }
                return result;
            }
    
            result = createSequence();
            result.tupleStream = true;
            var stepEnv = environment;
            if(tupleBindings === undefined) {
                tupleBindings = input.map(item => { return {'@': item} });
            }
    
            for(var ee = 0; ee < tupleBindings.length; ee++) {
                stepEnv = createFrameFromTuple(environment, tupleBindings[ee]);
                var res = await evaluate(expr, tupleBindings[ee]['@'], stepEnv);
                // res is the binding sequence for the output tuple stream
                if(typeof res !== 'undefined') {
                    if (!Array.isArray(res)) {
                        res = [res];
                    }
                    for (var bb = 0; bb < res.length; bb++) {
                        tuple = {};
                        Object.assign(tuple, tupleBindings[ee]);
                        if(res.tupleStream) {
                            Object.assign(tuple, res[bb]);
                        } else {
                            if (expr.focus) {
                                tuple[expr.focus] = res[bb];
                                tuple['@'] = tupleBindings[ee]['@'];
                            } else {
                                tuple['@'] = res[bb];
                            }
                            if (expr.index) {
                                tuple[expr.index] = bb;
                            }
                            if (expr.ancestor) {
                                tuple[expr.ancestor.label] = tupleBindings[ee]['@'];
                            }
                        }
                        result.push(tuple);
                    }
                }
            }
    
            if(expr.stages) {
                result = await evaluateStages(expr.stages, result, environment);
            }
    
            return result;
        }
    
        /**
         * Apply filter predicate to input data
         * @param {Object} predicate - filter expression
         * @param {Object} input - Input data to apply predicates against
         * @param {Object} environment - Environment
         * @returns {*} Result after applying predicates
         */
        async function evaluateFilter(predicate, input, environment) {
            var results = createSequence();
            if( input && input.tupleStream) {
                results.tupleStream = true;
            }
            if (!Array.isArray(input)) {
                input = createSequence(input);
            }
            if (predicate.type === 'number') {
                var index = Math.floor(predicate.value);  // round it down
                if (index < 0) {
                    // count in from end of array
                    index = input.length + index;
                }
                var item = input[index];
                if(typeof item !== 'undefined') {
                    if(Array.isArray(item)) {
                        results = item;
                    } else {
                        results.push(item);
                    }
                }
            } else {
                for (index = 0; index < input.length; index++) {
                    var item = input[index];
                    var context = item;
                    var env = environment;
                    if(input.tupleStream) {
                        context = item['@'];
                        env = createFrameFromTuple(environment, item);
                    }
                    var res = await evaluate(predicate, context, env);
                    if (isNumeric(res)) {
                        res = [res];
                    }
                    if (isArrayOfNumbers(res)) {
                        res.forEach(function (ires) {
                            // round it down
                            var ii = Math.floor(ires);
                            if (ii < 0) {
                                // count in from end of array
                                ii = input.length + ii;
                            }
                            if (ii === index) {
                                results.push(item);
                            }
                        });
                    } else if (fn.boolean(res)) { // truthy
                        results.push(item);
                    }
                }
            }
            return results;
        }
    
        /**
         * Evaluate binary expression against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateBinary(expr, input, environment) {
            var result;
            var lhs = await evaluate(expr.lhs, input, environment);
            var op = expr.value;
    
            //defer evaluation of RHS to allow short-circuiting
            var evalrhs = async () => await evaluate(expr.rhs, input, environment);
            if (op === "and" || op === "or") {
                try {
                    return await evaluateBooleanExpression(lhs, evalrhs, op);
                } catch(err) {
                    err.position = expr.position;
                    err.token = op;
                    throw err;
                }
            }
    
            var rhs = await evalrhs();
            try {
                switch (op) {
                    case '+':
                    case '-':
                    case '*':
                    case '/':
                    case '%':
                        result = evaluateNumericExpression(lhs, rhs, op);
                        break;
                    case '=':
                    case '!=':
                        result = evaluateEqualityExpression(lhs, rhs, op);
                        break;
                    case '<':
                    case '<=':
                    case '>':
                    case '>=':
                        result = evaluateComparisonExpression(lhs, rhs, op);
                        break;
                    case '&':
                        result = evaluateStringConcat(lhs, rhs);
                        break;
                    case '..':
                        result = evaluateRangeExpression(lhs, rhs);
                        break;
                    case 'in':
                        result = evaluateIncludesExpression(lhs, rhs);
                        break;
                }
            } catch(err) {
                err.position = expr.position;
                err.token = op;
                throw err;
            }
            return result;
        }
    
        /**
         * Evaluate unary expression against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateUnary(expr, input, environment) {
            var result;
    
            switch (expr.value) {
                case '-':
                    result = await evaluate(expr.expression, input, environment);
                    if(typeof result === 'undefined') {
                        result = undefined;
                    } else if (isNumeric(result)) {
                        result = -result;
                    } else {
                        throw {
                            code: "D1002",
                            stack: (new Error()).stack,
                            position: expr.position,
                            token: expr.value,
                            value: result
                        };
                    }
                    break;
                case '[':
                    // array constructor - evaluate each item
                    result = [];
                    let generators = await Promise.all(expr.expressions
                        .map(async (item, idx) => {
                            environment.isParallelCall = idx > 0
                            return [item, await evaluate(item, input, environment)]
                        }));
                    for(let generator of generators) {
                        var [item, value] = generator;
                        if (typeof value !== 'undefined') {
                            if(item.value === '[') {
                                result.push(value);
                            } else {
                                result = fn.append(result, value);
                            }
                        }
                    }
                    if(expr.consarray) {
                        Object.defineProperty(result, 'cons', {
                            enumerable: false,
                            configurable: false,
                            value: true
                        });
                    }
                    break;
                case '{':
                    // object constructor - apply grouping
                    result = await evaluateGroupExpression(expr, input, environment);
                    break;
    
            }
            return result;
        }
    
        /**
         * Evaluate name object against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        function evaluateName(expr, input, environment) {
            // lookup the 'name' item in the input
            return fn.lookup(input, expr.value);
        }
    
        /**
         * Evaluate literal against input data
         * @param {Object} expr - JSONata expression
         * @returns {*} Evaluated input data
         */
        function evaluateLiteral(expr) {
            return expr.value;
        }
    
        /**
         * Evaluate wildcard against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @returns {*} Evaluated input data
         */
        function evaluateWildcard(expr, input) {
            var results = createSequence();
            if (input !== null && typeof input === 'object') {
                Object.keys(input).forEach(function (key) {
                    var value = input[key];
                    if(Array.isArray(value)) {
                        value = flatten(value);
                        results = fn.append(results, value);
                    } else {
                        results.push(value);
                    }
                });
            }
    
            //        result = normalizeSequence(results);
            return results;
        }
    
        /**
         * Returns a flattened array
         * @param {Array} arg - the array to be flatten
         * @param {Array} flattened - carries the flattened array - if not defined, will initialize to []
         * @returns {Array} - the flattened array
         */
        function flatten(arg, flattened) {
            if(typeof flattened === 'undefined') {
                flattened = [];
            }
            if(Array.isArray(arg)) {
                arg.forEach(function (item) {
                    flatten(item, flattened);
                });
            } else {
                flattened.push(arg);
            }
            return flattened;
        }
    
        /**
         * Evaluate descendants against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @returns {*} Evaluated input data
         */
        function evaluateDescendants(expr, input) {
            var result;
            var resultSequence = createSequence();
            if (typeof input !== 'undefined') {
                // traverse all descendants of this object/array
                recurseDescendants(input, resultSequence);
                if (resultSequence.length === 1) {
                    result = resultSequence[0];
                } else {
                    result = resultSequence;
                }
            }
            return result;
        }
    
        /**
         * Recurse through descendants
         * @param {Object} input - Input data
         * @param {Object} results - Results
         */
        function recurseDescendants(input, results) {
            // this is the equivalent of //* in XPath
            if (!Array.isArray(input)) {
                results.push(input);
            }
            if (Array.isArray(input)) {
                input.forEach(function (member) {
                    recurseDescendants(member, results);
                });
            } else if (input !== null && typeof input === 'object') {
                Object.keys(input).forEach(function (key) {
                    recurseDescendants(input[key], results);
                });
            }
        }
    
        /**
         * Evaluate numeric expression against input data
         * @param {Object} lhs - LHS value
         * @param {Object} rhs - RHS value
         * @param {Object} op - opcode
         * @returns {*} Result
         */
        function evaluateNumericExpression(lhs, rhs, op) {
            var result;
    
            if (typeof lhs !== 'undefined' && !isNumeric(lhs)) {
                throw {
                    code: "T2001",
                    stack: (new Error()).stack,
                    value: lhs
                };
            }
            if (typeof rhs !== 'undefined' && !isNumeric(rhs)) {
                throw {
                    code: "T2002",
                    stack: (new Error()).stack,
                    value: rhs
                };
            }
    
            if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
                // if either side is undefined, the result is undefined
                return result;
            }
    
            switch (op) {
                case '+':
                    result = lhs + rhs;
                    break;
                case '-':
                    result = lhs - rhs;
                    break;
                case '*':
                    result = lhs * rhs;
                    break;
                case '/':
                    result = lhs / rhs;
                    break;
                case '%':
                    result = lhs % rhs;
                    break;
            }
            return result;
        }
    
        /**
         * Evaluate equality expression against input data
         * @param {Object} lhs - LHS value
         * @param {Object} rhs - RHS value
         * @param {Object} op - opcode
         * @returns {*} Result
         */
        function evaluateEqualityExpression(lhs, rhs, op) {
            var result;
    
            // type checks
            var ltype = typeof lhs;
            var rtype = typeof rhs;
    
            if (ltype === 'undefined' || rtype === 'undefined') {
                // if either side is undefined, the result is false
                return false;
            }
    
            switch (op) {
                case '=':
                    result = isDeepEqual(lhs, rhs);
                    break;
                case '!=':
                    result = !isDeepEqual(lhs, rhs);
                    break;
            }
            return result;
        }
    
        /**
         * Evaluate comparison expression against input data
         * @param {Object} lhs - LHS value
         * @param {Object} rhs - RHS value
         * @param {Object} op - opcode
         * @returns {*} Result
         */
        function evaluateComparisonExpression(lhs, rhs, op) {
            var result;
    
            // type checks
            var ltype = typeof lhs;
            var rtype = typeof rhs;
    
            var lcomparable = (ltype === 'undefined' || ltype === 'string' || ltype === 'number');
            var rcomparable = (rtype === 'undefined' || rtype === 'string' || rtype === 'number');
    
            // if either aa or bb are not comparable (string or numeric) values, then throw an error
            if (!lcomparable || !rcomparable) {
                throw {
                    code: "T2010",
                    stack: (new Error()).stack,
                    value: !(ltype === 'string' || ltype === 'number') ? lhs : rhs
                };
            }
    
            // if either side is undefined, the result is undefined
            if (ltype === 'undefined' || rtype === 'undefined') {
                return undefined;
            }
    
            //if aa and bb are not of the same type
            if (ltype !== rtype) {
                throw {
                    code: "T2009",
                    stack: (new Error()).stack,
                    value: lhs,
                    value2: rhs
                };
            }
    
            switch (op) {
                case '<':
                    result = lhs < rhs;
                    break;
                case '<=':
                    result = lhs <= rhs;
                    break;
                case '>':
                    result = lhs > rhs;
                    break;
                case '>=':
                    result = lhs >= rhs;
                    break;
            }
            return result;
        }
    
        /**
         * Inclusion operator - in
         *
         * @param {Object} lhs - LHS value
         * @param {Object} rhs - RHS value
         * @returns {boolean} - true if lhs is a member of rhs
         */
        function evaluateIncludesExpression(lhs, rhs) {
            var result = false;
    
            if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
                // if either side is undefined, the result is false
                return false;
            }
    
            if(!Array.isArray(rhs)) {
                rhs = [rhs];
            }
    
            for(var i = 0; i < rhs.length; i++) {
                if(rhs[i] === lhs) {
                    result = true;
                    break;
                }
            }
    
            return result;
        }
    
        /**
         * Evaluate boolean expression against input data
         * @param {Object} lhs - LHS value
         * @param {Function} evalrhs - function to evaluate RHS value
         * @param {Object} op - opcode
         * @returns {*} Result
         */
        async function evaluateBooleanExpression(lhs, evalrhs, op) {
            var result;
    
            var lBool = boolize(lhs);
    
            switch (op) {
                case 'and':
                    result = lBool && boolize(await evalrhs());
                    break;
                case 'or':
                    result = lBool || boolize(await evalrhs());
                    break;
            }
            return result;
        }
    
        function boolize(value) {
            var booledValue = fn.boolean(value);
            return typeof booledValue === 'undefined' ? false : booledValue;
        }
    
        /**
         * Evaluate string concatenation against input data
         * @param {Object} lhs - LHS value
         * @param {Object} rhs - RHS value
         * @returns {string|*} Concatenated string
         */
        function evaluateStringConcat(lhs, rhs) {
            var result;
    
            var lstr = '';
            var rstr = '';
            if (typeof lhs !== 'undefined') {
                lstr = fn.string(lhs);
            }
            if (typeof rhs !== 'undefined') {
                rstr = fn.string(rhs);
            }
    
            result = lstr.concat(rstr);
            return result;
        }
    
        /**
         * Evaluate group expression against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {{}} Evaluated input data
         */
        async function evaluateGroupExpression(expr, input, environment) {
            var result = {};
            var groups = {};
            var reduce = input && input.tupleStream ? true : false;
            // group the input sequence by 'key' expression
            if (!Array.isArray(input)) {
                input = createSequence(input);
            }
    
            for(var itemIndex = 0; itemIndex < input.length; itemIndex++) {
                var item = input[itemIndex];
                var env = reduce ? createFrameFromTuple(environment, item) : environment;
                for(var pairIndex = 0; pairIndex < expr.lhs.length; pairIndex++) {
                    var pair = expr.lhs[pairIndex];
                    var key = await evaluate(pair[0], reduce ? item['@'] : item, env);
                    // key has to be a string
                    if (typeof  key !== 'string') {
                        throw {
                            code: "T1003",
                            stack: (new Error()).stack,
                            position: expr.position,
                            value: key
                        };
                    }
                    var entry = {data: item, exprIndex: pairIndex};
                    if (groups.hasOwnProperty(key)) {
                        // a value already exists in this slot
                        if(groups[key].exprIndex !== pairIndex) {
                            // this key has been generated by another expression in this group
                            // when multiple key expressions evaluate to the same key, then error D1009 must be thrown
                            throw {
                                code: "D1009",
                                stack: (new Error()).stack,
                                position: expr.position,
                                value: key
                            };
                        }
    
                        // append it as an array
                        groups[key].data = fn.append(groups[key].data, item);
                    } else {
                        groups[key] = entry;
                    }
                }
            }
    
            // iterate over the groups to evaluate the 'value' expression
            let generators = await Promise.all(Object.keys(groups).map(async (key, idx) => {
                let entry = groups[key];
                var context = entry.data;
                var env = environment;
                if (reduce) {
                    var tuple = reduceTupleStream(entry.data);
                    context = tuple['@'];
                    delete tuple['@'];
                    env = createFrameFromTuple(environment, tuple);
                }
                environment.isParallelCall = idx > 0
                return [key, await evaluate(expr.lhs[entry.exprIndex][1], context, env)];
            }));
    
            for (let generator of generators) {
                var [key, value] = await generator;
                if(typeof value !== 'undefined') {
                    result[key] = value;
                }
            }
    
            return result;
        }
    
        function reduceTupleStream(tupleStream) {
            if(!Array.isArray(tupleStream)) {
                return tupleStream;
            }
            var result = {};
            Object.assign(result, tupleStream[0]);
            for(var ii = 1; ii < tupleStream.length; ii++) {
                for(const prop in tupleStream[ii]) {
                    result[prop] = fn.append(result[prop], tupleStream[ii][prop]);
                }
            }
            return result;
        }
    
        /**
         * Evaluate range expression against input data
         * @param {Object} lhs - LHS value
         * @param {Object} rhs - RHS value
         * @returns {Array} Resultant array
         */
        function evaluateRangeExpression(lhs, rhs) {
            var result;
    
            if (typeof lhs !== 'undefined' && !Number.isInteger(lhs)) {
                throw {
                    code: "T2003",
                    stack: (new Error()).stack,
                    value: lhs
                };
            }
            if (typeof rhs !== 'undefined' && !Number.isInteger(rhs)) {
                throw {
                    code: "T2004",
                    stack: (new Error()).stack,
                    value: rhs
                };
            }
    
            if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
                // if either side is undefined, the result is undefined
                return result;
            }
    
            if (lhs > rhs) {
                // if the lhs is greater than the rhs, return undefined
                return result;
            }
    
            // limit the size of the array to ten million entries (1e7)
            // this is an implementation defined limit to protect against
            // memory and performance issues.  This value may increase in the future.
            var size = rhs - lhs + 1;
            if(size > 1e7) {
                throw {
                    code: "D2014",
                    stack: (new Error()).stack,
                    value: size
                };
            }
    
            result = new Array(size);
            for (var item = lhs, index = 0; item <= rhs; item++, index++) {
                result[index] = item;
            }
            result.sequence = true;
            return result;
        }
    
        /**
         * Evaluate bind expression against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateBindExpression(expr, input, environment) {
            // The RHS is the expression to evaluate
            // The LHS is the name of the variable to bind to - should be a VARIABLE token (enforced by parser)
            var value = await evaluate(expr.rhs, input, environment);
            environment.bind(expr.lhs.value, value);
            return value;
        }
    
        /**
         * Evaluate condition against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateCondition(expr, input, environment) {
            var result;
            var condition = await evaluate(expr.condition, input, environment);
            if (fn.boolean(condition)) {
                result = await evaluate(expr.then, input, environment);
            } else if (typeof expr.else !== 'undefined') {
                result = await evaluate(expr.else, input, environment);
            }
            return result;
        }
    
        /**
         * Evaluate block against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateBlock(expr, input, environment) {
            var result;
            // create a new frame to limit the scope of variable assignments
            // TODO, only do this if the post-parse stage has flagged this as required
            var frame = createFrame(environment);
            // invoke each expression in turn
            // only return the result of the last one
            for(var ii = 0; ii < expr.expressions.length; ii++) {
                result = await evaluate(expr.expressions[ii], input, frame);
            }
    
            return result;
        }
    
        /**
         * Prepare a regex
         * @param {Object} expr - expression containing regex
         * @returns {Function} Higher order function representing prepared regex
         */
        function evaluateRegex(expr) {
            var re = new jsonata.RegexEngine(expr.value);
            var closure = function(str, fromIndex) {
                var result;
                re.lastIndex = fromIndex || 0;
                var match = re.exec(str);
                if(match !== null) {
                    result = {
                        match: match[0],
                        start: match.index,
                        end: match.index + match[0].length,
                        groups: []
                    };
                    if(match.length > 1) {
                        for(var i = 1; i < match.length; i++) {
                            result.groups.push(match[i]);
                        }
                    }
                    result.next = function() {
                        if(re.lastIndex >= str.length) {
                            return undefined;
                        } else {
                            var next = closure(str, re.lastIndex);
                            if(next && next.match === '') {
                                // matches zero length string; this will never progress
                                throw {
                                    code: "D1004",
                                    stack: (new Error()).stack,
                                    position: expr.position,
                                    value: expr.value.source
                                };
                            }
                            return next;
                        }
                    };
                }
    
                return result;
            };
            return closure;
        }
    
        /**
         * Evaluate variable against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        function evaluateVariable(expr, input, environment) {
            // lookup the variable value in the environment
            var result;
            // if the variable name is empty string, then it refers to context value
            if (expr.value === '') {
                result = input && input.outerWrapper ? input[0] : input;
            } else {
                result = environment.lookup(expr.value);
            }
            return result;
        }
    
        /**
         * sort / order-by operator
         * @param {Object} expr - AST for operator
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Ordered sequence
         */
        async function evaluateSortExpression(expr, input, environment) {
            var result;
    
            // evaluate the lhs, then sort the results in order according to rhs expression
            //var lhs = await evaluate(expr.lhs, input, environment);
            var lhs = input;
            var isTupleSort = input.tupleStream ? true : false;
    
            // sort the lhs array
            // use comparator function
            var comparator = async function(a, b) { // eslint-disable-line 
                // expr.terms is an array of order-by in priority order
                var comp = 0;
                for(var index = 0; comp === 0 && index < expr.terms.length; index++) {
                    var term = expr.terms[index];
                    //evaluate the sort term in the context of a
                    var context = a;
                    var env = environment;
                    if(isTupleSort) {
                        context = a['@'];
                        env = createFrameFromTuple(environment, a);
                    }
                    var aa = await evaluate(term.expression, context, env);
                    //evaluate the sort term in the context of b
                    context = b;
                    env = environment;
                    if(isTupleSort) {
                        context = b['@'];
                        env = createFrameFromTuple(environment, b);
                    }
                    var bb = await evaluate(term.expression, context, env);
    
                    // type checks
                    var atype = typeof aa;
                    var btype = typeof bb;
                    // undefined should be last in sort order
                    if(atype === 'undefined') {
                        // swap them, unless btype is also undefined
                        comp = (btype === 'undefined') ? 0 : 1;
                        continue;
                    }
                    if(btype === 'undefined') {
                        comp = -1;
                        continue;
                    }
    
                    // if aa or bb are not string or numeric values, then throw an error
                    if(!(atype === 'string' || atype === 'number') || !(btype === 'string' || btype === 'number')) {
                        throw {
                            code: "T2008",
                            stack: (new Error()).stack,
                            position: expr.position,
                            value: !(atype === 'string' || atype === 'number') ? aa : bb
                        };
                    }
    
                    //if aa and bb are not of the same type
                    if(atype !== btype) {
                        throw {
                            code: "T2007",
                            stack: (new Error()).stack,
                            position: expr.position,
                            value: aa,
                            value2: bb
                        };
                    }
                    if(aa === bb) {
                        // both the same - move on to next term
                        continue;
                    } else if (aa < bb) {
                        comp = -1;
                    } else {
                        comp = 1;
                    }
                    if(term.descending === true) {
                        comp = -comp;
                    }
                }
                // only swap a & b if comp equals 1
                return comp === 1;
            };
    
            var focus = {
                environment: environment,
                input: input
            };
            // the `focus` is passed in as the `this` for the invoked function
            result = await fn.sort.apply(focus, [lhs, comparator]);
    
            return result;
        }
    
        /**
         * create a transformer function
         * @param {Object} expr - AST for operator
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} tranformer function
         */
        function evaluateTransformExpression(expr, input, environment) {
            // create a function to implement the transform definition
            var transformer = async function(obj) { // signature <(oa):o>
                // undefined inputs always return undefined
                if(typeof obj === 'undefined') {
                    return undefined;
                }
    
                // this function returns a copy of obj with changes specified by the pattern/operation
                var cloneFunction = environment.lookup('clone');
                if(!isFunction(cloneFunction)) {
                    // throw type error
                    throw {
                        code: "T2013",
                        stack: (new Error()).stack,
                        position: expr.position
                    };
                }
                var result = await apply(cloneFunction, [obj], null, environment);
                var matches = await evaluate(expr.pattern, result, environment);
                if(typeof matches !== 'undefined') {
                    if(!Array.isArray(matches)) {
                        matches = [matches];
                    }
                    for(var ii = 0; ii < matches.length; ii++) {
                        var match = matches[ii];
                        // evaluate the update value for each match
                        var update = await evaluate(expr.update, match, environment);
                        // update must be an object
                        var updateType = typeof update;
                        if(updateType !== 'undefined') {
                            if(updateType !== 'object' || update === null || Array.isArray(update)) {
                                // throw type error
                                throw {
                                    code: "T2011",
                                    stack: (new Error()).stack,
                                    position: expr.update.position,
                                    value: update
                                };
                            }
                            // merge the update
                            for(var prop in update) {
                                match[prop] = update[prop];
                            }
                        }
    
                        // delete, if specified, must be an array of strings (or single string)
                        if(typeof expr.delete !== 'undefined') {
                            var deletions = await evaluate(expr.delete, match, environment);
                            if(typeof deletions !== 'undefined') {
                                var val = deletions;
                                if (!Array.isArray(deletions)) {
                                    deletions = [deletions];
                                }
                                if (!isArrayOfStrings(deletions)) {
                                    // throw type error
                                    throw {
                                        code: "T2012",
                                        stack: (new Error()).stack,
                                        position: expr.delete.position,
                                        value: val
                                    };
                                }
                                for (var jj = 0; jj < deletions.length; jj++) {
                                    if(typeof match === 'object' && match !== null) {
                                        delete match[deletions[jj]];
                                    }
                                }
                            }
                        }
                    }
                }
    
                return result;
            };
    
            return defineFunction(transformer, '<(oa):o>');
        }
    
        var chainAST = parser('function($f, $g) { function($x){ $g($f($x)) } }');
    
        /**
         * Apply the function on the RHS using the sequence on the LHS as the first argument
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateApplyExpression(expr, input, environment) {
            var result;
    
    
            var lhs = await evaluate(expr.lhs, input, environment);
            if(expr.rhs.type === 'function') {
                // this is a function _invocation_; invoke it with lhs expression as the first argument
                result = await evaluateFunction(expr.rhs, input, environment, { context: lhs });
            } else {
                var func = await evaluate(expr.rhs, input, environment);
    
                if(!isFunction(func)) {
                    throw {
                        code: "T2006",
                        stack: (new Error()).stack,
                        position: expr.position,
                        value: func
                    };
                }
    
                if(isFunction(lhs)) {
                    // this is function chaining (func1 ~> func2)
                    // λ($f, $g) { λ($x){ $g($f($x)) } }
                    var chain = await evaluate(chainAST, null, environment);
                    result = await apply(chain, [lhs, func], null, environment);
                } else {
                    result = await apply(func, [lhs], null, environment);
                }
    
            }
    
            return result;
        }
    
        /**
         * Evaluate function against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluateFunction(expr, input, environment, applyto) {
            var result;
    
            // create the procedure
            // can't assume that expr.procedure is a lambda type directly
            // could be an expression that evaluates to a function (e.g. variable reference, parens expr etc.
            // evaluate it generically first, then check that it is a function.  Throw error if not.
            var proc = await evaluate(expr.procedure, input, environment);
    
            if (typeof proc === 'undefined' && expr.procedure.type === 'path' && environment.lookup(expr.procedure.steps[0].value)) {
                // help the user out here if they simply forgot the leading $
                throw {
                    code: "T1005",
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.procedure.steps[0].value
                };
            }
    
            var evaluatedArgs = [];
            if(typeof applyto !== 'undefined') {
                evaluatedArgs.push(applyto.context);
            }
            // eager evaluation - evaluate the arguments
            for (var jj = 0; jj < expr.arguments.length; jj++) {
                const arg = await evaluate(expr.arguments[jj], input, environment);
                if(isFunction(arg)) {
                    // wrap this in a closure
                    const closure = async function (...params) {
                        // invoke func
                        return await apply(arg, params, null, environment);
                    };
                    closure.arity = getFunctionArity(arg);
                    evaluatedArgs.push(closure);
                } else {
                    evaluatedArgs.push(arg);
                }
            }
            // apply the procedure
            var procName = expr.procedure.type === 'path' ? expr.procedure.steps[0].value : expr.procedure.value;
            try {
                if(typeof proc === 'object') {
                    proc.token = procName;
                    proc.position = expr.position;
                }
                result = await apply(proc, evaluatedArgs, input, environment);
            } catch (err) {
                if(!err.position) {
                    // add the position field to the error
                    err.position = expr.position;
                }
                if (!err.token) {
                    // and the function identifier
                    err.token = procName;
                }
                throw err;
            }
            return result;
        }
    
        /**
         * Apply procedure or function
         * @param {Object} proc - Procedure
         * @param {Array} args - Arguments
         * @param {Object} input - input
         * @param {Object} environment - environment
         * @returns {*} Result of procedure
         */
        async function apply(proc, args, input, environment) {
            var result;
            result = await applyInner(proc, args, input, environment);
            while(isLambda(result) && result.thunk === true) {
                // trampoline loop - this gets invoked as a result of tail-call optimization
                // the function returned a tail-call thunk
                // unpack it, evaluate its arguments, and apply the tail call
                var next = await evaluate(result.body.procedure, result.input, result.environment);
                if(result.body.procedure.type === 'variable') {
                    next.token = result.body.procedure.value;
                }
                next.position = result.body.procedure.position;
                var evaluatedArgs = [];
                for(var ii = 0; ii < result.body.arguments.length; ii++) {
                    evaluatedArgs.push(await evaluate(result.body.arguments[ii], result.input, result.environment));
                }
                result = await applyInner(next, evaluatedArgs, input, environment);
            }
            return result;
        }
    
        /**
         * Apply procedure or function
         * @param {Object} proc - Procedure
         * @param {Array} args - Arguments
         * @param {Object} input - input
         * @param {Object} environment - environment
         * @returns {*} Result of procedure
         */
        async function applyInner(proc, args, input, environment) {
            var result;
            try {
                var validatedArgs = args;
                if (proc) {
                    validatedArgs = validateArguments(proc.signature, args, input);
                }
    
                if (isLambda(proc)) {
                    result = await applyProcedure(proc, validatedArgs);
                } else if (proc && proc._jsonata_function === true) {
                    var focus = {
                        environment: environment,
                        input: input
                    };
                    // the `focus` is passed in as the `this` for the invoked function
                    result = proc.implementation.apply(focus, validatedArgs);
                    // `proc.implementation` might be a generator function
                    // and `result` might be a generator - if so, yield
    
                    if (isAsyncIterable(result)) {
                        result = (await result.next()).value
                    }
                    if (isIterable(result)) {
                        result = /*yield*/ result.next().value;
                    }
                    if (isPromise(result)) {
                        result = await result;
                    }
                } else if (typeof proc === 'function') {
                    // typically these are functions that are returned by the invocation of plugin functions
                    // the `input` is being passed in as the `this` for the invoked function
                    // this is so that functions that return objects containing functions can chain
                    // e.g. await (await $func())
                    result = proc.apply(input, validatedArgs);
    
                    if (isAsyncIterable(result)) {
                        result = (await result.next()).value
                    }
                    if (isIterable(result)) {
                        result = /*yield*/ result.next().value;
                    }
                    if (isPromise(result)) {
                        result = await result;
                    }
                } else {
                    throw {
                        code: "T1006",
                        stack: (new Error()).stack
                    };
                }
            } catch(err) {
                if(proc) {
                    if (typeof err.token == 'undefined' && typeof proc.token !== 'undefined') {
                        err.token = proc.token;
                    }
                    err.position = proc.position;
                }
                throw err;
            }
            return result;
        }
    
        /**
         * Evaluate lambda against input data
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {{lambda: boolean, input: *, environment: *, arguments: *, body: *}} Evaluated input data
         */
        function evaluateLambda(expr, input, environment) {
            // make a function (closure)
            var procedure = {
                _jsonata_lambda: true,
                input: input,
                environment: environment,
                arguments: expr.arguments,
                signature: expr.signature,
                body: expr.body
            };
            if(expr.thunk === true) {
                procedure.thunk = true;
            }
            procedure.apply = async function(self, args) {
                return await apply(procedure, args, input, !!self ? self.environment : environment);
            };
            return procedure;
        }
    
        /**
         * Evaluate partial application
         * @param {Object} expr - JSONata expression
         * @param {Object} input - Input data to evaluate against
         * @param {Object} environment - Environment
         * @returns {*} Evaluated input data
         */
        async function evaluatePartialApplication(expr, input, environment) {
            // partially apply a function
            var result;
            // evaluate the arguments
            var evaluatedArgs = [];
            for(var ii = 0; ii < expr.arguments.length; ii++) {
                var arg = expr.arguments[ii];
                if (arg.type === 'operator' && arg.value === '?') {
                    evaluatedArgs.push(arg);
                } else {
                    evaluatedArgs.push(await evaluate(arg, input, environment));
                }
            }
            // lookup the procedure
            var proc = await evaluate(expr.procedure, input, environment);
            if (typeof proc === 'undefined' && expr.procedure.type === 'path' && environment.lookup(expr.procedure.steps[0].value)) {
                // help the user out here if they simply forgot the leading $
                throw {
                    code: "T1007",
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.procedure.steps[0].value
                };
            }
            if (isLambda(proc)) {
                result = partialApplyProcedure(proc, evaluatedArgs);
            } else if (proc && proc._jsonata_function === true) {
                result = partialApplyNativeFunction(proc.implementation, evaluatedArgs);
            } else if (typeof proc === 'function') {
                result = partialApplyNativeFunction(proc, evaluatedArgs);
            } else {
                throw {
                    code: "T1008",
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.procedure.type === 'path' ? expr.procedure.steps[0].value : expr.procedure.value
                };
            }
            return result;
        }
    
        /**
         * Validate the arguments against the signature validator (if it exists)
         * @param {Function} signature - validator function
         * @param {Array} args - function arguments
         * @param {*} context - context value
         * @returns {Array} - validated arguments
         */
        function validateArguments(signature, args, context) {
            if(typeof signature === 'undefined') {
                // nothing to validate
                return args;
            }
            var validatedArgs = signature.validate(args, context);
            return validatedArgs;
        }
    
        /**
         * Apply procedure
         * @param {Object} proc - Procedure
         * @param {Array} args - Arguments
         * @returns {*} Result of procedure
         */
        async function applyProcedure(proc, args) {
            var result;
            var env = createFrame(proc.environment);
            proc.arguments.forEach(function (param, index) {
                env.bind(param.value, args[index]);
            });
            if (typeof proc.body === 'function') {
                // this is a lambda that wraps a native function - generated by partially evaluating a native
                result = await applyNativeFunction(proc.body, env);
            } else {
                result = await evaluate(proc.body, proc.input, env);
            }
            return result;
        }
    
        /**
         * Partially apply procedure
         * @param {Object} proc - Procedure
         * @param {Array} args - Arguments
         * @returns {{lambda: boolean, input: *, environment: {bind, lookup}, arguments: Array, body: *}} Result of partially applied procedure
         */
        function partialApplyProcedure(proc, args) {
            // create a closure, bind the supplied parameters and return a function that takes the remaining (?) parameters
            var env = createFrame(proc.environment);
            var unboundArgs = [];
            proc.arguments.forEach(function (param, index) {
                var arg = args[index];
                if (arg && arg.type === 'operator' && arg.value === '?') {
                    unboundArgs.push(param);
                } else {
                    env.bind(param.value, arg);
                }
            });
            var procedure = {
                _jsonata_lambda: true,
                input: proc.input,
                environment: env,
                arguments: unboundArgs,
                body: proc.body
            };
            return procedure;
        }
    
        /**
         * Partially apply native function
         * @param {Function} native - Native function
         * @param {Array} args - Arguments
         * @returns {{lambda: boolean, input: *, environment: {bind, lookup}, arguments: Array, body: *}} Result of partially applying native function
         */
        function partialApplyNativeFunction(native, args) {
            // create a lambda function that wraps and invokes the native function
            // get the list of declared arguments from the native function
            // this has to be picked out from the toString() value
            var sigArgs = getNativeFunctionArguments(native);
            sigArgs = sigArgs.map(function (sigArg) {
                return '$' + sigArg.trim();
            });
            var body = 'function(' + sigArgs.join(', ') + '){ _ }';
    
            var bodyAST = parser(body);
            bodyAST.body = native;
    
            var partial = partialApplyProcedure(bodyAST, args);
            return partial;
        }
    
        /**
         * Apply native function
         * @param {Object} proc - Procedure
         * @param {Object} env - Environment
         * @returns {*} Result of applying native function
         */
        async function applyNativeFunction(proc, env) {
            var sigArgs = getNativeFunctionArguments(proc);
            // generate the array of arguments for invoking the function - look them up in the environment
            var args = sigArgs.map(function (sigArg) {
                return env.lookup(sigArg.trim());
            });
    
            var focus = {
                environment: env
            };
            var result = proc.apply(focus, args);
            if(isPromise(result)) {
                result = await result;
            }
            if (isIterable(result)) {
                result = /*yield*/ result.next();
            }
            return result;
        }
    
        /**
         * Get native function arguments
         * @param {Function} func - Function
         * @returns {*|Array} Native function arguments
         */
        function getNativeFunctionArguments(func) {
            var signature = func.toString();
            var sigParens = /\(([^)]*)\)/.exec(signature)[1]; // the contents of the parens
            var sigArgs = sigParens.split(',');
            return sigArgs;
        }
    
        /**
         * Creates a function definition
         * @param {Function} func - function implementation in Javascript
         * @param {string} signature - JSONata function signature definition
         * @returns {{implementation: *, signature: *}} function definition
         */
        function defineFunction(func, signature) {
            var definition = {
                _jsonata_function: true,
                implementation: func
            };
            if(typeof signature !== 'undefined') {
                definition.signature = parseSignature(signature);
            }
            return definition;
        }
    
    
        /**
         * parses and evaluates the supplied expression
         * @param {string} expr - expression to evaluate
         * @returns {*} - result of evaluating the expression
         */
        async function functionEval(expr, focus) {
            // undefined inputs always return undefined
            if(typeof expr === 'undefined') {
                return undefined;
            }
            var input = this.input;
            if(typeof focus !== 'undefined') {
                input = focus;
                // if the input is a JSON array, then wrap it in a singleton sequence so it gets treated as a single input
                if(Array.isArray(input) && !isSequence(input)) {
                    input = createSequence(input);
                    input.outerWrapper = true;
                }
            }
    
            try {
                var ast = parser(expr, false);
            } catch(err) {
                // error parsing the expression passed to $eval
                populateMessage(err);
                throw {
                    stack: (new Error()).stack,
                    code: "D3120",
                    value: err.message,
                    error: err
                };
            }
            try {
                var result = await evaluate(ast, input, this.environment);
            } catch(err) {
                // error evaluating the expression passed to $eval
                populateMessage(err);
                throw {
                    stack: (new Error()).stack,
                    code: "D3121",
                    value:err.message,
                    error: err
                };
            }
    
            return result;
        }
    
        /**
         * Clones an object
         * @param {Object} arg - object to clone (deep copy)
         * @returns {*} - the cloned object
         */
        function functionClone(arg) {
            // undefined inputs always return undefined
            if(typeof arg === 'undefined') {
                return undefined;
            }
    
            return JSON.parse(fn.string(arg));
        }
    
        /**
         * Create frame
         * @param {Object} enclosingEnvironment - Enclosing environment
         * @returns {{bind: bind, lookup: lookup}} Created frame
         */
        function createFrame(enclosingEnvironment) {
            var bindings = {};
            return {
                bind: function (name, value) {
                    bindings[name] = value;
                },
                lookup: function (name) {
                    var value;
                    if(bindings.hasOwnProperty(name)) {
                        value = bindings[name];
                    } else if (enclosingEnvironment) {
                        value = enclosingEnvironment.lookup(name);
                    }
                    return value;
                },
                timestamp: enclosingEnvironment ? enclosingEnvironment.timestamp : null,
                async: enclosingEnvironment ? enclosingEnvironment.async : false,
                isParallelCall: enclosingEnvironment ? enclosingEnvironment.isParallelCall : false,
                global: enclosingEnvironment ? enclosingEnvironment.global : {
                    ancestry: [ null ]
                }
            };
        }
    
        // Function registration
        staticFrame.bind('sum', defineFunction(fn.sum, '<a<n>:n>'));
        staticFrame.bind('count', defineFunction(fn.count, '<a:n>'));
        staticFrame.bind('max', defineFunction(fn.max, '<a<n>:n>'));
        staticFrame.bind('min', defineFunction(fn.min, '<a<n>:n>'));
        staticFrame.bind('average', defineFunction(fn.average, '<a<n>:n>'));
        staticFrame.bind('string', defineFunction(fn.string, '<x-b?:s>'));
        staticFrame.bind('substring', defineFunction(fn.substring, '<s-nn?:s>'));
        staticFrame.bind('substringBefore', defineFunction(fn.substringBefore, '<s-s:s>'));
        staticFrame.bind('substringAfter', defineFunction(fn.substringAfter, '<s-s:s>'));
        staticFrame.bind('lowercase', defineFunction(fn.lowercase, '<s-:s>'));
        staticFrame.bind('uppercase', defineFunction(fn.uppercase, '<s-:s>'));
        staticFrame.bind('length', defineFunction(fn.length, '<s-:n>'));
        staticFrame.bind('trim', defineFunction(fn.trim, '<s-:s>'));
        staticFrame.bind('pad', defineFunction(fn.pad, '<s-ns?:s>'));
        staticFrame.bind('match', defineFunction(fn.match, '<s-f<s:o>n?:a<o>>'));
        staticFrame.bind('contains', defineFunction(fn.contains, '<s-(sf):b>')); // TODO <s-(sf<s:o>):b>
        staticFrame.bind('replace', defineFunction(fn.replace, '<s-(sf)(sf)n?:s>')); // TODO <s-(sf<s:o>)(sf<o:s>)n?:s>
        staticFrame.bind('split', defineFunction(fn.split, '<s-(sf)n?:a<s>>')); // TODO <s-(sf<s:o>)n?:a<s>>
        staticFrame.bind('join', defineFunction(fn.join, '<a<s>s?:s>'));
        staticFrame.bind('formatNumber', defineFunction(fn.formatNumber, '<n-so?:s>'));
        staticFrame.bind('formatBase', defineFunction(fn.formatBase, '<n-n?:s>'));
        staticFrame.bind('formatInteger', defineFunction(datetime.formatInteger, '<n-s:s>'));
        staticFrame.bind('parseInteger', defineFunction(datetime.parseInteger, '<s-s:n>'));
        staticFrame.bind('number', defineFunction(fn.number, '<(nsb)-:n>'));
        staticFrame.bind('floor', defineFunction(fn.floor, '<n-:n>'));
        staticFrame.bind('ceil', defineFunction(fn.ceil, '<n-:n>'));
        staticFrame.bind('round', defineFunction(fn.round, '<n-n?:n>'));
        staticFrame.bind('abs', defineFunction(fn.abs, '<n-:n>'));
        staticFrame.bind('sqrt', defineFunction(fn.sqrt, '<n-:n>'));
        staticFrame.bind('power', defineFunction(fn.power, '<n-n:n>'));
        staticFrame.bind('random', defineFunction(fn.random, '<:n>'));
        staticFrame.bind('boolean', defineFunction(fn.boolean, '<x-:b>'));
        staticFrame.bind('not', defineFunction(fn.not, '<x-:b>'));
        staticFrame.bind('map', defineFunction(fn.map, '<af>'));
        staticFrame.bind('zip', defineFunction(fn.zip, '<a+>'));
        staticFrame.bind('filter', defineFunction(fn.filter, '<af>'));
        staticFrame.bind('single', defineFunction(fn.single, '<af?>'));
        staticFrame.bind('reduce', defineFunction(fn.foldLeft, '<afj?:j>')); // TODO <f<jj:j>a<j>j?:j>
        staticFrame.bind('sift', defineFunction(fn.sift, '<o-f?:o>'));
        staticFrame.bind('keys', defineFunction(fn.keys, '<x-:a<s>>'));
        staticFrame.bind('lookup', defineFunction(fn.lookup, '<x-s:x>'));
        staticFrame.bind('append', defineFunction(fn.append, '<xx:a>'));
        staticFrame.bind('exists', defineFunction(fn.exists, '<x:b>'));
        staticFrame.bind('spread', defineFunction(fn.spread, '<x-:a<o>>'));
        staticFrame.bind('merge', defineFunction(fn.merge, '<a<o>:o>'));
        staticFrame.bind('reverse', defineFunction(fn.reverse, '<a:a>'));
        staticFrame.bind('each', defineFunction(fn.each, '<o-f:a>'));
        staticFrame.bind('error', defineFunction(fn.error, '<s?:x>'));
        staticFrame.bind('assert', defineFunction(fn.assert, '<bs?:x>'));
        staticFrame.bind('type', defineFunction(fn.type, '<x:s>'));
        staticFrame.bind('sort', defineFunction(fn.sort, '<af?:a>'));
        staticFrame.bind('shuffle', defineFunction(fn.shuffle, '<a:a>'));
        staticFrame.bind('distinct', defineFunction(fn.distinct, '<x:x>'));
        staticFrame.bind('base64encode', defineFunction(fn.base64encode, '<s-:s>'));
        staticFrame.bind('base64decode', defineFunction(fn.base64decode, '<s-:s>'));
        staticFrame.bind('encodeUrlComponent', defineFunction(fn.encodeUrlComponent, '<s-:s>'));
        staticFrame.bind('encodeUrl', defineFunction(fn.encodeUrl, '<s-:s>'));
        staticFrame.bind('decodeUrlComponent', defineFunction(fn.decodeUrlComponent, '<s-:s>'));
        staticFrame.bind('decodeUrl', defineFunction(fn.decodeUrl, '<s-:s>'));
        staticFrame.bind('eval', defineFunction(functionEval, '<sx?:x>'));
        staticFrame.bind('toMillis', defineFunction(datetime.toMillis, '<s-s?:n>'));
        staticFrame.bind('fromMillis', defineFunction(datetime.fromMillis, '<n-s?s?:s>'));
        staticFrame.bind('clone', defineFunction(functionClone, '<(oa)-:o>'));
    
        /**
         * Error codes
         *
         * Sxxxx    - Static errors (compile time)
         * Txxxx    - Type errors
         * Dxxxx    - Dynamic errors (evaluate time)
         *  01xx    - tokenizer
         *  02xx    - parser
         *  03xx    - regex parser
         *  04xx    - function signature parser/evaluator
         *  10xx    - evaluator
         *  20xx    - operators
         *  3xxx    - functions (blocks of 10 for each function)
         */
        var errorCodes = {
            "S0101": "String literal must be terminated by a matching quote",
            "S0102": "Number out of range: {{token}}",
            "S0103": "Unsupported escape sequence: \\{{token}}",
            "S0104": "The escape sequence \\u must be followed by 4 hex digits",
            "S0105": "Quoted property name must be terminated with a backquote (`)",
            "S0106": "Comment has no closing tag",
            "S0201": "Syntax error: {{token}}",
            "S0202": "Expected {{value}}, got {{token}}",
            "S0203": "Expected {{value}} before end of expression",
            "S0204": "Unknown operator: {{token}}",
            "S0205": "Unexpected token: {{token}}",
            "S0206": "Unknown expression type: {{token}}",
            "S0207": "Unexpected end of expression",
            "S0208": "Parameter {{value}} of function definition must be a variable name (start with $)",
            "S0209": "A predicate cannot follow a grouping expression in a step",
            "S0210": "Each step can only have one grouping expression",
            "S0211": "The symbol {{token}} cannot be used as a unary operator",
            "S0212": "The left side of := must be a variable name (start with $)",
            "S0213": "The literal value {{value}} cannot be used as a step within a path expression",
            "S0214": "The right side of {{token}} must be a variable name (start with $)",
            "S0215": "A context variable binding must precede any predicates on a step",
            "S0216": "A context variable binding must precede the 'order-by' clause on a step",
            "S0217": "The object representing the 'parent' cannot be derived from this expression",
            "S0301": "Empty regular expressions are not allowed",
            "S0302": "No terminating / in regular expression",
            "S0402": "Choice groups containing parameterized types are not supported",
            "S0401": "Type parameters can only be applied to functions and arrays",
            "S0500": "Attempted to evaluate an expression containing syntax error(s)",
            "T0410": "Argument {{index}} of function {{token}} does not match function signature",
            "T0411": "Context value is not a compatible type with argument {{index}} of function {{token}}",
            "T0412": "Argument {{index}} of function {{token}} must be an array of {{type}}",
            "D1001": "Number out of range: {{value}}",
            "D1002": "Cannot negate a non-numeric value: {{value}}",
            "T1003": "Key in object structure must evaluate to a string; got: {{value}}",
            "D1004": "Regular expression matches zero length string",
            "T1005": "Attempted to invoke a non-function. Did you mean ${{{token}}}?",
            "T1006": "Attempted to invoke a non-function",
            "T1007": "Attempted to partially apply a non-function. Did you mean ${{{token}}}?",
            "T1008": "Attempted to partially apply a non-function",
            "D1009": "Multiple key definitions evaluate to same key: {{value}}",
            "T1010": "The matcher function argument passed to function {{token}} does not return the correct object structure",
            "T2001": "The left side of the {{token}} operator must evaluate to a number",
            "T2002": "The right side of the {{token}} operator must evaluate to a number",
            "T2003": "The left side of the range operator (..) must evaluate to an integer",
            "T2004": "The right side of the range operator (..) must evaluate to an integer",
            "D2005": "The left side of := must be a variable name (start with $)",  // defunct - replaced by S0212 parser error
            "T2006": "The right side of the function application operator ~> must be a function",
            "T2007": "Type mismatch when comparing values {{value}} and {{value2}} in order-by clause",
            "T2008": "The expressions within an order-by clause must evaluate to numeric or string values",
            "T2009": "The values {{value}} and {{value2}} either side of operator {{token}} must be of the same data type",
            "T2010": "The expressions either side of operator {{token}} must evaluate to numeric or string values",
            "T2011": "The insert/update clause of the transform expression must evaluate to an object: {{value}}",
            "T2012": "The delete clause of the transform expression must evaluate to a string or array of strings: {{value}}",
            "T2013": "The transform expression clones the input object using the $clone() function.  This has been overridden in the current scope by a non-function.",
            "D2014": "The size of the sequence allocated by the range operator (..) must not exceed 1e6.  Attempted to allocate {{value}}.",
            "D3001": "Attempting to invoke string function on Infinity or NaN",
            "D3010": "Second argument of replace function cannot be an empty string",
            "D3011": "Fourth argument of replace function must evaluate to a positive number",
            "D3012": "Attempted to replace a matched string with a non-string value",
            "D3020": "Third argument of split function must evaluate to a positive number",
            "D3030": "Unable to cast value to a number: {{value}}",
            "D3040": "Third argument of match function must evaluate to a positive number",
            "D3050": "The second argument of reduce function must be a function with at least two arguments",
            "D3060": "The sqrt function cannot be applied to a negative number: {{value}}",
            "D3061": "The power function has resulted in a value that cannot be represented as a JSON number: base={{value}}, exponent={{exp}}",
            "D3070": "The single argument form of the sort function can only be applied to an array of strings or an array of numbers.  Use the second argument to specify a comparison function",
            "D3080": "The picture string must only contain a maximum of two sub-pictures",
            "D3081": "The sub-picture must not contain more than one instance of the 'decimal-separator' character",
            "D3082": "The sub-picture must not contain more than one instance of the 'percent' character",
            "D3083": "The sub-picture must not contain more than one instance of the 'per-mille' character",
            "D3084": "The sub-picture must not contain both a 'percent' and a 'per-mille' character",
            "D3085": "The mantissa part of a sub-picture must contain at least one character that is either an 'optional digit character' or a member of the 'decimal digit family'",
            "D3086": "The sub-picture must not contain a passive character that is preceded by an active character and that is followed by another active character",
            "D3087": "The sub-picture must not contain a 'grouping-separator' character that appears adjacent to a 'decimal-separator' character",
            "D3088": "The sub-picture must not contain a 'grouping-separator' at the end of the integer part",
            "D3089": "The sub-picture must not contain two adjacent instances of the 'grouping-separator' character",
            "D3090": "The integer part of the sub-picture must not contain a member of the 'decimal digit family' that is followed by an instance of the 'optional digit character'",
            "D3091": "The fractional part of the sub-picture must not contain an instance of the 'optional digit character' that is followed by a member of the 'decimal digit family'",
            "D3092": "A sub-picture that contains a 'percent' or 'per-mille' character must not contain a character treated as an 'exponent-separator'",
            "D3093": "The exponent part of the sub-picture must comprise only of one or more characters that are members of the 'decimal digit family'",
            "D3100": "The radix of the formatBase function must be between 2 and 36.  It was given {{value}}",
            "D3110": "The argument of the toMillis function must be an ISO 8601 formatted timestamp. Given {{value}}",
            "D3120": "Syntax error in expression passed to function eval: {{value}}",
            "D3121": "Dynamic error evaluating the expression passed to function eval: {{value}}",
            "D3130": "Formatting or parsing an integer as a sequence starting with {{value}} is not supported by this implementation",
            "D3131": "In a decimal digit pattern, all digits must be from the same decimal group",
            "D3132": "Unknown component specifier {{value}} in date/time picture string",
            "D3133": "The 'name' modifier can only be applied to months and days in the date/time picture string, not {{value}}",
            "D3134": "The timezone integer format specifier cannot have more than four digits",
            "D3135": "No matching closing bracket ']' in date/time picture string",
            "D3136": "The date/time picture string is missing specifiers required to parse the timestamp",
            "D3137": "{{{message}}}",
            "D3138": "The $single() function expected exactly 1 matching result.  Instead it matched more.",
            "D3139": "The $single() function expected exactly 1 matching result.  Instead it matched 0.",
            "D3140": "Malformed URL passed to ${{{functionName}}}(): {{value}}",
            "D3141": "{{{message}}}"
        };
    
        /**
         * lookup a message template from the catalog and substitute the inserts.
         * Populates `err.message` with the substituted message. Leaves `err.message`
         * untouched if code lookup fails.
         * @param {string} err - error code to lookup
         * @returns {undefined} - `err` is modified in place
         */
        function populateMessage(err) {
            var template = errorCodes[err.code];
            if(typeof template !== 'undefined') {
                // if there are any handlebars, replace them with the field references
                // triple braces - replace with value
                // double braces - replace with json stringified value
                var message = template.replace(/\{\{\{([^}]+)}}}/g, function() {
                    return err[arguments[1]];
                });
                message = message.replace(/\{\{([^}]+)}}/g, function() {
                    return JSON.stringify(err[arguments[1]]);
                });
                err.message = message;
            }
            // Otherwise retain the original `err.message`
        }
    
        /**
         * JSONata
         * @param {Object} expr - JSONata expression
         * @param {Object} options
         * @param {boolean} options.recover: attempt to recover on parse error
         * @param {Function} options.RegexEngine: RegEx class constructor to use
         * @returns {{evaluate: evaluate, assign: assign}} Evaluated expression
         */
        function jsonata(expr, options) {
            var ast;
            var errors;
            try {
                ast = parser(expr, options && options.recover);
                errors = ast.errors;
                delete ast.errors;
            } catch(err) {
                // insert error message into structure
                populateMessage(err); // possible side-effects on `err`
                throw err;
            }
            var environment = createFrame(staticFrame);
    
            var timestamp = new Date(); // will be overridden on each call to evalute()
            environment.bind('now', defineFunction(function(picture, timezone) {
                return datetime.fromMillis(timestamp.getTime(), picture, timezone);
            }, '<s?s?:s>'));
            environment.bind('millis', defineFunction(function() {
                return timestamp.getTime();
            }, '<:n>'));
    
            if(options && options.RegexEngine) {
                jsonata.RegexEngine = options.RegexEngine;
            } else {
                jsonata.RegexEngine = RegExp;
            }
    
            return {
                evaluate: async function (input, bindings, callback) {
                    // throw if the expression compiled with syntax errors
                    if(typeof errors !== 'undefined') {
                        var err = {
                            code: 'S0500',
                            position: 0
                        };
                        populateMessage(err); // possible side-effects on `err`
                        throw err;
                    }
    
                    if (typeof bindings !== 'undefined') {
                        var exec_env;
                        // the variable bindings have been passed in - create a frame to hold these
                        exec_env = createFrame(environment);
                        for (var v in bindings) {
                            exec_env.bind(v, bindings[v]);
                        }
                    } else {
                        exec_env = environment;
                    }
                    // put the input document into the environment as the root object
                    exec_env.bind('$', input);
    
                    // capture the timestamp and put it in the execution environment
                    // the $now() and $millis() functions will return this value - whenever it is called
                    timestamp = new Date();
                    exec_env.timestamp = timestamp;
    
                    // if the input is a JSON array, then wrap it in a singleton sequence so it gets treated as a single input
                    if(Array.isArray(input) && !isSequence(input)) {
                        input = createSequence(input);
                        input.outerWrapper = true;
                    }
    
                    var result, it;
                    try {
                        it = evaluate(ast, input, exec_env);
                        // for backwards-compatibility:
                        return !!callback ? it
                            .then(res => callback(undefined, res))
                            .catch(err => callback(err, undefined)) 
                        : await it;
                    } catch (err) {
                        // insert error message into structure
                        populateMessage(err); // possible side-effects on `err`
                        throw err;
                    }
                },
                assign: function (name, value) {
                    environment.bind(name, value);
                },
                registerFunction: function(name, implementation, signature) {
                    var func = defineFunction(implementation, signature);
                    environment.bind(name, func);
                },
                ast: function() {
                    return ast;
                },
                errors: function() {
                    return errors;
                }
            };
        }
    
        return jsonata;
    
    })();
    
    module.exports = jsonata;
    
    },{"./datetime":1,"./functions":2,"./parser":4,"./signature":5,"./utils":6}],4:[function(require,module,exports){
    /**
     * © Copyright IBM Corp. 2016, 2018 All Rights Reserved
     *   Project name: JSONata
     *   This project is licensed under the MIT License, see LICENSE
     */
    
    var parseSignature = require('./signature');
    
    const parser = (() => {
        'use strict';
    
        var operators = {
            '.': 75,
            '[': 80,
            ']': 0,
            '{': 70,
            '}': 0,
            '(': 80,
            ')': 0,
            ',': 0,
            '@': 80,
            '#': 80,
            ';': 80,
            ':': 80,
            '?': 20,
            '+': 50,
            '-': 50,
            '*': 60,
            '/': 60,
            '%': 60,
            '|': 20,
            '=': 40,
            '<': 40,
            '>': 40,
            '^': 40,
            '**': 60,
            '..': 20,
            ':=': 10,
            '!=': 40,
            '<=': 40,
            '>=': 40,
            '~>': 40,
            'and': 30,
            'or': 25,
            'in': 40,
            '&': 50,
            '!': 0,   // not an operator, but needed as a stop character for name tokens
            '~': 0   // not an operator, but needed as a stop character for name tokens
        };
    
        var escapes = {  // JSON string escape sequences - see json.org
            '"': '"',
            '\\': '\\',
            '/': '/',
            'b': '\b',
            'f': '\f',
            'n': '\n',
            'r': '\r',
            't': '\t'
        };
    
        // Tokenizer (lexer) - invoked by the parser to return one token at a time
        var tokenizer = function (path) {
            var position = 0;
            var length = path.length;
    
            var create = function (type, value) {
                var obj = {type: type, value: value, position: position};
                return obj;
            };
    
            var scanRegex = function () {
                // the prefix '/' will have been previously scanned. Find the end of the regex.
                // search for closing '/' ignoring any that are escaped, or within brackets
                var start = position;
                var depth = 0;
                var pattern;
                var flags;
                while (position < length) {
                    var currentChar = path.charAt(position);
                    if (currentChar === '/' && path.charAt(position - 1) !== '\\' && depth === 0) {
                        // end of regex found
                        pattern = path.substring(start, position);
                        if (pattern === '') {
                            throw {
                                code: "S0301",
                                stack: (new Error()).stack,
                                position: position
                            };
                        }
                        position++;
                        currentChar = path.charAt(position);
                        // flags
                        start = position;
                        while (currentChar === 'i' || currentChar === 'm') {
                            position++;
                            currentChar = path.charAt(position);
                        }
                        flags = path.substring(start, position) + 'g';
                        return new RegExp(pattern, flags);
                    }
                    if ((currentChar === '(' || currentChar === '[' || currentChar === '{') && path.charAt(position - 1) !== '\\') {
                        depth++;
                    }
                    if ((currentChar === ')' || currentChar === ']' || currentChar === '}') && path.charAt(position - 1) !== '\\') {
                        depth--;
                    }
    
                    position++;
                }
                throw {
                    code: "S0302",
                    stack: (new Error()).stack,
                    position: position
                };
            };
    
            var next = function (prefix) {
                if (position >= length) return null;
                var currentChar = path.charAt(position);
                // skip whitespace
                while (position < length && ' \t\n\r\v'.indexOf(currentChar) > -1) {
                    position++;
                    currentChar = path.charAt(position);
                }
                // skip comments
                if (currentChar === '/' && path.charAt(position + 1) === '*') {
                    var commentStart = position;
                    position += 2;
                    currentChar = path.charAt(position);
                    while (!(currentChar === '*' && path.charAt(position + 1) === '/')) {
                        currentChar = path.charAt(++position);
                        if (position >= length) {
                            // no closing tag
                            throw {
                                code: "S0106",
                                stack: (new Error()).stack,
                                position: commentStart
                            };
                        }
                    }
                    position += 2;
                    currentChar = path.charAt(position);
                    return next(prefix); // need this to swallow any following whitespace
                }
                // test for regex
                if (prefix !== true && currentChar === '/') {
                    position++;
                    return create('regex', scanRegex());
                }
                // handle double-char operators
                if (currentChar === '.' && path.charAt(position + 1) === '.') {
                    // double-dot .. range operator
                    position += 2;
                    return create('operator', '..');
                }
                if (currentChar === ':' && path.charAt(position + 1) === '=') {
                    // := assignment
                    position += 2;
                    return create('operator', ':=');
                }
                if (currentChar === '!' && path.charAt(position + 1) === '=') {
                    // !=
                    position += 2;
                    return create('operator', '!=');
                }
                if (currentChar === '>' && path.charAt(position + 1) === '=') {
                    // >=
                    position += 2;
                    return create('operator', '>=');
                }
                if (currentChar === '<' && path.charAt(position + 1) === '=') {
                    // <=
                    position += 2;
                    return create('operator', '<=');
                }
                if (currentChar === '*' && path.charAt(position + 1) === '*') {
                    // **  descendant wildcard
                    position += 2;
                    return create('operator', '**');
                }
                if (currentChar === '~' && path.charAt(position + 1) === '>') {
                    // ~>  chain function
                    position += 2;
                    return create('operator', '~>');
                }
                // test for single char operators
                if (Object.prototype.hasOwnProperty.call(operators, currentChar)) {
                    position++;
                    return create('operator', currentChar);
                }
                // test for string literals
                if (currentChar === '"' || currentChar === "'") {
                    var quoteType = currentChar;
                    // double quoted string literal - find end of string
                    position++;
                    var qstr = "";
                    while (position < length) {
                        currentChar = path.charAt(position);
                        if (currentChar === '\\') { // escape sequence
                            position++;
                            currentChar = path.charAt(position);
                            if (Object.prototype.hasOwnProperty.call(escapes, currentChar)) {
                                qstr += escapes[currentChar];
                            } else if (currentChar === 'u') {
                                // \u should be followed by 4 hex digits
                                var octets = path.substr(position + 1, 4);
                                if (/^[0-9a-fA-F]+$/.test(octets)) {
                                    var codepoint = parseInt(octets, 16);
                                    qstr += String.fromCharCode(codepoint);
                                    position += 4;
                                } else {
                                    throw {
                                        code: "S0104",
                                        stack: (new Error()).stack,
                                        position: position
                                    };
                                }
                            } else {
                                // illegal escape sequence
                                throw {
                                    code: "S0103",
                                    stack: (new Error()).stack,
                                    position: position,
                                    token: currentChar
                                };
    
                            }
                        } else if (currentChar === quoteType) {
                            position++;
                            return create('string', qstr);
                        } else {
                            qstr += currentChar;
                        }
                        position++;
                    }
                    throw {
                        code: "S0101",
                        stack: (new Error()).stack,
                        position: position
                    };
                }
                // test for numbers
                var numregex = /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?/;
                var match = numregex.exec(path.substring(position));
                if (match !== null) {
                    var num = parseFloat(match[0]);
                    if (!isNaN(num) && isFinite(num)) {
                        position += match[0].length;
                        return create('number', num);
                    } else {
                        throw {
                            code: "S0102",
                            stack: (new Error()).stack,
                            position: position,
                            token: match[0]
                        };
                    }
                }
                // test for quoted names (backticks)
                var name;
                if (currentChar === '`') {
                    // scan for closing quote
                    position++;
                    var end = path.indexOf('`', position);
                    if (end !== -1) {
                        name = path.substring(position, end);
                        position = end + 1;
                        return create('name', name);
                    }
                    position = length;
                    throw {
                        code: "S0105",
                        stack: (new Error()).stack,
                        position: position
                    };
                }
                // test for names
                var i = position;
                var ch;
                for (; ;) {
                    ch = path.charAt(i);
                    if (i === length || ' \t\n\r\v'.indexOf(ch) > -1 || Object.prototype.hasOwnProperty.call(operators, ch)) {
                        if (path.charAt(position) === '$') {
                            // variable reference
                            name = path.substring(position + 1, i);
                            position = i;
                            return create('variable', name);
                        } else {
                            name = path.substring(position, i);
                            position = i;
                            switch (name) {
                                case 'or':
                                case 'in':
                                case 'and':
                                    return create('operator', name);
                                case 'true':
                                    return create('value', true);
                                case 'false':
                                    return create('value', false);
                                case 'null':
                                    return create('value', null);
                                default:
                                    if (position === length && name === '') {
                                        // whitespace at end of input
                                        return null;
                                    }
                                    return create('name', name);
                            }
                        }
                    } else {
                        i++;
                    }
                }
            };
    
            return next;
        };
    
        // This parser implements the 'Top down operator precedence' algorithm developed by Vaughan R Pratt; http://dl.acm.org/citation.cfm?id=512931.
        // and builds on the Javascript framework described by Douglas Crockford at http://javascript.crockford.com/tdop/tdop.html
        // and in 'Beautiful Code', edited by Andy Oram and Greg Wilson, Copyright 2007 O'Reilly Media, Inc. 798-0-596-51004-6
    
        var parser = function (source, recover) {
            var node;
            var lexer;
    
            var symbol_table = {};
            var errors = [];
    
            var remainingTokens = function () {
                var remaining = [];
                if (node.id !== '(end)') {
                    remaining.push({type: node.type, value: node.value, position: node.position});
                }
                var nxt = lexer();
                while (nxt !== null) {
                    remaining.push(nxt);
                    nxt = lexer();
                }
                return remaining;
            };
    
            var base_symbol = {
                nud: function () {
                    // error - symbol has been invoked as a unary operator
                    var err = {
                        code: 'S0211',
                        token: this.value,
                        position: this.position
                    };
    
                    if (recover) {
                        err.remaining = remainingTokens();
                        err.type = 'error';
                        errors.push(err);
                        return err;
                    } else {
                        err.stack = (new Error()).stack;
                        throw err;
                    }
                }
            };
    
            var symbol = function (id, bp) {
                var s = symbol_table[id];
                bp = bp || 0;
                if (s) {
                    if (bp >= s.lbp) {
                        s.lbp = bp;
                    }
                } else {
                    s = Object.create(base_symbol);
                    s.id = s.value = id;
                    s.lbp = bp;
                    symbol_table[id] = s;
                }
                return s;
            };
    
            var handleError = function (err) {
                if (recover) {
                    // tokenize the rest of the buffer and add it to an error token
                    err.remaining = remainingTokens();
                    errors.push(err);
                    var symbol = symbol_table["(error)"];
                    node = Object.create(symbol);
                    node.error = err;
                    node.type = "(error)";
                    return node;
                } else {
                    err.stack = (new Error()).stack;
                    throw err;
                }
            };
    
            var advance = function (id, infix) {
                if (id && node.id !== id) {
                    var code;
                    if (node.id === '(end)') {
                        // unexpected end of buffer
                        code = "S0203";
                    } else {
                        code = "S0202";
                    }
                    var err = {
                        code: code,
                        position: node.position,
                        token: node.value,
                        value: id
                    };
                    return handleError(err);
                }
                var next_token = lexer(infix);
                if (next_token === null) {
                    node = symbol_table["(end)"];
                    node.position = source.length;
                    return node;
                }
                var value = next_token.value;
                var type = next_token.type;
                var symbol;
                switch (type) {
                    case 'name':
                    case 'variable':
                        symbol = symbol_table["(name)"];
                        break;
                    case 'operator':
                        symbol = symbol_table[value];
                        if (!symbol) {
                            return handleError({
                                code: "S0204",
                                stack: (new Error()).stack,
                                position: next_token.position,
                                token: value
                            });
                        }
                        break;
                    case 'string':
                    case 'number':
                    case 'value':
                        symbol = symbol_table["(literal)"];
                        break;
                    case 'regex':
                        type = "regex";
                        symbol = symbol_table["(regex)"];
                        break;
                    /* istanbul ignore next */
                    default:
                        return handleError({
                            code: "S0205",
                            stack: (new Error()).stack,
                            position: next_token.position,
                            token: value
                        });
                }
    
                node = Object.create(symbol);
                node.value = value;
                node.type = type;
                node.position = next_token.position;
                return node;
            };
    
            // Pratt's algorithm
            var expression = function (rbp) {
                var left;
                var t = node;
                advance(null, true);
                left = t.nud();
                while (rbp < node.lbp) {
                    t = node;
                    advance();
                    left = t.led(left);
                }
                return left;
            };
    
            var terminal = function (id) {
                var s = symbol(id, 0);
                s.nud = function () {
                    return this;
                };
            };
    
            // match infix operators
            // <expression> <operator> <expression>
            // left associative
            var infix = function (id, bp, led) {
                var bindingPower = bp || operators[id];
                var s = symbol(id, bindingPower);
                s.led = led || function (left) {
                    this.lhs = left;
                    this.rhs = expression(bindingPower);
                    this.type = "binary";
                    return this;
                };
                return s;
            };
    
            // match infix operators
            // <expression> <operator> <expression>
            // right associative
            var infixr = function (id, bp, led) {
                var s = symbol(id, bp);
                s.led = led;
                return s;
            };
    
            // match prefix operators
            // <operator> <expression>
            var prefix = function (id, nud) {
                var s = symbol(id);
                s.nud = nud || function () {
                    this.expression = expression(70);
                    this.type = "unary";
                    return this;
                };
                return s;
            };
    
            terminal("(end)");
            terminal("(name)");
            terminal("(literal)");
            terminal("(regex)");
            symbol(":");
            symbol(";");
            symbol(",");
            symbol(")");
            symbol("]");
            symbol("}");
            symbol(".."); // range operator
            infix("."); // map operator
            infix("+"); // numeric addition
            infix("-"); // numeric subtraction
            infix("*"); // numeric multiplication
            infix("/"); // numeric division
            infix("%"); // numeric modulus
            infix("="); // equality
            infix("<"); // less than
            infix(">"); // greater than
            infix("!="); // not equal to
            infix("<="); // less than or equal
            infix(">="); // greater than or equal
            infix("&"); // string concatenation
            infix("and"); // Boolean AND
            infix("or"); // Boolean OR
            infix("in"); // is member of array
            terminal("and"); // the 'keywords' can also be used as terminals (field names)
            terminal("or"); //
            terminal("in"); //
            prefix("-"); // unary numeric negation
            infix("~>"); // function application
    
            infixr("(error)", 10, function (left) {
                this.lhs = left;
    
                this.error = node.error;
                this.remaining = remainingTokens();
                this.type = 'error';
                return this;
            });
    
            // field wildcard (single level)
            prefix('*', function () {
                this.type = "wildcard";
                return this;
            });
    
            // descendant wildcard (multi-level)
            prefix('**', function () {
                this.type = "descendant";
                return this;
            });
    
            // parent operator
            prefix('%', function () {
                this.type = "parent";
                return this;
            });
    
            // function invocation
            infix("(", operators['('], function (left) {
                // left is is what we are trying to invoke
                this.procedure = left;
                this.type = 'function';
                this.arguments = [];
                if (node.id !== ')') {
                    for (; ;) {
                        if (node.type === 'operator' && node.id === '?') {
                            // partial function application
                            this.type = 'partial';
                            this.arguments.push(node);
                            advance('?');
                        } else {
                            this.arguments.push(expression(0));
                        }
                        if (node.id !== ',') break;
                        advance(',');
                    }
                }
                advance(")", true);
                // if the name of the function is 'function' or λ, then this is function definition (lambda function)
                if (left.type === 'name' && (left.value === 'function' || left.value === '\u03BB')) {
                    // all of the args must be VARIABLE tokens
                    this.arguments.forEach(function (arg, index) {
                        if (arg.type !== 'variable') {
                            return handleError({
                                code: "S0208",
                                stack: (new Error()).stack,
                                position: arg.position,
                                token: arg.value,
                                value: index + 1
                            });
                        }
                    });
                    this.type = 'lambda';
                    // is the next token a '<' - if so, parse the function signature
                    if (node.id === '<') {
                        var sigPos = node.position;
                        var depth = 1;
                        var sig = '<';
                        while (depth > 0 && node.id !== '{' && node.id !== '(end)') {
                            var tok = advance();
                            if (tok.id === '>') {
                                depth--;
                            } else if (tok.id === '<') {
                                depth++;
                            }
                            sig += tok.value;
                        }
                        advance('>');
                        try {
                            this.signature = parseSignature(sig);
                        } catch (err) {
                            // insert the position into this error
                            err.position = sigPos + err.offset;
                            return handleError(err);
                        }
                    }
                    // parse the function body
                    advance('{');
                    this.body = expression(0);
                    advance('}');
                }
                return this;
            });
    
            // parenthesis - block expression
            prefix("(", function () {
                var expressions = [];
                while (node.id !== ")") {
                    expressions.push(expression(0));
                    if (node.id !== ";") {
                        break;
                    }
                    advance(";");
                }
                advance(")", true);
                this.type = 'block';
                this.expressions = expressions;
                return this;
            });
    
            // array constructor
            prefix("[", function () {
                var a = [];
                if (node.id !== "]") {
                    for (; ;) {
                        var item = expression(0);
                        if (node.id === "..") {
                            // range operator
                            var range = {type: "binary", value: "..", position: node.position, lhs: item};
                            advance("..");
                            range.rhs = expression(0);
                            item = range;
                        }
                        a.push(item);
                        if (node.id !== ",") {
                            break;
                        }
                        advance(",");
                    }
                }
                advance("]", true);
                this.expressions = a;
                this.type = "unary";
                return this;
            });
    
            // filter - predicate or array index
            infix("[", operators['['], function (left) {
                if (node.id === "]") {
                    // empty predicate means maintain singleton arrays in the output
                    var step = left;
                    while (step && step.type === 'binary' && step.value === '[') {
                        step = step.lhs;
                    }
                    step.keepArray = true;
                    advance("]");
                    return left;
                } else {
                    this.lhs = left;
                    this.rhs = expression(operators[']']);
                    this.type = 'binary';
                    advance("]", true);
                    return this;
                }
            });
    
            // order-by
            infix("^", operators['^'], function (left) {
                advance("(");
                var terms = [];
                for (; ;) {
                    var term = {
                        descending: false
                    };
                    if (node.id === "<") {
                        // ascending sort
                        advance("<");
                    } else if (node.id === ">") {
                        // descending sort
                        term.descending = true;
                        advance(">");
                    } else {
                        //unspecified - default to ascending
                    }
                    term.expression = expression(0);
                    terms.push(term);
                    if (node.id !== ",") {
                        break;
                    }
                    advance(",");
                }
                advance(")");
                this.lhs = left;
                this.rhs = terms;
                this.type = 'binary';
                return this;
            });
    
            var objectParser = function (left) {
                var a = [];
                if (node.id !== "}") {
                    for (; ;) {
                        var n = expression(0);
                        advance(":");
                        var v = expression(0);
                        a.push([n, v]); // holds an array of name/value expression pairs
                        if (node.id !== ",") {
                            break;
                        }
                        advance(",");
                    }
                }
                advance("}", true);
                if (typeof left === 'undefined') {
                    // NUD - unary prefix form
                    this.lhs = a;
                    this.type = "unary";
                } else {
                    // LED - binary infix form
                    this.lhs = left;
                    this.rhs = a;
                    this.type = 'binary';
                }
                return this;
            };
    
            // object constructor
            prefix("{", objectParser);
    
            // object grouping
            infix("{", operators['{'], objectParser);
    
            // bind variable
            infixr(":=", operators[':='], function (left) {
                if (left.type !== 'variable') {
                    return handleError({
                        code: "S0212",
                        stack: (new Error()).stack,
                        position: left.position,
                        token: left.value
                    });
                }
                this.lhs = left;
                this.rhs = expression(operators[':='] - 1); // subtract 1 from bindingPower for right associative operators
                this.type = "binary";
                return this;
            });
    
            // focus variable bind
            infix("@", operators['@'], function (left) {
                this.lhs = left;
                this.rhs = expression(operators['@']);
                if(this.rhs.type !== 'variable') {
                    return handleError({
                        code: "S0214",
                        stack: (new Error()).stack,
                        position: this.rhs.position,
                        token: "@"
                    });
                }
                this.type = "binary";
                return this;
            });
    
            // index (position) variable bind
            infix("#", operators['#'], function (left) {
                this.lhs = left;
                this.rhs = expression(operators['#']);
                if(this.rhs.type !== 'variable') {
                    return handleError({
                        code: "S0214",
                        stack: (new Error()).stack,
                        position: this.rhs.position,
                        token: "#"
                    });
                }
                this.type = "binary";
                return this;
            });
    
            // if/then/else ternary operator ?:
            infix("?", operators['?'], function (left) {
                this.type = 'condition';
                this.condition = left;
                this.then = expression(0);
                if (node.id === ':') {
                    // else condition
                    advance(":");
                    this.else = expression(0);
                }
                return this;
            });
    
            // object transformer
            prefix("|", function () {
                this.type = 'transform';
                this.pattern = expression(0);
                advance('|');
                this.update = expression(0);
                if (node.id === ',') {
                    advance(',');
                    this.delete = expression(0);
                }
                advance('|');
                return this;
            });
    
            // tail call optimization
            // this is invoked by the post parser to analyse lambda functions to see
            // if they make a tail call.  If so, it is replaced by a thunk which will
            // be invoked by the trampoline loop during function application.
            // This enables tail-recursive functions to be written without growing the stack
            var tailCallOptimize = function (expr) {
                var result;
                if (expr.type === 'function' && !expr.predicate) {
                    var thunk = {type: 'lambda', thunk: true, arguments: [], position: expr.position};
                    thunk.body = expr;
                    result = thunk;
                } else if (expr.type === 'condition') {
                    // analyse both branches
                    expr.then = tailCallOptimize(expr.then);
                    if (typeof expr.else !== 'undefined') {
                        expr.else = tailCallOptimize(expr.else);
                    }
                    result = expr;
                } else if (expr.type === 'block') {
                    // only the last expression in the block
                    var length = expr.expressions.length;
                    if (length > 0) {
                        expr.expressions[length - 1] = tailCallOptimize(expr.expressions[length - 1]);
                    }
                    result = expr;
                } else {
                    result = expr;
                }
                return result;
            };
    
            var ancestorLabel = 0;
            var ancestorIndex = 0;
            var ancestry = [];
    
            var seekParent = function (node, slot) {
                switch (node.type) {
                    case 'name':
                    case 'wildcard':
                        slot.level--;
                        if(slot.level === 0) {
                            if (typeof node.ancestor === 'undefined') {
                                node.ancestor = slot;
                            } else {
                                // reuse the existing label
                                ancestry[slot.index].slot.label = node.ancestor.label;
                                node.ancestor = slot;
                            }
                            node.tuple = true;
                        }
                        break;
                    case 'parent':
                        slot.level++;
                        break;
                    case 'block':
                        // look in last expression in the block
                        if(node.expressions.length > 0) {
                            node.tuple = true;
                            slot = seekParent(node.expressions[node.expressions.length - 1], slot);
                        }
                        break;
                    case 'path':
                        // last step in path
                        node.tuple = true;
                        var index = node.steps.length - 1;
                        slot = seekParent(node.steps[index--], slot);
                        while (slot.level > 0 && index >= 0) {
                            // check previous steps
                            slot = seekParent(node.steps[index--], slot);
                        }
                        break;
                    default:
                        // error - can't derive ancestor
                        throw {
                            code: "S0217",
                            token: node.type,
                            position: node.position
                        };
                }
                return slot;
            };
    
            var pushAncestry = function(result, value) {
                if(typeof value.seekingParent !== 'undefined' || value.type === 'parent') {
                    var slots = (typeof value.seekingParent !== 'undefined') ? value.seekingParent : [];
                    if (value.type === 'parent') {
                        slots.push(value.slot);
                    }
                    if(typeof result.seekingParent === 'undefined') {
                        result.seekingParent = slots;
                    } else {
                        Array.prototype.push.apply(result.seekingParent, slots);
                    }
                }
            };
    
            var resolveAncestry = function(path) {
                var index = path.steps.length - 1;
                var laststep = path.steps[index];
                var slots = (typeof laststep.seekingParent !== 'undefined') ? laststep.seekingParent : [];
                if (laststep.type === 'parent') {
                    slots.push(laststep.slot);
                }
                for(var is = 0; is < slots.length; is++) {
                    var slot = slots[is];
                    index = path.steps.length - 2;
                    while (slot.level > 0) {
                        if (index < 0) {
                            if(typeof path.seekingParent === 'undefined') {
                                path.seekingParent = [slot];
                            } else {
                                path.seekingParent.push(slot);
                            }
                            break;
                        }
                        // try previous step
                        var step = path.steps[index--];
                        // multiple contiguous steps that bind the focus should be skipped
                        while(index >= 0 && step.focus && path.steps[index].focus) {
                            step = path.steps[index--];
                        }
                        slot = seekParent(step, slot);
                    }
                }
            };
    
            // post-parse stage
            // the purpose of this is to add as much semantic value to the parse tree as possible
            // in order to simplify the work of the evaluator.
            // This includes flattening the parts of the AST representing location paths,
            // converting them to arrays of steps which in turn may contain arrays of predicates.
            // following this, nodes containing '.' and '[' should be eliminated from the AST.
            var processAST = function (expr) {
                var result;
                switch (expr.type) {
                    case 'binary':
                        switch (expr.value) {
                            case '.':
                                var lstep = processAST(expr.lhs);
    
                                if (lstep.type === 'path') {
                                    result = lstep;
                                } else {
                                    result = {type: 'path', steps: [lstep]};
                                }
                                if(lstep.type === 'parent') {
                                    result.seekingParent = [lstep.slot];
                                }
                                var rest = processAST(expr.rhs);
                                if (rest.type === 'function' &&
                                    rest.procedure.type === 'path' &&
                                    rest.procedure.steps.length === 1 &&
                                    rest.procedure.steps[0].type === 'name' &&
                                    result.steps[result.steps.length - 1].type === 'function') {
                                    // next function in chain of functions - will override a thenable
                                    result.steps[result.steps.length - 1].nextFunction = rest.procedure.steps[0].value;
                                }
                                if (rest.type === 'path') {
                                    Array.prototype.push.apply(result.steps, rest.steps);
                                } else {
                                    if(typeof rest.predicate !== 'undefined') {
                                        rest.stages = rest.predicate;
                                        delete rest.predicate;
                                    }
                                    result.steps.push(rest);
                                }
                                // any steps within a path that are string literals, should be changed to 'name'
                                result.steps.filter(function (step) {
                                    if (step.type === 'number' || step.type === 'value') {
                                        // don't allow steps to be numbers or the values true/false/null
                                        throw {
                                            code: "S0213",
                                            stack: (new Error()).stack,
                                            position: step.position,
                                            value: step.value
                                        };
                                    }
                                    return step.type === 'string';
                                }).forEach(function (lit) {
                                    lit.type = 'name';
                                });
                                // any step that signals keeping a singleton array, should be flagged on the path
                                if (result.steps.filter(function (step) {
                                    return step.keepArray === true;
                                }).length > 0) {
                                    result.keepSingletonArray = true;
                                }
                                // if first step is a path constructor, flag it for special handling
                                var firststep = result.steps[0];
                                if (firststep.type === 'unary' && firststep.value === '[') {
                                    firststep.consarray = true;
                                }
                                // if the last step is an array constructor, flag it so it doesn't flatten
                                var laststep = result.steps[result.steps.length - 1];
                                if (laststep.type === 'unary' && laststep.value === '[') {
                                    laststep.consarray = true;
                                }
                                resolveAncestry(result);
                                break;
                            case '[':
                                // predicated step
                                // LHS is a step or a predicated step
                                // RHS is the predicate expr
                                result = processAST(expr.lhs);
                                var step = result;
                                var type = 'predicate';
                                if (result.type === 'path') {
                                    step = result.steps[result.steps.length - 1];
                                    type = 'stages';
                                }
                                if (typeof step.group !== 'undefined') {
                                    throw {
                                        code: "S0209",
                                        stack: (new Error()).stack,
                                        position: expr.position
                                    };
                                }
                                if (typeof step[type] === 'undefined') {
                                    step[type] = [];
                                }
                                var predicate = processAST(expr.rhs);
                                if(typeof predicate.seekingParent !== 'undefined') {
                                    predicate.seekingParent.forEach(slot => {
                                        if(slot.level === 1) {
                                            seekParent(step, slot);
                                        } else {
                                            slot.level--;
                                        }
                                    });
                                    pushAncestry(step, predicate);
                                }
                                step[type].push({type: 'filter', expr: predicate, position: expr.position});
                                break;
                            case '{':
                                // group-by
                                // LHS is a step or a predicated step
                                // RHS is the object constructor expr
                                result = processAST(expr.lhs);
                                if (typeof result.group !== 'undefined') {
                                    throw {
                                        code: "S0210",
                                        stack: (new Error()).stack,
                                        position: expr.position
                                    };
                                }
                                // object constructor - process each pair
                                result.group = {
                                    lhs: expr.rhs.map(function (pair) {
                                        return [processAST(pair[0]), processAST(pair[1])];
                                    }),
                                    position: expr.position
                                };
                                break;
                            case '^':
                                // order-by
                                // LHS is the array to be ordered
                                // RHS defines the terms
                                result = processAST(expr.lhs);
                                if (result.type !== 'path') {
                                    result = {type: 'path', steps: [result]};
                                }
                                var sortStep = {type: 'sort', position: expr.position};
                                sortStep.terms = expr.rhs.map(function (terms) {
                                    var expression = processAST(terms.expression);
                                    pushAncestry(sortStep, expression);
                                    return {
                                        descending: terms.descending,
                                        expression: expression
                                    };
                                });
                                result.steps.push(sortStep);
                                resolveAncestry(result);
                                break;
                            case ':=':
                                result = {type: 'bind', value: expr.value, position: expr.position};
                                result.lhs = processAST(expr.lhs);
                                result.rhs = processAST(expr.rhs);
                                pushAncestry(result, result.rhs);
                                break;
                            case '@':
                                result = processAST(expr.lhs);
                                step = result;
                                if (result.type === 'path') {
                                    step = result.steps[result.steps.length - 1];
                                }
                                // throw error if there are any predicates defined at this point
                                // at this point the only type of stages can be predicates
                                if(typeof step.stages !== 'undefined' || typeof step.predicate !== 'undefined') {
                                    throw {
                                        code: "S0215",
                                        stack: (new Error()).stack,
                                        position: expr.position
                                    };
                                }
                                // also throw if this is applied after an 'order-by' clause
                                if(step.type === 'sort') {
                                    throw {
                                        code: "S0216",
                                        stack: (new Error()).stack,
                                        position: expr.position
                                    };
                                }
                                if(expr.keepArray) {
                                    step.keepArray = true;
                                }
                                step.focus = expr.rhs.value;
                                step.tuple = true;
                                break;
                            case '#':
                                result = processAST(expr.lhs);
                                step = result;
                                if (result.type === 'path') {
                                    step = result.steps[result.steps.length - 1];
                                } else {
                                    result = {type: 'path', steps: [result]};
                                    if (typeof step.predicate !== 'undefined') {
                                        step.stages = step.predicate;
                                        delete step.predicate;
                                    }
                                }
                                if (typeof step.stages === 'undefined') {
                                    step.index = expr.rhs.value;
                                } else {
                                    step.stages.push({type: 'index', value: expr.rhs.value, position: expr.position});
                                }
                                step.tuple = true;
                                break;
                            case '~>':
                                result = {type: 'apply', value: expr.value, position: expr.position};
                                result.lhs = processAST(expr.lhs);
                                result.rhs = processAST(expr.rhs);
                                break;
                            default:
                                result = {type: expr.type, value: expr.value, position: expr.position};
                                result.lhs = processAST(expr.lhs);
                                result.rhs = processAST(expr.rhs);
                                pushAncestry(result, result.lhs);
                                pushAncestry(result, result.rhs);
                        }
                        break;
                    case 'unary':
                        result = {type: expr.type, value: expr.value, position: expr.position};
                        if (expr.value === '[') {
                            // array constructor - process each item
                            result.expressions = expr.expressions.map(function (item) {
                                var value = processAST(item);
                                pushAncestry(result, value);
                                return value;
                            });
                        } else if (expr.value === '{') {
                            // object constructor - process each pair
                            result.lhs = expr.lhs.map(function (pair) {
                                var key = processAST(pair[0]);
                                pushAncestry(result, key);
                                var value = processAST(pair[1]);
                                pushAncestry(result, value);
                                return [key, value];
                            });
                        } else {
                            // all other unary expressions - just process the expression
                            result.expression = processAST(expr.expression);
                            // if unary minus on a number, then pre-process
                            if (expr.value === '-' && result.expression.type === 'number') {
                                result = result.expression;
                                result.value = -result.value;
                            } else {
                                pushAncestry(result, result.expression);
                            }
                        }
                        break;
                    case 'function':
                    case 'partial':
                        result = {type: expr.type, name: expr.name, value: expr.value, position: expr.position};
                        result.arguments = expr.arguments.map(function (arg) {
                            var argAST = processAST(arg);
                            pushAncestry(result, argAST);
                            return argAST;
                        });
                        result.procedure = processAST(expr.procedure);
                        break;
                    case 'lambda':
                        result = {
                            type: expr.type,
                            arguments: expr.arguments,
                            signature: expr.signature,
                            position: expr.position
                        };
                        var body = processAST(expr.body);
                        result.body = tailCallOptimize(body);
                        break;
                    case 'condition':
                        result = {type: expr.type, position: expr.position};
                        result.condition = processAST(expr.condition);
                        pushAncestry(result, result.condition);
                        result.then = processAST(expr.then);
                        pushAncestry(result, result.then);
                        if (typeof expr.else !== 'undefined') {
                            result.else = processAST(expr.else);
                            pushAncestry(result, result.else);
                        }
                        break;
                    case 'transform':
                        result = {type: expr.type, position: expr.position};
                        result.pattern = processAST(expr.pattern);
                        result.update = processAST(expr.update);
                        if (typeof expr.delete !== 'undefined') {
                            result.delete = processAST(expr.delete);
                        }
                        break;
                    case 'block':
                        result = {type: expr.type, position: expr.position};
                        // array of expressions - process each one
                        result.expressions = expr.expressions.map(function (item) {
                            var part = processAST(item);
                            pushAncestry(result, part);
                            if (part.consarray || (part.type === 'path' && part.steps[0].consarray)) {
                                result.consarray = true;
                            }
                            return part;
                        });
                        // TODO scan the array of expressions to see if any of them assign variables
                        // if so, need to mark the block as one that needs to create a new frame
                        break;
                    case 'name':
                        result = {type: 'path', steps: [expr]};
                        if (expr.keepArray) {
                            result.keepSingletonArray = true;
                        }
                        break;
                    case 'parent':
                        result = {type: 'parent', slot: { label: '!' + ancestorLabel++, level: 1, index: ancestorIndex++ } };
                        ancestry.push(result);
                        break;
                    case 'string':
                    case 'number':
                    case 'value':
                    case 'wildcard':
                    case 'descendant':
                    case 'variable':
                    case 'regex':
                        result = expr;
                        break;
                    case 'operator':
                        // the tokens 'and' and 'or' might have been used as a name rather than an operator
                        if (expr.value === 'and' || expr.value === 'or' || expr.value === 'in') {
                            expr.type = 'name';
                            result = processAST(expr);
                        } else /* istanbul ignore else */ if (expr.value === '?') {
                            // partial application
                            result = expr;
                        } else {
                            throw {
                                code: "S0201",
                                stack: (new Error()).stack,
                                position: expr.position,
                                token: expr.value
                            };
                        }
                        break;
                    case 'error':
                        result = expr;
                        if (expr.lhs) {
                            result = processAST(expr.lhs);
                        }
                        break;
                    default:
                        var code = "S0206";
                        /* istanbul ignore else */
                        if (expr.id === '(end)') {
                            code = "S0207";
                        }
                        var err = {
                            code: code,
                            position: expr.position,
                            token: expr.value
                        };
                        if (recover) {
                            errors.push(err);
                            return {type: 'error', error: err};
                        } else {
                            err.stack = (new Error()).stack;
                            throw err;
                        }
                }
                if (expr.keepArray) {
                    result.keepArray = true;
                }
                return result;
            };
    
            // now invoke the tokenizer and the parser and return the syntax tree
            lexer = tokenizer(source);
            advance();
            // parse the tokens
            var expr = expression(0);
            if (node.id !== '(end)') {
                var err = {
                    code: "S0201",
                    position: node.position,
                    token: node.value
                };
                handleError(err);
            }
            expr = processAST(expr);
    
            if(expr.type === 'parent' || typeof expr.seekingParent !== 'undefined') {
                // error - trying to derive ancestor at top level
                throw {
                    code: "S0217",
                    token: expr.type,
                    position: expr.position
                };
            }
    
            if (errors.length > 0) {
                expr.errors = errors;
            }
    
            return expr;
        };
    
        return parser;
    })();
    
    module.exports = parser;
    
    },{"./signature":5}],5:[function(require,module,exports){
    /**
     * © Copyright IBM Corp. 2016, 2018 All Rights Reserved
     *   Project name: JSONata
     *   This project is licensed under the MIT License, see LICENSE
     */
    
    var utils = require('./utils');
    
    const signature = (() => {
        'use strict';
    
        // A mapping between the function signature symbols and the full plural of the type
        // Expected to be used in error messages
        var arraySignatureMapping = {
            "a": "arrays",
            "b": "booleans",
            "f": "functions",
            "n": "numbers",
            "o": "objects",
            "s": "strings"
        };
    
        /**
         * Parses a function signature definition and returns a validation function
         * @param {string} signature - the signature between the <angle brackets>
         * @returns {Function} validation function
         */
        function parseSignature(signature) {
            // create a Regex that represents this signature and return a function that when invoked,
            // returns the validated (possibly fixed-up) arguments, or throws a validation error
            // step through the signature, one symbol at a time
            var position = 1;
            var params = [];
            var param = {};
            var prevParam = param;
            while (position < signature.length) {
                var symbol = signature.charAt(position);
                if (symbol === ':') {
                    // TODO figure out what to do with the return type
                    // ignore it for now
                    break;
                }
    
                var next = function () {
                    params.push(param);
                    prevParam = param;
                    param = {};
                };
    
                var findClosingBracket = function (str, start, openSymbol, closeSymbol) {
                    // returns the position of the closing symbol (e.g. bracket) in a string
                    // that balances the opening symbol at position start
                    var depth = 1;
                    var position = start;
                    while (position < str.length) {
                        position++;
                        symbol = str.charAt(position);
                        if (symbol === closeSymbol) {
                            depth--;
                            if (depth === 0) {
                                // we're done
                                break; // out of while loop
                            }
                        } else if (symbol === openSymbol) {
                            depth++;
                        }
                    }
                    return position;
                };
    
                switch (symbol) {
                    case 's': // string
                    case 'n': // number
                    case 'b': // boolean
                    case 'l': // not so sure about expecting null?
                    case 'o': // object
                        param.regex = '[' + symbol + 'm]';
                        param.type = symbol;
                        next();
                        break;
                    case 'a': // array
                        //  normally treat any value as singleton array
                        param.regex = '[asnblfom]';
                        param.type = symbol;
                        param.array = true;
                        next();
                        break;
                    case 'f': // function
                        param.regex = 'f';
                        param.type = symbol;
                        next();
                        break;
                    case 'j': // any JSON type
                        param.regex = '[asnblom]';
                        param.type = symbol;
                        next();
                        break;
                    case 'x': // any type
                        param.regex = '[asnblfom]';
                        param.type = symbol;
                        next();
                        break;
                    case '-': // use context if param not supplied
                        prevParam.context = true;
                        prevParam.contextRegex = new RegExp(prevParam.regex); // pre-compiled to test the context type at runtime
                        prevParam.regex += '?';
                        break;
                    case '?': // optional param
                    case '+': // one or more
                        prevParam.regex += symbol;
                        break;
                    case '(': // choice of types
                        // search forward for matching ')'
                        var endParen = findClosingBracket(signature, position, '(', ')');
                        var choice = signature.substring(position + 1, endParen);
                        if (choice.indexOf('<') === -1) {
                            // no parameterized types, simple regex
                            param.regex = '[' + choice + 'm]';
                        } else {
                            // TODO harder
                            throw {
                                code: "S0402",
                                stack: (new Error()).stack,
                                value: choice,
                                offset: position
                            };
                        }
                        param.type = '(' + choice + ')';
                        position = endParen;
                        next();
                        break;
                    case '<': // type parameter - can only be applied to 'a' and 'f'
                        if (prevParam.type === 'a' || prevParam.type === 'f') {
                            // search forward for matching '>'
                            var endPos = findClosingBracket(signature, position, '<', '>');
                            prevParam.subtype = signature.substring(position + 1, endPos);
                            position = endPos;
                        } else {
                            throw {
                                code: "S0401",
                                stack: (new Error()).stack,
                                value: prevParam.type,
                                offset: position
                            };
                        }
                        break;
                }
                position++;
            }
            var regexStr = '^' +
                params.map(function (param) {
                    return '(' + param.regex + ')';
                }).join('') +
                '$';
            var regex = new RegExp(regexStr);
            var getSymbol = function (value) {
                var symbol;
                if (utils.isFunction(value)) {
                    symbol = 'f';
                } else {
                    var type = typeof value;
                    switch (type) {
                        case 'string':
                            symbol = 's';
                            break;
                        case 'number':
                            symbol = 'n';
                            break;
                        case 'boolean':
                            symbol = 'b';
                            break;
                        case 'object':
                            if (value === null) {
                                symbol = 'l';
                            } else if (Array.isArray(value)) {
                                symbol = 'a';
                            } else {
                                symbol = 'o';
                            }
                            break;
                        case 'undefined':
                        default:
                            // any value can be undefined, but should be allowed to match
                            symbol = 'm'; // m for missing
                    }
                }
                return symbol;
            };
    
            var throwValidationError = function (badArgs, badSig) {
                // to figure out where this went wrong we need apply each component of the
                // regex to each argument until we get to the one that fails to match
                var partialPattern = '^';
                var goodTo = 0;
                for (var index = 0; index < params.length; index++) {
                    partialPattern += params[index].regex;
                    var match = badSig.match(partialPattern);
                    if (match === null) {
                        // failed here
                        throw {
                            code: "T0410",
                            stack: (new Error()).stack,
                            value: badArgs[goodTo],
                            index: goodTo + 1
                        };
                    }
                    goodTo = match[0].length;
                }
                // if it got this far, it's probably because of extraneous arguments (we
                // haven't added the trailing '$' in the regex yet.
                throw {
                    code: "T0410",
                    stack: (new Error()).stack,
                    value: badArgs[goodTo],
                    index: goodTo + 1
                };
            };
    
            return {
                definition: signature,
                validate: function (args, context) {
                    var suppliedSig = '';
                    args.forEach(function (arg) {
                        suppliedSig += getSymbol(arg);
                    });
                    var isValid = regex.exec(suppliedSig);
                    if (isValid) {
                        var validatedArgs = [];
                        var argIndex = 0;
                        params.forEach(function (param, index) {
                            var arg = args[argIndex];
                            var match = isValid[index + 1];
                            if (match === '') {
                                if (param.context && param.contextRegex) {
                                    // substitute context value for missing arg
                                    // first check that the context value is the right type
                                    var contextType = getSymbol(context);
                                    // test contextType against the regex for this arg (without the trailing ?)
                                    if (param.contextRegex.test(contextType)) {
                                        validatedArgs.push(context);
                                    } else {
                                        // context value not compatible with this argument
                                        throw {
                                            code: "T0411",
                                            stack: (new Error()).stack,
                                            value: context,
                                            index: argIndex + 1
                                        };
                                    }
                                } else {
                                    validatedArgs.push(arg);
                                    argIndex++;
                                }
                            } else {
                                // may have matched multiple args (if the regex ends with a '+'
                                // split into single tokens
                                match.split('').forEach(function (single) {
                                    if (param.type === 'a') {
                                        if (single === 'm') {
                                            // missing (undefined)
                                            arg = undefined;
                                        } else {
                                            arg = args[argIndex];
                                            var arrayOK = true;
                                            // is there type information on the contents of the array?
                                            if (typeof param.subtype !== 'undefined') {
                                                if (single !== 'a' && match !== param.subtype) {
                                                    arrayOK = false;
                                                } else if (single === 'a') {
                                                    if (arg.length > 0) {
                                                        var itemType = getSymbol(arg[0]);
                                                        if (itemType !== param.subtype.charAt(0)) { // TODO recurse further
                                                            arrayOK = false;
                                                        } else {
                                                            // make sure every item in the array is this type
                                                            var differentItems = arg.filter(function (val) {
                                                                return (getSymbol(val) !== itemType);
                                                            });
                                                            arrayOK = (differentItems.length === 0);
                                                        }
                                                    }
                                                }
                                            }
                                            if (!arrayOK) {
                                                throw {
                                                    code: "T0412",
                                                    stack: (new Error()).stack,
                                                    value: arg,
                                                    index: argIndex + 1,
                                                    type: arraySignatureMapping[param.subtype]
                                                };
                                            }
                                            // the function expects an array. If it's not one, make it so
                                            if (single !== 'a') {
                                                arg = [arg];
                                            }
                                        }
                                        validatedArgs.push(arg);
                                        argIndex++;
                                    } else {
                                        validatedArgs.push(arg);
                                        argIndex++;
                                    }
                                });
                            }
                        });
                        return validatedArgs;
                    }
                    throwValidationError(args, suppliedSig);
                }
            };
        }
    
        return parseSignature;
    })();
    
    module.exports = signature;
    
    },{"./utils":6}],6:[function(require,module,exports){
    /**
     * © Copyright IBM Corp. 2016, 2018 All Rights Reserved
     *   Project name: JSONata
     *   This project is licensed under the MIT License, see LICENSE
     */
    
    const utils = (() => {
        'use strict';
    
        /**
         * Check if value is a finite number
         * @param {float} n - number to evaluate
         * @returns {boolean} True if n is a finite number
         */
        function isNumeric(n) {
            var isNum = false;
            if(typeof n === 'number') {
                isNum = !isNaN(n);
                if (isNum && !isFinite(n)) {
                    throw {
                        code: "D1001",
                        value: n,
                        stack: (new Error()).stack
                    };
                }
            }
            return isNum;
        }
    
        /**
         * Returns true if the arg is an array of strings
         * @param {*} arg - the item to test
         * @returns {boolean} True if arg is an array of strings
         */
        function isArrayOfStrings(arg) {
            var result = false;
            /* istanbul ignore else */
            if(Array.isArray(arg)) {
                result = (arg.filter(function(item){return typeof item !== 'string';}).length === 0);
            }
            return result;
        }
    
        /**
         * Returns true if the arg is an array of numbers
         * @param {*} arg - the item to test
         * @returns {boolean} True if arg is an array of numbers
         */
        function isArrayOfNumbers(arg) {
            var result = false;
            if(Array.isArray(arg)) {
                result = (arg.filter(function(item){return !isNumeric(item);}).length === 0);
            }
            return result;
        }
    
        /**
         * Create an empty sequence to contain query results
         * @returns {Array} - empty sequence
         */
        function createSequence() {
            var sequence = [];
            sequence.sequence = true;
            if (arguments.length === 1) {
                sequence.push(arguments[0]);
            }
            return sequence;
        }
    
        /**
         * Tests if a value is a sequence
         * @param {*} value the value to test
         * @returns {boolean} true if it's a sequence
         */
        function isSequence(value) {
            return value.sequence === true && Array.isArray(value);
        }
    
        /**
         *
         * @param {Object} arg - expression to test
         * @returns {boolean} - true if it is a function (lambda or built-in)
         */
        function isFunction(arg) {
            return ((arg && (arg._jsonata_function === true || arg._jsonata_lambda === true)) || typeof arg === 'function');
        }
    
        /**
         * Returns the arity (number of arguments) of the function
         * @param {*} func - the function
         * @returns {*} - the arity
         */
        function getFunctionArity(func) {
            var arity = typeof func.arity === 'number' ? func.arity :
                typeof func.implementation === 'function' ? func.implementation.length :
                    typeof func.length === 'number' ? func.length : func.arguments.length;
            return arity;
        }
    
        /**
         * Tests whether arg is a lambda function
         * @param {*} arg - the value to test
         * @returns {boolean} - true if it is a lambda function
         */
        function isLambda(arg) {
            return arg && arg._jsonata_lambda === true;
        }
    
        // istanbul ignore next
        const iteratorSymbol = (typeof Symbol === "function" ? Symbol : {}).iterator || "@@iterator";
        // istanbul ignore next
        const asyncIteratorSymbol = (typeof Symbol === "function" ? Symbol : {}).asyncIterator || "@@asyncIterator";
    
        /**
         * @param {Object} arg - expression to test
         * @returns {boolean} - true if it is iterable or asyncIterable
         */
        function isIterable(arg) {
            return (
                typeof arg === 'object' &&
                arg !== null &&
                iteratorSymbol in arg &&
                'next' in arg &&
                typeof arg.next === 'function'
            );
        }
        /**
         * @param {Object} arg - expression to test
         * @returns {boolean} - true if it is iterable or asyncIterable
         */
        function isAsyncIterable(arg) {
            return (
                typeof arg === 'object' &&
                arg !== null &&
                asyncIteratorSymbol in arg &&
                'next' in arg &&
                typeof arg.next === 'function'
            );
        }
    
        /**
         * @param {Object} arg - expression to test
         * @returns {boolean} - true if it is a promise
         */
        function isPromise(arg) {
            return (
                typeof arg === 'object' &&
                arg !== null &&
                'then' in arg &&
                typeof arg.then === 'function'
            );
        }
    
        /**
         * Compares two values for equality
         * @param {*} lhs first value
         * @param {*} rhs second value
         * @returns {boolean} true if they are deep equal
         */
        function isDeepEqual(lhs, rhs) {
            if (lhs === rhs) {
                return true;
            }
            if(typeof lhs === 'object' && typeof rhs === 'object' && lhs !== null && rhs !== null) {
                if(Array.isArray(lhs) && Array.isArray(rhs)) {
                    // both arrays (or sequences)
                    // must be the same length
                    if(lhs.length !== rhs.length) {
                        return false;
                    }
                    // must contain same values in same order
                    for(var ii = 0; ii < lhs.length; ii++) {
                        if(!isDeepEqual(lhs[ii], rhs[ii])) {
                            return false;
                        }
                    }
                    return true;
                }
                // both objects
                // must have the same set of keys (in any order)
                var lkeys = Object.getOwnPropertyNames(lhs);
                var rkeys = Object.getOwnPropertyNames(rhs);
                if(lkeys.length !== rkeys.length) {
                    return false;
                }
                lkeys = lkeys.sort();
                rkeys = rkeys.sort();
                for(ii=0; ii < lkeys.length; ii++) {
                    if(lkeys[ii] !== rkeys[ii]) {
                        return false;
                    }
                }
                // must have the same values
                for(ii=0; ii < lkeys.length; ii++) {
                    var key = lkeys[ii];
                    if(!isDeepEqual(lhs[key], rhs[key])) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
    
        /**
         * converts a string to an array of characters
         * @param {string} str - the input string
         * @returns {Array} - the array of characters
         */
        function stringToArray(str) {
            var arr = [];
            for (let char of str) {
                arr.push(char);
            }
            return arr;
        }
    
        return {
            isNumeric,
            isArrayOfStrings,
            isArrayOfNumbers,
            createSequence,
            isSequence,
            isFunction,
            isLambda,
            isIterable,
            isAsyncIterable,
            isPromise,
            getFunctionArity,
            isDeepEqual,
            stringToArray
        };
    })();
    
    module.exports = utils;
    
    },{}]},{},[3])(3)
    });