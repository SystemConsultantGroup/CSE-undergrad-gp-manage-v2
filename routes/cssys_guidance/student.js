var config = require('../../config');
var Sequelize = require('sequelize');
var models = require('../../models/cssys_guidance');
var models_ = require('../../models/cssys');
var models_w = require('../../models/cssys_work');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var crypto = require('crypto');
var { Op } = require('sequelize');
var moment = require('moment');
var mkdirp = require('mkdirp');
var path = require('path');

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// 로그인 인증 예외 처리
router.all('*', function (req, res, next) {
  if (req.session.user.type === 2) next();
  else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function (req, res, next) {
  res.redirect('/cssys/guidance/student/main');
});

router.get('/main', async function (req, res, next) {
  const user = await models.User.findOne({
    where: {
      id: req.session.user.id,
      type: 2,
    },
    include: [
      {
        model: models.Student,
        include: [
          {
            model: models.Prof,
            include: [
              {
                model: models.User,
                attributes: ['id', 'name', 'email'],
              },
            ],
          },
        ],
      },
    ],
  });
  if (!user) {
    res.redirect('/cssys/logout');
    return;
  }
  // console.log("asdf", user.Student.Prof);

  let pLog = []; // 교수랑 컨택한 적이 없을 경우 []를 보냄
  if (!!user.Student) {
    pLog = await models.GPermissionLog.findAll({
      where: {
        StudentId: user.Student.id,
      },
      include: [
        {
          model: models.Prof,
          include: [
            {
              model: models.User,
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
      limit: 5,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });
    pLog.forEach(function (log) {
      log.time_ = moment(log.createdAt).format('YYYY-MM-DD HH:mm:ss');
    });
  }

  const userLog = await models_.UserLog.findAll({
    where: {
      ids: req.session.user.ids,
    },
    order: [['time', 'DESC']],
    limit: 5,
  });
  userLog.forEach(function (log) {
    log.time_ = moment(log.time).format('YYYY-MM-DD HH:mm:ss');
  });
  res.render('cssys/guidance/student/main', {
    user: user,
    student: user.Student,
    loginLog: userLog,
    permissionLog: pLog,
  });
});

router.get('/regiprof', async function (req, res, next) {
  let prof = null;
  let log = null;
  let profid = await models.Student.findOne({
    where: {
      UserId: req.session.user.id,
    },
    attributes: ['id', 'ProfId', 'state'],
  });

  if (!profid) {
    // student 테이블 없는 경우
    profid = await models.Student.create({
      /*
            term: 
            status: 
            doublemajor: ,
            note: ,
            
            */
      state: 0,
      time: new Date(),
      ip: req.ip,
      ProfId: null,
      UserId: req.session.user.id,
    });

    profid = await models.Student.findOne({
      where: {
        UserId: req.session.user.id,
      },
      attributes: ['id', 'ProfId', 'state'],
    });
  }

  if (profid.state == 1) {
    log = await models.GPermissionLog.findOne({
      where: {
        resorreq: 'req',
        StudentId: profid.id,
      },
      attributes: ['state', 'createdAt'],
      include: {
        model: models_w.Prof,
        include: {
          model: models_.User,
          attributes: ['name', 'email'],
        },
      },
      order: [['createdAt', 'DESC']],
    });
  } else if (profid.state == 2) {
    prof = await models_w.Prof.findOne({
      where: {
        id: profid.ProfId,
      },
      attributes: ['id'],
      include: {
        model: models_.User,
        attributes: ['name'],
      },
    });
  }
  res.render('cssys/guidance/student/prof_register', {
    ProfId: profid.ProfId,
    StudentId: profid.id,
    prof: prof,
    Log: log,
    state: profid.state,
  });
});
router.post('/applyProf', async (req, res) => {
  const studentId = await models.Student.findOne({
    where: {
      UserId: req.session.user.id,
    },
    attributes: ['id'],
  });
  console.log(studentId.id, req.body.profid);
  await models.GPermissionLog.create({ resorreq: 'req', state: 1, ProfId: req.body.profid, StudentId: studentId.id });
  await models.Student.update({ state: 1, note: req.body.text }, { where: { id: studentId.id } });
  res.send({ result: true });
});

router.get('/appwrite/:ProfId', async (req, res) => {
  const prof = await models_w.Prof.findOne({
    where: {
      id: req.params.ProfId,
    },
    attributes: ['id'],
    include: {
      model: models_.User,
      attributes: ['name'],
    },
  });
  res.render('cssys/guidance/student/application_write', { ProfId: prof.id, Profname: prof.User.name });
});

router.get('/explwrite/:ProfId/:StudentId', async (req, res) => {
  const prof = await models_w.Prof.findOne({
    where: {
      id: req.params.ProfId,
    },
    attributes: ['id'],
    include: {
      model: models_.User,
      attributes: ['name'],
    },
  });
  res.render('cssys/guidance/student/explanatory_write', {
    ProfId: prof.id,
    StudentId: req.params.StudentId,
    Profname: prof.User.name,
  });
});

router.get('/status', async function (req, res) {
  const stu_state = await models.Student.findOne({
    where: {
      UserId: req.session.user.id,
    },
    attributes: ['state'],
  });
  res.send(stu_state); // '0: 없음, 1: 응답대기중, 2: 배정',
});

router.post('/modiProf', async (req, res) => {
  // 수정 취소 없이 바로 수정
  await models.Student.update({ state: 0, ProfId: null }, { where: { id: req.body.StudentId } });
  await models.GPermissionLog.create({
    resorreq: 'req',
    state: 0,
    text: req.body.text,
    ProfId: req.body.ProfId,
    StudentId: req.body.StudentId,
  });
  res.send({
    result: true,
  });
});

//------------------------------------------------------------------------------------------

// 희망 교수 선택 ajax 요청 처리
router.all('/system/ajax/permission', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        id: req.session.user.id,
        type: 2,
      },
      include: [
        {
          model: models.Student,
          include: [models.System],
        },
      ],
    });
    if (user && user.Student && user.Student.System) {
      /*
            // Sequelize아래 경우 student * firstPermissions * secondPermissions * thirdPermissions 갯수만큼 가져와서 합치는 거라
            // 부하가 엄청 심함 (Sequelize가 join을 outer로해서 통합하는듯...)
            models.User.findAll({
                order: [['name', 'ASC']],
                where: {
                    type: 1
                },
                include: [{
                    model: models.Prof,
                    include: [{
                        model: models.Student, // 이건 선택된거
                    }, {
                        model: models.Permission, // 1차 선택된거
                        as: 'firstPermissions'
                    }, {
                        model: models.Permission, // 2차 선택된거
                        as: 'secondPermissions'
                    }, {
                        model: models.Permission, // 3차 선택된거
                        as: 'thirdPermissions'
                    }]
                }]
            }).then(function(users) { // 교수 리스트
                var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
                var order = parseInt((parseInt(user.Student.System.id) - 1) / 2);
                var data = [];
                users.forEach(function(user) {
                    ['Students', 'firstPermissions', 'secondPermissions', 'thirdPermissions'].forEach(function(index) {
                        user.Prof[index] = user.Prof[index].filter(function(permission) {
                            if (index == 'Students' && permission.yearterm == yearterm) return true;
                            else if (permission.yearterm == yearterm && permission.order == order && permission.ProfId === null) return true;
                            else return false;
                        });
                    });
                    data.push({
                        id: user.Prof.id,
                        name: user.name,
                        major: user.major,
                        selectable: (config.cssys.permit_student_count - user.Prof.Students.length < 0 ? 0 : config.cssys.permit_student_count - user.Prof.Students.length),
                        firstSelected: user.Prof.firstPermissions.length,
                        secondSelected: user.Prof.secondPermissions.length,
                        thirdSelected: user.Prof.thirdPermissions.length
                    });
                });
                models.Permission.findOne({
                    where: {
                        StudentId: user.Student.id,
                        yearterm: yearterm,
                        order: order
                    }
                }).then(function(permission) { // 자기 정보
                    if (permission !== null) {
                        res.send({
                            data: data,
                            selected: permission
                        });
                    } else {
                        res.send({
                            data: data,
                            selected: null
                        });
                    }
                });
            });
            */
      var users = await models.User.findAll({
        order: [['name', 'ASC']],
        where: {
          type: 1,
        },
        include: [
          {
            model: models.Prof,
          },
        ],
      });
      var yearterm = new Date().getFullYear().toString() + (new Date().getMonth() < 6 ? '01' : '02');
      var order = parseInt((parseInt(user.Student.System.id) - 1) / 2);
      var data = [];

      for (var u of users) {
        if (!u.Prof) continue;
        var selected = await models.Student.count({
          where: {
            ProfId: u.Prof.id,
            yearterm: yearterm,
          },
        });
        var firstSelected = await models.Permission.count({
          where: {
            firstProfId: u.Prof.id,
            yearterm: yearterm,
            order: order,
            ProfId: null,
          },
        });
        var secondSelected = await models.Permission.count({
          where: {
            secondProfId: u.Prof.id,
            yearterm: yearterm,
            order: order,
            ProfId: null,
          },
        });
        var thirdSelected = await models.Permission.count({
          where: {
            thirdProfId: u.Prof.id,
            yearterm: yearterm,
            order: order,
            ProfId: null,
          },
        });
        var results = {
          selected: selected,
          firstSelected: firstSelected,
          secondSelected: secondSelected,
          thirdSelected: thirdSelected,
        };
        console.log(results);
        data.push({
          id: u.Prof.id,
          name: u.name,
          major: u.major,
          selectable:
            config.cssys.permit_student_count - results.selected < 0
              ? 0
              : config.cssys.permit_student_count - results.selected,
          firstSelected: results.firstSelected,
          secondSelected: results.secondSelected,
          thirdSelected: results.thirdSelected,
        });
      }
      var permission = await models.Permission.findOne({
        where: {
          StudentId: user.Student.id,
          yearterm: yearterm,
          order: order,
        },
      });
      if (permission !== null) {
        res.send({
          data: data,
          selected: permission,
        });
      } else {
        res.send({
          data: data,
          selected: null,
        });
      }
    } else next();
  } catch (err) {
    next(err);
  }
});

// 희망교수 선택 처리 페이지
router.post('/system/proc/permission', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        id: req.session.user.id,
        type: 2,
      },
      include: [
        {
          model: models.Student,
          include: [models.System],
        },
      ],
    });
    if (user && user.Student && user.Student.System) {
      if (
        (user.Student.System.id == 3 || user.Student.System.id == 5 || user.Student.System.id == 7) &&
        new Date() > user.Student.System.start &&
        new Date() < user.Student.System.end
      ) {
        if (
          req.body
            .firstProfId /*!= req.body.secondProfId && req.body.firstProfId != req.body.thirdProfId && req.body.secondProfId != req.body.thirdProfId*/
        ) {
          //2,3지망 삭제로 1,2,3지망 교수 동일 여부 코드 주석처리
          var yearterm = new Date().getFullYear().toString() + (new Date().getMonth() < 6 ? '01' : '02');
          var order = parseInt((parseInt(user.Student.System.id) - 1) / 2);
          var overCapacity = false;
          var profIds = [req.body.firstProfId /*, req.body.secondProfId, req.body.thirdProfId*/]; //2,3지망 삭제로 2,3차 반복코드 제거
          for (var id of profIds) {
            var prof = await models.Prof.findOne({
              where: {
                id: id,
              },
              include: [
                {
                  model: models.Student,
                  where: {
                    yearterm: yearterm,
                  },
                },
              ],
            });
            if (prof !== null) {
              if (prof.Students.length > config.cssys.permit_student_count) {
                overCapacity = true;
                break;
              }
            }
          }
          if (overCapacity) {
            res.send({
              result: false,
              text: '선택하신 교수님의 지도 가능 학생수가 부족합니다. 다시 확인해주세요.',
            });
          } else {
            var permission = await models.Permission.findOne({
              where: {
                yearterm: yearterm,
                order: order, // 이거 귀찮아서 그냥 이렇게함
                StudentId: user.Student.id,
              },
            });
            if (permission === null) {
              // 레코드 없을시 생성
              await models.Permission.create({
                yearterm: yearterm,
                order: order, // 이거 귀찮아서 그냥 이렇게함
                firstProfId: req.body.firstProfId,
                //secondProfId: req.body.secondProfId, //2,3차 삭제
                //thirdProfId: req.body.thirdProfId,
                StudentId: user.Student.id,
              });
              res.send({
                result: true,
              });
            } else {
              await permission.update({
                firstProfId: req.body.firstProfId,
                //secondProfId: req.body.secondProfId, //2,3차 삭제
                //thirdProfId: req.body.thirdProfId,
              });
              res.send({
                result: true,
              });
            }
          }
        } else {
          res.send({
            result: false,
            text: '서로다른 교수님을 선택해야합니다.',
          });
        }
      } else {
        res.send({
          result: false,
          text: '희망교수 선택 기간이 아니거나, 희망교수 선택 단계가 아닙니다.',
        });
      }
    } else next();
  } catch (err) {
    next(err);
  }
});

//------------------------------------------------------------------------------------------
// 회원정보 수정
router.get('/config', function (req, res, next) {
  models.User.findByPk(req.session.user.id).then(function (user) {
    if (user !== null) {
      res.render('cssys/guidance/student/config', {
        user: user,
      });
    } else next();
  });
});
router.post('/config', function (req, res, next) {
  models.User.findByPk(req.session.user.id).then(function (user) {
    if (user !== null) {
      var tmp = {
        email: req.body.email,
        phone: req.body.phone,
        time: new Date(),
        ip: req.ip,
      };
      if (req.body.password !== '') tmp.password = sha256(req.body.password);
      user.update(tmp).then(function (user) {
        res.send({
          result: true,
        });
      });
    } else next();
  });
});

//------------------------------------------------------------------------------------------
// 학생 공지사항 부분 추가
router.get('/notice', function (req, res, next) {
  res.redirect('/cssys/guidance/student/notice/list');
});
router.get('/notice/list', function (req, res, next) {
  res.render('cssys/guidance/student/notice_list');
});
router.get('/notice/view/:id', function (req, res, next) {
  res.render('cssys/guidance/student/notice_view', {
    id: req.params.id,
  });
});

//------------------------------------------------------------------------------------------
// 질문 및 답변 게시판 추가 (admin.js 소스 복붙후 수정)
router.get('/qna', function (req, res, next) {
  res.redirect('/cssys/guidance/student/qna/list');
});
router.get('/qna/list', function (req, res, next) {
  res.render('cssys/guidance/student/qna_list');
});
router.get('/qna/write', function (req, res, next) {
  res.render('cssys/guidance/student/qna_write');
});
router.get('/qna/view/:id', function (req, res, next) {
  res.render('cssys/guidance/student/qna_view', {
    id: req.params.id,
  });
});
router.get('/qna/reply/:id', function (req, res, next) {
  res.render('cssys/guidance/student/qna_reply', {
    id: req.params.id,
  });
});
router.get('/qna/modify/:id', function (req, res, next) {
  res.render('cssys/guidance/student/qna_modify', {
    id: req.params.id,
  });
});

module.exports = router;
