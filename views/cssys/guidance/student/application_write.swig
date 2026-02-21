{% extends "layout.swig" %}

{% set page = "application" %}

{% block page_header %}
	<style>
		.text-gray {
			margin-top: 0px;
		}
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">지도교수 신청서 작성 (Application Write)</h1>
			<p class="description">생활지도교수 신청서 작성 페이지입니다.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1" >
				<li>
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
				<li class="active">
					<strong>사유서</strong>
				</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-12">
			<div class="panel panel-default">
				<div class="panel-body">
					<form role="form" class="form-horizontal" id="apply" action="/cssys/guidance/student/applyProf/" method="post" enctype="multipart/form-data">
						<div class="form-group">
							<label class="col-sm-1 control-label" for="ids">작성자 (Author)</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" name="name" value="{{session().user.name}}" disabled>
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-1 control-label" for="ids">교수님 (Professor)</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" name="profname" value="{{Profname}}" disabled>
							</div>
						</div>
						<div class="form-group">
							<input type="hidden" class="form-control" name="profid" value="{{ProfId}}">
						</div>
						<div class="form-group" style="padding-left:15px;padding-right:15px;">
							<textarea name="text" class="form-control editor_prof" rows="25">
							</textarea>
						</div>
						<div class="form-group">
							<div class="col-sm-9">
							</div>
							<div class="col-sm-3" style="text-align:right;">
								<a class="btn btn-white" href="list">List</a>
								<button type="submit" class="btn btn-success">Submit</button>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
{% endblock %}

{% block page_footer %}
	<script src="/cssys/assets/js/ckeditor/ckeditor.js"></script>
	<script src="/cssys/assets/js/ckeditor/adapters/jquery.js"></script>
	<script src="/cssys/assets/js/jquery.form.min.js"></script>
	<script type="text/javascript">
		jQuery(document).ready(function($) {
			$(".editor_prof").ckeditor({
				filebrowserUploadUrl: '/cssys/ajax/board/file/upload/guidance_qna'
			});

			$('form#apply').submit(function(e) {
		        e.preventDefault();
	            $(this).ajaxSubmit({
		                beforeSubmit: function(arr, $form, options) {
				        	$('form button[type="submit"]').attr("disabled", "disabled");
				            show_loading_bar(70);
		                },
		                success: function(data) {
	                        show_loading_bar({
		                        delay: 1,
		                        pct: 100,
		                        finish: function() {
		                        	if(!data.result) alert(data.text);
									else {
										window.location="/cssys/guidance/student/regiprof/"
									}
		                        }
		                    });
		                },
		                error: function(data) {
							show_loading_bar({
		                        delay: 1,
		                        pct: 100,
		                        finish: function() {
		                        	alert("에러가 발생하였습니다. 시스템 관리자에게 문의해주세요.");
		                        }
		                    });
		                }
		            });
		    });
			$("form input[name='title']").focus();
		});
	</script>
{% endblock %}