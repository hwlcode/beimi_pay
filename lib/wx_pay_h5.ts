import {config} from "./config";

let queryString = require('querystring');
let crypto = require('crypto');
let request = require('request');
let xml2jsparseString = require('xml2js').parseString;
let notify_url = 'http://beimi.welcometo5g.cn/api/pay/wx_pay/h5pay/notifyUrl';

/**
 * 微信H5支付
 */
export class Wx_pay_h5 {

    constructor() {

    }

    /**
     * 获取微信统一下单参数
     */
    getUnifiedorderXmlParams(obj) {
        let body = '<xml> ';
        body += '<appid>' + config.wxappid + '</appid> ';  // app id
        body += '<attach>' + obj.attach + '</attach> ';    // 标题
        body += '<body>' + obj.body + '</body> ';          // 描述
        body += '<mch_id>' + config.mch_id + '</mch_id> ';  // 商户号
        body += '<nonce_str>' + obj.nonce_str + '</nonce_str> ';  // 随机字符串
        body += '<time_stamp>' + obj.time_stamp + '</time_stamp> ';  // 随机字符串
        body += '<notify_url>' + obj.notify_url + '</notify_url>';  // 回调通知地址:支付成功后微信服务器通过POST请求通知这个地址
        body += '<out_trade_no>' + obj.out_trade_no + '</out_trade_no>'; // 订单号
        body += '<spbill_create_ip>' + obj.spbill_create_ip + '</spbill_create_ip> ';  // ip
        body += '<total_fee>' + obj.total_fee + '</total_fee> '; // 金额： 分
        body += '<trade_type>MWEB</trade_type> ';  // MWEB会返回mweb_url:支付链接
        body += '<sign>' + obj.sign + '</sign> ';  // 签名
        body += '</xml>';

        // console.log(body);
        return body;
    }


    /**
     * 创建h5支付订单
     */
    createH5Pay(obj) {
        let that = this;
        const nonce_str = this.createNonceStr();
        const time_stamp = this.createNonceStr();

        const signParams = {
            appid: config.wxappid,
            attach: obj.attach,  // 传入
            body: obj.body,      // 传入
            mch_id: config.mch_id,
            nonce_str: nonce_str,
            time_stamp: time_stamp,
            notify_url: notify_url,
            out_trade_no: obj.out_trade_no,  // 传入
            spbill_create_ip: obj.spbill_create_ip,  // 传入
            total_fee: obj.total_fee * 100, // 传入
            trade_type: 'MWEB',
            // sign: sign
        };
        signParams['sign'] = this.getSign(signParams);
        // console.log(signParams);
        // 返回 promise 对象
        return new Promise(function (resolve, reject) {
            let url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
            request.post({
                url: url,
                body: JSON.stringify(that.getUnifiedorderXmlParams(signParams))
            }, function (error, response, body) {
                // console.log(response.statusCode, body);
                if (!error && response.statusCode == 200) {
                    // 微信返回的数据为 xml 格式， 需要装换为 json 数据， 便于使用
                    xml2jsparseString(body, {async: true}, function (error, result) {
                        console.log(result.xml);
                        // 放回数组的第一个元素
                        resolve(result.xml);
                    });
                } else {
                    reject(body);
                }
            });
        });
    }

    /**
     * 工具方法：获取微信支付的签名
     */
    getSign(signParams) {
        // 按 key 值的ascll 排序
        let keys = Object.keys(signParams);
        keys = keys.sort();
        let newArgs = {};
        keys.forEach(function (val, key) {
            if (signParams[val]) {
                newArgs[val] = signParams[val];
            }
        });
        let string = queryString.stringify(newArgs) + '&key=' + config.wxpaykey;
        // 生成签名
        return crypto.createHash('md5').update(queryString.unescape(string), 'utf8').digest("hex").toUpperCase();
    }

    /**
     * 工具方法：时间戳产生函数
     */
    createTimeStamp() {
        return parseInt((new Date().getTime() / 1000).toString(), 10) + '';
    }

    /**
     * 工具方法：随机字符串产生函数
     * @returns {string}
     */
    createNonceStr() {
        return Math.random().toString(36).substr(2, 15);
    }
}
