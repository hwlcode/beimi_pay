"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("./config");
var queryString = require('querystring');
var crypto = require('crypto');
var request = require('request');
var xml2jsparseString = require('xml2js').parseString;
var notify_url = 'http://beimi.welcometo5g.cn/api/pay/wx_pay/scanQR/notifyUrl';
/**
 * 微信扫描支付类
 */
var Wx_pay_scan_qr = /** @class */ (function () {
    function Wx_pay_scan_qr() {
    }
    /**
     * 获取微信统一下单参数
     */
    Wx_pay_scan_qr.prototype.getUnifiedorderXmlParams = function (obj) {
        var body = '<xml> ';
        body += '<appid>' + config_1.config.wxappid + '</appid> '; // app id
        body += '<attach>' + obj.attach + '</attach> '; // 标题
        body += '<body>' + obj.body + '</body> '; // 描述
        body += '<mch_id>' + config_1.config.mch_id + '</mch_id> '; // 商户号
        body += '<nonce_str>' + obj.nonce_str + '</nonce_str> '; // 随机字符串
        body += '<time_stamp>' + obj.time_stamp + '</time_stamp> '; // 随机字符串
        body += '<notify_url>' + obj.notify_url + '</notify_url>'; // 回调通知地址:支付成功后微信服务器通过POST请求通知这个地址
        body += '<out_trade_no>' + obj.out_trade_no + '</out_trade_no>'; // 订单号
        body += '<spbill_create_ip>' + obj.spbill_create_ip + '</spbill_create_ip> '; // ip
        body += '<total_fee>' + obj.total_fee + '</total_fee> '; // 金额： 分
        body += '<trade_type>NATIVE</trade_type> '; // NATIVE会返回code_url ，JSAPI不会返回
        body += '<sign>' + obj.sign + '</sign> '; // 签名
        body += '</xml>';
        // console.log(body);
        return body;
    };
    /**
     * 创建二维码订单
     */
    Wx_pay_scan_qr.prototype.createScanQR = function (obj) {
        var that = this;
        var nonce_str = this.createNonceStr();
        var time_stamp = this.createNonceStr();
        var signParams = {
            appid: config_1.config.wxappid,
            attach: obj.attach,
            body: obj.body,
            mch_id: config_1.config.mch_id,
            nonce_str: nonce_str,
            time_stamp: time_stamp,
            notify_url: notify_url,
            out_trade_no: obj.out_trade_no,
            spbill_create_ip: obj.spbill_create_ip,
            total_fee: obj.total_fee * 100,
            trade_type: 'NATIVE',
        };
        signParams['sign'] = this.getSign(signParams);
        // console.log(signParams);
        // 返回 promise 对象
        return new Promise(function (resolve, reject) {
            var url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
            request.post({
                url: url,
                body: JSON.stringify(that.getUnifiedorderXmlParams(signParams))
            }, function (error, response, body) {
                // console.log(response.statusCode, body);
                var prepay_id = '';
                var code_url = '';
                if (!error && response.statusCode == 200) {
                    // 微信返回的数据为 xml 格式， 需要装换为 json 数据， 便于使用
                    xml2jsparseString(body, { async: true }, function (error, result) {
                        prepay_id = result.xml.prepay_id[0];
                        code_url = result.xml.code_url[0];
                        // 放回数组的第一个元素
                        resolve({ prepay_id: prepay_id, code_url: code_url });
                    });
                }
                else {
                    reject(body);
                }
            });
        });
    };
    /**
     * 查询订单参数
     */
    Wx_pay_scan_qr.prototype.getOrderQueryParams = function (obj) {
        var body = '<xml> ' +
            '<appid>' + config_1.config.wxappid + '</appid> ' +
            '<mch_id>' + config_1.config.mch_id + '</mch_id> ' +
            '<nonce_str>' + obj.nonce_str + '</nonce_str> ' +
            '<out_trade_no>' + obj.out_trade_no + '</out_trade_no>' +
            '<sign>' + obj.sign + '</sign> ' +
            '</xml>';
        // console.log(body);
        return body;
    };
    // 微信查询订单
    Wx_pay_scan_qr.prototype.orderQuery = function (obj) {
        var self = this;
        var nonce_str = this.createNonceStr();
        var signParams = {
            appid: config_1.config.wxappid,
            mch_id: config_1.config.mch_id,
            nonce_str: nonce_str,
            out_trade_no: obj.out_trade_no,
        };
        signParams['sign'] = this.getSign(signParams);
        return new Promise(function (resolve, reject) {
            var url = 'https://api.mch.weixin.qq.com/pay/orderquery';
            request.post({
                url: url,
                body: JSON.stringify(self.getOrderQueryParams(signParams))
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    xml2jsparseString(body, { async: true }, function (error, result) {
                        // console.log(result.xml);
                        resolve(result.xml);
                    });
                }
                else {
                    reject(body);
                }
            });
        });
    };
    /**
     * 工具方法：获取微信支付的签名
     */
    Wx_pay_scan_qr.prototype.getSign = function (signParams) {
        // 按 key 值的ascll 排序
        var keys = Object.keys(signParams);
        keys = keys.sort();
        var newArgs = {};
        keys.forEach(function (val, key) {
            if (signParams[val]) {
                newArgs[val] = signParams[val];
            }
        });
        var string = queryString.stringify(newArgs) + '&key=' + config_1.config.wxpaykey;
        // 生成签名
        return crypto.createHash('md5').update(queryString.unescape(string), 'utf8').digest("hex").toUpperCase();
    };
    /**
     * 工具方法：时间戳产生函数
     */
    Wx_pay_scan_qr.prototype.createTimeStamp = function () {
        return parseInt((new Date().getTime() / 1000).toString(), 10) + '';
    };
    /**
     * 工具方法：随机字符串产生函数
     * @returns {string}
     */
    Wx_pay_scan_qr.prototype.createNonceStr = function () {
        return Math.random().toString(36).substr(2, 15);
    };
    return Wx_pay_scan_qr;
}());
exports.Wx_pay_scan_qr = Wx_pay_scan_qr;
