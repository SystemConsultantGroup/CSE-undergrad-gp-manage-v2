const request = require('supertest');
const {
  sha256,
  createProfUser,
  createStudentUser,
  createSystem,
  createAllSystems,
  createPermission,
  createStudentInfo,
} = require('../../helpers/factory');
const { resetDatabase } = require('../../helpers/db');

describe('Prof Routes Integration', () => {
  let app, workModels, cssysModels;
  let profUser, profRecord;
  let agent;

  beforeAll(async () => {
    workModels = require('../../../../models/cssys_work');
    cssysModels = require('../../../../models/cssys');

    await resetDatabase(workModels.sequelize, cssysModels.sequelize);

    app = require('../../../../app');

    // 교수 유저 생성
    const result = await createProfUser(workModels, { ids: 'integprof' });
    profUser = result.user;
    profRecord = result.prof;

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'integprof', password: 'test1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(1);
  }, 30000);

  // sequelize.close() 하지 않음 — 모듈 캐시로 인해
  // 다음 테스트 파일에서 재연결 불가. forceExit가 정리함.

  // ---------------------------------------------------------------------------
  // 인증
  // ---------------------------------------------------------------------------
  describe('Authentication Guard', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/work/prof/main');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('학생 계정은 교수 페이지 접근 불가', async () => {
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
  });

  // ---------------------------------------------------------------------------
  // GET /
  // ---------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/prof/');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/prof/main');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /main
  // ---------------------------------------------------------------------------
  describe('GET /main', () => {
    test('메인 대시보드 페이지 렌더링 성공', async () => {
      // main.ejs 템플릿이 systems[0]~[11] 참조 → 12개 시스템 필요
      const systems = await createAllSystems(workModels);
      await createStudentUser(workModels, profRecord.id, systems[0].id, {
        ids: 'student_main_1',
      });

      const res = await agent.get('/cssys/work/prof/main');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /student_list/ajax/get_students
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
  // POST /student/:id (메모/코멘트/우수작 업데이트)
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
      const res = await agent.post('/cssys/work/prof/student/99999').send({ note: 'x', comment: 'x', masterpiece: 0 });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('존재하지 않는');
    });

    test('다른 교수의 학생은 업데이트 불가', async () => {
      // 다른 교수 생성
      const { prof: otherProf } = await createProfUser(workModels, {
        ids: 'other_prof_1',
      });
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
  // GET /student/:id/confirm/:state/:value (제출 승인/반려)
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
  // GET /config & POST /config (회원정보 수정)
  // ---------------------------------------------------------------------------
  describe('Config (회원정보)', () => {
    test('GET /config - 설정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/config');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('POST /config - 이메일, 전화번호 업데이트', async () => {
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

    test('POST /config - 비밀번호 변경', async () => {
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
  });

  // ---------------------------------------------------------------------------
  // GET /examine (심사)
  // ---------------------------------------------------------------------------
  describe('GET /examine', () => {
    test('심사 기간 내 - 심사 목록 페이지 렌더링', async () => {
      // System id=12 가 심사 시스템 (createAllSystems 에서 이미 생성됨)
      let system = await workModels.System.findByPk(12);
      if (!system) {
        system = await createSystem(workModels, { id: 12 });
      }
      await createStudentUser(workModels, profRecord.id, system.id, {
        ids: 'student_examine_1',
      });

      const res = await agent.get('/cssys/work/prof/examine');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /examine/:id (심사 결과 입력)
  // ---------------------------------------------------------------------------
  describe('POST /examine/:id', () => {
    test('심사 결과 합격 처리', async () => {
      // id=12 시스템이 이미 존재하면 재사용, 없으면 생성
      let system = await workModels.System.findByPk(12);
      if (!system) {
        system = await createSystem(workModels, { id: 12 });
      }

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
      let system = await workModels.System.findByPk(12);
      if (!system) {
        system = await createSystem(workModels, { id: 12 });
      }

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
  });

  // ---------------------------------------------------------------------------
  // Static page routes (단순 렌더링)
  // ---------------------------------------------------------------------------
  describe('Static page routes', () => {
    test('GET /student_list - 학생 목록 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/student_list');

      expect(res.status).toBe(200);
    });

    test('GET /notice - /notice/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/prof/notice');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/prof/notice/list');
    });

    test('GET /notice/list - 공지사항 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/notice/list');

      expect(res.status).toBe(200);
    });

    test('GET /qna - /qna/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/prof/qna');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/prof/qna/list');
    });

    test('GET /qna/list - QnA 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/prof/qna/list');

      expect(res.status).toBe(200);
    });
  });
});
