//引入统一下单的api
import {WechatPay} from './lib/wx_pay';
import {Wx_pay_scan_qr} from './lib/wx_pay_scan_qr';
import {Wx_pay_h5} from "./lib/wx_pay_h5";
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as xmlparser from 'express-xml-bodyparser';

const qr_image = require("qr-image");
const app = express();

//xmlparser
app.use(xmlparser());
app.use(express.static('./public'));
//使用中间件body-parser获取post参数
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//router
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// 公众号支付: 通过code获取openid返回客户端
app.get('/api/pay/wx_pay/getOpenId', function (req, res) {
    let code = req.query.code;
    let pay = new WechatPay();
    //openid
    pay.getAccessToken(code, function (err, data) {
        console.log(data);
        res.json(data);
    })
});
// 公众号支付: 创建公众号订单
app.get('/api/pay/wx_pay/order', function (req, res) {
    let openid = req.query.openid;
    let attach = req.query.attach;
    let body = req.query.body;
    let total_fee = req.query.total_fee;
    let out_trade_no = req.query.out_trade_no;
    let pay = new WechatPay();

    pay.createOrder({
        openid: openid,
        notify_url: 'http://beimi.welcometo5g.cn/api/pay/wx_pay/notifyUrl', //微信支付完成后的回调
        out_trade_no: out_trade_no || new Date().getTime(), //订单号
        attach: attach,
        body: body,
        total_fee: total_fee, // 此处的额度为分
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
    let notifyObj = req.body.xml;
    console.log(notifyObj);
    if (notifyObj.result_code[0] == 'SUCCESS') {
        let xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[OK]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    } else if (notifyObj.result_code[0] == 'FAIL') {
        let xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[FAIL]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
});
// 公众号支付: 订单查询
app.get('/api/pay/wx_pay/public/orderQuery', (req, res) => {
    let out_trade_no = req.query.out_trade_no;
    let pay = new WechatPay();
    pay.orderQuery({out_trade_no: out_trade_no}).then(data => {
        // console.log(data);
        let result_code = data['result_code'][0];
        if (result_code == 'SUCCESS') {
            // 订单存在
            let trade_state = data['trade_state'][0];
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
            } else {
                // 交易失败
                let trade_state_desc = data['trade_state_desc'][0];
                res.json({
                    code: 1001,
                    status: 'FAIL',
                    msg: trade_state_desc
                });
            }
        } else if (result_code == 'FAIL') {
            // 订单不存在
            let err_code_des = data['err_code_des'][0];
            res.json({
                code: 1000,
                status: result_code,
                msg: err_code_des
            });
        }
    }, error => {
        console.log(error);
    })
});

/*----------------------------------华丽的分隔线--------------------------------------*/

// 二维码支付：生成二维码链接
app.get('/api/pay/wx_pay/create_scanQR', (req, res) => {
    let pay = new Wx_pay_scan_qr();
    let spbill_create_ip = req.connection.remoteAddress.replace(/::ffff:/, '')

    let attach = req.query.attach || 'test';
    let body = req.query.body || 'ddd';
    let out_trade_no = req.query.out_trade_no || new Date().getTime();
    let total_fee = req.query.total_fee || 0.1;

    pay.createScanQR({
        attach: attach,
        body: body,
        out_trade_no: out_trade_no,
        total_fee: total_fee,
        spbill_create_ip: spbill_create_ip
    }).then(data => {
        let code = qr_image.image(data['code_url'], {type: 'png'});
        res.setHeader('Content-type', 'image/png'); //sent qr image to client side
        code.pipe(res);
    });
});
// 二维码支付：扫码支付成功后回调
app.post('/api/pay/wx_pay/scanQR/notifyUrl', function (req, res) {
    let notifyObj = req.body.xml;
    console.log(notifyObj);
    if (notifyObj.result_code[0] == 'SUCCESS') {
        let xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[OK]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    } else if (notifyObj.result_code[0] == 'FAIL') {
        let xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[FAIL]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
});
// 二维码支付: 订单查询
app.get('/api/pay/wx_pay/scanQR/orderQuery', (req, res) => {
    let out_trade_no = req.query.out_trade_no;
    let pay = new Wx_pay_scan_qr();
    pay.orderQuery({out_trade_no: out_trade_no}).then(data => {
        // console.log(data);
        let result_code = data['result_code'][0];
        if (result_code == 'SUCCESS') {
            // 订单存在
            let trade_state = data['trade_state'][0];
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
            } else {
                // 交易失败
                let trade_state_desc = data['trade_state_desc'][0];
                res.json({
                    code: 1001,
                    status: 'FAIL',
                    msg: trade_state_desc
                });
            }
        } else if (result_code == 'FAIL') {
            // 订单不存在
            let err_code_des = data['err_code_des'][0];
            res.json({
                code: 1000,
                status: result_code,
                msg: err_code_des
            });
        }
    }, error => {
        console.log(error);
    })
});

/*----------------------------------华丽的分隔线--------------------------------------*/

// h5支付：创建支付订单
app.get('/api/pay/wx_pay/create_h5_pay', (req, res) => {
    let pay = new Wx_pay_h5();
    let spbill_create_ip = req.connection.remoteAddress.replace(/::ffff:/, '')

    let attach = req.query.attach || 'test';
    let body = req.query.body || 'ddd';
    let out_trade_no = req.query.out_trade_no || new Date().getTime();
    let total_fee = req.query.total_fee || 0.1;

    pay.createH5Pay({
        attach: attach,
        body: body,
        out_trade_no: out_trade_no,
        total_fee: total_fee,
        spbill_create_ip: spbill_create_ip
    }).then(data => {
        res.json(data);
    });
});
// h5支付： 支付成功回调
app.post('/api/pay/wx_pay/h5pay/notifyUrl', function (req, res) {
    let notifyObj = req.body.xml;
    console.log('h5 notify：');
    console.log(notifyObj);
    if (notifyObj.result_code[0] == 'SUCCESS') {
        let xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[OK]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    } else if (notifyObj.result_code[0] == 'FAIL') {
        let xml = '<xml>';
        xml += '<return_code><![CDATA[SUCCESS]]></return_code>';
        xml += '<return_msg><![CDATA[FAIL]]></return_msg>';
        xml += '</xml>';
        res.send(xml);
    }
});
// h5支付： 订单查询
app.get('/api/pay/wx_pay/orderQuery', (req, res) => {
    let out_trade_no = req.query.out_trade_no;
    let pay = new Wx_pay_h5();
    pay.orderQuery({out_trade_no: out_trade_no}).then(data => {
        console.log('order query：');
        console.log(data);
        let result_code = data['result_code'][0];
        if (result_code == 'SUCCESS') {
            // 订单存在
            let trade_state = data['trade_state'][0];
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
            } else {
                // 交易失败
                let trade_state_desc = data['trade_state_desc'][0];
                res.json({
                    code: 1001,
                    status: 'FAIL',
                    msg: trade_state_desc
                });
            }
        } else if (result_code == 'FAIL') {
            // 订单不存在
            let err_code_des = data['err_code_des'][0];
            res.json({
                code: 1000,
                status: result_code,
                msg: err_code_des
            });
        }
    }, error => {
        console.log(error);
    })
});


app.listen(5271, function () {
    console.log('api is running at http://localhost:5271');
});
