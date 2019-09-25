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
// 公众号支付: 通过code获取openid返回客户端
app.get('/api/pay/wx_pay/getOpenId', function (req, res) {
    var code = req.query.code;
    var pay = new wx_pay_1.WechatPay();
    //openid
    pay.getAccessToken(code, function (err, data) {
        console.log(data);
        res.json(data);
    });
});
// 公众号支付: 创建公众号订单
app.get('/api/pay/wx_pay/order', function (req, res) {
    var openid = req.query.openid;
    var attach = req.query.attach;
    var body = req.query.body;
    var total_fee = req.query.total_fee;
    var out_trade_no = req.query.out_trade_no;
    var pay = new wx_pay_1.WechatPay();
    pay.createOrder({
        openid: openid,
        notify_url: 'http://beimi.welcometo5g.cn/api/pay/wx_pay/notifyUrl',
        out_trade_no: out_trade_no || new Date().getTime(),
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
// 公众号支付: 公众号订单回调
app.post('/api/pay/wx_pay/notifyUrl', function (req, res) {
    var notifyObj = req.body.xml;
    console.log(notifyObj);
    if (notifyObj.result_code[0] == 'SUCCESS') {
        var xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[OK]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
    else if (notifyObj.result_code[0] == 'FAIL') {
        var xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[FAIL]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
});
// 公众号支付: 订单查询
app.get('/api/pay/wx_pay/public/orderQuery', function (req, res) {
    var out_trade_no = req.query.out_trade_no;
    var pay = new wx_pay_1.WechatPay();
    pay.orderQuery({ out_trade_no: out_trade_no }).then(function (data) {
        // console.log(data);
        if (data['return_code'][0] == 'FAIL') {
            res.json({
                code: 1001,
                status: 'FAIL',
                msg: data['return_msg'][0]
            });
        }
        else {
            var result_code = data['result_code'][0];
            if (result_code == 'SUCCESS') {
                // 订单存在
                var trade_state = data['trade_state'][0];
                if (trade_state == 'SUCCESS') {
                    // 交易成功
                    res.json({
                        code: 200,
                        status: 'SUCCESS',
                        msg: data['trade_state_desc'][0],
                        data: {
                            transaction_id: data['transaction_id'][0],
                            out_trade_no: data['out_trade_no'][0],
                            time_end: data['time_end'][0]
                        }
                    });
                }
                else {
                    // 交易失败
                    var trade_state_desc = data['trade_state_desc'][0];
                    res.json({
                        code: 1001,
                        status: 'FAIL',
                        msg: trade_state_desc
                    });
                }
            }
            else if (result_code == 'FAIL') {
                // 订单不存在
                var err_code_des = data['err_code_des'][0];
                res.json({
                    code: 1000,
                    status: result_code,
                    msg: err_code_des
                });
            }
        }
    }, function (error) {
        console.log(error);
    });
});
/*----------------------------------华丽的分隔线--------------------------------------*/
// 二维码支付：生成二维码链接
app.get('/api/pay/wx_pay/create_scanQR', function (req, res) {
    var pay = new wx_pay_scan_qr_1.Wx_pay_scan_qr();
    var spbill_create_ip = req.connection.remoteAddress.replace(/::ffff:/, '');
    var attach = req.query.attach || 'test';
    var body = req.query.body || 'ddd';
    var out_trade_no = req.query.out_trade_no || new Date().getTime();
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
// 二维码支付：扫码支付成功后回调
app.post('/api/pay/wx_pay/scanQR/notifyUrl', function (req, res) {
    var notifyObj = req.body.xml;
    console.log(notifyObj);
    if (notifyObj.result_code[0] == 'SUCCESS') {
        var xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[OK]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
    else if (notifyObj.result_code[0] == 'FAIL') {
        var xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[FAIL]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
});
// 二维码支付: 订单查询
app.get('/api/pay/wx_pay/scanQR/orderQuery', function (req, res) {
    var out_trade_no = req.query.out_trade_no;
    var pay = new wx_pay_scan_qr_1.Wx_pay_scan_qr();
    pay.orderQuery({ out_trade_no: out_trade_no }).then(function (data) {
        // console.log(data);
        if (data['return_code'][0] == 'FAIL') {
            res.json({
                code: 1001,
                status: 'FAIL',
                msg: data['return_msg'][0]
            });
        }
        else {
            var result_code = data['result_code'][0];
            if (result_code == 'SUCCESS') {
                // 订单存在
                var trade_state = data['trade_state'][0];
                if (trade_state == 'SUCCESS') {
                    // 交易成功
                    res.json({
                        code: 200,
                        status: 'SUCCESS',
                        msg: data['trade_state_desc'][0],
                        data: {
                            transaction_id: data['transaction_id'][0],
                            out_trade_no: data['out_trade_no'][0],
                            time_end: data['time_end'][0]
                        }
                    });
                }
                else {
                    // 交易失败
                    var trade_state_desc = data['trade_state_desc'][0];
                    res.json({
                        code: 1001,
                        status: 'FAIL',
                        msg: trade_state_desc
                    });
                }
            }
            else if (result_code == 'FAIL') {
                // 订单不存在
                var err_code_des = data['err_code_des'][0];
                res.json({
                    code: 1000,
                    status: result_code,
                    msg: err_code_des
                });
            }
        }
    }, function (error) {
        console.log(error);
    });
});
/*----------------------------------华丽的分隔线--------------------------------------*/
// h5支付：创建支付订单
app.get('/api/pay/wx_pay/create_h5_pay', function (req, res) {
    var pay = new wx_pay_h5_1.Wx_pay_h5();
    var spbill_create_ip = req.connection.remoteAddress.replace(/::ffff:/, '');
    var attach = req.query.attach;
    var body = req.query.body;
    var out_trade_no = req.query.out_trade_no;
    var total_fee = req.query.total_fee;
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
// h5支付： 支付成功回调
app.post('/api/pay/wx_pay/h5pay/notifyUrl', function (req, res) {
    var notifyObj = req.body.xml;
    // console.log('h5 notify：');
    // console.log(notifyObj);
    if (notifyObj.return_code[0] == 'SUCCESS') {
        var xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[OK]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
    else if (notifyObj.return_code[0] == 'FAIL') {
        var xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[FAIL]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
});
// h5支付： 订单查询
app.get('/api/pay/wx_pay/orderQuery', function (req, res) {
    var out_trade_no = req.query.out_trade_no;
    var pay = new wx_pay_h5_1.Wx_pay_h5();
    pay.orderQuery({ out_trade_no: out_trade_no }).then(function (data) {
        console.log('order query：');
        console.log(data);
        if (data['return_code'][0] == 'FAIL') {
            res.json({
                code: 1001,
                status: 'FAIL',
                msg: data['return_msg'][0]
            });
        }
        else {
            var result_code = data['result_code'][0];
            if (result_code == 'SUCCESS') {
                // 订单存在
                var trade_state = data['trade_state'][0];
                if (trade_state == 'SUCCESS') {
                    // 交易成功
                    res.json({
                        code: 200,
                        status: 'SUCCESS',
                        msg: data['trade_state_desc'][0],
                        data: {
                            transaction_id: data['transaction_id'][0],
                            out_trade_no: data['out_trade_no'][0],
                            time_end: data['time_end'][0]
                        }
                    });
                }
                else {
                    // 交易失败
                    var trade_state_desc = data['trade_state_desc'][0];
                    res.json({
                        code: 1001,
                        status: 'FAIL',
                        msg: trade_state_desc
                    });
                }
            }
            else if (result_code == 'FAIL') {
                // 订单不存在
                var err_code_des = data['err_code_des'][0];
                res.json({
                    code: 1000,
                    status: result_code,
                    msg: err_code_des
                });
            }
        }
    }, function (error) {
        console.log(error);
    });
});
app.listen(5271, function () {
    console.log('api is running at http://localhost:5271');
});
