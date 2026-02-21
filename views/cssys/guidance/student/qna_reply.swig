{% extends "layout.swig" %}

{% set page = "qna" %}

{% block page_header %}
	<style>
		.text-gray {
			margin-top: 0px;
		}
		#name,#time,#views,#title {
			width: 100%;
			display: inline-block;
			padding-top: 7px;
			color: #373e4a;
		}
		#name,#time,#views {
			text-align: center;
		}
		#text {
			overflow-x: hidden;
		}
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">질문 및 답변 (QnA)</h1>
			<p class="description">교수 또는 학생의 질문 및 답변 게시판 입니다.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1" >
				<li>
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
				<li class="active">
					<strong>질문 및 답변</strong>
				</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-12">
			<div class="panel panel-default">
				<div class="panel-body">
					<form role="form" class="form-horizontal" id="qna" action="/cssys/ajax/board/reply/guidance_qna/{{id}}" method="post" enctype="multipart/form-data">
						<div class="form-group">
							<label class="col-sm-2 control-label" for="ids">작성자 (Author)</label>
							<div class="col-sm-5">
								<span id="name"></span>
							</div>
							<label class="col-sm-1 control-label" for="ids">작성일 (Date)</label>
							<div class="col-sm-2">
								<span id="time"></span>
							</div>
							<label class="col-sm-1 control-label" for="ids">조회 (Views)</label>
							<div class="col-sm-1">
								<span id="views"></span>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label" for="ids">제목 (Title)</label>
							<div class="col-sm-10">
								<span id="title"></span>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group" style="padding-left:15px;padding-right:15px;">
							<div id="text"></div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label" for="ids">작성자 (Author)</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" name="name" value="{{session().user.name}}" disabled>
							</div>
							<label class="col-sm-2 control-label" for="ids">비밀글 (Private Article)</label>
							<div class="col-sm-1">
								<input type="checkbox" style="margin-top: 9px;" name="secret">
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label" for="ids">제목 (Title)</label>
							<div class="col-sm-10">
								<input type="text" class="form-control" name="title" placeholder="제목을 입력해주세요.">
							</div>
						</div>
						<div class="form-group" style="padding-left:15px;padding-right:15px;">
							<textarea name="text" class="form-control editor_prof" rows="25">
							</textarea>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label">첨부 파일 1 (Attachment 1)</label>
							<div class="col-sm-10">
								<input type="file" class="form-control" name="file_1">
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label">첨부 파일 2 (Attachment 2)</label>
							<div class="col-sm-10">
								<input type="file" class="form-control" name="file_2">
							</div>
						</div>
						<div class="form-group">
							<div class="col-sm-9">
								<h5 class="text-muted">※ 에디터 상단 [링크]와 [사진] 메뉴를 통해서 이미지 및 파일 업로드도 가능합니다.</h5>
							</div>
							<div class="col-sm-3" style="text-align:right;">
								<a class="btn btn-white" href="../list">List</a>
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
	<script src="/cssys/assets/js/jquery.scrollTo.js"></script>
	<script src="/cssys/assets/js/jquery.form.min.js"></script>	
	<script type="text/javascript">
		jQuery(document).ready(function($) {
			$.post( "/cssys/ajax/board/view/guidance_qna/{{id}}", function( data ) {
				if(data.result){
					if(data.post.ParentId){
						alert("답변글엔 답변글을 달수 없습니다.");
						window.history.back();
					}
					else{
						$("#name").text(data.post.name);
						$("#time").text(data.post.time);
						$("#views").text(data.post.views);
						$("#title").html((data.post.notice?"[공지] ":(data.post.ParentId?"<i class='fa fa-reply rotate'></i> ":""))+data.post.title+(data.post.secret?" <i class='fa fa-lock'></i>":""));
						$("#text").html(data.post.text);
						$("form input[name='title']").focus();
						$(window).scrollTo("form .form-group:has(input[name='name'])",1000);
						if(data.post.secret) $("form input[name='secret']").click();
					}
				}
				else{
					alert(data.text);
					window.history.back();
				}
			}).fail(function(){
				alert("존재하지 않는 글 입니다.");
				window.history.back();
			});


			$(".editor_prof").ckeditor({
				filebrowserUploadUrl: '/cssys/ajax/board/upload/guidance_qna'
			});
			$('form#qna').submit(function(e) {
		        e.preventDefault();
	            if ($("form input[name='title']").val() === "") {
	            	$(window).scrollTo("form input[name='title']",500);
			        $("form input[name='title']").focus();
		        }
		        else {
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
			                       	else window.location.href = '../view/'+data.id;
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
		        }
		    });			
		});
	</script>
{% endblock %}