"use strict";
// import {config} from './lib/config';
// import {WechatAPI} from 'wechat-api';
Object.defineProperty(exports, "__esModule", { value: true });
//引入统一下单的api
var wx_pay_1 = require("./lib/wx_pay");
var express = require("express");
var bodyParser = require("body-parser");
var xmlparser = require("express-xml-bodyparser");
var config_1 = require("./lib/config");
// const api = new WechatAPI(config.wxappid, config.wxappsecret);
var app = express();
//xmlparser
app.use(xmlparser());
app.use(express.static('./public'));
//使用中间件body-parser获取post参数
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//router
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});
// 第一步：用户同意授权，获取code
app.get('/api/pay/wx_pay/wx_login', function (req, res) {
    // 这是编码后的地址
    var router = 'getOpenId';
    var return_uri = encodeURIComponent('http://beimi.welcometo5g.cn/api/pay/wx_pay/') + router;
    var scope = 'snsapi_userinfo';
    var oauthUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    var url = oauthUrl + '?appid=' + config_1.config.wxappid + '&redirect_uri=' + return_uri + '&response_type=code&scope=' + scope + '&state=STATE#wechat_redirect';
    res.redirect(url);
});
//获取openid返回客户端
app.get('/api/pay/wx_pay/order/getOpenId', function (req, res) {
    var code = req.query.code;
    var pay = new wx_pay_1.WechatPay();
    //openid
    pay.getAccessToken(code, function (err, data) {
        console.log(data);
        res.json(data);
    });
});
app.get('/api/pay/wx_pay/order', function (req, res) {
    var openid = req.query.openid;
    var pay = new wx_pay_1.WechatPay();
    pay.createOrder({
        openid: openid,
        notify_url: 'http://beimi.welcometo5g.cn/api/pay/wx_pay/notifyUrl',
        out_trade_no: new Date().getTime(),
        attach: '名称',
        body: '购买信息',
        total_fee: '0.1',
        spbill_create_ip: req.connection.remoteAddress.replace(/::ffff:/, ''),
    }, function (error, responseData) {
        if (error) {
            console.log(error);
        }
        res.json(responseData); /*签名字段*/
    });
});
app.get('/api/pay/wx_pay/notifyUrl', function (req, res) {
    var pay = new wx_pay_1.WechatPay();
    var notifyObj = req.body.xml;
    var signObj = {};
    for (var attr in notifyObj) {
        if (attr != 'sign') {
            signObj[attr] = notifyObj[attr][0];
        }
    }
    console.log(pay.getSign(signObj));
    console.log('--------------------------');
    console.log(req.body.xml.sign[0]);
});
app.listen(5271, function () {
    console.log('api is running at http://localhoust:5271');
});
