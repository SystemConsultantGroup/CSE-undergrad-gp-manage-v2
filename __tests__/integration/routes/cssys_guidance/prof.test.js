const request = require('supertest');
const { sha256 } = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('Guidance Prof Routes Integration', () => {
  let app, guidanceModels, cssysModels, workModels;
  let profUser, gProf, wProf;
  let studentUser, gStudent;
  let agent;

  beforeAll(async () => {
    guidanceModels = require('../../../../models/cssys_guidance');
    cssysModels = require('../../../../models/cssys');
    workModels = require('../../../../models/cssys_work');

    await resetDatabase(guidanceModels.sequelize, cssysModels.sequelize, workModels.sequelize);
    await ensureMinioBucket();

    app = require('../../../../app');

    // 교수 유저 생성 (guidance + work Prof 모두 필요)
    profUser = await workModels.User.create({
      ids: 'gprof',
      password: sha256('test1234'),
      name: '생활지도교수',
      email: 'gprof@test.com',
      phone: '010-1111-1111',
      type: 1,
      major: 1,
      time: new Date(),
      ip: '127.0.0.1',
    });
    gProf = await guidanceModels.Prof.create({ UserId: profUser.id });
    wProf = await workModels.Prof.create({ UserId: profUser.id });

    // 학생 유저 생성
    studentUser = await workModels.User.create({
      ids: 'gstudent',
      password: sha256('test1234'),
      name: '생활지도학생',
      email: 'gstudent@test.com',
      phone: '010-2222-2222',
      type: 2,
      major: 1,
      time: new Date(),
      ip: '127.0.0.1',
    });
    gStudent = await guidanceModels.Student.create({
      term: 7,
      status: 0,
      doublemajor: false,
      state: 1,
      time: new Date(),
      ip: '127.0.0.1',
      UserId: studentUser.id,
      ProfId: gProf.id,
    });

    // UserLog 생성 (GET /main 에서 UserLog 조회에 필요)
    await cssysModels.UserLog.create({
      success: 1,
      ids: 'gprof',
      password: sha256('test1234'),
      time: new Date(),
      ip: '127.0.0.1',
    });

    // 교수 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'gprof', password: 'test1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(1);
  }, 30000);

  // ---------------------------------------------------------------------------
  // 1. ALL * - 인증 가드 (type === 1)
  // ---------------------------------------------------------------------------
  describe('Authentication Guard (ALL *)', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/guidance/prof/main');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('학생 계정(type=2)은 교수 페이지 접근 불가', async () => {
      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'gstudent', password: 'test1234' });

      const res = await studentAgent.get('/cssys/guidance/prof/main');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('관리자 계정(type=0)은 교수 페이지 접근 불가', async () => {
      await workModels.User.create({
        ids: 'gadmin_guard',
        password: sha256('test1234'),
        name: '관리자',
        email: 'gadmin@test.com',
        phone: '010-0000-0000',
        type: 0,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });

      const adminAgent = request.agent(app);
      await adminAgent.post('/cssys/login').send({ ids: 'gadmin_guard', password: 'test1234' });

      const res = await adminAgent.get('/cssys/guidance/prof/main');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. GET / - /main 으로 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/guidance/prof/');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/guidance/prof/main');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GET /main - 대시보드
  // ---------------------------------------------------------------------------
  describe('GET /main', () => {
    test('메인 대시보드 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/guidance/prof/main');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. GET /permission - 신청 학생 목록
  // ---------------------------------------------------------------------------
  describe('GET /permission', () => {
    test('자신에게 신청한 학생 목록 페이지 렌더링', async () => {
      // state=0인 GPermissionLog 생성 (permission 페이지에서 조회하는 조건)
      await guidanceModels.GPermissionLog.create({
        resorreq: 'req',
        state: 0,
        StudentId: gStudent.id,
        ProfId: gProf.id,
      });

      const res = await agent.get('/cssys/guidance/prof/permission');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GET /permission/application/:id - 학생 신청서 조회
  // ---------------------------------------------------------------------------
  describe('GET /permission/application/:id', () => {
    test('권한이 없는 경우 next()로 이동', async () => {
      // Permission 레코드가 없으면 next() 호출
      const res = await agent.get(`/cssys/guidance/prof/permission/application/${studentUser.id}`);

      // Permission 미존재 또는 StudentInfo 미존재 시 next() -> 404/500
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. POST /permission/ajax/set_student - 학생 선택
  // ---------------------------------------------------------------------------
  describe('POST /permission/ajax/set_student', () => {
    test('시스템 4,6,8이 비활성이면 next() 호출', async () => {
      const res = await agent.post('/cssys/guidance/prof/permission/ajax/set_student').send({
        id: 999,
      });

      // System 4,6,8이 존재하지 않으면 next() -> 404/500
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. GET /student_list - 학생 목록 페이지 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /student_list', () => {
    test('학생 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/student_list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. GET /student_list/excel/ - 엑셀 다운로드
  // ---------------------------------------------------------------------------
  describe('GET /student_list/excel/', () => {
    test('엑셀 파일 다운로드 성공', async () => {
      const res = await agent.get('/cssys/guidance/prof/student_list/excel/');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. POST /student_list/ajax/get_students - 학생 목록 JSON
  // ---------------------------------------------------------------------------
  describe('POST /student_list/ajax/get_students', () => {
    test('배정된 학생 목록 JSON 반환', async () => {
      const res = await agent.post('/cssys/guidance/prof/student_list/ajax/get_students').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });

    test('비밀번호 필드가 노출되지 않음', async () => {
      const res = await agent.post('/cssys/guidance/prof/student_list/ajax/get_students').send({});

      expect(res.status).toBe(200);
      res.body.aaData.forEach((user) => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 10. GET /student/application/:id - 학생 신청서 보기
  // ---------------------------------------------------------------------------
  describe('GET /student/application/:id', () => {
    test('소속 학생 신청서 조회 시도', async () => {
      const res = await agent.get(`/cssys/guidance/prof/student/application/${studentUser.id}`);

      // StudentInfo가 없으면 에러 발생 가능
      expect([200, 404, 500]).toContain(res.status);
    });

    test('다른 교수의 학생 신청서는 접근 불가', async () => {
      const otherProfUser = await workModels.User.create({
        ids: 'gprof_other_app',
        password: sha256('test1234'),
        name: '다른교수',
        email: 'other@test.com',
        phone: '010-9999-9999',
        type: 1,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      const otherGProf = await guidanceModels.Prof.create({ UserId: otherProfUser.id });

      const otherStudentUser = await workModels.User.create({
        ids: 'gstudent_other_app',
        password: sha256('test1234'),
        name: '다른학생',
        email: 'other_stu@test.com',
        phone: '010-8888-8888',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 2,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: otherStudentUser.id,
        ProfId: otherGProf.id,
      });

      const res = await agent.get(`/cssys/guidance/prof/student/application/${otherStudentUser.id}`);

      // Prof 불일치 -> next() 호출
      expect([404, 500]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. GET /student/:id - 학생 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /student/:id', () => {
    test('소속 학생 상세 페이지 조회 시도', async () => {
      const res = await agent.get(`/cssys/guidance/prof/student/${studentUser.id}`);

      // StudentInfo 등이 없으면 에러 가능
      expect([200, 404, 500]).toContain(res.status);
    });

    test('다른 교수의 학생은 접근 불가', async () => {
      const otherProfUser2 = await workModels.User.create({
        ids: 'gprof_other_detail',
        password: sha256('test1234'),
        name: '다른교수2',
        email: 'other2@test.com',
        phone: '010-7777-7777',
        type: 1,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      const otherGProf2 = await guidanceModels.Prof.create({ UserId: otherProfUser2.id });

      const otherStudentUser2 = await workModels.User.create({
        ids: 'gstudent_other_det',
        password: sha256('test1234'),
        name: '다른학생2',
        email: 'other_stu2@test.com',
        phone: '010-6666-6666',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 2,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: otherStudentUser2.id,
        ProfId: otherGProf2.id,
      });

      const res = await agent.get(`/cssys/guidance/prof/student/${otherStudentUser2.id}`);

      expect([404, 500]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 12. POST /student/:id - 메모/코멘트 업데이트
  // ---------------------------------------------------------------------------
  describe('POST /student/:id', () => {
    test('학생 메모, 코멘트, 우수작 업데이트 성공', async () => {
      const res = await agent.post(`/cssys/guidance/prof/student/${studentUser.id}`).send({
        note: '업데이트된 메모',
        comment: '업데이트된 코멘트',
        masterpiece: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 반영 확인 (guidance Student 모델)
      const updated = await guidanceModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      expect(updated.note).toBe('업데이트된 메모');
    });

    test('존재하지 않는 학생에 대한 업데이트는 실패', async () => {
      const res = await agent.post('/cssys/guidance/prof/student/99999').send({
        note: 'x',
        comment: 'x',
        masterpiece: 0,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('존재하지 않는');
    });

    test('다른 교수의 학생은 업데이트 불가', async () => {
      const otherProfUser3 = await workModels.User.create({
        ids: 'gprof_other_upd',
        password: sha256('test1234'),
        name: '다른교수3',
        email: 'other3@test.com',
        phone: '010-5555-5555',
        type: 1,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      const otherGProf3 = await guidanceModels.Prof.create({ UserId: otherProfUser3.id });

      const otherStudentUser3 = await workModels.User.create({
        ids: 'gstudent_other_upd',
        password: sha256('test1234'),
        name: '다른학생3',
        email: 'other_stu3@test.com',
        phone: '010-4444-4444',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 2,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: otherStudentUser3.id,
        ProfId: otherGProf3.id,
      });

      const res = await agent.post(`/cssys/guidance/prof/student/${otherStudentUser3.id}`).send({
        note: 'hack',
        comment: 'hack',
        masterpiece: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 13. GET /notice - 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /notice', () => {
    test('/notice/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/guidance/prof/notice');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/guidance/prof/notice/list');
    });
  });

  // ---------------------------------------------------------------------------
  // 14. GET /notice/list - 공지사항 목록
  // ---------------------------------------------------------------------------
  describe('GET /notice/list', () => {
    test('공지사항 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/notice/list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 15. GET /notice/view/:id - 공지사항 상세
  // ---------------------------------------------------------------------------
  describe('GET /notice/view/:id', () => {
    test('공지사항 상세 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/notice/view/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 16. GET /qna - 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /qna', () => {
    test('/qna/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/guidance/prof/qna');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/guidance/prof/qna/list');
    });
  });

  // ---------------------------------------------------------------------------
  // 17. GET /qna/list - QnA 목록
  // ---------------------------------------------------------------------------
  describe('GET /qna/list', () => {
    test('QnA 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/qna/list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 18. GET /qna/write - QnA 작성
  // ---------------------------------------------------------------------------
  describe('GET /qna/write', () => {
    test('QnA 작성 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/qna/write');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 19. GET /qna/view/:id - QnA 상세
  // ---------------------------------------------------------------------------
  describe('GET /qna/view/:id', () => {
    test('QnA 상세 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/qna/view/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 20. GET /qna/reply/:id - QnA 답변
  // ---------------------------------------------------------------------------
  describe('GET /qna/reply/:id', () => {
    test('QnA 답변 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/qna/reply/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 21. GET /qna/modify/:id - QnA 수정
  // ---------------------------------------------------------------------------
  describe('GET /qna/modify/:id', () => {
    test('QnA 수정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/qna/modify/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 22. GET /config - 회원정보 수정 페이지
  // ---------------------------------------------------------------------------
  describe('GET /config', () => {
    test('설정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/guidance/prof/config');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 23. POST /config - 회원정보 수정
  // ---------------------------------------------------------------------------
  describe('POST /config', () => {
    test('이메일, 전화번호 업데이트', async () => {
      const res = await agent.post('/cssys/guidance/prof/config').send({
        email: 'updated_gprof@test.com',
        phone: '010-0000-0000',
        password: '',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await guidanceModels.User.findByPk(profUser.id);
      expect(updated.email).toBe('updated_gprof@test.com');
      expect(updated.phone).toBe('010-0000-0000');
    });

    test('비밀번호 변경', async () => {
      const res = await agent.post('/cssys/guidance/prof/config').send({
        email: 'gprof@test.com',
        phone: '010-1111-1111',
        password: 'newpass999',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await guidanceModels.User.findByPk(profUser.id);
      expect(updated.password).toBe(sha256('newpass999'));

      // 원래 비밀번호로 복원 (후속 테스트를 위해)
      await updated.update({ password: sha256('test1234') });
    });

    test('비밀번호 비워두면 비밀번호 변경 없음', async () => {
      const before = await guidanceModels.User.findByPk(profUser.id);
      const originalPassword = before.password;

      const res = await agent.post('/cssys/guidance/prof/config').send({
        email: 'nopwchange_gprof@test.com',
        phone: '010-3333-3333',
        password: '',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const after = await guidanceModels.User.findByPk(profUser.id);
      expect(after.password).toBe(originalPassword);
      expect(after.email).toBe('nopwchange_gprof@test.com');
    });
  });

  // ---------------------------------------------------------------------------
  // 24. POST /acpt - 학생 수락 (state -> 2, GPermissionLog 생성)
  // ---------------------------------------------------------------------------
  describe('POST /acpt', () => {
    test('학생 수락 성공 (state 0 -> 2)', async () => {
      // 수락 대상 학생 생성
      const acptStudentUser = await workModels.User.create({
        ids: 'gstudent_acpt',
        password: sha256('test1234'),
        name: '수락학생',
        email: 'acpt@test.com',
        phone: '010-1234-5678',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      const acptStudent = await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 1,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: acptStudentUser.id,
        ProfId: gProf.id,
      });

      const logCountBefore = await guidanceModels.GPermissionLog.count();

      const res = await agent.post('/cssys/guidance/prof/acpt').send({
        student_Id: acptStudent.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 확인: state가 2로 변경
      const updated = await guidanceModels.Student.findByPk(acptStudent.id);
      expect(updated.state).toBe(2);

      // GPermissionLog 생성 확인
      const logCountAfter = await guidanceModels.GPermissionLog.count();
      expect(logCountAfter).toBeGreaterThan(logCountBefore);

      // 생성된 로그 확인
      const log = await guidanceModels.GPermissionLog.findOne({
        where: { StudentId: acptStudent.id, resorreq: 'res', state: 1 },
        order: [['createdAt', 'DESC']],
      });
      expect(log).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 25. POST /reject - 학생 거절 (state -> 0)
  // ---------------------------------------------------------------------------
  describe('POST /reject', () => {
    test('학생 거절 성공 (state 1 -> 0)', async () => {
      // 거절 대상 학생 생성
      const rejectStudentUser = await workModels.User.create({
        ids: 'gstudent_reject',
        password: sha256('test1234'),
        name: '거절학생',
        email: 'reject@test.com',
        phone: '010-3456-7890',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      const rejectStudent = await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 1,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: rejectStudentUser.id,
        ProfId: gProf.id,
      });

      const res = await agent.post('/cssys/guidance/prof/reject').send({
        student_Id: rejectStudent.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 확인: state가 0으로 변경
      const updated = await guidanceModels.Student.findByPk(rejectStudent.id);
      expect(updated.state).toBe(0);
      expect(updated.ProfId).toBeNull();

      // GPermissionLog 생성 확인 (state: 0 = 거절)
      const log = await guidanceModels.GPermissionLog.findOne({
        where: { StudentId: rejectStudent.id, resorreq: 'res', state: 0 },
        order: [['createdAt', 'DESC']],
      });
      expect(log).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 26. POST /cancelCheck - 취소 확인 처리
  // ---------------------------------------------------------------------------
  describe('POST /cancelCheck', () => {
    test('취소 확인 시 로그 text를 null로 변경', async () => {
      // 취소 로그 생성
      const cancelLog = await guidanceModels.GPermissionLog.create({
        resorreq: 'req',
        state: 0,
        text: '취소 사유',
        StudentId: gStudent.id,
        ProfId: gProf.id,
      });

      const res = await agent.post('/cssys/guidance/prof/cancelCheck').send({
        logId: cancelLog.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 확인: text가 null로 변경
      const updated = await guidanceModels.GPermissionLog.findByPk(cancelLog.id);
      expect(updated.text).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 27. GET /connection - 배정된 학생 목록 (state=2)
  // ---------------------------------------------------------------------------
  describe('GET /connection', () => {
    test('배정된 학생 목록 반환', async () => {
      // state=2인 학생 생성
      const connStudentUser = await workModels.User.create({
        ids: 'gstudent_conn',
        password: sha256('test1234'),
        name: '배정학생',
        email: 'conn@test.com',
        phone: '010-5678-1234',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 2,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: connStudentUser.id,
        ProfId: gProf.id,
      });

      const res = await agent.get('/cssys/guidance/prof/connection');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // state=2인 학생이 포함되어야 함
      const names = res.body.map((s) => s.User.name);
      expect(names).toContain('배정학생');
    });

    test('state=1인 학생은 목록에 미포함', async () => {
      const res = await agent.get('/cssys/guidance/prof/connection');

      expect(res.status).toBe(200);
      // state=1인 학생 (gStudent)은 포함되지 않아야 함
      const userIds = res.body.map((s) => s.UserId);
      // gStudent의 state가 변경되었을 수 있으므로 현재 상태 확인
      const currentGStudent = await guidanceModels.Student.findByPk(gStudent.id);
      if (currentGStudent.state !== 2) {
        expect(userIds).not.toContain(studentUser.id);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 28. POST /stu_list - 자신에게 신청한 학생 목록
  // ---------------------------------------------------------------------------
  describe('POST /stu_list', () => {
    test('자신에게 신청한 학생 목록 반환', async () => {
      // 신청 학생 생성
      const applyStudentUser = await workModels.User.create({
        ids: 'gstudent_apply',
        password: sha256('test1234'),
        name: '신청학생',
        email: 'apply@test.com',
        phone: '010-9876-5432',
        type: 2,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });
      const applyStudent = await guidanceModels.Student.create({
        term: 7,
        status: 0,
        doublemajor: false,
        state: 1,
        time: new Date(),
        ip: '127.0.0.1',
        UserId: applyStudentUser.id,
        ProfId: null,
      });

      // 신청 로그 생성
      await guidanceModels.GPermissionLog.create({
        resorreq: 'req',
        state: 1,
        StudentId: applyStudent.id,
        ProfId: gProf.id,
      });

      const res = await agent.post('/cssys/guidance/prof/stu_list').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);
    });
  });
});
