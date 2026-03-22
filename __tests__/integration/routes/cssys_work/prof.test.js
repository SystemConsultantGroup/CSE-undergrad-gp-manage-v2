const request = require('supertest');
const {
  sha256,
  createProfUser,
  createStudentUser,
  createSystem,
  createAllSystems,
  createPermission,
  createStudentInfo,
  createStudentFile,
} = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('Prof Routes Integration', () => {
  let app, workModels, cssysModels;
  let profUser, profRecord;
  let agent;

  beforeAll(async () => {
    workModels = require('../../../../models/cssys_work');
    cssysModels = require('../../../../models/cssys');

    await resetDatabase(workModels.sequelize, cssysModels.sequelize);
    await ensureMinioBucket();

    app = require('../../../../app');

    // 교수 유저 생성
    const result = await createProfUser(workModels, { ids: 'integprof' });
    profUser = result.user;
    profRecord = result.prof;

    // 12개 시스템 생성 (main 템플릿이 systems[0]~[11] 참조)
    await createAllSystems(workModels);

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'integprof', password: 'test1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(1);
  }, 30000);

  // sequelize.close() 하지 않음 — forceExit가 정리함.

  // ---------------------------------------------------------------------------
  // 1. ALL * - 인증 가드 (type === 1)
  // ---------------------------------------------------------------------------
  describe('Authentication Guard (ALL *)', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/work/prof/main');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('학생 계정(type=2)은 교수 페이지 접근 불가', async () => {
      const system = await createSystem(workModels);
      await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_auth_guard',
      });

      const studentAgent = request.agent(app);
      await studentAgent.post('/cssys/login').send({ ids: 'student_auth_guard', password: 'test1234' });

      const res = await studentAgent.get('/cssys/work/prof/main');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('관리자 계정(type=0)은 교수 페이지 접근 불가', async () => {
      await workModels.User.create({
        ids: 'admin_guard_test',
        password: sha256('test1234'),
        name: '관리자',
        email: 'admin_guard@test.com',
        phone: '010-0000-0000',
        type: 0,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });

      const adminAgent = request.agent(app);
      await adminAgent.post('/cssys/login').send({ ids: 'admin_guard_test', password: 'test1234' });

      const res = await adminAgent.get('/cssys/work/prof/main');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. GET / - /main 으로 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/prof/');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/prof/main');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GET /main - 대시보드
  // ---------------------------------------------------------------------------
  describe('GET /main', () => {
    test('메인 대시보드 페이지 렌더링 성공 (12개 시스템 참조)', async () => {
      // 학생 생성 (대시보드에 표시)
      const systems = await workModels.System.findAll();
      await createStudentUser(workModels, profRecord.id, systems[0].id, {
        ids: 'student_main_1',
      });

      const res = await agent.get('/cssys/work/prof/main');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. GET /permission - 교수 배정 페이지
  // ---------------------------------------------------------------------------
  describe('GET /permission', () => {
    test('배정 기간 내 - 권한 목록 페이지 렌더링', async () => {
      // 시스템 4,6,8이 이미 활성 상태 (createAllSystems로 생성됨)
      const res = await agent.get('/cssys/work/prof/permission');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('배정 기간 외 - out_date 페이지 렌더링', async () => {
      // 시스템 4,6,8을 만료 상태로 변경
      const now = new Date();
      const pastStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      await workModels.System.update({ start: pastStart, end: pastEnd }, { where: { id: [4, 6, 8] } });

      const res = await agent.get('/cssys/work/prof/permission');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');

      // 원상복구 (후속 테스트를 위해)
      const activeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await workModels.System.update({ start: activeStart, end: activeEnd }, { where: { id: [4, 6, 8] } });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GET /permission/application/:id - 학생 신청서 조회
  // ---------------------------------------------------------------------------
  describe('GET /permission/application/:id', () => {
    test('권한이 있는 학생의 신청서 조회 성공', async () => {
      const system = await workModels.System.findByPk(4);
      const { user: studentUser, student } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_perm_app',
      });

      // StudentInfo 생성
      const studentInfo = await createStudentInfo(workModels, studentUser.id);
      await student.update({ StudentInfoId: studentInfo.id });

      // Permission 생성 (firstProfId = 로그인한 교수)
      await createPermission(workModels, student.id, {
        firstProfId: profRecord.id,
      });

      const res = await agent.get(`/cssys/work/prof/permission/application/${studentUser.id}`);

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. POST /permission/ajax/set_student - 학생 선택
  // ---------------------------------------------------------------------------
  describe('POST /permission/ajax/set_student', () => {
    test('활성 기간 내 학생 선택 성공', async () => {
      // 시스템 4가 활성 상태인지 확인
      const now = new Date();
      const activeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await workModels.System.update({ start: activeStart, end: activeEnd }, { where: { id: 4 } });

      const system = await workModels.System.findByPk(4);
      const { student } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_set_perm',
      });

      const yearterm = now.getFullYear().toString() + (now.getMonth() < 6 ? '01' : '02');
      const permission = await createPermission(workModels, student.id, {
        yearterm: parseInt(yearterm),
        order: 1,
        firstProfId: profRecord.id,
      });

      const res = await agent.post('/cssys/work/prof/permission/ajax/set_student').send({
        id: permission.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 확인 - firstSelected가 1로 설정되었는지
      const updated = await workModels.Permission.findByPk(permission.id);
      expect(updated.firstSelected).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. GET /student_list - 학생 목록 페이지
  // ---------------------------------------------------------------------------
  describe('GET /student_list', () => {
    test('학생 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/student_list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. GET /student_list/excel/ - 엑셀 다운로드
  // ---------------------------------------------------------------------------
  describe('GET /student_list/excel/', () => {
    test('엑셀 파일 다운로드 성공', async () => {
      const res = await agent.get('/cssys/work/prof/student_list/excel/');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. POST /student_list/ajax/get_students - 학생 목록 JSON
  // ---------------------------------------------------------------------------
  describe('POST /student_list/ajax/get_students', () => {
    test('배정된 학생 목록 JSON 반환', async () => {
      const system = await createSystem(workModels);
      await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_list_a',
        name: '학생A',
      });
      await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_list_b',
        name: '학생B',
      });

      const res = await agent.post('/cssys/work/prof/student_list/ajax/get_students').send({});

      expect(res.status).toBe(200);
      expect(res.body.aaData).toBeDefined();
      expect(Array.isArray(res.body.aaData)).toBe(true);

      const ids = res.body.aaData.map((u) => u.ids);
      expect(ids).toContain('student_list_a');
      expect(ids).toContain('student_list_b');
    });

    test('비밀번호 필드가 노출되지 않음', async () => {
      const res = await agent.post('/cssys/work/prof/student_list/ajax/get_students').send({});

      expect(res.status).toBe(200);
      res.body.aaData.forEach((user) => {
        expect(user.password).toBeUndefined();
      });
    });

    test('state 를 [제안서, 중간보고서, 최종보고서] 배열로 변환', async () => {
      const system = await createSystem(workModels);
      // state 210 = 최종보고서(2), 중간보고서(1), 제안서(0)
      await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_state_210',
        student: { state: 210 },
      });

      const res = await agent.post('/cssys/work/prof/student_list/ajax/get_students').send({});

      const found = res.body.aaData.find((u) => u.ids === 'student_state_210');
      expect(found).toBeDefined();
      expect(found.Student.state).toEqual([0, 1, 2]);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. GET /student/application/:id - 학생 신청서 보기
  // ---------------------------------------------------------------------------
  describe('GET /student/application/:id', () => {
    test('소속 학생의 신청서 페이지 렌더링', async () => {
      const system = await createSystem(workModels);
      const { user: studentUser, student } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_app_view',
      });

      // StudentInfo 생성 및 연결
      const studentInfo = await createStudentInfo(workModels, studentUser.id);
      await student.update({ StudentInfoId: studentInfo.id });

      const res = await agent.get(`/cssys/work/prof/student/application/${studentUser.id}`);

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('다른 교수의 학생 신청서는 접근 불가', async () => {
      const { prof: otherProf } = await createProfUser(workModels, { ids: 'other_prof_app' });
      const system = await createSystem(workModels);
      const { user: otherStudent } = await createStudentUser(workModels, otherProf.id, system.id, {
        ids: 'other_student_app',
      });

      const res = await agent.get(`/cssys/work/prof/student/application/${otherStudent.id}`);

      // Prof 불일치 → next() 호출 → 404 또는 비정상 응답
      expect([404, 500]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. GET /student/:id - 학생 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /student/:id', () => {
    test('소속 학생의 상세 페이지 렌더링 (파일 연관 포함)', async () => {
      const system = await createSystem(workModels);
      const { user: studentUser, student } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_detail_view',
      });

      // StudentInfo 생성 및 연결
      const studentInfo = await createStudentInfo(workModels, studentUser.id);
      await student.update({ StudentInfoId: studentInfo.id });

      // StudentFile 생성 및 연결 (서약서)
      const oathFile = await createStudentFile(workModels, studentUser.id, {
        name: 'oath.pdf',
        path: 'uploads/oath.pdf',
      });
      await student.update({ oathId: oathFile.id });

      const res = await agent.get(`/cssys/work/prof/student/${studentUser.id}`);

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('다른 교수의 학생은 접근 불가', async () => {
      const { prof: otherProf } = await createProfUser(workModels, { ids: 'other_prof_detail' });
      const system = await createSystem(workModels);
      const { user: otherStudent } = await createStudentUser(workModels, otherProf.id, system.id, {
        ids: 'other_student_detail',
      });

      const res = await agent.get(`/cssys/work/prof/student/${otherStudent.id}`);

      // Prof 불일치 → next() 호출
      expect([404, 500]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 12. GET /student/:id/confirm/:state/:value - 승인/반려
  // ---------------------------------------------------------------------------
  describe('GET /student/:id/confirm/:state/:value', () => {
    test('제안서 승인 (state=1, value=1)', async () => {
      const system = await createSystem(workModels);
      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'confirm_approve_1',
        student: { state: 0 },
      });

      const res = await agent.get(`/cssys/work/prof/student/${studentUser.id}/confirm/1/1`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`/cssys/work/prof/student/${studentUser.id}`);

      const updated = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      expect(updated.state % 10).toBe(1);
    });

    test('중간보고서 반려 (state=2, value=2)', async () => {
      const system = await createSystem(workModels);
      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'confirm_reject_mid',
        student: { state: 1 },
      });

      await agent.get(`/cssys/work/prof/student/${studentUser.id}/confirm/2/2`);

      const updated = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      // 중간보고서 = 10의 자리
      expect(parseInt((updated.state % 100) / 10)).toBe(2);
      // 제안서(1의 자리)는 유지
      expect(updated.state % 10).toBe(1);
    });

    test('최종보고서 승인 (state=3, value=1) - 기존 state 보존', async () => {
      const system = await createSystem(workModels);
      // state 11 = 제안서(1), 중간보고서(1), 최종보고서(0)
      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'confirm_final',
        student: { state: 11 },
      });

      await agent.get(`/cssys/work/prof/student/${studentUser.id}/confirm/3/1`);

      const updated = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      // 최종보고서 = 100의 자리
      expect(parseInt(updated.state / 100)).toBe(1);
      // 기존 state 보존
      expect(updated.state % 10).toBe(1);
      expect(parseInt((updated.state % 100) / 10)).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 13. POST /student/:id - 메모/코멘트/우수작 업데이트
  // ---------------------------------------------------------------------------
  describe('POST /student/:id', () => {
    test('학생 메모, 코멘트, 우수작 업데이트 성공', async () => {
      const system = await createSystem(workModels);
      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_update_1',
      });

      const res = await agent.post(`/cssys/work/prof/student/${studentUser.id}`).send({
        note: '업데이트된 메모',
        comment: '업데이트된 코멘트',
        masterpiece: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB 반영 확인
      const updated = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      expect(updated.note).toBe('업데이트된 메모');
      expect(updated.comment).toBe('업데이트된 코멘트');
      expect(updated.masterpiece).toBe(1);
    });

    test('존재하지 않는 학생에 대한 업데이트는 실패', async () => {
      const res = await agent.post('/cssys/work/prof/student/99999').send({
        note: 'x',
        comment: 'x',
        masterpiece: 0,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('존재하지 않는');
    });

    test('다른 교수의 학생은 업데이트 불가', async () => {
      const { prof: otherProf } = await createProfUser(workModels, { ids: 'other_prof_1' });
      const system = await createSystem(workModels);
      const { user: otherStudent } = await createStudentUser(workModels, otherProf.id, system.id, {
        ids: 'other_prof_student',
      });

      const res = await agent
        .post(`/cssys/work/prof/student/${otherStudent.id}`)
        .send({ note: 'hack', comment: 'hack', masterpiece: 1 });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 14. GET /examine - 심사 목록
  // ---------------------------------------------------------------------------
  describe('GET /examine', () => {
    test('심사 기간 내 - 심사 목록 페이지 렌더링', async () => {
      // System id=12가 심사 시스템 (createAllSystems에서 이미 생성됨)
      const system = await workModels.System.findByPk(12);
      expect(system).not.toBeNull();

      await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_examine_list',
      });

      const res = await agent.get('/cssys/work/prof/examine');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('심사 기간 외 - out_date 페이지 렌더링', async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      await workModels.System.update({ start: pastStart, end: pastEnd }, { where: { id: 12 } });

      const res = await agent.get('/cssys/work/prof/examine');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');

      // 원상복구
      const activeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await workModels.System.update({ start: activeStart, end: activeEnd }, { where: { id: 12 } });
    });
  });

  // ---------------------------------------------------------------------------
  // 15. GET /examine/:id - 심사 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /examine/:id', () => {
    test('심사 기간 내 - 심사 상세 페이지 렌더링', async () => {
      const system = await workModels.System.findByPk(12);
      const { user: studentUser, student } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_examine_view',
      });

      // StudentInfo 생성 및 연결
      const studentInfo = await createStudentInfo(workModels, studentUser.id);
      await student.update({ StudentInfoId: studentInfo.id });

      const res = await agent.get(`/cssys/work/prof/examine/${studentUser.id}`);

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('심사 기간 외 - out_date 페이지 렌더링', async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      await workModels.System.update({ start: pastStart, end: pastEnd }, { where: { id: 12 } });

      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, 12, {
        ids: 'student_examine_view_expired',
      });

      const res = await agent.get(`/cssys/work/prof/examine/${studentUser.id}`);

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');

      // 원상복구
      const activeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await workModels.System.update({ start: activeStart, end: activeEnd }, { where: { id: 12 } });
    });
  });

  // ---------------------------------------------------------------------------
  // 16. POST /examine/:id - 심사 결과 제출
  // ---------------------------------------------------------------------------
  describe('POST /examine/:id', () => {
    test('심사 결과 합격 처리', async () => {
      const system = await workModels.System.findByPk(12);
      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_examine_pass',
      });

      const res = await agent.post(`/cssys/work/prof/examine/${studentUser.id}`).send({
        note: '심사 통과',
        masterpiece: 0,
        result: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      expect(updated.result).toBe(1);
      expect(updated.note).toBe('심사 통과');
    });

    test('심사 결과 불합격 처리', async () => {
      const system = await workModels.System.findByPk(12);
      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_examine_fail',
      });

      const res = await agent.post(`/cssys/work/prof/examine/${studentUser.id}`).send({
        note: '심사 탈락',
        masterpiece: 0,
        result: 2,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      expect(updated.result).toBe(2);
    });

    test('우수작 선정 처리', async () => {
      const system = await workModels.System.findByPk(12);
      const { user: studentUser } = await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_examine_masterpiece',
      });

      const res = await agent.post(`/cssys/work/prof/examine/${studentUser.id}`).send({
        note: '우수작',
        masterpiece: 1,
        result: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.Student.findOne({
        where: { UserId: studentUser.id },
      });
      expect(updated.masterpiece).toBe(1);
    });

    test('다른 교수의 학생은 심사 불가', async () => {
      const { prof: otherProf } = await createProfUser(workModels, { ids: 'other_prof_exam' });
      const system = await workModels.System.findByPk(12);
      const { user: otherStudent } = await createStudentUser(workModels, otherProf.id, system.id, {
        ids: 'other_student_exam',
      });

      const res = await agent.post(`/cssys/work/prof/examine/${otherStudent.id}`).send({
        note: 'hack',
        masterpiece: 0,
        result: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
    });

    test('심사 기간 외에는 심사 불가', async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      await workModels.System.update({ start: pastStart, end: pastEnd }, { where: { id: 12 } });

      const res = await agent.post('/cssys/work/prof/examine/1').send({
        note: '기간외',
        masterpiece: 0,
        result: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('심사 기간이 아닙니다');

      // 원상복구
      const activeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await workModels.System.update({ start: activeStart, end: activeEnd }, { where: { id: 12 } });
    });
  });

  // ---------------------------------------------------------------------------
  // 17. GET /notice - 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /notice', () => {
    test('/notice/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/prof/notice');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/prof/notice/list');
    });
  });

  // ---------------------------------------------------------------------------
  // 18. GET /notice/list - 공지사항 목록
  // ---------------------------------------------------------------------------
  describe('GET /notice/list', () => {
    test('공지사항 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/notice/list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 19. GET /notice/view/:id - 공지사항 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /notice/view/:id', () => {
    test('공지사항 상세 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/notice/view/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 20. GET /qna - 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /qna', () => {
    test('/qna/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/prof/qna');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/prof/qna/list');
    });
  });

  // ---------------------------------------------------------------------------
  // 21. GET /qna/list - QnA 목록
  // ---------------------------------------------------------------------------
  describe('GET /qna/list', () => {
    test('QnA 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/qna/list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 22. GET /qna/write - QnA 작성
  // ---------------------------------------------------------------------------
  describe('GET /qna/write', () => {
    test('QnA 작성 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/qna/write');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 23. GET /qna/view/:id - QnA 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /qna/view/:id', () => {
    test('QnA 상세 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/qna/view/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 24. GET /qna/reply/:id - QnA 답변
  // ---------------------------------------------------------------------------
  describe('GET /qna/reply/:id', () => {
    test('QnA 답변 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/qna/reply/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 25. GET /qna/modify/:id - QnA 수정
  // ---------------------------------------------------------------------------
  describe('GET /qna/modify/:id', () => {
    test('QnA 수정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/qna/modify/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 26. GET /config - 회원정보 수정 페이지
  // ---------------------------------------------------------------------------
  describe('GET /config', () => {
    test('설정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/config');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 27. POST /config - 회원정보 수정
  // ---------------------------------------------------------------------------
  describe('POST /config', () => {
    test('이메일, 전화번호 업데이트', async () => {
      const res = await agent.post('/cssys/work/prof/config').send({
        email: 'updated@example.com',
        phone: '010-0000-0000',
        password: '',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.User.findByPk(profUser.id);
      expect(updated.email).toBe('updated@example.com');
      expect(updated.phone).toBe('010-0000-0000');
    });

    test('비밀번호 변경', async () => {
      const res = await agent.post('/cssys/work/prof/config').send({
        email: 'prof@test.com',
        phone: '010-1234-5678',
        password: 'newpass999',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.User.findByPk(profUser.id);
      expect(updated.password).toBe(sha256('newpass999'));

      // 원래 비밀번호로 복원 (후속 테스트를 위해)
      await updated.update({ password: sha256('test1234') });
    });

    test('비밀번호 비워두면 비밀번호 변경 없음', async () => {
      const before = await workModels.User.findByPk(profUser.id);
      const originalPassword = before.password;

      const res = await agent.post('/cssys/work/prof/config').send({
        email: 'nopwchange@example.com',
        phone: '010-5555-5555',
        password: '',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const after = await workModels.User.findByPk(profUser.id);
      expect(after.password).toBe(originalPassword);
      expect(after.email).toBe('nopwchange@example.com');
    });
  });
});
