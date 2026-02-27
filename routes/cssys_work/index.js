var models = require('../../models/cssys_work');
var express = require('express');
var router = express.Router();
var storage = require('../../lib/minio_storage');
var { Op } = require('sequelize');

router.get('*', function(req, res, next) {
    req.session.system = "work";
    next();
});

router.get('/', function(req, res, next) {
    if (req.session.user.type === 0) res.redirect('/cssys/work/admin');
    else if (req.session.user.type === 1) res.redirect('/cssys/work/prof');
    else if (req.session.user.type === 2) res.redirect('/cssys/work/student');
    else next();
});

router.all('/ajax/file/download/:title/:file_name', async function(req, res, next) {
    try {
        var studentfile = await models.StudentFile.findOne({
            where: {
                path: {
                    [Op.like]: '%'+req.params.file_name
                }
            }
        });
        if (studentfile !== null) {
            studentfile.last_access = new Date();
            await studentfile.save();
            await storage.sendStoredFileToResponse(studentfile.path, studentfile.name, studentfile.type, res);
        } else next();
    } catch(err) {
        next(err);
    }
});

module.exports = router;
