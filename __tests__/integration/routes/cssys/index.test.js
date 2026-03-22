const request = require('supertest');
const { sha256 } = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('CSSYS Index Routes Integration', () => {
  let app, cssysModels, workModels, scheduleModels, guidanceModels;
  let adminUser, normalUser;
  let agent;

  beforeAll(async () => {
    cssysModels = require('../../../../models/cssys');
    workModels = require('../../../../models/cssys_work');
    scheduleModels = require('../../../../models/cssys_schedule');
    guidanceModels = require('../../../../models/cssys_guidance');

    await resetDatabase(
      cssysModels.sequelize,
      workModels.sequelize,
      scheduleModels.sequelize,
      guidanceModels.sequelize,
    );
    await ensureMinioBucket();

    app = require('../../../../app');

    // 관리자 유저 생성 (type=0)
    adminUser = await cssysModels.User.create({
      ids: 'cssys_admin',
      password: sha256('admin1234'),
      name: '관리자',
      email: 'admin@test.com',
      phone: '010-0000-0000',
      type: 0,
      major: 1,
      time: new Date(),
      ip: '127.0.0.1',
    });

    // 일반 유저 생성 (type=2, 학생)
    normalUser = await cssysModels.User.create({
      ids: 'cssys_student',
      password: sha256('test1234'),
      name: '테스트학생',
      email: 'student@test.com',
      phone: '010-1111-1111',
      type: 2,
      major: 1,
      time: new Date(),
      ip: '127.0.0.1',
    });

    // 로그인 (관리자)
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'cssys_admin', password: 'admin1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(0);
  }, 30000);

  // -------------------------------------------------------------------------
  // 1. GET / - /cssys/login 으로 리다이렉트
  // -------------------------------------------------------------------------
  describe('GET /', () => {
    test('/cssys/login 으로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET /login - 로그인 페이지 렌더링 (비인증 시)
  // -------------------------------------------------------------------------
  describe('GET /login', () => {
    test('비인증 유저는 로그인 페이지 렌더링', async () => {
      const res = await request(app).get('/cssys/login');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('이미 로그인한 유저는 리다이렉트', async () => {
      const res = await agent.get('/cssys/login');
      expect(res.status).toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 3. POST /login - 인증 처리
  // -------------------------------------------------------------------------
  describe('POST /login', () => {
    test('올바른 자격 증명으로 로그인 성공', async () => {
      const tempAgent = request.agent(app);
      const res = await tempAgent.post('/cssys/login').send({ ids: 'cssys_student', password: 'test1234' });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
      expect(res.body.type).toBe(2);
    });

    test('잘못된 자격 증명으로 로그인 실패', async () => {
      const res = await request(app).post('/cssys/login').send({ ids: 'cssys_admin', password: 'wrong_password' });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
    });

    test('존재하지 않는 유저로 로그인 실패', async () => {
      const res = await request(app).post('/cssys/login').send({ ids: 'nonexistent_user', password: 'test1234' });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. ALL * (auth guard) - 비인증 요청은 /login 으로 리다이렉트
  // -------------------------------------------------------------------------
  describe('Auth Guard', () => {
    test('비인증 요청은 /cssys/login 으로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('비인증 POST 요청도 /cssys/login 으로 리다이렉트', async () => {
      const res = await request(app).post('/cssys/ajax/board/list/test_board').send({});
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // -------------------------------------------------------------------------
  // 5. GET /logout - 세션 파기 후 리다이렉트
  // -------------------------------------------------------------------------
  describe('GET /logout', () => {
    test('로그인된 유저가 로그아웃하면 login 으로 리다이렉트', async () => {
      // 별도 에이전트로 로그인 후 로그아웃 테스트
      const logoutAgent = request.agent(app);
      await logoutAgent.post('/cssys/login').send({ ids: 'cssys_student', password: 'test1234' });

      const res = await logoutAgent.get('/cssys/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('login');
    });

    test('로그아웃 후 인증이 필요한 페이지 접근 불가', async () => {
      const logoutAgent = request.agent(app);
      await logoutAgent.post('/cssys/login').send({ ids: 'cssys_student', password: 'test1234' });

      await logoutAgent.get('/cssys/logout');

      const res = await logoutAgent.post('/cssys/ajax/board/list/test_board').send({});
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // -------------------------------------------------------------------------
  // 6. POST /ajax/board/list/:title - 게시판 글 목록 JSON
  // -------------------------------------------------------------------------
  describe('POST /ajax/board/list/:title', () => {
    let board;

    beforeAll(async () => {
      board = await cssysModels.Board.create({ title: 'test_board' });
    });

    test('게시판이 존재하면 글 목록 반환', async () => {
      const res = await agent.post('/cssys/ajax/board/list/test_board').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });

    test('게시물이 있으면 목록에 포함', async () => {
      await board.createBoardPost({
        title: '목록 테스트 글',
        text: '목록 테스트 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const res = await agent.post('/cssys/ajax/board/list/test_board').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData.length).toBeGreaterThanOrEqual(1);
    });

    test('공지사항 게시물은 index가 "공지"', async () => {
      await board.createBoardPost({
        title: '공지 테스트',
        text: '공지 내용',
        notice: true,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const res = await agent.post('/cssys/ajax/board/list/test_board').send({});

      expect(res.status).toBe(200);
      const notices = res.body.aaData.filter((p) => p.index === '공지');
      expect(notices.length).toBeGreaterThanOrEqual(1);
    });

    test('존재하지 않는 게시판은 빈 배열 반환', async () => {
      const res = await agent.post('/cssys/ajax/board/list/nonexistent_board').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 7. POST /ajax/board/view/:title/:id - 게시물 상세 조회
  // -------------------------------------------------------------------------
  describe('POST /ajax/board/view/:title/:id', () => {
    let board, post;

    beforeAll(async () => {
      board = await cssysModels.Board.create({ title: 'view_board' });
      post = await board.createBoardPost({
        title: '상세조회 테스트',
        text: '상세조회 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });
    });

    test('게시물 상세 조회 성공', async () => {
      const res = await agent.post(`/cssys/ajax/board/view/view_board/${post.id}`).send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
      expect(res.body.post).toBeDefined();
      expect(res.body.post.title).toBe('상세조회 테스트');
    });

    test('조회수가 증가함', async () => {
      const res1 = await agent.post(`/cssys/ajax/board/view/view_board/${post.id}`).send({});

      const views1 = res1.body.post.views;

      const res2 = await agent.post(`/cssys/ajax/board/view/view_board/${post.id}`).send({});

      expect(res2.body.post.views).toBe(views1 + 1);
    });

    test('비밀글은 작성자 또는 관리자만 조회 가능', async () => {
      const secretPost = await board.createBoardPost({
        title: '비밀글 테스트',
        text: '비밀 내용',
        notice: false,
        secret: true,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: normalUser.id,
      });

      // 관리자는 비밀글 조회 가능
      const res = await agent.post(`/cssys/ajax/board/view/view_board/${secretPost.id}`).send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });

    test('비밀글에 대해 권한 없는 유저는 접근 불가', async () => {
      // 관리자가 작성한 비밀글을 학생이 조회 시도
      const secretPost = await board.createBoardPost({
        title: '관리자 비밀글',
        text: '비밀 내용',
        notice: false,
        secret: true,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'cssys_student', password: 'test1234' });

      const res = await studentAgent.post(`/cssys/ajax/board/view/view_board/${secretPost.id}`).send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('권한');
    });
  });

  // -------------------------------------------------------------------------
  // 8. POST /ajax/board/write/:title - 게시물 작성
  // -------------------------------------------------------------------------
  describe('POST /ajax/board/write/:title', () => {
    let board;

    beforeAll(async () => {
      board = await cssysModels.Board.create({ title: 'write_board' });
    });

    test('게시물 작성 성공', async () => {
      const res = await agent
        .post('/cssys/ajax/board/write/write_board')
        .field('title', '테스트 글')
        .field('text', '테스트 내용')
        .field('notice', '0')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
      expect(res.body.id).toBeDefined();
    });

    test('관리자가 공지사항으로 작성', async () => {
      const res = await agent
        .post('/cssys/ajax/board/write/write_board')
        .field('title', '공지사항 작성')
        .field('text', '공지 내용')
        .field('notice', '1')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // 작성된 글 확인
      const createdPost = await cssysModels.BoardPost.findByPk(res.body.id);
      expect(createdPost.notice).toBe(true);
    });

    test('비관리자는 공지사항 작성 불가 (notice가 false로 설정됨)', async () => {
      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'cssys_student', password: 'test1234' });

      const res = await studentAgent
        .post('/cssys/ajax/board/write/write_board')
        .field('title', '학생 공지 시도')
        .field('text', '내용')
        .field('notice', '1')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const createdPost = await cssysModels.BoardPost.findByPk(res.body.id);
      expect(createdPost.notice).toBe(false);
    });

    test('존재하지 않는 게시판에 글 작성 시 404', async () => {
      const res = await agent
        .post('/cssys/ajax/board/write/nonexistent_board')
        .field('title', '테스트')
        .field('text', '내용')
        .field('notice', '0')
        .field('secret', '0');

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 9. POST /ajax/board/reply/:title/:id - 답변글 작성
  // -------------------------------------------------------------------------
  describe('POST /ajax/board/reply/:title/:id', () => {
    let board, parentPost;

    beforeAll(async () => {
      board = await cssysModels.Board.create({ title: 'reply_board' });
      parentPost = await board.createBoardPost({
        title: '원글',
        text: '원글 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });
    });

    test('답변글 작성 성공', async () => {
      const res = await agent
        .post(`/cssys/ajax/board/reply/reply_board/${parentPost.id}`)
        .field('title', '답변글')
        .field('text', '답변 내용')
        .field('notice', '0')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
      expect(res.body.id).toBeDefined();
    });

    test('공지사항에는 답변글 불가', async () => {
      const noticePost = await board.createBoardPost({
        title: '공지',
        text: '공지 내용',
        notice: true,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const res = await agent
        .post(`/cssys/ajax/board/reply/reply_board/${noticePost.id}`)
        .field('title', '답변 시도')
        .field('text', '내용')
        .field('notice', '0')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('공지사항');
    });

    test('답변글에는 답변글 불가', async () => {
      // 먼저 답변글 생성
      const replyRes = await agent
        .post(`/cssys/ajax/board/reply/reply_board/${parentPost.id}`)
        .field('title', '답변글2')
        .field('text', '답변 내용2')
        .field('notice', '0')
        .field('secret', '0');

      const replyId = replyRes.body.id;

      const res = await agent
        .post(`/cssys/ajax/board/reply/reply_board/${replyId}`)
        .field('title', '중첩 답변 시도')
        .field('text', '내용')
        .field('notice', '0')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('답변글');
    });
  });

  // -------------------------------------------------------------------------
  // 10. POST /ajax/board/delete/:title/:id - 게시물 삭제
  // -------------------------------------------------------------------------
  describe('POST /ajax/board/delete/:title/:id', () => {
    let board;

    beforeAll(async () => {
      board = await cssysModels.Board.create({ title: 'delete_board' });
    });

    test('본인이 작성한 글 삭제 성공', async () => {
      const post = await board.createBoardPost({
        title: '삭제할 글',
        text: '내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const res = await agent.post(`/cssys/ajax/board/delete/delete_board/${post.id}`).send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });

    test('관리자는 타인 글 삭제 가능', async () => {
      const post = await board.createBoardPost({
        title: '학생이 쓴 글',
        text: '내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: normalUser.id,
      });

      const res = await agent.post(`/cssys/ajax/board/delete/delete_board/${post.id}`).send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });

    test('비관리자는 타인 글 삭제 불가', async () => {
      const post = await board.createBoardPost({
        title: '관리자가 쓴 글',
        text: '내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'cssys_student', password: 'test1234' });

      const res = await studentAgent.post(`/cssys/ajax/board/delete/delete_board/${post.id}`).send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('관리자');
    });

    test('답변글이 있는 글은 삭제 불가', async () => {
      const parentPost = await board.createBoardPost({
        title: '답변 있는 글',
        text: '내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      await board.createBoardPost({
        title: '답변글',
        text: '답변 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
        ParentId: parentPost.id,
      });

      const res = await agent.post(`/cssys/ajax/board/delete/delete_board/${parentPost.id}`).send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('답변글');
    });
  });

  // -------------------------------------------------------------------------
  // 11. POST /ajax/board/modify/:title/:id - 게시물 수정
  // -------------------------------------------------------------------------
  describe('POST /ajax/board/modify/:title/:id', () => {
    let board;

    beforeAll(async () => {
      board = await cssysModels.Board.create({ title: 'modify_board' });
    });

    test('본인 글 수정 성공', async () => {
      const post = await board.createBoardPost({
        title: '수정 전 제목',
        text: '수정 전 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const res = await agent
        .post(`/cssys/ajax/board/modify/modify_board/${post.id}`)
        .field('title', '수정 후 제목')
        .field('text', '수정 후 내용')
        .field('notice', '0')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
      expect(res.body.id).toBe(post.id);
    });

    test('비관리자는 타인 글 수정 불가', async () => {
      const post = await board.createBoardPost({
        title: '관리자 글',
        text: '관리자 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'cssys_student', password: 'test1234' });

      const res = await studentAgent
        .post(`/cssys/ajax/board/modify/modify_board/${post.id}`)
        .field('title', '수정 시도')
        .field('text', '내용')
        .field('notice', '0')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('관리자');
    });

    test('답변글이 있는 글을 공지사항으로 변경 불가', async () => {
      const parentPost = await board.createBoardPost({
        title: '일반글',
        text: '내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      await board.createBoardPost({
        title: '답변글',
        text: '답변 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
        ParentId: parentPost.id,
      });

      const res = await agent
        .post(`/cssys/ajax/board/modify/modify_board/${parentPost.id}`)
        .field('title', '공지로 변경 시도')
        .field('text', '내용')
        .field('notice', '1')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('공지사항');
    });

    test('답변글은 공지사항으로 변경 불가', async () => {
      const parentPost = await board.createBoardPost({
        title: '부모글',
        text: '내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
      });

      const childPost = await board.createBoardPost({
        title: '답변글2',
        text: '답변 내용',
        notice: false,
        secret: false,
        views: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: adminUser.id,
        ParentId: parentPost.id,
      });

      const res = await agent
        .post(`/cssys/ajax/board/modify/modify_board/${childPost.id}`)
        .field('title', '답변글 공지 시도')
        .field('text', '내용')
        .field('notice', '1')
        .field('secret', '0');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('답변글');
    });
  });
});
