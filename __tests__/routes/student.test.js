const crypto = require('crypto');
const moment = require('moment');

// =====================================================================
// Student route business logic unit tests
// =====================================================================

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// =====================================================================
// 1. Student auth middleware - type check (routes/cssys_work/student.js line 38-41)
// =====================================================================
describe('Student auth middleware - type check', () => {
  function checkStudentAuth(userType) {
    if (userType === 2) return 'pass';
    else return 'redirect';
  }

  test('student (type 2) passes', () => {
    expect(checkStudentAuth(2)).toBe('pass');
  });

  test('admin (type 0) is redirected', () => {
    expect(checkStudentAuth(0)).toBe('redirect');
  });

  test('professor (type 1) is redirected', () => {
    expect(checkStudentAuth(1)).toBe('redirect');
  });

  test('schedule user (type 3) is redirected', () => {
    expect(checkStudentAuth(3)).toBe('redirect');
  });
});

// =====================================================================
// 2. System date status computation (routes/cssys_work/student.js line 99-107)
// =====================================================================
describe('System date status computation', () => {
  function computeSystemStatus(systemStart, systemEnd, now) {
    return {
      isUnder: now < systemStart,
      isNow: now > systemStart && now < systemEnd,
      isOver: now > systemEnd,
    };
  }

  test('before start date: isUnder=true', () => {
    const start = new Date('2026-03-01');
    const end = new Date('2026-03-31');
    const now = new Date('2026-02-15');
    const status = computeSystemStatus(start, end, now);
    expect(status.isUnder).toBe(true);
    expect(status.isNow).toBe(false);
    expect(status.isOver).toBe(false);
  });

  test('during period: isNow=true', () => {
    const start = new Date('2026-03-01');
    const end = new Date('2026-03-31');
    const now = new Date('2026-03-15');
    const status = computeSystemStatus(start, end, now);
    expect(status.isUnder).toBe(false);
    expect(status.isNow).toBe(true);
    expect(status.isOver).toBe(false);
  });

  test('after end date: isOver=true', () => {
    const start = new Date('2026-03-01');
    const end = new Date('2026-03-31');
    const now = new Date('2026-04-15');
    const status = computeSystemStatus(start, end, now);
    expect(status.isUnder).toBe(false);
    expect(status.isNow).toBe(false);
    expect(status.isOver).toBe(true);
  });

  test('exactly at start: isUnder=false, isNow=false (boundary)', () => {
    const start = new Date('2026-03-01T00:00:00');
    const end = new Date('2026-03-31T23:59:59');
    const now = new Date('2026-03-01T00:00:00');
    const status = computeSystemStatus(start, end, now);
    // now is NOT greater than start, so isNow is false
    expect(status.isUnder).toBe(false);
    expect(status.isNow).toBe(false);
  });
});

// =====================================================================
// 3. Student state decomposition (routes/cssys_work/student.js line 132-136)
//    state is a 3-digit number: [ones=proposal, tens=midreport, hundreds=finalreport]
// =====================================================================
describe('Student state decomposition', () => {
  function decomposeState(state) {
    return [state % 10, parseInt((state % 100) / 10), parseInt(state / 100)];
  }

  test('state 0 decomposes to [0, 0, 0]', () => {
    expect(decomposeState(0)).toEqual([0, 0, 0]);
  });

  test('state 111 decomposes to [1, 1, 1]', () => {
    expect(decomposeState(111)).toEqual([1, 1, 1]);
  });

  test('state 210 decomposes to [0, 1, 2]', () => {
    expect(decomposeState(210)).toEqual([0, 1, 2]);
  });

  test('state 5 decomposes to [5, 0, 0]', () => {
    expect(decomposeState(5)).toEqual([5, 0, 0]);
  });

  test('state 50 decomposes to [0, 5, 0]', () => {
    expect(decomposeState(50)).toEqual([0, 5, 0]);
  });

  test('state 500 decomposes to [0, 0, 5]', () => {
    expect(decomposeState(500)).toEqual([0, 0, 5]);
  });

  test('state 321 decomposes to [1, 2, 3]', () => {
    expect(decomposeState(321)).toEqual([1, 2, 3]);
  });
});

// =====================================================================
// 4. File download link generation (routes/cssys_work/student.js line 111-116)
// =====================================================================
describe('Student file download link generation', () => {
  function generateFileLink(section, filePath) {
    const fileName = filePath.split('\\').reverse()[0].split('/').reverse()[0];
    return '/cssys/work/ajax/file/download/' + section + '/' + fileName;
  }

  test('generates link from Unix path', () => {
    const link = generateFileLink('oath', '/uploads/work/oath/abc123.pdf');
    expect(link).toBe('/cssys/work/ajax/file/download/oath/abc123.pdf');
  });

  test('generates link from Windows path', () => {
    const link = generateFileLink('proposal', 'C:\\uploads\\work\\proposal\\doc456.docx');
    expect(link).toBe('/cssys/work/ajax/file/download/proposal/doc456.docx');
  });

  test('handles filename with no directory', () => {
    const link = generateFileLink('midreport', 'report.pdf');
    expect(link).toBe('/cssys/work/ajax/file/download/midreport/report.pdf');
  });

  test('generates correct links for all file sections', () => {
    const sections = ['oath', 'proposal', 'midreport', 'finalreport', 'paperwork', 'presentation', 'conference'];
    sections.forEach((section) => {
      const link = generateFileLink(section, '/path/to/file.pdf');
      expect(link).toBe(`/cssys/work/ajax/file/download/${section}/file.pdf`);
    });
  });
});

// =====================================================================
// 5. check_system filtering logic (routes/cssys_work/student.js line 150-167)
// =====================================================================
describe('check_system filtering logic', () => {
  // Filters systems where id > 2 and id < 13, or id > 13,
  // and the current time is between start and end
  function filterActiveSystems(systems, now) {
    const result = {};
    for (const system of systems) {
      if ((system.id > 2 && system.id < 13) || system.id > 13) {
        if (system.start < now && now < system.end) {
          result[system.id] = system;
        }
      }
    }
    return result;
  }

  const now = new Date('2026-03-15');

  test('includes active system with id between 3-12', () => {
    const systems = [{ id: 5, start: new Date('2026-03-01'), end: new Date('2026-03-31') }];
    const result = filterActiveSystems(systems, now);
    expect(result[5]).toBeDefined();
  });

  test('excludes system with id 1 (always excluded)', () => {
    const systems = [{ id: 1, start: new Date('2026-03-01'), end: new Date('2026-03-31') }];
    const result = filterActiveSystems(systems, now);
    expect(result[1]).toBeUndefined();
  });

  test('excludes system with id 2 (always excluded)', () => {
    const systems = [{ id: 2, start: new Date('2026-03-01'), end: new Date('2026-03-31') }];
    const result = filterActiveSystems(systems, now);
    expect(result[2]).toBeUndefined();
  });

  test('excludes system with id 13 (exactly 13 is excluded)', () => {
    const systems = [{ id: 13, start: new Date('2026-03-01'), end: new Date('2026-03-31') }];
    const result = filterActiveSystems(systems, now);
    expect(result[13]).toBeUndefined();
  });

  test('includes active system with id > 13', () => {
    const systems = [{ id: 15, start: new Date('2026-03-01'), end: new Date('2026-03-31') }];
    const result = filterActiveSystems(systems, now);
    expect(result[15]).toBeDefined();
  });

  test('excludes system outside date range', () => {
    const systems = [{ id: 5, start: new Date('2026-04-01'), end: new Date('2026-04-30') }];
    const result = filterActiveSystems(systems, now);
    expect(result[5]).toBeUndefined();
  });

  test('returns multiple active systems', () => {
    const systems = [
      { id: 5, start: new Date('2026-03-01'), end: new Date('2026-03-31') },
      { id: 15, start: new Date('2026-03-01'), end: new Date('2026-03-31') },
      { id: 17, start: new Date('2026-03-01'), end: new Date('2026-03-31') },
    ];
    const result = filterActiveSystems(systems, now);
    expect(Object.keys(result)).toHaveLength(3);
  });

  test('returns empty object when no systems are active', () => {
    const systems = [
      { id: 5, start: new Date('2026-04-01'), end: new Date('2026-04-30') },
      { id: 1, start: new Date('2026-03-01'), end: new Date('2026-03-31') },
    ];
    const result = filterActiveSystems(systems, now);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// =====================================================================
// 6. Permission system phase validation (routes/cssys_work/student.js line 513-516)
// =====================================================================
describe('Permission system phase validation', () => {
  function isPermissionPhaseValid(systemId, systemStart, systemEnd, now) {
    return (systemId == 3 || systemId == 5 || systemId == 7) && now > systemStart && now < systemEnd;
  }

  test('system id 3 within date range is valid', () => {
    expect(isPermissionPhaseValid(3, new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-03-15'))).toBe(
      true,
    );
  });

  test('system id 5 within date range is valid', () => {
    expect(isPermissionPhaseValid(5, new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-03-15'))).toBe(
      true,
    );
  });

  test('system id 7 within date range is valid', () => {
    expect(isPermissionPhaseValid(7, new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-03-15'))).toBe(
      true,
    );
  });

  test('system id 4 is invalid (wrong phase)', () => {
    expect(isPermissionPhaseValid(4, new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-03-15'))).toBe(
      false,
    );
  });

  test('system id 3 outside date range is invalid', () => {
    expect(isPermissionPhaseValid(3, new Date('2026-03-01'), new Date('2026-03-31'), new Date('2026-04-15'))).toBe(
      false,
    );
  });
});

// =====================================================================
// 7. Yearterm calculation (routes/cssys_work/student.js line 418, 523)
// =====================================================================
describe('Yearterm calculation', () => {
  function calculateYearterm(date) {
    return date.getFullYear().toString() + (date.getMonth() < 6 ? '01' : '02');
  }

  test('January is first semester (01)', () => {
    expect(calculateYearterm(new Date('2026-01-15'))).toBe('202601');
  });

  test('May is first semester (01)', () => {
    expect(calculateYearterm(new Date('2026-05-15'))).toBe('202601');
  });

  test('June is still first semester (01) because getMonth() returns 5 which is < 6', () => {
    expect(calculateYearterm(new Date('2026-06-15'))).toBe('202601');
  });

  test('July is second semester (02) because getMonth() returns 6 which is >= 6', () => {
    expect(calculateYearterm(new Date('2026-07-15'))).toBe('202602');
  });

  test('December is second semester (02)', () => {
    expect(calculateYearterm(new Date('2026-12-15'))).toBe('202602');
  });

  test('different year produces correct prefix', () => {
    expect(calculateYearterm(new Date('2025-03-15'))).toBe('202501');
  });
});

// =====================================================================
// 8. Permission order calculation (routes/cssys_work/student.js line 419, 524)
// =====================================================================
describe('Permission order calculation', () => {
  function calculateOrder(systemId) {
    return parseInt((parseInt(systemId) - 1) / 2);
  }

  test('system id 3 gives order 1', () => {
    expect(calculateOrder(3)).toBe(1);
  });

  test('system id 5 gives order 2', () => {
    expect(calculateOrder(5)).toBe(2);
  });

  test('system id 7 gives order 3', () => {
    expect(calculateOrder(7)).toBe(3);
  });

  test('system id 1 gives order 0', () => {
    expect(calculateOrder(1)).toBe(0);
  });

  test('system id 4 gives order 1', () => {
    expect(calculateOrder(4)).toBe(1);
  });
});

// =====================================================================
// 9. Selectable count logic (routes/cssys_work/student.js line 464-468)
// =====================================================================
describe('Selectable professor count calculation', () => {
  function calculateSelectable(permitCount, selectedCount) {
    return permitCount - selectedCount < 0 ? 0 : permitCount - selectedCount;
  }

  test('returns remaining slots when count is below limit', () => {
    expect(calculateSelectable(5, 3)).toBe(2);
  });

  test('returns 0 when count equals limit', () => {
    expect(calculateSelectable(5, 5)).toBe(0);
  });

  test('returns 0 when count exceeds limit (clamped)', () => {
    expect(calculateSelectable(5, 7)).toBe(0);
  });

  test('returns full limit when no students selected', () => {
    expect(calculateSelectable(5, 0)).toBe(5);
  });
});

// =====================================================================
// 10. Application form empty field normalization (routes/cssys_work/student.js line 354-358)
// =====================================================================
describe('Application form empty field normalization', () => {
  function normalizeEmptyFields(body) {
    const result = { ...body };
    for (var i in result) {
      if (result[i] == '') {
        result[i] = null;
      }
    }
    return result;
  }

  test('converts empty string to null', () => {
    const result = normalizeEmptyFields({ name: '', phone: '010-1234-5678' });
    expect(result.name).toBeNull();
    expect(result.phone).toBe('010-1234-5678');
  });

  test('leaves non-empty values untouched', () => {
    const result = normalizeEmptyFields({ title: 'My Project', desc: 'Description' });
    expect(result.title).toBe('My Project');
    expect(result.desc).toBe('Description');
  });

  test('converts all empty strings to null', () => {
    const result = normalizeEmptyFields({ a: '', b: '', c: '' });
    expect(result.a).toBeNull();
    expect(result.b).toBeNull();
    expect(result.c).toBeNull();
  });

  test('handles mixed values (note: 0 == "" is true in JS, so 0 also becomes null)', () => {
    const result = normalizeEmptyFields({ a: '', b: 0, c: null, d: 'hello' });
    expect(result.a).toBeNull();
    expect(result.b).toBeNull(); // 0 == '' is true in loose comparison
    expect(result.c).toBeNull();
    expect(result.d).toBe('hello');
  });
});

// =====================================================================
// 11. Config update - password hashing logic (routes/cssys_work/student.js line 971-978)
// =====================================================================
describe('Config update - password hashing logic', () => {
  function buildConfigUpdate(body) {
    var tmp = {
      email: body.email,
      phone: body.phone,
      time: new Date(),
      ip: '127.0.0.1',
    };
    if (body.password !== '') tmp.password = sha256(body.password);
    return tmp;
  }

  test('includes hashed password when password is provided', () => {
    const result = buildConfigUpdate({ email: 'a@b.com', phone: '010', password: 'newpass' });
    expect(result.password).toBe(sha256('newpass'));
  });

  test('omits password when password is empty string', () => {
    const result = buildConfigUpdate({ email: 'a@b.com', phone: '010', password: '' });
    expect(result.password).toBeUndefined();
  });

  test('always includes email and phone', () => {
    const result = buildConfigUpdate({ email: 'test@example.com', phone: '010-0000-0000', password: '' });
    expect(result.email).toBe('test@example.com');
    expect(result.phone).toBe('010-0000-0000');
  });
});

// =====================================================================
// 12. Midreport state update logic (routes/cssys_work/student.js line 770-772)
// =====================================================================
describe('Midreport state update logic', () => {
  // state = parseInt(state / 100) * 100 + (state % 10)
  // This clears the tens digit (midreport) while keeping hundreds and ones
  function updateMidreportState(state) {
    return parseInt(state / 100) * 100 + (state % 10);
  }

  test('clears tens digit from state 210 -> 200', () => {
    expect(updateMidreportState(210)).toBe(200);
  });

  test('state 111 becomes 101', () => {
    expect(updateMidreportState(111)).toBe(101);
  });

  test('state 0 remains 0', () => {
    expect(updateMidreportState(0)).toBe(0);
  });

  test('state 50 becomes 0 (only tens digit)', () => {
    expect(updateMidreportState(50)).toBe(0);
  });

  test('state 321 becomes 301', () => {
    expect(updateMidreportState(321)).toBe(301);
  });
});

// =====================================================================
// 13. Final report state update logic (routes/cssys_work/student.js line 932-937)
// =====================================================================
describe('Final report state update logic', () => {
  // state = state % 100  (clears hundreds digit)
  function updateFinalState(state) {
    return state % 100;
  }

  test('clears hundreds digit from state 321 -> 21', () => {
    expect(updateFinalState(321)).toBe(21);
  });

  test('state 100 becomes 0', () => {
    expect(updateFinalState(100)).toBe(0);
  });

  test('state 0 remains 0', () => {
    expect(updateFinalState(0)).toBe(0);
  });

  test('state 111 becomes 11', () => {
    expect(updateFinalState(111)).toBe(11);
  });

  test('state 55 remains 55 (no hundreds digit)', () => {
    expect(updateFinalState(55)).toBe(55);
  });
});

// =====================================================================
// 14. Oath/proposal state update logic (routes/cssys_work/student.js line 700-704)
// =====================================================================
describe('Oath/proposal state update logic', () => {
  // state = parseInt(state / 10) * 10 (clears ones digit)
  function updateOathState(state) {
    return parseInt(state / 10) * 10;
  }

  test('clears ones digit from state 321 -> 320', () => {
    expect(updateOathState(321)).toBe(320);
  });

  test('state 5 becomes 0', () => {
    expect(updateOathState(5)).toBe(0);
  });

  test('state 0 remains 0', () => {
    expect(updateOathState(0)).toBe(0);
  });

  test('state 110 remains 110 (no ones digit)', () => {
    expect(updateOathState(110)).toBe(110);
  });
});
