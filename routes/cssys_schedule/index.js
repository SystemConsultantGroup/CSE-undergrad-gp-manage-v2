var config = require('../../config');
var express = require('express');
var router = express.Router();

router.get('*', function(req, res, next) {
    req.session.system = "schedule";
    console.log(req.session);
    next();
});

router.get('/', function(req, res, next) {
    if (req.session.user.type === 0) res.redirect('/cssys/schedule/admin');
    else if (req.session.user.type === 3) res.redirect('/cssys/schedule/user');
    else next();
});

module.exports = router;