{% extends "layout.swig" %}

{% set page = "system" %}

{% block page_header %}
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2-bootstrap.css">
	<link rel="stylesheet" href="/cssys/assets/lib/taggle/taggle.css" />
	<style>
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">연구 논문/작품 진행</h1>
			<p class="description">다음 연구 작품 및 논문 단계를 진행하시기 바랍니다.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1">
				<li>
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
				<li class="active">
					<strong>연구 논문/작품 진행</strong>
				</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-12">
			<div class="panel panel-default">
				<div class="panel-heading">
					<div class="panel-title">
						제출된 신청서
					</div>
					<small class="text-small pull-right" style="padding-top:5px;">
						{{student.StudentInfo.time}} 제출
					</small>
				</div>
				<div class="panel-body">
					<form role="form" class="form-horizontal" id="application" action="system/proc/application" method="post">
						<div class="form-group">
							<label class="col-sm-2 control-label">대학</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="소프트웨어대학" disabled >
							</div>
							<label class="col-sm-2 control-label">전공</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="{{["전자전기공학부","컴퓨터공학과","반도체시스템공학과","소프트웨어학과","정보통신대학","인터랙션사이언스학과"][user.major]}}" disabled >
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label" for="ids">학번</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="{{user.ids}}" disabled >
							</div>
							<label class="col-sm-2 control-label">이름</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="{{user.name}}" disabled >
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label">이메일</label>
							<div class="col-sm-4">
								<input type="email" class="form-control" value="{{user.email}}" disabled >
							</div>
							<label class="col-sm-2 control-label">연락처</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="{{user.phone}}" disabled >
							</div>
						</div>
						<div class="form-group">
							<div class="col-sm-offset-2 col-sm-12">
								<h5 class="text-muted">※ 유저 정보 수정은 좌측 [회원정보 수정]에서 가능합니다.</h5>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label">1학년 1학기</label>
							<label class="col-sm-1 control-label">취득학점</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.credit11}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점평균</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.grade11}}" disabled >
							</div>
							<label class="col-sm-2 control-label">1학년 2학기</label>
							<label class="col-sm-1 control-label">취득학점</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.credit12}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점평균</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.grade12}}" disabled >
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label">2학년 1학기</label>
							<label class="col-sm-1 control-label">취득학점</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.credit21}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점평균</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.grade21}}" disabled >
							</div>
							<label class="col-sm-2 control-label">2학년 2학기</label>
							<label class="col-sm-1 control-label">취득학점</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.credit22}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점평균</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.grade22}}" disabled >
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label">3학년 1학기</label>
							<label class="col-sm-1 control-label">취득학점</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.credit31}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점평균</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.grade31}}" disabled >
							</div>
							<label class="col-sm-2 control-label">3학년 2학기</label>
							<label class="col-sm-1 control-label">취득학점</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.credit32}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점평균</label>
							<div class="col-sm-1">
								<input type="text" class="form-control" value="{{student.StudentInfo.grade32}}" disabled >
							</div>
						</div>
						<div class="form-group">
							<div class="col-sm-offset-2 col-sm-12">
								<h5 class="text-muted">※ 아직 수료하지 않은 학기는 입력하지 않으셔도 됩니다.</h5>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label">관심 분야</label>
							<div class="col-sm-10 row" id="ui_interest-container">
								<div class="col-sm-4 col-md-3">
									<input type="text" class="form-control" disabled id="interest-topics" />
								</div>
								<div class="col-sm-8 col-md-9" id="ui_interest-render" style="border: 0"></div>
								<input type="hidden" name="interest" value="" id="ui_interest-HTMLinput"/>
								<input type="hidden" name="field1" value="" id="ui_interest-HTMLinput_field1"/>
								<input type="hidden" name="field2" value="" id="ui_interest-HTMLinput_field2"/>
								<input type="hidden" name="field3" value="" id="ui_interest-HTMLinput_field3"/>
							</div>
						</div>

						<div class="form-group-separator"></div>

						<div class="form-group">
							<label class="col-sm-2 control-label">선호 과목 1</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="{{student.StudentInfo.class1}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점</label>
							<div class="col-sm-2">
								<select class="form-control" name="grade1" disabled >
									<option></option>
									<option value="A+">A+</option>
									<option value="A">A</option>
									<option value="B+">B+</option>
									<option value="B">B</option>
									<option value="C+">C+</option>
									<option value="C">C</option>
									<option value="D+">D+</option>
									<option value="D">D</option>
									<option value="F">F</option>
								</select>
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label">선호 과목 2</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="{{student.StudentInfo.class2}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점</label>
							<div class="col-sm-2">
								<select class="form-control" name="grade2" disabled >
									<option></option>
									<option value="A+">A+</option>
									<option value="A">A</option>
									<option value="B+">B+</option>
									<option value="B">B</option>
									<option value="C+">C+</option>
									<option value="C">C</option>
									<option value="D+">D+</option>
									<option value="D">D</option>
									<option value="F">F</option>
								</select>
							</div>
						</div>
						<div class="form-group">
							<label class="col-sm-2 control-label">선호 과목 3</label>
							<div class="col-sm-4">
								<input type="text" class="form-control" value="{{student.StudentInfo.class3}}" disabled >
							</div>
							<label class="col-sm-1 control-label">학점</label>
							<div class="col-sm-2">
								<select class="form-control" name="grade3" disabled >
									<option></option>
									<option value="A+">A+</option>
									<option value="A">A</option>
									<option value="B+">B+</option>
									<option value="B">B</option>
									<option value="C+">C+</option>
									<option value="C">C</option>
									<option value="D+">D+</option>
									<option value="D">D</option>
									<option value="F">F</option>
								</select>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label">수상/활동 실적</label>
							<div class="col-sm-10">
								<textarea class="form-control autogrow" disabled >{{student.StudentInfo.text}}</textarea>
							</div>
						</div>
						<div class="form-group-separator"></div>
						<div class="form-group">
							<label class="col-sm-2 control-label">연구 논문/작품 주제</label>
							<div class="col-sm-10">
								<select class="form-control" name="subject" disabled >
									<option></option>
									<option value="반도체">반도체 - 반도체, 회로(VLSI, 컴퓨터, 임베디드시스템) 관련분야</option>
									<option value="통신">통신 - 신호처리, 전자파/광시스템, 통신/네트워크 관련분야</option>
									<option value="시스템">시스템 - 제어시스템, 에너지시스템 관련 분야</option>
									<option value="소프트웨어">소프트웨어 - 소프트웨어, 컴퓨터시스템, 임베디드소프트웨어 관련분야</option>
								</select>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>

{% endblock %}

{% block page_footer %}
	<script src="/cssys/assets/js/select2/select2.min.js"></script>
	<script src="/cssys/assets/js/jquery.form.min.js"></script>
	<script type="text/javascript" src="/cssys/assets/lib/taggle/taggle.js"></script>
	<script src="/cssys/assets/constants/topics.js"></script>
	<script type="text/javascript">
		const INTEREST = new function() {
			this.INITIATE = function( CONFIG ) {
				if (typeof CONFIG == 'object' && typeof CONFIG.list == 'object' && typeof CONFIG.list.length == 'number') {
					const interestElementRender = document.getElementById('ui_interest-render');
					interestElementRender.style.marginTop = '-5px';
					interestElementRender.style.marginBottom = '-5px';

					const interestTagHandlerConfig = { tags: [] };
					CONFIG.list.includes( String('{{student.StudentInfo.field1}}') ) ? ( interestTagHandlerConfig.tags.push('{{student.StudentInfo.field1}}') ) : ( false );
					CONFIG.list.includes( String('{{student.StudentInfo.field2}}') ) ? ( interestTagHandlerConfig.tags.push('{{student.StudentInfo.field2}}') ) : ( false );
					CONFIG.list.includes( String('{{student.StudentInfo.field3}}') ) ? ( interestTagHandlerConfig.tags.push('{{student.StudentInfo.field3}}') ) : ( false );
					
					document.getElementById('interest-topics').value = interestTagHandlerConfig.tags.join(', ');
				}
			}
		};

		INTEREST.INITIATE({
			list: TOPICS
		});

		jQuery(document).ready(function($) {
			$("form#application select").select2({
				minimumResultsForSearch: -1
			});

			{% if student.StudentInfo.grade1 %}
				$('select[name="grade1"]').select2('val',"{{student.StudentInfo.grade1}}");
			{% endif %}
			{% if student.StudentInfo.grade2 %}
				$('select[name="grade2"]').select2('val',"{{student.StudentInfo.grade2}}");
			{% endif %}
			{% if student.StudentInfo.grade3 %}
				$('select[name="grade3"]').select2('val',"{{student.StudentInfo.grade3}}");
			{% endif %}
			{% if student.StudentInfo.subject %}
				$('select[name="subject"]').select2('val',"{{student.StudentInfo.subject}}");
			{% endif %}

			$('form#application').submit(function(e) {
		        e.preventDefault();
				if($('select[name="subject"]').select2('val')===""){
		       		$('select[name="subject"]').focus().parent().parent().addClass('has-warning');
		       	}
		        else {
		        	$(this).ajaxSubmit({
		                beforeSubmit: function(arr, $form, options) {
				        	$('button[type="submit"]').attr("disabled", "disabled");
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
		                       			alert("제출이 완료되었습니다.")
		                       			window.location.href = 'system';
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
		        }
		    });
		});
	</script>
{% endblock %}
