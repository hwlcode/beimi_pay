"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var bodyParser = require("body-parser");
var wx_pay_1 = require("./lib/wx_pay");
var app = express();
var wxPay = new wx_pay_1.WxPay();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.post('/api/pay/wx_pay/order', function (req, res) {
    var attach = req.body.attach; // 单标题
    var body = req.body.body; // 支付订单描述
    var out_trade_no = req.body.out_trade_no; // 订单号
    var total_fee = req.body.total_fee; // 价格
    wxPay.order(attach, body, out_trade_no, total_fee).then(function (json) {
        res.json({
            code: 0,
            data: json
        });
    });
});
app.get('/api/pay/wx_pay/notify', function (req, res) {
    res.json({
        code: 0,
        data: res
    });
});
//router
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});
if (process.env.NODE_ENV === 'production') {
    app.listen(8088, 'localhost', function () {
        console.log('app is running at pro http://localhost:8088');
    });
}
else {
    app.listen(5271, 'localhost', function () {
        console.log('app is running at dev http://localhost:5271');
    });
}
