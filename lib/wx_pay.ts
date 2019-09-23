let queryString = require('querystring');
let crypto = require('crypto');
let request = require('request');
let xml2jsparseString = require('xml2js').parseString;
// 引入项目的配置信息
import {config} from '../lib/config';

// wechat 支付类
export class WechatPay {

    constructor() {

    }

    /**
     * 获取微信统一下单参数
     */
    getUnifiedorderXmlParams(obj) {
        let body = '<xml> ' +
            '<appid>' + config.wxappid + '</appid> ' +
            '<attach>' + obj.attach + '</attach> ' +
            '<body>' + obj.body + '</body> ' +
            '<mch_id>' + config.mch_id + '</mch_id> ' +
            '<nonce_str>' + obj.nonce_str + '</nonce_str> ' +
            '<notify_url>' + obj.notify_url + '</notify_url>' +
            '<openid>' + obj.openid + '</openid> ' +
            '<out_trade_no>' + obj.out_trade_no + '</out_trade_no>' +
            '<spbill_create_ip>' + obj.spbill_create_ip + '</spbill_create_ip> ' +
            '<total_fee>' + obj.total_fee + '</total_fee> ' +
            '<trade_type>' + obj.trade_type + '</trade_type> ' +
            '<sign>' + obj.sign + '</sign> ' +
            '</xml>';
// console.log(body);
        return body;
    }

    /**
     * 获取微信统一下单的接口数据
     */
    getPrepayId(obj) {
        let that = this;
        // 生成统一下单接口参数
        let UnifiedorderParams = {
            appid: config.wxappid,
            attach: obj.attach,
            body: obj.body,
            mch_id: config.mch_id,
            nonce_str: this.createNonceStr(),
            notify_url: obj.notify_url,// 微信付款后的回调地址
            openid: obj.openid,  //改
            out_trade_no: obj.out_trade_no,//new Date().getTime(), //订单号
            spbill_create_ip: obj.spbill_create_ip,
            total_fee: obj.total_fee * 100,
            trade_type: 'JSAPI',
            // sign : getSign(),
        };
        // 返回 promise 对象
        return new Promise(function (resolve, reject) {
            // 获取 sign 参数
            UnifiedorderParams['sign'] = that.getSign(UnifiedorderParams);
            // console.log(UnifiedorderParams);
            let url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
            request.post({
                url: url,
                body: JSON.stringify(that.getUnifiedorderXmlParams(UnifiedorderParams))
            }, function (error, response, body) {
                // console.log(response.statusCode, body);
                let prepay_id = '';
                // console.log(!error && response.statusCode == 200);
                if (!error && response.statusCode == 200) {
                    // 微信返回的数据为 xml 格式， 需要装换为 json 数据， 便于使用
                    xml2jsparseString(body, {async: true}, function (error, result) {
                        prepay_id = result.xml.prepay_id[0];
                        // console.log(prepay_id);
                        // 放回数组的第一个元素
                        resolve(prepay_id);
                    });
                } else {
                    reject(body);
                }
            });
        })
    }

    /**
     * 获取微信支付的签名
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
        })
        let string = queryString.stringify(newArgs) + '&key=' + config.wxpaykey;
        // 生成签名
        return crypto.createHash('md5').update(queryString.unescape(string), 'utf8').digest("hex").toUpperCase();
    }

    /**
     * 微信支付的所有参数
     * @param req 请求的资源, 获取必要的数据
     * @returns {{appId: string, timeStamp: Number, nonceStr: *, package: string, signType: string, paySign: *}}
     */
    getBrandWCPayParams(obj, callback) {
        let that = this;
        let prepay_id_promise = that.getPrepayId(obj);
        prepay_id_promise.then(function (prepay_id) {
            // console.log(prepay_id);
            let wcPayParams = {
                "appId": config.wxappid,     //公众号名称，由商户传入
                "timeStamp": new Date().getTime() / 1000 + '',         //时间戳，自1970年以来的秒数
                "nonceStr": that.createNonceStr(), //随机串
                // 通过统一下单接口获取
                "package": "prepay_id=" + prepay_id,
                "signType": "MD5",         //微信签名方式：
            };

            wcPayParams['paySign'] = that.getSign(wcPayParams); //微信支付签名

            callback(null, wcPayParams);
        }, function (error) {
            callback(error);
        });
    }

    /**
     * 获取随机的NonceStr
     */
    createNonceStr() {
        return Math.random().toString(36).substr(2, 15);
    };

    //获取微信的 AccessToken openid
    getAccessToken(code, cb) {
        let getAccessTokenUrl = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + config.wxappid + "&secret=" + config.wxappsecret + "&code=" + code + "&grant_type=authorization_code";
        request.post({url: getAccessTokenUrl}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (40029 == body.errcode) {
                    cb(error, body);
                } else {
                    body = JSON.parse(body);
                    cb(null, body);
                }
            } else {
                cb(error);
            }
        });
    }


    /**
     * 创建订单
     */
    createOrder(obj, cb) {
        this.getBrandWCPayParams(obj, function (error, responseData) {
            if (error) {
                cb(error);
            } else {

                cb(null, responseData);
            }
        });
    }
};
