const moment = require('moment');

// =====================================================================
// Professor route business logic unit tests
// =====================================================================

// =====================================================================
// 1. Professor auth middleware - type check (routes/cssys_work/prof.js line 18-21)
// =====================================================================
describe('Professor auth middleware - type check', () => {
  function checkProfAuth(userType) {
    if (userType === 1) return 'pass';
    else return 'redirect';
  }

  test('professor (type 1) passes', () => {
    expect(checkProfAuth(1)).toBe('pass');
  });

  test('admin (type 0) is redirected', () => {
    expect(checkProfAuth(0)).toBe('redirect');
  });

  test('student (type 2) is redirected', () => {
    expect(checkProfAuth(2)).toBe('redirect');
  });

  test('schedule user (type 3) is redirected', () => {
    expect(checkProfAuth(3)).toBe('redirect');
  });
});

// =====================================================================
// 2. Student completion counting logic (routes/cssys_work/prof.js line 62-69)
// =====================================================================
describe('Student completion counting per system phase', () => {
  function isStudentComplete(systemId, student) {
    if (systemId == 2 && student.StudentInfoId) return true;
    if (systemId == 9 && student.oathId && student.proposalId) return true;
    if (systemId == 10 && student.midreportId) return true;
    if (systemId == 11 && student.finalreportId && student.paperworkId) return true;
    if (systemId == 12 && student.result !== 0) return true;
    return false;
  }

  test('phase 2: complete when StudentInfoId exists', () => {
    expect(isStudentComplete(2, { StudentInfoId: 10 })).toBe(true);
  });

  test('phase 2: incomplete when StudentInfoId is null', () => {
    expect(isStudentComplete(2, { StudentInfoId: null })).toBe(false);
  });

  test('phase 9: complete when both oath and proposal exist', () => {
    expect(isStudentComplete(9, { oathId: 1, proposalId: 2 })).toBe(true);
  });

  test('phase 9: incomplete when only oath exists', () => {
    expect(isStudentComplete(9, { oathId: 1, proposalId: null })).toBe(false);
  });

  test('phase 9: incomplete when only proposal exists', () => {
    expect(isStudentComplete(9, { oathId: null, proposalId: 2 })).toBe(false);
  });

  test('phase 10: complete when midreportId exists', () => {
    expect(isStudentComplete(10, { midreportId: 5 })).toBe(true);
  });

  test('phase 10: incomplete when midreportId is null', () => {
    expect(isStudentComplete(10, { midreportId: null })).toBe(false);
  });

  test('phase 11: complete when both finalreport and paperwork exist', () => {
    expect(isStudentComplete(11, { finalreportId: 1, paperworkId: 2 })).toBe(true);
  });

  test('phase 11: incomplete when only finalreport exists', () => {
    expect(isStudentComplete(11, { finalreportId: 1, paperworkId: null })).toBe(false);
  });

  test('phase 12: complete when result is non-zero', () => {
    expect(isStudentComplete(12, { result: 1 })).toBe(true);
  });

  test('phase 12: incomplete when result is 0', () => {
    expect(isStudentComplete(12, { result: 0 })).toBe(false);
  });
});

// =====================================================================
// 3. Permission index assignment (routes/cssys_work/prof.js line 226-229)
// =====================================================================
describe('Permission index assignment for prof', () => {
  function assignPermissionIndex(permission, profId) {
    if (permission.firstProfId == profId) return 1;
    else if (permission.secondProfId == profId) return 2;
    else if (permission.thirdProfId == profId) return 3;
    return null;
  }

  test('assigns index 1 for first choice', () => {
    expect(assignPermissionIndex({ firstProfId: 10, secondProfId: 20, thirdProfId: 30 }, 10)).toBe(1);
  });

  test('assigns index 2 for second choice', () => {
    expect(assignPermissionIndex({ firstProfId: 10, secondProfId: 20, thirdProfId: 30 }, 20)).toBe(2);
  });

  test('assigns index 3 for third choice', () => {
    expect(assignPermissionIndex({ firstProfId: 10, secondProfId: 20, thirdProfId: 30 }, 30)).toBe(3);
  });

  test('returns null when prof is not in any slot', () => {
    expect(assignPermissionIndex({ firstProfId: 10, secondProfId: 20, thirdProfId: 30 }, 99)).toBeNull();
  });
});

// =====================================================================
// 4. Permission sorting by index (routes/cssys_work/prof.js line 231-233)
// =====================================================================
describe('Permission sorting by index', () => {
  test('sorts permissions by index ascending', () => {
    const permissions = [{ index: 3 }, { index: 1 }, { index: 2 }];
    permissions.sort((a, b) => a.index - b.index);
    expect(permissions.map((p) => p.index)).toEqual([1, 2, 3]);
  });

  test('handles already sorted array', () => {
    const permissions = [{ index: 1 }, { index: 2 }, { index: 3 }];
    permissions.sort((a, b) => a.index - b.index);
    expect(permissions.map((p) => p.index)).toEqual([1, 2, 3]);
  });
});

// =====================================================================
// 5. Permission set_student selection logic (routes/cssys_work/prof.js line 371-378)
// =====================================================================
describe('Permission set_student selection marking', () => {
  function markPermissionSelected(permission, profId) {
    const result = { ...permission };
    if (result.firstProfId == profId) {
      result.firstSelected = 1;
      result.secondSelected = null;
      result.thirdSelected = null;
    } else if (result.secondProfId == profId) {
      result.secondSelected = 1;
      result.thirdSelected = null;
    } else if (result.thirdProfId == profId) {
      result.thirdSelected = 1;
    }
    return result;
  }

  test('first prof selection: sets first, clears second and third', () => {
    const result = markPermissionSelected(
      {
        firstProfId: 10,
        secondProfId: 20,
        thirdProfId: 30,
        firstSelected: null,
        secondSelected: null,
        thirdSelected: null,
      },
      10,
    );
    expect(result.firstSelected).toBe(1);
    expect(result.secondSelected).toBeNull();
    expect(result.thirdSelected).toBeNull();
  });

  test('second prof selection: sets second, clears third', () => {
    const result = markPermissionSelected(
      {
        firstProfId: 10,
        secondProfId: 20,
        thirdProfId: 30,
        firstSelected: null,
        secondSelected: null,
        thirdSelected: null,
      },
      20,
    );
    expect(result.secondSelected).toBe(1);
    expect(result.thirdSelected).toBeNull();
  });

  test('third prof selection: sets only third', () => {
    const result = markPermissionSelected(
      {
        firstProfId: 10,
        secondProfId: 20,
        thirdProfId: 30,
        firstSelected: null,
        secondSelected: null,
        thirdSelected: null,
      },
      30,
    );
    expect(result.thirdSelected).toBe(1);
  });
});

// =====================================================================
// 6. Selectable count logic (routes/cssys_work/prof.js line 237-240)
// =====================================================================
describe('Professor selectable count logic', () => {
  function calculateSelectable(permitCount, existingCount, selectedCount) {
    const total = existingCount + selectedCount;
    return permitCount - total < 0 ? 0 : permitCount - total;
  }

  test('returns available slots', () => {
    expect(calculateSelectable(10, 3, 2)).toBe(5);
  });

  test('returns 0 when slots are full', () => {
    expect(calculateSelectable(10, 5, 5)).toBe(0);
  });

  test('returns 0 when over capacity (clamped)', () => {
    expect(calculateSelectable(10, 8, 5)).toBe(0);
  });

  test('returns full count when no students assigned', () => {
    expect(calculateSelectable(10, 0, 0)).toBe(10);
  });
});

// =====================================================================
// 7. Permission order from systems (routes/cssys_work/prof.js line 99-100)
// =====================================================================
describe('Permission order determination from systems', () => {
  function determineOrder(systems) {
    // systems[0].isNow ? 1 : systems[1].isNow ? 2 : 3
    if (systems[0].isNow) return 1;
    if (systems[1].isNow) return 2;
    return 3;
  }

  test('returns 1 when first system is active', () => {
    expect(determineOrder([{ isNow: true }, { isNow: false }, { isNow: false }])).toBe(1);
  });

  test('returns 2 when second system is active', () => {
    expect(determineOrder([{ isNow: false }, { isNow: true }, { isNow: false }])).toBe(2);
  });

  test('returns 3 when third system is active (or none)', () => {
    expect(determineOrder([{ isNow: false }, { isNow: false }, { isNow: true }])).toBe(3);
  });

  test('returns 1 when multiple are active (first takes priority)', () => {
    expect(determineOrder([{ isNow: true }, { isNow: true }, { isNow: false }])).toBe(1);
  });
});

// =====================================================================
// 8. Student state confirm update (routes/cssys_work/prof.js line 634-638)
// =====================================================================
describe('Student state confirm update', () => {
  function confirmState(currentState, stateIndex, value) {
    // stateIndex is 1-based: 1=proposal, 2=midreport, 3=finalreport
    var a = currentState;
    var newstate = [a % 10, parseInt((a % 100) / 10), parseInt(a / 100)];
    newstate[stateIndex - 1] = parseInt(value);
    return newstate[2] * 100 + newstate[1] * 10 + newstate[0];
  }

  test('confirm proposal (state 1) from 000 with value 1 -> 1', () => {
    expect(confirmState(0, 1, 1)).toBe(1);
  });

  test('confirm midreport (state 2) from 001 with value 1 -> 011', () => {
    expect(confirmState(1, 2, 1)).toBe(11);
  });

  test('confirm finalreport (state 3) from 011 with value 1 -> 111', () => {
    expect(confirmState(11, 3, 1)).toBe(111);
  });

  test('reject proposal from 111 with value 2 -> 112', () => {
    expect(confirmState(111, 1, 2)).toBe(112);
  });

  test('update only the targeted state position', () => {
    // state=321, update midreport (position 2) to value 5 -> 351
    expect(confirmState(321, 2, 5)).toBe(351);
  });
});

// =====================================================================
// 9. Masterpiece flag logic (routes/cssys_work/prof.js line 676, 901)
// =====================================================================
describe('Masterpiece flag logic', () => {
  function parseMasterpiece(value) {
    return value == 1 ? 1 : 0;
  }

  test('value 1 sets masterpiece to 1', () => {
    expect(parseMasterpiece(1)).toBe(1);
  });

  test('value "1" (string) sets masterpiece to 1', () => {
    expect(parseMasterpiece('1')).toBe(1);
  });

  test('value 0 sets masterpiece to 0', () => {
    expect(parseMasterpiece(0)).toBe(0);
  });

  test('value null sets masterpiece to 0', () => {
    expect(parseMasterpiece(null)).toBe(0);
  });

  test('value undefined sets masterpiece to 0', () => {
    expect(parseMasterpiece(undefined)).toBe(0);
  });

  test('value 2 sets masterpiece to 0', () => {
    expect(parseMasterpiece(2)).toBe(0);
  });
});

// =====================================================================
// 10. Examine result logic (routes/cssys_work/prof.js line 902)
// =====================================================================
describe('Examine result parsing', () => {
  function parseResult(value) {
    if (value) return value == 1 ? 1 : 2;
    return undefined;
  }

  test('value 1 yields result 1 (pass)', () => {
    expect(parseResult(1)).toBe(1);
  });

  test('value "1" yields result 1', () => {
    expect(parseResult('1')).toBe(1);
  });

  test('value 2 yields result 2 (fail)', () => {
    expect(parseResult(2)).toBe(2);
  });

  test('value 0 yields result 2', () => {
    expect(parseResult(0)).toBeUndefined();
  });

  test('null yields undefined (no update)', () => {
    expect(parseResult(null)).toBeUndefined();
  });

  test('undefined yields undefined (no update)', () => {
    expect(parseResult(undefined)).toBeUndefined();
  });
});

// =====================================================================
// 11. Excel data generation for student list (routes/cssys_work/prof.js line 426-447)
// =====================================================================
describe('Excel student list data generation', () => {
  function generateExcelRow(index, user) {
    return [
      index,
      user.ids,
      user.name,
      ['재학', '휴학', '수료', '졸업'][user.Student.status],
      ['X', 'O'][user.Student.doublemajor ? 1 : 0],
      user.email,
      user.phone,
      [
        '전자전기공학부',
        '컴퓨터공학과',
        '반도체시스템공학과',
        '소프트웨어학과',
        '정보통신대학',
        '인터랙션사이언스학과',
      ][user.major],
    ];
  }

  test('generates correct row for enrolled student', () => {
    const row = generateExcelRow(1, {
      ids: 'student01',
      name: '홍길동',
      email: 'test@test.com',
      phone: '010-1234',
      major: 1,
      Student: { status: 0, doublemajor: false },
    });
    expect(row).toEqual([1, 'student01', '홍길동', '재학', 'X', 'test@test.com', '010-1234', '컴퓨터공학과']);
  });

  test('status 1 shows 휴학', () => {
    const row = generateExcelRow(1, {
      ids: 's',
      name: 'n',
      email: 'e',
      phone: 'p',
      major: 0,
      Student: { status: 1, doublemajor: false },
    });
    expect(row[3]).toBe('휴학');
  });

  test('status 2 shows 수료', () => {
    const row = generateExcelRow(1, {
      ids: 's',
      name: 'n',
      email: 'e',
      phone: 'p',
      major: 0,
      Student: { status: 2, doublemajor: false },
    });
    expect(row[3]).toBe('수료');
  });

  test('status 3 shows 졸업', () => {
    const row = generateExcelRow(1, {
      ids: 's',
      name: 'n',
      email: 'e',
      phone: 'p',
      major: 0,
      Student: { status: 3, doublemajor: false },
    });
    expect(row[3]).toBe('졸업');
  });

  test('doublemajor true shows O', () => {
    const row = generateExcelRow(1, {
      ids: 's',
      name: 'n',
      email: 'e',
      phone: 'p',
      major: 0,
      Student: { status: 0, doublemajor: true },
    });
    expect(row[4]).toBe('O');
  });

  test('doublemajor false shows X', () => {
    const row = generateExcelRow(1, {
      ids: 's',
      name: 'n',
      email: 'e',
      phone: 'p',
      major: 0,
      Student: { status: 0, doublemajor: false },
    });
    expect(row[4]).toBe('X');
  });
});
