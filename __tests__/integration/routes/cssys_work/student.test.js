const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  sha256,
  createProfUser,
  createStudentUser,
  createAllSystems,
  createStudentInfo,
} = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('Student Routes Integration', () => {
  let app, workModels, cssysModels;
  let studentUser, studentRecord, profRecord;
  let agent;

  // Temp files for upload tests
  const tempDir = os.tmpdir();
  const tempFiles = [];

  function createTempFile(name) {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, Buffer.from('%PDF-1.4 test content'));
    tempFiles.push(filePath);
    return filePath;
  }

  beforeAll(async () => {
    workModels = require('../../../../models/cssys_work');
    cssysModels = require('../../../../models/cssys');

    await resetDatabase(workModels.sequelize, cssysModels.sequelize);
    await ensureMinioBucket();

    app = require('../../../../app');

    // 12개 시스템 생성 (main.ejs 템플릿이 systems[0]~[11] 참조)
    await createAllSystems(workModels);

    // 교수 생성
    const profResult = await createProfUser(workModels, {
      ids: 'student_test_prof',
    });
    profRecord = profResult.prof;

    // 학생 생성 (System id=2: 신청서 제출 단계)
    const result = await createStudentUser(workModels, profRecord.id, 2, {
      ids: 'integstudent',
      name: '통합테스트학생',
    });
    studentUser = result.user;
    studentRecord = result.student;

    // UserLog 생성 (GET /main 에서 UserLog 조회에 필요)
    await cssysModels.UserLog.create({
      success: 1,
      ids: 'integstudent',
      password: sha256('test1234'),
      time: new Date(),
      ip: '127.0.0.1',
    });

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'integstudent', password: 'test1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(2);
  }, 30000);

  afterAll(() => {
    // 임시 파일 정리
    tempFiles.forEach((f) => {
      try {
        fs.unlinkSync(f);
      } catch {
        // ignore
      }
    });
  });

  // sequelize.close() 하지 않음 — forceExit가 정리함.

  // ---------------------------------------------------------------------------
  // 1. ALL * - 인증 가드 (type===2)
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
  // 2. GET / - /main 으로 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/main');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GET /main - 학생 대시보드
  // ---------------------------------------------------------------------------
  describe('GET /main', () => {
    test('학생 메인 대시보드 렌더링 성공', async () => {
      const res = await agent.get('/cssys/work/student/main');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. GET /system - 시스템 진행 페이지
  // ---------------------------------------------------------------------------
  describe('GET /system', () => {
    test('활성 시스템 기간 내 재학생 - 해당 phase 템플릿 렌더링', async () => {
      // 학생을 System 3 (1차 교수 배정)으로 이동 — 활성 기간 내
      await workModels.Student.update({ SystemId: 3, status: 0, islock: false }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('잠금된 학생 - system_term_lock 렌더링', async () => {
      await workModels.Student.update({ islock: true }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');

      // 복원
      await workModels.Student.update({ islock: false }, { where: { id: studentRecord.id } });
    });

    test('휴학생 - system_status_1 렌더링', async () => {
      await workModels.Student.update({ status: 1 }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');

      // 복원
      await workModels.Student.update({ status: 0 }, { where: { id: studentRecord.id } });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GET /system/application - 신청서 페이지
  // ---------------------------------------------------------------------------
  describe('GET /system/application', () => {
    test('신청서 페이지 렌더링 (StudentInfo 없을 때 = 작성 페이지)', async () => {
      // System 2 (신청서 제출 단계)로 설정
      await workModels.Student.update({ SystemId: 2, status: 0 }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system/application');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('신청서 보기 페이지 렌더링 (StudentInfo 있고 시스템 >= 6)', async () => {
      // StudentInfo 생성
      const info = await createStudentInfo(workModels, studentUser.id);
      await workModels.Student.update({ SystemId: 6, StudentInfoId: info.id }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system/application');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('신청서 수정 페이지 렌더링 (StudentInfo 있고 시스템 3~5)', async () => {
      await workModels.Student.update({ SystemId: 4 }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system/application');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    test('휴학생 - system_status_1 렌더링', async () => {
      await workModels.Student.update({ status: 1 }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system/application');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');

      // 복원
      await workModels.Student.update({ status: 0 }, { where: { id: studentRecord.id } });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. POST /system/proc/application - 신청서 제출/수정
  // ---------------------------------------------------------------------------
  describe('POST /system/proc/application', () => {
    test('신청서 최초 제출 성공', async () => {
      // StudentInfo 제거 (최초 제출 테스트)
      await workModels.Student.update({ SystemId: 2, StudentInfoId: null }, { where: { id: studentRecord.id } });
      await workModels.StudentInfo.destroy({ where: { UserId: studentUser.id } });

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
  // 7. ALL /system/ajax/permission - 교수 목록 조회 (JSON)
  // ---------------------------------------------------------------------------
  describe('ALL /system/ajax/permission', () => {
    test('교수 목록 및 선택 가능 수 반환', async () => {
      // 교수 선택 단계로 설정 (System 3)
      await workModels.Student.update({ SystemId: 3 }, { where: { id: studentRecord.id } });

      const res = await agent.get('/cssys/work/student/system/ajax/permission');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // 각 교수 항목에 필수 필드 존재 확인
      const profItem = res.body.data[0];
      expect(profItem).toHaveProperty('id');
      expect(profItem).toHaveProperty('name');
      expect(profItem).toHaveProperty('selectable');
    });

    test('POST 방식으로도 접근 가능', async () => {
      const res = await agent.post('/cssys/work/student/system/ajax/permission').send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. POST /system/proc/permission - 희망 교수 선택 제출
  // ---------------------------------------------------------------------------
  describe('POST /system/proc/permission', () => {
    test('희망 교수 선택 성공 (System 3, 활성 기간)', async () => {
      await workModels.Student.update({ SystemId: 3 }, { where: { id: studentRecord.id } });

      const res = await agent.post('/cssys/work/student/system/proc/permission').send({
        firstProfId: profRecord.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // Permission 레코드 확인
      const permission = await workModels.Permission.findOne({
        where: { StudentId: studentRecord.id },
      });
      expect(permission).not.toBeNull();
      expect(permission.firstProfId).toBe(profRecord.id);
    });

    test('희망 교수 선택 수정 (기존 레코드 업데이트)', async () => {
      // 다른 교수 생성
      const { prof: otherProf } = await createProfUser(workModels, {
        ids: 'other_prof_perm',
      });

      const res = await agent.post('/cssys/work/student/system/proc/permission').send({
        firstProfId: otherProf.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const permission = await workModels.Permission.findOne({
        where: { StudentId: studentRecord.id },
      });
      expect(permission.firstProfId).toBe(otherProf.id);
    });

    test('교수 선택 기간이 아닌 경우 실패 (System 2)', async () => {
      await workModels.Student.update({ SystemId: 2 }, { where: { id: studentRecord.id } });

      const res = await agent.post('/cssys/work/student/system/proc/permission').send({
        firstProfId: profRecord.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('희망교수 선택 기간이 아니거나');
    });

    test('firstProfId 없이 전송 시 실패', async () => {
      await workModels.Student.update({ SystemId: 3 }, { where: { id: studentRecord.id } });

      const res = await agent.post('/cssys/work/student/system/proc/permission').send({});

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
    });

    test('System 5에서도 교수 선택 가능', async () => {
      await workModels.Student.update({ SystemId: 5 }, { where: { id: studentRecord.id } });

      const res = await agent.post('/cssys/work/student/system/proc/permission').send({
        firstProfId: profRecord.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });

    test('System 7에서도 교수 선택 가능', async () => {
      await workModels.Student.update({ SystemId: 7 }, { where: { id: studentRecord.id } });

      const res = await agent.post('/cssys/work/student/system/proc/permission').send({
        firstProfId: profRecord.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. POST /system/proc/oath_proposal - 서약서 및 제안서 업로드
  // ---------------------------------------------------------------------------
  describe('POST /system/proc/oath_proposal', () => {
    test('서약서 및 제안서 업로드 성공 (System 9)', async () => {
      // System 9로 이동
      await workModels.Student.update({ SystemId: 9 }, { where: { id: studentRecord.id } });

      const oathPath = createTempFile('test-oath.pdf');
      const proposalPath = createTempFile('test-proposal.pdf');

      const res = await agent
        .post('/cssys/work/student/system/proc/oath_proposal')
        .field('title', '테스트 작품')
        .field('iswork', '1')
        .field('isgroup', '0')
        .attach('oath', oathPath)
        .attach('proposal', proposalPath);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에 파일 레코드 확인
      const student = await workModels.Student.findOne({
        where: { id: studentRecord.id },
        include: [
          { model: workModels.StudentFile, as: 'oath' },
          { model: workModels.StudentFile, as: 'proposal' },
        ],
      });
      expect(student.oath).not.toBeNull();
      expect(student.proposal).not.toBeNull();
      expect(student.title).toBe('테스트 작품');
    });

    test('제출 기간이 아닌 경우 실패 (System 2)', async () => {
      await workModels.Student.update({ SystemId: 2 }, { where: { id: studentRecord.id } });

      const oathPath = createTempFile('test-oath-fail.pdf');

      const res = await agent
        .post('/cssys/work/student/system/proc/oath_proposal')
        .field('title', '실패 테스트')
        .field('iswork', '1')
        .field('isgroup', '0')
        .attach('oath', oathPath);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('서약서 및 제안서 제출 기간이 아니거나');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. POST /system/proc/midreport - 중간보고서 업로드
  // ---------------------------------------------------------------------------
  describe('POST /system/proc/midreport', () => {
    test('중간보고서 업로드 성공 (System 10)', async () => {
      await workModels.Student.update({ SystemId: 10 }, { where: { id: studentRecord.id } });

      const midreportPath = createTempFile('test-midreport.pdf');

      const res = await agent.post('/cssys/work/student/system/proc/midreport').attach('midreport', midreportPath);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에 파일 레코드 확인
      const student = await workModels.Student.findOne({
        where: { id: studentRecord.id },
        include: [{ model: workModels.StudentFile, as: 'midreport' }],
      });
      expect(student.midreport).not.toBeNull();
    });

    test('파일 없이 전송 시 실패', async () => {
      await workModels.Student.update({ SystemId: 10 }, { where: { id: studentRecord.id } });

      // .field()로 multipart 요청 트리거 — 없으면 multer가 req.files를 설정 안 함
      const res = await agent.post('/cssys/work/student/system/proc/midreport').field('dummy', '');

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('파일이 업로드되지 않았습니다');
    });

    test('제출 기간이 아닌 경우 실패 (System 2)', async () => {
      await workModels.Student.update({ SystemId: 2 }, { where: { id: studentRecord.id } });

      const midreportPath = createTempFile('test-midreport-fail.pdf');

      const res = await agent.post('/cssys/work/student/system/proc/midreport').attach('midreport', midreportPath);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('신청서 제출 기간이 아니거나');
    });
  });

  // ---------------------------------------------------------------------------
  // 11. POST /system/proc/final_etc - 최종보고서/논문/발표자료/학회 업로드
  // ---------------------------------------------------------------------------
  describe('POST /system/proc/final_etc', () => {
    test('최종보고서 등 업로드 성공 (System 11)', async () => {
      await workModels.Student.update({ SystemId: 11 }, { where: { id: studentRecord.id } });

      const finalPath = createTempFile('test-final.pdf');
      const paperworkPath = createTempFile('test-paperwork.pdf');
      const presentationPath = createTempFile('test-presentation.pdf');
      const conferencePath = createTempFile('test-conference.pdf');

      const res = await agent
        .post('/cssys/work/student/system/proc/final_etc')
        .field('title', '최종 작품')
        .field('iswork', '1')
        .field('isgroup', '0')
        .attach('finalreport', finalPath)
        .attach('paperwork', paperworkPath)
        .attach('presentation', presentationPath)
        .attach('conference', conferencePath);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에 파일 레코드 확인
      const student = await workModels.Student.findOne({
        where: { id: studentRecord.id },
        include: [
          { model: workModels.StudentFile, as: 'finalreport' },
          { model: workModels.StudentFile, as: 'paperwork' },
          { model: workModels.StudentFile, as: 'presentation' },
          { model: workModels.StudentFile, as: 'conference' },
        ],
      });
      expect(student.finalreport).not.toBeNull();
      expect(student.paperwork).not.toBeNull();
      expect(student.presentation).not.toBeNull();
      expect(student.conference).not.toBeNull();
      expect(student.title).toBe('최종 작품');
    });

    test('제출 기간이 아닌 경우 실패 (System 2)', async () => {
      await workModels.Student.update({ SystemId: 2 }, { where: { id: studentRecord.id } });

      const finalPath = createTempFile('test-final-fail.pdf');

      const res = await agent
        .post('/cssys/work/student/system/proc/final_etc')
        .field('title', '실패 테스트')
        .field('iswork', '1')
        .field('isgroup', '0')
        .attach('finalreport', finalPath);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(false);
      expect(res.body.text).toContain('최종보고서 및 논문/작품, 발표자료 제출 기간이 아니거나');
    });
  });

  // ---------------------------------------------------------------------------
  // 12. GET /config - 설정 페이지
  // ---------------------------------------------------------------------------
  describe('GET /config', () => {
    test('설정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/config');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 13. POST /config - 회원정보 수정
  // ---------------------------------------------------------------------------
  describe('POST /config', () => {
    test('이메일, 전화번호 업데이트', async () => {
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

    test('비밀번호 변경', async () => {
      const res = await agent.post('/cssys/work/student/config').send({
        email: 'student@test.com',
        phone: '010-9876-5432',
        password: 'newstudentpass',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      const updated = await workModels.User.findByPk(studentUser.id);
      expect(updated.password).toBe(sha256('newstudentpass'));

      // 복원 (후속 테스트를 위해)
      await updated.update({ password: sha256('test1234') });
    });
  });

  // ---------------------------------------------------------------------------
  // 14. GET /notice - /notice/list 로 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /notice', () => {
    test('/notice/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/notice');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/notice/list');
    });
  });

  // ---------------------------------------------------------------------------
  // 15. GET /notice/list - 공지사항 목록 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /notice/list', () => {
    test('공지사항 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/notice/list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 16. GET /notice/view/:id - 공지사항 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /notice/view/:id', () => {
    test('공지사항 상세 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/notice/view/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 17. GET /example - /example/list 로 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /example', () => {
    test('/example/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/example');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/example/list');
    });
  });

  // ---------------------------------------------------------------------------
  // 18. GET /example/list - 예시 목록 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /example/list', () => {
    test('예시 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/example/list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 19. GET /example/view/:id - 예시 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /example/view/:id', () => {
    test('예시 상세 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/example/view/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 20. GET /qna - /qna/list 로 리다이렉트
  // ---------------------------------------------------------------------------
  describe('GET /qna', () => {
    test('/qna/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/work/student/qna');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/work/student/qna/list');
    });
  });

  // ---------------------------------------------------------------------------
  // 21. GET /qna/list - QnA 목록 렌더링
  // ---------------------------------------------------------------------------
  describe('GET /qna/list', () => {
    test('QnA 목록 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/qna/list');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 22. GET /qna/write - QnA 작성 페이지
  // ---------------------------------------------------------------------------
  describe('GET /qna/write', () => {
    test('QnA 작성 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/qna/write');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 23. GET /qna/view/:id - QnA 상세 보기
  // ---------------------------------------------------------------------------
  describe('GET /qna/view/:id', () => {
    test('QnA 상세 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/qna/view/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 24. GET /qna/reply/:id - QnA 답글 페이지
  // ---------------------------------------------------------------------------
  describe('GET /qna/reply/:id', () => {
    test('QnA 답글 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/qna/reply/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // ---------------------------------------------------------------------------
  // 25. GET /qna/modify/:id - QnA 수정 페이지
  // ---------------------------------------------------------------------------
  describe('GET /qna/modify/:id', () => {
    test('QnA 수정 페이지 렌더링', async () => {
      const res = await agent.get('/cssys/work/student/qna/modify/1');

      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });
});
