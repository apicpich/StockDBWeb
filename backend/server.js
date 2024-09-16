require('dotenv').config();
const compression = require('compression')
const express = require('express');
const path = require('path');
const bunyan = require('bunyan');

const app = express();
app.use(compression());

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const log = bunyan.createLogger({
  name: 'stockdb',
  serializers: bunyan.stdSerializers,
  streams: [
    {
      type: 'rotating-file',
      path: path.join(__dirname, 'log/stockdb.log'),
      period: '1d',   // daily rotation
      count: 60,      // keep 60 back copies
      level: 'info'
    },
    {
      type: 'rotating-file',
      path: path.join(__dirname, 'log/error.log'),
      period: '1w',
      count: 4,
      level: 'error'
    }
  ]
});

const apipg = require('./server/apipg');
const req = require('./server/req');
const stinv = require('./server/stinv');
const otinv = require('./server/otinv');
const departReport = require('./server/depart-report');
const user = require('./server/user');
const setup = require('./server/setup');
const api = require('./server/api');
const stockreport = require('./server/stock-report');
const report = require('./server/report');
const poplan = require('./server/poplan');

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false}));

// Angular DIST output folder
//app.use(express.static(path.join(__dirname, 'node_modules/node-adodb', 'dist/StockDBServer')));
app.use(express.static(path.join(__dirname, 'dist/StockDBServer')));

const cors = require('cors');
app.use(cors())

app.use(function(req, res, next) {
  req.io = io;
  req.log = log.child({ type: 'request', method: req.method, url: req.url });
  function afterResponse() {
    res.removeListener('finish', afterResponse);
    res.removeListener('close', afterResponse);
    // do smth after res.send
    if (res.statusCode !== 304 && res.statusCode !== 200) {
      log.info({ type: 'response', statusCode: res.statusCode })
    }
  }
  res.on('finish', afterResponse);
  res.on('close', afterResponse);
  next();
});

app.use('/apipg', apipg);
app.use('/req', req);
app.use('/stinv', stinv);
app.use('/otinv', otinv);
app.use('/departreport', departReport);
app.use('/api', api);
app.use('/stockreport', stockreport);
app.use('/report', report);
app.use('/poplan', poplan);
app.use('/user', user);
app.use('/setup', setup);

app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, '/dist/StockDBServer/index.html'));
});

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err.message);
  res.send(err);
  log.error(err);
});

server.listen(process.env.PORT || 3001, function () {
  console.log("Server is running.. on port %s", this.address().port)
});
