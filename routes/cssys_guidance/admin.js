var models = require('../../models/cssys_guidance');
var models_ = require('../../models/cssys');
const models_w = require('../../models/cssys_work');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var crypto = require('crypto');
var { Op } = require('sequelize');
var moment = require('moment');
var xlsx = require('node-xlsx');
var schedule = require('node-schedule');
var path = require('path');
var storage = require('../../lib/minio_storage');
var multer = require('multer');
var upload = multer({
  dest: './webdata_tmp/',
  limits: { fileSize: 1024 * 1024 * 100 },
});

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
  res.redirect('/cssys/guidance/admin/main');
});

router.get('/main', async function (req, res, next) {
  try {
    const today = new Date().toLocaleDateString();
    var recentLog = await models.GPermissionLog.findAll({
      where: {
        resorreq: 'res',
        state: 1,
      },
      include: [
        { model: models.Student, include: [{ model: models.User, attributes: ['name'] }] },
        { model: models.Prof, include: [{ model: models.User, attributes: ['name'] }] },
      ],
      order: [['updatedAt', 'DESC']],
      attributes: ['createdAt', 'updatedAt', 'state'],
      limit: 5,
    });
    var cancelLog = await models.GPermissionLog.findAll({
      where: {
        resorreq: 'res',
        state: 0,
      },
      include: [
        { model: models.Student, include: [{ model: models.User, attributes: ['name'] }] },
        { model: models.Prof, include: [{ model: models.User, attributes: ['name'] }] },
      ],
      order: [['updatedAt', 'DESC']],
      attributes: ['createdAt', 'updatedAt', 'state'],
      limit: 3,
    });
    var students = await models.User.findAll({
      where: {
        type: 2,
      },
      include: [{ model: models.Student, attributes: ['state', 'updatedAt'] }],
      attributes: ['name'],
    });
    var profs = await models.User.findAll({
      where: {
        type: 1,
      },
      attributes: ['name'],
    });
    var userLog = await models_.UserLog.findAll({
      where: {
        ids: 'admin',
      },
      order: [['time', 'DESC']],
      limit: 5,
    });
    userLog.forEach(function (log) {
      log.time_ = moment(log.time).format('YYYY-MM-DD HH:mm:ss');
    });
    const Log = recentLog.concat(cancelLog);
    Log.sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
    res.render('cssys/guidance/admin/main', {
      loginLog: userLog,
      students: students,
      applying_students: students.filter((student) => student.Student && student.Student.state == 1),
      completed_students: students.filter((student) => student.Student && student.Student.state == 2),
      today_applying_students: students.filter(
        (student) =>
          student.Student && student.Student.state == 1 && student.Student.updatedAt.toLocaleDateString() == today,
      ),
      today_completed_students: students.filter(
        (student) =>
          student.Student && student.Student.state == 2 && student.Student.updatedAt.toLocaleDateString() == today,
      ),
      profs: profs,
      //recentLog: recentLog,
      //cancelLog: cancelLog
      recentLog: Log,
    });
  } catch (err) {
    next(err);
  }
});

//교수 공지 관련 라우팅------------------------------------------------------------------------------------------
router.get('/notice_prof/list', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_prof_list');
});
router.get('/notice_prof/write', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_prof_write');
});
router.get('/notice_prof/view/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_prof_view', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/notice_prof/reply/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_prof_reply', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/notice_prof/modify/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_prof_modify', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/notice_student', function (req, res, next) {
  res.redirect('/cssys/guidance/admin/notice_student/list');
});
router.get('/notice_student/list', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_student_list');
});
router.get('/notice_student/write', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_student_write');
});
router.get('/notice_student/view/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_student_view', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/notice_student/reply/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_student_reply', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/notice_student/modify/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/notice_student_modify', {
    id: req.params.id, // ajax 요청할때 사용
  });
});

//------------------------------------------------------------------------------------------
router.get('/prof_list', function (req, res, next) {
  res.render('cssys/guidance/admin/prof_list');
});
router.post('/prof_list/ajax/get_profs', function (req, res, next) {
  models.User.findAll({
    where: {
      type: 1,
    },
  }).then(function (users) {
    var index = 1;
    users.forEach(function (user) {
      user.dataValues.index = index++;
      delete user.dataValues.password;
    });
    res.send({
      aaData: users,
    });
  });
});

router.get('/student_list/excel/:id', function (req, res, next) {
  var data = [];

  models.User.findAll({
    where: {
      type: 2,
    },
    include: [
      {
        model: models.Student,
        include: [
          {
            model: models.Prof,
            where: {
              UserId: req.params.id,
            },
          },
        ],
      },
    ],
    order: [['ids', 'ASC']],
  }).then(function (users) {
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
  });
});

router.get('/prof/:id', function (req, res, next) {
  models.User.findOne({
    where: {
      type: 1,
      id: req.params.id,
    },
  }).then(function (user) {
    if (user) {
      res.render('cssys/guidance/admin/prof_view', {
        user: user,
      });
    } else next();
  });
});
router.post('/prof/:id/ajax/get_students', function (req, res, next) {
  models.User.findAll({
    where: {
      type: 2,
    },
    include: [
      {
        model: models.Student,
        include: [
          {
            model: models.Prof,
            where: {
              UserId: req.params.id,
            },
          },
        ],
      },
    ],
    order: [['ids', 'ASC']],
  }).then(function (users) {
    var index = 1;
    users.forEach(function (user) {
      user.dataValues.index = index++;
      delete user.dataValues.password;
    });
    res.send({
      aaData: users,
    });
  });
});
router.get('/prof_login/:id', function (req, res, next) {
  // 귀찮아서 위 소스 복사함
  models.User.findOne({
    where: {
      type: 1,
      id: req.params.id,
    },
  }).then(function (user) {
    if (user) {
      req.session.user = user;
      res.redirect('/cssys/guidance/prof');
    } else next();
  });
});
router.get('/prof_register', function (req, res, next) {
  models.User.findAll({
    where: {
      type: 1,
    },
  }).then(function (users) {
    var result = {};
    var majorArr = [
      '전자전기공학부',
      '컴퓨터공학과',
      '반도체시스템공학과',
      '소프트웨어학과',
      '정보통신대학',
      '인터랙션사이언스학과',
      '(미등록)',
    ];
    majorArr.forEach(function (major) {
      result[major] = [];
    });
    users.forEach(function (user) {
      if (user.major === null) user.major = 6;
      result[majorArr[user.major]].push({
        id: user.id,
        name: user.name,
      });
    });
    res.render('cssys/guidance/admin/prof_register', {
      data: result,
      selectedId: null,
    });
  });
});
router.get('/prof_register/:id', function (req, res, next) {
  // 귀찮아서 위 소스 복사함
  models.User.findAll({
    where: {
      type: 1,
    },
  }).then(function (users) {
    var result = {};
    var majorArr = [
      '전자전기공학부',
      '컴퓨터공학과',
      '반도체시스템공학과',
      '소프트웨어학과',
      '정보통신대학',
      '인터랙션사이언스학과',
      '(미등록)',
    ];
    majorArr.forEach(function (major) {
      result[major] = [];
    });
    users.forEach(function (user) {
      if (user.major === null) user.major = 6;
      result[majorArr[user.major]].push({
        id: user.id,
        name: user.name,
      });
    });
    res.render('cssys/guidance/admin/prof_register', {
      data: result,
      selectedId: req.params.id,
    });
  });
});

router.post('/prof_register/ajax/get_prof', function (req, res, next) {
  models.User.findOne({
    where: {
      id: req.body.id,
      type: 1,
    },
  }).then(function (user) {
    if (user !== null) {
      delete user.dataValues.password;
      res.send(user);
    } else next();
  });
});
router.post('/prof_register', function (req, res, next) {
  if (req.body.id) {
    // 수정일경우
    models.User.findOne({
      where: {
        id: req.body.id,
        type: 1,
      },
    }).then(function (user) {
      if (user !== null) {
        if (req.body.password === '') req.body.password = user.password;
        else req.body.password = sha256(req.body.password);
        req.body.time = new Date();
        req.body.ip = req.ip;
        user.update(req.body).then(function (user) {
          res.send({
            result: true,
          });
        });
      } else next();
    });
  } else {
    // 추가일경우
    delete req.body.id;
    models.User.findOne({
      where: {
        ids: req.body.ids,
      },
    }).then(function (user) {
      if (user === null) {
        req.body.type = 1;
        req.body.password = sha256(req.body.password);
        req.body.time = new Date();
        req.body.ip = req.ip;
        models.User.create(req.body).then(function (user) {
          user.createProf({}).then(function (user) {
            res.send({
              result: true,
            });
          });
        });
      } else {
        res.send({
          result: false,
          text: '이미 존재하는 아이디 입니다.',
        });
      }
    });
  }
});
router.post('/prof_register/ajax/del_prof', function (req, res, next) {
  models.User.findOne({
    where: {
      id: req.body.id,
      type: 1,
    },
    include: [models.Prof],
  }).then(function (user) {
    if (user && user.Prof) {
      user.Prof.destroy().then(function () {
        user.destroy().then(function () {
          res.send({
            result: true,
          });
        });
      });
    } else next();
  });
});
router.get('/prof_excel_register', function (req, res, next) {
  res.render('cssys/guidance/admin/prof_excel_register');
});
router.post('/prof_excel_register', upload.single('file'), async function (req, res, next) {
  try {
    obj = xlsx.parse(req.file.path);
    fs.unlinkSync(req.file.path);

    obj[0].data.shift(); // 첫번째 행 삭제;

    var text = '';
    var insertCount = 0;
    var updateCount = 0;
    for (var data of obj[0].data) {
      if (data[0]) {
        // 해당 열에 아이디가 존재할 시
        var userTmp = {
          ids: data[0],
          type: 1,
          time: req.body.time,
          ip: req.body.ip,
          Prof: {
            time: req.body.time,
            ip: req.body.ip,
          },
        };

        var errFlag = false;
        try {
          if (data[1]) userTmp.password = sha256(data[1].toString());
          if (data[2]) userTmp.name = data[2];
          if (data[3]) userTmp.email = data[3];
          if (data[4]) userTmp.phone = data[4];

          if (data[5]) {
            if (data[5].indexOf('전자전기') >= 0) userTmp.major = 0;
            else if (data[5].indexOf('컴퓨터') >= 0) userTmp.major = 1;
            else if (data[5].indexOf('반도체') >= 0) userTmp.major = 2;
            else if (data[5].indexOf('소프트웨어') >= 0) userTmp.major = 3;
            else if (data[5].indexOf('정보통신') >= 0) userTmp.major = 4;
          }
        } catch (err) {
          errFlag = true;
          text += '[ ' + data[0] + ' ] 유저 데이터 파싱에서 문제가 발생하였습니다.\n';
        }
        if (!errFlag) {
          try {
            var user = await models.User.findOne({
              where: {
                ids: data[0],
              },
              include: [models.Prof],
            });
            if (user === null) {
              // 아이디 없을시 생성
              try {
                var newUser = await models.User.create(userTmp);
                try {
                  await newUser.createProf(userTmp.Prof);
                  insertCount++;
                } catch (errors) {
                  await newUser.destroy();
                  text += '[ ' + data[0] + ' ] 유저의 교수정보 생성에서 문제가 발생하였습니다.\n';
                }
              } catch (errors) {
                text += '[ ' + data[0] + ' ] 유저 생성에서 문제가 발생하였습니다.\n';
              }
            } else {
              // 아이디 존재함, 업데이트
              for (var key in userTmp) {
                if (key == 'Prof') {
                  for (var key_2 in userTmp.Prof) {
                    user.Prof[key_2] = userTmp.Prof[key_2];
                  }
                } else user[key] = userTmp[key];
              }
              try {
                await user.save();
                try {
                  await user.Prof.save();
                  updateCount++;
                } catch (errors) {
                  text += '[ ' + data[0] + ' ] 유저의 학생정보 수정에서 문제가 발생하였습니다.\n';
                }
              } catch (errors) {
                text += '[ ' + data[0] + ' ] 유저 수정에서 문제가 발생하였습니다.\n';
              }
              /* 에러나서 위 루틴으로 바꿈 (원인은 모르겠음)
                            user.update(userTmp).success(function(user) {
                                user.Prof.update(userTmp.Prof).success(function(user) {
                                    updateCount++;
                                }).error(function(errors) {
                                    text += "[ " + data[0] + " ] 유저의 교수정보 수정에서 문제가 발생하였습니다.\n";
                                });
                            }).error(function(errors) {
                                text += "[ " + data[0] + " ] 유저 수정에서 문제가 발생하였습니다.\n";
                            });
                            */
            }
          } catch (e) {
            text += '[ ' + data[0] + ' ] 처리 중 오류가 발생하였습니다.\n';
          }
        }
      }
    }
    if (insertCount > 0) text += '총 ' + insertCount + '개 계정이 추가되었습니다.\n';
    if (updateCount > 0) text += '총 ' + updateCount + '개 계정이 수정되었습니다.\n';
    res.send({
      result: true,
      text: text,
    });
  } catch (err) {
    res.send({
      result: false,
      text: '잘못된 파일 입니다.',
    });
  }
});
router.all('/prof_excel_save', function (req, res, next) {
  models.User.findAll({
    where: req.body.arr
      ? {
          id: JSON.parse(req.body.arr),
          type: 1,
        }
      : {
          type: 1,
        },
  }).then(function (users) {
    var data = [['아이디', '비밀번호', '이름', '이메일', '연락처', '전공']];
    users.forEach(function (user) {
      data.push([
        user.ids,
        '',
        user.name,
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
    });
    var buffer = xlsx.build([
      {
        name: 'cssys_prof_list',
        data: data,
      },
    ]);
    res.setHeader(
      'Content-disposition',
      'attachment; filename=prof_list_' + moment().format('YYYYMMDDHHmmss') + '.xlsx',
    );
    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });
});
//------------------------------------------------------------------------------------------
router.get('/student_list', function (req, res, next) {
  res.render('cssys/guidance/admin/student_list');
});
router.post('/student_list/ajax/get_students', async function (req, res, next) {
  models.User.findAll({
    where: {
      type: 2,
    },
    include: [
      /*{
            // as: 'w_student',
            model: models_w.Student,
            attributes: ['term', 'status'],
        },*/ {
        model: models.Student,
        include: [
          {
            model: models.Prof,
            attributes: ['UserId'],
            include: [
              {
                model: models.User,
                attributes: ['name'],
              },
            ],
          },
        ],
        attributes: ['ProfId', 'state', 'id', 'status', 'updatedAt'],
      },
    ],
    attributes: ['id', 'ids', 'name', 'email', 'phone', 'type', 'major'],
    order: [
      [models.Student, 'status', 'asc'], // 재학, 휴학, 수료, 졸업
      ['updatedAt', 'desc'], // 최근에 배정된 순서
    ],
  }).then(async function (users) {
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      user.Student.dataValues.updatedAt = moment(user.Student.dataValues.updatedAt).format('YYYY년 M월 D일');
      if (user.Student) {
        if (user.Student.dataValues.state == 1) {
          const Log = await models.GPermissionLog.findOne({
            where: {
              StudentId: user.Student.dataValues.id,
            },
            attributes: ['resorreq', 'state', 'ProfId', 'StudentId', 'createdAt'],
            include: [
              {
                model: models.Prof,
                include: [
                  {
                    model: models.User,
                    attributes: ['name'],
                  },
                ],
              },
            ],
            order: [['createdAt', 'DESC']],
          });
          if (Log) {
            if (Log.dataValues.resorreq == 'req' && Log.dataValues.state == true) {
              const Prof = {
                User: {
                  name: Log.dataValues.Prof.User.name,
                },
              };
              users[j].Student.dataValues.Prof = Prof;
            }
          }
        }
      }
    }
    res.send({
      aaData: users,
    });
    /*
        var index = 1;
        users.forEach(function(user) {
            user.dataValues.index = index++;
            delete user.dataValues.password;
        });*/
    /*
        res.send({
            aaData: users
        });*/
  });
});
router.get('/student/:id', function (req, res, next) {
  models.User.findOne({
    where: {
      type: 2,
      id: req.params.id,
    },
    include: [
      {
        model: models.Student,
      },
    ],
  }).then(function (user) {
    if (user) {
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
              '/cssys/guidance/ajax/file/download/' + index + '/' + path.basename(user.Student[index].path);
          user.Student[index].time_ = moment(user.Student[index].time).format('YYYY년 M월 D일');
        }
      });
      res.render('cssys/guidance/admin/student_view', {
        user: user,
        student: user.Student,
      });
    } else next();
  });
});
router.post('/student/:id', upload.any(), function (req, res, next) {
  models.User.findOne({
    where: {
      type: 2,
      id: req.params.id,
    },
    include: [
      {
        model: models.Student,
        include: [
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
  }).then(function (user) {
    if (user) {
      if (req.body.delete) {
        if (user.Student[req.body.delete].id == 1) {
          user.Student[req.body.delete + 'Id'] = null;
          user.Student.save().then(function () {
            res.send({
              result: true,
            });
          });
        } else {
          storage
            .removeStoredFile(user.Student[req.body.delete].path)
            .catch(function () {
              return null;
            })
            .then(function () {
              return user.Student[req.body.delete].destroy();
            })
            .then(function () {
              res.send({
                result: true,
              });
            });
        }
      } else if (req.body.upload) {
        var file = req.files
          ? req.files.find(function (f) {
              return f.fieldname === req.body.upload;
            })
          : null;
        if (!file) {
          res.send({
            result: false,
            text: '파일이 업로드되지 않았습니다.',
          });
        } else {
          var objectKey = storage.makeObjectKey(['guidance', req.body.upload], file.originalname);
          storage
            .uploadTempFile(file.path, objectKey, file.mimetype)
            .then(function () {
              req.body.name = file.originalname;
              req.body.path = objectKey;
              req.body.type = file.mimetype;
              req.body.size = file.size;
              return user.createStudentFile(req.body);
            })
            .then(function (studentfile) {
              if (user.Student[req.body.upload]) {
                storage
                  .removeStoredFile(user.Student[req.body.upload].path)
                  .catch(function () {
                    return null;
                  })
                  .then(function () {
                    return user.Student[req.body.upload].destroy();
                  })
                  .then(function () {
                    return user.Student['set' + req.body.upload.charAt(0).toUpperCase() + req.body.upload.slice(1)](
                      studentfile,
                    );
                  })
                  .then(function () {
                    res.send({
                      result: true,
                    });
                  })
                  .catch(function (err) {
                    next(err);
                  });
              } else {
                user.Student['set' + req.body.upload.charAt(0).toUpperCase() + req.body.upload.slice(1)](
                  studentfile,
                ).then(function () {
                  res.send({
                    result: true,
                  });
                });
              }
            })
            .catch(function (err) {
              next(err);
            });
        }
      }
    } else next();
  });
});
router.get('/student_login/:id', function (req, res, next) {
  // 귀찮아서 위 소스 복사함
  models.User.findOne({
    where: {
      type: 2,
      id: req.params.id,
    },
  }).then(function (user) {
    if (user) {
      req.session.user = user;
      res.redirect('/cssys/guidance/student');
    } else next();
  });
});

router.get('/student_register', function (req, res, next) {
  models.User.findAll({
    order: [['name', 'ASC']],
    include: [models.Prof],
  }).then(function (users) {
    var result = {};
    var majorArr = [
      '전자전기공학부',
      '컴퓨터공학과',
      '반도체시스템공학과',
      '소프트웨어학과',
      '정보통신대학',
      '인터랙션사이언스학과',
      '(미등록)',
    ];
    majorArr.forEach(function (major) {
      result[major] = [];
    });
    users.forEach(function (user) {
      if (user.major === null) user.major = 6;
      result[majorArr[user.major]].push({
        id: user.id,
        name: user.name,
        type: user.type,
        ProfId: user.Prof ? user.Prof.id : null,
      });
    });
    res.render('cssys/guidance/admin/student_register', {
      users: result,
      selectedId: null,
    });
  });
});
router.get('/student_register/:id', function (req, res, next) {
  // 귀찮아서 위 소스 복사함
  models.User.findAll({
    order: [['name', 'ASC']],
    include: [models.Prof],
  }).then(function (users) {
    var result = {};
    var majorArr = [
      '전자전기공학부',
      '컴퓨터공학과',
      '반도체시스템공학과',
      '소프트웨어학과',
      '정보통신대학',
      '인터랙션사이언스학과',
      '(미등록)',
    ];
    majorArr.forEach(function (major) {
      result[major] = [];
    });
    users.forEach(function (user) {
      if (user.major === null) user.major = 6;
      result[majorArr[user.major]].push({
        id: user.id,
        name: user.name,
        type: user.type,
        ProfId: user.Prof ? user.Prof.id : null,
      });
    });
    res.render('cssys/guidance/admin/student_register', {
      users: result,
      selectedId: req.params.id,
    });
  });
});
router.post('/student_register/ajax/get_student', function (req, res, next) {
  models.User.findOne({
    where: {
      id: req.body.id,
      type: 2,
    },
    include: [models_w.Student],
  }).then(function (user) {
    if (user !== null) {
      delete user.dataValues.password;
      res.send(user);
    } else next();
  });
});
router.post('/student_register', function (req, res, next) {
  // guidance student table이랑 work student table update or create
  req.body.type = 2;
  if (req.body.id) {
    // 수정일경우
    models.User.findOne({
      where: {
        id: req.body.id,
        type: 2,
      },
      include: [models_w.Student],
    }).then(function (user) {
      if (user !== null) {
        if (req.body.password === '') req.body.password = user.password;
        else req.body.password = sha256(req.body.password);
        req.body.ids = user.ids; // 보안상 추가
        user.update(req.body).then(async function (user) {
          await models.Student.update(
            {
              term: req.body.term,
              status: req.body.status,
              doublemajor: req.body.doublemajor,
              time: req.body.time,
              ip: req.body.ip,
            },
            { where: { UserId: req.body.id } },
          );
          user.Student.update(req.body).then(function (user) {
            res.send({
              result: true,
            });
          });
        });
      } else next();
    });
  } else {
    // 추가일경우
    models.User.findOne({
      where: {
        ids: req.body.ids,
      },
    }).then(function (user) {
      if (user === null) {
        req.body.password = sha256(req.body.password);
        req.body.SystemId = 1; // default 값으로 입력(생활배정)
        req.body.note = '';
        req.body.comment = '';
        req.body.gryearterm = '';
        req.body.yearterm = '';

        models.User.create(req.body).then(async function (user) {
          const a = await models.Student.create({
            term: req.body.term,
            status: req.body.status,
            doublemajor: req.body.doublemajor,
            state: 0,
            time: req.body.time,
            ip: req.body.ip,
            UserId: user.dataValues.id,
          });
          req.body.UserId = user.id;
          await models_w.Student.create(req.body);
          res.send({
            result: true,
          });
        });
      } else {
        res.send({
          result: false,
          text: '이미 존재하는 아이디 입니다.',
        });
      }
    });
  }
});
router.post('/student_register/ajax/del_student', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      where: {
        id: req.body.id,
        type: 2,
      },
      include: [models_w.Student],
    });
    if (user) {
      await models.Student.destroy({
        where: {
          UserId: user.id,
        },
      });
      if (user.Student) {
        await user.Student.destroy();
      }
      await user.destroy();
      res.send({
        result: true,
      });
    } else next();
  } catch (err) {
    next(err);
  }
});

router.get('/student_excel_register', function (req, res, next) {
  res.render('cssys/guidance/admin/student_excel_register');
});
router.post('/student_excel_register', upload.single('file'), async function (req, res, next) {
  try {
    obj = xlsx.parse(req.file.path);
    fs.unlinkSync(req.file.path);

    obj[0].data.shift(); // 첫번째 행 삭제;

    var text = '';
    var insertCount = 0;
    var updateCount = 0;
    for (var data of obj[0].data) {
      if (data[0]) {
        // 해당 열에 아이디가 존재할 시
        var userTmp = {
          ids: data[0],
          type: 2,
          time: req.body.time,
          ip: req.body.ip,
          Student: {
            time: req.body.time,
            ip: req.body.ip,
          },
        };

        var errFlag = false;
        try {
          if (data[1]) userTmp.password = sha256(data[1].toString());
          if (data[2]) userTmp.name = data[2];
          if (data[3]) userTmp.email = data[3];
          if (data[4]) userTmp.phone = data[4];

          if (data[5]) {
            if (data[5].indexOf('전자전기') >= 0) userTmp.major = 0;
            else if (data[5].indexOf('컴퓨터') >= 0) userTmp.major = 1;
            else if (data[5].indexOf('반도체') >= 0) userTmp.major = 2;
            else if (data[5].indexOf('소프트웨어') >= 0) userTmp.major = 3;
            else if (data[5].indexOf('정보통신') >= 0) userTmp.major = 4;
          }

          if (data[6]) userTmp.Student.term = data[6];

          if (data[7]) {
            if (data[7].indexOf('재학') >= 0) userTmp.Student.status = 0;
            else if (data[7].indexOf('휴학') >= 0) userTmp.Student.status = 1;
            else if (data[7].indexOf('수료') >= 0) userTmp.Student.status = 2;
            else if (data[7].indexOf('졸업') >= 0) userTmp.Student.status = 3;
          }

          if (data[8]) {
            if (data[8].indexOf('논문') >= 0) userTmp.Student.iswork = 0;
            else if (data[8].indexOf('작품') >= 0) userTmp.Student.iswork = 1;
          }

          if (data[9]) {
            if (data[9].indexOf('개인') >= 0) userTmp.Student.isgroup = 0;
            else if (data[9].indexOf('공동') >= 0) userTmp.Student.isgroup = 1;
          }

          if (data[10]) userTmp.Student.title = data[10];

          if (data[11]) {
            if (data[11].indexOf('미심사') >= 0) userTmp.Student.result = 0;
            else if (data[11].indexOf('심사통과') >= 0) userTmp.Student.result = 1;
            else if (data[11].indexOf('재심대상자') >= 0) userTmp.Student.result = 2;
            else if (data[11].indexOf('기합격') >= 0) userTmp.Student.result = 3;
          }

          if (data[12]) userTmp.Student.comment = data[12];

          if (data[13]) userTmp.Student.gryearterm = data[13];

          if (data[14]) {
            if (data[14].indexOf('시스템 시작 전') >= 0) userTmp.Student.SystemId = 1;
            else if (data[14].indexOf('신청서 제출') >= 0) userTmp.Student.SystemId = 3;
            else if (data[14].indexOf('1차 희망 교수 선택') >= 0) userTmp.Student.SystemId = 3;
            else if (data[14].indexOf('1차 지도 학생 선택') >= 0) userTmp.Student.SystemId = 4;
            else if (data[14].indexOf('2차 희망 교수 선택') >= 0) userTmp.Student.SystemId = 5;
            else if (data[14].indexOf('2차 지도 학생 선택') >= 0) userTmp.Student.SystemId = 6;
            else if (data[14].indexOf('3차 희망 교수 선택') >= 0) userTmp.Student.SystemId = 7;
            else if (data[14].indexOf('3차 지도 학생 선택') >= 0) userTmp.Student.SystemId = 8;
            else if (data[14].indexOf('서약서 및 제안서 업로드') >= 0) userTmp.Student.SystemId = 9;
            else if (data[14].indexOf('중간보고서 업로드') >= 0) userTmp.Student.SystemId = 10;
            else if (data[14].indexOf('최종 자료 업로드') >= 0) userTmp.Student.SystemId = 11;
            else if (data[14].indexOf('작품/논문 심사') >= 0) userTmp.Student.SystemId = 12;
            else if (data[14].indexOf('작품/논문 완료') >= 0) userTmp.Student.SystemId = 13;
          }

          if (data[15]) {
            if (data[15].indexOf('아니오') >= 0) userTmp.Student.islock = 0;
            else if (data[15].indexOf('예') >= 0) userTmp.Student.islock = 1;
          }
        } catch (err) {
          errFlag = true;
          text += '[ ' + data[0] + ' ] 유저 데이터 파싱에서 문제가 발생하였습니다.\n';
        }
        if (!errFlag) {
          try {
            // Resolve prof ID if specified
            var profId = null;
            if (data[17]) {
              var profUser = await models.User.findOne({
                where: {
                  name: data[17],
                  type: 1,
                },
                include: [models.Prof],
              });
              if (profUser) profId = profUser.Prof.id;
            }
            if (data[17] && profId) {
              userTmp.Student.ProfId = profId;
              if (data[16]) userTmp.Student.yearterm = data[16];
            }
            var user = await models.User.findOne({
              where: {
                ids: data[0],
              },
              include: [models_w.Student],
            });
            if (user === null) {
              // 아이디 없을시 생성
              try {
                var newUser = await models.User.create(userTmp);
                userTmp.Student.UserId = newUser.id;
                userTmp.Student.state = 0;
                const result1 = await models.Student.create(userTmp.Student);
                const result2 = await models_w.Student.create(userTmp.Student);
                if (!result1 || !result2) {
                  if (result1) {
                    await models.Student.destroy({ where: { Userid: newUser.id } });
                  }
                  if (result2) {
                    await models_w.Student.destroy({ where: { Userid: newUser.id } });
                  }
                  await models.User.destroy({ where: { id: newUser.id } });
                  text += '[ ' + data[0] + ' ] 유저의 학생정보 생성에서 문제가 발생하였습니다.\n';
                } else {
                  insertCount++;
                }
              } catch (errors) {
                text += '[ ' + data[0] + ' ] 유저 생성에서 문제가 발생하였습니다.\n';
              }
            } else {
              // 아이디 존재함, 업데이트
              for (var key in userTmp) {
                if (key == 'Student') {
                  for (var key_2 in userTmp.Student) {
                    user.Student[key_2] = userTmp.Student[key_2];
                  }
                } else user[key] = userTmp[key];
              }
              try {
                await user.save();
                try {
                  var student = await user.Student.save();
                  await models.Student.update(
                    {
                      // state, id, ProfId, UserId update 안함
                      term: student.term,
                      status: student.status,
                      doublemajor: student.doublemajor,
                    },
                    { where: { UserId: user.id } },
                  );
                  updateCount++;
                } catch (errors) {
                  text += '[ ' + data[0] + ' ] 유저의 학생정보 수정에서 문제가 발생하였습니다.\n';
                }
              } catch (errors) {
                text += '[ ' + data[0] + ' ] 유저 수정에서 문제가 발생하였습니다.\n';
              }
              /* 에러나서 위 루틴으로 바꿈 (원인은 모르겠음)
                            user.update(userTmp).then(function(user) {
                                user.Student.update(userTmp.Student).then(function(user) {
                                    updateCount++;
                                }).error(function(errors) {
                                    text += "[ " + data[0] + " ] 유저의 학생정보 수정에서 문제가 발생하였습니다.\n";
                                });
                            }).error(function(errors) {
                                text += "[ " + data[0] + " ] 유저 수정에서 문제가 발생하였습니다.\n";
                            });
                            */
            }
          } catch (e) {
            text += '[ ' + data[0] + ' ] 처리 중 오류가 발생하였습니다.\n';
          }
        }
      }
    }
    if (insertCount > 0) text += '총 ' + insertCount + '개 계정이 추가되었습니다.\n';
    if (updateCount > 0) text += '총 ' + updateCount + '개 계정이 수정되었습니다.\n';
    res.send({
      result: true,
      text: text,
    });
  } catch (err) {
    res.send({
      result: false,
      text: '잘못된 파일 입니다.',
    });
  }
});

//------------------------------------------------------------------------------------------
router.get('/qna', function (req, res, next) {
  res.redirect('/cssys/guidance/admin/qna/list');
});
router.get('/qna/list', function (req, res, next) {
  res.render('cssys/guidance/admin/qna_list');
});
router.get('/qna/write', function (req, res, next) {
  res.render('cssys/guidance/admin/qna_write');
});
router.get('/qna/view/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/qna_view', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/qna/reply/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/qna_reply', {
    id: req.params.id, // ajax 요청할때 사용
  });
});
router.get('/qna/modify/:id', function (req, res, next) {
  res.render('cssys/guidance/admin/qna_modify', {
    id: req.params.id, // ajax 요청할때 사용
  });
});

//------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

router.post('/permission/ajax/get_permissions', function (req, res, next) {
  models.Permission.findAll({
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
  }).then(function (permissions) {
    var index = 0;

    if (permissions) {
      permissions.forEach(function (permission) {
        permission.dataValues.index = ++index;
        if (permission.Student) delete permission.Student.User.password;
        if (permission.Prof) delete permission.Prof.User.password;
        if (permission.firstProf) delete permission.firstProf.User.password;
        if (permission.secondProf) delete permission.secondProf.User.password;
        if (permission.thirdProf) delete permission.thirdProf.User.password;
      });
    }
    res.send({
      aaData: permissions,
    });
  });
});

router.post('/permission/ajax/cancel_selection', function (req, res, next) {
  //신청 배정현황의 학생 선택 취소버튼
  models.Permission.update(
    {
      firstSelected: 0,
      secondSelected: 0,
      thirdSelected: 0,
    },
    {
      where: { id: req.body.perid },
    },
  ).then(function (permission) {
    res.send({ result: true });
  });
});

//------------------------------------------------------------------------------------------
router.get('/paperwork', function (req, res, next) {
  res.render('cssys/guidance/admin/paperwork');
});
router.post('/paperwork/ajax/get_paperworks', function (req, res, next) {
  models.User.findAll({
    where: {
      type: 2,
    },
    include: [
      {
        model: models.Student,
        include: [
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
  }).then(function (users) {
    var index = 1;
    users.forEach(function (user) {
      user.dataValues.index = index++;
      delete user.dataValues.password;
      ['oath', 'proposal', 'midreport', 'finalreport', 'paperwork', 'presentation', 'conference'].forEach(
        function (index) {
          if (user.Student[index])
            user.Student[index].dataValues.link =
              '/cssys/guidance/ajax/file/download/' + index + '/' + path.basename(user.Student[index].path);
        },
      );
    });
    res.send({
      aaData: users,
    });
  });
});
router.get('/paperwork/application/:id', function (req, res, next) {
  models.User.findOne({
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
  }).then(function (user) {
    if (user) {
      user.Student.StudentInfo.time_ = moment(user.Student.StudentInfo.time).format('YYYY년 M월 D일');
      console.log(user.Student.StudentInfo);
      res.render('cssys/guidance/admin/paperwork_application', {
        user: user,
        student: user.Student,
      });
    } else next();
  });
});

router.get('/prof/:prof_id/status', async (req, res) => {
  // 특정 교수 현황 조회
  // 누가 교수와 배정, 신청, 취소 상황인지 보여줌
  const prof_id = await models.Prof.findOne({
    where: {
      UserId: req.params.prof_id,
    },
    attributes: ['id'],
  });
  const Profid = prof_id.dataValues.id; // Profid: prof 테이블의 id

  // 1. 배정 완료된 학생 정보 불러오기
  const student = await models.User.findAll({
    where: {
      id: req.params.prof_id,
    },
    attributes: ['name', 'email', 'phone', 'major', 'time'],
    include: [
      {
        model: models.Prof,
        attributes: ['id'],
        include: [
          {
            model: models.Student,
            where: {
              state: 2,
            },
            attributes: ['term', 'status', 'doublemajor', 'note', 'state', 'time'],
            include: [
              {
                model: models.User,
                attributes: ['ids', 'name'],
              },
            ],
          },
        ],
      },
    ],
    order: [[models.Prof, models.Student, models.User, 'name', 'ASC']],
  });
  //2. 신청한 학생들(배정 x) 조회

  // 로그 기록과 현재 student 상태 이용해서 특정 교수에게 신청한 student 정보(학생이름, 사유서 등등) 불러올 수 있음
  const Nstudents = await models.Student.findAll({
    // 학생 목록
    where: {
      ProfId: null,
      state: 1,
    },
    attributes: ['id', 'term', 'status', 'doublemajor', 'note', 'state', 'ProfId', 'UserId'],
    include: [
      {
        model: models.User,
        attributes: ['name'],
      },
    ],
    order: [[models.User, 'name', 'asc']],
  });

  const Nstu = await Promise.all(
    Nstudents.map(async (stu) => {
      const Log = await models.GPermissionLog.findOne({
        // 최신 로그가 우리가 원하는 교수에게 신청한 경우 check
        where: {
          resorreq: 'req',
          state: 1,
          ProfId: Profid,
        },
        order: [['createdAt', 'DESC']],
      });
      if (Log) {
        return Promise.resolve(stu.dataValues);
      }
    }),
  );

  // result안에 넣기
  let result = {};
  if (student.length != 0) {
    student[0].dataValues.Prof ? (result.aaData = student[0].Prof.Students) : (result.aaData = student);
  } else {
    result.aaData = student;
  }
  result.aaData.concat(Nstu);
  let index = 1;
  result.aaData = await Promise.all(
    result.aaData.map(async (i) => {
      i.dataValues.index = index++;
      return Promise.resolve(i);
    }),
  );
  res.send(result);
});

router.get('/student/:student_id/status', async (req, res) => {
  // 학생 상황 조사
  const student = await models.Student.findOne({
    where: {
      UserId: req.params.student_id,
      // status: 0
      /*
            include: [{
                model: models.Prof
            }]*/
    },
    attributes: ['id', 'term', 'status', 'doublemajor', 'note', 'state', 'time', 'ProfId'],
  });
  let data = {};
  if (!!student) {
    // 초기 학생
    if (!student.ProfId && student.state == 0) {
      // 신청하기 전 상태
      data.result = true;
      data.message = 'This student did not apply any professor';
    } else if (!student.ProfId && student.state == 1) {
      // 교수한테 신청한 상황(배정x)
      const Prof = await models.GPermissionLog.findAll({
        // findOne이 가능할려나
        where: {
          StudentId: student.dataValues.id,
          // ProfId: Profid,
          resorreq: 'req',
          state: '1',
        },
        attributes: ['StudentId', 'ProfId', 'createdAt'],
        include: [
          {
            model: models.Prof,
            attributes: ['id', 'UserId'],
            include: [
              {
                model: models.User, // 교수 내용
                attributes: ['id', 'name', 'email', 'phone', 'type', 'major'],
              },
            ],
          },
        ],
        order: [
          // [models.Student, {model: models.User}, 'name', 'asc'],
          ['createdAt', 'desc'], // 항상 최신 버전으로
        ],
      });
      data.prof = Prof[0].dataValues.Prof.dataValues.User.dataValues;
      data.student = student.dataValues;
      data.result = true;
      data.message = 'Unassgined';
    } else if (!!student.ProfId && student.state == 2) {
      // 배정된 상황
      const Prof = await models.Prof.findOne({
        where: {
          id: student.dataValues.ProfId,
        },
        include: [
          {
            model: models.User,
            attributes: ['id', 'name', 'email', 'phone', 'type', 'major'],
          },
        ],
      });
      data.student = student.dataValues;
      data.prof = Prof.dataValues.User.dataValues;
      data.result = true;
      data.message = 'Assgined';
    } else if (!student.ProfId && student.state == 1) {
      // 취소한 상황
      data.student = student.dataValues;
      data.message = 'This student has been canceled';
      data.result = true;
    } else {
      // error
      data.result = false;
      data.message = 'error';
    }
  } else {
    // 학생 계정 처음 만들어지고 나서 or 교수, 어드민인 경우
    data.result = true;
    data.message = 'This student did not apply any professor or he is not a student';
  }
  res.send(data);
});

router.get('/guidance_status_excel', async (req, res) => {
  let data = [
    [
      '학번', // 0
      '이름', // 1
      '학과', // 2
      '학기', // 3
      '상태', // 4
      '현재 지도교수', // 5
      '현재 지도교수 소속학과', // 6
      '배정 일시', // 7
      '배정 상태', // 8
    ],
  ];

  const Student = await models.User.findAll({
    where: {
      type: 2, // 학생 유저
    },
    attributes: ['id', 'ids', 'name', 'major'],
    include: [
      {
        model: models.Student,
        attributes: ['id', 'term', 'status', 'state', 'ProfId', 'updatedAt'],
        include: [
          {
            // 교수 정보 불러오기
            model: models.Prof,
            attributes: ['id', 'UserId'],
            include: [
              {
                model: models.User,
                attributes: ['name', 'major'],
              },
            ],
          },
        ],
      },
    ],
    order: [
      // (재학, 휴학, 수료, 졸업) -> (미배정, 신청중, 배정) -> (학기 순) -> 이름 순
      [models.Student, 'status', 'asc'],
      [models.Student, 'state', 'asc'],
      [models.Student, 'term', 'asc'],
      ['name', 'asc'],
    ],
  });

  for (let i = 0; i < Student.length; i++) {
    const user = Student[i];
    let row = ['', '', '', 0];
    // 0: 현재 지도교수, 1: 현재 지도교수 소속학과, 2: 배정 일시, 3: 배정 상태(0: 미배정, 1: 대기 중, 2: 배정 완료)

    if (user.Student) {
      // user, g_student table이 동시에 있는 경우에만
      if (!!user.Student.Prof && user.Student.state == 2) {
        // 배정 확정인 경우
        // 현재
        row[0] = `${user.Student.Prof.User.name}`;
        row[1] = `${['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과'][user.Student.Prof.User.major]}`;
        row[2] = `${user.Student.updatedAt.getFullYear()}.${user.Student.updatedAt.getMonth()}.${user.Student.updatedAt.getDate()}`;

        // 배정 현황
        row[3] = 2; // 배정
      } else if (!user.Student.Prof && user.Student.state == 1) {
        // 신청한 상태인 경우
        row[3] = 1; // 대기 중
        /*
                const Log = await models.GPermissionLog.findOne({ // 그 유저가 업데이트한 최신 로그 가져오기
                    where: {
                        StudentId: user.Student.id
                    },
                    include : [{
                        model: models.Prof,
                        include: [{
                            model: models.User,
                            attributes: ['name', 'major']
                        }],
                        // attributes: []
                    }],
                    attributes: ['id', 'createdAt', 'ProfId', 'resorreq', 'state'],
                    order: [['createdAt', 'desc'], ['id', 'desc']]
                });
                if (Log) {
                    if (Log.resorreq == 'req' && Log.state == 1) { // 신청 상태인 경우만
                        // 변경 파트
                        row[3] = `${Log.createdAt.getFullYear()}.${Log.createdAt.getMonth()}.${Log.createdAt.getDate()}`;
                        row[4] = `${Log.Prof.User.name}`
                        row[5] = `${['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학'][Log.Prof.User.major]}`
                        // row[6] = 0; 미배정
                    }
                }
                */
      } else if (!user.Student.Prof && user.Student.state == 0) {
        // 신청 안한 경우
        row[3] = 0; // 미배정
      } else {
        row[3] = 3; // 오류
      }
    } else {
      row[3] = 3; // 오류
    }
    // 오류 발생 원인
    /*
        1. cssys_guidance_student 에 값이 없는 경우
        2. cssys_guidance_student의 값이 state가 null 인 경우 등등
        */

    data.push([
      user.ids, // 학번
      user.name, // 이름
      [
        '전자전기공학부',
        '컴퓨터공학과',
        '반도체시스템공학과',
        '소프트웨어학과',
        '정보통신대학',
        '인터랙션사이언스학과',
      ][user.major], // 학과
      user.Student.term, // 학기
      ['재학', '휴학', '수료', '졸업'][user.Student.status], // 상태
      row[0], // 현재 지도교수
      row[1], // 현재 지도교수 소속학과
      row[2], // 배정 일시
      ['미배정', '신청', '배정', '오류'][row[3]], // 배정 상태
    ]);
  }
  const buffer = xlsx.build([
    {
      name: 'cssys_guidance_status',
      data: data,
    },
  ]);
  res.setHeader(
    'Content-disposition',
    'attachment; filename=guidance_student_list(' + moment().format('YYYYMMDDHHmmss') + ').xlsx',
  );
  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

router.post('/guidance_regi_excel', upload.single('file'), async (req, res) => {
  let resExcel = [
    [
      '학번', // 0
      '이름', // 1
      '비고', // 2
    ],
  ];

  let response = {
    result: true,
    binary: null,
    error: null,
    fileName: '',
  };

  if (!req.file) {
    response.result = false;
    response.error = '파일을 업로드해주세요.';
    res.send(response);
    return;
  }

  obj = xlsx.parse(req.file.path);
  // fs.unlinkSync(req.file.path);
  // const row = obj[0].data[0];

  obj[0].data.shift();
  let duplicateArr = []; // 중복성 체크하는 배열
  for (let i = 0; i < obj[0].data.length; i++) {
    const data = obj[0].data[i];
    let resrow = ['', '', ''];
    // 0 순번, 1 학번, 2 사유
    if (!!data[0] && !!data[1]) {
      // 학번이랑 이름만 있는 경우에만
      // 1. 학번(ids)으로 조회
      const User = await models.User.findOne({
        where: {
          type: 2,
          ids: data[0], // 학번
          name: data[1], // 이름
        },
        include: [
          {
            model: models.Student,
            attributes: ['id', 'term', 'state'],
            include: [
              {
                model: models.Prof,
                attributes: ['id', 'UserId'],
                include: [
                  {
                    model: models.User,
                    attributes: ['name', 'major'],
                  },
                ],
              },
            ],
          },
        ],
        attributes: ['id', 'ids', 'name', 'major'],
      });
      if (!!User && !!User.dataValues.Student) {
        const Dupnum = duplicateArr.filter((i) => i == User.dataValues.ids); // 중복성 체크
        if (Dupnum.length == 0) {
          duplicateArr.push(User.dataValues.ids); // 중복 확인을 위해 학번을 배열에 넣는다.
          if (!!data[5] && !!data[6]) {
            // !!data[6] 교수 이름 있는 경우(일단 학과 안 적혀 있는 경우로만 코딩)
            // 지도교수와 소속학과가 동시에 적혀 있는 경우에만... 작동
            const majors = {
              전자전기공학부: 0,
              컴퓨터공학과: 1,
              반도체시스템공학과: 2,
              소프트웨어학과: 3,
              정보통신대학: 4,
              인터랙션사이언스학과: 5,
            };
            const Prof = await models.User.findOne({
              where: {
                type: 1,
                name: data[5],
                major: majors[data[6]],
              },
              include: [
                {
                  model: models.Prof,
                  attributes: ['id', 'UserId'],
                },
              ],
              attributes: ['id', 'ids', 'name', 'type', 'major'],
            });
            if (!!Prof && !!Prof.dataValues.Prof) {
              // 1. 원래 배정되어 있던 애인지 확인
              if (User.dataValues.Student.state == 2) {
                if (Prof.dataValues.id != User.Student.Prof.UserId) {
                  // 교수님이 변경된 경우
                  // 1. Student 학생의 state을 2로 고정(확정)
                  await models.Student.update(
                    { state: 2, ProfId: Prof.dataValues.Prof.dataValues.id },
                    { where: { id: User.dataValues.Student.dataValues.id } },
                  );
                  // 2. 로그 생성
                  // 2-1. 기존 교수 취소 로그
                  await models.GPermissionLog.create({
                    resorreq: 'req',
                    state: 0,
                    text: '   관리자 권한으로 배정이 취소되었습니다.   ',
                    ProfId: User.Student.Prof.dataValues.id,
                    StudentId: User.dataValues.Student.dataValues.id,
                  });
                  // 2-2. 새 교수 신청 로그
                  await models.GPermissionLog.create({
                    resorreq: 'req',
                    state: 1,
                    ProfId: Prof.dataValues.Prof.dataValues.id,
                    StudentId: User.dataValues.Student.dataValues.id,
                  });
                  // 2-3. 새 교수 수락 로그
                  await models.GPermissionLog.create({
                    resorreq: 'res',
                    state: 1,
                    ProfId: Prof.dataValues.Prof.dataValues.id,
                    StudentId: User.dataValues.Student.dataValues.id,
                  });

                  resrow[0] = data[0]; // 학번
                  resrow[1] = data[1]; // 이름
                  resrow[2] = `성공`;
                  resExcel.push(resrow);
                } // 동일한 교수님일 경우 pass
              } else {
                // 배정이 안되어 있던 경우
                await models.Student.update(
                  { state: 2, ProfId: Prof.dataValues.Prof.dataValues.id },
                  { where: { id: User.dataValues.Student.dataValues.id } },
                );
                // 2. 로그 생성
                // 2-1. 교수 신청 로그
                await models.GPermissionLog.create({
                  resorreq: 'req',
                  state: 1,
                  ProfId: Prof.dataValues.Prof.dataValues.id,
                  StudentId: User.dataValues.Student.dataValues.id,
                });
                // 2-2. 교수 수락 로그
                await models.GPermissionLog.create({
                  resorreq: 'res',
                  state: 1,
                  ProfId: Prof.dataValues.Prof.dataValues.id,
                  StudentId: User.dataValues.Student.dataValues.id,
                });

                resrow[0] = data[0]; // 학번
                resrow[1] = data[1]; // 이름
                resrow[2] = `성공`;
                resExcel.push(resrow);
              }
            } else {
              // 교수가 prof 테이블에 존재하지 않는 경우
              resrow[0] = data[0]; // 학번
              resrow[1] = data[1]; // 이름
              resrow[2] = `실패 (사유: ${data[5]}(${data[6]}) 교수가 존재하지 않습니다.)`;
              resExcel.push(resrow);
            }
          } else if (!data[5] && !!data[6]) {
            // 교수 이름을 적지 않은 경우
            resrow[0] = data[0]; // 학번
            resrow[1] = data[1]; // 이름
            resrow[2] = `실패 (사유: 해당 교수의 성함을 적지 않았습니다.)`;
            resExcel.push(resrow);
          } else if (!!data[5] && !data[6]) {
            // 교수 소속학과를 적지 않은 경우
            resrow[0] = data[0]; // 학번
            resrow[1] = data[1]; // 이름
            resrow[2] = `실패 (사유: 해당 교수의 소속학과를 적지 않았습니다.)`;
            resExcel.push(resrow);
          } /* else { // 확정된 지도교수가 없는 경우
                        // 에러 메시지는 적지 않는 거로...
                        resrow[0] = data[0] // 학번
                        resrow[1] = data[1] // 이름
                        resrow[2] = `주의 (사유: 해당 학생은 배정이 되지 않았습니다.)`
                        resExcel.push(resrow);
                    } */
        } else {
          // 중복이 된 경우
          resrow[0] = data[0]; // 학번
          resrow[1] = data[1]; // 이름
          resrow[2] = `실패: (사유: 값이 중복되었습니다.)`;
          resExcel.push(resrow);
        }
      } else {
        // 학번 조회 실패
        // case 1 User table에 없는 경우
        // case 2 guidance student table에 없는 경우
        resrow[0] = data[0]; // 학번
        resrow[1] = data[1]; // 이름
        resrow[2] = `실패 (사유: 해당 학생이 존재하지 않습니다.)`;
        resExcel.push(resrow);
      }
    } else if (!data[0] && !!data[1]) {
      // 학생 학번을 적지 않은 경우
      resrow[1] = data[1]; // 이름
      resrow[2] = `실패 (사유: 해당 학생의 학번을 적지 않았습니다.)`;
      resExcel.push(resrow);
    } else if (!!data[0] && !data[1]) {
      // 학생 이름을 적지 않은 경우
      resrow[0] = data[0]; // 학번
      resrow[2] = `실패 (사유: 해당 학생의 이름을 적지 않았습니다.)`;
      resExcel.push(resrow);
    } // 둘다 안 적은 경우는 pass
  }

  if (resExcel.length == 1) {
    resExcel.push(['변동 사항이 없습니다.']);
  }
  // res.send 하기 전 엑셀 만들기
  const buffer = xlsx.build([
    {
      name: 'cssys_guidance_result',
      data: resExcel,
    },
  ]);
  // res.setHeader('Content-disposition', 'attachment; filename=guidance_result_' + moment().format("YYYYMMDDHHmmss") + '.xlsx');
  // res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  console.log(typeof buffer);
  response.binary = buffer;
  response.fileName = 'guidance_result_' + moment().format('YYYYMMDDHHmmss') + '.xlsx';
  res.send(response);
});

router.get('/assigned_excel_register', function (req, res, next) {
  res.render('cssys/guidance/admin/assigned_excel_register');
});

router.post('/db_gudance_student', async function (req, res) {
  // cssys_guidacne_student 비어 있는 경우 생성을 위한 api

  const Users = await models.User.findAll({
    where: {
      type: 2,
    },
    include: [
      {
        model: models_w.Student,
        attributes: ['term', 'status', 'doublemajor'],
      },
    ],
    attributes: ['id', 'name'],
  });

  Users.forEach(async (e) => {
    await models.Student.create({
      term: e.Student.term,
      status: e.Student.status,
      doublemajor: e.Student.doublemajor,
      time: req.session.user.time,
      ip: req.session.user.ip,
      UserId: e.id,
    });
  });

  res.send({ result: true });
});

module.exports = router;
