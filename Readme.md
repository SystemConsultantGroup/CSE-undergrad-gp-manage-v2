# 소프트웨어대학 종합관리시스템(cssys)

**졸업 논문 관리 및 지도 교수 배정(생활 배정)**

---

## Contents

- [Installation](#installation)
- [Documentation](#Documentation)

---

## Installation

### Prerequistes
- Node.js 10.x

### 1. Clone

```shell
$ git clone http://gitlab.scg.skku.ac.kr/SCG/cssys.git
```

### 2. Install Packages

```bash
$ npm install
```

### 3-1. Start development server

```shell
$ npm start
```

만약, `grunt` 사용 시,
```shell
$ npm install -g grunt
$ grunt
```


서버 시작 후, 
[`http://localhost:3000/cssys`](http://localhost:3000/cssys) 에 접속

참고로, 로컬 서버에서는 아래의 계정들을 사용할 수 있음

| 분류 | ID | 비밀번호 |
| --- | --- | --- |
| 학생 | test2 | test2 |
| 교수 | 5252 | 5252 |
| 관리자 | admin_test | 1234 |


### 3-2. Deploy production server

```shell
$ export NODE_ENV=production && pm2 start bin/www --name "cse-undergrad-gp-manage"
```

서버 시작 후, nginx 또는 apache에서 proxy 설정할 것

---

## Documentation
 
### 개발 언어 및 프레임워크, 모듈

#### 개발 언어

- Node.js

#### 프레임워크
- expressjs4

#### 주요 모듈
- sequelize

#### 데이터 베이스
- Mysql 사용

#### view
- swig

---

#### 환경변수
```
SESSION_SECRET=replace-with-a-long-random-string
PORT=8091
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_DIALECT=mysql
DB_TIMEZONE=+09:00
DB_LOGGING=true
DB_CONNECT_TIMEOUT=60000
CSSYS_UPLOAD_PATH=
CSSYS_PERMIT_STUDENT_COUNT=8
CSSYS_PERMIT_STUDENT_COUNT_SEMICON=7
MINIO_ENDPOINT=127.0.0.1:9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=cssys-files

```

Copyright ⓒ 2020 성균관대학교 시스템컨설턴트그룹 All Right Reserved
