{% extends "layout.swig" %}

{% set page = "main" %}

{% block page_header %}
	<link rel="stylesheet" href="/cssys/assets/js/fullcalendar/fullcalendar.min.css">
	<link rel="stylesheet" href="/cssys/assets/js/daterangepicker/daterangepicker-bs3.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2-bootstrap.css">
	<style>
		.form-horizontal .form-group {
			margin-left: 0px;
			margin-right: 0px;
		}
		.none_display {
			opacity: 0.65;
    		filter: alpha(opacity=65);
    		border-color: 
		}
	</style>
{% endblock %}

{% block page_body %}
	{{session_.user.id}}
	{{session_.user.name}}
	<div class="row calendar-env">
		<div class="col-sm-2">
			<a href="javascript:;" onclick="openModal()" class="btn btn-block btn-secondary btn-icon btn-icon-standalone btn-icon-standalone-right">
				<i class="fa fa-star"></i>
				<span>일정 등록</span>
			</a>
			<a href="calendar" class="btn btn-block btn-info btn-icon btn-icon-standalone btn-icon-standalone-right">
				<i class="fa fa-calendar"></i>
				<span>캘린더 관리</span>
			</a>
			<a href="javascript:popupOpen()" class="btn btn-block btn-blue btn-icon btn-icon-standalone btn-icon-standalone-right">
				<i class="fa fa-th-large"></i>
				<span>팝업으로 보기</span>
			</a>
			<a href="javascript:downloadProc()" class="btn btn-block btn-purple btn-icon btn-icon-standalone btn-icon-standalone-right">
				<i class="fa fa-file-image-o"></i>
				<span>이미지로 저장</span>
			</a>
			<hr style="border-bottom: 1px solid #ddd;">
			{% for share in shares%}
				<a class="btn btn-primary btn-block text-left share_btn {% if !share.display %}none_display{% endif %}" data="{{share.id}}" style="background:{{share.bgcolor}}; border:none;">
					<i class="fa-check"></i> &nbsp;{{share.title}}					
				</a>
			{% endfor %}
		</div>
		<div class="col-sm-10 calendar-right">
			<div class="calendar-main">
				<div id="calendar"></div>
			</div>
		</div> 
	</div>


	<form role="form" class="form-horizontal" id="register" method="post">
		<div class="modal fade">
			<div class="modal-dialog">
				<div class="modal-content">				
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
						<h4 class="modal-title">일정 추가</h4>
					</div>					
					<div class="modal-body">
						<div class="row">
							<div class="col-md-12">
								<div class="form-group">
									<label class="control-label">캘린더 선택</label>

									<select class="form-control" name="ShareId">
										<option></option>
										{% for share in shares %}
											<option value="{{share.id}}">
												{{share.title}}
												{% if share.Calendar.UserId != session().user.id %}
													({{share.Calendar.User.name}}님 공유)
												{% endif %}
											</option>									
										{% endfor %}
									</select>
								</div>
							</div>
						</div>
						<div class="row">
							<div class="col-md-12">
								<div class="form-group">
									<label class="control-label">일정 기간</label>
									<div class="input-group">
										<input type="text" class="form-control daterange" data-format="YYYY-MM-DD" data-separator=" ~ " name="startend" placeholder="기간을 선택해주세요.">
										<div class="input-group-addon">
											<a href="#"><i class="linecons-calendar"></i></a>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div class="row">
							<div class="col-md-12">
								<div class="form-group">
									<label class="control-label">일정 제목</label>
									<input type="text" class="form-control" name="title"  placeholder="제목을 입력해주세요.">
								</div>
							</div>
						</div>				
						<div class="row">
							<div class="col-md-12">
								<div class="form-group">
									<label class="control-label">일정 배경색</label>
									<div class="form-block">
										<input type="radio" name="bgcolor" value="#2c2e2f" class="cbr cbr-primary">
										<input type="radio" name="bgcolor" value="#7c38bc" class="cbr cbr-purple">
										<input type="radio" name="bgcolor" value="#0e62c7" class="cbr cbr-blue">
										<input type="radio" name="bgcolor" value="#40bbea" class="cbr cbr-info">
										<input type="radio" name="bgcolor" value="#00b19d" class="cbr cbr-turquoise">
										<input type="radio" name="bgcolor" value="#68b828" class="cbr cbr-secondary" checked>
										<input type="radio" name="bgcolor" value="#8dc63f" class="cbr cbr-success">
										<input type="radio" name="bgcolor" value="#cc3f44" class="cbr cbr-danger">
										<input type="radio" name="bgcolor" value="#d5080f" class="cbr cbr-red">
										<input type="radio" name="bgcolor" value="#ff6264" class="cbr cbr-pink">
										<input type="radio" name="bgcolor" value="#f7aa47" class="cbr cbr-orange">
										<input type="radio" name="bgcolor" value="#ffba00" class="cbr cbr-warning">
										<input type="radio" name="bgcolor" value="#fcd036" class="cbr cbr-yellow">
										<input type="radio" name="bgcolor" value="#c8c8c8" class="cbr cbr-gray">
										<input type="radio" name="bgcolor" value="#ffffff" class="cbr">
									</div>	
								</div>
							</div>
						</div>
						<div class="row">
							<div class="col-md-12">
								<div class="form-group">
									<label class="control-label">일정 글자색</label>
									<div class="form-block">
										<input type="radio" name="fontcolor" value="#2c2e2f" class="cbr cbr-primary">
										<input type="radio" name="fontcolor" value="#7c38bc" class="cbr cbr-purple">
										<input type="radio" name="fontcolor" value="#0e62c7" class="cbr cbr-blue">
										<input type="radio" name="fontcolor" value="#40bbea" class="cbr cbr-info">
										<input type="radio" name="fontcolor" value="#00b19d" class="cbr cbr-turquoise">
										<input type="radio" name="fontcolor" value="#68b828" class="cbr cbr-secondary">
										<input type="radio" name="fontcolor" value="#8dc63f" class="cbr cbr-success">
										<input type="radio" name="fontcolor" value="#cc3f44" class="cbr cbr-danger">
										<input type="radio" name="fontcolor" value="#d5080f" class="cbr cbr-red">
										<input type="radio" name="fontcolor" value="#ff6264" class="cbr cbr-pink">
										<input type="radio" name="fontcolor" value="#f7aa47" class="cbr cbr-orange">
										<input type="radio" name="fontcolor" value="#ffba00" class="cbr cbr-warning">
										<input type="radio" name="fontcolor" value="#fcd036" class="cbr cbr-yellow">
										<input type="radio" name="fontcolor" value="#c8c8c8" class="cbr cbr-gray">
										<input type="radio" name="fontcolor" value="#ffffff" class="cbr" checked>
									</div>	
								</div>
							</div>
						</div>
						<div class="row">
							<div class="col-md-12">							
								<div class="form-group no-margin">
									<label for="field-7" class="control-label">일정 내용</label>
									<textarea class="form-control autogrow" name="text" placeholder="일정에 관한 내용을 입력해주세요."></textarea>
								</div>
							</div>
						</div>
					</div>					
					<div class="modal-footer">
						<button type="button" class="btn btn-white" data-dismiss="modal">취소하기</button>
						<button type="button" class="btn btn-danger" data-dismiss="modal" id="delete_btn" onClick="delEvent()">삭제하기</button>
						<button type="submit" class="btn btn-info">추가하기</button>
					</div>
				</div>
			</div>
		</div>
		<input type="hidden" name="id">
	</form>

{% endblock %}

{% block page_footer %}
	<script src="/cssys/assets/js/jquery-ui/jquery-ui.min.js"></script>
	<script src="/cssys/assets/js/moment.min.js"></script>
	<script src="/cssys/assets/js/fullcalendar/fullcalendar.min.js"></script>
	<script src="/cssys/assets/js/daterangepicker/daterangepicker.js"></script>
	<script src="/cssys/assets/js/datepicker/bootstrap-datepicker.js"></script>	
	<script src="/cssys/assets/js/select2/select2.min.js"></script>
	<script src="/cssys/assets/js/multiselect/js/jquery.multi-select.js"></script>
	<script type="text/javascript">
		var calendar;
		jQuery(document).ready(function($) {
			$("select[name='ShareId']").select2({
				placeholder: '캘린더를 선택해 주세요.'
			}).on("change", function(e) {
				$.post("main/ajax/get_calendar",{id:e.val}, function(data) {
					$('input[name="bgcolor"]:input[value="'+data.bgcolor+'"]').click();
					$('input[name="fontcolor"]:input[value="'+data.fontcolor+'"]').click();
				});					
			});


			$('form#register').submit(function(e) {
		        e.preventDefault();
		        if ($('select[name="ShareId"]').val() == ""){
		        	$('select[name="ShareId"]').select2('open');
		        }
		        else if ($('input[name="startend"]').val() == ""){
		        	$('input[name="startend"]').focus();
		        }
		        else if ($('input[name="title"]').val() == ""){
		        	$('input[name="title"]').focus();
		        }
		        else if ($('input[name="title"]').val() != "") {
		        	$('button[type="submit"]').attr("disabled", "disabled");
		            show_loading_bar(70);
					$.post(($('input[name="id"]').val()==""?"main":"main/ajax/set_event"),{
						id : $('input[name="id"]').val(),
						ShareId : $('select[name="ShareId"]').select2('val'),
						start : $('input[name="startend"]').val().split(" ~ ")[0],
						end : $('input[name="startend"]').val().split(" ~ ")[1],
						title : $('input[name="title"]').val(),
						bgcolor : $('input[name="bgcolor"]:checked').val(),
						fontcolor : $('input[name="fontcolor"]:checked').val(),
						comment : $('textarea[name="comment"]').val()
					}, function(data) {
						show_loading_bar({
	                        delay: 0.5,
	                        pct: 100,
	                        finish: function() {
	                        	$('#register>.modal').modal('hide');
	                        	calendar.fullCalendar( 'refetchEvents' );
	                        }
	                    });
					});
		        }
		    });


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
				editable: true,
				selectable: true,
				eventLimit: true,				
				droppable: true,
				eventSources: [
			        {
			            url: 'main/ajax/get_events'
			        }
			    ],
				drop: function(date) {
					
					var $event = $(this).find('a'),
						eventObject = {
							title: $event.find('.badge').text(),
							start: date,
							className: $event.data('event-class')
						};
					
					$('#calendar').fullCalendar('renderEvent', eventObject, true);
					
					// Remove event from list
					$(this).remove();
				},
				// 이벤트 기간 이동
				eventDrop: function( event, delta, revertFunc, jsEvent, ui, view ) {
					updateEvent(event);
					
				},
				// 이벤트 기간 변동 
				eventResize: function( event, delta, revertFunc, jsEvent, ui, view ) { 
					updateEvent(event);
				},
				// 이벤트 클릭
				eventClick: function( event, jsEvent, view ) {
					setModalEvent(event);
				},
				// 기간 클릭
				select : function( start, end, jsEvent, view ) {
					openModal();
					$('input[name="startend"]').data('daterangepicker').setStartDate(start);
					$('input[name="startend"]').data('daterangepicker').setEndDate(moment(end).add(-1,'day'));
					calendar.fullCalendar('unselect');
				}

			});

			$(".share_btn").click(function(){
				var display = $(this).hasClass('none_display');
				if(display) $(this).removeClass('none_display');
				else $(this).addClass('none_display');
				$.post("main/ajax/set_share",{
					id : $(this).attr("data"),
					display : (display?1:0)
				}, function(data) {
					calendar.fullCalendar( 'refetchEvents' );
					show_loading_bar({
	                    delay: 0.5,
	                    pct: 100
	                });
				}).error(function() {
					show_loading_bar({
	                    delay: 0.5,
	                    pct: 100,
	                    finish: function() {
	                    	alert("알 수 없는 오류가 발생하였습니다.")
	                    }
	                });						
				});
			});

			// bottom 높이 문제 처리
			$(window).trigger('resize');
		});
		function updateEvent(event){
			show_loading_bar(70);
			$.post("main/ajax/set_event",{
				id : event.id,
				title : event.title,
				text : event.text,
				bgcolor : event.bgcolor,
				fontcolor : event.fontcolor,
				start : event.start.format(),
				end : event.end.format(),
				ShareId : event.ShareId
			}, function(data) {
				show_loading_bar({
                    delay: 0.5,
                    pct: 100
                });
			}).error(function() {
				show_loading_bar({
                    delay: 0.5,
                    pct: 100,
                    finish: function() {
                    	alert("알 수 없는 오류가 발생하였습니다.")
                    }
                });						
			});
		}
		function openModal(){
			$('select[name="ShareId"]').select2("val","");
			$('input[name="startend"]').data('daterangepicker').setStartDate(new Date());
			$('input[name="startend"]').data('daterangepicker').setEndDate(new Date());
			$('input[name="title"]').val("");
			$('input[name="bgcolor"]:input[value="#68b828"]').click();
			$('input[name="fontcolor"]:input[value="#ffffff"]').click();
			$('textarea[name="text"]').val("");
			$('#delete_btn').hide();			
			$('button[type="submit"]').text('추가하기').attr("disabled", false);
			$('input[name="id"]').val("");
			$('#register>.modal').modal('show', {backdrop: 'static'});
		}
		function setModalEvent(event){
			show_loading_bar(70);
			$.post("main/ajax/get_event",{id:event.id}, function(data) {
				openModal();
				$('#delete_btn').show();
				$('select[name="ShareId"]').select2("val",data.ShareId);
				$('input[name="startend"]').data('daterangepicker').setStartDate(data.start);
				if(data.start==data.end) $('input[name="startend"]').data('daterangepicker').setEndDate(data.end);
				else $('input[name="startend"]').data('daterangepicker').setEndDate(moment(data.end).add(-1,'day'));
				$('input[name="title"]').val(data.title);
				$('input[name="bgcolor"]:input[value="'+data.bgcolor+'"]').click();
				$('input[name="fontcolor"]:input[value="'+data.fontcolor+'"]').click();
				$('textarea[name="text"]').val(data.text);
				$('input[name="id"]').val(data.id);
				$('button[type="submit"]').text('수정하기');
				show_loading_bar({
                    delay: 0.5,
                    pct: 100
                });
			}).error(function() {
				show_loading_bar({
                    delay: 0.5,
                    pct: 100,
                    finish: function() {
                    	alert("알 수 없는 오류가 발생하였습니다.");
                    }
                });						
			});
		}
		function delEvent(){
			if(confirm("정말 삭제하시겠습니까?")){

				$.post("main/ajax/del_event",{
					id : $('input[name="id"]').val()
				}, function(data) {
					show_loading_bar({
	                    delay: 0.5,
	                    pct: 100,
						finish: function() {
	                      	calendar.fullCalendar( 'refetchEvents' );
	                    }
	                });
				}).error(function() {
					show_loading_bar({
	                    delay: 0.5,
	                    pct: 100,
	                    finish: function() {
	                    	alert("알 수 없는 오류가 발생하였습니다.");
	                    }
	                });						
				});
			}
		}
		function popupOpen(){
			window.open("popup","","width=1024, height=768, resizable=yes, scrollbars=no, status=no;");
		}
		function downloadProc(){
			show_loading_bar(70);
			document.location="download?date="+moment(calendar.fullCalendar( 'getView' ).start).add(15,'day').format("YYYY-MM-DD");
			show_loading_bar({
                delay: 3,
                pct: 100
            });

			//moment(calendar.fullCalendar( 'getView' ).start).add(15,'day').format();
			//calendar.fullCalendar( 'gotoDate', moment(calendar.fullCalendar( 'getView' ).start).add(15,'day') );

		}
	</script>
{% endblock %}