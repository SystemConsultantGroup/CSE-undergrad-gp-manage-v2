{% extends "layout.swig" %}

{% set page = "examine" %}

{% block page_header %}
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2-bootstrap.css">
	<style>
		.btn {
			margin-bottom: 0px;
		}
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">연구 논문/작품 심사</h1>
			<p class="description">심사 대상 학생을 선택하시고 심사 결과를 선택해주세요.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1">
				<li>
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
				<li class="active">
					<strong>논문/작품 심사</strong>
				</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-12">
			<form role="form" class="form-horizontal">
				<div class="panel panel-default">
					<div class="panel-heading">
						<h3 class="panel-title">심사 대상 학생 선택</h3>
						<small class="text-small pull-right" style="padding-top:5px;">
							심사 기간 : {{system.start_}} ~ {{system.end_}}
						</small>
					</div>
					<div class="panel-body">
						<div class="form-group">
							<label class="col-sm-2 control-label">학생 선택</label>
							<div class="col-sm-10">
								{% if users %}
									<select class="form-control" name="id" placeholder="심사 대상 학생를 선택해 주세요.">
										<option></option>
										{% for user in users %}
											<option value="{{user.id}}">{{user.name}}</option>
										{% endfor %}
									</select>
								{% else %}
									<select class="form-control" name="id" placeholder="심사 대상 학생이 없습니다." disabled>
										<option></option>
									</select>
								{% endif %}
							</div>
						</div>
						<div class="form-group">
							<div class="col-sm-12">
								<button type="button" class="btn btn-success" style="float:right;" onClick="window.history.back()">뒤로가기</button>
							</div>
						</div>
					</div>
				</div>
			</form>
		</div>
	</div>
{% endblock %}

{% block page_footer %}
	<script src="/cssys/assets/js/select2/select2.min.js"></script>
	<script src="/cssys/assets/js/jquery.form.min.js"></script>		
	<script type="text/javascript">
		jQuery(document).ready(function($) {

			$("form select").select2({
				minimumResultsForSearch: 1
			});

			$("select[name='id']").on("change", function(e) {
				window.location.href = "./examine/"+e.val;
			});
		});
	</script>
{% endblock %}