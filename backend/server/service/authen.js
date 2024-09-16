const jwt = require('jsonwebtoken');

const checkToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  let valid = false
  if (token) {
    const [deToken, intime] = demixStr(token);
    if (intime) {
      jwt.verify(deToken, process.env.secret, function (err, decoded) {
        if (err) {
          // console.log(err)
        } else {
          req.decoded = decoded;
          req.log.info({ user: decoded })
          valid = true
        };
      });
    }
  }
  if (valid) { next() }
  else {
    res.redirect('/')
    // res.status(401).json({ errcode: 1, message: "ไม่มีสิทธิ์เข้าใช้งาน..." })
  }
}

const createToken = (payload) => {
  return jwt.sign(payload, process.env.secret, {
    expiresIn: 1200 //second
  });
}

const demixStr = (str) => {
  const nowStr = Date.now().toString();
  const interval = +str.substr(-5, 1);
  let send = '', ext = '', inTime = true, result = str;
  for (let i = 0; i < nowStr.length; i++){
    ext += result.charAt(i * interval);
    result = result.slice(0, i * interval) + result.slice((i * interval) + 1);
  }
  for (let i = ext.length - 1; i >= 0; i--) {
    send += ext.charAt(i)
  }
  if (Math.abs((+nowStr) - (+send)) > 60000) {
    inTime = false
  }
  return [result.substr(0, result.length - 5), inTime];
}

module.exports = { checkToken, createToken, demixStr }