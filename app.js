process.setMaxListeners(100);

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
const multer = require('multer');
const swig = require('swig');
const moment = require('moment-timezone')

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
  createDatabaseTable: true
});


// 뷰 엔진 셋업
app.engine('swig', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'swig');

// express 환경 셋업
app.use(timeout('30s'));
// morgan log 설정
app.enable("trust proxy");
logger.token('User', (req, res) => {
  return !(req.session) ? 'Source' : (req.session.user == undefined) ? 'Guest': (req.session.user.ids);
});
logger.token('Date', (req, res, tz) => {
  return moment().tz(tz).format('YYYY-MM-DD HH:mm:ss Z')
})
logger.format('SCG', '[:User] :remote-addr [:Date[Asia/Seoul]] ":method :url HTTP/:http-version" :status :res[content-length] ":user-agent" - :response-time ms');
app.use(logger('SCG'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use('/cssys', express.static(path.join(__dirname, 'public'))); // public 폴더 static 라우팅
app.use('/cssys/assets', express.static(path.join(__dirname, 'assets')));
app.use(compression());
app.use(session({
    secret: sessionSecret,
    store: sessionStore,
    proxy: true,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 3 * 60 * 60 * 1000 } // 세션 유지 3시간
}));
app.use(multer({
    dest: './webdata_tmp/', // 업로드된 파일 임시경로
    //inMemory: true,
    limits: {
        fileSize: 1024 * 1024 * 100, // 업로드 용량 100메가 제한
        //        files: 1, // 파일, 필드, 파트도 1메가 제한
        //        fields: 1,
        //        parts: 1
    },
    onFileSizeLimit: function(file) {
        try {
            fs.unlinkSync(file.path);
        } catch (err) {}
        file.isFileSizeLimit = true;
        return file;
    }
}));

// 뷰 엔진 셋업 ( 세션 떄문에 )
app.use(function(req, res, next) { // 이거 cssys 로그인 된 모든페이지 렌더링에서 session 값 가져오려는건데 엄청 비효율적일수도 있음
    swig.setDefaults({
        cache: false,
        locals: {
            env: app.get('env'),
            session: function() {
                return req.session;
            }
        }
    });
    next();
});

// 컨트롤러 라우팅 셋업
app.use('/', require('./routes/index'));
// cs
app.use('/cs', require('./routes/cs/index'));
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
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    if (err.status == 404) {
        res.send('Page Not Found')
    } else {
        res.render('error', {
            message: err.message,
            error: {},
            title: 'error'
        });
    }
});


module.exports = app;
