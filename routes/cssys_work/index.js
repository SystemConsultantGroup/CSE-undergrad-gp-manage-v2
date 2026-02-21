var config = require('../../config');
var models = require('../../models/cssys_work');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

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
