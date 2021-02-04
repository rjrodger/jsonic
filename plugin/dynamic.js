"use strict";
/* Copyright (c) 2013-2020 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dynamic = void 0;
const jsonic_1 = require("../jsonic");
// TODO: markchar actually works - test!
// TODO: array elements
// TODO: plain values: $1, $true, etc
let Dynamic = function dynamic(jsonic) {
    let markchar = jsonic.options.plugin.dynamic.markchar || '$';
    let tn = '#T<' + markchar + '>';
    jsonic.options({
        token: {
            [tn]: { c: markchar }
        }
    });
    let T$ = jsonic.token(tn);
    let ST = jsonic.token.ST;
    let TX = jsonic.token.TX;
    jsonic.rule('val', (rs) => {
        // TODO: also values so that `$1`===1 will work
        rs.def.open.push({ s: [T$, ST] }, { s: [T$, TX] }, { s: [T$, T$], b: 2 });
        rs.def.close.unshift({ s: [T$], r: 'val' });
        // Special case: `$$`
        rs.def.after_open = (rule) => {
            if (rule.open[0] && rule.open[1] &&
                T$ === rule.open[0].pin &&
                T$ === rule.open[1].pin) {
                rule.open[1].use = rule;
                //console.log('DOUBLE$', rule.name + '/' + rule.id, rule.open)
            }
        };
        let bc = rs.def.before_close;
        rs.def.before_close = (rule, _ctx) => {
            if (rule.open[0] && rule.open[1]) {
                if (T$ === rule.open[0].pin && T$ !== rule.open[1].pin) {
                    // console.log('CHECK', rule.name + '/' + rule.id, rule.open)
                    let expr = (rule.open[0].use ? '$' : '') + rule.open[1].val;
                    //console.log('EXPR<', expr, '>')
                    if ('.' === expr[0]) {
                        expr = '$' + expr;
                    }
                    expr = 'null,' + expr;
                    //console.log('EXPR', expr)
                    let func = function ($, _, meta) {
                        return eval(expr);
                    };
                    func.__eval$$ = true;
                    rule.open[0].val = func;
                    if (rule.open[0].use) {
                        rule.open[0].use.node = func;
                    }
                }
            }
            return bc(rule);
        };
        return rs;
    });
    jsonic.rule('pair', (rs) => {
        let ST = jsonic.options.ST;
        let orig_before_close = rs.def.before_close;
        rs.def.before_close = (rule, ctx) => {
            let token = rule.open[0];
            if (token) {
                let key = ST === token.pin ? token.val : token.src;
                let val = rule.child.node;
                if ('function' === typeof (val) && val.__eval$$) {
                    Object.defineProperty(val, 'name', { value: key });
                    defineProperty(rule.node, key, val, ctx.root, ctx.meta, ctx.opts.object.extend);
                }
                else {
                    return orig_before_close(rule, ctx);
                }
            }
        };
        return rs;
    });
    jsonic.rule('elem', (rs) => {
        let orig_before_close = rs.def.before_close;
        rs.def.before_close = (rule, ctx) => {
            let val = rule.child.node;
            if ('function' === typeof (val) && val.__eval$$) {
                Object.defineProperty(val, 'name', { value: 'i' + rule.node.length });
                defineProperty(rule.node, rule.node.length, val, ctx.root, ctx.meta, ctx.opts.object.extend);
            }
            else {
                return orig_before_close(rule, ctx);
            }
        };
        return rs;
    });
};
exports.Dynamic = Dynamic;
function defineProperty(node, key, valfn, root, meta, extend) {
    let over;
    let prev = node[key];
    //console.log('defP', node, key, valfn, root(), meta, prev)
    Object.defineProperty(node, key, {
        enumerable: true,
        // TODO: proper JsonicError when this fails
        get() {
            //console.log('defP-get', node, key, valfn, root(), meta, prev)
            let $ = root();
            let out = null == $ ? null : valfn($, node, meta);
            out = null == prev ? out :
                (extend ? jsonic_1.util.deep({}, prev, out) : out);
            if (null != over) {
                out = jsonic_1.util.deep({}, out, over);
            }
            return out;
        },
        set(val) {
            over = val;
        }
    });
}
//# sourceMappingURL=dynamic.js.map