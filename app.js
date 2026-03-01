process.setMaxListeners(100);

// 운영 모드 강제
process.env.NODE_ENV = 'production';

// 개발에 관한 내용은 최상위 readme 파일을 확인해주세요.
// 2014. 12. 23 12기 강성현

// 필요 모둘 임포트
const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const timeout = require('connect-timeout');
const session = require('express-session');
const moment = require('moment-timezone');

// express session production store
const MySQLStore = require('express-mysql-session')(session);
const config = require('./config');
const sessionSecret = process.env.SESSION_SECRET || (config.session && config.session.secret);

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

const app = express();

const sessionStore = new MySQLStore({
  host: config.db.host,
  port: config.db.port,
  user: config.db.username,
  password: config.db.password,
  database: config.db.database,
  clearExpired: true,
  expiration: 4 * 60 * 60 * 1000, // 4시간
  checkExpirationInterval: 4 * 60 * 60 * 1000, // 4시간 마다 만료된 세션 지움
  createDatabaseTable: true,
});

// 뷰 엔진 셋업
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Pug date filter helper using moment
app.locals.formatDate = function (date, format, offset) {
  if (!date) return '';
  var m = moment(date);
  if (offset !== undefined) m = m.utcOffset(offset);
  return m.format(format || 'YYYY-MM-DD');
};

// express 환경 셋업
app.use(timeout('30s'));
// morgan log 설정
app.enable('trust proxy');
logger.token('User', (req, res) => {
  return !req.session ? 'Source' : req.session.user == undefined ? 'Guest' : req.session.user.ids;
});
logger.token('Date', (req, res, tz) => {
  return moment().tz(tz).format('YYYY-MM-DD HH:mm:ss Z');
});
logger.format(
  'SCG',
  '[:User] :remote-addr [:Date[Asia/Seoul]] ":method :url HTTP/:http-version" :status :res[content-length] ":user-agent" - :response-time ms',
);
app.use(logger('SCG'));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(cookieParser());
app.use('/cssys', express.static(path.join(__dirname, 'public'))); // public 폴더 static 라우팅
app.use('/cssys/assets', express.static(path.join(__dirname, 'assets')));
app.use(compression());
app.use(
  session({
    secret: sessionSecret,
    store: sessionStore,
    proxy: true,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 3 * 60 * 60 * 1000 }, // 세션 유지 3시간
  }),
);

// Pass env and session to all views (replaces swig.setDefaults)
app.use(function (req, res, next) {
  res.locals.env = app.get('env');
  res.locals.session = req.session;
  next();
});

// 컨트롤러 라우팅 셋업
app.use('/', require('./routes/index'));
// cs
//app.use('/cs', require('./routes/cs/index'));
// cssys main
app.use('/cssys', require('./routes/cssys/index'));
// cssys work (졸업작품시스템)
app.use('/cssys/work', require('./routes/cssys_work/index'));
app.use('/cssys/work/admin', require('./routes/cssys_work/admin'));
app.use('/cssys/work/prof', require('./routes/cssys_work/prof'));
app.use('/cssys/work/student', require('./routes/cssys_work/student'));
// cssys schedule (일정관리시스템)
app.use('/cssys/schedule', require('./routes/cssys_schedule/index'));
app.use('/cssys/schedule/admin', require('./routes/cssys_schedule/admin'));
app.use('/cssys/schedule/user', require('./routes/cssys_schedule/user'));
// cssys guidance (생활지도시스템)
app.use('/cssys/guidance', require('./routes/cssys_guidance/index'));
app.use('/cssys/guidance/admin', require('./routes/cssys_guidance/admin'));
app.use('/cssys/guidance/prof', require('./routes/cssys_guidance/prof'));
app.use('/cssys/guidance/student', require('./routes/cssys_guidance/student'));

/// error handlers

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  const status = err.status || 500;
  const now = moment().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss Z');

  // 운영 로그는 최소 정보만 남김 (상세 스택/에러 객체 미노출)
  if (status >= 500) {
    console.error(`[${now}] [ERROR] ${req.method} ${req.originalUrl}`);
  }

  res.status(status);
  if (err.status == 404) {
    res.send('Page Not Found');
  } else {
    res.render('error', { title: 'error' });
  }
});

module.exports = app;
