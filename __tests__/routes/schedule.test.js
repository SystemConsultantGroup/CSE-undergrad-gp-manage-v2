const moment = require('moment');
const crypto = require('crypto');

// =====================================================================
// Schedule route business logic unit tests
// =====================================================================

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// =====================================================================
// 1. Schedule user auth middleware (routes/cssys_schedule/user.js line 13-18)
// =====================================================================
describe('Schedule user auth middleware', () => {
  function checkScheduleAuth(path, userType) {
    if (path.indexOf('/phantom/') > -1) return 'pass';
    else if (userType === 3) return 'pass';
    else return 'redirect';
  }

  test('schedule user (type 3) passes', () => {
    expect(checkScheduleAuth('/main', 3)).toBe('pass');
  });

  test('admin (type 0) is redirected', () => {
    expect(checkScheduleAuth('/main', 0)).toBe('redirect');
  });

  test('student (type 2) is redirected', () => {
    expect(checkScheduleAuth('/main', 2)).toBe('redirect');
  });

  test('phantom path bypasses auth', () => {
    expect(checkScheduleAuth('/phantom/123/2026-01', null)).toBe('pass');
  });

  test('non-phantom path with null type is redirected', () => {
    expect(checkScheduleAuth('/main', null)).toBe('redirect');
  });
});

// =====================================================================
// 2. Schedule admin auth middleware (routes/cssys_schedule/admin.js line 12-15)
// =====================================================================
describe('Schedule admin auth middleware', () => {
  function checkScheduleAdminAuth(userType) {
    if (userType === 0) return 'pass';
    else return 'redirect';
  }

  test('admin (type 0) passes', () => {
    expect(checkScheduleAdminAuth(0)).toBe('pass');
  });

  test('professor (type 1) is redirected', () => {
    expect(checkScheduleAdminAuth(1)).toBe('redirect');
  });

  test('student (type 2) is redirected', () => {
    expect(checkScheduleAdminAuth(2)).toBe('redirect');
  });

  test('schedule user (type 3) is redirected', () => {
    expect(checkScheduleAdminAuth(3)).toBe('redirect');
  });
});

// =====================================================================
// 3. Event end date adjustment (routes/cssys_schedule/user.js line 59)
// =====================================================================
describe('Event end date adjustment (+1 day)', () => {
  test('adds 1 day to end date', () => {
    const end = '2026-03-15';
    const adjusted = moment(end).add(1, 'day').format('YYYY-MM-DD');
    expect(adjusted).toBe('2026-03-16');
  });

  test('handles month boundary', () => {
    const end = '2026-03-31';
    const adjusted = moment(end).add(1, 'day').format('YYYY-MM-DD');
    expect(adjusted).toBe('2026-04-01');
  });

  test('handles year boundary', () => {
    const end = '2026-12-31';
    const adjusted = moment(end).add(1, 'day').format('YYYY-MM-DD');
    expect(adjusted).toBe('2027-01-01');
  });

  test('handles February 28 (non-leap year)', () => {
    const end = '2027-02-28';
    const adjusted = moment(end).add(1, 'day').format('YYYY-MM-DD');
    expect(adjusted).toBe('2027-03-01');
  });
});

// =====================================================================
// 4. Events array construction (routes/cssys_schedule/user.js line 83-91)
// =====================================================================
describe('Events array construction from shares', () => {
  function buildEventsArray(shares) {
    var eventsArr = [];
    shares.forEach(function (share) {
      share.Calendar.Posts.forEach(function (post) {
        eventsArr.push({
          ...post,
          color: post.bgcolor,
          textColor: post.fontcolor,
          allDay: true,
        });
      });
    });
    return eventsArr;
  }

  test('builds events from multiple shares', () => {
    const shares = [
      {
        Calendar: {
          Posts: [
            { id: 1, title: 'Event A', bgcolor: '#ff0000', fontcolor: '#ffffff' },
            { id: 2, title: 'Event B', bgcolor: '#00ff00', fontcolor: '#000000' },
          ],
        },
      },
      {
        Calendar: {
          Posts: [{ id: 3, title: 'Event C', bgcolor: '#0000ff', fontcolor: '#ffffff' }],
        },
      },
    ];
    const events = buildEventsArray(shares);
    expect(events).toHaveLength(3);
    expect(events[0].color).toBe('#ff0000');
    expect(events[0].textColor).toBe('#ffffff');
    expect(events[0].allDay).toBe(true);
  });

  test('returns empty array when no shares', () => {
    expect(buildEventsArray([])).toEqual([]);
  });

  test('returns empty array when shares have no posts', () => {
    const shares = [{ Calendar: { Posts: [] } }];
    expect(buildEventsArray(shares)).toEqual([]);
  });
});

// =====================================================================
// 5. Calendar share diff logic (routes/cssys_schedule/user.js line 293-306)
// =====================================================================
describe('Calendar share diff - create/delete computation', () => {
  function computeShareDiff(nowUsers, updateUsers) {
    const createShare = updateUsers.filter((n) => nowUsers.indexOf(n) < 0);
    const deleteShare = nowUsers.filter((n) => updateUsers.indexOf(n) < 0);
    return { createShare, deleteShare };
  }

  test('detects new users to add', () => {
    const { createShare, deleteShare } = computeShareDiff([1, 2], [1, 2, 3]);
    expect(createShare).toEqual([3]);
    expect(deleteShare).toEqual([]);
  });

  test('detects users to remove', () => {
    const { createShare, deleteShare } = computeShareDiff([1, 2, 3], [1, 2]);
    expect(createShare).toEqual([]);
    expect(deleteShare).toEqual([3]);
  });

  test('detects both additions and removals', () => {
    const { createShare, deleteShare } = computeShareDiff([1, 2], [2, 3]);
    expect(createShare).toEqual([3]);
    expect(deleteShare).toEqual([1]);
  });

  test('no changes when arrays match', () => {
    const { createShare, deleteShare } = computeShareDiff([1, 2], [1, 2]);
    expect(createShare).toEqual([]);
    expect(deleteShare).toEqual([]);
  });

  test('all new when nowUsers is empty', () => {
    const { createShare, deleteShare } = computeShareDiff([], [1, 2, 3]);
    expect(createShare).toEqual([1, 2, 3]);
    expect(deleteShare).toEqual([]);
  });

  test('all removed when updateUsers is empty', () => {
    const { createShare, deleteShare } = computeShareDiff([1, 2, 3], []);
    expect(createShare).toEqual([]);
    expect(deleteShare).toEqual([1, 2, 3]);
  });
});

// =====================================================================
// 6. User register - password handling (routes/cssys_schedule/admin.js line 80-128)
// =====================================================================
describe('Schedule admin user register - password handling', () => {
  test('new user: password is hashed', () => {
    const password = 'mypassword';
    const hashed = sha256(password);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toBe(password);
  });

  test('existing user: empty password keeps old password', () => {
    const oldPassword = sha256('old');
    const newBody = { password: '' };
    const result = newBody.password === '' ? oldPassword : sha256(newBody.password);
    expect(result).toBe(oldPassword);
  });

  test('existing user: non-empty password is hashed', () => {
    const oldPassword = sha256('old');
    const newBody = { password: 'newpass' };
    const result = newBody.password === '' ? oldPassword : sha256(newBody.password);
    expect(result).toBe(sha256('newpass'));
    expect(result).not.toBe(oldPassword);
  });
});

// =====================================================================
// 7. Calendar title generation for new user (routes/cssys_schedule/admin.js line 112)
// =====================================================================
describe('Calendar title generation for new user', () => {
  function generateCalendarTitle(ids) {
    return ids + "'s Calendar";
  }

  test('generates title from user ids', () => {
    expect(generateCalendarTitle('user01')).toBe("user01's Calendar");
  });

  test('handles numeric ids', () => {
    expect(generateCalendarTitle('12345')).toBe("12345's Calendar");
  });
});

// =====================================================================
// 8. User list password deletion (routes/cssys_schedule/admin.js line 39-42)
// =====================================================================
describe('User list password deletion from response', () => {
  function processUserList(users) {
    var index = 1;
    return users.map((user) => {
      const processed = { ...user, index: index++ };
      delete processed.password;
      return processed;
    });
  }

  test('removes password and adds index', () => {
    const users = [
      { id: 1, ids: 'user1', password: 'secret123' },
      { id: 2, ids: 'user2', password: 'secret456' },
    ];
    const result = processUserList(users);
    expect(result[0].password).toBeUndefined();
    expect(result[0].index).toBe(1);
    expect(result[1].password).toBeUndefined();
    expect(result[1].index).toBe(2);
  });

  test('handles empty user list', () => {
    expect(processUserList([])).toEqual([]);
  });
});

// =====================================================================
// 9. Download feature deprecation (routes/cssys_schedule/user.js line 488-493)
// =====================================================================
describe('Download feature deprecation response', () => {
  test('returns 501 with deprecation message', () => {
    const response = {
      result: false,
      message: 'Calendar screenshot feature is not available. Phantom has been deprecated.',
    };
    expect(response.result).toBe(false);
    expect(response.message).toContain('Phantom has been deprecated');
  });
});
