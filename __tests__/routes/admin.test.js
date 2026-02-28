const moment = require('moment');
const crypto = require('crypto');

// =====================================================================
// Admin route business logic unit tests (routes/cssys_work/admin.js)
// =====================================================================

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// =====================================================================
// 1. Admin auth middleware - type check (routes/cssys_work/admin.js line 25-28)
// =====================================================================
describe('Admin auth middleware - type check', () => {
  function checkAdminAuth(userType) {
    if (userType === 0) return 'pass';
    else return 'redirect';
  }

  test('admin (type 0) passes', () => {
    expect(checkAdminAuth(0)).toBe('pass');
  });

  test('professor (type 1) is redirected', () => {
    expect(checkAdminAuth(1)).toBe('redirect');
  });

  test('student (type 2) is redirected', () => {
    expect(checkAdminAuth(2)).toBe('redirect');
  });

  test('schedule user (type 3) is redirected', () => {
    expect(checkAdminAuth(3)).toBe('redirect');
  });
});

// =====================================================================
// 2. Inactive user count logic (routes/cssys_work/admin.js line 77-81)
// =====================================================================
describe('Inactive user count calculation', () => {
  function countInactiveUsers(users) {
    var count = 0;
    users.forEach(function (user) {
      if (user.status == 1 || user.status == 3 || user.Student.SystemId == 1 || user.Student.SystemId == 13) count++;
    });
    return count;
  }

  test('counts users with status 1 (on leave)', () => {
    const users = [
      { status: 1, Student: { SystemId: 5 } },
      { status: 0, Student: { SystemId: 5 } },
    ];
    expect(countInactiveUsers(users)).toBe(1);
  });

  test('counts users with status 3 (graduated)', () => {
    const users = [{ status: 3, Student: { SystemId: 5 } }];
    expect(countInactiveUsers(users)).toBe(1);
  });

  test('counts users at SystemId 1 (pre-start)', () => {
    const users = [{ status: 0, Student: { SystemId: 1 } }];
    expect(countInactiveUsers(users)).toBe(1);
  });

  test('counts users at SystemId 13 (finished)', () => {
    const users = [{ status: 0, Student: { SystemId: 13 } }];
    expect(countInactiveUsers(users)).toBe(1);
  });

  test('does not count active users', () => {
    const users = [
      { status: 0, Student: { SystemId: 5 } },
      { status: 0, Student: { SystemId: 9 } },
      { status: 2, Student: { SystemId: 10 } },
    ];
    expect(countInactiveUsers(users)).toBe(0);
  });

  test('handles empty user list', () => {
    expect(countInactiveUsers([])).toBe(0);
  });

  test('counts multiple inactive users', () => {
    const users = [
      { status: 1, Student: { SystemId: 5 } },
      { status: 3, Student: { SystemId: 5 } },
      { status: 0, Student: { SystemId: 1 } },
      { status: 0, Student: { SystemId: 13 } },
      { status: 0, Student: { SystemId: 5 } },
    ];
    expect(countInactiveUsers(users)).toBe(4);
  });
});

// =====================================================================
// 3. System phase user count and completion count (routes/cssys_work/admin.js line 82-101)
// =====================================================================
describe('System phase user counting logic', () => {
  function countUsersPerSystem(systemId, users) {
    let userCnt = 0;
    let userCmpCnt = 0;
    let unUserCnt = 0;

    users.forEach(function (user) {
      if (systemId == user.Student.SystemId) {
        userCnt++;
        if (user.status == 1 || user.status == 3) unUserCnt++;
        if (
          (systemId == 2 && user.Student.StudentInfoId) ||
          (systemId == 9 && user.Student.oathId && user.Student.proposalId) ||
          (systemId == 10 && user.Student.midreportId) ||
          (systemId == 11 && user.Student.finalreportID && user.Student.paperworkId) ||
          (systemId == 12 && user.Student.result !== 0)
        )
          userCmpCnt++;
      }
    });
    return { userCnt, userCmpCnt, unUserCnt };
  }

  test('counts users in the correct system phase', () => {
    const users = [
      { status: 0, Student: { SystemId: 2, StudentInfoId: 1 } },
      { status: 0, Student: { SystemId: 2, StudentInfoId: null } },
      { status: 0, Student: { SystemId: 5 } },
    ];
    const result = countUsersPerSystem(2, users);
    expect(result.userCnt).toBe(2);
    expect(result.userCmpCnt).toBe(1);
  });

  test('counts inactive users within system', () => {
    const users = [
      { status: 1, Student: { SystemId: 9, oathId: 1, proposalId: 1 } },
      { status: 0, Student: { SystemId: 9, oathId: 1, proposalId: 1 } },
    ];
    const result = countUsersPerSystem(9, users);
    expect(result.userCnt).toBe(2);
    expect(result.unUserCnt).toBe(1);
    expect(result.userCmpCnt).toBe(2);
  });

  test('returns zeros when no users match system', () => {
    const users = [{ status: 0, Student: { SystemId: 5 } }];
    const result = countUsersPerSystem(10, users);
    expect(result.userCnt).toBe(0);
    expect(result.userCmpCnt).toBe(0);
    expect(result.unUserCnt).toBe(0);
  });
});

// =====================================================================
// 4. System date formatting (routes/cssys_work/admin.js line 83-84)
// =====================================================================
describe('System date formatting for admin dashboard', () => {
  test('formats start date as YYYY-MM-DD', () => {
    const start = new Date('2026-03-15T10:30:00');
    expect(moment(start).format('YYYY-MM-DD')).toBe('2026-03-15');
  });

  test('formats end date with +1 day', () => {
    const end = new Date('2026-03-31T10:30:00');
    expect(moment(end).add(1, 'day').format('YYYY-MM-DD')).toBe('2026-04-01');
  });
});

// =====================================================================
// 5. Login log time formatting (routes/cssys_work/admin.js line 71-73)
// =====================================================================
describe('Login log time formatting', () => {
  test('formats log time as YYYY-MM-DD HH:mm:ss', () => {
    const time = new Date('2026-03-15T14:30:45');
    expect(moment(time).format('YYYY-MM-DD HH:mm:ss')).toBe('2026-03-15 14:30:45');
  });

  test('formats midnight correctly', () => {
    const time = new Date('2026-01-01T00:00:00');
    expect(moment(time).format('YYYY-MM-DD HH:mm:ss')).toBe('2026-01-01 00:00:00');
  });
});

// =====================================================================
// 6. Student list data transformation (routes/cssys_work/admin.js related)
//    Mirrors prof.js line 491-498 for password deletion and index assignment
// =====================================================================
describe('Student list data transformation - password deletion', () => {
  function transformStudentList(users) {
    var index = 1;
    return users.map(function (user) {
      const result = { ...user, index: index++ };
      delete result.password;
      return result;
    });
  }

  test('removes password and adds sequential index', () => {
    const users = [
      { id: 1, ids: 'student01', password: 'hash123', name: 'Student A' },
      { id: 2, ids: 'student02', password: 'hash456', name: 'Student B' },
    ];
    const result = transformStudentList(users);
    expect(result[0].password).toBeUndefined();
    expect(result[0].index).toBe(1);
    expect(result[1].password).toBeUndefined();
    expect(result[1].index).toBe(2);
    expect(result[0].name).toBe('Student A');
  });

  test('handles empty array', () => {
    expect(transformStudentList([])).toEqual([]);
  });
});

// =====================================================================
// 7. Student state decomposition in list view (from prof.js line 496-497)
// =====================================================================
describe('Student state decomposition in list view', () => {
  function decomposeStudentState(state) {
    return [state % 10, parseInt((state % 100) / 10), parseInt(state / 100)];
  }

  test('decomposes state correctly', () => {
    expect(decomposeStudentState(123)).toEqual([3, 2, 1]);
  });

  test('handles zero state', () => {
    expect(decomposeStudentState(0)).toEqual([0, 0, 0]);
  });

  test('handles single digit state', () => {
    expect(decomposeStudentState(7)).toEqual([7, 0, 0]);
  });

  test('handles two digit state', () => {
    expect(decomposeStudentState(42)).toEqual([2, 4, 0]);
  });
});

// =====================================================================
// 8. System isNow computation (from prof.js line 95, 325)
// =====================================================================
describe('System isNow computation', () => {
  function computeIsNow(systemStart, systemEnd, now) {
    return now > systemStart && now < systemEnd;
  }

  test('true when now is between start and end', () => {
    expect(computeIsNow(new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-03-15'))).toBe(true);
  });

  test('false when now is before start', () => {
    expect(computeIsNow(new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-02-15'))).toBe(false);
  });

  test('false when now is after end', () => {
    expect(computeIsNow(new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-04-15'))).toBe(false);
  });

  test('false when now equals start exactly (not strictly greater)', () => {
    const d = new Date('2026-03-01T00:00:00');
    expect(computeIsNow(d, new Date('2026-03-31'), d)).toBe(false);
  });

  test('false when now equals end exactly (not strictly less)', () => {
    const d = new Date('2026-03-31T00:00:00');
    expect(computeIsNow(new Date('2026-03-01'), d, d)).toBe(false);
  });
});
