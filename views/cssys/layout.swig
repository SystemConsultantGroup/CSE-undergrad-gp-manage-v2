{% extends '../layout.swig' %}


{# cssys 사이트 해더 부분 #}
{% block site_header %}

	{# cssys 사이트 전체 적용 css #}
	<link rel="stylesheet" href="/cssys/assets/css/fonts/linecons/css/linecons.css">
	<link rel="stylesheet" href="/cssys/assets/css/fonts/fontawesome/css/font-awesome.min.css">
	<link rel="stylesheet" href="/cssys/assets/css/fonts/elusive/css/elusive.css">
	<link rel="stylesheet" href="/cssys/assets/css/bootstrap.css">
	<link rel="stylesheet" href="/cssys/assets/css/xenon-core.css">
	<link rel="stylesheet" href="/cssys/assets/css/xenon-forms.css">
	<link rel="stylesheet" href="/cssys/assets/css/xenon-components.css">
	<link rel="stylesheet" href="/cssys/assets/css/xenon-skins.css">
	<link rel="stylesheet" href="/cssys/assets/css/custom.css">
	<script src="/cssys/assets/js/jquery-1.11.1.min.js"></script>

	{# cssys 각 페이지 해더 부분 #}
	{% block page_header %}{% endblock %}

{% endblock %}


{# cssys 사이트 바디 부분 #}
{% block site_body %}

	{# xenon 템플릿 page-body 클래스 추가 설정 로그인 페이지 예외 처리 #}
	<script>
		$('body').addClass('page-body');
		{% if page=="login" %}
			$('body').addClass('login-page');		
		{% endif %}
	</script>
	
	{# cssys 각 페이지 바디 부분 및 로그인 페이지 예외 처리 #}
	{% if page=="login" %}
		{% block page_body %}{% endblock %}
	{% else %}
		<div class="page-container">
			<div class="sidebar-menu toggle-others fixed">
				{% block page_body_menu %}{% endblock %}
			</div>
			<div class="main-content">
				<nav class="navbar user-info-navbar" role="navigation">
					<ul class="user-info-menu left-links list-inline list-unstyled">
						<li class="hidden-sm hidden-xs" style="min-height: 54px;">
							<a href="#" data-toggle="sidebar">
								<i class="fa-bars"></i>
							</a>
						</li>
						<li class="hidden-sm hidden-xs" style="min-height: 54px;">
							<a>
								<i class="el-user"></i>
								{{session().user.name}} 님
							</a>
						</li>
						<li class="hidden-sm hidden-xs" style="min-height: 54px;">
							<a>
								<i class="el-cog"></i>
								{% if session().system == "work" %}
									소프트웨어융합대학 연구논문/작품시스템
								{% elseif session().system == "schedule" %}
									일정관리시스템
								{% elseif session().system == "guidance" %}
									소프트웨어대학 생활지도교수 배정 시스템	
								{% endif %}
							</a>
						</li>
					</ul>				
					<ul class="user-info-menu right-links list-inline list-unstyled">
						<li class="hidden-sm hidden-xs" style="min-height: 54px;">
							<a href="/cssys/logout">
								<i class="el-lock"></i>
								로그아웃
							</a>
						</li>
					</ul>
				</nav>
				{% block page_body %}{% endblock %}
				{% block page_body_footer %}{% endblock %}
			</div>
		</div>
	{% endif %}

	{# 페이지 로딩 오버레이 #}
	<div class="page-loading-overlay">
		<div class="loader-2"></div>
	</div>

{% endblock %}


{# cssys 사이트 푸터 부분 #}
{% block site_footer %}

	{# cssys 사이트 전체 적용 js #}
	<script src="/cssys/assets/js/bootstrap.min.js"></script>
	<script src="/cssys/assets/js/TweenMax.min.js"></script>
	<script src="/cssys/assets/js/resizeable.js"></script>
	<script src="/cssys/assets/js/joinable.js"></script>
	<script src="/cssys/assets/js/xenon-api.js"></script>
	<script src="/cssys/assets/js/xenon-toggles.js"></script>
	<script src="/cssys/assets/js/toastr/toastr.min.js"></script>
	<script src="/cssys/assets/js/xenon-custom.js"></script>
	
	{# cssys 각 페이지 푸터 부분 #}
	{% block page_footer %}{% endblock %}

	{# 동적 구글 폰트 설정 부분 #}
	<script>
		WebFontConfig = {
		    google: {
		        families: ['Arimo:400,700,400italic:latin']
		    },
		    custom: {
				families: ['Nanum Gothic'],
				urls: ['//fonts.googleapis.com/earlyaccess/nanumgothic.css']
			}
		};
		(function() {
		    var wf = document.createElement('script');
		    wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
		        '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
		    wf.type = 'text/javascript';
		    wf.async = 'true';
		    var s = document.getElementsByTagName('script')[0];
		    s.parentNode.insertBefore(wf, s);
		})();
	</script>

{% endblock %}
