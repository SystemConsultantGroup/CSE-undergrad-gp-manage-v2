var config = require('../../config');
var models = require('../../models/cssys_schedule');
var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var moment = require('moment');

function sha256(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// 로그인 인증 예외 처리
router.all('*', function(req, res, next) {
    // 이미지 캡쳐 팬텀 예외처리
    if (req.path.indexOf('/phantom/') > -1) next();
    else if (req.session.user.type === 3) next();
    else res.redirect('/cssys/login');
});

// 페이지 리다이렉션 예외 처리
router.get('/', function(req, res, next) {
    res.redirect('/cssys/schedule/user/main');
});

//------------------------------------------------------------------------------------------
router.get('/main', async function(req, res, next) {
    try {
        var shares = await models.Share.findAll({
            where: {
                UserId: req.session.user.id
            },
            include: [{
                    model: models.Calendar,
                    include: [models.User]
                },
                models.Post
            ]
        });
        res.render('cssys/schedule/user/main', {
            shares: shares
        });
    } catch(err) {
        next(err);
    }
});
router.post('/main', async function(req, res, next) {
    try {
        console.log(req.body);
        var share = await models.Share.findOne({
            where: {
                id: req.body.ShareId,
                UserId: req.session.user.id,
            }
        });
        if (share !== null) {
            req.body.CalendarId = share.CalendarId; // 보안상 추가
            req.body.UserId = req.session.user.id; // 보안상 추가
            req.body.end = moment(req.body.end).add(1, 'day').format("YYYY-MM-DD");
            await share.createPost(req.body);
            res.send({
                result: true
            });
        } else next();
    } catch(err) {
        next(err);
    }
});
router.all('/main/ajax/get_events', async function(req, res, next) {
    try {
        var shares = await models.Share.findAll({
            where: {
                UserId: req.session.user.id,
                display: true
            },
            include: [{
                model: models.Calendar,
                include: [models.Post]
            }]
        });
        var eventsArr = [];
        shares.forEach(function(share) {
            share.Calendar.Posts.forEach(function(post) {
                post.dataValues.color = post.bgcolor;
                post.dataValues.textColor = post.fontcolor;
                post.dataValues.allDay = true;
                eventsArr.push(post);
            });
        });
        res.send(eventsArr);
    } catch(err) {
        next(err);
    }
});
router.all('/main/ajax/get_calendar', async function(req, res, next) {
    try {
        var share = await models.Share.findOne({
            where: {
                id: req.body.id,
                UserId: req.session.user.id
            }
        });
        if (share !== null) {
            res.send(share);
        } else next();
    } catch(err) {
        next(err);
    }
});

router.all('/main/ajax/get_event', async function(req, res, next) {
    try {
        var post = await models.Post.findOne({
            where: {
                id: req.body.id
            },
            include: [models.Share, models.Calendar]
        });
        if (post !== null) {
            var share = await models.Share.findOne({
                where: {
                    CalendarId: post.CalendarId,
                    UserId: req.session.user.id
                },
            });
            if (share !== null) { // 존재하면 공유가 되있음
                post.ShareId = share.id;
                res.send(post);
            } else next();
        } else next();
    } catch(err) {
        next(err);
    }
});

router.all('/main/ajax/set_event', async function(req, res, next) {
    try {
        var post = await models.Post.findOne({
            where: {
                id: req.body.id
            }
        });
        if (post !== null) {
            var share = await models.Share.findOne({
                where: {
                    CalendarId: post.CalendarId,
                    UserId: req.session.user.id
                },
            });
            if (share !== null) { // 존재하면 공유가 되있음
                var targetShare = await models.Share.findOne({ // 포스트 오버라이드 위해서
                    where: {
                        id: req.body.ShareId,
                        UserId: req.session.user.id
                    },
                });
                if (targetShare !== null) {
                    req.body.CalendarId = targetShare.CalendarId;
                    req.body.ShareId = targetShare.id;
                    req.body.UserId = targetShare.UserId;
                    await post.update(req.body);
                    res.send({
                        result: true
                    });
                } else next();
            } else next();
        } else next();
    } catch(err) {
        next(err);
    }
});
router.all('/main/ajax/del_event', async function(req, res, next) {
    try {
        var post = await models.Post.findOne({
            where: {
                id: req.body.id
            }
        });
        if (post !== null) {
            var share = await models.Share.findOne({
                where: {
                    CalendarId: post.CalendarId,
                    UserId: req.session.user.id
                },
            });
            if (share !== null) { // 존재하면 공유가 되있음
                await post.destroy();
                res.send({
                    result: true
                });
            } else next();
        } else next();
    } catch(err) {
        next(err);
    }
});

router.all('/main/ajax/set_share', async function(req, res, next) {
    try {
        console.log(req.body);
        var share = await models.Share.findOne({
            where: {
                id: req.body.id,
                UserId: req.session.user.id
            }
        });
        if (share !== null) {
            req.body.CalendarId = share.CalendarId; // 보안상 오버라이드
            req.body.UserId = share.UserId; // 보안상 오버라이드
            await share.update(req.body);
            res.send({
                result: true
            });
        } else next();
    } catch(err) {
        next(err);
    }
});

//------------------------------------------------------------------------------------------
router.get('/popup', function(req, res, next) {
    res.render('cssys/schedule/user/popup');
});

//------------------------------------------------------------------------------------------
router.get('/calendar', async function(req, res, next) {
    try {
        var shares = await models.Share.findAll({
            where: {
                UserId: req.session.user.id
            },
            include: [{
                model: models.Calendar,
                include: [models.User]
            }]
        });
        var users = await models.User.findAll({
            where: {
                type: 3
            }
        });
        res.render('cssys/schedule/user/calendar', {
            shares: shares,
            users: users
        });
    } catch(err) {
        next(err);
    }
});
router.post('/calendar', async function(req, res, next) {
    try {
        var share = await models.Share.findOne({
            where: {
                id: req.body.id,
                UserId: req.session.user.id
            },
            include: [{
                model: models.Calendar,
                include: [models.Share]
            }]
        });
        if (share === null) {
            req.body.UserId = req.session.user.id;
            if (!req.body.users) req.body.users = [];
            var calendar = await models.Calendar.create(req.body);
            req.body.users.push(req.session.user.id); // 새로 추가하는건 본인도 넣어줘야함
            delete req.body.id;
            for (var i = 0; i < req.body.users.length; i++) {
                req.body.UserId = req.body.users[i];
                await calendar.createShare(req.body);
            }
            res.send({
                result: true
            });
        } else {
            req.body.UserId = share.UserId;
            req.body.CalendarId = share.CalendarId;
            await share.update(req.body);
            if (share.Calendar.UserId == req.session.user.id) { // 소유자
                req.body.id = share.CalendarId;
                await share.Calendar.update(req.body);
                var nowUsers = [];
                for (var index in share.Calendar.Shares) {
                    if (share.Calendar.Shares[index].UserId != req.session.user.id) nowUsers.push(share.Calendar.Shares[index].UserId);
                }
                var updateUsers = (req.body.users ? req.body.users.map(Number) : []);
                var createShare = [];
                var deleteShare = [];
                createShare = updateUsers.filter(function(n) {
                    return nowUsers.indexOf(n) < 0;
                });
                deleteShare = nowUsers.filter(function(n) {
                    return updateUsers.indexOf(n) < 0;
                });

                delete req.body.id;
                // 공유 생성 작업
                for (var i = 0; i < createShare.length; i++) {
                    req.body.UserId = createShare[i];
                    await share.Calendar.createShare(req.body);
                }
                // 공유 삭제 작업
                await models.Share.destroy({
                    where: {
                        CalendarId: share.Calendar.id,
                        UserId: deleteShare
                    }
                });
                res.send({
                    result: true
                });
            } else {
                res.send({
                    result: true
                });
            }
        }
    } catch(err) {
        next(err);
    }
});
router.post('/calendar/ajax/get_calendar', async function(req, res, next) {
    try {
        var share = await models.Share.findOne({
            where: {
                id: req.body.id,
                UserId: req.session.user.id
            },
            include: [{
                model: models.Calendar,
                include: [models.Share]
            }]
        });
        if (share !== null) {
            var tmpArr = [];
            for (var index in share.Calendar.Shares) {
                if (share.Calendar.Shares[index].UserId != req.session.user.id) tmpArr.push(share.Calendar.Shares[index].UserId);
            }
            res.send({
                share: share,
                users: tmpArr
            });
        } else next();
    } catch(err) {
        next(err);
    }
});
router.post('/calendar/ajax/del_calendar', async function(req, res, next) {
    try {
        var share = await models.Share.findOne({
            where: {
                id: req.body.id,
                UserId: req.session.user.id
            },
            include: [models.Calendar]
        });
        if (share !== null) {
            if (share.Calendar.UserId == req.session.user.id) {
                var CalendarId = share.CalendarId;
                await models.Post.destroy({
                    where: {
                        CalendarId: CalendarId
                    }
                });
                await models.Share.destroy({
                    where: {
                        CalendarId: CalendarId
                    }
                });
                await models.Calendar.destroy({
                    where: {
                        id: CalendarId
                    }
                });
                res.send({
                    result: true
                });
            } else next();
        } else next();
    } catch(err) {
        next(err);
    }
});
//------------------------------------------------------------------------------------------
// 회원정보 수정
router.get('/config', function(req, res, next) {
    res.render('cssys/schedule/user/config');
});
router.post('/config', async function(req, res, next) {
    try {
        var user = await models.User.findByPk(req.session.user.id);
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
// cssys_work admin 페이지 소스 재활용함
router.get('/board', function(req, res, next) {
    res.redirect('/cssys/schedule/user/board/list');
});
router.get('/board/list', function(req, res, next) {
    res.render('cssys/schedule/user/board_list');
});
router.get('/board/write', function(req, res, next) {
    res.render('cssys/schedule/user/board_write');
});
router.get('/board/view/:id', function(req, res, next) {
    res.render('cssys/schedule/user/board_view', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/board/reply/:id', function(req, res, next) {
    res.render('cssys/schedule/user/board_reply', {
        id: req.params.id // ajax 요청할때 사용
    });
});
router.get('/board/modify/:id', function(req, res, next) {
    res.render('cssys/schedule/user/board_modify', {
        id: req.params.id // ajax 요청할때 사용
    });
});


//-----------------------------------------------------------------
// calendar download

router.get('/phantom/:UserId/:date', async function(req, res, next) {
    try {
        var shares = await models.Share.findAll({
            where: {
                UserId: req.params.UserId,
                display: true
            },
            include: [{
                model: models.Calendar,
                include: [models.Post]
            }]
        });
        var eventsArr = [];
        shares.forEach(function(share) {
            share.Calendar.Posts.forEach(function(post) {
                post.dataValues.color = post.bgcolor;
                post.dataValues.textColor = post.fontcolor;
                post.dataValues.allDay = true;
                eventsArr.push(post);
            });
        });
        res.render('cssys/schedule/user/download', {
            json: JSON.stringify(eventsArr),
            date: req.params.date
        });
    } catch(err) {
        next(err);
    }
});

// TODO: Calendar screenshot feature removed (phantom deprecated). Replace with puppeteer if needed.
router.get('/download', function(req, res, next) {
    res.status(501).send({
        result: false,
        message: 'Calendar screenshot feature is not available. Phantom has been deprecated.'
    });
});

module.exports = router;
