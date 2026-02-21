var config = require('../../config');
var models = require('../../models/cssys_work');
var models_ = require('../../models/cssys');
const models_g = require('../../models/cssys_guidance');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var async = require('async');
var sha256 = require('sha256');
var moment = require('moment');
var xlsx = require('node-xlsx');
var schedule = require('node-schedule');
var mkdirp = require('mkdirp');
var path = require('path');

// 어드민 로그인 인증 예외 처리
router.all('*', function(req, res, next) {
    if (req.session.user.type === 0) next();
    else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function(req, res, next) {
    res.redirect('/cssys/work/admin/main');
});

//------------------------------------------------------------------------------------------
router.get('/main', function(req, res, next) {
    async.series({
            loginLog: function(callback) {
                models_.UserLog.findAll({
                    where: {
                        ids: 'admin'
                    },
                    order: 'time desc',
                    limit: 5
                }).then(function(userLog) {
                    userLog.forEach(function(log) {
                        log.time_ = moment(log.time).format("YYYY-MM-DD HH:mm:ss");
                    });
                    callback(null, userLog);
                });
            },
            loginCnt: function(callback) {
                models_.UserLog.count({
                    where: {
                        success: 1
                    }
                }).then(function(count) {
                    callback(null, count);
                });
            },
            loginTodayCnt: function(callback) {
                models_.UserLog.count({
                    where: {
                        success: 1,
                        time: {
                            gt: moment(new Date()).format("YYYY-MM-DD")
                        }
                    }
                }).then(function(count) {
                    console.log(count);
                    callback(null, count);
                });
            },
            systemsData: function(callback) {
                models.User.findAll({
                    where: {
                        type: 2
                    },
                    include: [{
                        model: models.Student
                    }]
                }).then(function(users) {
                    models.System.findAll().then(function(systems) {
                        var unUserCnt = 0;
                        users.forEach(function(user) {
                            if (user.status == 1 || user.status == 3 || user.Student.SystemId == 1 || user.Student.SystemId == 13) unUserCnt++;
                        });
                        systems.forEach(function(system) {
                            system.start_ = moment(system.start).format("YYYY-MM-DD");
                            system.end_ = moment(system.end).add(1, 'day').format("YYYY-MM-DD");
                            system.userCnt = 0;
                            system.userCmpCnt = 0;
                            system.unUserCnt = 0;
                            users.forEach(function(user) {
                                if (system.id == user.Student.SystemId) {
                                    system.userCnt++;
                                    if (user.status == 1 || user.status == 3) system.unUserCnt++;
                                    if (system.id == 2 && user.Student.StudentInfoId || system.id == 9 && user.Student.oathId && user.Student.proposalId || system.id == 10 && user.Student.midreportId || system.id == 11 && user.Student.finalreportID && user.Student.paperworkId || system.id == 12 && user.Student.result !== 0) system.userCmpCnt++;
                                }
                            });
                        });
                        callback(null, {
                            systems: systems,
                            users: users,
                            unUserCnt: unUserCnt
                        });
                    });
                });
            },
        },
        function(err, results) {
            res.render('cssys/work/admin/main', {
                loginLog: results.loginLog,
                loginCnt: results.loginCnt,
                loginTodayCnt: results.loginTodayCnt,
                systems: results.systemsData.systems,
                users: results.systemsData.users,
                unUserCnt: results.systemsData.unUserCnt
            });
        });
});

//------------------------------------------------------------------------------------------
router.get('/notice_prof', function(req, res, next) {
    res.redirect('/cssys/work/admin/notice_prof/list');
});
router.get('/notice_prof/list', function(req, res, next) {
    res.render('cssys/work/admin/notice_prof_list');
});
router.get('/notice_prof/write', function(req, res, next) {
    res.render('cssys/work/admin/notice_prof_write');
});
router.get('/notice_prof/view/:id', function(req, res, next) {
    res.render('cssys/work/admin/notice_prof_view', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/notice_prof/reply/:id', function(req, res, next) {
    res.render('cssys/work/admin/notice_prof_reply', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/notice_prof/modify/:id', function(req, res, next) {
    res.render('cssys/work/admin/notice_prof_modify', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/notice_student', function(req, res, next) {
    res.redirect('/cssys/work/admin/notice_student/list');
});
router.get('/notice_student/list', function(req, res, next) {
    res.render('cssys/work/admin/notice_student_list');
});
router.get('/notice_student/write', function(req, res, next) {
    res.render('cssys/work/admin/notice_student_write');
});
router.get('/notice_student/view/:id', function(req, res, next) {
    res.render('cssys/work/admin/notice_student_view', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/notice_student/reply/:id', function(req, res, next) {
    res.render('cssys/work/admin/notice_student_reply', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/notice_student/modify/:id', function(req, res, next) {
    res.render('cssys/work/admin/notice_student_modify', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/example', function(req, res, next) {
    res.redirect('/cssys/work/admin/example/list');
});
router.get('/example/list', function(req, res, next) {
    res.render('cssys/work/admin/example_list');
});
router.get('/example/write', function(req, res, next) {
    res.render('cssys/work/admin/example_write');
});
router.get('/example/view/:id', function(req, res, next) {
    res.render('cssys/work/admin/example_view', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/example/reply/:id', function(req, res, next) {
    res.render('cssys/work/admin/example_reply', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/example/modify/:id', function(req, res, next) {
    res.render('cssys/work/admin/example_modify', {
        id: req.params.id // ajax 요청할때 사용
    });
});
//------------------------------------------------------------------------------------------
router.get('/prof_list', function(req, res, next) {
    res.render('cssys/work/admin/prof_list');
});
router.post('/prof_list/ajax/get_profs', function(req, res, next) {
    /*models.User.findAll({
        where: {
            type: 1
        }
    }).then(function(users) {
        var index = 1;
        users.forEach(function(user) {
            user.dataValues.index = index++;
            delete user.dataValues.password;
        });
        res.send({
            aaData: users
        });
    });*/
    models.Student.findAll({
        where: {
            yearterm: {
                $in: [new Date().getFullYear(),new Date().getFullYear()+'01', new Date().getFullYear()+'02'],
            },
        },
        attributes: ['ProfId', [models.sequelize.fn('count', '*'),'count']],
        group: 'ProfId'
    }).then(function(assigned){
        models.Prof.findAll({
            include:[
                {
                    model: models.User,
                    attributes: ['id', 'ids', 'name', 'email', 'phone', 'major'],
                    where: {
                        type: 1,
                    },
                },
            ]
        }).then(async function(users) {
            var index = 1;
            users.forEach(function(user) {
                user.dataValues.index = index++;
                const a = assigned.filter(i => i.ProfId === user.id);
                if(a[0]){
                    user.dataValues.assigned = {
                        num: a[0].dataValues.count,
                        total: 8
                    }
                } else {
                    user.dataValues.assigned = {
                        num: 0,
                        total: 8
                    }
                }
            });
            res.send({ 
                aaData: users
            });
        });
    })
});

router.get('/student_list/excel/:id',function(req,res,next){
    var data=[];

    models.User.findAll({
        where: {
            type: 2
        },
        include: [{
            model: models.Student,
            include: [{
                    model: models.Prof,
                    where: {
                        UserId: req.params.id
                    }
                },
            models.System
            ]
        }],
        order: 'SystemId,ids'
    }).then(function(users) {
        var data = [
            [   '#',
                '아이디',
                '이름',
                '재학 여부',
                '복수전공 여부',
                '이메일',
                '연락처',
                '전공'
            ]
        ];
        var index=1;
        users.forEach(function(user) {

                data.push([
                    index,
                    user.ids,
                    user.name,
                    ['재학','휴학','수료','졸업'][user.Student.status],
                    ['X','O'][user.Student.doublemajor?1:0],
                    user.email,
                    user.phone,
                    ['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과'][user.major],

                ]);
                index++;
            });
            var buffer = xlsx.build([{
                name: "cssys_student_list",
                data: data
            }]);
            res.setHeader('Content-disposition', 'attachment; filename=student_list_' + moment().format("YYYYMMDDHHmmss") + '.xlsx');
            res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        });
    });

router.get('/prof/:id', function(req, res, next) {
    models.User.findOne({
        where: {
            type: 1,
            id: req.params.id
        }
    }).then(function(user) {
        if (user) {
            res.render('cssys/work/admin/prof_view', {
                user: user,
            });
        } else next();
    });
});
router.post('/prof/:id/ajax/get_students', function(req, res, next) {
    models.User.findAll({
        where: {
            type: 2
        },
        include: [{
            model: models.Student,
            include: [{
                    model: models.Prof,
                    where: {
                        UserId: req.params.id
                    }
                },
                models.System
            ]
        }],
        order: 'SystemId,ids'
    }).then(function(users) {
        var index = 1;
        users.forEach(function(user) {
            user.dataValues.index = index++;
            user.Student.System.dataValues.isNow = ((new Date()) > user.Student.System.start && (new Date()) < user.Student.System.end);
            let a = user.Student.dataValues.state;
            //[1의 자리=제안서, 10의 자리=중간보고서, 100의자리=최종보고서]
            user.Student.dataValues.state = [a%10, parseInt((a%100)/10), parseInt(a/100)];
            delete user.dataValues.password;
        });
        res.send({
            aaData: users
        });
    });
});
router.get('/prof_login/:id', function(req, res, next) { // 귀찮아서 위 소스 복사함
    models.User.findOne({
        where: {
            type: 1,
            id: req.params.id
        }
    }).then(function(user) {
        if (user) {
            req.session.user = user;
            res.redirect('/cssys/work/prof');
        } else next();
    });
});
router.get('/prof_register', function(req, res, next) {
    models.User.findAll({
        where: {
            type: 1
        }
    }).then(function(users) {
        var result = {};
        var majorArr = ['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과', '(미등록)'];
        majorArr.forEach(function(major) {
            result[major] = [];
        });
        users.forEach(function(user) {
            if (user.major === null) user.major = 5;
            result[majorArr[user.major]].push({
                id: user.id,
                name: user.name
            });
        });
        res.render('cssys/work/admin/prof_register', {
            data: result
        });
    });
});
router.get('/prof_register/:id', function(req, res, next) { // 귀찮아서 위 소스 복사함
    models.User.findAll({
        where: {
            type: 1
        }
    }).then(function(users) {
        var result = {};
        var majorArr = ['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과', '(미등록)'];
        majorArr.forEach(function(major) {
            result[major] = [];
        });
        users.forEach(function(user) {
            if (user.major === null) user.major = 5;
            result[majorArr[user.major]].push({
                id: user.id,
                name: user.name
            });
        });
        res.render('cssys/work/admin/prof_register', {
            data: result,
            selectedId: req.params.id
        });
    });
});

router.post('/prof_register/ajax/get_prof', function(req, res, next) {
    models.User.findOne({
        where: {
            id: req.body.id,
            type: 1
        }
    }).then(function(user) {
        if (user !== null) {
            delete user.dataValues.password;
            res.send(user);
        } else next();
    });
});
router.post('/prof_register', function(req, res, next) {
    if (req.body.id) { // 수정일경우
        models.User.findOne({
            where: {
                id: req.body.id,
                type: 1
            }
        }).then(function(user) {
            if (user !== null) {
                if (req.body.password === "") req.body.password = user.password;
                else req.body.password = sha256(req.body.password);
                req.body.time = new Date();
                req.body.ip = req.ip;
                user.updateAttributes(req.body).then(function(user) {
                    res.send({
                        result: true
                    });
                });
            } else next();
        });
    } else { // 추가일경우
        models.User.findOne({
            where: {
                ids: req.body.ids
            }
        }).then(function(user) {
            if (user === null) {
                req.body.type = 1;
                req.body.password = sha256(req.body.password);
                req.body.time = new Date();
                req.body.ip = req.ip;
                models.User.create(req.body).then(function(user) {
                    user.createProf({}).then(function(user) {
                        res.send({
                            result: true
                        });
                    });
                });
            } else {
                res.send({
                    result: false,
                    text: '이미 존재하는 아이디 입니다.'
                });
            }
        });
    }
});
router.post('/prof_register/ajax/del_prof', function(req, res, next) {
    models.User.findOne({
        where: {
            id: req.body.id,
            type: 1
        },
        include: [
            models.Prof
        ]
    }).then(function(user) {
        if (user && user.Prof) {
            user.Prof.destroy().then(function() {
                user.destroy().then(function() {
                    res.send({
                        result: true
                    });
                });
            });
        } else next();
    });
});
router.get('/prof_excel_register', function(req, res, next) {
    res.render('cssys/work/admin/prof_excel_register');
});
router.post('/prof_excel_register', function(req, res, next) {
    try {
        obj = xlsx.parse(req.files.file.path);
        fs.unlinkSync(req.files.file.path);

        obj[0].data.shift(); // 첫번째 행 삭제;

        var text = '';
        var insertCount = 0;
        var updateCount = 0;
        async.each(obj[0].data, function(data, callback) {
            if (data[0]) { // 해당 열에 아이디가 존재할 시
                var userTmp = {
                    ids: data[0],
                    type: 1,
                    time: req.body.time,
                    ip: req.body.ip,
                    Prof: {
                        time: req.body.time,
                        ip: req.body.ip
                    }
                };

                var errFlag = false;
                try {
                    if (data[1]) userTmp.password = sha256(data[1].toString());
                    if (data[2]) userTmp.name = data[2];
                    if (data[3]) userTmp.email = data[3];
                    if (data[4]) userTmp.phone = data[4];

                    if (data[5]) {
                        if (data[5].indexOf("전자전기") >= 0) userTmp.major = 0;
                        else if (data[5].indexOf("컴퓨터") >= 0) userTmp.major = 1;
                        else if (data[5].indexOf("반도체") >= 0) userTmp.major = 2;
                        else if (data[5].indexOf("소프트웨어") >= 0) userTmp.major = 3;
                        else if (data[5].indexOf("정보통신") >= 0) userTmp.major = 4;
                    }
                } catch (err) {
                    errFlag = true;
                    text += "[ " + data[0] + " ] 유저 데이터 파싱에서 문제가 발생하였습니다.\n";
                    callback();
                }
                if (!errFlag) {
                    models.User.findOne({
                        where: {
                            ids: data[0]
                        },
                        include: [models.Prof]
                    }).then(function(user) {
                        if (user === null) { // 아이디 없을시 생성
                            models.User.create(userTmp).then(function(user) {
                                user.createProf(userTmp.Prof).then(function(user) {
                                    insertCount++;
                                    callback();
                                }).error(function(errors) {
                                    user.destroy().then(function() {
                                        text += "[ " + data[0] + " ] 유저의 교수정보 생성에서 문제가 발생하였습니다.\n";
                                        callback();
                                    });
                                });
                            }).error(function(errors) {
                                text += "[ " + data[0] + " ] 유저 생성에서 문제가 발생하였습니다.\n";
                                callback();
                            });
                        } else { // 아이디 존재함, 업데이트
                            for (var key in userTmp) {
                                if (key == "Prof") {
                                    for (var key_2 in userTmp.Prof) {
                                        user.Prof[key_2] = userTmp.Prof[key_2];
                                    }
                                } else user[key] = userTmp[key];
                            }
                            user.save().then(function(user) {
                                user.Prof.save().then(function(prof) {
                                    updateCount++;
                                    callback();
                                }).error(function(errors) {
                                    text += "[ " + data[0] + " ] 유저의 학생정보 수정에서 문제가 발생하였습니다.\n";
                                    callback();
                                });
                            }).error(function(errors) {
                                text += "[ " + data[0] + " ] 유저 수정에서 문제가 발생하였습니다.\n";
                                callback();
                            });
                            /* 에러나서 위 루틴으로 바꿈 (원인은 모르겠음)
                            user.updateAttributes(userTmp).success(function(user) {
                                user.Prof.updateAttributes(userTmp.Prof).success(function(user) {
                                    updateCount++;
                                    callback();
                                }).error(function(errors) {
                                    text += "[ " + data[0] + " ] 유저의 교수정보 수정에서 문제가 발생하였습니다.\n";
                                    callback();
                                });
                            }).error(function(errors) {
                                text += "[ " + data[0] + " ] 유저 수정에서 문제가 발생하였습니다.\n";
                                callback();
                            });
                            */
                        }
                    });
                }
            } else callback();
        }, function(err) {
            if (insertCount > 0) text += "총 " + insertCount + "개 계정이 추가되었습니다.\n";
            if (updateCount > 0) text += "총 " + updateCount + "개 계정이 수정되었습니다.\n";
            res.send({
                result: true,
                text: text
            });
        });
    } catch (err) {
        res.send({
            result: false,
            text: '잘못된 파일 입니다.'
        });
    }
});
router.all('/prof_excel_save', function(req, res, next) {
    models.User.findAll({
        where: (req.body.arr ? {
            id: JSON.parse(req.body.arr),
            type: 1
        } : {
            type: 1
        })
    }).then(function(users) {
        var data = [
            [
                '아이디',
                '비밀번호',
                '이름',
                '이메일',
                '연락처',
                '전공'
            ]
        ];
        users.forEach(function(user) {
            data.push([
                user.ids,
                '',
                user.name,
                user.email,
                user.phone, ['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과'][user.major]
            ]);
        });
        var buffer = xlsx.build([{
            name: "cssys_prof_list",
            data: data
        }]);
        res.setHeader('Content-disposition', 'attachment; filename=prof_list_' + moment().format("YYYYMMDDHHmmss") + '.xlsx');
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    });
});
//------------------------------------------------------------------------------------------
router.get('/student_list', function(req, res, next) {
    models.System.findAll().then(function(systems) {
        res.render('cssys/work/admin/student_list', {
            systems: systems
        });
    });
});
router.post('/student_list/ajax/get_students', function(req, res, next) {
    models.User.findAll({
        where: {
            type: 2
        },
        include: [{
            model: models.Student,
            include: [models.System]
        }]
    }).then(function(users) {
        var index = 1;
        users.forEach(function(user) {
            user.dataValues.index = index++;
            delete user.dataValues.password;
        });
        res.send({
            aaData: users
        });
    });
});
router.get('/student/:id', function(req, res, next) {
    models.User.findOne({
        where: {
            type: 2,
            id: req.params.id
        },
        include: [{
            model: models.Student,
            include: [
                models.System,
                models.StudentInfo, {
                    model: models.Prof,
                    include: [models.User]
                }, {
                    model: models.StudentFile,
                    as: 'oath'
                }, {
                    model: models.StudentFile,
                    as: 'proposal'
                }, {
                    model: models.StudentFile,
                    as: 'midreport'
                }, {
                    model: models.StudentFile,
                    as: 'finalreport'
                }, {
                    model: models.StudentFile,
                    as: 'paperwork'
                }, {
                    model: models.StudentFile,
                    as: 'presentation'
                }, {
                    model: models.StudentFile,
                    as: 'conference'
                }
            ]
        }]
    }).then(function(user) {
        if (user) {
            ["StudentInfo", "oath", "proposal", "midreport", "finalreport", "paperwork", "presentation", "conference"].forEach(function(index) {
                if (user.Student[index]) {
                    if (index != "StudentInfo") user.Student[index].link = '/cssys/work/ajax/file/download/' + index + '/' + path.basename(user.Student[index].path);
                    user.Student[index].time_ = moment(user.Student[index].time).format("YYYY년 M월 D일");
                }
            });
            //[1의 자리=제안서, 10의 자리=중간보고서, 100의자리=최종보고서]
            res.render('cssys/work/admin/student_view', {
                user: user,
                student: user.Student,
                state: [user.Student.dataValues.state%10, parseInt((user.Student.dataValues.state%100)/10), parseInt(user.Student.dataValues.state/100)]
            });
        } else next();
    });
});
router.post('/student/:id', function(req, res, next) {
    models.User.findOne({
        where: {
            type: 2,
            id: req.params.id
        },
        include: [{
            model: models.Student,
            include: [{
                model: models.StudentFile,
                as: 'oath'
            }, {
                model: models.StudentFile,
                as: 'proposal'
            }, {
                model: models.StudentFile,
                as: 'midreport'
            }, {
                model: models.StudentFile,
                as: 'finalreport'
            }, {
                model: models.StudentFile,
                as: 'paperwork'
            }, {
                model: models.StudentFile,
                as: 'presentation'
            }, {
                model: models.StudentFile,
                as: 'conference'
            }]
        }]
    }).then(function(user) {
        if (user) {
            if (req.body.delete) {
                if (user.Student[req.body.delete].id == 1) {
                    user.Student[req.body.delete + "Id"] = null;
                    user.Student.save().then(function() {
                        res.send({
                            result: true
                        });
                    });
                } else {
                    try {
                        fs.unlinkSync(user.Student[req.body.delete].path);
                    } catch (err) {}
                    user.Student[req.body.delete].destroy().then(function() {
                        res.send({
                            result: true
                        });
                    });
                }
            } else if (req.body.upload) {
                var file = req.files[req.body.upload];
                if (file.isFileSizeLimit) {
                    res.send({
                        result: false,
                        text: '파일 사이즈가 초과하였습니다. ( 최대 20MB )'
                    });
                } else {
                    var file_name = Date.now() + "-" + file.name;
                    var file_path = path.join(config.cssys.upload_path, 'work/' + req.body.upload, file_name);
                    mkdirp(path.join(config.cssys.upload_path, 'work/' + req.body.upload), function(err) {
                        if (!err) {
                            fs.rename(file.path, file_path, function(err) {
                                if (!err) {
                                    req.body.name = file.originalname;
                                    req.body.path = file_path;
                                    req.body.type = file.mimetype;
                                    req.body.size = file.size;
                                    user.createStudentFile(req.body).then(function(studentfile) {
                                        if (user.Student[req.body.upload]) {
                                            try {
                                                fs.unlinkSync(user.Student[req.body.upload].path);
                                            } catch (err) {}
                                            user.Student[req.body.upload].destroy().then(function() {
                                                user.Student["set" + req.body.upload.charAt(0).toUpperCase() + req.body.upload.slice(1)](studentfile).then(function() {
                                                    res.send({
                                                        result: true,
                                                    });
                                                });
                                            });
                                        } else {
                                            user.Student["set" + req.body.upload.charAt(0).toUpperCase() + req.body.upload.slice(1)](studentfile).then(function() {
                                                res.send({
                                                    result: true,
                                                });
                                            });
                                        }
                                    });
                                } else {
                                    next(err);
                                }
                            });
                        } else {
                            next(err);
                        }
                    });
                }
            }
        } else next();
    });
});
router.get('/student/:id/confirm/:state/:value', function(req, res, next){
    var id = req.params.id;
    var state = req.params.state;
    var value = req.params.value;
    models.Student.findOne({
        where: {
            UserId: id,
        },
        attributes: ['id', 'state']
    }).then(function (data){
        var a = data.state;
        var newstate =  [a%10, parseInt((a%100)/10), parseInt(a/100)];
        newstate[state-1] = value;
        models.Student.update({state: newstate[2]*100+newstate[1]*10+newstate[0]}, {
            where: {
                UserId: id,
            },
        }).then(function (data){
            res.redirect('/cssys/work/admin/student/'+id);
        });
    });
    
});
router.get('/student_login/:id', function(req, res, next) { // 귀찮아서 위 소스 복사함
    models.User.findOne({
        where: {
            type: 2,
            id: req.params.id
        }
    }).then(function(user) {
        if (user) {
            req.session.user = user;
            res.redirect('/cssys/work/student');
        } else next();
    });
});

router.get('/student_register', function(req, res, next) {
    models.User.findAll({
        order: 'name',
        include: [models.Prof]
    }).then(function(users) {
        models.System.findAll({
            where: {
                id: {
                    lt: 14
                }
            }
        }).then(function(systems) {
            var result = {};
            var majorArr = ['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과', '(미등록)'];
            majorArr.forEach(function(major) {
                result[major] = [];
            });
            users.forEach(function(user) {
                if (user.major === null) user.major = 5;
                result[majorArr[user.major]].push({
                    id: user.id,
                    name: user.name,
                    type: user.type,
                    ProfId: (user.Prof ? user.Prof.id : null)
                });
            });
            res.render('cssys/work/admin/student_register', {
                users: result,
                systems: systems
            });
        });
    });
});
router.get('/student_register/:id', function(req, res, next) { // 귀찮아서 위 소스 복사함
    models.User.findAll({
        order: 'name',
        include: [models.Prof]
    }).then(function(users) {
        models.System.findAll().then(function(systems) {
            /*systems = systems.filter(function(system) {
                return system.id != 7 && system.id != 8; //3차선택 제외파트 없앰
            });*/
            var result = {};
            var majorArr = ['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과', '(미등록)'];
            majorArr.forEach(function(major) {
                result[major] = [];
            });
            users.forEach(function(user) {
                if (user.major === null) user.major = 5;
                result[majorArr[user.major]].push({
                    id: user.id,
                    name: user.name,
                    type: user.type,
                    ProfId: (user.Prof ? user.Prof.id : null)
                });
            });
            res.render('cssys/work/admin/student_register', {
                users: result,
                systems: systems,
                selectedId: req.params.id
            });
        });
    });
});
router.post('/student_register/ajax/get_student', function(req, res, next) {
    models.User.findOne({
        where: {
            id: req.body.id,
            type: 2
        },
        include: [models.Student]
    }).then(function(user) {
        if (user !== null) {
            delete user.dataValues.password;
            res.send(user);
        } else next();
    });
});
router.post('/student_register', function(req, res, next) {
    req.body.type = 2;
    if (!req.body.ProfId) req.body.ProfId = null;
    if (req.body.id) { // 수정일경우
        models.User.findOne({
            where: {
                id: req.body.id,
                type: 2
            },
            include: [models.Student]
        }).then(function(user) {
            if (user !== null) {
                if (req.body.password === "") req.body.password = user.password;
                else req.body.password = sha256(req.body.password);
                req.body.ids = user.ids; // 보안상 추가
                user.updateAttributes(req.body).then(function(user) {
                    user.Student.updateAttributes(req.body).then(function(user) {
                        models_g.Student.findOne({
                            where: {
                                UserId: user.UserId
                            }
                        }).then(function (stu) {
                            if (stu) {
                                models_g.Student.update({
                                    term: req.body.term,
                                    status: req.body.status,
                                    doublemajor: req.body.doublemajor,
                                }, {
                                    where: {
                                        UserId: user.UserId
                                    }
                                }).then(function (stu) {
                                    res.send({
                                        result: true
                                    });
                                });
                            } else {
                                models_g.Student.create({
                                    term: req.body.term,
                                    status: req.body.status,
                                    doublemajor: req.body.doublemajor,
                                    state: 0,
                                    ip:  req.body.ip,
                                    time: req.body.time,
                                    ProfId: null,
                                    UserId: user.UserId
                                }).then(function (stu) {
                                    res.send({
                                        result: true
                                    });
                                });

                            }
                        })

                    });
                });
            } else next();
        });
    } else { // 추가일경우
        models.User.findOne({
            where: {
                ids: req.body.ids
            }
        }).then(function(user) {
            if (user === null) {
                req.body.password = sha256(req.body.password);
                req.body.state=0;
                models.User.create(req.body).then(function(user) {
                    user.createStudent(req.body).then(function(student) {
                        models_g.User.findOne({
                            where: {
                                ids: req.body.ids
                            }
                        }).then(function (user) {
                            models_g.Student.create({
                                term: req.body.term,
                                status: req.body.status,
                                doublemajor: req.body.doublemajor,
                                state: 0,
                                ip:  req.body.ip,
                                time: req.body.time,
                                ProfId: null,
                                UserId: user.id
                            }).then(function (stu) {
                                res.send({
                                    result: true
                                });
                            })
                        });
                    });
                });
            } else {
                res.send({
                    result: false,
                    text: '이미 존재하는 아이디 입니다.'
                });
            }
        });
    }
});
router.post('/student_register/ajax/del_student', function(req, res, next) {
    models.User.findOne({
        where: {
            id: req.body.id,
            type: 2
        },
        include: [
            models.Student
        ]
    }).then(function(user) {
        if (user) {
            async.series(
                [
                    function(callback) {
                        models.StudentInfo.destroy({
                            where: {
                                UserId: user.id
                            }
                        }).then(function(affectedRows) {
                            callback(null);
                        });
                    },
                    function(callback) {
                        models.StudentFile.destroy({
                            where: {
                                UserId: user.id
                            }
                        }).then(function(affectedRows) {
                            callback(null);
                        });
                    },
                    function(callback) {
                        models.Permission.destroy({
                            where: {
                                StudentId: user.Student.id
                            }
                        }).then(function(affectedRows) {
                            callback(null);
                        });
                    },
                    async function(callback) {
                        if (user.Student) {
                            await models_g.Student.destroy({ where: { UserId: user.Student.UserId } });
                            user.Student.destroy().then(function() {
                                callback(null);
                            });
                        } else callback(null);
                    }
                ],
                function(err, results) {
                    user.destroy().then(function() {
                        res.send({
                            result: true
                        });
                    });
                }
            );
        } else next();
    });
});
router.get('/student_excel_register', function(req, res, next) {
    res.render('cssys/work/admin/student_excel_register');
});
router.post('/student_excel_register', function(req, res, next) {
    try {
        obj = xlsx.parse(req.files.file.path);
        fs.unlinkSync(req.files.file.path);

        obj[0].data.shift(); // 첫번째 행 삭제;

        var text = '';
        var insertCount = 0;
        var updateCount = 0;
        async.each(obj[0].data, function(data, callback) {
            if (data[0]) { // 해당 열에 아이디가 존재할 시
                var userTmp = {
                    ids: data[0],
                    type: 2,
                    time: req.body.time,
                    ip: req.body.ip,
                    Student: {
                        time: req.body.time,
                        ip: req.body.ip
                    }
                };

                var errFlag = false;
                try {
                    if (data[1]) userTmp.password = sha256(data[1].toString());
                    if (data[2]) userTmp.name = data[2];
                    if (data[3]) userTmp.email = data[3];
                    if (data[4]) userTmp.phone = data[4];

                    if (data[5]) {
                        if (data[5].indexOf("전자전기") >= 0) userTmp.major = 0;
                        else if (data[5].indexOf("컴퓨터") >= 0) userTmp.major = 1;
                        else if (data[5].indexOf("반도체") >= 0) userTmp.major = 2;
                        else if (data[5].indexOf("소프트웨어") >= 0) userTmp.major = 3;
                        else if (data[5].indexOf("정보통신") >= 0) userTmp.major = 4;
                    }

                    if (data[6]) userTmp.Student.term = data[6];

                    if (data[7]) {
                        if (data[7].indexOf("재학") >= 0) userTmp.Student.status = 0;
                        else if (data[7].indexOf("휴학") >= 0) userTmp.Student.status = 1;
                        else if (data[7].indexOf("수료") >= 0) userTmp.Student.status = 2;
                        else if (data[7].indexOf("졸업") >= 0) userTmp.Student.status = 3;
                    }

                    if (data[8]) {
                        if (data[8].indexOf("논문") >= 0) userTmp.Student.iswork = 0;
                        else if (data[8].indexOf("작품") >= 0) userTmp.Student.iswork = 1;
                    }

                    if (data[9]) {
                        if (data[9].indexOf("개인") >= 0) userTmp.Student.isgroup = 0;
                        else if (data[9].indexOf("공동") >= 0) userTmp.Student.isgroup = 1;
                    }

                    if (data[10]) userTmp.Student.title = data[10];

                    if (data[11]) {
                        if (data[11].indexOf("미심사") >= 0) userTmp.Student.result = 0;
                        else if (data[11].indexOf("심사통과") >= 0) userTmp.Student.result = 1;
                        else if (data[11].indexOf("재심대상자") >= 0) userTmp.Student.result = 2;
                        else if (data[11].indexOf("기합격") >= 0) userTmp.Student.result = 3;
                    }

                    if (data[12]) userTmp.Student.comment = data[12];

                    if (data[13]) userTmp.Student.gryearterm = data[13];

                    if (data[14]) {
                        if (data[14].indexOf("시스템 시작 전") >= 0) userTmp.Student.SystemId = 1;
                        else if (data[14].indexOf("신청서 제출") >= 0) userTmp.Student.SystemId = 3;
                        else if (data[14].indexOf("1차 희망 교수 선택") >= 0) userTmp.Student.SystemId = 3;
                        else if (data[14].indexOf("1차 지도 학생 선택") >= 0) userTmp.Student.SystemId = 4;
                        else if (data[14].indexOf("2차 희망 교수 선택") >= 0) userTmp.Student.SystemId = 5;
                        else if (data[14].indexOf("2차 지도 학생 선택") >= 0) userTmp.Student.SystemId = 6;
                        else if (data[14].indexOf("3차 희망 교수 선택") >= 0) userTmp.Student.SystemId = 7;
                        else if (data[14].indexOf("3차 지도 학생 선택") >= 0) userTmp.Student.SystemId = 8;
                        else if (data[14].indexOf("서약서 및 제안서 업로드") >= 0) userTmp.Student.SystemId = 9;
                        else if (data[14].indexOf("중간보고서 업로드") >= 0) userTmp.Student.SystemId = 10;
                        else if (data[14].indexOf("최종 자료 업로드") >= 0) userTmp.Student.SystemId = 11;
                        else if (data[14].indexOf("작품/논문 심사") >= 0) userTmp.Student.SystemId = 12;
                        else if (data[14].indexOf("작품/논문 완료") >= 0) userTmp.Student.SystemId = 13;
                    }

                    if (data[15]) {
                        if (data[15].indexOf("아니오") >= 0) userTmp.Student.islock = 0;
                        else if (data[15].indexOf("예") >= 0) userTmp.Student.islock = 1;
                    }

                } catch (err) {
                    errFlag = true;
                    text += "[ " + data[0] + " ] 유저 데이터 파싱에서 문제가 발생하였습니다.\n";
                    callback();
                }
                if (!errFlag) {
                    async.series([

                            function(callback_) {
                                if (data[17]) {

                                    models.User.findOne({
                                        where: {
                                            name: data[17],
                                            type: 1
                                        },
                                        include: [models.Prof]
                                    }).then(function(user) {
                                        if (user) callback_(null, user.Prof.id);
                                        else callback_(null, null);
                                    });
                                } else callback_(null, null);
                            }
                        ],
                        function(err, results) {
                            if (data[17] && results[0]) {
                                userTmp.Student.ProfId = results[0];
                                if (data[16]) userTmp.Student.yearterm = data[16];
                            }
                            models.User.findOne({
                                where: {
                                    ids: data[0]
                                },
                                include: [models.Student]
                            }).then(function(user) {
                                if (user === null) { // 아이디 없을시 생성
                                    models.User.create(userTmp).then(function(user) {
                                        userTmp.Student.state = 0;
                                        user.createStudent(userTmp.Student).then(function(user) {
                                            models_g.Student.create(userTmp.Student).then(function (stu) {
                                                insertCount++;
                                                callback();
                                            })
                                        }).error(function(errors) {
                                            user.destroy().then(function() {
                                                text += "[ " + data[0] + " ] 유저의 학생정보 생성에서 문제가 발생하였습니다.\n";
                                                callback();
                                            });
                                        });
                                    }).error(function(errors) {
                                        text += "[ " + data[0] + " ] 유저 생성에서 문제가 발생하였습니다.\n";
                                        callback();
                                    });
                                } else { // 아이디 존재함, 업데이트
                                    for (var key in userTmp) {
                                        if (key == "Student") {
                                            for (var key_2 in userTmp.Student) {
                                                user.Student[key_2] = userTmp.Student[key_2];
                                            }
                                        } else user[key] = userTmp[key];
                                    }
                                    user.save().then(function(user) {
                                        user.Student.save().then(function(student) { // g_student 만들기
                                            models_g.Student.findOne({
                                                where: {
                                                    UserId:  user.id
                                                }
                                            }).then(function (stu) {
                                                if (stu) {
                                                    models_g.Student.update({ // state update 안됨
                                                        term: student.term,
                                                        status: student.status,
                                                        doublemajor: student.doublemajor
                                                    }, { where: { UserId: user.id } });
                                                } else {
                                                    models_g.Student.create({
                                                        term: student.term,
                                                        status: student.status,
                                                        doublemajor: student.doublemajor,
                                                        state: 0,
                                                        ip:  student.ip,
                                                        time: student.time,
                                                        ProfId: null,
                                                        UserId: user.id
                                                    });
                                                }
                                            }).then(function (data) {
                                                updateCount++;
                                                callback();
                                            })                                 
                                        }).error(function(errors) {
                                            text += "[ " + data[0] + " ] 유저의 학생정보 수정에서 문제가 발생하였습니다.\n";
                                            callback();
                                        });
                                    }).error(function(errors) {
                                        text += "[ " + data[0] + " ] 유저 수정에서 문제가 발생하였습니다.\n";
                                        callback();
                                    });
                                    /* 에러나서 위 루틴으로 바꿈 (원인은 모르겠음)
                                    user.updateAttributes(userTmp).then(function(user) {
                                        user.Student.updateAttributes(userTmp.Student).then(function(user) {
                                            updateCount++;
                                            callback();
                                        }).error(function(errors) {
                                            text += "[ " + data[0] + " ] 유저의 학생정보 수정에서 문제가 발생하였습니다.\n";
                                            callback();
                                        });
                                    }).error(function(errors) {
                                        text += "[ " + data[0] + " ] 유저 수정에서 문제가 발생하였습니다.\n";
                                        callback();
                                    });
                                    */
                                }
                            });
                        }
                    );
                }
            } else callback();
        }, function(err) {
            if (insertCount > 0) text += "총 " + insertCount + "개 계정이 추가되었습니다.\n";
            if (updateCount > 0) text += "총 " + updateCount + "개 계정이 수정되었습니다.\n";
            res.send({
                result: true,
                text: text
            });
        });
    } catch (err) {
        res.send({
            result: false,
            text: '잘못된 파일 입니다.'
        });
    }
});
router.all('/student_excel_save', function(req, res, next) {
    models.User.findAll({
        where: (req.body.arr ? {
            id: JSON.parse(req.body.arr),
            type: 2
        } : {
            type: 2
        }),
        include: [{
            model: models.Student,
            include: [models.System, {
                model: models.Prof,
                include: [models.User]
            }]
        }]
    }).then(function(users) {
        var data = [
            [
                '아이디',
                '비밀번호',
                '이름',
                '이메일',
                '연락처',
                '전공',
                '학기',
                '재학/졸업 여부',
                '작품/논문 여부',
                '개인/공동 여부',
                '작품/논문 제목 ',
                '심사 단계',
                '비고',
                '졸업 예정 학기',
                '시스템 단계',
                '시스템 락',
                '배정 학기',
                '배정 교수',
                '신청서',
                '서약서',
                '제안서',
                '중간보고서',
                '최종보고서',
                '작품/논문',
                '교내발표자료',
                '학외증빙자료',
            ]
        ];
        users.forEach(function(user) {
            data.push([
                user.ids,
                '',
                user.name,
                user.email,
                user.phone, ['전자전기공학부', '컴퓨터공학과', '반도체시스템공학과', '소프트웨어학과', '정보통신대학', '인터랙션사이언스학과'][user.major],
                user.Student.term, ['재학', '휴학', '수료', '졸업'][user.Student.status],
                ['논문', '작품'][(user.Student.iswork ? 1 : 0)],
                ['개인', '공동'][(user.Student.isgroup ? 1 : 0)],
                user.Student.title, ['미심사', '심사통과', '재심대상자', '기합격'][user.Student.result],
                user.Student.comment, user.Student.gryearterm, (user.Student.System ? user.Student.System.phase : "(미등록)"), ['아니오', '예'][(user.Student.islock ? 1 : 0)],
                user.Student.yearterm, (user.Student.Prof ? user.Student.Prof.User.name : ""), (user.Student.StudentInfoId ? "제출" : ""), (user.Student.oathId ? "제출" : ""), (!user.Student.proposalId ? "": user.Student.state%10==2 ? "반려": user.Student.state%10==1 ? "승인" : "제출(확인 필요)"), (!user.Student.midreportId ? "" : parseInt((user.Student.state%100)/10)==2 ? "반려" : parseInt((user.Student.state%100)/10) == 1 ? "승인" : "제출(확인필요)" ), (!user.Student.finalreportId ? "" : parseInt(user.Student.state/100)==2 ? "반려" : parseInt(user.Student.state/100)==1 ? "승인" : "제출(확인필요)" ), (user.Student.paperworkId ? "제출" : ""), (user.Student.presentationId ? "제출" : ""), (user.Student.conferenceId ? "제출" : "")
            ]);
        });
        var buffer = xlsx.build([{
            name: "cssys_student_list",
            data: data
        }]);
        res.setHeader('Content-disposition', 'attachment; filename=student_list_' + moment().format("YYYYMMDDHHmmss") + '.xlsx');
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    });
});

//------------------------------------------------------------------------------------------
router.get('/qna', function(req, res, next) {
    res.redirect('/cssys/work/admin/qna/list');
});
router.get('/qna/list', function(req, res, next) {
    res.render('cssys/work/admin/qna_list');
});
router.get('/qna/write', function(req, res, next) {
    res.render('cssys/work/admin/qna_write');
});
router.get('/qna/view/:id', function(req, res, next) {
    res.render('cssys/work/admin/qna_view', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/qna/reply/:id', function(req, res, next) {
    res.render('cssys/work/admin/qna_reply', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/qna/modify/:id', function(req, res, next) {
    res.render('cssys/work/admin/qna_modify', {
        id: req.params.id // ajax 요청할때 사용
    });
});

//------------------------------------------------------------------------------------------
router.get('/system', function(req, res, next) {
    models.System.findAll().then(function(systems) {

        systems = systems.filter(function(system) {
            return (system.id > 2 && system.id < 13) || (system.id > 13); // 10: id 14, 11: id: 15
        });
        systems.splice(7, 0, systems[10], systems[11]);
        systems.splice(10, 0, systems[14], systems[15]);
        systems.splice(13, 0, systems[18], systems[19]);
        systems.splice(16, 6)
        systems.forEach(function(system) {
            system.dataValues.start = moment(system.start).format("YYYY-MM-DD");
            system.dataValues.end = moment(system.end).format("YYYY-MM-DD");
        });
        res.render('cssys/work/admin/system', {
            date: moment(new Date()).format("YYYY년 M월 D일"),
            day: moment(new Date()).format("e"),
            time: moment(new Date()).format("H시 m분 s초"),
            systems: systems
        });
    });
});

// 단계 처리 스케쥴러 함수 구현부
var systemSchedule = [];
var testing = [];
var systemScheduleProc = {
    2: function() {
        models.Student.update({
            SystemId: 3
        }, {
            where: {
                SystemId: 2,
                StudentInfoId: {
                    ne: null
                }
            }
        });
    },
    9: function() {
        models.Student.update({
            SystemId: 10,
            islock: 1,
        }, {
            where: {
                SystemId: 9,
                oathId: {
                    ne: null
                },
                proposalId: {
                    ne: null
                },
                state: 1
            }
        });
    },
    10: function() {
        models.Student.update({
            SystemId: 11
        }, {
            where: {
                SystemId: 10,
                midreportId: {
                    ne: null
                },
                state: 11
            }
        });
    },
    11: function(callback) {
        models.Student.update({
            SystemId: 12
        }, {
            where: {
                SystemId: 11,
                finalreportId: {
                    ne: null
                },
                presentationId: {
                    ne: null
                },
                state: 111
            }
        });
    },
    12: function(callback) {
        models.Student.update({
            SystemId: 13,
            isdisplay: 1
        }, {
            where: {
                SystemId: 12,
                result: {
                    ne: 0
                }
            }
        });
    },
    permissionProcStudent: function(order) {
        models.Student.findAll({
            where: {
                SystemId: (order == 1 ? 3 : (order == 2 ? 5 : 7))
            }
        }).then(function(students) {
            students.forEach(function(student) {
                student.updateAttributes({
                    SystemId: student.SystemId + 1
                });
            });
        });
    },
    permissionProcProf: function(order) {
        var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
        models.Student.findAll({
            where: {
                SystemId: (order == 1 ? 4 : (order == 2 ? 6 : 8))
            }
        }).then(function(students) {
            students.forEach(function(student) {
                models.Permission.findOne({
                    where: {
                        StudentId: student.id,
                        yearterm: yearterm,
                        order: order,
                        ProfId: null,
                        $or: [{
                            firstSelected: 1
                        }, {
                            secondSelected: 1
                        }, {
                            thirdSelected: 1
                        }]
                    }
                }).then(function(permission) {
                    if (permission) {
                        var selectedProfId;
                        if (permission.firstSelected) selectedProfId = permission.firstProfId;
                        else if (permission.secondSelected) selectedProfId = permission.secondProfId;
                        else if (permission.thirdSelected) selectedProfId = permission.thirdProfId;
                        permission.updateAttributes({
                            ProfId: selectedProfId
                        });
                        student.updateAttributes({
                            ProfId: selectedProfId,
                            yearterm: permission.yearterm,
                            SystemId: 9,
                            islock: 1
                        });
                    } else {
                        student.updateAttributes({
                            SystemId: (order == 3 ? 3 : student.SystemId + 1) // 8단계에서 아무것도 없으면 다시 3단계로 이동
                            //SystemId: (order == 2 ? 3 : 5) // 6단계에서 아무것도 없으면 다시 3단계로 이동 2017.09.08 최창안
                        });
                    }
                });
            });
        });
    },
    unlockProc: function() {
        models.Student.update({
            islock: 0
        }, {
            where: {
                islock: 1
            }
        });
    }
};
systemScheduleProc[3] = function() {
    systemScheduleProc.permissionProcStudent(1);
};
systemScheduleProc[4] = function() {
    systemScheduleProc.permissionProcProf(1);
};
systemScheduleProc[5] = function() {
    systemScheduleProc.permissionProcStudent(2);
};
systemScheduleProc[6] = function() {
    systemScheduleProc.permissionProcProf(2);
};
systemScheduleProc[7] = function() {
    systemScheduleProc.permissionProcStudent(3);
};
systemScheduleProc[8] = function() {
    systemScheduleProc.permissionProcProf(3);
};

// 서버 시작시 스케쥴러 자동 등록
models.System.findAll({
    where: {
        $or: [
            {
                id: {
                    gt: 1,
                    lt: 13
                },
            },
            /*
            기본일정(13번째)이 넘어가는 14 ~ 19번째 일정의 경우에는 reupload에 적혀있는 일정의 함수를 수행함
            ex) 14(제안서 승인 및 반려), 15(제안서 재업로드) 기간이 종료되었을 경우에는
            14, 15의 reupload 값(9 - 서약서 및 제안서 제출)의 기간이 종료되었을 때
            실행되는 함수를 수행하게 됨

            14, 16, 18은 승인 및 반려 기간,
            15, 17, 19는 재업로드 기간임

            승인 및 반려 기간을 필터 조건에 포함시킨 것은
            졸논 일정이 2019년처럼 서류 제출기간만 존재하는 것이 아니라
            2020년처럼 서류 제출 기간 이후에 따로 승인,반려 기간이 존재하는 형태로 짜여진 경우
            서류 제출 기간이 종료된 직후엔 승인이 되어 있지 않아서 다음 phase으로 넘어갈 수 없기 때문에
            승인, 반려 기간이 종료된 이후에 학생들을 다음 phase로 넘기기 위함임
            */
            {
                id: 14,
            },
            {
                id: 15,
            },
            {
                id: 16,
            },
            {
                id: 17,
            },
            {
                id: 18,
            },
            {
                id: 19
            }
        ]
    }
}).then(function(systems) {
    systems.forEach(function(system) {
        if (system.id > 13) {
            systemSchedule[system.id] = schedule.scheduleJob(new Date(system.end), systemScheduleProc[system.reupload]);
            testing[system.id]=schedule.scheduleJob(new Date(system.end), function(){
              console.log("schedulelogged");
              models.ScheduleLog.upsert({
                phase:system.phase,
                scheduletime:system.end
              });
            });
        } else {
            systemSchedule[system.id] = schedule.scheduleJob(new Date(system.end), systemScheduleProc[system.id]);
            testing[system.id]=schedule.scheduleJob(new Date(system.end), function(){
              console.log("schedulelogged");
              models.ScheduleLog.upsert({
                phase:system.phase,
                scheduletime:system.end
              });
            });
        }
    });
});
// 2월 28일, 8월 31일 언락 스케쥴러 실행
schedule.scheduleJob("59 23 28 2 *", systemScheduleProc.unlockProc);
schedule.scheduleJob("59 23 31 8 *", systemScheduleProc.unlockProc);

router.post('/system', function(req, res, next) {
    models.System.findAll().then(function(systems) {
        async.each(systems, function(system, callback) {
            if (req.body[system.id]) {
                system.start = req.body[system.id].split(" - ")[0] + " 00:00:00";
                system.end = req.body[system.id].split(" - ")[1] + " 23:59:59";
            }
            if ((system.id > 1 && system.id < 13)) {
                if (systemSchedule[system.id]) systemSchedule[system.id].cancel();
                systemSchedule[system.id] = schedule.scheduleJob(new Date(system.end) , systemScheduleProc[system.id]);
                console.log("sysid",system.id, "sysend" ,system.end, "curtime" , new Date());
            } else if (system.id == 15 || system.id == 17 || system.id == 19) {
                systemSchedule[system.id] = schedule.scheduleJob(new Date(system.end) , systemScheduleProc[system.reupload]);
                console.log("sysid", system.id, "sysend" ,system.end, "curtime" , new Date());
            }
            system.save().then(function() {
                callback();
            });
        }, function(err) {
            res.send({
                result: true
            });
        });
    });
});

router.all('/system/:id', function(req, res, next) {
    if (req.params.id > 1 && req.params.id < 13) {
        systemScheduleProc[req.params.id]();
        res.send({
            result: true
        });
    } else if (req.params.id == 15 || req.params.id == 17 || req.params.id == 19) {
        systemScheduleProc[req.params.id == 15 ? 9 : req.params.id == 17 ? 10 : 11]();
        res.send({
            result: true
        });
    } next();
});

//------------------------------------------------------------------------------------------
router.get('/permission', function(req, res, next) {
    var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
    models.System.findAll({
        where: {
            id: [3, 4, 5, 6, 7, 8]
        }
    }).then(function(systems) {
        systems.forEach(function(system) {
            system.isNow = ((new Date()) > system.start && (new Date()) < system.end);
            system.start__ = moment(system.start).format("YYYY년 M월 D일");
            system.end__ = moment(system.end).format("YYYY년 M월 D일");
        });
        var order = 0;
        if (systems[0].isNow || systems[1].isNow) order = 1;
        else if (systems[2].isNow || systems[3].isNow) order = 2;
        else if (systems[4].isNow || systems[5].isNow) order = 3;
        res.render('cssys/work/admin/permission', {
            systems: systems,
            yearterm: yearterm,
            order: order
        });
    });
});
router.post('/permission/ajax/get_permissions', function(req, res, next) {
    models.Permission.findAll({
        include: [{
            model: models.Student,
            include: [models.User]
        }, {
            model: models.Prof,
            include: [models.User]
        }, {
            model: models.Prof,
            as: 'firstProf',
            include: [models.User]
        }, {
            model: models.Prof,
            as: 'secondProf',
            include: [models.User]
        }, {
            model: models.Prof,
            as: 'thirdProf',
            include: [models.User]
        }]
    }).then(function(permissions) {
        var index = 0;

        if(permissions){
            permissions.forEach(function(permission) {
                permission.dataValues.index = ++index;
                if (permission.Student) delete permission.Student.User.password;
                if (permission.Prof) delete permission.Prof.User.password;
                if (permission.firstProf) delete permission.firstProf.User.password;
                if (permission.secondProf) delete permission.secondProf.User.password;
                if (permission.thirdProf) delete permission.thirdProf.User.password;
            });
        }
        res.send({
            aaData: permissions
        });
    });
});

router.post('/permission/ajax/cancel_selection', function(req, res, next) { //신청 배정현황의 학생 선택 취소버튼
    models.Permission.update({
      firstSelected : 0,
      secondSelected : 0,
      thirdSelected : 0
    }, {
        where:{id:req.body.perid}
    }).then(function(permission){
      res.send({result:true});
    })
});

//------------------------------------------------------------------------------------------
router.get('/paperwork', function(req, res, next) {
    res.render('cssys/work/admin/paperwork');
});
router.post('/paperwork/ajax/get_paperworks', function(req, res, next) {
    models.User.findAll({
        where: {
            type: 2
        },
        include: [{
            model: models.Student,
            include: [models.StudentInfo, {
                model: models.StudentFile,
                as: 'oath'
            }, {
                model: models.StudentFile,
                as: 'proposal'
            }, {
                model: models.StudentFile,
                as: 'midreport'
            }, {
                model: models.StudentFile,
                as: 'finalreport'
            }, {
                model: models.StudentFile,
                as: 'paperwork'
            }, {
                model: models.StudentFile,
                as: 'presentation'
            }, {
                model: models.StudentFile,
                as: 'conference'
            }]
        }]
    }).then(function(users) {
        var index = 1;
        users.forEach(function(user) {
            user.dataValues.index = index++;
            delete user.dataValues.password;
            ["oath", "proposal", "midreport", "finalreport", "paperwork", "presentation", "conference"].forEach(function(index) {
                if (user.Student[index]) user.Student[index].dataValues.link = '/cssys/work/ajax/file/download/' + index + '/' + path.basename(user.Student[index].path);
            });
        });
        res.send({
            aaData: users
        });
    });
});
router.get('/paperwork/application/:id', function(req, res, next) {
    models.User.findOne({
        where: {
            type: 2,
            id: req.params.id
        },
        include: [{
            model: models.Student,
            include: [models.StudentInfo]
        }]
    }).then(function(user) {
        if (user) {
            user.Student.StudentInfo.time_ = moment(user.Student.StudentInfo.time).format("YYYY년 M월 D일");
            res.render('cssys/work/admin/paperwork_application', {
                user: user,
                student: user.Student
            });
        } else next();
    });
});

router.post('/paperwork/application/change', function(req, res, next){
    for(var i in req.body){
        if(req.body[i]==''){
            console.log("null");
            req.body[i]=null;
        }
    }
    models.User.findOne({
        where: {
            id: req.body.studentId,
            type: 2
        },
        include: [{
            model: models.Student,
            include: [models.StudentInfo]
        }]
    }).then(function(user) {
        if (user && user.Student) {
            if (user.Student.StudentInfo) {
                user.Student.StudentInfo.updateAttributes(req.body).then(function(studentinfo) {
                    res.send({
                        result: true,
                    })
                });
            } else {
               res.send({
                result:false,
                text: "에러가 발생하였습니다. 시스템 관리자에게 문의해주세요."
               })
            }
        } else next();
    });
})

module.exports = router;
