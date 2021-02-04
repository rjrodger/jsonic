"use strict";
/* Copyright (c) 2013-2021 Richard Rodger, MIT License */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Multifile = void 0;
// TODO: use prev code
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jsonic_1 = require("../jsonic");
const json_1 = require("./json");
const csv_1 = require("./csv");
let DEFAULTS = {
    markchar: '@',
    basepath: '.',
};
let Multifile = function multifile(jsonic) {
    let popts = jsonic_1.util.deep({}, DEFAULTS, jsonic.options.plugin.multifile);
    let markchar = popts.markchar;
    let tn = '#T<' + markchar + '>';
    jsonic.options({
        token: {
            [tn]: { c: markchar }
        }
    });
    // These inherit previous plugins - they are not clean new instances.
    let json = jsonic.make().use(json_1.Json, jsonic.options.plugin.json || {});
    let csv = jsonic.make().use(csv_1.Csv, jsonic.options.plugin.csv || {});
    let ST = jsonic.token.ST;
    let TX = jsonic.token.TX;
    let AT = jsonic.token(tn);
    jsonic.rule('val', (rs) => {
        rs.def.open.push({ s: [AT, ST] }, { s: [AT, TX] });
        let bc = rs.def.before_close;
        rs.def.before_close = (rule, ctx) => {
            if (rule.open[0] && AT === rule.open[0].pin) {
                // TODO: text TX=foo/bar as @"foo/bar" works but @foo/bar does not!
                let filepath = rule.open[1].val;
                let fullpath = path_1.default.resolve(ctx.meta.basepath || popts.basepath, filepath);
                let filedesc = path_1.default.parse(fullpath);
                let basepath = filedesc.dir;
                let file_ext = filedesc.ext.toLowerCase();
                let val;
                if ('.js' === file_ext) {
                    val = require(fullpath);
                    if ('function' === typeof val) {
                        val = val({ fullpath, filepath, rule, ctx });
                    }
                }
                // Manually load file contents
                else {
                    let partial_ctx = {
                        root: ctx.root
                    };
                    let content = fs_1.default.readFileSync(fullpath).toString();
                    if ('.json' === file_ext) {
                        val = json(content, { mode: 'json', fileName: fullpath }, partial_ctx);
                    }
                    else if ('.jsonic' === file_ext) {
                        // TODO: need a way to init root node so refs work!
                        val = jsonic(content, { basepath: basepath, fileName: fullpath }, partial_ctx);
                    }
                    else if ('.csv' === file_ext) {
                        val = csv(content, {}, partial_ctx);
                    }
                }
                rule.open[0].val = val;
            }
            return bc(rule, ctx);
        };
        return rs;
    });
};
exports.Multifile = Multifile;
//# sourceMappingURL=multifile.js.map