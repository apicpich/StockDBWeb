const express = require('express');
const router = express.Router();
const authen = require('./service/authen');
const bcrypt = require('bcryptjs');

const db = require('./service/db');

router.use(authen.checkToken);

router.post('/useradd', (req, res, next) => {
  let newUser = req.body;
  if (newUser.user_name.length > 0 && newUser.pass.length === 64) {
    //console.log(newUser);
    bcrypt.genSalt(12, function(err, salt) {
      if (err) { return next(err) };
      bcrypt.hash(newUser.pass, salt, function(err, hash) {
        if (err) { return next(err) };
        // Store hash in your password DB.
        newUser.hash = hash;
        db.none('INSERT INTO myuser (user_name, first_name, last_name, role, depart, pass) ' +
          'VALUES ( ${user_name}, ${first_name}, ${last_name}, ${role}, ${depart}, ${hash} )', newUser)
          .then(() => { res.json({ message: "เพิ่มผู้ใช้งานเรียบร้อยแล้ว..." }); })
          .catch(err => { next(err); console.error(err) });
      });
    });
  } else {
    res.status(400).json({message:"ข้อมูลไม่ถูกต้อง..."});
  };
})

router.put('/userupdate', (req, res, next) => {
  let editUser = req.body;
  if (editUser.user_name.length > 0) {
    db.none(`UPDATE myuser SET first_name = $/first_name/, last_name = $/last_name/,
      role = $/role/, depart = $/depart/ WHERE user_name = $/user_name/;`, editUser)
      .then(() => { res.json({ message: "แก้ไขผู้ใช้งานเรียบร้อยแล้ว..." }); })
      .catch(err => { next(err); console.error(err) });
  } else {
    res.status(400).json({message:"ข้อมูลไม่ถูกต้อง..."});
  };
})

router.delete('/userdelete', (req, res, next) => {
  db.none('DELETE FROM myuser WHERE user_name = $1;', req.query.id)
    .then(() => { res.json({ message: "ลบผู้ใช้งานเรียบร้อยแล้ว..." }); })
    .catch(err => { next(err); console.error(err) });
})

router.post('/passupdate', (req, res, next) => {
  if (req.body.user.length > 0  && req.body.pass.length > 0 && req.body.newpass.length > 0) {
    db.any("SELECT * FROM myuser WHERE user_name = $1", [req.body.user]).then(data => {
      //console.log(data);console.log(req.body.pass);
      if (data && data.length > 0) {
        const [pass, valid] = authen.demixStr(req.body.pass);
        if (valid) {
          bcrypt.compare(pass, data[0].pass, function (err, result) {
            if (err) {
              res.status(401).json({ message: "รหัสผ่านผิดพลาด..." });
            } else {
              if (result) {
                bcrypt.genSalt(12, function (err, salt) {
                  if (err) { return next(err) };
                  bcrypt.hash(req.body.newpass, salt, function (err, hash) {
                    if (err) { return next(err) };
                    // Store hash in your password DB.
                    db.none("UPDATE myuser SET pass = $1 WHERE user_name = $2", [hash, req.body.user])
                      .then(() => { res.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว..." }); })
                      .catch(err => { next(err); console.error(err) });
                  });
                });
              } else {
                res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง..." });
              };
            };
          });
        } else {
          res.status(401).json({message:"Log in มีข้อผิดพลาด..."});
        }
      } else {
        res.status(401).json({message:"ไม่พบผู้ใช้งาน..."});
      };
    }).catch(err => { next(err); console.error(err) });
  } else {
    res.status(400).json({message:"ข้อมูลไม่ถูกต้อง..."});
  };
})

module.exports = router;
