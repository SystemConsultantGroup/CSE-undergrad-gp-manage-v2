{% extends "layout.swig" %}

{% set page = "permission" %}

{% block page_header %}
	<link rel="stylesheet" href="/cssys/assets/js/datatables/dataTables.bootstrap.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2-bootstrap.css">
	<style>
		#dataList tbody td:nth-child(4), #dataList tbody td:nth-child(5), #dataList tbody td:nth-child(6), #dataList tbody td:nth-child(7), #dataList tbody td:nth-child(8) {
			cursor: pointer;
		}

		/* datatable highlight */
		.dataTable tbody tr.odd {
			background-color: #f9f9f9;
		}
		.dataTable tbody tr.even:hover, .dataTable tbody tr.even td.highlighted {
			background-color: #ECFFB3;
		}

		.dataTable tbody tr.odd:hover, .dataTable tbody tr.odd td.highlighted {
			background-color: #E6FF99;
		}

		.dataTable tr.even:hover {
			background-color: #ECFFB3;
		}

		.dataTable tr.even:hover td.sorting_1 {
			background-color: #DDFF75;
		}

		.dataTable tr.even:hover td.sorting_2 {
			background-color: #E7FF9E;
		}

		.dataTable tr.even:hover td.sorting_3 {
			background-color: #E2FF89;
		}

		.dataTable tr.odd:hover {
			background-color: #E6FF99;
		}

		.dataTable tr.odd:hover td.sorting_1 {
			background-color: #D6FF5C;
		}

		.dataTable tr.odd:hover td.sorting_2 {
			background-color: #E0FF84;
		}

		.dataTable tr.odd:hover td.sorting_3 {
			background-color: #DBFF70;
		}
		.dataTable th,.dataTable td {
			text-align:center;
		}
		.dataTable td {
			vertical-align: middle;
		}
		._filter {
			width: 100% !important;
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
			<h1 class="title">교수 신청/배정 현황</h1>
			<p class="description">학생들의 교수 신청 및 배정 현황을 확인하실 수 있습니다.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1">
				<li>
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
				<li class="active">
					<strong>교수 신청/배정 현황</strong>
				</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-12 form-horizontal">
			<div class="panel panel-default">
				<div class="panel-heading">
					<h3 class="panel-title">교수 신청/배정 기간</h3>
				</div>
				<div class="panel-body">
					<div class="form-group">
						<label class="col-sm-2 control-label">현재 학기</label>
						<div class="col-sm-10">
							<input type="text" class="form-control" value="{{ yearterm }}" disabled >
						</div>
					</div>
					<div class="form-group-separator"></div>
					<div class="form-group">
						<label class="col-sm-2 control-label">현재 차수</label>
						<div class="col-sm-10">
							{% if order %}
								<input type="text" class="form-control" value="{{ order }}차 ({{ systems[order].start__ }} ~ {{ systems[order+1].end__ }})" disabled >
							{% else %}
								<input type="text" class="form-control" value="신청/배정 기간 아님" disabled >
							{% endif %}
						</div>
					</div>
				</div>
				<div class="panel-heading">
					<h3 class="panel-title">교수 신청/배정 현황</h3>
				</div>
				<div class="panel-body">
					<table id="dataList" class="table table-striped table-bordered" cellspacing="0" width="100%">
						<thead>
							<tr>
								<td>#</td>
								<th>학기</th>
								<th>차수</th>
								<th>아이디</th>
								<th>이름</th>
								<th>지망 교수</th>
								<!--<th>2지망</th>
								<th>3지망</th>-->
								<th>결과</th>
								<th>학생 선택 취소</th>
							</tr>
						</thead>
						<thead>
							<tr>
								<td style="vertical-align: middle;">필터</td>
								<th><input type="text" class="form-control _filter"></th>
								<th><input type="text" class="form-control _filter"></th>
								<th><input type="text" class="form-control _filter"></th>
								<th><input type="text" class="form-control _filter"></th>
								<th><input type="text" class="form-control _filter"></th>
								<!--<th><input type="text" class="form-control _filter"></th> //2,3지망 삭제
								<th><input type="text" class="form-control _filter"></th>
								DataTables warning: table id=dataList - Requested unknown parameter 'Prof' for row 21-->
								<th>
									<select class="form-control _filter">
										<option value="">(미선택)</option>
										<option value="배정 전">배정 전</option>
										<option value="배정 완료">배정 완료</option>
										<!--<option value="2지망 배정">2지망 배정</option> //2,3지망 삭제
										<option value="3지망 배정">3지망 배정</option>-->
										<option value="미배정">미배정</option>
									</select>
								</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
{% endblock %}

{% block page_footer %}
	<script src="/cssys/assets/js/datatables/js/jquery.dataTables.min.js"></script>
	<script src="/cssys/assets/js/datatables/dataTables.bootstrap.js"></script>
	<script src="/cssys/assets/js/datatables/tabletools/dataTables.tableTools.min.js"></script>
	<script src="/cssys/assets/js/select2/select2.min.js"></script>
	<script src="/cssys/assets/js/datatables/fnReloadAjax.js"></script>
	<script type="text/javascript">
		var dataList;
		jQuery(document).ready(function($) {
			$("#dataList select").select2({
				minimumResultsForSearch: -1
			});
			dataList=$("#dataList").DataTable({
		        "oLanguage": {
		            "sSearch": "검색 :",
		            "sLengthMenu": "_MENU_ 명씩 보기",
		            "sEmptyTable": "레코드가 없습니다.",
		            "sInfo": "총 _TOTAL_명 중 _START_에서 _END_번째",
		            "sInfoEmpty": "총 0명",
		            "sZeroRecords": "일치하는 학생이 없습니다.",
		            "sInfoFiltered": "(총 _MAX_명 중)",
		            "oPaginate": {
		                "sFirst": "처음",
		                "sLast": "마지막",
		                "sNext": "다음",
		                "sPrevious": "이전"
		            }
		        },
		        aLengthMenu: [
		            [25, 50, 100, -1],
		            [25, 50, 100, "전체"]
		        ],
		        //"sPaginationType": "full_numbers",
		        //"bSort": false,
		        "bProcessing": true,
		        "sAjaxSource": 'permission/ajax/get_permissions',
		        "sServerMethod": "POST",
		        "aoColumns": [{
		            "mData": "index"
		        }, {
				    "mData": "yearterm"
		        }, {
				    "mData": "order",
		            "mRender": function(data, type, full) {
		                return data+"차";
		            }
		        }, {
				    "mData": "Student.User.ids"
		        }, {
				    "mData": "Student.User.name"
		        }, {
				    "mData": "firstProf.User.name",
		            "mRender": function(data, type, full) {
		            	if(full.firstSelected) return data + ' <div class="label label-blue">선택됨</div>';
		            	else return data + ' <div class="label label-danger">미선택</div>';
		            }
		        }, /*{ //2,3지망 삭제
				    "mData": "secondProf.User.name",
		            "mRender": function(data, type, full) {
									if (!data){
										""
									}
		            	if(full.secondSelected) return data + ' <div class="label label-blue">선택됨</div>';
		            	else return data + ' <div class="label label-danger">미선택</div>';
		            }
		        }, {
				    "mData": "thirdProf.User.name",
		            "mRender": function(data, type, full) {
		            	if(full.thirdSelected) return data + ' <div class="label label-blue">선택됨</div>';
		            	else return data + ' <div class="label label-danger">미선택</div>';
		            }
		        },*/ {
		            "mData": "Prof",
		            "mRender": function(data, type, full) {
		            	if(data){
		            	  if(full.firstProf && data.id == full.firstProf.id) return "배정 완료";
		            		else if(full.secondProf && data.id == full.secondProf.id) return "배정 완료";
		            		else if(full.thirdProf && data.id == full.thirdProf.id) return "배정 완료";
		            	}
		            	else if(full.yearterm=="{{yearterm}}" && full.order=={{order}}) return "배정전";
		            	else return "미배정";
						console.log(data);
		            }
		        },{
							"mRender": function(data,type,full){
								if (full.firstSelected || full.secondSelected || full.thirdSelected) {
									return "<button class=\"btn btn-success\" onclick=\"cancel_selection("+full.id+")\">학생선택취소</button>";
								}
								else {
									return "";
								}
							}
						}],
		        "fnRowCallback": function(nRow, aData, iDisplayIndex) {
		        	$(nRow).find('td:eq(3),td:eq(4)').unbind("click").click(function() {
		        		document.location = "student/"+aData.Student.User.id;
		            });
		        	$(nRow).find('td:eq(5)').unbind("click").click(function() {
		        		document.location = "prof/"+aData.firstProf.User.id;
		            });
		        	/*$(nRow).find('td:eq(6)').unbind("click").click(function() { 2,3지망 교수로 이동시켜주는 부분 삭제
		        		document.location = "prof/"+aData.secondProf.User.id;
		            });
		        	$(nRow).find('td:eq(7)').unbind("click").click(function() {
		        		document.location = "prof/"+aData.thirdProf.User.id;
							});*/
		        },
		        "fnDrawCallback": function(oSettings) {
		            $(window).trigger('xenon.resized');
		        }
		    });

			$('._filter').change(function(){
				$('input._filter,select._filter').each(function(index){
					dataList.column(index+1).search($(this).val()).draw();
				});
			});
		});
		function cancel_selection(permission_id) {
			var flag= confirm("선택사항을 취소하시겠습니까?")
			if (flag) {
				$.post("permission/ajax/cancel_selection",{perid:permission_id}, function( data ) {//학생선택취소버튼 함수
					if(!data.result){
						alert("오류가 발생하였습니다. 관리자에게 문의하여 주십시오.");
					}	else {
						alert("취소되었습니다.");
						location.reload();
					}
				});
			}
		}
	</script>
{% endblock %}
