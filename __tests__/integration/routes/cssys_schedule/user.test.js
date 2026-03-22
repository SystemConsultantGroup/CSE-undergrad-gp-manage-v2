const request = require('supertest');
const { sha256 } = require('../../helpers/factory');
const { resetDatabase, ensureMinioBucket } = require('../../helpers/db');

describe('CSSYS Schedule User Routes Integration', () => {
  let app, workModels, cssysModels, scheduleModels, guidanceModels;
  let schedUser, calendar, share, post;
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

    // type=3 일정 유저 생성
    schedUser = await scheduleModels.User.create({
      ids: 'scheduser',
      password: sha256('test1234'),
      name: '일정유저',
      email: 'sched@test.com',
      phone: '010-0000-0000',
      type: 3,
      major: 1,
      time: new Date(),
      ip: '127.0.0.1',
    });

    // 캘린더 생성
    calendar = await scheduleModels.Calendar.create({
      title: '테스트 캘린더',
      bgcolor: '#ff0000',
      fontcolor: '#ffffff',
      time: new Date(),
      ip: '127.0.0.1',
      UserId: schedUser.id,
    });

    // 공유 생성
    share = await scheduleModels.Share.create({
      display: true,
      CalendarId: calendar.id,
      UserId: schedUser.id,
      time: new Date(),
      ip: '127.0.0.1',
    });

    // 이벤트(Post) 생성
    post = await scheduleModels.Post.create({
      title: '테스트 일정',
      text: '일정 내용',
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      time: new Date(),
      ip: '127.0.0.1',
      CalendarId: calendar.id,
      UserId: schedUser.id,
      ShareId: share.id,
    });

    // 로그인
    agent = request.agent(app);
    const loginRes = await agent.post('/cssys/login').send({ ids: 'scheduser', password: 'test1234' });

    expect(loginRes.body.result).toBe(true);
    expect(loginRes.body.type).toBe(3);
  }, 30000);

  // -------------------------------------------------------------------------
  // 1. ALL * - 인증 가드 (type===3)
  // -------------------------------------------------------------------------
  describe('Authentication Guard', () => {
    test('비인증 요청은 로그인 페이지로 리다이렉트', async () => {
      const res = await request(app).get('/cssys/schedule/user/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });

    test('type=0 관리자는 유저 페이지 접근 불가', async () => {
      await cssysModels.User.create({
        ids: 'sched_user_guard_admin',
        password: sha256('admin1234'),
        name: '관리자',
        email: 'admin@test.com',
        phone: '010-1111-1111',
        type: 0,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });

      const adminAgent = request.agent(app);
      await adminAgent.post('/cssys/login').send({ ids: 'sched_user_guard_admin', password: 'admin1234' });

      const res = await adminAgent.get('/cssys/schedule/user/main');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/login');
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET / - /main 으로 리다이렉트
  // -------------------------------------------------------------------------
  describe('GET /', () => {
    test('/main 으로 리다이렉트', async () => {
      const res = await agent.get('/cssys/schedule/user/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/schedule/user/main');
    });
  });

  // -------------------------------------------------------------------------
  // 3. GET /main - 캘린더 메인 페이지 렌더링
  // -------------------------------------------------------------------------
  describe('GET /main', () => {
    test('캘린더 메인 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/main');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 4. POST /main - 이벤트 생성
  // -------------------------------------------------------------------------
  describe('POST /main', () => {
    test('이벤트 생성 성공', async () => {
      const res = await agent.post('/cssys/schedule/user/main').send({
        ShareId: share.id,
        title: '새 일정',
        start: '2026-04-01',
        end: '2026-04-02',
        allday: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });

    test('존재하지 않는 Share로 이벤트 생성 시 404', async () => {
      const res = await agent.post('/cssys/schedule/user/main').send({
        ShareId: 99999,
        title: '실패 일정',
        start: '2026-04-01',
        end: '2026-04-02',
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 5. ALL /main/ajax/get_events - 이벤트 목록 JSON
  // -------------------------------------------------------------------------
  describe('ALL /main/ajax/get_events', () => {
    test('이벤트 목록 JSON 반환', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/get_events').send({});

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('display=true인 캘린더의 이벤트만 반환', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/get_events').send({});

      expect(res.status).toBe(200);
      // 기본 share.display=true이므로 이벤트가 있어야 함
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. ALL /main/ajax/get_calendar - 캘린더 공유 정보 JSON
  // -------------------------------------------------------------------------
  describe('ALL /main/ajax/get_calendar', () => {
    test('캘린더 공유 정보 반환', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/get_calendar').send({ id: share.id });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(share.id);
    });

    test('존재하지 않는 공유 ID는 404', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/get_calendar').send({ id: 99999 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 7. ALL /main/ajax/get_event - 단일 이벤트 JSON
  // -------------------------------------------------------------------------
  describe('ALL /main/ajax/get_event', () => {
    test('단일 이벤트 조회 성공', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/get_event').send({ id: post.id });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(post.id);
      expect(res.body.title).toBe('테스트 일정');
    });

    test('존재하지 않는 이벤트 조회 시 404', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/get_event').send({ id: 99999 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 8. ALL /main/ajax/set_event - 이벤트 수정
  // -------------------------------------------------------------------------
  describe('ALL /main/ajax/set_event', () => {
    test('이벤트 수정 성공', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/set_event').send({
        id: post.id,
        title: '수정된 일정',
        start: '2026-05-01',
        end: '2026-05-02',
        ShareId: share.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 수정 확인
      const updated = await scheduleModels.Post.findByPk(post.id);
      expect(updated.title).toBe('수정된 일정');
    });

    test('존재하지 않는 이벤트 수정 시 404', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/set_event').send({
        id: 99999,
        title: '수정 시도',
        start: '2026-05-01',
        end: '2026-05-02',
        ShareId: share.id,
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 9. ALL /main/ajax/del_event - 이벤트 삭제
  // -------------------------------------------------------------------------
  describe('ALL /main/ajax/del_event', () => {
    test('이벤트 삭제 성공', async () => {
      // 삭제용 이벤트 생성
      const delPost = await scheduleModels.Post.create({
        title: '삭제할 일정',
        text: '',
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        time: new Date(),
        ip: '127.0.0.1',
        CalendarId: calendar.id,
        UserId: schedUser.id,
        ShareId: share.id,
      });

      const res = await agent.post('/cssys/schedule/user/main/ajax/del_event').send({ id: delPost.id });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 삭제 확인
      const deleted = await scheduleModels.Post.findByPk(delPost.id);
      expect(deleted).toBeNull();
    });

    test('존재하지 않는 이벤트 삭제 시 404', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/del_event').send({ id: 99999 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 10. ALL /main/ajax/set_share - 공유 설정 수정
  // -------------------------------------------------------------------------
  describe('ALL /main/ajax/set_share', () => {
    test('공유 설정 수정 성공 (display 변경)', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/set_share').send({ id: share.id, display: false });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 확인
      const updatedShare = await scheduleModels.Share.findByPk(share.id);
      expect(updatedShare.display).toBe(false);

      // 원복
      await updatedShare.update({ display: true });
    });

    test('존재하지 않는 공유 설정 수정 시 404', async () => {
      const res = await agent.post('/cssys/schedule/user/main/ajax/set_share').send({ id: 99999, display: true });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 11. GET /popup - 팝업 페이지 렌더링
  // -------------------------------------------------------------------------
  describe('GET /popup', () => {
    test('팝업 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/popup');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 12. GET /calendar - 캘린더 관리 페이지 렌더링
  // -------------------------------------------------------------------------
  describe('GET /calendar', () => {
    test('캘린더 관리 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/calendar');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 13. POST /calendar - 캘린더 생성 및 수정
  // -------------------------------------------------------------------------
  describe('POST /calendar', () => {
    test('새 캘린더 생성 성공', async () => {
      const res = await agent.post('/cssys/schedule/user/calendar').send({
        title: '새 캘린더',
        color: '#00ff00',
        bgcolor: '#00ff00',
        fontcolor: '#000000',
        time: new Date(),
        ip: '127.0.0.1',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });

    test('기존 캘린더 수정 성공 (소유자)', async () => {
      const res = await agent.post('/cssys/schedule/user/calendar').send({
        id: share.id,
        title: '수정된 캘린더',
        color: '#0000ff',
        bgcolor: '#0000ff',
        fontcolor: '#ffffff',
        time: new Date(),
        ip: '127.0.0.1',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 14. POST /calendar/ajax/get_calendar - 캘린더 데이터 JSON
  // -------------------------------------------------------------------------
  describe('POST /calendar/ajax/get_calendar', () => {
    test('캘린더 데이터 조회 성공', async () => {
      const res = await agent.post('/cssys/schedule/user/calendar/ajax/get_calendar').send({ id: share.id });

      expect(res.status).toBe(200);
      expect(res.body.share).toBeDefined();
      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    test('존재하지 않는 캘린더 조회 시 404', async () => {
      const res = await agent.post('/cssys/schedule/user/calendar/ajax/get_calendar').send({ id: 99999 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------------------------------
  // 15. POST /calendar/ajax/del_calendar - 캘린더 삭제
  // -------------------------------------------------------------------------
  describe('POST /calendar/ajax/del_calendar', () => {
    test('소유자가 캘린더 삭제 성공', async () => {
      // 삭제용 캘린더 생성
      const delCalendar = await scheduleModels.Calendar.create({
        title: '삭제용 캘린더',
        bgcolor: '#ff0000',
        fontcolor: '#ffffff',
        time: new Date(),
        ip: '127.0.0.1',
        UserId: schedUser.id,
      });

      const delShare = await scheduleModels.Share.create({
        display: true,
        CalendarId: delCalendar.id,
        UserId: schedUser.id,
        time: new Date(),
        ip: '127.0.0.1',
      });

      const res = await agent.post('/cssys/schedule/user/calendar/ajax/del_calendar').send({ id: delShare.id });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 삭제 확인
      const deletedCal = await scheduleModels.Calendar.findByPk(delCalendar.id);
      expect(deletedCal).toBeNull();
    });

    test('존재하지 않는 캘린더 삭제 시 404', async () => {
      const res = await agent.post('/cssys/schedule/user/calendar/ajax/del_calendar').send({ id: 99999 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('소유자가 아닌 유저가 캘린더 삭제 시 404', async () => {
      // 다른 유저 생성
      const otherUser = await scheduleModels.User.create({
        ids: 'other_sched_user',
        password: sha256('test1234'),
        name: '다른유저',
        email: 'other@test.com',
        phone: '010-9999-9999',
        type: 3,
        major: 1,
        time: new Date(),
        ip: '127.0.0.1',
      });

      // 다른 유저 소유 캘린더 생성
      const otherCalendar = await scheduleModels.Calendar.create({
        title: '다른유저 캘린더',
        bgcolor: '#ff0000',
        fontcolor: '#ffffff',
        time: new Date(),
        ip: '127.0.0.1',
        UserId: otherUser.id,
      });

      // 현재 유저에 공유
      const sharedShare = await scheduleModels.Share.create({
        display: true,
        CalendarId: otherCalendar.id,
        UserId: schedUser.id,
        time: new Date(),
        ip: '127.0.0.1',
      });

      // 소유자가 아닌 현재 유저가 삭제 시도
      const res = await agent.post('/cssys/schedule/user/calendar/ajax/del_calendar').send({ id: sharedShare.id });

      expect(res.status).toBeGreaterThanOrEqual(400);

      // 캘린더가 남아있는지 확인
      const stillExists = await scheduleModels.Calendar.findByPk(otherCalendar.id);
      expect(stillExists).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 16. GET /config - 설정 페이지 렌더링
  // -------------------------------------------------------------------------
  describe('GET /config', () => {
    test('설정 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/config');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 17. POST /config - 회원정보 수정
  // -------------------------------------------------------------------------
  describe('POST /config', () => {
    test('이메일, 전화번호 수정 성공', async () => {
      const res = await agent.post('/cssys/schedule/user/config').send({
        email: 'newemail@test.com',
        phone: '010-8888-8888',
        password: '',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 수정 확인
      const updated = await scheduleModels.User.findByPk(schedUser.id);
      expect(updated.email).toBe('newemail@test.com');
      expect(updated.phone).toBe('010-8888-8888');
    });

    test('비밀번호 변경 성공', async () => {
      const res = await agent.post('/cssys/schedule/user/config').send({
        email: 'newemail@test.com',
        phone: '010-8888-8888',
        password: 'newpass1234',
      });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe(true);

      // DB에서 비밀번호 변경 확인
      const updated = await scheduleModels.User.findByPk(schedUser.id);
      expect(updated.password).toBe(sha256('newpass1234'));

      // 비밀번호 원복 (이후 테스트를 위해)
      await updated.update({ password: sha256('test1234') });
    });

    test('비밀번호를 빈 문자열로 보내면 비밀번호 미변경', async () => {
      const beforeUser = await scheduleModels.User.findByPk(schedUser.id);
      const oldPassword = beforeUser.password;

      await agent.post('/cssys/schedule/user/config').send({
        email: 'newemail@test.com',
        phone: '010-8888-8888',
        password: '',
      });

      const afterUser = await scheduleModels.User.findByPk(schedUser.id);
      expect(afterUser.password).toBe(oldPassword);
    });
  });

  // -------------------------------------------------------------------------
  // 18. GET /board - /board/list 로 리다이렉트
  // -------------------------------------------------------------------------
  describe('GET /board', () => {
    test('/board/list 로 리다이렉트', async () => {
      const res = await agent.get('/cssys/schedule/user/board');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/cssys/schedule/user/board/list');
    });
  });

  // -------------------------------------------------------------------------
  // 19. GET /board/list - 게시판 목록 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/list', () => {
    test('게시판 목록 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/board/list');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 20. GET /board/write - 게시판 글쓰기 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/write', () => {
    test('게시판 글쓰기 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/board/write');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 21. GET /board/view/:id - 게시판 글 보기 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/view/:id', () => {
    test('게시판 글 보기 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/board/view/1');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 22. GET /board/reply/:id - 게시판 답변 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/reply/:id', () => {
    test('게시판 답변 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/board/reply/1');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });

  // -------------------------------------------------------------------------
  // 23. GET /board/modify/:id - 게시판 수정 렌더링
  // -------------------------------------------------------------------------
  describe('GET /board/modify/:id', () => {
    test('게시판 수정 페이지 렌더링 성공', async () => {
      const res = await agent.get('/cssys/schedule/user/board/modify/1');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });
});
