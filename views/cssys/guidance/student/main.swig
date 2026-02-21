{% extends "layout.swig" %}

{% set page = "main" %}

{% block page_header %}
	<style>
	@media only screen and (min-width: 1440px) {
		.cbp_tmtime {
			padding-right: 150px !important;
		}
	}
	td {
		pointer-events: none !important;
	}
	.cbr-replaced {
		pointer-events: none !important;
	}
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">소프트웨어대학 생활지도교수 배정 시스템에 접속하신걸 환영합니다!</h1>
			<p class="description">시스템을 통해 생활지도교수 신청 및 결과를 확인하실 수 있습니다.</p>
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
		<div class="col-sm-4">
			<div class="xe-widget xe-todo-list">
				<div class="xe-header">
					<div class="xe-icon">
						<i class="fa-file-text-o"></i>
					</div>
					<div class="xe-label">
						<strong>최근 사용자 로그인 기록 (Login History)</strong>
						<span>최근 로그인 기록 5개</span>
					</div>
				</div>
				<div class="xe-body" style="padding-bottom:0px;">
					<ul class="list-unstyled" style="margin-bottom:0px;">
						{% for log in loginLog %}
							<li {% if !log.success %}class="false_log"{% endif %}>
								<label>
									<div class="cbr-replaced {% if log.success %}cbr-checked{% endif %}">
										<div class="cbr-input">
											<input type="checkbox" class="cbr cbr-done" checked="">
										</div>
										<div class="cbr-state"><span></span></div>
									</div>
									<span>{{log.time_}} - {{log.ip}} {% if !log.success %}( 로그인 실패 ){% endif %}</span>
								</label>
							</li>
						{% endfor %}
					</ul>
				</div>
			</div>
		</div>
		<div class="col-sm-8">
			<div class="xe-widget xe-todo-list">
				<div class="xe-header">
					<div class="xe-icon">
						<i class="fa-file-text-o"></i>
					</div>
					<div class="xe-label">
						<strong>최근 사용자 신청/응답 기록 (Application Record)</strong>
						<span>최근 신청/응답 기록 5개</span>
					</div>
				</div>
				<div class="xe-body" style="padding-bottom:0px;">
					<ul class="list-unstyled" style="margin-bottom:0px;">
						{% for log in permissionLog %}
							<li>
								<label>
									<div class="cbr-replaced {% if log.success %}cbr-checked{% endif %}">
										<div class="cbr-input">
											<input type="checkbox" class="cbr cbr-done" checked="">
										</div>
										<div class="cbr-state"><span></span></div>
									</div>
									<span>{{log.time_}} - {{log.ip}} 
										{% if log.resorreq == "req" %}
											{{log.Prof.User.name}} 교수님께
											{% if log.state %}배정 수락 요청{% else %}배정 해제 요청{% endif %}을 보냈습니다.
										{% else %}
											{{log.Prof.User.name}} 교수님께서
											{% if log.state%}배정 허가{% else %}요청 거부{% endif %}하셨습니다.
										{% endif %}
									</span>
								</label>
							</li>
						{% endfor %}
					</ul>
				</div>
			</div>
		</div>
		<div class="col-sm-12">
				<div class="panel panel-default">
					<div class="panel-body">
						<fieldset>
						<legend> 담당교수 (Guidance Professor)</legend>
						<table id="noticeList" class="table table-hover" style="width:100% !important;">
							<tbody>
								<tr>
									{% if student.state === 1 %}
									<td>응답 대기중 (Waiting for a response)</td>
									{% endif %}
									{% if student.state === 2 %}
									<td>
									{{ student.Prof.User.name}} 교수님
									</td>
									<td>배정 완료 (Assigned)</td>
									{% endif %}
									{% if student.state !== 1 && student.state !== 2 %}
									<td>배정 받은 교수님이 없습니다. (NA)</td>
									{% endif %}
								</tr>
							</tbody>
						</table>
						</fieldset>
					</div>
				</div>
				</div>
	</div>
{% endblock %}

{% block page_footer %}
	<script type="text/javascript">
		jQuery(document).ready(function($) {
		});
	</script>
{% endblock %}
