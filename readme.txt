1. 실행전 환경설정을 해주셔야 합니다.
- 윈도우 명령어
set NODE_ENV=production
set NODE_ENV=development

- 리눅스 명령어
export NODE_ENV=production
export NODE_ENV=development

2. 개발 언어 및 프레임워크, 모듈
개발은 node.js로 했고, 프레임워크는 expressjs4 로 했습니다.
모듈쪽은 sequelize 모듈을 사용해고, mysql db를 사용합니다.
뷰는 swig 템플릿 엔진을 사용했습니다.
필수 모듈은 package.json에 명시되있고
"npm install" 명령어를 통해 일괄 설치 할 수 있습니다.
