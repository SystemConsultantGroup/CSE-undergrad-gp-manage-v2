var config = require('../../config');
var models = require('../../models/cssys_schedule');
var express = require('express');
var router = express.Router();
var crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// 어드민 로그인 인증 예외 처리
router.all('*', function (req, res, next) {
  if (req.session.user.type === 0) next();
  else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function (req, res, next) {
  res.redirect('/cssys/schedule/admin/main');
});

//------------------------------------------------------------------------------------------
router.get('/main', function (req, res, next) {
  res.render('cssys/schedule/admin/main');
});

//------------------------------------------------------------------------------------------
router.get('/user_list', function (req, res, next) {
  res.render('cssys/schedule/admin/user_list');
});
router.post('/user_list/ajax/get_users', async function (req, res, next) {
  try {
    var users = await models.User.findAll({
      where: {
        type: 3,
      },
    });
    var index = 1;
    users.forEach(function (user) {
      user.dataValues.index = index++;
      delete user.dataValues.password;
    });
    res.send({
      aaData: users,
    });
  } catch (err) {
    next(err);
  }
});
router.get('/user_register', async function (req, res, next) {
  try {
    var users = await models.User.findAll({
      where: {
        type: 3,
      },
    });
    res.render('cssys/schedule/admin/user_register', {
      users: users,
    });
  } catch (err) {
    next(err);
  }
});
router.post('/user_register/ajax/get_user', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        id: req.body.id,
        type: 3,
      },
    });
    if (user !== null) {
      delete user.dataValues.password;
      res.send(user);
    } else next();
  } catch (err) {
    next(err);
  }
});
router.post('/user_register', async function (req, res, next) {
  try {
    if (req.body.id) {
      // 수정일경우
      var user = await models.User.findOne({
        where: {
          id: req.body.id,
          type: 3,
        },
      });
      if (user !== null) {
        if (req.body.password === '') req.body.password = user.password;
        else req.body.password = sha256(req.body.password);
        req.body.time = new Date();
        req.body.ip = req.ip;
        await user.update(req.body);
        res.send({
          result: true,
        });
      } else next();
    } else {
      // 추가일경우
      delete req.body.id;
      var user = await models.User.findOne({
        where: {
          ids: req.body.ids,
        },
      });
      if (user === null) {
        req.body.type = 3;
        req.body.password = sha256(req.body.password);
        req.body.time = new Date();
        req.body.ip = req.ip;
        req.body.title = req.body.ids + "'s Calendar";
        var newUser = await models.User.create(req.body);
        var calendar = await newUser.createCalendar(req.body);
        await calendar.createShare(req.body);
        res.send({
          result: true,
        });
      } else {
        res.send({
          result: false,
          text: '이미 존재하는 아이디 입니다.',
        });
      }
    }
  } catch (err) {
    next(err);
  }
});

//------------------------------------------------------------------------------------------
// cssys_work admin 페이지 소스 재활용함
router.get('/board', function (req, res, next) {
  res.redirect('/cssys/schedule/admin/board/list');
});
router.get('/board/list', function (req, res, next) {
  res.render('cssys/schedule/admin/board_list');
});
router.get('/board/write', function (req, res, next) {
  res.render('cssys/schedule/admin/board_write');
});
router.get('/board/view/:id', function (req, res, next) {
  res.render('cssys/schedule/admin/board_view', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/board/reply/:id', function (req, res, next) {
  res.render('cssys/schedule/admin/board_reply', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/board/modify/:id', function (req, res, next) {
  res.render('cssys/schedule/admin/board_modify', {
    id: req.params.id, // ajax 요청할때 사용
  });
});

module.exports = router;
