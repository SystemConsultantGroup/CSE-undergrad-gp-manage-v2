{% extends "layout.swig" %}

{% set page = "student" %}

{% block page_header %}
	<style>
		.btn {
			margin-bottom: 0px;
		}
		.form-horizontal .form-group-separator {
			height: 1px;
			background: #eee;
			margin-bottom: 15px;
		}
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">학생 현황</h1>
			<p class="description">{{ user.ids }} 계정의 {{ user.name }} 학생 정보입니다.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1">
				<li>
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
				<li style="color:#979898;">
					학생 관리
				</li>
				<li class="active">
					<strong>학생 현황</strong>
				</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-12 form-horizontal">
			<div class="panel panel-default">
				<div class="panel-heading">
					<h3 class="panel-title">학생 기본 정보</h3>
				</div>
				<div class="panel-body">
					<div class="form-group">
						<label class="col-sm-2 control-label">아이디</label>
						<div class="col-sm-10">
							<input type="text" class="form-control" value="{{ user.ids }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">이름</label>
						<div class="col-sm-10">
							<input type="text" class="form-control" value="{{ user.name }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">이메일</label>
						<div class="col-sm-10">
							<input type="text" class="form-control" value="{{ user.email }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">연락처</label>
						<div class="col-sm-10">
							<input type="text" class="form-control" value="{{ user.phone }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">전공</label>
						<div class="col-sm-10">
							<input type="text" class="form-control" value="{{ ["전자전기공학부","컴퓨터공학과","반도체시스템공학과","소프트웨어학과","정보통신대학", "인터랙션사이언스학과"][user.major] }}" disabled >
						</div>
					</div>
				</div>
				<div class="panel-heading">
					<h3 class="panel-title">학생 논문/작품 정보</h3>
				</div>
				<div class="panel-body">
					<div class="form-group">
						<label class="col-sm-2 control-label">학기</label>
						<div class="col-sm-4">
							<input type="text" class="form-control" value="{{ student.term }} 학기" disabled >
						</div>
						<label class="col-sm-2 control-label">재학/졸업 여부</label>
						<div class="col-sm-4">
							<input type="text" class="form-control" value="{{ ["재학","휴학","수료","졸업"][student.status] }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">논문/작품 여부</label>
						<div class="col-sm-4">
							{% if student.iswork %}
								<input type="text" class="form-control" value="작품" disabled >
							{% else %}
								<input type="text" class="form-control" value="논문" disabled >
							{% endif %}
						</div>
						<label class="col-sm-2 control-label">개인/공동 여부</label>
						<div class="col-sm-4">
							{% if student.isgroup %}
								<input type="text" class="form-control" value="공동" disabled >
							{% else %}
								<input type="text" class="form-control" value="개인" disabled >
							{% endif %}
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">논문/작품 제목</label>
						<div class="col-sm-10">
							<input type="text" class="form-control" value="{{ student.title }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">심사 단계</label>
						<div class="col-sm-4">
							<input type="text" class="form-control" value="{{ ["미심사","심사통과","재심대상자","기합격"][student.result] }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<form action="{{user.id}}" method="post">
						<div class="form-group">
							<label class="col-sm-2 control-label">심사평</label>
							<div class="col-sm-10">
								<textarea rows="3" class="form-control autogrow" name="note" placeholder="학생에게 보여지는 교수님 메시지란 입니다.">{{student.note|safe}}</textarea>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label">비고</label>
							<div class="col-sm-10">
								<textarea rows="3" class="form-control autogrow" name="comment" placeholder="학생에 관한 내용을 입력하는 비고란입니다.">{{student.comment|safe}}</textarea>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label">우수작 선정 여부</label>
							<div class="col-sm-10">
								{% if student.masterpiece==1 %}
									<input class="form-check" type="checkbox" value=1 name="masterpiece" checked >
								{% else %}
									<input class="form-check" type="checkbox" value=1 name="masterpiece">
								{% endif %}
							</div>
						</div>
						<div class="form-group">
							<div class="col-sm-12">
								<button type="submit" class="btn btn-info" style="float:right;">수정하기</button>
							</div>
						</div>
					</form>
				</div>
				<div class="panel-heading">
					<h3 class="panel-title">학생 교수 배정 정보</h3>
				</div>
				<div class="panel-body">
					<div class="form-group">
						<label class="col-sm-2 control-label">배정 학기</label>
						<div class="col-sm-4">
							<input type="text" class="form-control" value="{{ student.yearterm }}" disabled >
						</div>
						<label class="col-sm-2 control-label">배정 교수</label>
						<div class="col-sm-4">
							<input type="text" class="form-control" value="{{ student.Prof.User.name }}" disabled >
						</div>
					</div>
				</div>
				<div class="panel-heading">
					<h3 class="panel-title">연구 논문/작품 정보</h3>
				</div>
				<div class="panel-body">
					<div class="form-group">
						<label class="col-sm-2 control-label">신청서</label>
						{% if student.StudentInfo %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.StudentInfo.time_ }} 제출</label>
							<div class="col-sm-8">
								<a href="../student/application/{{user.id}}" class="btn btn-white">바로가기</a>
							</div>

							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">서약서</label>
						{% if student.oath %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.oath.time_ }} 제출</label>
							<div class="col-sm-2">
								<a href="{{ student.oath.link }}" class="btn btn-info">다운로드</a>
							</div>
							<label class="col-sm-6 control-label" style="text-align:left;"> 파일명 : {{ student.oath.name }}</label>
							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">제안서</label>
						{% if student.proposal %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.proposal.time_ }} 제출</label>
							<div class="col-sm-2">
								<a href="{{ student.proposal.link }}" class="btn btn-info">다운로드</a>
							</div>
							<label class="col-sm-6 control-label" style="text-align:left;"> 파일명 : {{ student.proposal.name }}</label>
							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">중간보고서</label>
						{% if student.midreport %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.midreport.time_ }} 제출</label>
							<div class="col-sm-2">
								<a href="{{ student.midreport.link }}" class="btn btn-info">다운로드</a>
							</div>
							<label class="col-sm-6 control-label" style="text-align:left;"> 파일명 : {{ student.midreport.name }}</label>
							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">최종보고서</label>
						{% if student.finalreport %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.finalreport.time_ }} 제출</label>
							<div class="col-sm-2">
								<a href="{{ student.finalreport.link }}" class="btn btn-info">다운로드</a>
							</div>
							<label class="col-sm-6 control-label" style="text-align:left;"> 파일명 : {{ student.finalreport.name }}</label>
							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">논문/작품</label>
						{% if student.paperwork %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.paperwork.time_ }} 제출</label>
							<div class="col-sm-2">
								<a href="{{ student.paperwork.link }}" class="btn btn-info">다운로드</a>
							</div>
							<label class="col-sm-6 control-label" style="text-align:left;"> 파일명 : {{ student.paperwork.name }}</label>
							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">교내발표자료</label>
						{% if student.presentation %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.presentation.time_ }} 제출</label>
							<div class="col-sm-2">
								<a href="{{ student.presentation.link }}" class="btn btn-info">다운로드</a>
							</div>
							<label class="col-sm-6 control-label" style="text-align:left;"> 파일명 : {{ student.presentation.name }}</label>
							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">학회증빙자료</label>
						{% if student.conference %}
							<label class="col-sm-2 control-label" style="text-align:center;">{{ student.conference.time_ }} 제출</label>
							<div class="col-sm-2">
								<a href="{{ student.conference.link }}" class="btn btn-info">다운로드</a>
							</div>
							<label class="col-sm-6 control-label" style="text-align:left;"> 파일명 : {{ student.conference.name }}</label>
							{% else %}
							<div class="col-sm-10">
								<button class="btn btn-primary disabled">미제출</button>
							</div>
						{% endif %}
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<div class="col-sm-12">
							<button type="button" class="btn btn-success" style="float:right;" onClick="window.history.back()">뒤로가기</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{% endblock %}

{% block page_footer %}
	<script src="/cssys/assets/js/jquery.form.min.js"></script>
	<script type="text/javascript">
		jQuery(document).ready(function($) {
			$("form").submit(function(event){
				event.preventDefault();
				$(this).ajaxSubmit({
	                beforeSubmit: function(arr, $form, options) {
	                	$("form button").attr("disabled", "disabled");
			            show_loading_bar(70);
	                },
	                success: function(data) {
	                    show_loading_bar({
	                        delay: 1,
	                        pct: 100,
	                        finish: function() {
	                        	if(!data.result){
	                        		alert(data.text);
	                        		$('button[type="submit"]').removeAttr("disabled");
	                        	}
	                       		else{
	                       			window.location.reload();
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
		});
	</script>
{% endblock %}
