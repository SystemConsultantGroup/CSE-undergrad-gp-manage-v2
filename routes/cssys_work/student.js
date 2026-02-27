var config = require('../../config');
var models = require('../../models/cssys_work');
var models_ = require('../../models/cssys');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var crypto = require('crypto');
var moment = require('moment');
var storage = require('../../lib/minio_storage');
var { Op } = require('sequelize');
var multer = require('multer');
var upload = multer({
    dest: './webdata_tmp/',
    limits: { fileSize: 1024 * 1024 * 100 }
});

function sha256(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function saveUploadedFileToStorage(req, file, section) {
    var objectKey = storage.makeObjectKey(['work', section], file.originalname);
    return storage.uploadTempFile(file.path, objectKey, file.mimetype).then(function() {
        req.body.name = file.originalname;
        req.body.path = objectKey;
        req.body.type = file.mimetype;
        req.body.size = file.size;
    });
}

function removeStoredFileQuietly(storedPath) {
    return storage.removeStoredFile(storedPath).catch(function() {
        return null;
    });
}

// 로그인 인증 예외 처리
router.all('*', function(req, res, next) {
    if (req.session.user.type === 2) next();
    else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function(req, res, next) {
    res.redirect('/cssys/work/student/main');
});

router.get('/main', async function(req, res, next) {
    try {
        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
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
        });
        if (user !== null) {
            var systems = await models.System.findAll();
            systems.forEach(function(system) {
                system.start_ = moment(system.start).format("YYYY-MM-DD");
                system.end_ = moment(system.end).format("YYYY-MM-DD");
                system.start__ = moment(system.start).format("YYYY년 M월 D일");
                system.end__ = moment(system.end).format("YYYY년 M월 D일");
                system.isUnder = ((new Date()) < system.start);
                system.isNow = ((new Date()) > system.start && (new Date()) < system.end);
                system.isOver = ((new Date()) > system.end);
            });
            ["oath", "proposal", "midreport", "finalreport", "paperwork", "presentation", "conference"].forEach(function(index) {
                if (user.Student[index]) user.Student[index].link = '/cssys/work/ajax/file/download/' + index + '/' + user.Student[index].path.split("\\").reverse()[0].split("/").reverse()[0];
            });
            if (user.Student.StudentInfo) user.Student.StudentInfo.time_ = moment(user.Student.StudentInfo.time).format("YYYY년 M월 D일");

            var userLog = await models_.UserLog.findAll({
                where: {
                    ids: req.session.user.ids
                },
                order: [['time', 'DESC']],
                limit: 5
            });
            console.log("usersystem",user.Student.System.id);
            userLog.forEach(function(log) {
                log.time_ = moment(log.time).format("YYYY-MM-DD HH:mm:ss");
            });
            var a = user.Student.state;
            res.render('cssys/work/student/main', {
                user: user,
                student: user.Student,
                state: [a%10, parseInt((a%100)/10), parseInt(a/100)],
                prof: user.Student.Prof,
                system: user.Student.System,
                systems: systems,
                loginLog: userLog
            });
        } else next();
    } catch(err) {
        next(err);
    }
});

//------------------------------------------------------------------------------------------


async function check_system() { // 현재 시각
    const work_system = await models.System.findAll({
        attributes: ['id', 'phase', 'start', 'end', 'reupload']
    });
    let current_system = {};
    for (let index = 0; index < work_system.length; index++) {
        if ((work_system[index].dataValues.id > 2 && work_system[index].dataValues.id < 13) || (work_system[index].dataValues.id > 13)) {
            if (work_system[index].dataValues.start < new Date() && new Date() < work_system[index].dataValues.end) {
                current_system[work_system[index].dataValues.id] = work_system[index].dataValues;
            }
        }
    }
    return current_system
}


// 진행 페이지 라우팅 구현
router.get('/system', async function(req, res, next) {
    try {
        const current_system = await check_system();

        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [
                    models.System,
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
        });
        if (user !== null) {
            if (user.Student.status === 0 || user.Student.status === 2) {
                if (user.Student.islock) {
                    res.render('cssys/work/student/system_term_lock', {
                        user: user
                    });
                } else if ((current_system[15] && (user.Student.System.id == current_system[15].reupload)) || (current_system[17] && (user.Student.System.id == current_system[17].reupload)) || (current_system[19] && (user.Student.System.id == current_system[19].reupload))) { // 재업로드 기간인 경우 2019.10.3 조건희
                    let reupload_id;
                    if (current_system[15] && (user.Student.System.id == current_system[15].reupload)) {
                        reupload_id = 15
                    } else if  (current_system[17] && (user.Student.System.id == current_system[17].reupload)) {
                        reupload_id = 17
                    } else {
                        reupload_id = 19
                    }
                    const a = ["oath", "proposal", "midreport", "finalreport", "paperwork", "presentation", "conference"];
                    for (let i = 0; i < a.length; i++) {
                        const index = a[i];
                        if (user.Student[index]) user.Student[index].link = '/cssys/work/ajax/file/download/' + index + '/' + user.Student[index].path.split("\\").reverse()[0].split("/").reverse()[0];
                    }
                    user.Student.System.dataValues.start = moment(current_system[reupload_id].start).format("YYYY-MM-DD");
                    user.Student.System.dataValues.end = moment(current_system[reupload_id].end).format("YYYY-MM-DD");
                    res.render('cssys/work/student/system_phase_' + user.Student.System.id, {
                        user: user,
                        student: user.Student,
                        system: user.Student.System,
                        reupload_id: reupload_id
                    });

                } else if ((new Date()) < user.Student.System.start || (new Date()) > user.Student.System.end) { // 현재 단계의 기간이 아님
                    res.render('cssys/work/student/system_out_date', {
                        user: user
                    });
                } else {
                    ["oath", "proposal", "midreport", "finalreport", "paperwork", "presentation", "conference"].forEach(function(index) {
                        if (user.Student[index]) user.Student[index].link = '/cssys/work/ajax/file/download/' + index + '/' + user.Student[index].path.split("\\").reverse()[0].split("/").reverse()[0];
                    });
                    user.Student.System.dataValues.start = moment(user.Student.System.start).format("YYYY-MM-DD");
                    user.Student.System.dataValues.end = moment(user.Student.System.end).format("YYYY-MM-DD");
                    res.render('cssys/work/student/system_phase_' + user.Student.System.id, {
                        user: user,
                        student: user.Student,
                        system: user.Student.System,
                        reupload_id: null
                    });
                }
            } else if (user.Student.status === 1) { // 휴학생 페이지
                res.render('cssys/work/student/system_status_1');
            } else if (user.Student.status === 0) { // 13 단계 재학 학생
                res.render('cssys/work/student/system_phase_13');
            } else { // 13 단계 졸업 학생
                res.render('cssys/work/student/system_phase_13_gr');
            }
        } else next();
    } catch(err) {
        next(err);
    }
});
router.get('/system/application', async function(req, res, next) {
    try {
        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [models.StudentInfo,models.System]
            }]
        });
        if (user && user.Student) { //로그인 세션이 학생인지 체크
          if(user.Student.status === 1) {
            res.render('cssys/work/student/system_status_1');
          } else {
            user.Student.System.dataValues.start = moment(user.Student.System.start).format("YYYY-MM-DD");
            user.Student.System.dataValues.end = moment(user.Student.System.end).format("YYYY-MM-DD");
            if(user.Student.StudentInfo){ //이전에 쓴 지원서가 있는지
                user.Student.StudentInfo.dataValues.time = moment(user.Student.StudentInfo.time).format("YYYY년 M월 D일");
                if (user.Student.System.id>=3 && user.Student.System.id<=5) { //희망교수선택 기간중인지
                    res.render('cssys/work/student/system_phase_2', { //수정 페이지
                        user: user,
                        student: user.Student,
                        system: user.Student.System,
                    });
                } else {
                    res.render('cssys/work/student/system_phase_2_view', { //보기전용 페이지
                        user: user,
                        student: user.Student
                    });
                }
            } else {
                res.render('cssys/work/student/system_phase_2', { //수정페이지
                    user: user,
                    student: user.Student,
                    system: user.Student.System,
                });
            }
          }
        } else {
            next();
        }
    } catch(err) {
        next(err);
    }
});

// 신청서 제출 처리 페이지
router.post('/system/proc/application', async function(req, res, next) {
    try {
        for(var i in req.body){
            if(req.body[i]==''){
                console.log("null");
                req.body[i]=null;
            }
        }
        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [models.StudentInfo]
            }]
        });
        if (user && user.Student) {
            req.body.UserId = user.id; // 보안상
            if (user.Student.StudentInfo) {
                await user.Student.StudentInfo.update(req.body);
                res.send({
                    result: true
                });
            } else {
                await user.Student.createStudentInfo(req.body);
                res.send({
                    result: true
                });
            }
        } else next();
    } catch(err) {
        next(err);
    }
});

// 희망 교수 선택 ajax 요청 처리
router.all('/system/ajax/permission', async function(req, res, next) {
    try {
        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [models.System]
            }]
        });
        if (user !== null) {
            var users = await models.User.findAll({
                order: [['name', 'ASC']],
                where: {
                    type: 1
                },
                include: [{
                    model: models.Prof
                }]
            });
            var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
            var order = parseInt((parseInt(user.Student.System.id) - 1) / 2);
            var data = [];

            for (const u of users) {
                var selected = await models.Student.count({
                    where: {
                        ProfId : u.Prof.id,
                        yearterm : yearterm,
                    }
                });
                var firstSelected = await models.Permission.count({
                    where: {
                        firstProfId: u.Prof.id,
                        yearterm : yearterm,
                        order : order,
                        ProfId : null
                    }
                });
                var secondSelected = await models.Permission.count({
                    where: {
                        secondProfId : u.Prof.id,
                        yearterm : yearterm,
                        order : order,
                        ProfId : null
                    }
                });
                var thirdSelected = await models.Permission.count({
                    where: {
                        thirdProfId : u.Prof.id,
                        yearterm : yearterm,
                        order : order,
                        ProfId : null
                    }
                });
                var results = { selected: selected, firstSelected: firstSelected, secondSelected: secondSelected, thirdSelected: thirdSelected };
                console.log(results);
                data.push({
                    id: u.Prof.id,
                    name: u.name,
                    major: u.major,
                    selectable: (config.cssys.permit_student_count - results.selected < 0 ? 0 : config.cssys.permit_student_count - results.selected),
                    firstSelected: results.firstSelected,
                    secondSelected: results.secondSelected,
                    thirdSelected: results.thirdSelected
                });
            }

            var permission = await models.Permission.findOne({
                where: {
                    StudentId: user.Student.id,
                    yearterm: yearterm,
                    order: order
                }
            });
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
        } else next();
    } catch(err) {
        next(err);
    }
});
// 희망교수 선택 처리 페이지
router.post('/system/proc/permission', async function(req, res, next) {
    try {
        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [models.System]
            }]
        });
        if (user !== null) {
            if ((user.Student.System.id == 3 || user.Student.System.id == 5 || user.Student.System.id == 7) && ((new Date()) > user.Student.System.start && (new Date()) < user.Student.System.end)) {
                if (req.body.firstProfId /*!= req.body.secondProfId && req.body.firstProfId != req.body.thirdProfId && req.body.secondProfId != req.body.thirdProfId*/) { //2,3지망 삭제로 1,2,3지망 교수 동일 여부 코드 주석처리
                    var yearterm = (new Date()).getFullYear().toString() + ((new Date()).getMonth() < 6 ? "01" : "02");
                    var order = parseInt((parseInt(user.Student.System.id) - 1) / 2);
                    var profIds = [req.body.firstProfId/*, req.body.secondProfId, req.body.thirdProfId*/]; //2,3지망 삭제로 2,3차 반복코드 제거
                    var profErr = null;
                    for (const id of profIds) {
                        var prof = await models.Prof.findOne({
                            where: {
                                id: id
                            },
                            include: [{
                                model: models.Student,
                                where: {
                                    yearterm: yearterm
                                }
                            }]
                        });
                        if (prof !== null) {
                            if (prof.Students.length > config.cssys.permit_student_count) {
                                profErr = prof;
                                break;
                            }
                        }
                    }
                    if (profErr) {
                        res.send({
                            result: false,
                            text: '선택하신 교수님의 지도 가능 학생수가 부족합니다. 다시 확인해주세요.'
                        });
                    } else {
                        var permission = await models.Permission.findOne({
                            where: {
                                yearterm: yearterm,
                                order: order, // 이거 귀찮아서 그냥 이렇게함
                                StudentId: user.Student.id
                            }
                        });
                        if (permission === null) { // 레코드 없을시 생성
                            await models.Permission.create({
                                yearterm: yearterm,
                                order: order, // 이거 귀찮아서 그냥 이렇게함
                                firstProfId: req.body.firstProfId,
                                //secondProfId: req.body.secondProfId, //2,3차 삭제
                                //thirdProfId: req.body.thirdProfId,
                                StudentId: user.Student.id
                            });
                            res.send({
                                result: true
                            });
                        } else {
                            await permission.update({
                                firstProfId: req.body.firstProfId,
                                //secondProfId: req.body.secondProfId, //2,3차 삭제
                                //thirdProfId: req.body.thirdProfId,
                            });
                            res.send({
                                result: true
                            });
                        }
                    }
                } else {
                    res.send({
                        result: false,
                        text: '서로다른 교수님을 선택해야합니다.'
                    });
                }
            } else {
                res.send({
                    result: false,
                    text: '희망교수 선택 기간이 아니거나, 희망교수 선택 단계가 아닙니다.'
                });
            }
        } else next();
    } catch(err) {
        next(err);
    }
});

// 서약서 및 제안서 제출 처리 페이지
router.post('/system/proc/oath_proposal', upload.fields([{name: 'oath', maxCount: 1}, {name: 'proposal', maxCount: 1}]), async function(req, res, next) {
    try {
        const current_system = await check_system();

        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [models.System, {
                    model: models.StudentFile,
                    as: 'oath'
                }, {
                    model: models.StudentFile,
                    as: 'proposal'
                }]
            }]
        });
        if (user !== null) {
            if ((user.Student.System.id == 9 && ((new Date()) > user.Student.System.start && (new Date()) < user.Student.System.end)) || (current_system[15] && (current_system[15].reupload == 9)) ) {
                var result = { result: true };

                // Process oath file
                var oathFile = req.files['oath'] ? req.files['oath'][0] : null;
                if (oathFile) {
                    try {
                        await saveUploadedFileToStorage(req, oathFile, 'oath');
                        var studentfile = await user.createStudentFile(req.body);
                        if (user.Student.oathId) {
                            if (user.Student.oathId == 1) {
                                await user.Student.setOath(studentfile);
                            } else {
                                await removeStoredFileQuietly(user.Student.oath.path);
                                await user.Student.oath.destroy();
                                await user.Student.setOath(studentfile);
                            }
                        } else {
                            await user.Student.setOath(studentfile);
                        }
                    } catch(err) {
                        result = { result: false, text: err };
                    }
                }

                // Process proposal file
                if (result.result) {
                    var proposalFile = req.files['proposal'] ? req.files['proposal'][0] : null;
                    if (proposalFile) {
                        try {
                            await saveUploadedFileToStorage(req, proposalFile, 'proposal');
                            var studentfile2 = await user.createStudentFile(req.body);
                            if (user.Student.proposalId) {
                                if (user.Student.proposalId == 1) {
                                    await user.Student.setProposal(studentfile2);
                                } else {
                                    await removeStoredFileQuietly(user.Student.proposal.path);
                                    await user.Student.proposal.destroy();
                                    await user.Student.setProposal(studentfile2);
                                }
                            } else {
                                await user.Student.setProposal(studentfile2);
                            }
                        } catch(err) {
                            result = { result: false, text: err };
                        }
                    }
                }

                // Cleanup temp files
                try {
                    if (oathFile) fs.unlinkSync(oathFile.path);
                } catch (err) {}
                try {
                    if (proposalFile) fs.unlinkSync(proposalFile.path);
                } catch (err) {}

                if (result.result) {
                    await user.Student.update({
                        title: req.body.title,
                        iswork: req.body.iswork,
                        isgroup: req.body.isgroup,
                        state: parseInt(user.Student.state/10)*10
                    });
                    res.send(result);
                } else res.send(result);
            } else {
                res.send({
                    result: false,
                    text: '서약서 및 제안서 제출 기간이 아니거나, 서약서 및 제안서 제출 단계가 아닙니다.'
                });
            }
        } else next();
    } catch(err) {
        next(err);
    }
});
// 중간보고서 처리 페이지 (신청서 제출 코드 그대로 사용)
router.post('/system/proc/midreport', upload.fields([{name: 'midreport', maxCount: 1}]), async function(req, res, next) {
    try {
        const current_system = await check_system();

        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [models.System, {
                    model: models.StudentFile,
                    as: 'midreport'
                }]
            }]
        });
        if (user !== null) {
            if ((user.Student.System.id == 10 && ((new Date()) > user.Student.System.start && (new Date()) < user.Student.System.end)) || (current_system[17] && (current_system[17].reupload == 10))) {
                var file = req.files['midreport'] ? req.files['midreport'][0] : null;
                if (!file) {
                    res.send({
                        result: false,
                        text: '파일이 업로드되지 않았습니다.'
                    });
                    return;
                }
                await saveUploadedFileToStorage(req, file, 'midreport');
                var studentfile = await user.createStudentFile(req.body);
                if (user.Student.midreportId) {
                    await removeStoredFileQuietly(user.Student.midreport.path);
                    await user.Student.midreport.destroy();
                    await user.Student.setMidreport(studentfile);
                } else {
                    await user.Student.setMidreport(studentfile);
                }
                await user.Student.update({
                    state: parseInt(user.Student.state/100)*100+user.Student.state%10,
                });
                res.send({
                    result: true,
                });
            } else {
                try {
                    var midFile = req.files['midreport'] ? req.files['midreport'][0] : null;
                    if (midFile) fs.unlinkSync(midFile.path);
                } catch (err) {}
                res.send({
                    result: false,
                    text: '신청서 제출 기간이 아니거나, 신청서 제출 단계가 아닙니다.'
                });
            }
        } else next();
    } catch(err) {
        next(err);
    }
});
// 최종보고서 및 논문/작품, 발표자료 제출 처리 페이지 (서약서 및 제안서 제출 처리 페이지 코드 사용)
router.post('/system/proc/final_etc', upload.fields([{name: 'finalreport', maxCount: 1}, {name: 'paperwork', maxCount: 1}, {name: 'presentation', maxCount: 1}, {name: 'conference', maxCount: 1}]), async function(req, res, next) {
    try {
        const current_system = await check_system();
        console.log(current_system)

        var user = await models.User.findOne({
            where: {
                id: req.session.user.id,
                type: 2
            },
            include: [{
                model: models.Student,
                include: [models.System, {
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
        });
        if (user !== null) {
            if ((user.Student.System.id == 11 && ((new Date()) > user.Student.System.start && (new Date()) < user.Student.System.end)) || (current_system[19] && (current_system[19].reupload == 11))) {
                var result = { result: true };

                // Process finalreport
                var finalreportFile = req.files['finalreport'] ? req.files['finalreport'][0] : null;
                if (finalreportFile && result.result) {
                    try {
                        await saveUploadedFileToStorage(req, finalreportFile, 'finalreport');
                        var sf1 = await user.createStudentFile(req.body);
                        if (user.Student.finalreportId) {
                            await removeStoredFileQuietly(user.Student.finalreport.path);
                            await user.Student.finalreport.destroy();
                            await user.Student.setFinalreport(sf1);
                        } else {
                            await user.Student.setFinalreport(sf1);
                        }
                    } catch(err) {
                        result = { result: false, text: err };
                    }
                }

                // Process paperwork
                var paperworkFile = req.files['paperwork'] ? req.files['paperwork'][0] : null;
                if (paperworkFile && result.result) {
                    try {
                        await saveUploadedFileToStorage(req, paperworkFile, 'paperwork');
                        var sf2 = await user.createStudentFile(req.body);
                        if (user.Student.paperworkId) {
                            await removeStoredFileQuietly(user.Student.paperwork.path);
                            await user.Student.paperwork.destroy();
                            await user.Student.setPaperwork(sf2);
                        } else {
                            await user.Student.setPaperwork(sf2);
                        }
                    } catch(err) {
                        result = { result: false, text: err };
                    }
                }

                // Process presentation
                var presentationFile = req.files['presentation'] ? req.files['presentation'][0] : null;
                if (presentationFile && result.result) {
                    try {
                        await saveUploadedFileToStorage(req, presentationFile, 'presentation');
                        var sf3 = await user.createStudentFile(req.body);
                        if (user.Student.presentationId) {
                            await removeStoredFileQuietly(user.Student.presentation.path);
                            await user.Student.presentation.destroy();
                            await user.Student.setPresentation(sf3);
                        } else {
                            await user.Student.setPresentation(sf3);
                        }
                    } catch(err) {
                        result = { result: false, text: err };
                    }
                }

                // Process conference
                var conferenceFile = req.files['conference'] ? req.files['conference'][0] : null;
                if (conferenceFile && result.result) {
                    try {
                        await saveUploadedFileToStorage(req, conferenceFile, 'conference');
                        var sf4 = await user.createStudentFile(req.body);
                        if (user.Student.conferenceId) {
                            await removeStoredFileQuietly(user.Student.conference.path);
                            await user.Student.conference.destroy();
                            await user.Student.setConference(sf4);
                        } else {
                            await user.Student.setConference(sf4);
                        }
                    } catch(err) {
                        result = { result: false, text: err };
                    }
                }

                // Cleanup temp files
                try { if (finalreportFile) fs.unlinkSync(finalreportFile.path); } catch (err) {}
                try { if (paperworkFile) fs.unlinkSync(paperworkFile.path); } catch (err) {}
                try { if (presentationFile) fs.unlinkSync(presentationFile.path); } catch (err) {}
                try { if (conferenceFile) fs.unlinkSync(conferenceFile.path); } catch (err) {}

                if (result.result) {
                    await user.Student.update({
                        title: req.body.title,
                        iswork: req.body.iswork,
                        isgroup: req.body.isgroup,
                        state: user.Student.state%100
                    });
                    res.send(result);
                } else res.send(result);
            } else {
                res.send({
                    result: false,
                    text: '최종보고서 및 논문/작품, 발표자료 제출 기간이 아니거나, 제출 단계가 아닙니다.'
                });
            }
        } else next();
    } catch(err) {
        next(err);
    }
});

//------------------------------------------------------------------------------------------
// 회원정보 수정
router.get('/config', async function(req, res, next) {
    try {
        var user = await models.User.findOne({ where: { id: req.session.user.id } });
        if (user !== null) {
            res.render('cssys/work/student/config', {
                user: user
            });
        } else next();
    } catch(err) {
        next(err);
    }
});
router.post('/config', async function(req, res, next) {
    try {
        var user = await models.User.findOne({ where: { id: req.session.user.id } });
        if (user !== null) {
            var tmp = {
                email: req.body.email,
                phone: req.body.phone,
                time: new Date(),
                ip: req.ip
            };
            if (req.body.password !== "") tmp.password = sha256(req.body.password);
            await user.update(tmp);
            res.send({
                result: true
            });
        } else next();
    } catch(err) {
        next(err);
    }
});

//------------------------------------------------------------------------------------------
// 학생 공지사항 부분 추가
router.get('/notice', function(req, res, next) {
    res.redirect('/cssys/work/student/notice/list');
});
router.get('/notice/list', function(req, res, next) {
    res.render('cssys/work/student/notice_list');
});
router.get('/notice/view/:id', function(req, res, next) {
    res.render('cssys/work/student/notice_view', {
        id: req.params.id
    });
});

//------------------------------------------------------------------------------------------
router.get('/example', function(req, res, next) {
    res.redirect('/cssys/work/student/example/list');
});
router.get('/example/list', function(req, res, next) {
    res.render('cssys/work/student/example_list');
});
router.get('/example/view/:id', function(req, res, next) {
    res.render('cssys/work/student/example_view', {
        id: req.params.id
    });
});

//------------------------------------------------------------------------------------------
// 질문 및 답변 게시판 추가 (admin.js 소스 복붙후 수정)
router.get('/qna', function(req, res, next) {
    res.redirect('/cssys/work/student/qna/list');
});
router.get('/qna/list', function(req, res, next) {
    res.render('cssys/work/student/qna_list');
});
router.get('/qna/write', function(req, res, next) {
    res.render('cssys/work/student/qna_write');
});
router.get('/qna/view/:id', function(req, res, next) {
    res.render('cssys/work/student/qna_view', {
        id: req.params.id
    });
});
router.get('/qna/reply/:id', function(req, res, next) {
    res.render('cssys/work/student/qna_reply', {
        id: req.params.id
    });
});
router.get('/qna/modify/:id', function(req, res, next) {
    res.render('cssys/work/student/qna_modify', {
        id: req.params.id
    });
});
module.exports = router;
