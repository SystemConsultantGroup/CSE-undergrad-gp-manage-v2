{% extends "layout.swig" %}

{% set page = "main" %}

{% block page_header %}
	<link rel="stylesheet" href="/cssys/assets/js/fullcalendar/fullcalendar.min.css">
	<style>
    .card-font {
			font-size: 15px !important;
		}
		.card-font-2 {
			font-size: 13px !important;
		}
		.xe-widget.xe-progress-counter.xe-progress-counter-blue {
		    background-color: #0e62c7
		}
		.xe-widget.xe-progress-counter.xe-progress-counter-blue .xe-background {
		    color: #fff
		}
		.xe-widget.xe-progress-counter.xe-progress-counter-blue .xe-upper {
		    background-color: transparent
		}
		.xe-widget.xe-progress-counter .except {
			font-size: 100pt;
			left: -12%;
			top: 25%;
		}
		.xe-widget.xe-progress-counter .except2 {
			font-size: 100px;
			left: -18%;
			top: 25%;
		}
		.calendar-env {
			margin-bottom: 20px;
		}
		.calendar-main {
			padding: 0px !important;
		}
		legend {
			border-bottom: 0px solid !important;
		}
		.panel {
			padding-top: 0px !important;
		}
		td {
			pointer-events: none !important;
		}
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">소프트웨어대학 생활지도교수 배정 시스템에 접속하신걸 환영합니다!</h1>
			<p class="description">시스템을 통해 생활지도교수 배정요청을 수락/거절하실 수 있습니다.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1">
				<li class="active">
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
			</ol>
		</div>
	</div>

	<div class="row">
		<div class="col-sm-6">
				<div class="panel panel-default">
					<div class="panel-body">
						<fieldset>
						<legend> 최근 배정 로그 (Assignment Log)</legend>
						<table id="noticeList" class="table table-hover" style="width:100% !important;">
						<thead>
							<tr>
								<th>배정내역 (Assignment Details)</th>
								<th>날짜 및 시간 (Date and Time)</th>
							</tr>
						</thead>
							<tbody>
							<!-- {% for log in cancelLog %}
							<tr style="color:red;">
								<td>{{log.Prof.User.name}} {{log.Student.User.name}} 학생 배정 취소 (Cancelled)</td>
								<td>{{log.createdAt | date('Y-m-d H:i:s', -540) }}</td>
							</tr>
							{% endfor %} -->
							{% for log in permissionLog %}
								<tr>
								{% if log.resorreq == 'req' && log.state == true %}
									<td>{{log.Student.User.name}} 학생 배정 신청 (Applied)</td>

								{% elseif log.resorreq == 'req' && log.state == false %}
									<td>{{log.Student.User.name}} 학생 배정 <span style="color: red;">취소</span> (Cancelled)</td>

								{% elseif log.resorreq == 'res' && log.state == true %}
									<td>{{log.Student.User.name}} 학생 배정 확정 (Assigned)</td>

								{% else %}
									<td>{{log.Student.User.name}} 학생 배정 거절 (Rejected)</td>
								{% endif %}
									<td>{{log.createdAt | date('Y-m-d H:i:s', -540) }}</td>
								</tr>
							{% endfor %}
							</tbody>
						</table>
						</fieldset>
					</div>
				</div>
		</div>
		<div class="col-sm-6">
			<div class="row">
				<div class="col-sm-6">
						<div class="xe-widget xe-progress-counter xe-progress-counter-pink " data-count=".num" data-from="0" data-to="0" data-duration="2">
							<div class="xe-background">
								<i class="el-group"></i>
							</div>
							<div class="xe-upper">
								<div class="xe-icon">
									<i class="el-group"></i>
								</div>
								<div class="xe-label">
									<span class="card-font">오늘 신청 학생 수</span>
									<span style="font-size: 12px !important;">(Students applied today)</span>
									<span class="card-font"> {{Object.keys(today_applying_students).length}} 명 </span>
								</div>
							</div>
							<div class="xe-progress">
								<span class="xe-progress-fill"></span>
							</div>
							<div class="xe-lower">
								<span class="card-font">전체 신청 대기 중인 학생 수 : {{Object.keys(applying_students).length}}명</span>
								<span style="font-size: 12px !important;">(Students Waiting for acception)</span>
							</div>
						</div>
				</div>
				<div class="col-sm-6">
						<div class="xe-widget xe-progress-counter xe-progress-counter-warning" data-count=".num" data-from="0" data-to="0" data-duration="2">
							<div class="xe-background except2">
								<i class="el-pencil"></i>
							</div>
							<div class="xe-upper">
								<div class="xe-icon">
									<i class="el-pencil"></i>
								</div>
								<div class="xe-label">
									<span class="card-font">오늘 배정완료 학생 수</span>
							  	<span style="font-size: 12px !important;">(Students assigned today)</span>
									<span class="card-font"> {{Object.keys(today_completed_students).length}} 명 </span>
								</div>
							</div>
							<div class="xe-progress">
								<span class="xe-progress-fill"></span>
							</div>
							<div class="xe-lower">
								<span class="card-font">전체 배정완료 학생 수 : {{Object.keys(completed_students).length}}명</span>
							  <span style="font-size: 12px !important;">(Total Assigned Students)</span>
							</div>
						</div>
				</div>
				<div class="col-sm-12">
						<div class="xe-widget xe-progress-counter xe-progress-counter-secondary">
							<div class="xe-background except">
								<i class="fa-files-o"></i>
							</div>
							<div class="xe-progress">
								<span class="xe-progress-fill"></span>
							</div>

							<div class="xe-lower">
								<strong class="card-font-2">총 학생 수 (total students) :  {{Object.keys(students).length}}명</strong>
								<strong class="card-font-2">총 교수 수 (total professors) : {{Object.keys(profs).length}}명</strong>
							</div>
						</div>
				</div>
			</div>
		</div>
	</div>

	<!--<div class="row">

	</div>-->
{% endblock %}

{% block page_footer %}
	<script src="/cssys/assets/js/moment.min.js"></script>
	<script src="/cssys/assets/js/fullcalendar/fullcalendar.min.js"></script>
	<script src="/cssys/assets/js/xenon-widgets.js"></script>
	<script type="text/javascript">
		jQuery(document).ready(function($) {
			calendar = $('#calendar').fullCalendar({
				header: {
					left: 'title',
					center: '',
					right: 'prev,next'
				},
				buttonIcons: {
					prev: 'prev fa-angle-left',
					next: 'next fa-angle-right',
				},
				selectable: true,
				eventLimit: true,
				events: [
					{% for system in systems %}
						{% if system.id!=1 && system.id!=13 && system.id!=7 && system.id!=8 %}
							{
								title: "{{system.phase}}",
								start: "{{system.start_}}",
								end: "{{system.end_}}"
							},
						{% endif %}
					{% endfor %}
			    ]
			});
			$(window).trigger('xenon.resized');
		});
	</script>
{% endblock %}
