
var config = require('../../config');
var models = require('../../models/cssys_guidance');
var models_ = require('../../models/cssys');
var models_w = require('../../models/cssys_work');
var Sequelize = require('sequelize');
var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var { Op } = require('sequelize');
var moment = require('moment');
var path = require('path');
var multer = require('multer');
var upload = multer({
    dest: './webdata_tmp/',
    limits: { fileSize: 1024 * 1024 * 100 }
});
var xlsx = require('node-xlsx');
var fs = require('fs');

function sha256(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// 어드민 로그인 인증 예외 처리
router.all('*', function(req, res, next) {
    if (req.session.user.type === 1) next();
    else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function(req, res, next) {
    res.redirect('/cssys/guidance/prof/main');
});

//------------------------------------------------------------------------------------------
router.get('/main', async (req, res) => {
    // 전달할 내용 
    // 1. 교수의 로그인 내역(ip 로그)
    // 2. 교수에게 신청한 사람들 목록(5명만 일단 올려주기)
    // 3. 교수 정보

    const students = await models.User.findAll({
                where: {
                    type: 2
                },
                include: [{model: models.Student, attributes: ['state', 'updatedAt']}],
                attributes: ['name']
            });

    const profs = await models.User.findAll({
                where: {
                    type: 1
                },
                include: [{model: models.Student, attributes: ['state']}],
                attributes: ['name']
            });

    const Prof_data = await models.User.findOne({ // 교수 자기 내용
        where: {
            id: req.session.user.id,
            type: 1
        },
        include: [{
            model: models.Prof,
            attributes: ['id']
        }],
        attributes: ['ids', 'name', 'email', 'phone', 'type', 'major', 'ip']
    });

    const Prof_student_List = await models.Student.findAll({ // 자신에게 신청한 학생들 목록
        where: {
            ProfId: Prof_data.dataValues.Prof.id
        },
        include: [{
            model: models.User,
            attributes: ['name']
        }],
        attributes: ['id', 'term', 'status', 'doublemajor', 'note', 'time', 'ip', 'createdAt', 'UserId'], // 나중에 필요없는건 삭제,
        order: [[
            models.User, 'name', 'ASC'
        ]]
    });

    // 자신에게 관련된 로그 불러오기
    const Prof_PLog = await models.GPermissionLog.findAll({
        where: {
            ProfId: Prof_data.dataValues.Prof.id
        },
        include: [{
            model: models.Student,
            attributes: ['UserId'],
            include: [{
                model: models.User,
                attributes: ['name', 'email']
            }]
        }],
        attributes: ['id','createdAt', 'resorreq' ,'state'],
        limit: 5,
        order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });
    /* const Prof_CLog = await models.GPermissionLog.findAll({
        where: {
            ProfId: Prof_data.dataValues.Prof.id,
            resorreq: 'res',
            state: 0
        },
        include: [{
            model: models.Student,
            attributes: ['UserId'],
            include: [{
                model: models.User,
                attributes: ['name', 'email']
            }]
        }],
        attributes: ['createdAt'],
        limit: 2,
        order: 'createdAt DESC'
    }); */


    const userLog = await models_.UserLog.findAll({
        where: {
            ids: req.session.user.ids
        },
        order: [['time', 'DESC']],
        attributes: ['success', 'ids', 'time', 'ip', 'createdAt'],
        limit: 5
    });
    userLog.forEach(function(log) {
        log.time_ = moment(log.time).format("YYYY-MM-DD HH:mm:ss");
    });

    const today = new Date().toLocaleDateString();
    res.render('cssys/guidance/prof/main', {
        profs: profs,
        students: students,
        applying_students: students.filter(student => student.Student && student.Student.state == 1),
        completed_students: students.filter(student => student.Student && student.Student.state == 2),
        today_applying_students: students.filter(student => student.Student && student.Student.state == 1 && student.Student.updatedAt.toLocaleDateString() == today),
        today_completed_students: students.filter(student => student.Student && student.Student.state == 2 && student.Student.updatedAt.toLocaleDateString() == today),
        user: Prof_data,
        studentList: Prof_student_List,
        loginLog: userLog,
        permissionLog: Prof_PLog,
        // cancelLog: Prof_CLog
    });


    /*

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
        // order: 'SystemId,ids'
        order: [['ids', 'ASC']]
    })/* .then(function(users) {
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
            res.render('cssys/guidance/prof/main', {
                systems: systems,
                users: users
            });
        });
    }) */
});

//------------------------------------------------------------------------------------------
router.get('/permission', async (req, res, next) => { // 자신에게 신청한 학생들 모음

    const Prof = await models.Prof.findOne({
        where: {
            UserId: req.session.user.id
        }
    });
    const Prof_id = Prof.dataValues.id;

    const student = await models.GPermissionLog.findAll({
        where: {
            ProfId: Prof_id,
            resorreq: 'req',
            state: '0'
        },
        attributes: ['StudentId', 'createdAt'],
        include: [{
            model: models.Student,
            attributes: ['id', 'term', 'status', 'doublemajor',/* 'note', */ 'state', 'updatedAt'],
            include: [{
                model: models.User,
                // where: { type: 2 },
                attributes: ['name', 'email', 'phone', 'major']
            }]
        }],
        order: [[models.Student, {model: models.User},  'name', 'asc']] // 'createdAt desc' 해줘야 함
    });

    let data = {};
    data.student = student;
    res.render('cssys/guidance/prof/permission', data);

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
                            [Op.or]: [{
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
                            res.render('cssys/guidance/prof/permission_application', {
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
router.post('/permission/ajax/set_student', async function(req, res, next) {
    try {
        var prof = await models.Prof.findOne({
            where: {
                UserId: req.session.user.id
            }
        });
        if (prof) {
            var systems = await models.System.findAll({
                where: {
                    id: [4, 6, 8]
                }
            });
            systems.forEach(function(system) {
                system.isNow = ((new Date()) > system.start && (new Date()) < system.end);
            });
            if (systems[0].isNow || systems[1].isNow || systems[2].isNow) {
                var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
                var order = (systems[0].isNow ? 1 : (systems[1].isNow ? 2 : 3));
                // var count0 = await models.Student.count(...)
                // callback(null, 0); was original behavior
                var count0 = 0;
                var count1 = await models.Permission.count({
                    where: {
                        yearterm: yearterm,
                        order: order,
                        [Op.or]: [{
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
                });
                var counts = [count0, count1];
                var selectable = (config.cssys.permit_student_count - (counts[0] + counts[1]) < 0 ? 0 : config.cssys.permit_student_count - (counts[0] + counts[1]));
                if (selectable > 0) {
                    var permission = await models.Permission.findByPk(req.body.id);
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
                            result: true
                        });
                    }
                } else {
                    res.send({
                        result: false,
                        text: "지도 학생 선택 가능 학생수를 초과 하셨습니다. 더이상 선택 할 수 없습니다."
                    });
                }
            } else next();
        } else next();
    } catch(err) { next(err); }
});


router.get('/student_list', function(req, res, next) {
    res.render('cssys/guidance/prof/student_list');
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
        // order: 'SystemId,ids'
        order: [['ids', 'ASC']]
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
            ]
        }],
        // order: 'SystemId,ids'
        order: [['ids', 'ASC']]
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
            res.render('cssys/guidance/prof/student_application', {
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
                    if (index != "StudentInfo") user.Student[index].link = '/cssys/guidance/ajax/file/download/' + index + '/' + path.basename(user.Student[index].path);
                    user.Student[index].time_ = moment(user.Student[index].time).format("YYYY년 M월 D일");
                }
            });
            res.render('cssys/guidance/prof/student_view', {
                user: user,
                student: user.Student
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

//------------------------------------------------------------------------------------------
// 교수 공지사항 부분 추가
router.get('/notice', function(req, res, next) {
    res.redirect('/cssys/guidance/prof/notice/list');
});
router.get('/notice/list', function(req, res, next) {
    res.render('cssys/guidance/prof/notice_list');
});
router.get('/notice/view/:id', function(req, res, next) {
    res.render('cssys/guidance/prof/notice_view', {
        id: req.params.id
    });
});

//------------------------------------------------------------------------------------------
// 질문 및 답변 게시판 추가 (admin.js 소스 복붙후 수정)
router.get('/qna', function(req, res, next) {
    res.redirect('/cssys/guidance/prof/qna/list');
});
router.get('/qna/list', function(req, res, next) {
    res.render('cssys/guidance/prof/qna_list');
});
router.get('/qna/write', function(req, res, next) {
    res.render('cssys/guidance/prof/qna_write');
});
router.get('/qna/view/:id', function(req, res, next) {
    res.render('cssys/guidance/prof/qna_view', {
        id: req.params.id
    });
});
router.get('/qna/reply/:id', function(req, res, next) {
    res.render('cssys/guidance/prof/qna_reply', {
        id: req.params.id
    });
});
router.get('/qna/modify/:id', function(req, res, next) {
    res.render('cssys/guidance/prof/qna_modify', {
        id: req.params.id
    });
});

//------------------------------------------------------------------------------------------
// 회원정보 수정
router.get('/config', function(req, res, next) {
    models.User.findByPk(req.session.user.id).then(function(user) {
        if (user !== null) {
            res.render('cssys/guidance/prof/config', {
                user: user
            });
        } else next();
    });
});
router.post('/config', function(req, res, next) {
    models.User.findByPk(req.session.user.id).then(function(user) {
        if (user !== null) {
            var tmp = {
                email: req.body.email,
                phone: req.body.phone,
                time: new Date(),
                ip: req.ip
            };
            if (req.body.password !== "") tmp.password = sha256(req.body.password);
            user.update(tmp).then(function(user) {
                res.send({
                    result: true
                });
            });
        } else next();
    });
});

//------------------------------------------------------------------------------------------
// 생활지도

// 교수 수락
/*router.post('/acpt', async function (req, res) {

    const userid = req.session.user.id;

    // 1. 유저 정보 불러오기
    const userdata = await models.User.findOne({ 
        where: { id: userid },
        attributes: ['id', 'type'],
        include: [{
            model: models.Prof,
            attributes: ['id']
        }]
    });

    const Prof_id = userdata.Prof.id;
    const stu_Id = parseInt(req.body.student_id);

    // 2. 학생 데이터 status 업데이트(0->2)
    await models.Student.update({
        state: 2, // 2 배정 완료
        ProfId: Prof_id
    },{ where: { UserId: stu_Id } });

    // 3. 로그 생성
    const stu = await models.Student.findOne({ // student 디비에서 id 불러오기
        where: { UserId: stu_Id },
        attributes: ['id']
    });

    const Log = {
        resorreq: 'res',
        state: 1,
        StudentId: stu.id,
        ProfId: Prof_id
    }

    await models.GPermissionLog.create(Log);
    
    res.send({ result: true });
});*/

router.post('/acpt', async function (req, res) {

     // 1. 먼저 현재 유저의 정보 불러오기
     const userdata = await models.User.findOne({ 
        where: { id: req.session.user.id },
        attributes: ['id', 'type'],
        include: [{
            model: models_w.Prof,
            attributes: ['id']
        }]
    });


    // 2. 학생 데이터 status 업데이트( * -> 0) 해제 상태
    await models.Student.update({
        state: 2,
        ProfId: userdata.Prof.id,
    },{ where: { id: req.body.student_Id } });
    
    // 3. 로그 생성
    const Log = {
        resorreq: 'res',
        state: 1, // 수락
        StudentId: req.body.student_Id,
        ProfId: userdata.Prof.id,
    };

    await models.GPermissionLog.create(Log);
    
    res.send({ result: true });
});

router.post('/reject', async function (req, res) { // 교수 거절 rest

    // 1. 먼저 현재 유저의 정보 불러오기
    const userdata = await models.User.findOne({ 
        where: { id: req.session.user.id },
        attributes: ['id', 'type'],
        include: [{
            model: models_w.Prof,
            attributes: ['id']
        }]
    });


    // 2. 학생 데이터 status 업데이트( * -> 0) 해제 상태
    await models.Student.update({
        state: 0,
        ProfId: null
    },{ where: { id: req.body.student_Id } });
    
    // 3. 로그 생성
    const Log = {
        resorreq: 'res',
        state: 0, // 거절
        StudentId: req.body.student_Id,
        ProfId: userdata.Prof.id,
    };

    await models.GPermissionLog.create(Log);
    
    res.send({ result: true });
});

router.post('/cancelCheck', async function (req, res) { // 교수 취소확인 rest
    await models.GPermissionLog.update({
        text: null
    }, { where: { id: req.body.logId } });
    res.send({ result: true });
});

router.get('/connection', async (req, res) => { // 배정된 학생들 목록 불러오기 
    const ProfId = await models.Prof.findOne({
        where: {
            UserId: req.session.user.id
        }
    });
    const Prof_id = ProfId.dataValues.id;

    const Students = await models.Student.findAll({
        where: {
            ProfId: Prof_id,
            state: 2,
        },
        attributes: ['id', 'term', 'status', 'doublemajor', 'note', 'state', 'ProfId', 'UserId'],
        include: [{
            model: models.User,
            attributes: ['name']
        }],
        order: [[models.User, 'name', 'asc']]
    });
    
    res.send(Students); // 배정된 학생들 목록
});

/*router.post('/stu_list', async (req, res) => { // 자신에게 신청한 학생들 목록(배정x)

    const ProfId = await models.Prof.findOne({
        where: {
            UserId: req.session.user.id
        }
    });
    const Prof_id = ProfId.dataValues.id;

    const Students = await models.Student.findAll({ // 신청한 학생들 총 목록
        where: {
            ProfId: null,
            state: 1
        },
        attributes: ['id', 'term', 'status', 'doublemajor', 'note', 'state', 'ProfId', 'UserId'],
        include: [{
            model: models.User,
            attributes: ['name']
        }],
        order: [[models.User, 'name', 'asc']]

    });
    
    const data = await Promise.all(Students.map(async (stu) => {
        const Log = await models.GPermissionLog.findOne({
            where: {
                StudentId: stu.dataValues.id
            },
            attributes: ['resorreq', 'state', 'createdAt'],
            order: 'createdAt desc'
        });
        console.log(Log);
        if (Log) {
            if (Log.ressorreq == 'req' && Log.state == 1) {
                return Promise.resolve(stu.dataValues);
            }
        }
    }));
    console.log(data);
    res.send({aaData: data}); // 자신에게 신청한 교수 리스트
});
/*router.post('/stu_list', async (req, res) => {
    const profId = await models.Prof.findOne({
        where: {
            UserId: req.session.user.id,
        },
        attributes: ['id'],
    });
    const Logs = await models.GPermissionLog.findAll({
        where: {
            ProfId: profId.id,
            state: 1,
            resorreq: "req",
        },
        attributes: ['StudentId'],
    });
    const idlist = [];
    Logs.forEach((n, i)=>{
        idlist.push(n.StudentId);
    })
    const student = await models.Student.findAll({
        where: {
            id: {
                in: idlist,
            },
            state: 1,
            ProfId: null,
        },
        attributes: ['id', 'note'],
        include: {
            model: models.User,
            attributes: ['ids', 'name', 'major'],
        },
    });
    student.forEach((n,i) => {
        student[i].dataValues.index=i+1;
    })
    res.send({
        aaData: student,
    });
});*/
/*router.post('/stu_list', async (req, res) => { // 자신에게 신청한 학생들 목록(배정x)

    const ProfId = await models.Prof.findOne({
        where: {
            UserId: req.session.user.id
        }
    });
    const Prof_id = ProfId.dataValues.id;

    const Students = await models.Student.findAll({
        where: {
            ProfId: null,
            state: 1
        },
        attributes: ['id', 'term', 'status', 'doublemajor', 'note', 'state', 'ProfId', 'UserId'],
        include: [{
            model: models.User,
            attributes: ['name', 'major']
        }],
        order: [[models.User, 'name', 'asc']]

    });
    
    const data = await Promise.all(Students.map(async (stu) => {
        const Log = await models.GPermissionLog.findOne({
            where: {
                resorreq: 'req',
                state: 1,
                ProfId: ProfId.dataValues.id
            }
        });
        if (Log) {
            return Promise.resolve(stu.dataValues);
        }
    }));
    res.send({aaData: data}); // 자신에게 신청한 교수 리스트
    
});*/
router.post('/stu_list', async (req, res) => { // 자신에게 신청한 학생들 목록(배정x)

    const ProfId = await models.Prof.findOne({
        where: {
            UserId: req.session.user.id
        },
        attributes: ['id'],
    });
    const Logs = await models.GPermissionLog.findAll({
        where: {
            resorreq: 'req',
            state: 1
        },
        attributes: [
            'StudentId',
            [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'createdAt'],
        ],
        group: ['StudentId'],
    });
    let cnt=0;
    const list = await Promise.all(Logs.map(async (n, i)=>{
        const log = await models.GPermissionLog.findOne({
            where: {
                StudentId: n.StudentId,
                createdAt: n.createdAt,
                state: 1,
                resorreq: 'req',
            },
            attributes: ['id', 'StudentId','createdAt', 'ProfId'],
            order: [['createdAt', 'DESC']]
        });
        if(log.ProfId == ProfId.id){
            cnt+=1;
            const student = await models.Student.findOne({
                where: {
                    id: n.StudentId,
                    state: 1,
                    ProfId: null,
                },
                attributes: ['id', 'note', 'state', 'ProfId'],
                include: {
                    model: models.User,
                    attributes: ['ids', 'name', 'major'],
                },
            });
            if (student && student.dataValues.state == 1 ) {
                student.dataValues.type = "신청";
                student.dataValues.logId = log.id;
                return Promise.resolve(student);
            } else {
                return null;
            }
        } else {
            return null;
        }
    }));
    const cancelLogs = await models.GPermissionLog.findAll({
        where: {
            resorreq: 'req',
            state: 0
        },
        attributes: [
            'StudentId',
            [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'createdAt'],
        ],
        group: ['StudentId'],
    });
    const cancelList = await Promise.all(cancelLogs.map(async (n, i)=>{
        const log = await models.GPermissionLog.findOne({
            where: {
                StudentId: n.StudentId,
                createdAt: n.createdAt,
                state: 0,
                resorreq: 'req',
            },
            attributes: ['id', 'StudentId','createdAt', 'ProfId', 'text'],
            order: [['createdAt', 'DESC']]
        });
        if(log.ProfId == ProfId.id){
            cnt+=1;
            const student = await models.Student.findOne({
                where: {
                    id: n.StudentId
                },
                attributes: ['id', 'note', 'state', 'ProfId'],
                include: {
                    model: models.User,
                    attributes: ['ids', 'name', 'major'],
                }
            });
            if (student) {
                student.dataValues.note = log.dataValues.text;
                student.dataValues.type = '취소';
                student.dataValues.logId = log.id;
                return Promise.resolve(student);
            } else {
                return null;
            }
        } else {
            return null;
        }
    }));
    list.sort();
    list.splice(cnt, list.length);
    const cancelList2 = cancelList.filter(i => i!==null && i.dataValues.note !== null);
    const result = list.filter(i => i !== null);

    if (result.length != 0) {
        result.map((n, i) => {
            result[i].dataValues.index = i+1;
        });
    }
    const cancelList3 = cancelList2.filter((i) => {
        let returnvalue = true;
        result.forEach(async (e) => {
            if (e.dataValues.id == i.dataValues.id) { // 신청리스트에 존재 시 false
                returnvalue = false;
                await models.GPermissionLog.update({
                    text: null
                }, { where: { id: i.dataValues.logId } });
            }
        });
        if (returnvalue) {
            return i
        }
    })
    res.send({
        aaData: result.concat(cancelList3)
    });
    
});

router.get('/stu_assigned', async (req, res) => { // 특정 교수 현황 조회
    // 누가 교수와 배정, 신청, 취소 상황인지 보여줌
    const prof_id = await models.Prof.findOne({
        where: {
            UserId: req.session.user.id
        },
        attributes: ['id']
    });
    const Profid = prof_id.dataValues.id; // Profid: prof 테이블의 id

    // 1. 배정 완료된 학생 정보 불러오기
    const student = await models.User.findAll({
        where: {
            id: req.session.user.id
        },
        attributes: ['name', 'email', 'phone', 'major', 'time'],
        include: [{
            model: models.Prof,
            attributes: ['id'],
            include: [{
                model: models.Student,
                where: {
                    state: 2
                },
                attributes: ['term', 'status', 'doublemajor', 'note', 'state', 'time'],
                include: [{
                    model: models.User,
                    attributes: ['name', 'email', 'phone', 'major', 'time']
                }]
            }]
        }],
        order: [ [models.Prof, models.Student, models.User, 'name', 'ASC'] ]
    });

    // result안에 넣기
    let result = {};
    if (student.length != 0) {
        (student[0].dataValues.Prof) ? result.aaData = student[0].Prof.Students : result.aaData = student;
    } else {
        result.aaData = student;
    }
    res.send(result);
});

module.exports = router;
