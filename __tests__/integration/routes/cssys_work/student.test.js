const request = require('supertest');
const { sha256, createProfUser, createStudentUser, createSystem, createAllSystems } = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('Student Routes Integration', () => {
  let app, workModels, cssysModels;
  let studentUser, studentRecord, profRecord, system;
  let agent;

  beforeAll(async () => {
    workModels = require('../../../../models/cssys_work');
    cssysModels = require('../../../../models/cssys');

    await resetDatabase(workModels.sequelize, cssysModels.sequelize);
    await ensureMinioBucket();

    app = require('../../../../app');

    // 12개 시스템 생성
    const systems = await createAllSystems(workModels);
    system = systems[1]; // System id=2 (신청서 제출)

    // 교수 생성
    const profResult = await createProfUser(workModels, {
      ids: 'student_test_prof',
    });
    profRecord = profResult.prof;

    // 학생 생성
    const result = await createStudentUser(workModels, profRecord.id, system.id, {
      ids: 'integstudent',
      name: '통합테스트학생',
    });
    studentUser = result.user;
    studentRecord = result.student;

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'integstudent', password: 'test1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(2);
  }, 30000);

  // sequelize.close() 하지 않음 — forceExit가 정리함.

  // ---------------------------------------------------------------------------
  // 인증
  // ---------------------------------------------------------------------------
  describe('Authentication Guard', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/work/student/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('교수 계정은 학생 페이지 접근 불가', async () => {
      const profAgent = request.agent(app);
      await profAgent.post('/cssys/login').send({ ids: 'student_test_prof', password: 'test1234' });

      const res = await profAgent.get('/cssys/work/student/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /
  // ---------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/main');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /main
  // ---------------------------------------------------------------------------
  describe('GET /main', () => {
    test('학생 메인 대시보드 렌더링 성공', async () => {
      const res = await agent.get('/cssys/work/student/main');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 신청서 처리
  // ---------------------------------------------------------------------------
  describe('POST /system/proc/application', () => {
    test('신청서 제출 성공', async () => {
      const res = await agent.post('/cssys/work/student/system/proc/application').send({
        credit11: 18,
        grade11: 3.5,
        credit12: 18,
        grade12: 3.6,
        credit21: 18,
        grade21: 3.7,
        credit22: 18,
        grade22: 3.8,
        credit31: 18,
        grade31: 3.9,
        credit32: 18,
        grade32: 4.0,
        field1: 'AI',
        field2: '보안',
        field3: '네트워크',
        class1: '인공지능',
        grade1: 'A+',
        class2: '정보보안',
        grade2: 'A',
        class3: '네트워크',
        grade3: 'A',
        text: '수상 이력',
        subject: 'AI 기반 졸업작품',
        time: new Date().toISOString(),
        ip: '127.0.0.1',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 확인
      const student = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
        include: [workModels.StudentInfo],
      });
      expect(student.StudentInfo).not.toBeNull();
      expect(student.StudentInfo.field1).toBe('AI');
    });

    test('신청서 수정 (이미 존재할 때 update)', async () => {
      const res = await agent.post('/cssys/work/student/system/proc/application').send({
        credit11: 20,
        grade11: 4.0,
        credit12: '',
        grade12: '',
        credit21: '',
        grade21: '',
        credit22: '',
        grade22: '',
        credit31: '',
        grade31: '',
        credit32: '',
        grade32: '',
        field1: '빅데이터',
        field2: '',
        field3: '',
        class1: '',
        grade1: '',
        class2: '',
        grade2: '',
        class3: '',
        grade3: '',
        text: '',
        subject: '수정된 주제',
        time: new Date().toISOString(),
        ip: '127.0.0.1',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const student = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
        include: [workModels.StudentInfo],
      });
      expect(student.StudentInfo.field1).toBe('빅데이터');
      expect(student.StudentInfo.subject).toBe('수정된 주제');
    });
  });

  // ---------------------------------------------------------------------------
  // Config (회원정보)
  // ---------------------------------------------------------------------------
  describe('Config (회원정보)', () => {
    test('GET /config - 설정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/config');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('POST /config - 이메일, 전화번호 업데이트', async () => {
      const res = await agent.post('/cssys/work/student/config').send({
        email: 'student_updated@test.com',
        phone: '010-9999-9999',
        password: '',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.User.findByPk(studentUser.id);
      expect(updated.email).toBe('student_updated@test.com');
      expect(updated.phone).toBe('010-9999-9999');
    });

    test('POST /config - 비밀번호 변경', async () => {
      const res = await agent.post('/cssys/work/student/config').send({
        email: 'student@test.com',
        phone: '010-9876-5432',
        password: 'newstudentpass',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.User.findByPk(studentUser.id);
      expect(updated.password).toBe(sha256('newstudentpass'));

      // 복원
      await updated.update({ password: sha256('test1234') });
    });
  });

  // ---------------------------------------------------------------------------
  // Static page routes
  // ---------------------------------------------------------------------------
  describe('Static page routes', () => {
    test('GET /notice → /notice/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/notice');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/notice/list');
    });

    test('GET /notice/list - 공지사항 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/notice/list');
      expect(res.status).toBe(200);
    });

    test('GET /example → /example/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/example');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/example/list');
    });

    test('GET /example/list - 예시 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/example/list');
      expect(res.status).toBe(200);
    });

    test('GET /qna → /qna/list 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/qna');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/qna/list');
    });

    test('GET /qna/list - QnA 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/qna/list');
      expect(res.status).toBe(200);
    });

    test('GET /qna/write - QnA 작성 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/qna/write');
      expect(res.status).toBe(200);
    });
  });
});
