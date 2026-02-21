
var config = require('../../config');
var models = require('../../models/cssys_work');
var express = require('express');
var router = express.Router();
var async = require('async');
var sha256 = require('sha256');
var moment = require('moment');
var path = require('path');
var multer = require('multer'); // upload하는데 필요함
var xlsx = require('node-xlsx');
var fs = require('fs');


// 로그인 인증 예외 처리
router.all('*', function(req, res, next) {
    if (req.session.user.type === 1) next();
    else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function(req, res, next) {
    res.redirect('/cssys/work/prof/main');
});

//------------------------------------------------------------------------------------------
router.get('/main', function(req, res, next) {

    models.User.findAll({
        where: {
            type: 2
        },
        include: [{
            model: models.Student,
            include: [{
                model: models.Prof,
                where: {
                    UserId: req.session.user.id
                }
            }]
        }],
        order: 'SystemId,ids'
    }).then(function(users) {
        models.System.findAll().then(function(systems) {
            systems.forEach(function(system) {
                system.start_ = moment(system.start).format("YYYY-MM-DD");
                system.end_ = moment(system.end).add(1, 'day').format("YYYY-MM-DD");
                system.userCnt = 0;
                system.userCmpCnt = 0;
                users.forEach(function(user) {
                    if (system.id == user.Student.SystemId) {
                        system.userCnt++;
                        if (system.id == 2 && user.Student.StudentInfoId || system.id == 9 && user.Student.oathId && user.Student.proposalId || system.id == 10 && user.Student.midreportId || system.id == 11 && user.Student.finalreportID && user.Student.paperworkId || system.id == 12 && user.Student.result !== 0) system.userCmpCnt++;
                    }
                });
            });
            res.render('cssys/work/prof/main', {
                systems: systems,
                users: users
            });
        });
    });
});

//------------------------------------------------------------------------------------------
router.get('/permission', function(req, res, next) {
    models.System.findAll({
        where: {
            id: [4, 6, 8]
        }
    }).then(function(systems) {
        systems.forEach(function(system) {
            system.start_ = moment(system.start).format("YYYY-MM-DD");
            system.end_ = moment(system.end).format("YYYY-MM-DD");
            system.start__ = moment(system.start).format("YYYY년 M월 D일");
            system.end__ = moment(system.end).format("YYYY년 M월 D일");
            system.isNow = ((new Date()) > system.start && (new Date()) < system.end);
            system.isOver = ((new Date()) > system.end);
        });
        if (systems[0].isNow || systems[1].isNow || systems[2].isNow) {
            var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
            var order = (systems[0].isNow ? 1 : (systems[1].isNow ? 2 : 3));
            models.Prof.findOne({
                where: {
                    UserId: req.session.user.id
                }
            }).then(function(prof) {
                if (prof) {
                    models.Permission.findAll({
                        where: {
                            yearterm: yearterm,
                            order: order,
                            $or: [{
                                firstProfId: prof.id
                            }, {
                                secondProfId: prof.id
                            }, {
                                thirdProfId: prof.id
                            }]
                        },
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

                        async.series([
                                function(callback) {
                                    models.Student.count({
                                        where: {
                                            yearterm: yearterm,
                                            ProfId: prof.id
                                        }
                                    }).then(function(count) {
                                        callback(null, count);
                                        // callback(null, 0);
                                    });
                                },
                                function(callback) {
                                    models.Permission.count({
                                        where: {
                                            yearterm: yearterm,
                                            order: order,
                                            $or: [{
                                                firstProfId: prof.id,
                                                firstSelected: 1
                                            }, {
                                                secondProfId: prof.id,
                                                secondSelected: 1
                                            }, {
                                                thirdProfId: prof.id,
                                                thirdSelected: 1
                                            }]
                                        }
                                    }).then(function(count) {
                                        callback(null, count);
                                    });
                                },
                                function(callback) {
                                    models.Permission.findAndCountAll(
                                      {
                                        include:[
                                          {model:models.Student, include:[{model:models.User, where:{major:2}}]}
                                        ],
                                        where: {
                                            yearterm: yearterm,
                                            order: order,
                                            $or: [{
                                                firstProfId: prof.id,
                                                firstSelected: 1
                                            }, {
                                                secondProfId: prof.id,
                                                secondSelected: 1
                                            }, {
                                                thirdProfId: prof.id,
                                                thirdSelected: 1
                                            }]
                                        }
                                    }).then(function(semiconStudent) {
                                        callback(null, semiconStudent.count);
                                    });
                                },
                                function(callback) {
                                    models.Permission.findAndCountAll(
                                      {
                                        include:[
                                          {model:models.Student, include:[{model:models.User, where:{major:0}}]}
                                        ],
                                        where: {
                                            yearterm: yearterm,
                                            order: order,
                                            $or: [{
                                                firstProfId: prof.id,
                                                firstSelected: 1
                                            }, {
                                                secondProfId: prof.id,
                                                secondSelected: 1
                                            }, {
                                                thirdProfId: prof.id,
                                                thirdSelected: 1
                                            }]
                                        }
                                    }).then(function(semiconStudent) {
                                        callback(null, semiconStudent.count);
                                    });
                                }
                            ],
                            function(err, counts) {
                                console.log("counts: ",counts);
                                permissions.forEach(function(permission) {
                                    if (permission.firstProfId == prof.id) permission.index = 1;
                                    else if (permission.secondProfId == prof.id) permission.index = 2;
                                    else if (permission.thirdProfId == prof.id) permission.index = 3;
                                });
                                permissions.sort(function(a, b) {
                                    return a.index - b.index;
                                });
                                res.render('cssys/work/prof/permission', {
                                    permitcount: config.cssys.permit_student_count,
                                    permitcountsemicon: config.cssys.permit_student_count_semicon,
                                    selectable: (config.cssys.permit_student_count - (counts[0] + counts[1]) < 0 ? 0 : config.cssys.permit_student_count - (counts[0] + counts[1])),
                                    selectablesemicon: (config.cssys.permit_student_count_semicon- counts[2]< 0 ? 0 : config.cssys.permit_student_count_semicon-counts[2]),
                                    user: req.session.user,
                                    permissions: permissions,
                                    systems: systems,
                                    order: order
                                });
                            });
                    });
                } else next();
            });
        } else {
            res.render('cssys/work/prof/permission_out_date', {
                systems: systems
            });
        }
    });
});
router.get('/permission/application/:id', function(req, res, next) {
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
            // 인증 절차
            models.Prof.findOne({
                where: {
                    UserId: req.session.user.id
                }
            }).then(function(prof) {
                if (prof) {
                    models.Permission.findOne({
                        where: {
                            StudentId: user.Student.id,
                            $or: [{
                                firstProfId: prof.id
                            }, {
                                secondProfId: prof.id
                            }, {
                                thirdProfId: prof.id
                            }]
                        }
                    }).then(function(permission) {
                        if (permission) {
                            user.Student.StudentInfo.time_ = moment(user.Student.StudentInfo.time).format("YYYY년 M월 D일");
                            res.render('cssys/work/prof/permission_application', {
                                user: user,
                                student: user.Student
                            });
                        }
                    });
                } else next();
            });
        } else next();
    });
});
router.post('/permission/ajax/set_student', function(req, res, next) {
    models.Prof.findOne({
        where: {
            UserId: req.session.user.id
        }
    }).then(function(prof) {
        if (prof) {
            models.System.findAll({
                where: {
                    id: [4, 6, 8]
                }
            }).then(function(systems) {
                systems.forEach(function(system) {
                    system.isNow = ((new Date()) > system.start && (new Date()) < system.end);
                });
                if (systems[0].isNow || systems[1].isNow || systems[2].isNow) {
                    var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
                    var order = (systems[0].isNow ? 1 : (systems[1].isNow ? 2 : 3));
                    async.series([
                            function(callback) {
                                models.Student.count({
                                    where: {
                                        yearterm: yearterm,
                                        ProfId: prof.id
                                    }
                                }).then(function(count) {
                                    // callback(null, count);
                                    callback(null, 0);
                                });
                            },
                            function(callback) {
                                models.Permission.count({
                                    where: {
                                        yearterm: yearterm,
                                        order: order,
                                        $or: [{
                                            firstProfId: prof.id,
                                            firstSelected: 1
                                        }, {
                                            secondProfId: prof.id,
                                            secondSelected: 1
                                        }, {
                                            thirdProfId: prof.id,
                                            thirdSelected: 1
                                        }]
                                    }
                                }).then(function(count) {
                                    callback(null, count);
                                });
                            }
                        ],
                        function(err, counts) {
                            var selectable = (config.cssys.permit_student_count - (counts[0] + counts[1]) < 0 ? 0 : config.cssys.permit_student_count - (counts[0] + counts[1]));
                            if (selectable > 0) {
                                models.Permission.findOne(req.body.id).then(function(permission) {
                                    if (permission) {
                                        if (permission.firstProfId == prof.id) {
                                            permission.firstSelected = 1;
                                            permission.secondSelected = null;
                                            permission.thirdSelected = null;
                                        } else if (permission.secondProfId == prof.id) {
                                            permission.secondSelected = 1;
                                            permission.thirdSelected = null;
                                        } else if (permission.thirdProfId == prof.id) permission.thirdSelected = 1;
                                        permission.save().then(function(permission) {
                                            res.send({
                                                result: true
                                            });
                                        });
                                    }
                                });
                            } else {
                                res.send({
                                    result: false,
                                    text: "지도 학생 선택 가능 학생수를 초과 하셨습니다. 더이상 선택 할 수 없습니다."
                                });
                            }
                        });
                } else next();
            });
        } else next();
    });
});


router.get('/student_list', function(req, res, next) {
    res.render('cssys/work/prof/student_list');
});

router.get('/student_list/excel/',function(req,res,next){
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
                        UserId: req.session.user.id
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

router.post('/student_list/ajax/get_students', function(req, res, next) {
    models.User.findAll({
        where: {
            type: 2
        },
        include: [{
            model: models.Student,
            include: [{
                    model: models.Prof,
                    where: {
                        UserId: req.session.user.id
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
            var a = user.Student.dataValues.state;
            //[1의 자리=제안서, 10의 자리=중간보고서, 100의자리=최종보고서]
            user.Student.dataValues.state = [a%10, parseInt((a%100)/10), parseInt(a/100)];
            delete user.dataValues.password;
        });
        res.send({
            aaData: users
        });
    });
});
router.get('/student/application/:id', function(req, res, next) {
    models.User.findOne({
        where: {
            type: 2,
            id: req.params.id
        },
        include: [{
            model: models.Student,
            include: [models.StudentInfo, {
                model: models.Prof,
                where: {
                    UserId: req.session.user.id
                }
            }]
        }]
    }).then(function(user) {
        if (user) {
            user.Student.StudentInfo.time_ = moment(user.Student.StudentInfo.time).format("YYYY년 M월 D일");
            res.render('cssys/work/prof/student_application', {
                user: user,
                student: user.Student
            });
        } else next();
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
                    include: [models.User],
                    where: {
                        UserId: req.session.user.id
                    }
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
            var a = user.Student.state;
            res.render('cssys/work/prof/student_view', {
                user: user,
                student: user.Student,
                //[1의 자리=제안서, 10의 자리=중간보고서, 100의자리=최종보고서]
                state: [a%10, parseInt((a%100)/10), parseInt(a/100)]
            });
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
            res.redirect('/cssys/work/prof/student/'+id);
        });
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
            include: [
                models.System, {
                    model: models.Prof,
                    include: [models.User],
                    where: {
                        UserId: req.session.user.id
                    }
                }
            ]
        }]
    }).then(function(user) {
        if (user) {
            user.Student.note = req.body.note;
            user.Student.comment = req.body.comment;
            user.Student.masterpiece = (req.body.masterpiece == 1 ? 1 : 0); //원래 비고란이었으나 우수작 선정 체크박스 값 체크하는데 사용
            user.Student.save().then(function(student) {
                res.send({
                    result: true
                });
            });
        } else {
            res.send({
                result: false,
                text: '존재하지 않는 지도 학생입니다.'
            });

        }
    });
});


router.get('/examine', function(req, res, next) {
    models.System.findOne(12).then(function(system) {
        if (system) {
            if ((new Date()) > system.start && (new Date()) < system.end) {
                models.User.findAll({
                    where: {
                        type: 2
                    },
                    include: [{
                        model: models.Student,
                        include: [{
                            model: models.System,
                            where: {
                                id: 12
                            }
                        }, {
                            model: models.Prof,
                            include: [models.User],
                            where: {
                                UserId: req.session.user.id
                            }
                        }]
                    }]
                }).then(function(users) {
                    if (users) {
                        system.start_ = moment(system.start).format("YYYY-MM-DD");
                        system.end_ = moment(system.end).format("YYYY-MM-DD");
                        res.render('cssys/work/prof/examine_list', {
                            system: system,
                            users: (users.length > 0 ? users : null)
                        });
                    } else next();
                });
            } else {
                system.start__ = moment(system.start).format("YYYY년 M월 D일");
                system.end__ = moment(system.end).format("YYYY년 M월 D일");
                system.isOver = ((new Date()) > system.end);
                res.render('cssys/work/prof/examine_out_date', {
                    system: system
                });
            }
        } else next();
    });
});

router.get('/examine/:id', function(req, res, next) {
    models.System.findOne(12).then(function(system) {
        if (system) {
            if ((new Date()) > system.start && (new Date()) < system.end) {
                models.User.findOne({
                    where: {
                        type: 2,
                        id: req.params.id
                    },
                    include: [{
                        model: models.Student,
                        include: [{
                                model: models.System,
                                where: {
                                    id: 12
                                }
                            }, {
                                model: models.Prof,
                                include: [models.User],
                                where: {
                                    UserId: req.session.user.id
                                }
                            },
                            models.StudentInfo, {
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
                        models.User.findAll({
                            where: {
                                type: 2
                            },
                            include: [{
                                model: models.Student,
                                include: [{
                                    model: models.System,
                                    where: {
                                        id: 12
                                    }
                                }, {
                                    model: models.Prof,
                                    include: [models.User],
                                    where: {
                                        UserId: req.session.user.id
                                    }
                                }]
                            }]
                        }).then(function(users) {
                            if (users) {
                                system.start_ = moment(system.start).format("YYYY-MM-DD");
                                system.end_ = moment(system.end).format("YYYY-MM-DD");
                                res.render('cssys/work/prof/examine_view', {
                                    system: system,
                                    users: users,
                                    user: user,
                                    student: user.Student
                                });
                            } else next();
                        });
                    } else next();
                });
            } else {
                res.render('cssys/work/prof/examine_out_date', {
                    system: system
                });
            }
        } else next();
    });
});
router.post('/examine/:id', function(req, res, next) {
    models.System.findOne(12).then(function(system) {
        if (system) {
            if ((new Date()) > system.start && (new Date()) < system.end) {
                models.User.findOne({
                    where: {
                        type: 2,
                        id: req.params.id
                    },
                    include: [{
                        model: models.Student,
                        include: [{
                            model: models.System,
                            where: {
                                id: 12
                            }
                        }, {
                            model: models.Prof,
                            include: [models.User],
                            where: {
                                UserId: req.session.user.id
                            }
                        }]
                    }]
                }).then(function(user) {
                    if (user) {
                        user.Student.note = req.body.note;
                        user.Student.masterpiece = (req.body.masterpiece == 1 ? 1 : 0); //원래 비고란이었으나 우수작 선정 체크박스 값 체크하는데 사용
                        if (req.body.result) user.Student.result = (req.body.result == 1 ? 1 : 2);
                        user.Student.save().then(function(student) {
                            res.send({
                                result: true
                            });
                        });
                    } else {
                        res.send({
                            result: false,
                            text: '존재하지 않는 지도 학생입니다.'
                        });

                    }
                });
            } else {
                res.send({
                    result: false,
                    text: '심사 기간이 아닙니다.'
                });
            }
        } else next();
    });
});
//------------------------------------------------------------------------------------------
// 교수 공지사항 부분 추가
router.get('/notice', function(req, res, next) {
    res.redirect('/cssys/work/prof/notice/list');
});
router.get('/notice/list', function(req, res, next) {
    res.render('cssys/work/prof/notice_list');
});
router.get('/notice/view/:id', function(req, res, next) {
    res.render('cssys/work/prof/notice_view', {
        id: req.params.id
    });
});

//------------------------------------------------------------------------------------------
// 질문 및 답변 게시판 추가 (admin.js 소스 복붙후 수정)
router.get('/qna', function(req, res, next) {
    res.redirect('/cssys/work/prof/qna/list');
});
router.get('/qna/list', function(req, res, next) {
    res.render('cssys/work/prof/qna_list');
});
router.get('/qna/write', function(req, res, next) {
    res.render('cssys/work/prof/qna_write');
});
router.get('/qna/view/:id', function(req, res, next) {
    res.render('cssys/work/prof/qna_view', {
        id: req.params.id
    });
});
router.get('/qna/reply/:id', function(req, res, next) {
    res.render('cssys/work/prof/qna_reply', {
        id: req.params.id
    });
});
router.get('/qna/modify/:id', function(req, res, next) {
    res.render('cssys/work/prof/qna_modify', {
        id: req.params.id
    });
});

//------------------------------------------------------------------------------------------
// 회원정보 수정
router.get('/config', function(req, res, next) {
    models.User.findOne(req.session.user.id).then(function(user) {
        if (user !== null) {
            res.render('cssys/work/prof/config', {
                user: user
            });
        } else next();
    });
});
router.post('/config', function(req, res, next) {
    models.User.findOne(req.session.user.id).then(function(user) {
        if (user !== null) {
            var tmp = {
                email: req.body.email,
                phone: req.body.phone,
                time: new Date(),
                ip: req.ip
            };
            if (req.body.password !== "") tmp.password = sha256(req.body.password);
            user.updateAttributes(tmp).then(function(user) {
                res.send({
                    result: true
                });
            });
        } else next();
    });
});

module.exports = router;
