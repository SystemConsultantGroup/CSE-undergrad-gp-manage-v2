<!DOCTYPE html>
<html lang="ko">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">

		<meta name="description" content="SKKU ICC">
		<meta name="author" content="System Consultant Group">
		<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
		<link rel="shortcut icon" href="/cssys/assets/img/favicon/favicon.ico">

		<title>성균관대학교 소프트웨어융합대학</title>

		{# 전체 페이지 해더 부분 #}
		{% block site_header %}{% endblock %}

		<!--[if lt IE 9]>
			<script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
			<script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
		<![endif]-->

		{# 실행모드에 따른 GA & LiveReload 출력 설정 #}
		{% if env !== 'development' %}
			<script>
			  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
			  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
			  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
			  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
			  ga('create', 'UA-57565687-2', 'auto');
			  ga('send', 'pageview');
			</script>
		{% else %}
			<script src="http://127.0.0.1:35729/livereload.js"></script>
		{% endif %}
		
	</head>
	<body>

		{# 전체 페이지 바디 부분 #}
		{% block site_body %}{% endblock %}

		{# 전체 페이지 푸터 부분 #}
		{% block site_footer %}{% endblock %}

	</body>
</html>