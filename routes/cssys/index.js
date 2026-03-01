var models = require('../../models/cssys');
var express = require('express');
var router = express.Router();
var path = require('path');
var crypto = require('crypto');
var { Op } = require('sequelize');
var moment = require('moment');
var storage = require('../../lib/minio_storage');
var multer = require('multer');

var upload = multer({
  dest: './webdata_tmp/',
  limits: { fileSize: 1024 * 1024 * 100 },
});

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

router.all('*', function (req, res, next) {
  // https 리다이렉션 처리 및 세션에 ip 등록 (apache proxypass & x-forwarded-for 보안 문제로 req.ip 사용할수 없으므로)
  // if (!req.session.ip) req.session.ip = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',').slice(-1)[0].trim() : req.ip);
  if (!req.session.ip)
    req.session.ip = (
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      req.socket.remoteAddress ||
      (req.socket ? req.socket.remoteAddress : null)
    ).split(',')[0];
  req.body.time = new Date();
  req.body.ip = req.session.ip;
  // if (process.env.NODE_ENV === 'production' && !req.secure) {
  //     res.redirect('https://' + req.hostname + req.originalUrl);
  // } else next();
  next();
});

// 페이지 리다이렉션 예외 처리
router.get('/', function (req, res, next) {
  res.redirect('/cssys/login');
});

// 로그인 페이지 라우팅
router.get('/login', function (req, res, next) {
  if (!!req.session.user) {
    if (req.session.system) {
      res.redirect(`/cssys/${req.session.system}/${['admin', 'prof', 'student'][req.session.user.type]}/main`);
    } else {
      res.redirect('/cssys/logout');
    }
  } else {
    res.render('cssys/login', {
      ip: req.session.ip,
      time: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
  }
});

router.post('/login', async function (req, res, next) {
  try {
    var user = await models.User.findOne({
      // 유저 검색
      where: {
        ids: req.body.ids,
        password: sha256(req.body.password),
      },
    });
    if (user !== null) {
      req.session.user = user;
      user.time = new Date();
      user.ip = req.session.ip;
      user = await user.save();
      req.session.user.time = user.time; // 세션 추가 등록
      req.session.user.ip = user.ip;
      delete req.body.password;
      req.body.success = true;
      await user.createUserLog(req.body);
      res.send({
        // 로그인 결과 response
        result: true,
        type: user.type,
      });
    } else {
      req.body.success = false;
      await models.UserLog.create(req.body);
      res.send({
        result: false,
      });
    }
  } catch (err) {
    next(err);
  }
});

// 로그인 인증 예외 처리
router.all('*', function (req, res, next) {
  // 이미지 캡쳐 팬텀 예외처리
  if (req.path.indexOf('/schedule/user/phantom/') > -1) next();
  else if (req.session.user) next();
  else res.redirect('/cssys/login');
});

router.get('/logout', function (req, res, next) {
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
router.post('/ajax/board/list/:title', async function (req, res, next) {
  try {
    var board = await models.Board.findOne({
      where: {
        title: req.params.title,
      },
    });
    if (board !== null) {
      var postList = [];

      // 1. 공지사항 가져오기
      var posts = await models.BoardPost.findAll({
        where: {
          BoardId: board.id,
          notice: true,
        },
        include: [models.User],
        order: [['id', 'DESC']],
      });
      if (posts !== null) {
        posts.forEach(function (post) {
          postList.push({
            index: '공지',
            id: post.id,
            title: post.title,
            text: post.text,
            notice: true,
            secret: false,
            views: post.views,
            parent: null,
            time: moment(post.createdAt).format('YYYY-MM-DD'),
            name: '관리자',
          });
        });
      }

      // 2. 게시물 가져오기
      var data = await models.sequelize.query(
        'select BoardPost.id,BoardPost.title,BoardPost.text,BoardPost.secret,BoardPost.views,BoardPost.time,User.name from ' +
          'cssys_board_post as BoardPost left join ' +
          'cssys_user as User on BoardPost.UserId=User.id ' +
          'where BoardPost.BoardId=:BoardId ' +
          ' and BoardPost.notice=0 and BoardPost.ParentId is null ' +
          'order by BoardPost.id desc',
        {
          replacements: {
            BoardId: board.id,
          },
        },
      );
      var index = data[0].length;
      data[0].forEach(function (post) {
        if (post.secret) post.text = '';
        post.index = index--;
        post.notcie = false;
        post.time = moment(post.time).format('YYYY-MM-DD');
        post.parent = null;
        postList.push(post);
      });

      // 3. 댓글 게시물 가져오기
      var data2 = await models.sequelize.query(
        'select BoardPost.ParentId,BoardPost.id,BoardPost.title,BoardPost.text,BoardPost.secret,BoardPost.views,BoardPost.time,User.name from ' +
          'cssys_board_post as BoardPost left join ' +
          'cssys_user as User on BoardPost.UserId=User.id ' +
          'where BoardPost.BoardId=:BoardId ' +
          ' and BoardPost.notice=0 and BoardPost.ParentId is not null ' +
          'order by BoardPost.id desc',
        {
          replacements: {
            BoardId: board.id,
          },
        },
      );
      data2[0].forEach(function (post) {
        var idx;
        for (idx in postList) {
          if (postList[idx].id == post.ParentId) break;
        }
        if (post.secret) post.text = '';
        post.index = null;
        post.notcie = false;
        post.time = moment(post.time).format('YYYY-MM-DD');
        post.parent = null;
        delete post.ParentId;
        postList.splice(parseInt(idx) + 1, 0, post);
      });

      res.send({
        aaData: postList,
      });
    } else {
      res.send({
        aaData: [],
      });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/ajax/board/view/:title/:id', async function (req, res, next) {
  try {
    var board = await models.Board.findOne({
      where: {
        title: req.params.title,
      },
    });
    if (board !== null) {
      var data = await models.sequelize.query(
        'select BoardPost.id,BoardPost.title,BoardPost.text,BoardPost.notice,BoardPost.secret,BoardPost.views,BoardPost.time,User.name,BoardPost.UserId,BoardPost.ParentId,Parent.UserId as ParentUserId from ' +
          'cssys_board_post as BoardPost left join ' +
          'cssys_user as User on BoardPost.UserId=User.id left join ' +
          'cssys_board_post as Parent on Parent.id=BoardPost.ParentId ' +
          'where BoardPost.BoardId=:BoardId and BoardPost.id=:PostId',
        {
          // sql 인젝션 공격 방지
          raw: true,
          replacements: {
            BoardId: board.id,
            PostId: req.params.id,
          },
          type: models.Sequelize.QueryTypes.SELECT,
        },
      );
      if (data[0]) {
        // 글이 존재할경우
        // 비밀글일경우 본인+관리자만+원래글주인(댓글일경우)
        if (
          !data[0].secret ||
          (data[0].secret &&
            (req.session.user.type === 0 ||
              data[0].UserId == req.session.user.id ||
              (data[0].ParentUserId !== null && data[0].ParentUserId == req.session.user.id)))
        ) {
          // prev: 이전글 (리스트에서 위에글)
          var prev;
          if (data[0].notice) {
            // 공지사항 일경우
            var prevData = await models.sequelize.query(
              'select id,title from cssys_board_post where BoardId=:BoardId and id>:PostId and notice order by id limit 0,1',
              {
                replacements: {
                  BoardId: board.id,
                  PostId: data[0].id,
                },
              },
            );
            prev = prevData[0][0] ? prevData[0][0] : null;
          } else {
            if (data[0].ParentId) {
              // 답변글일경우
              // 1. 이전 답변글 (id 이전꺼 중 높은거)
              // 2. 현재 부모글
              var prevData = await models.sequelize.query(
                'select id from (' +
                  '(select * from cssys_board_post where BoardId=:BoardId and ParentId=:ParentId and id < :PostId ' +
                  ' order by id desc limit 0,1) union ' +
                  '(select * from cssys_board_post where BoardId=:BoardId and id=:ParentId ' +
                  ')' +
                  ') as post limit 0,1',
                {
                  replacements: {
                    BoardId: board.id,
                    ParentId: data[0].ParentId,
                    PostId: data[0].id,
                  },
                },
              );
              prev = prevData[0][0] ? prevData[0][0] : null;
            } else {
              // 1. 이전글의 최신 답변글 (맨아래)
              // 2. 이전글 (공지사항,답변글 아닌거)
              // 3. 공지사항 마지막 글
              var prevData = await models.sequelize.query(
                'select id from (' +
                  '(select * from cssys_board_post where ParentId=(select id from cssys_board_post where BoardId=:BoardId and Id>:PostId ' +
                  ' order by id limit 0,1) order by id desc limit 0,1) union ' +
                  '(select * from cssys_board_post where BoardId=:BoardId and Id>:PostId ' +
                  ' and !notice and ParentId is null order by id limit 0,1) union ' +
                  '(select * from cssys_board_post where BoardId=:BoardId and notice order by id limit 0,1)' +
                  ') as post limit 0,1',
                {
                  replacements: {
                    BoardId: board.id,
                    PostId: data[0].id,
                  },
                },
              );
              prev = prevData[0][0] ? prevData[0][0] : null;
            }
          }

          // next: 다음글 (리스트에서 아래글)
          var nextPost;
          if (data[0].notice) {
            // 공지사항 일경우
            var nextData = await models.sequelize.query(
              'select Post.id,Post.title from ((select * from cssys_board_post where BoardId=:BoardId and id < :PostId and notice order by id desc limit 0,1) union (select * from cssys_board_post where BoardId=:BoardId and ParentId is null order by id desc limit 0,1)) as Post',
              {
                replacements: {
                  BoardId: board.id,
                  PostId: data[0].id,
                },
              },
            );
            nextPost = nextData[0][0] ? nextData[0][0] : null;
          } else {
            if (data[0].ParentId) {
              // 답변글일경우
              // 1. 다음 답변글 ( 현재 id보다 다음 높은거 )
              // 2. 다음글 (공지사항,답변글 아닌거) (부모글기준)
              var nextData = await models.sequelize.query(
                'select id from (' +
                  '(select * from cssys_board_post where ParentId=:ParentId and id>:PostId ' +
                  ' order by id limit 0,1) union ' +
                  '(select * from cssys_board_post where BoardId=:BoardId and id < :ParentId ' +
                  ' and !notice and ParentId is null order by id desc limit 0,1)' +
                  ') as post limit 0,1',
                {
                  replacements: {
                    BoardId: board.id,
                    ParentId: data[0].ParentId,
                    PostId: data[0].id,
                  },
                },
              );
              nextPost = nextData[0][0] ? nextData[0][0] : null;
            } else {
              // 1. 현재의 처음 답변글 (맨위에)
              // 2. 다음글 (공지사항,답변글 아닌거)
              var nextData = await models.sequelize.query(
                'select id from (' +
                  '(select * from cssys_board_post where ParentId=:PostId ' +
                  ' order by id limit 0,1) union ' +
                  '(select * from cssys_board_post where BoardId=:BoardId and id < :PostId ' +
                  ' and !notice and ParentId is null order by id desc limit 0,1)' +
                  ') as post limit 0,1',
                {
                  replacements: {
                    BoardId: board.id,
                    PostId: data[0].id,
                  },
                },
              );
              nextPost = nextData[0][0] ? nextData[0][0] : null;
            }
          }

          // files
          var filesData = await models.sequelize.query(
            'select name,path,type,size,downs from cssys_board_file where BoardId=:BoardId and BoardPostId=:PostId order by id limit 0,2',
            {
              replacements: {
                BoardId: board.id,
                PostId: data[0].id,
              },
            },
          );
          var files = filesData[0];
          if (files !== null) {
            files.forEach(function (file) {
              file.link = '/cssys/ajax/board/file/download/' + board.title + '/' + path.basename(file.path);
              delete file.path;
            });
          }

          await models.sequelize.query(
            'update cssys_board_post set views=views+1 where BoardId=:BoardId and id=:PostId',
            {
              replacements: {
                BoardId: board.id,
                PostId: data[0].id,
              },
            },
          );
          data[0].time = moment(data[0].time).format('YYYY-MM-DD HH:mm:ss');
          data[0].views++;
          data[0].files = files;
          delete data[0].ParentUserId;
          res.send({
            result: true,
            post: data[0],
            prev: prev,
            next: nextPost,
          });
        } else {
          res.send({
            result: false,
            text: '권한이 없습니다.',
          });
        }
      } else next();
    } else next();
  } catch (err) {
    next(err);
  }
});
router.post(
  '/ajax/board/write/:title',
  upload.fields([
    { name: 'file_1', maxCount: 1 },
    { name: 'file_2', maxCount: 1 },
  ]),
  async function (req, res, next) {
    try {
      var board = await models.Board.findOne({
        where: {
          title: req.params.title,
        },
      });
      if (board !== null) {
        req.body.UserId = req.session.user.id;
        delete req.body.ParentId;
        req.body.notice = req.session.user.type === 0 && req.body.notice ? true : false;
        req.body.secret = !req.body.notice && req.body.secret ? true : false;
        req.body.time = new Date();
        req.body.ip = req.session.ip;
        var boardpost = await board.createBoardPost(req.body);
        var fileError = null;
        var file_1 = req.files && req.files['file_1'] ? req.files['file_1'][0] : null;
        var file_2 = req.files && req.files['file_2'] ? req.files['file_2'][0] : null;
        for (var file of [file_1, file_2]) {
          if (file) {
            if (file.size > 1024 * 1024 * 20) {
              fileError = '파일 사이즈가 초과하였습니다. ( 최대 20MB )';
              break;
            } else {
              var objectKey = storage.makeObjectKey([board.title], file.originalname);
              await storage.uploadTempFile(file.path, objectKey, file.mimetype);
              req.body.BoardId = board.id;
              req.body.name = file.originalname;
              req.body.path = objectKey;
              req.body.type = file.mimetype;
              req.body.size = file.size;
              await boardpost.createBoardFile(req.body);
            }
          }
        }
        if (!fileError) {
          res.send({
            result: true,
            id: boardpost.id,
          });
        } else {
          await boardpost.destroy();
          res.send({
            result: false,
            text: fileError,
          });
        }
      } else next();
    } catch (err) {
      next(err);
    }
  },
);
router.post(
  '/ajax/board/reply/:title/:id',
  upload.fields([
    { name: 'file_1', maxCount: 1 },
    { name: 'file_2', maxCount: 1 },
  ]),
  async function (req, res, next) {
    try {
      var board = await models.Board.findOne({
        where: {
          title: req.params.title,
        },
        include: [
          {
            model: models.BoardPost,
            where: {
              id: req.params.id,
            },
          },
        ],
      });
      if (board !== null && board.BoardPosts[0]) {
        var boardpost = board.BoardPosts[0];
        if (boardpost.notice) {
          res.send({
            result: false,
            text: '공지사항에는 답변글을 달수 없습니다.',
          });
        } else if (boardpost.ParentId) {
          // 이 경우는 올수가 없음 (URL 강제로 들어가지 않는 이상)
          res.send({
            result: false,
            text: '답변글엔 답변글을 달수 없습니다.',
          });
        } else {
          // /ajax/board/write 소스 그대로 복사함 (ParentId만 수정)
          req.body.UserId = req.session.user.id;
          req.body.ParentId = boardpost.id;
          req.body.notice = req.session.user.type === 0 && req.body.notice ? true : false;
          req.body.secret = !req.body.notice && req.body.secret ? true : false;
          req.body.time = new Date();
          req.body.ip = req.session.ip;
          var newpost = await board.createBoardPost(req.body);
          var fileError = null;
          var file_1 = req.files && req.files['file_1'] ? req.files['file_1'][0] : null;
          var file_2 = req.files && req.files['file_2'] ? req.files['file_2'][0] : null;
          for (var file of [file_1, file_2]) {
            if (file) {
              if (file.size > 1024 * 1024 * 20) {
                fileError = '파일 사이즈가 초과하였습니다. ( 최대 20MB )';
                break;
              } else {
                var objectKey = storage.makeObjectKey([board.title], file.originalname);
                await storage.uploadTempFile(file.path, objectKey, file.mimetype);
                req.body.BoardId = board.id;
                req.body.name = file.originalname;
                req.body.path = objectKey;
                req.body.type = file.mimetype;
                req.body.size = file.size;
                await newpost.createBoardFile(req.body);
              }
            }
          }
          if (!fileError) {
            res.send({
              result: true,
              id: newpost.id,
            });
          } else {
            await newpost.destroy();
            res.send({
              result: false,
              text: fileError,
            });
          }
        }
      } else next();
    } catch (err) {
      next(err);
    }
  },
);
router.post('/ajax/board/delete/:title/:id', async function (req, res, next) {
  try {
    var board = await models.Board.findOne({
      where: {
        title: req.params.title,
      },
      include: [
        {
          model: models.BoardPost,
          where: {
            id: req.params.id,
          },
          include: [
            {
              model: models.BoardPost,
              as: 'Childs',
            },
          ],
        },
      ],
    });
    if (board !== null && board.BoardPosts[0]) {
      var boardpost = board.BoardPosts[0];
      if (boardpost.UserId != req.session.user.id && req.session.user.type !== 0) {
        res.send({
          result: false,
          text: '본인 또는 관리자만이 삭제할 수 있습니다.',
        });
      } else {
        if (boardpost.Childs.length > 0) {
          res.send({
            result: false,
            text: '답변글이 있는 게시물은 삭제할 수 없습니다.',
          });
        } else {
          await boardpost.destroy();
          res.send({
            result: true,
          });
        }
      }
    } else next();
  } catch (err) {
    next(err);
  }
});
router.post(
  '/ajax/board/modify/:title/:id',
  upload.fields([
    { name: 'file_1', maxCount: 1 },
    { name: 'file_2', maxCount: 1 },
  ]),
  async function (req, res, next) {
    try {
      var board = await models.Board.findOne({
        where: {
          title: req.params.title,
        },
        include: [
          {
            model: models.BoardPost,
            where: {
              id: req.params.id,
            },
            include: [
              {
                model: models.BoardPost,
                as: 'Childs',
              },
            ],
          },
        ],
      });
      if (board !== null && board.BoardPosts[0]) {
        var boardpost = board.BoardPosts[0];
        if (req.body.notice && boardpost.Childs.length > 0) {
          res.send({
            result: false,
            text: '답변글이 있는 게시물은 공지사항으로 할 수 없습니다. (답변글을 삭제해주세요.)',
          });
        } else if (req.body.notice && boardpost.ParentId) {
          res.send({
            result: false,
            text: '답변글은 공지사항으로 할 수 없습니다.',
          });
        } else if (boardpost.UserId != req.session.user.id && req.session.user.type !== 0) {
          res.send({
            result: false,
            text: '본인 또는 관리자만이 수정할 수 있습니다.',
          });
        } else {
          // /ajax/board/write 소스 그대로 복사함 (일부 수정)
          req.body.ParentId = boardpost.ParentId;
          req.body.notice = req.session.user.type === 0 && req.body.notice ? true : false;
          req.body.secret = !req.body.notice && req.body.secret ? true : false;
          boardpost = await boardpost.update(req.body);
          var fileError = null;
          var file_1 = req.files && req.files['file_1'] ? req.files['file_1'][0] : null;
          var file_2 = req.files && req.files['file_2'] ? req.files['file_2'][0] : null;
          for (var file of [file_1, file_2]) {
            if (file) {
              if (file.size > 1024 * 1024 * 20) {
                fileError = '파일 사이즈가 초과하였습니다. ( 최대 20MB )';
                break;
              } else {
                var objectKey = storage.makeObjectKey([board.title], file.originalname);
                await storage.uploadTempFile(file.path, objectKey, file.mimetype);
                req.body.BoardId = board.id;
                req.body.name = file.originalname;
                req.body.path = objectKey;
                req.body.type = file.mimetype;
                req.body.size = file.size;
                await boardpost.createBoardFile(req.body);
              }
            }
          }
          if (!fileError) {
            res.send({
              result: true,
              id: boardpost.id,
            });
          } else {
            res.send({
              result: false,
              text: fileError,
            });
          }
        }
      } else next();
    } catch (err) {
      next(err);
    }
  },
);
router.post('/ajax/board/file/upload/:title', upload.single('upload'), async function (req, res, next) {
  try {
    var board = await models.Board.findOne({
      where: {
        title: req.params.title,
      },
    });
    if (board !== null) {
      var file = req.file;
      if (!file) {
        res.send('파일이 업로드되지 않았습니다.');
      } else if (file.size > 1024 * 1024 * 20) {
        res.send('파일 사이즈가 초과하였습니다. ( 최대 20MB )');
      } else {
        var objectKey = storage.makeObjectKey([board.title], file.originalname);
        var file_name = path.basename(objectKey);
        await storage.uploadTempFile(file.path, objectKey, file.mimetype);
        req.body.BoardId = board.id;
        req.body.name = file.originalname;
        req.body.path = objectKey;
        req.body.type = file.mimetype;
        req.body.size = file.size;
        req.body.UserId = req.session.user.id;
        await board.createBoardFile(req.body);
        res.send(
          "<script type='text/javascript'>window.parent.CKEDITOR.tools.callFunction('" +
            req.query.CKEditorFuncNum +
            "', '/cssys/ajax/board/file/download/" +
            board.title +
            '/' +
            file_name +
            "', '업로드 완료!')</script>",
        );
      }
    } else next();
  } catch (err) {
    next(err);
  }
});
router.all('/ajax/board/file/download/:title/:file_name', async function (req, res, next) {
  try {
    var board = await models.Board.findOne({
      where: {
        title: req.params.title,
      },
      include: [
        {
          model: models.BoardFile,
          where: {
            path: {
              [Op.like]: '%' + req.params.file_name,
            },
          },
        },
      ],
    });
    if (board !== null && board.BoardFiles[0]) {
      var boardfile = board.BoardFiles[0];
      boardfile.last_access = new Date();
      boardfile.downs++;
      boardfile = await boardfile.save();
      await storage.sendStoredFileToResponse(boardfile.path, boardfile.name, boardfile.type, res);
    } else next();
  } catch (err) {
    next(err);
  }
});
router.post('/ajax/board/file/delete/:title/:file_name', async function (req, res, next) {
  try {
    var board = await models.Board.findOne({
      where: {
        title: req.params.title,
      },
      include: [
        {
          model: models.BoardFile,
          where: {
            path: {
              [Op.like]: '%' + req.params.file_name,
            },
          },
        },
      ],
    });
    if (board !== null && board.BoardFiles[0]) {
      var boardfile = board.BoardFiles[0];
      if (boardfile.UserId != req.session.user.id && req.session.user.type !== 0) {
        res.send({
          result: false,
          text: '본인 또는 관리자만이 삭제할 수 있습니다.',
        });
      } else {
        await storage.removeStoredFile(boardfile.path);
        await boardfile.destroy();
        res.send({
          result: true,
        });
      }
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
