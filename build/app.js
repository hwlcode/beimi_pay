"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//引入统一下单的api
var wx_pay_1 = require("./lib/wx_pay");
var wx_pay_scan_qr_1 = require("./lib/wx_pay_scan_qr");
var wx_pay_h5_1 = require("./lib/wx_pay_h5");
var express = require("express");
var bodyParser = require("body-parser");
var xmlparser = require("express-xml-bodyparser");
var qr_image = require("qr-image");
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
//获取openid返回客户端
app.get('/api/pay/wx_pay/getOpenId', function (req, res) {
    var code = req.query.code;
    var pay = new wx_pay_1.WechatPay();
    //openid
    pay.getAccessToken(code, function (err, data) {
        console.log(data);
        res.json(data);
    });
});
// 创建公众号订单
app.get('/api/pay/wx_pay/order', function (req, res) {
    var openid = req.query.openid;
    var attach = req.query.attach;
    var body = req.query.body;
    var total_fee = req.query.total_fee;
    var pay = new wx_pay_1.WechatPay();
    pay.createOrder({
        openid: openid,
        notify_url: 'http://beimi.welcometo5g.cn/api/pay/wx_pay/notifyUrl',
        out_trade_no: new Date().getTime(),
        attach: attach,
        body: body,
        total_fee: total_fee,
        spbill_create_ip: req.connection.remoteAddress.replace(/::ffff:/, ''),
    }, function (error, responseData) {
        if (error) {
            console.log(error);
        }
        console.log(responseData);
        res.json(responseData); /*签名字段*/
    });
});
// 公众号订单回调
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
// 生成二维码链接
app.get('/api/pay/wx_pay/create_scanQR', function (req, res) {
    var pay = new wx_pay_scan_qr_1.Wx_pay_scan_qr();
    var spbill_create_ip = req.connection.remoteAddress.replace(/::ffff:/, '');
    var attach = req.query.attach || 'test';
    var body = req.query.body || 'ddd';
    var out_trade_no = req.query.out_trade_no || '2222';
    var total_fee = req.query.total_fee || 0.1;
    pay.createScanQR({
        attach: attach,
        body: body,
        out_trade_no: out_trade_no,
        total_fee: total_fee,
        spbill_create_ip: spbill_create_ip
    }).then(function (data) {
        var code = qr_image.image(data['code_url'], { type: 'png' });
        res.setHeader('Content-type', 'image/png'); //sent qr image to client side
        code.pipe(res);
    });
});
// 扫码支付成功后回调
app.get('/api/pay/wx_pay/scanQR/notifyUrl', function (req, res) {
    // let pay = new WechatPay();
    //     // let notifyObj = req.body.xml;
    //     // let signObj = {};
    //     //
    //     // for (let attr in notifyObj) {
    //     //     if (attr != 'sign') {
    //     //         signObj[attr] = notifyObj[attr][0]
    //     //     }
    //     // }
    //     // console.log(pay.getSign(signObj));
    //     // console.log('--------------------------');
    //     // console.log(req.body.xml.sign[0]);
});
app.get('/api/pay/wx_pay/create_h5_pay', function (req, res) {
    var pay = new wx_pay_h5_1.Wx_pay_h5();
    var spbill_create_ip = req.connection.remoteAddress.replace(/::ffff:/, '');
    var attach = req.query.attach || 'test';
    var body = req.query.body || 'ddd';
    var out_trade_no = req.query.out_trade_no || '222201';
    var total_fee = req.query.total_fee || 0.1;
    pay.createH5Pay({
        attach: attach,
        body: body,
        out_trade_no: out_trade_no,
        total_fee: total_fee,
        spbill_create_ip: spbill_create_ip
    }).then(function (data) {
        res.json(data);
    });
});
app.get('/api/pay/wx_pay/h5pay/notifyUrl', function (req, res) {
    // let pay = new WechatPay();
    //     // let notifyObj = req.body.xml;
    //     // let signObj = {};
    //     //
    //     // for (let attr in notifyObj) {
    //     //     if (attr != 'sign') {
    //     //         signObj[attr] = notifyObj[attr][0]
    //     //     }
    //     // }
    //     // console.log(pay.getSign(signObj));
    //     // console.log('--------------------------');
    //     // console.log(req.body.xml.sign[0]);
});
app.listen(5271, function () {
    console.log('api is running at http://localhost:5271');
});
