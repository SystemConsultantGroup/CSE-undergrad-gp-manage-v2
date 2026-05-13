var config = require('../../config');
var models = require('../../models/cssys_work');
var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var moment = require('moment');
var path = require('path');
var multer = require('multer'); // upload하는데 필요함
var xlsx = require('node-xlsx');
var fs = require('fs');
var { Op } = require('sequelize');

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// 로그인 인증 예외 처리
router.all('*', function (req, res, next) {
  if (req.session.user.type === 1) next();
  else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function (req, res, next) {
  res.redirect('/cssys/work/prof/main');
});

//------------------------------------------------------------------------------------------
router.get('/main', async function (req, res, next) {
  try {
    var users = await models.User.findAll({
      where: {
        type: 2,
      },
      include: [
        {
          model: models.Student,
          required: true,
          include: [
            {
              model: models.Prof,
              where: {
                UserId: req.session.user.id,
              },
              required: true,
            },
          ],
        },
      ],
      order: [
        [models.Student, 'SystemId', 'ASC'],
        ['ids', 'ASC'],
      ],
    });
    var systems = await models.System.findAll();
    systems.forEach(function (system) {
      system.start_ = moment(system.start).format('YYYY-MM-DD');
      system.end_ = moment(system.end).add(1, 'day').format('YYYY-MM-DD');
      system.userCnt = 0;
      system.userCmpCnt = 0;
      users.forEach(function (user) {
        if (user.Student && system.id == user.Student.SystemId) {
          system.userCnt++;
          if (
            (system.id == 2 && user.Student.StudentInfoId) ||
            (system.id == 9 && user.Student.oathId && user.Student.proposalId) ||
            (system.id == 10 && user.Student.midreportId) ||
            (system.id == 11 && user.Student.finalreportID && user.Student.paperworkId) ||
            (system.id == 12 && user.Student.result !== 0)
          )
            system.userCmpCnt++;
        }
      });
    });
    res.render('cssys/work/prof/main', {
      systems: systems,
      users: users,
    });
  } catch (err) {
    next(err);
  }
});

//------------------------------------------------------------------------------------------
router.get('/permission', async function (req, res, next) {
  try {
    var systems = await models.System.findAll({
      where: {
        id: [4, 6, 8],
      },
    });
    systems.forEach(function (system) {
      system.start_ = moment(system.start).format('YYYY-MM-DD');
      system.end_ = moment(system.end).format('YYYY-MM-DD');
      system.start__ = moment(system.start).format('YYYY년 M월 D일');
      system.end__ = moment(system.end).format('YYYY년 M월 D일');
      system.isNow = new Date() > system.start && new Date() < system.end;
      system.isOver = new Date() > system.end;
    });
    if (systems[0].isNow || systems[1].isNow || systems[2].isNow) {
      var yearterm = new Date().getFullYear().toString() + (new Date().getMonth() < 6 ? '01' : '02');
      var order = systems[0].isNow ? 1 : systems[1].isNow ? 2 : 3;
      var prof = await models.Prof.findOne({
        where: {
          UserId: req.session.user.id,
        },
      });
      if (prof) {
        var permissions = await models.Permission.findAll({
          where: {
            yearterm: yearterm,
            order: order,
            [Op.or]: [
              {
                firstProfId: prof.id,
              },
              {
                secondProfId: prof.id,
              },
              {
                thirdProfId: prof.id,
              },
            ],
          },
          include: [
            {
              model: models.Student,
              include: [models.User],
            },
            {
              model: models.Prof,
              include: [models.User],
            },
            {
              model: models.Prof,
              as: 'firstProf',
              include: [models.User],
            },
            {
              model: models.Prof,
              as: 'secondProf',
              include: [models.User],
            },
            {
              model: models.Prof,
              as: 'thirdProf',
              include: [models.User],
            },
          ],
        });

        var count0 = await models.Student.count({
          where: {
            yearterm: yearterm,
            ProfId: prof.id,
          },
        });

        var count1 = await models.Permission.count({
          where: {
            yearterm: yearterm,
            order: order,
            [Op.or]: [
              {
                firstProfId: prof.id,
                firstSelected: 1,
              },
              {
                secondProfId: prof.id,
                secondSelected: 1,
              },
              {
                thirdProfId: prof.id,
                thirdSelected: 1,
              },
            ],
          },
        });

        var semiconResult = await models.Permission.findAndCountAll({
          include: [{ model: models.Student, include: [{ model: models.User, where: { major: 2 } }] }],
          where: {
            yearterm: yearterm,
            order: order,
            [Op.or]: [
              {
                firstProfId: prof.id,
                firstSelected: 1,
              },
              {
                secondProfId: prof.id,
                secondSelected: 1,
              },
              {
                thirdProfId: prof.id,
                thirdSelected: 1,
              },
            ],
          },
        });
        var count2 = semiconResult.count;

        var cseResult = await models.Permission.findAndCountAll({
          include: [{ model: models.Student, include: [{ model: models.User, where: { major: 0 } }] }],
          where: {
            yearterm: yearterm,
            order: order,
            [Op.or]: [
              {
                firstProfId: prof.id,
                firstSelected: 1,
              },
              {
                secondProfId: prof.id,
                secondSelected: 1,
              },
              {
                thirdProfId: prof.id,
                thirdSelected: 1,
              },
            ],
          },
        });
        var count3 = cseResult.count;

        var counts = [count0, count1, count2, count3];
        console.log('counts: ', counts);
        permissions.forEach(function (permission) {
          if (permission.firstProfId == prof.id) permission.index = 1;
          else if (permission.secondProfId == prof.id) permission.index = 2;
          else if (permission.thirdProfId == prof.id) permission.index = 3;
        });
        permissions.sort(function (a, b) {
          return a.index - b.index;
        });
        res.render('cssys/work/prof/permission', {
          permitcount: config.cssys.permit_student_count,
          permitcountsemicon: config.cssys.permit_student_count_semicon,
          selectable:
            config.cssys.permit_student_count - (counts[0] + counts[1]) < 0
              ? 0
              : config.cssys.permit_student_count - (counts[0] + counts[1]),
          selectablesemicon:
            config.cssys.permit_student_count_semicon - counts[2] < 0
              ? 0
              : config.cssys.permit_student_count_semicon - counts[2],
          user: req.session.user,
          permissions: permissions,
          systems: systems,
          order: order,
        });
      } else next();
    } else {
      res.render('cssys/work/prof/permission_out_date', {
        systems: systems,
      });
    }
  } catch (err) {
    next(err);
  }
});
router.get('/permission/application/:id', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        type: 2,
        id: req.params.id,
      },
      include: [
        {
          model: models.Student,
          include: [models.StudentInfo],
        },
      ],
    });
    if (user && user.Student) {
      // 인증 절차
      var prof = await models.Prof.findOne({
        where: {
          UserId: req.session.user.id,
        },
      });
      if (prof) {
        var permission = await models.Permission.findOne({
          where: {
            StudentId: user.Student.id,
            [Op.or]: [
              {
                firstProfId: prof.id,
              },
              {
                secondProfId: prof.id,
              },
              {
                thirdProfId: prof.id,
              },
            ],
          },
        });
        if (permission) {
          if (user.Student.StudentInfo) {
            user.Student.StudentInfo.time_ = moment(user.Student.StudentInfo.time).format('YYYY년 M월 D일');
          }
          res.render('cssys/work/prof/permission_application', {
            user: user,
            student: user.Student,
          });
        }
      } else next();
    } else next();
  } catch (err) {
    next(err);
  }
});
router.post('/permission/ajax/set_student', async function (req, res, next) {
  try {
    var prof = await models.Prof.findOne({
      where: {
        UserId: req.session.user.id,
      },
    });
    if (prof) {
      var systems = await models.System.findAll({
        where: {
          id: [4, 6, 8],
        },
      });
      systems.forEach(function (system) {
        system.isNow = new Date() > system.start && new Date() < system.end;
      });
      if (systems[0].isNow || systems[1].isNow || systems[2].isNow) {
        var yearterm = new Date().getFullYear().toString() + (new Date().getMonth() < 6 ? '01' : '02');
        var order = systems[0].isNow ? 1 : systems[1].isNow ? 2 : 3;

        var count0 = await models.Student.count({
          where: {
            yearterm: yearterm,
            ProfId: prof.id,
          },
        });
        // callback(null, 0);
        count0 = 0;

        var count1 = await models.Permission.count({
          where: {
            yearterm: yearterm,
            order: order,
            [Op.or]: [
              {
                firstProfId: prof.id,
                firstSelected: 1,
              },
              {
                secondProfId: prof.id,
                secondSelected: 1,
              },
              {
                thirdProfId: prof.id,
                thirdSelected: 1,
              },
            ],
          },
        });

        var counts = [count0, count1];
        var selectable =
          config.cssys.permit_student_count - (counts[0] + counts[1]) < 0
            ? 0
            : config.cssys.permit_student_count - (counts[0] + counts[1]);
        if (selectable > 0) {
          var permission = await models.Permission.findOne({
            where: { id: req.body.id },
          });
          if (permission) {
            if (permission.firstProfId == prof.id) {
              permission.firstSelected = 1;
              permission.secondSelected = null;
              permission.thirdSelected = null;
            } else if (permission.secondProfId == prof.id) {
              permission.secondSelected = 1;
              permission.thirdSelected = null;
            } else if (permission.thirdProfId == prof.id) permission.thirdSelected = 1;
            await permission.save();
            res.send({
              result: true,
            });
          }
        } else {
          res.send({
            result: false,
            text: '지도 학생 선택 가능 학생수를 초과 하셨습니다. 더이상 선택 할 수 없습니다.',
          });
        }
      } else next();
    } else next();
  } catch (err) {
    next(err);
  }
});

router.get('/student_list', function (req, res, next) {
  res.render('cssys/work/prof/student_list');
});

router.get('/student_list/excel/', async function (req, res, next) {
  try {
    var users = await models.User.findAll({
      where: {
        type: 2,
      },
      include: [
        {
          model: models.Student,
          required: true,
          include: [
            {
              model: models.Prof,
              where: {
                UserId: req.session.user.id,
              },
              required: true,
            },
            models.System,
          ],
        },
      ],
      order: [
        [models.Student, 'SystemId', 'ASC'],
        ['ids', 'ASC'],
      ],
    });
    var data = [['#', '아이디', '이름', '재학 여부', '복수전공 여부', '이메일', '연락처', '전공']];
    var index = 1;
    users.forEach(function (user) {
      data.push([
        index,
        user.ids,
        user.name,
        ['재학', '휴학', '수료', '졸업'][user.Student.status],
        ['X', 'O'][user.Student.doublemajor ? 1 : 0],
        user.email,
        user.phone,
        [
          '전자전기공학부',
          '컴퓨터공학과',
          '반도체시스템공학과',
          '소프트웨어학과',
          '정보통신대학',
          '인터랙션사이언스학과',
        ][user.major],
      ]);
      index++;
    });
    var buffer = xlsx.build([
      {
        name: 'cssys_student_list',
        data: data,
      },
    ]);
    res.setHeader(
      'Content-disposition',
      'attachment; filename=student_list_' + moment().format('YYYYMMDDHHmmss') + '.xlsx',
    );
    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.post('/student_list/ajax/get_students', async function (req, res, next) {
  try {
    var users = await models.User.findAll({
      where: {
        type: 2,
      },
      include: [
        {
          model: models.Student,
          required: true,
          include: [
            {
              model: models.Prof,
              where: {
                UserId: req.session.user.id,
              },
              required: true,
            },
            models.System,
          ],
        },
      ],
      order: [
        [models.Student, 'SystemId', 'ASC'],
        ['ids', 'ASC'],
      ],
    });
    var index = 1;
    users.forEach(function (user) {
      if (!user.Student) return;
      user.dataValues.index = index++;
      if (user.Student.System) {
        user.Student.System.dataValues.isNow =
          new Date() > user.Student.System.start && new Date() < user.Student.System.end;
      }
      var a = user.Student.dataValues.state;
      //[1의 자리=제안서, 10의 자리=중간보고서, 100의자리=최종보고서]
      user.Student.dataValues.state = [a % 10, parseInt((a % 100) / 10), parseInt(a / 100)];
      delete user.dataValues.password;
    });
    res.send({
      aaData: users,
    });
  } catch (err) {
    next(err);
  }
});
router.get('/student/application/:id', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        type: 2,
        id: req.params.id,
      },
      include: [
        {
          model: models.Student,
          include: [
            models.StudentInfo,
            {
              model: models.Prof,
              where: {
                UserId: req.session.user.id,
              },
            },
          ],
        },
      ],
    });
    if (user && user.Student) {
      if (user.Student.StudentInfo) {
        user.Student.StudentInfo.time_ = moment(user.Student.StudentInfo.time).format('YYYY년 M월 D일');
      }
      res.render('cssys/work/prof/student_application', {
        user: user,
        student: user.Student,
      });
    } else next();
  } catch (err) {
    next(err);
  }
});

router.get('/student/:id', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        type: 2,
        id: req.params.id,
      },
      include: [
        {
          model: models.Student,
          include: [
            models.System,
            models.StudentInfo,
            {
              model: models.Prof,
              include: [models.User],
              where: {
                UserId: req.session.user.id,
              },
            },
            {
              model: models.StudentFile,
              as: 'oath',
            },
            {
              model: models.StudentFile,
              as: 'proposal',
            },
            {
              model: models.StudentFile,
              as: 'midreport',
            },
            {
              model: models.StudentFile,
              as: 'finalreport',
            },
            {
              model: models.StudentFile,
              as: 'paperwork',
            },
            {
              model: models.StudentFile,
              as: 'presentation',
            },
            {
              model: models.StudentFile,
              as: 'conference',
            },
          ],
        },
      ],
    });
    if (user && user.Student) {
      [
        'StudentInfo',
        'oath',
        'proposal',
        'midreport',
        'finalreport',
        'paperwork',
        'presentation',
        'conference',
      ].forEach(function (index) {
        if (user.Student[index]) {
          if (index != 'StudentInfo')
            user.Student[index].link =
              '/cssys/work/ajax/file/download/' + index + '/' + path.basename(user.Student[index].path);
          user.Student[index].time_ = moment(user.Student[index].time).format('YYYY년 M월 D일');
        }
      });
      var a = user.Student.state;
      res.render('cssys/work/prof/student_view', {
        user: user,
        student: user.Student,
        //[1의 자리=제안서, 10의 자리=중간보고서, 100의자리=최종보고서]
        state: [a % 10, parseInt((a % 100) / 10), parseInt(a / 100)],
      });
    } else next();
  } catch (err) {
    next(err);
  }
});
router.get('/student/:id/confirm/:state/:value', async function (req, res, next) {
  try {
    var id = req.params.id;
    var state = req.params.state;
    var value = req.params.value;
    var data = await models.Student.findOne({
      where: {
        UserId: id,
      },
      attributes: ['id', 'state'],
    });
    var a = data.state;
    var newstate = [a % 10, parseInt((a % 100) / 10), parseInt(a / 100)];
    newstate[state - 1] = value;
    await models.Student.update(
      { state: newstate[2] * 100 + newstate[1] * 10 + newstate[0] },
      {
        where: {
          UserId: id,
        },
      },
    );
    res.redirect('/cssys/work/prof/student/' + id);
  } catch (err) {
    next(err);
  }
});
router.post('/student/:id', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        type: 2,
        id: req.params.id,
      },
      include: [
        {
          model: models.Student,
          include: [
            models.System,
            {
              model: models.Prof,
              include: [models.User],
              where: {
                UserId: req.session.user.id,
              },
            },
          ],
        },
      ],
    });
    if (user && user.Student) {
      user.Student.note = req.body.note;
      user.Student.comment = req.body.comment;
      user.Student.masterpiece = req.body.masterpiece == 1 ? 1 : 0; //원래 비고란이었으나 우수작 선정 체크박스 값 체크하는데 사용
      await user.Student.save();
      res.send({
        result: true,
      });
    } else {
      res.send({
        result: false,
        text: '존재하지 않는 지도 학생입니다.',
      });
    }
  } catch (err) {
    next(err);
  }
});

router.get('/examine', async function (req, res, next) {
  try {
    var system = await models.System.findOne({ where: { id: 12 } });
    if (system) {
      if (new Date() > system.start && new Date() < system.end) {
        var users = await models.User.findAll({
          where: {
            type: 2,
          },
          include: [
            {
              model: models.Student,
              required: true,
              include: [
                {
                  model: models.System,
                  where: {
                    id: 12,
                  },
                },
                {
                  model: models.Prof,
                  include: [models.User],
                  where: {
                    UserId: req.session.user.id,
                  },
                },
              ],
            },
          ],
        });
        if (users) {
          system.start_ = moment(system.start).format('YYYY-MM-DD');
          system.end_ = moment(system.end).format('YYYY-MM-DD');
          res.render('cssys/work/prof/examine_list', {
            system: system,
            users: users.length > 0 ? users : null,
          });
        } else next();
      } else {
        system.start__ = moment(system.start).format('YYYY년 M월 D일');
        system.end__ = moment(system.end).format('YYYY년 M월 D일');
        system.isOver = new Date() > system.end;
        res.render('cssys/work/prof/examine_out_date', {
          system: system,
        });
      }
    } else next();
  } catch (err) {
    next(err);
  }
});

router.get('/examine/:id', async function (req, res, next) {
  try {
    var system = await models.System.findOne({ where: { id: 12 } });
    if (system) {
      if (new Date() > system.start && new Date() < system.end) {
        var user = await models.User.findOne({
          where: {
            type: 2,
            id: req.params.id,
          },
          include: [
            {
              model: models.Student,
              include: [
                {
                  model: models.System,
                  where: {
                    id: 12,
                  },
                },
                {
                  model: models.Prof,
                  include: [models.User],
                  where: {
                    UserId: req.session.user.id,
                  },
                },
                models.StudentInfo,
                {
                  model: models.StudentFile,
                  as: 'oath',
                },
                {
                  model: models.StudentFile,
                  as: 'proposal',
                },
                {
                  model: models.StudentFile,
                  as: 'midreport',
                },
                {
                  model: models.StudentFile,
                  as: 'finalreport',
                },
                {
                  model: models.StudentFile,
                  as: 'paperwork',
                },
                {
                  model: models.StudentFile,
                  as: 'presentation',
                },
                {
                  model: models.StudentFile,
                  as: 'conference',
                },
              ],
            },
          ],
        });
        if (user && user.Student) {
          [
            'StudentInfo',
            'oath',
            'proposal',
            'midreport',
            'finalreport',
            'paperwork',
            'presentation',
            'conference',
          ].forEach(function (index) {
            if (user.Student[index]) {
              if (index != 'StudentInfo')
                user.Student[index].link =
                  '/cssys/work/ajax/file/download/' + index + '/' + path.basename(user.Student[index].path);
              user.Student[index].time_ = moment(user.Student[index].time).format('YYYY년 M월 D일');
            }
          });
          var users = await models.User.findAll({
            where: {
              type: 2,
            },
            include: [
              {
                model: models.Student,
                required: true,
                include: [
                  {
                    model: models.System,
                    where: {
                      id: 12,
                    },
                  },
                  {
                    model: models.Prof,
                    include: [models.User],
                    where: {
                      UserId: req.session.user.id,
                    },
                  },
                ],
              },
            ],
          });
          if (users) {
            system.start_ = moment(system.start).format('YYYY-MM-DD');
            system.end_ = moment(system.end).format('YYYY-MM-DD');
            res.render('cssys/work/prof/examine_view', {
              system: system,
              users: users,
              user: user,
              student: user.Student,
            });
          } else next();
        } else next();
      } else {
        res.render('cssys/work/prof/examine_out_date', {
          system: system,
        });
      }
    } else next();
  } catch (err) {
    next(err);
  }
});
router.post('/examine/:id', async function (req, res, next) {
  try {
    var system = await models.System.findOne({ where: { id: 12 } });
    if (system) {
      if (new Date() > system.start && new Date() < system.end) {
        var user = await models.User.findOne({
          where: {
            type: 2,
            id: req.params.id,
          },
          include: [
            {
              model: models.Student,
              include: [
                {
                  model: models.System,
                  where: {
                    id: 12,
                  },
                },
                {
                  model: models.Prof,
                  include: [models.User],
                  where: {
                    UserId: req.session.user.id,
                  },
                },
              ],
            },
          ],
        });
        if (user && user.Student) {
          user.Student.note = req.body.note;
          user.Student.masterpiece = req.body.masterpiece == 1 ? 1 : 0; //원래 비고란이었으나 우수작 선정 체크박스 값 체크하는데 사용
          if (req.body.result) user.Student.result = req.body.result == 1 ? 1 : 2;
          await user.Student.save();
          res.send({
            result: true,
          });
        } else {
          res.send({
            result: false,
            text: '존재하지 않는 지도 학생입니다.',
          });
        }
      } else {
        res.send({
          result: false,
          text: '심사 기간이 아닙니다.',
        });
      }
    } else next();
  } catch (err) {
    next(err);
  }
});
//------------------------------------------------------------------------------------------
// 교수 공지사항 부분 추가
router.get('/notice', function (req, res, next) {
  res.redirect('/cssys/work/prof/notice/list');
});
router.get('/notice/list', function (req, res, next) {
  res.render('cssys/work/prof/notice_list');
});
router.get('/notice/view/:id', function (req, res, next) {
  res.render('cssys/work/prof/notice_view', {
    id: req.params.id,
  });
});

//------------------------------------------------------------------------------------------
// 질문 및 답변 게시판 추가 (admin.js 소스 복붙후 수정)
router.get('/qna', function (req, res, next) {
  res.redirect('/cssys/work/prof/qna/list');
});
router.get('/qna/list', function (req, res, next) {
  res.render('cssys/work/prof/qna_list');
});
router.get('/qna/write', function (req, res, next) {
  res.render('cssys/work/prof/qna_write');
});
router.get('/qna/view/:id', function (req, res, next) {
  res.render('cssys/work/prof/qna_view', {
    id: req.params.id,
  });
});
router.get('/qna/reply/:id', function (req, res, next) {
  res.render('cssys/work/prof/qna_reply', {
    id: req.params.id,
  });
});
router.get('/qna/modify/:id', function (req, res, next) {
  res.render('cssys/work/prof/qna_modify', {
    id: req.params.id,
  });
});

//------------------------------------------------------------------------------------------
// 회원정보 수정
router.get('/config', async function (req, res, next) {
  try {
    var user = await models.User.findOne({ where: { id: req.session.user.id } });
    if (user !== null) {
      res.render('cssys/work/prof/config', {
        user: user,
      });
    } else next();
  } catch (err) {
    next(err);
  }
});
router.post('/config', async function (req, res, next) {
  try {
    var user = await models.User.findOne({ where: { id: req.session.user.id } });
    if (user !== null) {
      var tmp = {
        email: req.body.email,
        phone: req.body.phone,
        time: new Date(),
        ip: req.ip,
      };
      if (req.body.password !== '') tmp.password = sha256(req.body.password);
      await user.update(tmp);
      res.send({
        result: true,
      });
    } else next();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
