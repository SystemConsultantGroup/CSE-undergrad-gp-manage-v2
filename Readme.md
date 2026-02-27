# CSE Undergrad GP Manage v2

소프트웨어융합대학 학부 졸업작품/논문 관리 시스템

## 시스템 구성

- **졸업작품시스템 (work)** - 연구논문/작품 단계별 진행 관리
- **일정관리시스템 (schedule)** - 캘린더 기반 일정/게시판 관리
- **생활지도시스템 (guidance)** - 생활지도교수 배정 및 상담 관리

각 시스템별 **관리자(admin)**, **교수(prof)**, **학생(student)** 역할을 지원합니다.

## 기술 스택

| 항목            | 기술                                             |
| --------------- | ------------------------------------------------ |
| Runtime         | Node.js 22 LTS                                   |
| Framework       | Express 4.x                                      |
| ORM             | Sequelize 6 + mysql2                             |
| Template        | Pug 3                                            |
| CSS             | LESS                                             |
| File Storage    | MinIO                                            |
| Session Store   | MySQL (express-mysql-session)                    |
| Package Manager | pnpm                                             |
| Test            | Jest                                             |
| Lint            | ESLint 9 + Prettier                              |
| Git Hooks       | Husky + lint-staged                              |
| CI/CD           | GitHub Actions → Docker → Kubernetes (Kustomize) |

## 시작하기

### 사전 요구사항

- Node.js >= 22
- pnpm
- MySQL 데이터베이스
- MinIO (파일 스토리지)

### 설치

```bash
pnpm install
```

### 환경변수 설정

`.env` 파일을 프로젝트 루트에 생성:

```env
# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_DIALECT=mysql
DB_TIMEZONE=+09:00
DB_LOGGING=true
DB_CONNECT_TIMEOUT=60000

# Session
SESSION_SECRET=replace-with-a-long-random-string

# MinIO
MINIO_ENDPOINT=127.0.0.1:9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=cssys-files

# App
PORT=8091
CSSYS_UPLOAD_PATH=
CSSYS_PERMIT_STUDENT_COUNT=8
CSSYS_PERMIT_STUDENT_COUNT_SEMICON=7
```

### 개발 서버 실행

```bash
# CSS 빌드
pnpm run build:css

# 개발 서버 (nodemon 자동 재시작)
pnpm run dev

# CSS 변경 감시 (별도 터미널)
pnpm run watch:css
```

서버 시작 후 [`http://localhost:8091/cssys`](http://localhost:8091/cssys) 에 접속

### 프로덕션 실행

```bash
pnpm start
```

## 스크립트

| 명령어                  | 설명                         |
| ----------------------- | ---------------------------- |
| `pnpm start`            | 프로덕션 서버 시작           |
| `pnpm run dev`          | 개발 서버 시작 (nodemon)     |
| `pnpm run build:css`    | LESS → CSS 컴파일            |
| `pnpm run watch:css`    | LESS 변경 감시 & 자동 컴파일 |
| `pnpm test`             | Jest 테스트 실행             |
| `pnpm run lint`         | ESLint 검사                  |
| `pnpm run lint:fix`     | ESLint 자동 수정             |
| `pnpm run format`       | Prettier 포맷팅              |
| `pnpm run format:check` | Prettier 포맷 검사           |

## 프로젝트 구조

```
├── bin/www                  # 서버 엔트리포인트
├── app.js                   # Express 앱 설정
├── config/index.js          # 환경변수 기반 설정
├── lib/minio_storage.js     # MinIO 파일 스토리지 유틸
├── models/
│   ├── cs/                  # CS 공통 모델
│   ├── cssys/               # CSSYS 공통 모델 (Board, User, etc.)
│   ├── cssys_work/          # 졸업작품 모델
│   ├── cssys_guidance/      # 생활지도 모델
│   └── cssys_schedule/      # 일정관리 모델
├── routes/
│   ├── cssys/index.js       # 로그인, 게시판 CRUD
│   ├── cssys_work/          # 졸업작품 라우트 (admin/prof/student)
│   ├── cssys_guidance/      # 생활지도 라우트
│   └── cssys_schedule/      # 일정관리 라우트
├── views/                   # Pug 템플릿
│   ├── layout.pug           # 루트 레이아웃
│   └── cssys/               # 서브시스템별 뷰
├── public/                  # 정적 파일 (CSS, JS, 이미지)
├── __tests__/               # Jest 테스트
├── .github/workflows/       # CI/CD 파이프라인
├── .husky/                  # Git hook (pre-commit)
├── eslint.config.mjs        # ESLint 설정
├── .prettierrc              # Prettier 설정
└── Dockerfile               # Docker 빌드
```

## Git Hooks

Husky + lint-staged로 커밋 시 자동으로 ESLint와 Prettier가 실행됩니다.

- **pre-commit**: 스테이징된 `.js` 파일에 `eslint --fix`와 `prettier --write` 적용

## Docker

```bash
docker build -t cse-undergrad-gp-manage .
docker run -p 8091:8091 --env-file .env cse-undergrad-gp-manage
```

## CI/CD

`main` 브랜치에 푸시하면 자동으로:

1. **Test** - Node 22에서 의존성 설치 & 테스트 실행
2. **Build** - Docker 이미지 빌드 & Docker Hub 푸시
3. **Deploy** - Kustomize로 Config Repo 이미지 태그 업데이트

---

Copyright (c) 성균관대학교 시스템컨설턴트그룹
