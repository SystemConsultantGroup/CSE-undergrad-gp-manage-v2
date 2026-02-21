var config = require('../../config');
var models = require('../../models/cssys_guidance');
var models_ = require('../../models/cssys');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

router.get('*', function(req, res, next) {
    req.session.system = "guidance";
    next();
});

router.get('/', function(req, res, next) {
    if (req.session.user.type === 0) res.redirect('/cssys/guidance/admin');
    else if (req.session.user.type === 1) res.redirect('/cssys/guidance/prof');
    else if (req.session.user.type === 2) res.redirect('/cssys/guidance/student');
    else next();
});
router.post('/ajax/regiprof/proflist', async function(req, res, next) {
    const proflist = await models.Prof.findAll({
        include: [{
            model: models_.User,
            attributes: ['id', 'name', 'email', 'phone', 'major'],
        }],
        order: [[models_.User, 'name', 'asc']]
    });
    proflist.forEach((i, n)=>{ // 나중에 promise.all 사용 
        proflist[n].dataValues.index = n;
        console.log(i.dataValues.User);
        if(i.dataValues.User != null) {
            switch(i.dataValues.User.dataValues.major){
                case 0: 
                    proflist[n].dataValues.User.dataValues.major = '전자전기공학부';
                    break;
                case 1:  
                    proflist[n].dataValues.User.dataValues.major = '컴퓨터공학과';
                    break;
                case 2:  
                    proflist[n].dataValues.User.dataValues.major = '반도체시스템공학과';
                    break;
                case 3:  
                    proflist[n].dataValues.User.dataValues.major = '소프트웨어학과';
                    break;
                case 4:  
                    proflist[n].dataValues.User.dataValues.major = '정보통신대학';
                    break;
                case 5:  
                    proflist[n].dataValues.User.dataValues.major = '인터랙션사이언스학과';
                    break;
                default: 
                    proflist[n].dataValues.User.dataValues.major = '없음';
                    break;
            }
        }
    });
    proflist.splice(0,1);
    res.send({
        aaData: proflist,
    });
});
router.all('/ajax/file/download/:title/:file_name', function(req, res, next) {
    models.StudentFile.findOne({
        where: {
            path: {
                like : '%'+req.params.file_name
            }
        }
    }).then(function(studentfile) {
        if (studentfile !== null) {
            studentfile.last_access = new Date();
            studentfile.save().then(function(studentfile) {
                res.download(studentfile.path,studentfile.name);
            });
        } else next();
    });
});

module.exports = router;
