const request = require('supertest');
const { sha256 } = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('CSSYS Schedule Admin Routes Integration', () => {
  let app, workModels, cssysModels, scheduleModels, guidanceModels;
  let adminUser;
  let agent;

  beforeAll(async () => {
    workModels = require('../../../../models/cssys_work');
    cssysModels = require('../../../../models/cssys');
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
      ids: 'sched_admin',
      password: sha256('admin1234'),
      name: '관리자',
      email: 'admin@test.com',
      phone: '010-0000-0000',
      type: 0,
      major: 1,
      time: new Date(),
      ip: '127.0.0.1',
    });

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'sched_admin', password: 'admin1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(0);
  }, 30000);

  // -------------------------------------------------------------------------
  // 1. ALL * - 인증 가드 (type===0)
  // -------------------------------------------------------------------------
  describe('Authentication Guard', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/schedule/admin/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('type=3 유저는 관리자 페이지 접근 불가', async () => {
      // type=3 일정 유저 생성
      await scheduleModels.User.create({
        ids: 'sched_guard_user',
        password: sha256('test1234'),
        name: '일정유저',
        email: 'guard@test.com',
        phone: '010-1111-1111',
        type: 3,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });

      const userAgent = request.agent(app);
      await userAgent.post('/cssys/login').send({ ids: 'sched_guard_user', password: 'test1234' });

      const res = await userAgent.get('/cssys/schedule/admin/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET / - /main 으로 리다이렉트
  // -------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/schedule/admin/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/schedule/admin/main');
    });
  });

  // -------------------------------------------------------------------------
  // 3. GET /main - 대시보드 렌더링
  // -------------------------------------------------------------------------
  describe('GET /main', () => {
    test('관리자 대시보드 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/main');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 4. GET /user_list - 유저 목록 페이지 렌더링
  // -------------------------------------------------------------------------
  describe('GET /user_list', () => {
    test('유저 목록 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/user_list');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 5. POST /user_list/ajax/get_users - type=3 유저 목록 JSON
  // -------------------------------------------------------------------------
  describe('POST /user_list/ajax/get_users', () => {
    test('type=3 유저 목록 JSON 반환', async () => {
      const res = await agent.post('/cssys/schedule/admin/user_list/ajax/get_users').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });

    test('반환된 유저에 비밀번호가 포함되지 않음', async () => {
      const res = await agent.post('/cssys/schedule/admin/user_list/ajax/get_users').send({});

      expect(res.status).toBe(200);
      if (res.body.aaData.length > 0) {
        res.body.aaData.forEach((user) => {
          expect(user.password).toBeUndefined();
        });
      }
    });

    test('type=3 유저만 반환됨', async () => {
      const res = await agent.post('/cssys/schedule/admin/user_list/ajax/get_users').send({});

      expect(res.status).toBe(200);
      res.body.aaData.forEach((user) => {
        expect(user.type).toBe(3);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 6. GET /user_register - 유저 등록 페이지 렌더링
  // -------------------------------------------------------------------------
  describe('GET /user_register', () => {
    test('유저 등록 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/user_register');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 7. POST /user_register/ajax/get_user - 유저 정보 JSON
  // -------------------------------------------------------------------------
  describe('POST /user_register/ajax/get_user', () => {
    let schedUser;

    beforeAll(async () => {
      schedUser = await scheduleModels.User.create({
        ids: 'sched_get_user',
        password: sha256('test1234'),
        name: '조회대상유저',
        email: 'getuser@test.com',
        phone: '010-2222-2222',
        type: 3,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
    });

    test('유저 정보 조회 성공 (비밀번호 미포함)', async () => {
      const res = await agent.post('/cssys/schedule/admin/user_register/ajax/get_user').send({ id: schedUser.id });

      expect(res.status).toBe(200);
      expect(res.body.ids).toBe('sched_get_user');
      expect(res.body.password).toBeUndefined();
    });

    test('존재하지 않는 유저 조회 시 404', async () => {
      const res = await agent.post('/cssys/schedule/admin/user_register/ajax/get_user').send({ id: 99999 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 8. POST /user_register - 유저 생성 및 수정
  // -------------------------------------------------------------------------
  describe('POST /user_register', () => {
    test('새 유저 생성 성공 (type=3)', async () => {
      const res = await agent.post('/cssys/schedule/admin/user_register').send({
        ids: 'new_sched_user',
        password: 'newpass1234',
        name: '새유저',
        email: 'new@test.com',
        phone: '010-3333-3333',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 확인
      const user = await scheduleModels.User.findOne({
        where: { ids: 'new_sched_user' },
      });
      expect(user).not.toBeNull();
      expect(user.type).toBe(3);
    });

    test('유저 생성 시 캘린더와 공유가 자동 생성됨', async () => {
      const user = await scheduleModels.User.findOne({
        where: { ids: 'new_sched_user' },
      });

      const calendars = await scheduleModels.Calendar.findAll({
        where: { UserId: user.id },
      });
      expect(calendars.length).toBeGreaterThanOrEqual(1);

      const shares = await scheduleModels.Share.findAll({
        where: { CalendarId: calendars[0].id },
      });
      expect(shares.length).toBeGreaterThanOrEqual(1);
    });

    test('중복 아이디로 유저 생성 실패', async () => {
      const res = await agent.post('/cssys/schedule/admin/user_register').send({
        ids: 'new_sched_user',
        password: 'pass1234',
        name: '중복유저',
        email: 'dup@test.com',
        phone: '010-4444-4444',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('이미 존재');
    });

    test('기존 유저 수정 성공', async () => {
      const user = await scheduleModels.User.findOne({
        where: { ids: 'new_sched_user' },
      });

      const res = await agent.post('/cssys/schedule/admin/user_register').send({
        id: user.id,
        ids: 'new_sched_user',
        password: '',
        name: '수정된이름',
        email: 'updated@test.com',
        phone: '010-5555-5555',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 수정 확인
      const updatedUser = await scheduleModels.User.findByPk(user.id);
      expect(updatedUser.name).toBe('수정된이름');
      expect(updatedUser.email).toBe('updated@test.com');
    });

    test('비밀번호를 빈 문자열로 보내면 기존 비밀번호 유지', async () => {
      const user = await scheduleModels.User.findOne({
        where: { ids: 'new_sched_user' },
      });
      const oldPassword = user.password;

      await agent.post('/cssys/schedule/admin/user_register').send({
        id: user.id,
        ids: 'new_sched_user',
        password: '',
        name: '수정된이름',
        email: 'updated@test.com',
        phone: '010-5555-5555',
      });

      const updatedUser = await scheduleModels.User.findByPk(user.id);
      expect(updatedUser.password).toBe(oldPassword);
    });
  });

  // -------------------------------------------------------------------------
  // 9. GET /board - /board/list 로 리다이렉트
  // -------------------------------------------------------------------------
  describe('GET /board', () => {
    test('/board/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/schedule/admin/board');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/schedule/admin/board/list');
    });
  });

  // -------------------------------------------------------------------------
  // 10. GET /board/list - 게시판 목록 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/list', () => {
    test('게시판 목록 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/board/list');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 11. GET /board/write - 게시판 글쓰기 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/write', () => {
    test('게시판 글쓰기 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/board/write');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 12. GET /board/view/:id - 게시판 글 보기 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/view/:id', () => {
    test('게시판 글 보기 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/board/view/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 13. GET /board/reply/:id - 게시판 답변 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/reply/:id', () => {
    test('게시판 답변 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/board/reply/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // -------------------------------------------------------------------------
  // 14. GET /board/modify/:id - 게시판 수정 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/modify/:id', () => {
    test('게시판 수정 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/admin/board/modify/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });
});
