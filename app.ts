// import {config} from './lib/config';
// import {WechatAPI} from 'wechat-api';

//引入统一下单的api
import {WechatPay} from './lib/wx_pay';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as xmlparser from 'express-xml-bodyparser';
import {config} from "./lib/config";

// const api = new WechatAPI(config.wxappid, config.wxappsecret);

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

// 第一步：用户同意授权，获取code
app.get('/api/pay/wx_pay/wx_login', (req, res) => {
    // 这是编码后的地址
    let router = 'getOpenId';
    let return_uri = encodeURIComponent('http://beimi.welcometo5g.cn/api/pay/wx_pay/') + router;
    let scope = 'snsapi_userinfo';
    let oauthUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    let url = oauthUrl + '?appid=' + config.wxappid + '&redirect_uri=' + return_uri + '&response_type=code&scope=' + scope + '&state=STATE#wechat_redirect';

    res.json({
        status: 200,
        data: url,
    });
});

//获取openid返回客户端
app.get('/api/pay/wx_pay/getOpenId', function (req, res) {
    let code = req.query.code;
    let pay = new WechatPay();
    //openid
    pay.getAccessToken(code, function (err, data) {
        console.log(data);
        res.json(data);
    })
});

app.get('/api/pay/wx_pay/order', function (req, res) {
    let openid = req.query.openid;
    let pay = new WechatPay();

    pay.createOrder({
        openid: openid,
        notify_url: 'http://beimi.welcometo5g.cn/api/pay/wx_pay/notifyUrl', //微信支付完成后的回调
        out_trade_no: new Date().getTime(), //订单号
        attach: '名称',
        body: '购买信息',
        total_fee: '0.1', // 此处的额度为分
        spbill_create_ip: req.connection.remoteAddress.replace(/::ffff:/, ''),
    }, function (error, responseData) {
        if (error) {
            console.log(error);
        }
        res.json(responseData); /*签名字段*/
    });
});


app.get('/api/pay/wx_pay/notifyUrl', function (req, res) {
    let pay = new WechatPay();
    let notifyObj = req.body.xml;
    let signObj = {};

    for (let attr in notifyObj) {
        if (attr != 'sign') {
            signObj[attr] = notifyObj[attr][0]
        }
    }
    console.log(pay.getSign(signObj));
    console.log('--------------------------');
    console.log(req.body.xml.sign[0]);
});

app.listen(5271, function () {
    console.log('api is running at http://localhoust:5271');
});
