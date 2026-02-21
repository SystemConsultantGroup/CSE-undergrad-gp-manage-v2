{% extends "../../layout.swig" %}

{% block page_body_menu %}
	<div class="sidebar-menu-inner">
		<header class="logo-env">
			<div class="logo">
				<a href="/cssys/work/admin/main" class="logo-expanded">
					<img src="/cssys/assets/img/logo/logo_main.png" alt="SKKU ICC cssys" />
					<p style="text-align:center;font-weight:bold;">연구논문/작품 시스템</p>
				</a>
				<a href="/cssys/work/admin/main" class="logo-collapsed">
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
				<a href="/cssys/work/admin/main">
					<i class="fa fa-home"></i>
					<span class="title">메인</span>
				</a>
			</li>
			<li {% if page=="notice_prof" || page=="notice_student" || page=="example" %} class="active opened" {% endif %}>
				<a href="">
					<i class="fa fa-star"></i>
					<span class="title">게시판 관리</span>
				</a>
				<ul>
					<li {% if page=="notice_prof" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/notice_prof/list">
							<span class="title">교수 페이지 공지사항</span>
						</a>
					</li>
					<li {% if page=="notice_student" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/notice_student/list">
							<span class="title">학생 페이지 공지사항</span>
						</a>
					</li>
					<li {% if page=="example" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/example/list">
							<span class="title">학생 페이지 제출양식</span>
						</a>
					</li>
				</ul>
			</li>
			<li {% if page=="system" %} class="active" {% endif %}>
				<a href="/cssys/work/admin/system">
					<i class="fa fa-database"></i>
					<span class="title">시스템 일정</span>
				</a>
			</li>
			<li {% if page=="prof_list" || page=="prof_register" || page=="prof_excel_register" %} class="active opened" {% endif %}>
				<a href="">
					<i class="fa fa-user"></i>
					<span class="title">교수 관리</span>
				</a>
				<ul>
					<li {% if page=="prof_list" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/prof_list">
							<span class="title">교수 현황</span>
						</a>
					</li>
					<li {% if page=="prof_register" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/prof_register">
							<span class="title">교수 등록 및 수정</span>
						</a>
					</li>
					<li {% if page=="prof_excel_register" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/prof_excel_register">
							<span class="title">교수 일괄 등록</span>
						</a>
					</li>
				</ul>
			</li>
			<li {% if page=="student_list" || page=="student_register" || page=="student_excel_register" %} class="active opened" {% endif %}>
				<a href="">
					<i class="fa fa-users"></i>
					<span class="title">학생 관리</span>
				</a>
				<ul>
					<li {% if page=="student_list" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/student_list">
							<span class="title">학생 현황</span>
						</a>
					</li>
					<li {% if page=="student_register" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/student_register">
							<span class="title">학생 등록 및 수정</span>
						</a>
					</li>
					<li {% if page=="student_excel_register" %} class="active" {% endif %}>
						<a href="/cssys/work/admin/student_excel_register">
							<span class="title">학생 일괄 등록</span>
						</a>
					</li>
				</ul>
			</li>
			<li {% if page=="permission" %} class="active" {% endif %}>
				<a href="/cssys/work/admin/permission">
					<i class="fa fa-list"></i>
					<span class="title">교수 신청/배정 현황</span>
				</a>
			</li>
			<li {% if page=="paperwork" %} class="active" {% endif %}>
				<a href="/cssys/work/admin/paperwork">
					<i class="fa fa-mortar-board"></i>
					<span class="title">연구논문/작품</span>
				</a>
			</li>
			<li {% if page=="qna" %} class="active" {% endif %}>
				<a href="/cssys/work/admin/qna/list">
					<i class="fa fa-envelope"></i>
					<span class="title">질문 및 답변</span>
				</a>
			</li>
		</ul>
	</div>
{% endblock %}


{% block page_body_footer %}
	<style>
		.main-footer .tooltip, .main-footer .tooltip-inner {
		    min-width: 270px !important;
		}
	</style>
	<footer class="main-footer sticky footer-type-1">
		<div class="footer-inner">
			<div class="footer-text">
				© Copyright 2015 성균관대학교 자연과학캠퍼스 소프트웨어융합대학 <strong><a href="http://scg.skku.ac.kr" class="tooltip-primary" data-toggle="tooltip" data-placement="top" title="" data-original-title="컴퓨터공학과 10학번 강성현(PM), 황준성 제작">시스템컨설턴트그룹</a></strong>. All Rights Reserved.
			</div>
		</div>
	</footer>
{% endblock %}


