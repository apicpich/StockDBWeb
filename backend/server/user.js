const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const authen = require('./service/authen');
const db = require('./service/db');
const { departRateUpdate } = require('./service/startup');

router.post('/login', (req, res, next) => {
  req.log.info({
    signUser: req.body.user,
    "user-agent": req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
  })
  db.any("SELECT * FROM myuser WHERE user_name = $1", [req.body.user]).then(data => {
    if (data && data.length > 0) {
      const [pass, valid] = authen.demixStr(req.body.pass);
      if (valid) {
        bcrypt.compare(pass, data[0].pass, function (err, result) {
          if (err) {
            res.status(401).json({ message: "Log in มีข้อผิดพลาด..." });
          } else {
            if (result) {
              const payload = { user: req.body.user, role: data[0].role, depart: data[0].depart };
              const token = authen.createToken(payload);
              delete data[0].pass
              departRateUpdate(data[0].depart).then(() => {
                res.json({
                  status: 1,
                  user: data[0],
                  s_time: Date.now(),
                  token: token
                });
              }).catch(err => {
                console.log(err)
                res.status(500).json({message:"มีข้อผิดพลาดจากฐานข้อมูล..."});            
              })
            } else {
              res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง..." });
            };
          };
        });
      } else {
        res.status(401).json({message:"Log in มีข้อผิดพลาด..."});
      }
    } else {
      res.status(401).json({message:"Log in มีข้อผิดพลาด..."});
    };
  }).catch((err) => {
    console.log(err)
    res.status(500).json({message:"มีข้อผิดพลาดจากฐานข้อมูล..."});
  });
})

module.exports = router;