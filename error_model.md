# Routes Sequelize v6 / Flow Risk Report

검사 대상: `routes/**/*.js`

## 1) Sequelize v6 문법 비호환(실행 코드 기준)

- 없음

설명:

- 실행 경로에서 Sequelize v6에서 즉시 깨지는 구문(`sequelize.import`, 체이닝 `.success/.error` 실행 코드 등)은 발견되지 않았습니다.
- `.success/.error` 패턴은 일부 파일에 있으나 주석 블록 내부입니다.

## 2) 흐름상 에러 발생 가능 파일 목록

아래는 Sequelize 문법 자체보다는, 실제 운영 중 500을 유발할 수 있는 흐름/데이터 가정 이슈가 있는 파일입니다.

1. `routes/cssys_work/prof.js`

- 위험 유형: 연관 데이터 null 가정, 조인/정렬 의존
- 근거 라인:
  - `user.Student.System` 접근: `routes/cssys_work/prof.js:500`
  - `Student`/`Prof` 조인 강제 쿼리 다수: `routes/cssys_work/prof.js:31`, `routes/cssys_work/prof.js:403`, `routes/cssys_work/prof.js:467`
- 설명: 학생/시스템 연결 누락 데이터가 있으면 후처리에서 null 접근 에러 가능.

2. `routes/cssys_work/admin.js`

- 위험 유형: 대량등록 시 필드 누락/연관 누락, 다중 DB 반영 불일치 가능
- 근거 라인:
  - 학생 엑셀 등록 생성/수정 분기: `routes/cssys_work/admin.js:1195`
  - `models_g.Student` 동시 갱신: `routes/cssys_work/admin.js:1321`, `routes/cssys_work/admin.js:1350`
  - 일반 학생 등록에서 `req.body.time/ip` 의존 경로: `routes/cssys_work/admin.js:1109`, `routes/cssys_work/admin.js:1142`
- 설명: 트랜잭션 부재로 중간 실패 시 데이터 정합성 깨질 수 있음.

3. `routes/cssys_guidance/admin.js`

- 위험 유형: 대량등록/일반등록에서 다중 테이블 동시 갱신, rollback 미흡
- 근거 라인:
  - 교수 엑셀 등록: `routes/cssys_guidance/admin.js:450`
  - 학생 엑셀 등록(guide + work 동시 생성/수정): `routes/cssys_guidance/admin.js:1078`, `routes/cssys_guidance/admin.js:1203`, `routes/cssys_guidance/admin.js:1204`
  - 일반 학생 등록에서 `req.body.time/ip` 의존 경로: `routes/cssys_guidance/admin.js:994`, `routes/cssys_guidance/admin.js:1028`
- 설명: 일부 분기에서 한쪽 DB만 반영될 가능성 존재.

4. `routes/cssys_work/student.js`

- 위험 유형: `Student/System` 존재를 강하게 가정한 분기 다수
- 근거 라인:
  - `user.Student.System.id` 직접 접근: `routes/cssys_work/student.js:128`, `routes/cssys_work/student.js:224`, `routes/cssys_work/student.js:249`
- 설명: 비정상 데이터(학생 레코드 누락/시스템 미연결)에서 TypeError 가능.

5. `routes/cssys_guidance/student.js`

- 위험 유형: `Student/System/Prof` 존재 가정 분기
- 근거 라인:
  - `user.Student.System.id` 기반 로직: `routes/cssys_guidance/student.js:285`, `routes/cssys_guidance/student.js:433`
  - `user.Prof`/permissions 길이 접근: `routes/cssys_guidance/student.js:296`, `routes/cssys_guidance/student.js:299`
- 설명: 특정 연관이 null일 때 런타임 에러 가능.

6. `routes/cssys_guidance/prof.js`

- 위험 유형: 연관 조회 결과 전제 후 후처리
- 근거 라인:
  - 다중 include 결과를 전제로 한 로직: `routes/cssys_guidance/prof.js:58`, `routes/cssys_guidance/prof.js:73`, `routes/cssys_guidance/prof.js:819`
- 설명: 누락된 관계 데이터가 섞이면 예외 가능.

7. `routes/cssys/index.js`

- 위험 유형: Raw SQL 문자열 결합 사용
- 근거 라인:
  - `sequelize.query` 다수: `routes/cssys/index.js:157`, `routes/cssys/index.js:177`, `routes/cssys/index.js:251`, `routes/cssys/index.js:375`
- 설명: 일부 구간은 치환 바인딩을 쓰지만, 문자열 결합 방식이 혼재되어 유지보수/보안 리스크가 큼.

## 요약

- Sequelize v6 문법 자체의 즉시 비호환은 확인되지 않았습니다.
- 다만 위 7개 라우트 파일은 데이터 상태에 따라 런타임 500으로 이어질 가능성이 상대적으로 높습니다.
