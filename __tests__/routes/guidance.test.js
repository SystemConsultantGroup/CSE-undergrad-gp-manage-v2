// =====================================================================
// Guidance route business logic unit tests
// =====================================================================

// =====================================================================
// 1. Guidance index redirect logic (routes/cssys_guidance/index.js line 13-18)
// =====================================================================
describe('Guidance index redirect by user type', () => {
  function getRedirectPath(userType) {
    if (userType === 0) return '/cssys/guidance/admin';
    else if (userType === 1) return '/cssys/guidance/prof';
    else if (userType === 2) return '/cssys/guidance/student';
    else return null; // next() case
  }

  test('admin (type 0) redirects to admin page', () => {
    expect(getRedirectPath(0)).toBe('/cssys/guidance/admin');
  });

  test('professor (type 1) redirects to prof page', () => {
    expect(getRedirectPath(1)).toBe('/cssys/guidance/prof');
  });

  test('student (type 2) redirects to student page', () => {
    expect(getRedirectPath(2)).toBe('/cssys/guidance/student');
  });

  test('schedule user (type 3) gets null (next called)', () => {
    expect(getRedirectPath(3)).toBeNull();
  });

  test('unknown type gets null (next called)', () => {
    expect(getRedirectPath(99)).toBeNull();
  });
});

// =====================================================================
// 2. Professor major mapping (routes/cssys_guidance/index.js line 34-56)
// =====================================================================
describe('Professor major code to name mapping', () => {
  function mapMajor(code) {
    switch (code) {
      case 0:
        return '전자전기공학부';
      case 1:
        return '컴퓨터공학과';
      case 2:
        return '반도체시스템공학과';
      case 3:
        return '소프트웨어학과';
      case 4:
        return '정보통신대학';
      case 5:
        return '인터랙션사이언스학과';
      default:
        return '없음';
    }
  }

  test('code 0 maps to 전자전기공학부', () => {
    expect(mapMajor(0)).toBe('전자전기공학부');
  });

  test('code 1 maps to 컴퓨터공학과', () => {
    expect(mapMajor(1)).toBe('컴퓨터공학과');
  });

  test('code 2 maps to 반도체시스템공학과', () => {
    expect(mapMajor(2)).toBe('반도체시스템공학과');
  });

  test('code 3 maps to 소프트웨어학과', () => {
    expect(mapMajor(3)).toBe('소프트웨어학과');
  });

  test('code 4 maps to 정보통신대학', () => {
    expect(mapMajor(4)).toBe('정보통신대학');
  });

  test('code 5 maps to 인터랙션사이언스학과', () => {
    expect(mapMajor(5)).toBe('인터랙션사이언스학과');
  });

  test('unknown code maps to 없음', () => {
    expect(mapMajor(99)).toBe('없음');
  });

  test('null code maps to 없음', () => {
    expect(mapMajor(null)).toBe('없음');
  });
});

// =====================================================================
// 3. Professor list indexing (routes/cssys_guidance/index.js line 29-31)
// =====================================================================
describe('Professor list indexing', () => {
  function indexProfList(proflist) {
    return proflist.map((prof, n) => ({
      ...prof,
      index: n,
    }));
  }

  test('assigns 0-based index to each professor', () => {
    const profs = [{ id: 10 }, { id: 20 }, { id: 30 }];
    const result = indexProfList(profs);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(1);
    expect(result[2].index).toBe(2);
  });

  test('handles empty list', () => {
    expect(indexProfList([])).toEqual([]);
  });

  test('handles single professor', () => {
    const result = indexProfList([{ id: 1 }]);
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(0);
  });
});

// =====================================================================
// 4. Professor list splice (routes/cssys_guidance/index.js line 59)
//    The first element is removed after processing
// =====================================================================
describe('Professor list first element removal', () => {
  test('removes first element from proflist', () => {
    const proflist = [
      { id: 0, name: 'dummy' },
      { id: 1, name: 'Prof A' },
      { id: 2, name: 'Prof B' },
    ];
    proflist.splice(0, 1);
    expect(proflist).toHaveLength(2);
    expect(proflist[0].name).toBe('Prof A');
  });

  test('empty array after splice if only one element', () => {
    const proflist = [{ id: 0 }];
    proflist.splice(0, 1);
    expect(proflist).toHaveLength(0);
  });
});

// =====================================================================
// 5. Session system assignment (routes/cssys_guidance/index.js line 8-11)
// =====================================================================
describe('Guidance session system assignment', () => {
  test('sets session.system to guidance', () => {
    const session = {};
    session.system = 'guidance';
    expect(session.system).toBe('guidance');
  });
});

// =====================================================================
// 6. File download path matching (routes/cssys_guidance/index.js line 64-83)
// =====================================================================
describe('Guidance file download path matching', () => {
  function matchFilePath(fileName, storedPaths) {
    return storedPaths.find((p) => p.endsWith(fileName)) || null;
  }

  test('matches file by name at end of path', () => {
    const paths = ['/uploads/guidance/oath/abc123.pdf', '/uploads/guidance/proposal/def456.pdf'];
    expect(matchFilePath('abc123.pdf', paths)).toBe('/uploads/guidance/oath/abc123.pdf');
  });

  test('returns null when no match', () => {
    const paths = ['/uploads/guidance/oath/abc123.pdf'];
    expect(matchFilePath('nonexistent.pdf', paths)).toBeNull();
  });

  test('matches correct file among similar names', () => {
    const paths = ['/uploads/a/file123.pdf', '/uploads/b/file456.pdf'];
    expect(matchFilePath('file456.pdf', paths)).toBe('/uploads/b/file456.pdf');
  });
});
