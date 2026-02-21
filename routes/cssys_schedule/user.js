var config = require('../../config');
var models = require('../../models/cssys_schedule');
var express = require('express');
var router = express.Router();
var async = require('async');
var moment = require('moment');

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
router.get('/main', function(req, res, next) {
    models.Share.findAll({
        where: {
            UserId: req.session.user.id
        },
        include: [{
                model: models.Calendar,
                include: [models.User]
            },
            models.Post
        ]
    }).then(function(shares) {
        res.render('cssys/schedule/user/main', {
            shares: shares
        });
    });
});
router.post('/main', function(req, res, next) {
    console.log(req.body);
    models.Share.findOne({
        where: {
            id: req.body.ShareId,
            UserId: req.session.user.id,
        }
    }).then(function(share) {
        if (share !== null) {
            req.body.CalendarId = share.CalendarId; // 보안상 추가
            req.body.UserId = req.session.user.id; // 보안상 추가
            req.body.end = moment(req.body.end).add(1, 'day').format("YYYY-MM-DD");
            share.createPost(req.body).then(function(post) {
                res.send({
                    result: true
                });
            });
        } else next();
    });
});
router.all('/main/ajax/get_events', function(req, res, next) {
    models.Share.findAll({
        where: {
            UserId: req.session.user.id,
            display: true
        },
        include: [{
            model: models.Calendar,
            include: [models.Post]
        }]
    }).then(function(shares) {
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
    });
});
router.all('/main/ajax/get_calendar', function(req, res, next) {
    models.Share.findOne({
        where: {
            id: req.body.id,
            UserId: req.session.user.id
        }
    }).then(function(share) {
        if (share !== null) {
            res.send(share);
        } else next();
    });
});

router.all('/main/ajax/get_event', function(req, res, next) {
    models.Post.findOne({
        where: {
            id: req.body.id
        },
        include: [models.Share, models.Calendar]
    }).then(function(post) {
        if (post !== null) {
            models.Share.findOne({
                where: {
                    CalendarId: post.CalendarId,
                    UserId: req.session.user.id
                },
            }).then(function(share) {
                if (share !== null) { // 존재하면 공유가 되있음
                    post.ShareId = share.id;
                    res.send(post);
                } else next();
            });
        } else next();
    });
});

router.all('/main/ajax/set_event', function(req, res, next) {
    models.Post.findOne({
        where: {
            id: req.body.id
        }
    }).then(function(post) {
        if (post !== null) {
            models.Share.findOne({
                where: {
                    CalendarId: post.CalendarId,
                    UserId: req.session.user.id
                },
            }).then(function(share) {
                if (share !== null) { // 존재하면 공유가 되있음
                    models.Share.findOne({ // 포스트 오버라이드 위해서
                        where: {
                            id: req.body.ShareId,
                            UserId: req.session.user.id
                        },
                    }).then(function(share) {
                        if (share !== null) {
                            req.body.CalendarId = share.CalendarId;
                            req.body.ShareId = share.id;
                            req.body.UserId = share.UserId;
                            post.updateAttributes(req.body).then(function(post) {
                                res.send({
                                    result: true
                                });
                            });
                        } else next();
                    });
                } else next();
            });
        } else next();
    });
});
router.all('/main/ajax/del_event', function(req, res, next) {
    models.Post.findOne({
        where: {
            id: req.body.id
        }
    }).then(function(post) {
        if (post !== null) {
            models.Share.findOne({
                where: {
                    CalendarId: post.CalendarId,
                    UserId: req.session.user.id
                },
            }).then(function(share) {
                if (share !== null) { // 존재하면 공유가 되있음
                    post.destroy().then(function() {
                        res.send({
                            result: true
                        });
                    });
                } else next();
            });
        } else next();
    });
});

router.all('/main/ajax/set_share', function(req, res, next) {
    console.log(req.body);
    models.Share.findOne({
        where: {
            id: req.body.id,
            UserId: req.session.user.id
        }
    }).then(function(share) {
        if (share !== null) {
            req.body.CalendarId = share.CalendarId; // 보안상 오버라이드
            req.body.UserId = share.UserId; // 보안상 오버라이드
            share.updateAttributes(req.body).then(function(share) {
                res.send({
                    result: true
                });
            });
        } else next();
    });
});

//------------------------------------------------------------------------------------------
router.get('/popup', function(req, res, next) {
    res.render('cssys/schedule/user/popup');
});

//------------------------------------------------------------------------------------------
router.get('/calendar', function(req, res, next) {
    models.Share.findAll({
        where: {
            UserId: req.session.user.id
        },
        include: [{
            model: models.Calendar,
            include: [models.User]
        }]
    }).then(function(shares) {
        models.User.findAll({
            where: {
                type: 3
            }
        }).then(function(users) {
            res.render('cssys/schedule/user/calendar', {
                shares: shares,
                users: users
            });
        });
    });
});
router.post('/calendar', function(req, res, next) {
    models.Share.findOne({
        where: {
            id: req.body.id,
            UserId: req.session.user.id
        },
        include: [{
            model: models.Calendar,
            include: [models.Share]
        }]
    }).then(function(share) {
        if (share === null) {
            req.body.UserId = req.session.user.id;
            if (!req.body.users) req.body.users = [];
            models.Calendar.create(req.body).then(function(calendar) {
                req.body.users.push(req.session.user.id); // 새로 추가하는건 본인도 넣어줘야함
                delete req.body.id;
                async.each(req.body.users, function(UserId, callback) {
                    req.body.UserId = UserId;
                    calendar.createShare(req.body).then(function(share) {
                        callback();
                    });
                }, function(err) {
                    res.send({
                        result: true
                    });
                });
            });
        } else {
            req.body.UserId = share.UserId;
            req.body.CalendarId = share.CalendarId;
            share.updateAttributes(req.body).then(function(share) {
                if (share.Calendar.UserId == req.session.user.id) { // 소유자
                    req.body.id = share.CalendarId;
                    share.Calendar.updateAttributes(req.body).then(function(calendar) {
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
                        async.series(
                            [

                                function(callback) { // 공유 생성 작업
                                    async.each(createShare, function(UserId, callback) {
                                        req.body.UserId = UserId;
                                        share.Calendar.createShare(req.body).then(function(share) {
                                            callback();
                                        });
                                    }, function(err) {
                                        callback(null, null);
                                    });
                                },
                                function(callback) { // 공유 삭제 작업
                                    models.Share.destroy({
                                        where: {
                                            CalendarId: share.Calendar.id,
                                            UserId: deleteShare
                                        }
                                    }).then(function(affectedRows) {
                                        callback(null, null);
                                    });
                                }
                            ],
                            function(err, results) {
                                res.send({
                                    result: true
                                });
                            }
                        );
                    });
                } else {
                    res.send({
                        result: true
                    });
                }
            });
        }
    });
});
router.post('/calendar/ajax/get_calendar', function(req, res, next) {
    models.Share.findOne({
        where: {
            id: req.body.id,
            UserId: req.session.user.id
        },
        include: [{
            model: models.Calendar,
            include: [models.Share]
        }]
    }).then(function(share) {
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
    });
});
router.post('/calendar/ajax/del_calendar', function(req, res, next) {
    models.Share.findOne({
        where: {
            id: req.body.id,
            UserId: req.session.user.id
        },
        include: [models.Calendar]
    }).then(function(share) {
        if (share !== null) {
            if (share.Calendar.UserId == req.session.user.id) {
                var CalendarId = share.CalendarId;
                models.Post.destroy({
                    where: {
                        CalendarId: CalendarId
                    }
                }).then(function(affectedRows) {
                    models.Share.destroy({
                        where: {
                            CalendarId: CalendarId
                        }
                    }).then(function(affectedRows) {
                        models.Calendar.destroy({
                            where: {
                                id: CalendarId
                            }
                        }).then(function(affectedRows) {
                            res.send({
                                result: true
                            });
                        });
                    });
                });
            } else next();
        } else next();
    });
});
//------------------------------------------------------------------------------------------
// 회원정보 수정
router.get('/config', function(req, res, next) {
    res.render('cssys/schedule/user/config');
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

router.get('/phantom/:UserId/:date', function(req, res, next) {
    models.Share.findAll({
        where: {
            UserId: req.params.UserId,
            display: true
        },
        include: [{
            model: models.Calendar,
            include: [models.Post]
        }]
    }).then(function(shares) {
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
    });
});

var phantom = require('phantom');
router.get('/download', function(req, res, next) {
    phantom.create(function(ph) {
        ph.createPage(function(page) {
            page.set('viewportSize', {
                width: 1400,
                height: 989
            });
            page.open('http://icc.skku.ac.kr/cssys/schedule/user/phantom/' + req.session.user.id + '/' + req.query.date, function(status) {
                console.log('http://icc.skku.ac.kr/cssys/schedule/user/phantom/' + req.session.user.id + '/' + req.query.date);
                if (status === 'success') {
                    page.renderBase64("PNG", function(data) {
                        res.setHeader('Content-disposition', 'attachment; filename=calendar.png');
                        res.setHeader('Content-type', 'image/png');
                        res.send(new Buffer(data, 'base64'));
                    });
                } else {
                    res.send(false);
                }
            });
        });
    });
});

module.exports = router;
