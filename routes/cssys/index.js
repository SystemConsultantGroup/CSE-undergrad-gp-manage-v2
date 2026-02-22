var models = require('../../models/cssys');
var express = require('express');
var router = express.Router();
var path = require('path');
var async = require('async');
var sha256 = require('sha256');
var moment = require('moment');
var storage = require('../../lib/minio_storage');

router.all('*', function(req, res, next) {
    // https 리다이렉션 처리 및 세션에 ip 등록 (apache proxypass & x-forwarded-for 보안 문제로 req.ip 사용할수 없으므로)
    // if (!req.session.ip) req.session.ip = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',').slice(-1)[0].trim() : req.ip);
    if (!req.session.ip) req.session.ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null)).split(",")[0];
    req.body.time = new Date();
    req.body.ip = req.session.ip;
    // if (process.env.NODE_ENV === 'production' && !req.secure) {
    //     res.redirect('https://' + req.hostname + req.originalUrl);
    // } else next();
    next();
});

// 페이지 리다이렉션 예외 처리
router.get('/', function(req, res, next) {
    res.redirect('/cssys/login');
});

// 로그인 페이지 라우팅
router.get('/login', function(req, res, next) {
    if(!!req.session.user) {
        if (req.session.system) {
            res.redirect(`/cssys/${req.session.system}/${['admin', 'prof', 'student'][req.session.user.type]}/main`)
        } else {
            res.redirect('/cssys/logout')
        }
    }
    else {
        res.render('cssys/login', {
            'ip': req.session.ip,
            'time': moment().format("YYYY-MM-DD HH:mm:ss")
        });
    }
});

router.post('/login', function(req, res, next) {
    models.User.findOne({ // 유저 검색
        where: {
            ids: req.body.ids,
            password: sha256(req.body.password)
        }
    }).then(function(user) {
        if (user !== null) {
            req.session.user = user;
            user.time = new Date();
            user.ip = req.session.ip;
            user.save().then(function(user) {
                req.session.user.time = user.time; // 세션 추가 등록
                req.session.user.ip = user.ip;
                delete req.body.password;
                req.body.success = true;
                user.createUserLog(req.body).then(function(userLog) {
                    res.send({ // 로그인 결과 response
                        result: true,
                        type: user.type
                    });
                });
            });
        } else {
            req.body.success = false;
            models.UserLog.create(req.body).then(function(userLog) {
                res.send({
                    result: false
                });
            });
        }
    });
});

// 로그인 인증 예외 처리
router.all('*', function(req, res, next) {
    // 이미지 캡쳐 팬텀 예외처리
    if (req.path.indexOf('/schedule/user/phantom/') > -1) next();
    else if (req.session.user) next();
    else res.redirect('/cssys/login');
});


router.get('/logout', function(req, res, next) {
  if (req.session.user) {
    req.session.destroy(function (err) {
      if (err) {
        res.render('error');
      } else {
        res.redirect('login');
      }
    });
  } else {
    res.redirect('login');
  }
});

//========================================================================================
// 게시판 관련 ajax 라우팅 구현부
//========================================================================================
router.post('/ajax/board/list/:title', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        }
    }).then(function(board) {
        if (board !== null) {
            var postList = [];
            async.waterfall([

                function(callback) { // 1. 공지사항 가져오기
                    models.BoardPost.findAll({
                        where: {
                            BoardId: board.id,
                            notice: true
                        },
                        include: [models.User],
                        order: 'id DESC'
                    }).then(function(posts) {
                        if (posts !== null) {
                            posts.forEach(function(post) {
                                postList.push({
                                    index: "공지",
                                    id: post.id,
                                    title: post.title,
                                    text: post.text,
                                    notice: true,
                                    secret: false,
                                    views: post.views,
                                    parent: null,
                                    time: moment(post.createdAt).format("YYYY-MM-DD"),
                                    name: "관리자"
                                });
                            });
                        }
                        callback(null);
                    });
                },
                function(callback) { // 2. 게시물 가져오기
                    models.sequelize.query(
                        'select BoardPost.id,BoardPost.title,BoardPost.text,BoardPost.secret,BoardPost.views,BoardPost.time,User.name from ' +
                        'cssys_board_post as BoardPost left join ' +
                        'cssys_user as User on BoardPost.UserId=User.id ' +
                        'where BoardPost.BoardId=' + board.id + ' and BoardPost.notice=0 and BoardPost.ParentId is null ' +
                        'order by BoardPost.id desc'
                    ).then(function(data) {
                        var index = data[0].length;
                        data[0].forEach(function(post) {
                            if (post.secret) post.text = '';
                            post.index = index--;
                            post.notcie = false;
                            post.time = moment(post.time).format("YYYY-MM-DD");
                            post.parent = null;
                            postList.push(post);
                        });
                        callback(null);
                    });
                },
                function(callback) { // 2. 댓글 게시물 가져오기
                    models.sequelize.query(
                        'select BoardPost.ParentId,BoardPost.id,BoardPost.title,BoardPost.text,BoardPost.secret,BoardPost.views,BoardPost.time,User.name from ' +
                        'cssys_board_post as BoardPost left join ' +
                        'cssys_user as User on BoardPost.UserId=User.id ' +
                        'where BoardPost.BoardId=' + board.id + ' and BoardPost.notice=0 and BoardPost.ParentId is not null ' +
                        'order by BoardPost.id desc'
                    ).then(function(data) {
                        data[0].forEach(function(post) {
                            var index;
                            for (index in postList) {
                                if (postList[index].id == post.ParentId) break;
                            }
                            if (post.secret) post.text = '';
                            post.index = null;
                            post.notcie = false;
                            post.time = moment(post.time).format("YYYY-MM-DD");
                            post.parent = null;
                            delete post.ParentId;
                            postList.splice(parseInt(index) + 1, 0, post);
                        });
                        callback(null);
                    });
                }
            ], function(err, result) {
                res.send({
                    aaData: postList
                });
            });
        } else {
            res.send({
                aaData:[]
            });
        }
    });
});

router.post('/ajax/board/view/:title/:id', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        }
    }).then(function(board) {
        if (board !== null) {
            models.sequelize.query(
                'select BoardPost.id,BoardPost.title,BoardPost.text,BoardPost.notice,BoardPost.secret,BoardPost.views,BoardPost.time,User.name,BoardPost.UserId,BoardPost.ParentId,Parent.UserId as ParentUserId from ' +
                'cssys_board_post as BoardPost left join ' +
                'cssys_user as User on BoardPost.UserId=User.id left join ' +
                'cssys_board_post as Parent on Parent.id=BoardPost.ParentId ' +
                'where BoardPost.BoardId=:BoardId and BoardPost.id=:PostId', null, { // sql 인젝션 공격 방지
                    raw: true
                }, {
                    BoardId: board.id,
                    PostId: req.params.id
                }).then(function(data) {
                data=data[0];
                if (data[0]) { // 글이 존재할경우
                    // 비밀글일경우 본인+관리자만+원래글주인(댓글일경우)
                    if (!data[0].secret || data[0].secret && (req.session.user.type === 0 || data[0].UserId == req.session.user.id || (data[0].ParentUserId !== null && data[0].ParentUserId == req.session.user.id))) {
                        async.parallel({
                                prev: function(callback) { // 이전글 (리스트에서 위에글)
                                    if (data[0].notice) { // 공지사항 일경우
                                        models.sequelize.query('select id,title from cssys_board_post where BoardId=' + board.id + ' and id>' + data[0].id + ' and notice order by id limit 0,1').then(function(data) {
                                            if (data[0][0]) callback(null, data[0][0]);
                                            else callback(null, null);
                                        });
                                    } else {
                                        if (data[0].ParentId) { // 답변글일경우
                                            // 1. 이전 답변글 (id 이전꺼 중 높은거)
                                            // 2. 현재 부모글
                                            models.sequelize.query(
                                                'select id from (' +
                                                '(select * from cssys_board_post where BoardId=' + board.id + ' and ParentId=' + data[0].ParentId + ' and id < ' + data[0].id + ' order by id desc limit 0,1) union ' +
                                                '(select * from cssys_board_post where BoardId=' + board.id + ' and id=' + data[0].ParentId + ')' +
                                                ') as post limit 0,1'
                                            ).then(function(data) {
                                                if (data[0][0]) callback(null, data[0][0]);
                                                else callback(null, null);
                                            });
                                        } else {
                                            // 1. 이전글의 최신 답변글 (맨아래)
                                            // 2. 이전글 (공지사항,답변글 아닌거)
                                            // 3. 공지사항 마지막 글
                                            models.sequelize.query(
                                                'select id from (' +
                                                '(select * from cssys_board_post where ParentId=(select id from cssys_board_post where BoardId=' + board.id + ' and Id>' + data[0].id + ' order by id limit 0,1) order by id desc limit 0,1) union ' +
                                                '(select * from cssys_board_post where BoardId=' + board.id + ' and Id>' + data[0].id + ' and !notice and ParentId is null order by id limit 0,1) union ' +
                                                '(select * from cssys_board_post where BoardId=' + board.id + ' and notice order by id limit 0,1)' +
                                                ') as post limit 0,1'
                                            ).then(function(data) {
                                                if (data[0][0]) callback(null, data[0][0]);
                                                else callback(null, null);
                                            });
                                        }
                                    }
                                },
                                next: function(callback) { // 다음글 (리스트에서 아래글)
                                    if (data[0].notice) { // 공지사항 일경우
                                        models.sequelize.query('select Post.id,Post.title from ((select * from cssys_board_post where BoardId=' + board.id + ' and id<' + data[0].id + ' and notice order by id desc limit 0,1) union (select * from cssys_board_post where BoardId=' + board.id + ' and ParentId is null order by id desc limit 0,1)) as Post').then(function(data) {
                                            if (data[0][0]) callback(null, data[0][0]);
                                            else callback(null, null);
                                        });
                                    } else {
                                        if (data[0].ParentId) { // 답변글일경우
                                            // 1. 다음 답변글 ( 현재 id보다 다음 높은거 )
                                            // 2. 다음글 (공지사항,답변글 아닌거) (부모글기준)
                                            models.sequelize.query(
                                                'select id from (' +
                                                '(select * from cssys_board_post where ParentId=' + data[0].ParentId + ' and id>' + data[0].id + ' order by id limit 0,1) union ' +
                                                '(select * from cssys_board_post where BoardId=' + board.id + ' and id<' + data[0].ParentId + ' and !notice and ParentId is null order by id desc limit 0,1)' +
                                                ') as post limit 0,1'
                                            ).then(function(data) {
                                                if (data[0][0]) callback(null, data[0][0]);
                                                else callback(null, null);
                                            });
                                        } else {
                                            // 1. 현재의 처음 답변글 (맨위에)
                                            // 2. 다음글 (공지사항,답변글 아닌거)
                                            models.sequelize.query(
                                                'select id from (' +
                                                '(select * from cssys_board_post where ParentId=' + data[0].id + ' order by id limit 0,1) union ' +
                                                '(select * from cssys_board_post where BoardId=' + board.id + ' and id<' + data[0].id + ' and !notice and ParentId is null order by id desc limit 0,1)' +
                                                ') as post limit 0,1'
                                            ).then(function(data) {
                                                if (data[0][0]) callback(null, data[0][0]);
                                                else callback(null, null);
                                            });
                                        }
                                    }
                                },
                                files: function(callback) {
                                    models.sequelize.query(
                                        'select name,path,type,size,downs from cssys_board_file where BoardId=' + board.id + ' and BoardPostId=' + data[0].id + ' order by id limit 0,2'
                                    ).then(function(files) {
                                        files=files[0];
                                        if (files !== null) {
                                            files.forEach(function(file) {
                                                file.link = '/cssys/ajax/board/file/download/' + board.title + '/' + path.basename(file.path);
                                                delete file.path;
                                            });
                                            callback(null, files);
                                        } else callback(null, null);
                                    });
                                }
                            },
                            function(err, results) {
                                models.sequelize.query('update cssys_board_post set views=views+1 where BoardId=' + board.id + ' and id=' + data[0].id).then(function() {
                                    data[0].time = moment(data[0].time).format("YYYY-MM-DD HH:mm:ss");
                                    data[0].views++;
                                    data[0].files = results.files;
                                    delete data[0].ParentUserId;
                                    res.send({
                                        result: true,
                                        post: data[0],
                                        prev: results.prev,
                                        next: results.next
                                    });
                                });
                            });
                    } else {
                        res.send({
                            result: false,
                            text: '권한이 없습니다.'
                        });
                    }
                } else next();
            });
        } else next();
    });
});
router.post('/ajax/board/write/:title', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        }
    }).then(function(board) {
        if (board !== null) {
            req.body.UserId = req.session.user.id;
            delete req.body.ParentId;
            req.body.notice = ((req.session.user.type === 0) && req.body.notice ? true : false);
            req.body.secret = ((!req.body.notice) && req.body.secret ? true : false);
            board.createBoardPost(req.body).then(function(boardpost) {
                async.each([req.files.file_1, req.files.file_2], function(file, callback) {
                    if (file) {
                        if (file.isFileSizeLimit) {
                            callback("파일 사이즈가 초과하였습니다. ( 최대 20MB )");
                        } else {
                            var objectKey = storage.makeObjectKey(['board', board.title], file.originalname || file.name);
                            storage.uploadTempFile(file.path, objectKey, file.mimetype).then(function() {
                                req.body.BoardId = board.id;
                                req.body.name = file.originalname;
                                req.body.path = objectKey;
                                req.body.type = file.mimetype;
                                req.body.size = file.size;
                                boardpost.createBoardFile(req.body).then(function(boardfile) {
                                    callback();
                                });
                            }).catch(function(err) {
                                callback(err);
                            });
                        }
                    } else callback();
                }, function(err) {
                    if (!err) {
                        res.send({
                            result: true,
                            id: boardpost.id
                        });
                    } else {
                        boardpost.destroy().then(function() {
                            res.send({
                                result: false,
                                text: err
                            });
                        });
                    }
                });
            });
        } else next();
    });
});
router.post('/ajax/board/reply/:title/:id', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        },
        include: [{
            model: models.BoardPost,
            where: {
                id: req.params.id
            }
        }]
    }).then(function(board) {
        if (board !== null && board.BoardPosts[0]) {
            var boardpost = board.BoardPosts[0];
            if (boardpost.notice) {
                res.send({
                    result: false,
                    text: '공지사항에는 답변글을 달수 없습니다.'
                });
            } else if (boardpost.ParentId) { // 이 경우는 올수가 없음 (URL 강제로 들어가지 않는 이상)
                res.send({
                    result: false,
                    text: '답변글엔 답변글을 달수 없습니다.'
                });
            } else {
                // /ajax/board/write 소스 그대로 복사함 (ParentId만 수정)
                req.body.UserId = req.session.user.id;
                req.body.ParentId = boardpost.id;
                req.body.notice = ((req.session.user.type === 0) && req.body.notice ? true : false);
                req.body.secret = ((!req.body.notice) && req.body.secret ? true : false);
                board.createBoardPost(req.body).then(function(boardpost) {
                    async.each([req.files.file_1, req.files.file_2], function(file, callback) {
                        if (file) {
                            if (file.isFileSizeLimit) {
                                callback("파일 사이즈가 초과하였습니다. ( 최대 20MB )");
                            } else {
                                var objectKey = storage.makeObjectKey(['board', board.title], file.originalname || file.name);
                                storage.uploadTempFile(file.path, objectKey, file.mimetype).then(function() {
                                    req.body.BoardId = board.id;
                                    req.body.name = file.originalname;
                                    req.body.path = objectKey;
                                    req.body.type = file.mimetype;
                                    req.body.size = file.size;
                                    boardpost.createBoardFile(req.body).then(function(boardfile) {
                                        callback();
                                    });
                                }).catch(function(err) {
                                    callback(err);
                                });
                            }
                        } else callback();
                    }, function(err) {
                        if (!err) {
                            res.send({
                                result: true,
                                id: boardpost.id
                            });
                        } else {
                            boardpost.destroy().then(function() {
                                res.send({
                                    result: false,
                                    text: err
                                });
                            });
                        }
                    });
                });
            }
        } else next();
    });
});
router.post('/ajax/board/delete/:title/:id', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        },
        include: [{
            model: models.BoardPost,
            where: {
                id: req.params.id
            },
            include: [{
                model: models.BoardPost,
                as: 'Childs'
            }]
        }]
    }).then(function(board) {
        if (board !== null && board.BoardPosts[0]) {
            var boardpost = board.BoardPosts[0];
            if (boardpost.UserId != req.session.user.id && req.session.user.type !== 0) {
                res.send({
                    result: false,
                    text: '본인 또는 관리자만이 삭제할 수 있습니다.'
                });
            } else {
                if (boardpost.Childs.length > 0) {
                    res.send({
                        result: false,
                        text: '답변글이 있는 게시물은 삭제할 수 없습니다.'
                    });
                } else {
                    boardpost.destroy().then(function() {
                        res.send({
                            result: true
                        });
                    });
                }
            }
        } else next();
    });
});
router.post('/ajax/board/modify/:title/:id', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        },
        include: [{
            model: models.BoardPost,
            where: {
                id: req.params.id
            },
            include: [{
                model: models.BoardPost,
                as: 'Childs'
            }]
        }]
    }).then(function(board) {
        if (board !== null && board.BoardPosts[0]) {
            var boardpost = board.BoardPosts[0];
            if (req.body.notice && boardpost.Childs.length > 0) {
                res.send({
                    result: false,
                    text: '답변글이 있는 게시물은 공지사항으로 할 수 없습니다. (답변글을 삭제해주세요.)'
                });
            } else if (req.body.notice && boardpost.ParentId) {
                res.send({
                    result: false,
                    text: '답변글은 공지사항으로 할 수 없습니다.'
                });
            } else if (boardpost.UserId != req.session.user.id && req.session.user.type !== 0) {
                res.send({
                    result: false,
                    text: '본인 또는 관리자만이 수정할 수 있습니다.'
                });
            } else {
                // /ajax/board/write 소스 그대로 복사함 (일부 수정)
                req.body.ParentId = boardpost.ParentId;
                req.body.notice = ((req.session.user.type === 0) && req.body.notice ? true : false);
                req.body.secret = ((!req.body.notice) && req.body.secret ? true : false);
                boardpost.updateAttributes(req.body).then(function(boardpost) {
                    async.each([req.files.file_1, req.files.file_2], function(file, callback) {
                        if (file) {
                            if (file.isFileSizeLimit) {
                                callback("파일 사이즈가 초과하였습니다. ( 최대 20MB )");
                            } else {
                                var objectKey = storage.makeObjectKey(['board', board.title], file.originalname || file.name);
                                storage.uploadTempFile(file.path, objectKey, file.mimetype).then(function() {
                                    req.body.BoardId = board.id;
                                    req.body.name = file.originalname;
                                    req.body.path = objectKey;
                                    req.body.type = file.mimetype;
                                    req.body.size = file.size;
                                    boardpost.createBoardFile(req.body).then(function(boardfile) {
                                        callback();
                                    });
                                }).catch(function(err) {
                                    callback(err);
                                });
                            }
                        } else callback();
                    }, function(err) {
                        if (!err) {
                            res.send({
                                result: true,
                                id: boardpost.id
                            });
                        } else {
                            res.send({
                                result: false,
                                text: err
                            });
                        }
                    });
                });
            }
        } else next();
    });
});
router.post('/ajax/board/file/upload/:title', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        }
    }).then(function(board) {
        if (board !== null) {
            var file = req.files.upload;
            if (file.isFileSizeLimit) {
                res.send("파일 사이즈가 초과하였습니다. ( 최대 20MB )");
            } else {
                var objectKey = storage.makeObjectKey(['board', board.title], file.originalname || file.name);
                var file_name = path.basename(objectKey);
                storage.uploadTempFile(file.path, objectKey, file.mimetype).then(function() {
                    req.body.BoardId = board.id;
                    req.body.name = file.originalname;
                    req.body.path = objectKey;
                    req.body.type = file.mimetype;
                    req.body.size = file.size;
                    req.body.UserId = req.session.user.id;
                    board.createBoardFile(req.body).then(function(boardfile) {
                        res.send("<script type='text/javascript'>window.parent.CKEDITOR.tools.callFunction('" + req.query.CKEditorFuncNum + "', '/cssys/ajax/board/file/download/" + board.title + "/" + file_name + "', '업로드 완료!')</script>");
                    });
                }).catch(function(err) {
                    next(err);
                });
            }
        } else next();
    });
});
router.all('/ajax/board/file/download/:title/:file_name', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        },
        include: [{
            model: models.BoardFile,
            where: {
                path: {
                    like: '%' + req.params.file_name
                }
            }
        }]
    }).then(function(board) {
        if (board !== null && board.BoardFiles[0]) {
            var boardfile = board.BoardFiles[0];
            boardfile.last_access = new Date();
            boardfile.downs++;
            boardfile.save().then(function(boardfile) {
                storage.sendStoredFileToResponse(boardfile.path, boardfile.name, boardfile.type, res).catch(function(err) {
                    next(err);
                });
            });
        } else next();
    });
});
router.post('/ajax/board/file/delete/:title/:file_name', function(req, res, next) {
    models.Board.findOne({
        where: {
            title: req.params.title
        },
        include: [{
            model: models.BoardFile,
            where: {
                path: {
                    like: '%' + req.params.file_name
                }
            }
        }]
    }).then(function(board) {
        if (board !== null && board.BoardFiles[0]) {
            var boardfile = board.BoardFiles[0];
            if (boardfile.UserId != req.session.user.id && req.session.user.type !== 0) {
                res.send({
                    result: false,
                    text: '본인 또는 관리자만이 삭제할 수 있습니다.'
                });
            } else {
                storage.removeStoredFile(boardfile.path).then(function() {
                    return boardfile.destroy();
                }).then(function() {
                    res.send({
                        result: true
                    });
                }).catch(function(err) {
                    next(err);
                });
            }
        }
    });
});

module.exports = router;
