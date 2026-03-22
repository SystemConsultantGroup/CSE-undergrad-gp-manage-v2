const request = require('supertest');
const { sha256, createProfUser, createStudentUser, createSystem, createAllSystems } = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('Admin Routes Integration', () => {
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
    adminUser = await workModels.User.create({
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

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'admin', password: 'admin1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(0);

    // 12개 시스템 생성 (main 템플릿에 필요)
    await createAllSystems(workModels);
  }, 30000);

  // sequelize.close() 하지 않음 — forceExit가 정리함.

  // ---------------------------------------------------------------------------
  // 인증
  // ---------------------------------------------------------------------------
  describe('Authentication Guard', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/work/admin/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('학생 계정은 관리자 페이지 접근 불가', async () => {
      const system = await createSystem(workModels);
      const { prof } = await createProfUser(workModels, {
        ids: 'admin_test_prof',
      });
      await createStudentUser(workModels, prof.id, system.id, {
        ids: 'student_admin_guard',
      });

      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'student_admin_guard', password: 'test1234' });

      const res = await studentAgent.get('/cssys/work/admin/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /
  // ---------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/admin/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/admin/main');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /main
  // ---------------------------------------------------------------------------
  describe('GET /main', () => {
    test('관리자 대시보드 렌더링 성공', async () => {
      const res = await agent.get('/cssys/work/admin/main');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 교수 관리
  // ---------------------------------------------------------------------------
  describe('Prof Management', () => {
    test('POST /prof_list/ajax/get_profs - 교수 목록 JSON 반환', async () => {
      const res = await agent.post('/cssys/work/admin/prof_list/ajax/get_profs').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });

    test('POST /prof_register - 교수 등록', async () => {
      const res = await agent.post('/cssys/work/admin/prof_register').send({
        ids: 'new_prof_reg',
        password: 'pass1234',
        name: '신규교수',
        email: 'new@test.com',
        phone: '010-1111-1111',
        major: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 확인
      const user = await workModels.User.findOne({
        where: { ids: 'new_prof_reg' },
        include: [workModels.Prof],
      });
      expect(user).not.toBeNull();
      expect(user.type).toBe(1);
      expect(user.Prof).not.toBeNull();
    });

    test('POST /prof_register - 중복 아이디 등록 실패', async () => {
      const res = await agent.post('/cssys/work/admin/prof_register').send({
        ids: 'new_prof_reg',
        password: 'pass1234',
        name: '중복교수',
        email: 'dup@test.com',
        phone: '010-2222-2222',
        major: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('이미 존재하는');
    });

    test('POST /prof_register - 교수 정보 수정', async () => {
      const user = await workModels.User.findOne({
        where: { ids: 'new_prof_reg' },
      });

      const res = await agent.post('/cssys/work/admin/prof_register').send({
        id: user.id,
        ids: 'new_prof_reg',
        password: '',
        name: '수정된교수',
        email: 'updated@test.com',
        phone: '010-3333-3333',
        major: 2,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.User.findByPk(user.id);
      expect(updated.name).toBe('수정된교수');
      expect(updated.email).toBe('updated@test.com');
    });

    test('POST /prof_register/ajax/get_prof - 교수 정보 조회', async () => {
      const user = await workModels.User.findOne({
        where: { ids: 'new_prof_reg' },
      });

      const res = await agent.post('/cssys/work/admin/prof_register/ajax/get_prof').send({ id: user.id });

      expect(res.status).toBe(200);
      expect(res.body.ids).toBe('new_prof_reg');
      expect(res.body.password).toBeUndefined();
    });

    test('POST /prof_register/ajax/del_prof - 교수 삭제', async () => {
      const user = await workModels.User.findOne({
        where: { ids: 'new_prof_reg' },
      });

      const res = await agent.post('/cssys/work/admin/prof_register/ajax/del_prof').send({ id: user.id });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const deleted = await workModels.User.findByPk(user.id);
      expect(deleted).toBeNull();
    });

    test('GET /prof_list - 교수 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/prof_list');
      expect(res.status).toBe(200);
    });

    test('GET /prof_register - 교수 등록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/prof_register');
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // 학생 관리
  // ---------------------------------------------------------------------------
  describe('Student Management', () => {
    let testProf, testStudent;

    beforeAll(async () => {
      const result = await createProfUser(workModels, {
        ids: 'admin_student_prof',
      });
      testProf = result.prof;
      const system = await workModels.System.findByPk(2);
      const studentResult = await createStudentUser(workModels, testProf.id, system.id, {
        ids: 'admin_student_1',
        name: '관리학생1',
      });
      testStudent = studentResult;
    });

    test('POST /student_list/ajax/get_students - 전체 학생 목록', async () => {
      const res = await agent.post('/cssys/work/admin/student_list/ajax/get_students').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();

      // 비밀번호 미노출 확인
      res.body.aaData.forEach((user) => {
        expect(user.password).toBeUndefined();
      });
    });

    test('POST /prof/:id/ajax/get_students - 특정 교수 배정 학생 조회', async () => {
      const profUser = await workModels.User.findOne({
        where: { ids: 'admin_student_prof' },
      });

      const res = await agent.post(`/cssys/work/admin/prof/${profUser.id}/ajax/get_students`).send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();

      const ids = res.body.aaData.map((u) => u.ids);
      expect(ids).toContain('admin_student_1');
    });

    test('GET /student/:id/confirm/:state/:value - 학생 제출 승인', async () => {
      const res = await agent.get(`/cssys/work/admin/student/${testStudent.user.id}/confirm/1/1`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`/cssys/work/admin/student/${testStudent.user.id}`);

      const updated = await workModels.Student.findOne({
        where: { UserId: testStudent.user.id },
      });
      expect(updated.state % 10).toBe(1);
    });

    test('GET /student_list - 학생 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/student_list');
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // 교수 엑셀 다운로드
  // ---------------------------------------------------------------------------
  describe('Excel Export', () => {
    test('POST /prof_excel_save - 교수 엑셀 다운로드', async () => {
      const res = await agent.post('/cssys/work/admin/prof_excel_save').send({});

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });

    test('GET /student_list/excel/:id - 특정 교수 학생 엑셀 다운로드', async () => {
      const profUser = await workModels.User.findOne({
        where: { ids: 'admin_student_prof' },
      });

      const res = await agent.get(`/cssys/work/admin/student_list/excel/${profUser.id}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ---------------------------------------------------------------------------
  // 권한/배정 관리
  // ---------------------------------------------------------------------------
  describe('Permission Management', () => {
    test('POST /permission/ajax/get_permissions - 권한 목록 조회', async () => {
      const res = await agent.post('/cssys/work/admin/permission/ajax/get_permissions').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Static pages
  // ---------------------------------------------------------------------------
  describe('Static page routes', () => {
    test('GET /notice_prof → /notice_prof/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/admin/notice_prof');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/admin/notice_prof/list');
    });

    test('GET /notice_prof/list - 교수 공지 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/notice_prof/list');
      expect(res.status).toBe(200);
    });

    test('GET /notice_student → /notice_student/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/admin/notice_student');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/admin/notice_student/list');
    });

    test('GET /notice_student/list - 학생 공지 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/notice_student/list');
      expect(res.status).toBe(200);
    });

    test('GET /example → /example/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/admin/example');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/admin/example/list');
    });

    test('GET /qna → /qna/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/admin/qna');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/admin/qna/list');
    });

    test('GET /qna/list - QnA 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/qna/list');
      expect(res.status).toBe(200);
    });

    test('GET /prof_excel_register - 교수 엑셀 등록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/prof_excel_register');
      expect(res.status).toBe(200);
    });

    test('GET /student_excel_register - 학생 엑셀 등록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/admin/student_excel_register');
      expect(res.status).toBe(200);
    });
  });
});
