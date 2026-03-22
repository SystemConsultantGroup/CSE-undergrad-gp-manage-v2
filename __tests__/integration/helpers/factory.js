const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

let counter = 0;

function uniqueId(prefix = 'test') {
  return `${prefix}_${++counter}`;
}

function resetCounter() {
  counter = 0;
}

/**
 * 교수 유저 + Prof 레코드 생성
 */
async function createProfUser(models, overrides = {}) {
  const user = await models.User.create({
    ids: uniqueId('prof'),
    password: sha256('test1234'),
    name: '테스트교수',
    email: 'prof@test.com',
    phone: '010-1234-5678',
    type: 1,
    major: 1,
    time: new Date(),
    ip: '127.0.0.1',
    ...overrides,
  });
  const prof = await models.Prof.create({ UserId: user.id });
  return { user, prof };
}

/**
 * 학생 유저 + Student 레코드 생성
 * @param {object} overrides - user 필드 오버라이드. student 키로 Student 모델 오버라이드 가능
 */
async function createStudentUser(models, profId, systemId, overrides = {}) {
  const { student: studentOverrides, ...userOverrides } = overrides;
  const user = await models.User.create({
    ids: uniqueId('student'),
    password: sha256('test1234'),
    name: '테스트학생',
    email: 'student@test.com',
    phone: '010-9876-5432',
    type: 2,
    major: 1,
    time: new Date(),
    ip: '127.0.0.1',
    ...userOverrides,
  });
  const student = await models.Student.create({
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
    UserId: user.id,
    ProfId: profId,
    SystemId: systemId,
    ...studentOverrides,
  });
  return { user, student };
}

/**
 * System 레코드 생성 (현재 활성 상태)
 */
async function createSystem(models, overrides = {}) {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return models.System.create({
    phase: 'Test Phase',
    start,
    end,
    reupload: 0,
    ...overrides,
  });
}

/**
 * 비활성(종료된) System 레코드 생성
 */
async function createExpiredSystem(models, overrides = {}) {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  return models.System.create({
    phase: 'Expired Phase',
    start,
    end,
    reupload: 0,
    ...overrides,
  });
}

/**
 * Permission 레코드 생성
 */
async function createPermission(models, studentId, overrides = {}) {
  return models.Permission.create({
    yearterm: 202601,
    order: 1,
    StudentId: studentId,
    ...overrides,
  });
}

/**
 * StudentFile 레코드 생성
 */
async function createStudentFile(models, userId, overrides = {}) {
  return models.StudentFile.create({
    name: 'test-file.pdf',
    path: 'test-uploads/test-file.pdf',
    type: 'application/pdf',
    size: 1024,
    time: new Date(),
    ip: '127.0.0.1',
    UserId: userId,
    ...overrides,
  });
}

/**
 * StudentInfo 레코드 생성
 */
async function createStudentInfo(models, userId, overrides = {}) {
  return models.StudentInfo.create({
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
    time: new Date(),
    ip: '127.0.0.1',
    UserId: userId,
    ...overrides,
  });
}

/**
 * 전체 12개 시스템 레코드 생성 (main.ejs 템플릿이 systems[0]~[11] 참조)
 * 이미 존재하면 건너뜀
 */
async function createAllSystems(models) {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const phases = [
    '시스템 설정',
    '신청서 제출',
    '1차 교수 배정',
    '1차 교수 선택',
    '2차 교수 배정',
    '2차 교수 선택',
    '3차 교수 배정',
    '3차 교수 선택',
    '서약서/제안서 제출',
    '중간보고서 제출',
    '최종보고서/제본 제출',
    '심사',
  ];
  const systems = [];
  for (let i = 1; i <= 12; i++) {
    const [existing, created] = await models.System.findOrCreate({
      where: { id: i },
      defaults: { phase: phases[i - 1], start, end, reupload: 0 },
    });
    systems.push(existing || created);
  }
  return systems;
}

module.exports = {
  sha256,
  uniqueId,
  resetCounter,
  createProfUser,
  createStudentUser,
  createSystem,
  createExpiredSystem,
  createPermission,
  createStudentFile,
  createStudentInfo,
  createAllSystems,
};
