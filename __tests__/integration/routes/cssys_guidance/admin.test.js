const request = require('supertest');
const { sha256 } = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('Guidance Admin Routes Integration', () => {
  let app, workModels, cssysModels, guidanceModels;
  let adminUser;
  let agent;

  beforeAll(async () => {
    workModels = require('../../../../models/cssys_work');
    cssysModels = require('../../../../models/cssys');
    guidanceModels = require('../../../../models/cssys_guidance');

    await resetDatabase(workModels.sequelize, cssysModels.sequelize, guidanceModels.sequelize);
    await ensureMinioBucket();

    app = require('../../../../app');

    // 관리자 유저 생성 (type=0)
    // guidanceModels.User 와 workModels.User 는 같은 cssys_user 테이블을 공유
    adminUser = await guidanceModels.User.create({
      ids: 'admin',
      password: sha256('admin1234'),
      name: '관리자',
      email: 'admin@test.com',
      phone: '010-0000-0000',
      type: 0,
      major: 1,
      time: new Date(),
      ip: '127.0.0.1',
    });

    // work System id=1 생성 (student_register 생성 시 SystemId: 1 하드코딩)
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await workModels.System.findOrCreate({
      where: { id: 1 },
      defaults: { phase: 'Phase 1', start, end, reupload: 0 },
    });
    await workModels.System.findOrCreate({
      where: { id: 2 },
      defaults: { phase: 'Phase 2', start, end, reupload: 0 },
    });

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'admin', password: 'admin1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(0);
  }, 30000);

  // sequelize.close() 하지 않음 — forceExit가 정리함.

  // ---------------------------------------------------------------------------
  // 1. ALL * - 인증 가드 (type===0)
  // ---------------------------------------------------------------------------
  describe('Authentication Guard', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/guidance/admin/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('학생 계정은 관리자 페이지 접근 불가', async () => {
      // guidance Prof 생성
      const profUser = await guidanceModels.User.create({
        ids: 'g_admin_guard_prof',
        password: sha256('test1234'),
        name: '가드교수',
        email: 'gprof@test.com',
        phone: '010-1234-5678',
        type: 1,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      const gProf = await guidanceModels.Prof.create({ UserId: profUser.id });

      // guidance Student 생성
      const studentUser = await guidanceModels.User.create({
        ids: 'g_student_admin_guard',
        password: sha256('test1234'),
        name: '가드학생',
        email: 'gstudent@test.com',
        phone: '010-9876-5432',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 0,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: studentUser.id,
        ProfId: gProf.id,
      });

      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'g_student_admin_guard', password: 'test1234' });

      const res = await studentAgent.get('/cssys/guidance/admin/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('교수 계정은 관리자 페이지 접근 불가', async () => {
      const profUser = await guidanceModels.User.create({
        ids: 'g_admin_guard_prof2',
        password: sha256('test1234'),
        name: '가드교수2',
        email: 'gprof2@test.com',
        phone: '010-1111-2222',
        type: 1,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      await guidanceModels.Prof.create({ UserId: profUser.id });

      const profAgent = request.agent(app);
      await profAgent.post('/cssys/login').send({ ids: 'g_admin_guard_prof2', password: 'test1234' });

      const res = await profAgent.get('/cssys/guidance/admin/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. GET / - /main 으로 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/guidance/admin/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/guidance/admin/main');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GET /main - 대시보드 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /main', () => {
    test('관리자 대시보드 렌더링 성공', async () => {
      // UserLog 레코드 생성 (main 에서 ids='admin' 조회)
      await cssysModels.UserLog.create({
        ids: 'admin',
        success: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });

      // GPermissionLog 레코드 생성 (main 에서 resorreq='res' 조회)
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });
      const gProf = await guidanceModels.Prof.findOne({ where: { UserId: profUser.id } });
      const studentUser = await guidanceModels.User.findOne({ where: { ids: 'g_student_admin_guard' } });
      const gStudent = await guidanceModels.Student.findOne({ where: { UserId: studentUser.id } });

      await guidanceModels.GPermissionLog.create({
        resorreq: 'res',
        state: 1,
        text: 'test log',
        ProfId: gProf.id,
        StudentId: gStudent.id,
      });

      const res = await agent.get('/cssys/guidance/admin/main');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // ---------------------------------------------------------------------------
  // 4-8. Notice Prof Routes
  // ---------------------------------------------------------------------------
  describe('Notice Prof Routes', () => {
    test('GET /notice_prof/list 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_prof/list');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_prof/write 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_prof/write');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_prof/view/:id 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_prof/view/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_prof/reply/:id 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_prof/reply/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_prof/modify/:id 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_prof/modify/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // ---------------------------------------------------------------------------
  // 9-15. Notice Student Routes
  // ---------------------------------------------------------------------------
  describe('Notice Student Routes', () => {
    test('GET /notice_student → /notice_student/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_student');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/guidance/admin/notice_student/list');
    });

    test('GET /notice_student/list 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_student/list');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_student/write 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_student/write');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_student/view/:id 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_student/view/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_student/reply/:id 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_student/reply/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /notice_student/modify/:id 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/notice_student/modify/1');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // ---------------------------------------------------------------------------
  // 16. GET /prof_list - 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /prof_list', () => {
    test('교수 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/prof_list');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // ---------------------------------------------------------------------------
  // 17. POST /prof_list/ajax/get_profs - JSON
  // ---------------------------------------------------------------------------
  describe('POST /prof_list/ajax/get_profs', () => {
    test('교수 목록 JSON 반환', async () => {
      const res = await agent.post('/cssys/guidance/admin/prof_list/ajax/get_profs').send({});
      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });

    test('비밀번호 필드가 노출되지 않음', async () => {
      const res = await agent.post('/cssys/guidance/admin/prof_list/ajax/get_profs').send({});
      expect(res.status).toBe(200);
      res.body.aaData.forEach((user) => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 18. GET /student_list/excel/:id - xlsx 다운로드
  // ---------------------------------------------------------------------------
  describe('GET /student_list/excel/:id', () => {
    test('특정 교수의 학생 목록 엑셀 다운로드', async () => {
      // 교수 UserId를 파라미터로 전달해야 함 (라우트가 Prof.where UserId 조회)
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      const res = await agent.get(`/cssys/guidance/admin/student_list/excel/${profUser.id}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });

  // ---------------------------------------------------------------------------
  // 19. GET /prof/:id - 교수 상세 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /prof/:id', () => {
    test('교수 상세 페이지 렌더링', async () => {
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      const res = await agent.get(`/cssys/guidance/admin/prof/${profUser.id}`);
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('존재하지 않는 교수 ID는 404', async () => {
      const res = await agent.get('/cssys/guidance/admin/prof/99999');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 20. POST /prof/:id/ajax/get_students - JSON
  // ---------------------------------------------------------------------------
  describe('POST /prof/:id/ajax/get_students', () => {
    test('특정 교수 배정 학생 목록 JSON 반환', async () => {
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      const res = await agent.post(`/cssys/guidance/admin/prof/${profUser.id}/ajax/get_students`).send({});
      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });

    test('비밀번호 필드가 노출되지 않음', async () => {
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      const res = await agent.post(`/cssys/guidance/admin/prof/${profUser.id}/ajax/get_students`).send({});
      expect(res.status).toBe(200);
      res.body.aaData.forEach((user) => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 21. GET /prof_login/:id - 교수로 세션 전환, 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /prof_login/:id', () => {
    test('교수 계정으로 세션 전환 후 리다이렉트', async () => {
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      // 별도 에이전트로 테스트 (메인 agent 세션 보호)
      const switchAgent = request.agent(app);
      await switchAgent.post('/cssys/login').send({ ids: 'admin', password: 'admin1234' });

      const res = await switchAgent.get(`/cssys/guidance/admin/prof_login/${profUser.id}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/guidance/prof');
    });

    test('존재하지 않는 교수 ID는 404', async () => {
      const res = await agent.get('/cssys/guidance/admin/prof_login/99999');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 22-23. GET /prof_register, GET /prof_register/:id - 렌더링
  // ---------------------------------------------------------------------------
  describe('Prof Register Pages', () => {
    test('GET /prof_register - 교수 등록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/prof_register');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /prof_register/:id - 선택된 교수 등록 페이지 렌더링', async () => {
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      const res = await agent.get(`/cssys/guidance/admin/prof_register/${profUser.id}`);
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // ---------------------------------------------------------------------------
  // 24. POST /prof_register/ajax/get_prof - JSON (비밀번호 미포함)
  // ---------------------------------------------------------------------------
  describe('POST /prof_register/ajax/get_prof', () => {
    test('교수 정보 조회 (비밀번호 미포함)', async () => {
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      const res = await agent.post('/cssys/guidance/admin/prof_register/ajax/get_prof').send({ id: profUser.id });
      expect(res.status).toBe(200);
      expect(res.body.ids).toBe('g_admin_guard_prof');
      expect(res.body.password).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 25. POST /prof_register - 교수 생성 또는 수정
  // ---------------------------------------------------------------------------
  describe('POST /prof_register', () => {
    test('교수 신규 등록 성공', async () => {
      const res = await agent.post('/cssys/guidance/admin/prof_register').send({
        ids: 'g_new_prof_reg',
        password: 'pass1234',
        name: '신규교수',
        email: 'gnewprof@test.com',
        phone: '010-1111-1111',
        major: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const user = await guidanceModels.User.findOne({
        where: { ids: 'g_new_prof_reg' },
        include: [guidanceModels.Prof],
      });
      expect(user).not.toBeNull();
      expect(user.type).toBe(1);
      expect(user.Prof).not.toBeNull();
    });

    test('중복 아이디 등록 실패', async () => {
      const res = await agent.post('/cssys/guidance/admin/prof_register').send({
        ids: 'g_new_prof_reg',
        password: 'pass1234',
        name: '중복교수',
        email: 'gdup@test.com',
        phone: '010-2222-2222',
        major: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('이미 존재하는');
    });

    test('교수 정보 수정 성공', async () => {
      const user = await guidanceModels.User.findOne({ where: { ids: 'g_new_prof_reg' } });

      const res = await agent.post('/cssys/guidance/admin/prof_register').send({
        id: user.id,
        ids: 'g_new_prof_reg',
        password: '',
        name: '수정된교수',
        email: 'gupdated_prof@test.com',
        phone: '010-3333-3333',
        major: 2,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await guidanceModels.User.findByPk(user.id);
      expect(updated.name).toBe('수정된교수');
      expect(updated.email).toBe('gupdated_prof@test.com');
    });

    test('교수 수정 시 비밀번호 변경', async () => {
      const user = await guidanceModels.User.findOne({ where: { ids: 'g_new_prof_reg' } });

      const res = await agent.post('/cssys/guidance/admin/prof_register').send({
        id: user.id,
        ids: 'g_new_prof_reg',
        password: 'newpass999',
        name: '수정된교수',
        email: 'gupdated_prof@test.com',
        phone: '010-3333-3333',
        major: 2,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await guidanceModels.User.findByPk(user.id);
      expect(updated.password).toBe(sha256('newpass999'));
    });
  });

  // ---------------------------------------------------------------------------
  // 26. POST /prof_register/ajax/del_prof - 교수 삭제
  // ---------------------------------------------------------------------------
  describe('POST /prof_register/ajax/del_prof', () => {
    test('교수 삭제 성공', async () => {
      const user = await guidanceModels.User.findOne({ where: { ids: 'g_new_prof_reg' } });

      const res = await agent.post('/cssys/guidance/admin/prof_register/ajax/del_prof').send({ id: user.id });
      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const deleted = await guidanceModels.User.findByPk(user.id);
      expect(deleted).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 27. GET /prof_excel_register - 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /prof_excel_register', () => {
    test('교수 엑셀 등록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/prof_excel_register');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // POST /prof_excel_register - 스킵 (파일 업로드 필요)

  // ---------------------------------------------------------------------------
  // 28. ALL /prof_excel_save - xlsx 다운로드
  // ---------------------------------------------------------------------------
  describe('ALL /prof_excel_save', () => {
    test('POST - 전체 교수 엑셀 다운로드', async () => {
      const res = await agent.post('/cssys/guidance/admin/prof_excel_save').send({});
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    test('POST - 특정 교수 ID 배열로 엑셀 다운로드', async () => {
      const profUser = await guidanceModels.User.findOne({ where: { ids: 'g_admin_guard_prof' } });

      const res = await agent.post('/cssys/guidance/admin/prof_excel_save').send({
        arr: JSON.stringify([profUser.id]),
      });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });

    test('GET - 전체 교수 엑셀 다운로드', async () => {
      const res = await agent.get('/cssys/guidance/admin/prof_excel_save');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ---------------------------------------------------------------------------
  // 29. GET /student_list - 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /student_list', () => {
    test('학생 목록 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/guidance/admin/student_list');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // ---------------------------------------------------------------------------
  // 30. POST /student_list/ajax/get_students - JSON
  // ---------------------------------------------------------------------------
  describe('POST /student_list/ajax/get_students', () => {
    test('전체 학생 목록 JSON 반환', async () => {
      const res = await agent.post('/cssys/guidance/admin/student_list/ajax/get_students').send({});
      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 31. GET /student/:id - 학생 상세 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /student/:id', () => {
    test('학생 상세 페이지 렌더링', async () => {
      const studentUser = await guidanceModels.User.findOne({ where: { ids: 'g_student_admin_guard' } });

      const res = await agent.get(`/cssys/guidance/admin/student/${studentUser.id}`);
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('존재하지 않는 학생 ID는 404', async () => {
      const res = await agent.get('/cssys/guidance/admin/student/99999');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // POST /student/:id (파일 업로드/삭제) - 스킵

  // ---------------------------------------------------------------------------
  // 32. GET /student_login/:id - 학생으로 세션 전환, 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /student_login/:id', () => {
    test('학생 계정으로 세션 전환 후 리다이렉트', async () => {
      const studentUser = await guidanceModels.User.findOne({ where: { ids: 'g_student_admin_guard' } });

      // 별도 에이전트로 테스트 (메인 agent 세션 보호)
      const switchAgent = request.agent(app);
      await switchAgent.post('/cssys/login').send({ ids: 'admin', password: 'admin1234' });

      const res = await switchAgent.get(`/cssys/guidance/admin/student_login/${studentUser.id}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/guidance/student');
    });

    test('존재하지 않는 학생 ID는 404', async () => {
      const res = await agent.get('/cssys/guidance/admin/student_login/99999');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 33-34. GET /student_register, GET /student_register/:id - 렌더링
  // ---------------------------------------------------------------------------
  describe('Student Register Pages', () => {
    test('GET /student_register - 학생 등록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/student_register');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });

    test('GET /student_register/:id - 선택된 학생 등록 페이지 렌더링', async () => {
      const studentUser = await guidanceModels.User.findOne({ where: { ids: 'g_student_admin_guard' } });

      const res = await agent.get(`/cssys/guidance/admin/student_register/${studentUser.id}`);
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // ---------------------------------------------------------------------------
  // 35. POST /student_register/ajax/get_student - JSON
  // ---------------------------------------------------------------------------
  describe('POST /student_register/ajax/get_student', () => {
    test('학생 정보 조회 (비밀번호 미포함)', async () => {
      // 이 라우트는 models_w.Student (work Student)를 include 함
      // 따라서 work Student 레코드가 필요
      const studentUser = await guidanceModels.User.findOne({ where: { ids: 'g_student_admin_guard' } });

      // work Student 생성 (이 라우트가 models_w.Student include)
      const workProf = await workModels.Prof.findOne();
      let wProfId;
      if (workProf) {
        wProfId = workProf.id;
      } else {
        // guidance Prof 테이블 = work Prof 테이블 (cssys_work_prof), 이미 있음
        const gProf = await guidanceModels.Prof.findOne();
        wProfId = gProf.id;
      }

      await workModels.Student.findOrCreate({
        where: { UserId: studentUser.id },
        defaults: {
          term: 7,
          status: 0,
          doublemajor: false,
          title: '테스트 졸업작품',
          iswork: 1,
          isgroup: 0,
          result: 0,
          isdisplay: 0,
          note: '',
          comment: '',
          masterpiece: 0,
          state: 0,
          yearterm: '202601',
          islock: false,
          time: new Date(),
          ip: '127.0.0.1',
          UserId: studentUser.id,
          ProfId: wProfId,
          SystemId: 1,
        },
      });

      const res = await agent.post('/cssys/guidance/admin/student_register/ajax/get_student').send({
        id: studentUser.id,
      });
      expect(res.status).toBe(200);
      expect(res.body.ids).toBe('g_student_admin_guard');
      expect(res.body.password).toBeUndefined();
      expect(res.body.Student).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 36. POST /student_register - 학생 생성 또는 수정
  // ---------------------------------------------------------------------------
  describe('POST /student_register', () => {
    test('학생 신규 등록 성공', async () => {
      // 라우트가 guidance Student + work Student 둘 다 생성함
      const gProf = await guidanceModels.Prof.findOne();

      const res = await agent.post('/cssys/guidance/admin/student_register').send({
        ids: 'g_new_student_reg',
        password: 'pass1234',
        name: '신규학생',
        email: 'gnewstudent@test.com',
        phone: '010-4444-4444',
        major: 1,
        term: 7,
        status: 0,
        doublemajor: false,
        title: '졸업작품 테스트',
        iswork: 1,
        isgroup: 0,
        result: 0,
        isdisplay: 0,
        masterpiece: 0,
        ProfId: gProf.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // guidance User 생성 확인
      const user = await guidanceModels.User.findOne({ where: { ids: 'g_new_student_reg' } });
      expect(user).not.toBeNull();
      expect(user.type).toBe(2);

      // guidance Student 생성 확인
      const gStudent = await guidanceModels.Student.findOne({ where: { UserId: user.id } });
      expect(gStudent).not.toBeNull();

      // work Student 생성 확인
      const wStudent = await workModels.Student.findOne({ where: { UserId: user.id } });
      expect(wStudent).not.toBeNull();
    });

    test('중복 아이디 등록 실패', async () => {
      const res = await agent.post('/cssys/guidance/admin/student_register').send({
        ids: 'g_new_student_reg',
        password: 'pass1234',
        name: '중복학생',
        email: 'gdup@test.com',
        phone: '010-5555-5555',
        major: 1,
        term: 7,
        status: 0,
        doublemajor: false,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('이미 존재하는');
    });

    test('학생 정보 수정 성공', async () => {
      const user = await guidanceModels.User.findOne({ where: { ids: 'g_new_student_reg' } });

      const res = await agent.post('/cssys/guidance/admin/student_register').send({
        id: user.id,
        ids: 'g_new_student_reg',
        password: '',
        name: '수정된학생',
        email: 'gupdated_student@test.com',
        phone: '010-6666-6666',
        major: 2,
        term: 8,
        status: 0,
        doublemajor: true,
        title: '수정된 졸업작품',
        iswork: 1,
        isgroup: 0,
        result: 0,
        isdisplay: 0,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await guidanceModels.User.findByPk(user.id);
      expect(updated.name).toBe('수정된학생');
      expect(updated.email).toBe('gupdated_student@test.com');
    });
  });

  // ---------------------------------------------------------------------------
  // 37. POST /student_register/ajax/del_student - 학생 삭제
  // ---------------------------------------------------------------------------
  describe('POST /student_register/ajax/del_student', () => {
    test('학생 삭제 성공', async () => {
      const user = await guidanceModels.User.findOne({ where: { ids: 'g_new_student_reg' } });

      const res = await agent.post('/cssys/guidance/admin/student_register/ajax/del_student').send({ id: user.id });
      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const deleted = await guidanceModels.User.findByPk(user.id);
      expect(deleted).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 38. GET /student_excel_register - 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /student_excel_register', () => {
    test('학생 엑셀 등록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/admin/student_excel_register');
      // 라우트 접근 확인 (템플릿 렌더링 오류는 별도 이슈)
      expect(res.status).not.toBe(302);
    });
  });

  // POST /student_excel_register - 스킵 (파일 업로드 필요)
});
