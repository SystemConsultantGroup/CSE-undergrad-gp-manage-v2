{% extends "../../layout.swig" %}

{% block page_body_menu %}
	<div class="sidebar-menu-inner">
		<header class="logo-env">
			<div class="logo">
				<a href="/cssys/schedule/admin/main" class="logo-expanded">
					<img src="/cssys/assets/img/logo/logo_main.png" alt="SKKU ICC cssys" />
				</a>
				<a href="/cssys/schedule/admin/main" class="logo-collapsed">
					<img src="/cssys/assets/img/logo/logo_main_small.png" alt="SKKU ICC cssys" />
				</a>
			</div>
			<div class="mobile-menu-toggle visible-xs">
				<a href="#" data-toggle="mobile-menu">
					<i class="fa-bars"></i>
				</a>
			</div>
		</header>
				
		<ul id="main-menu" class="main-menu">
			<li {% if page=="main" %} class="active" {% endif %}>
				<a href="/cssys/schedule/admin/main">
					<i class="fa fa-home"></i>
					<span class="title">메인</span>
				</a>
			</li>
			<li {% if page=="user_list" || page=="user_register" %} class="active opened" {% endif %}>
				<a href="">
					<i class="fa fa-users"></i>
					<span class="title">사용자 관리</span>
				</a>
				<ul>
					<li {% if page=="user_list" %} class="active" {% endif %}>
						<a href="/cssys/schedule/admin/user_list">
							<span class="title">사용자 현황</span>
						</a>
					</li>
					<li {% if page=="user_register" %} class="active" {% endif %}>
						<a href="/cssys/schedule/admin/user_register">
							<span class="title">사용자 등록 및 수정</span>
						</a>
					</li>
				</ul>
			</li>
			<li {% if page=="calendar_list" || page=="calendar_register" %} class="active opened" {% endif %}>
				<a href="">
					<i class="fa fa-calendar"></i>
					<span class="title">캘린더 관리</span>
				</a>
				<ul>
					<li {% if page=="calendar_list" %} class="active" {% endif %}>
						<a href="/cssys/schedule/admin/calendar_list">
							<span class="title">캘린더 현황</span>
						</a>
					</li>
					<li {% if page=="calendar_register" %} class="active" {% endif %}>
						<a href="/cssys/schedule/admin/calendar_register">
							<span class="title">캘린더 추가 및 수정</span>
						</a>
					</li>
				</ul>
			</li>
			<li {% if page=="board" %} class="active" {% endif %}>
				<a href="/cssys/schedule/admin/board/list">
					<i class="fa fa-list"></i>
					<span class="title">시스템 게시판</span>
				</a>
			</li>
		</ul>
	</div>
{% endblock %}


{% block page_body_footer %}
	<footer class="main-footer sticky footer-type-1">
		<div class="footer-inner">
			<div class="footer-text">
				© Copyright 2015 성균관대학교 자연과학캠퍼스 소프트웨어융합대학 <strong><a href="http://scg.skku.ac.kr" class="tooltip-primary" data-toggle="tooltip" data-placement="top" title="" data-original-title="컴퓨터공학과 10학번 강성현 제작">시스템컨설턴트그룹</a></strong>. All Rights Reserved.
			</div>
		</div>
	</footer>
{% endblock %}


