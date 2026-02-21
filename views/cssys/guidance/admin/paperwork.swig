{% extends "layout.swig" %}

{% set page = "paperwork" %}

{% block page_header %}
	<link rel="stylesheet" href="/cssys/assets/js/datatables/dataTables.bootstrap.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2.css">
	<link rel="stylesheet" href="/cssys/assets/js/select2/select2-bootstrap.css">
	<style>
		#dataList tbody td {
			cursor: pointer;
		}
		._user_files{
			width: 22px;
			padding-right: 6px !important;
			padding-left: 6px !important;
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
		#dataList .tooltip, #dataList .tooltip-inner {
		    min-width: 100px !important;
		}
	</style>
{% endblock %}

{% block page_body %}
	<div class="page-title">
		<div class="title-env">
			<h1 class="title">연구 논문 / 작품</h1>
			<p class="description">학생을 클릭하면 자세한 사항을 확인하실 수 있습니다.</p>
		</div>
		<div class="breadcrumb-env">
			<ol class="breadcrumb bc-1">
				<li>
					<a href="main"><i class="fa-home"></i>메인</a>
				</li>
				<li class="active">
					<strong>연구 논문/작품</strong>
				</li>
			</ol>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-12">
			<div class="panel panel-default">
				<div class="panel-body">
					<table id="dataList" class="table table-striped table-bordered" cellspacing="0" width="100%">
						<thead>
							<tr>
								<td style="vertical-align: middle;">#</td>
								<th>아이디</th>
								<th>이름</th>
								<th width="40px;">논문/작품 여부</th>
								<th width="40px;">개인/공동 여부</th>
								<th>제목</th>
								<th>심사 단계</th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="신청서">신</span></th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="서약서">서</span></th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="제안서">제</span></th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="중간보고서">중</span></th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="최종보고서">최</span></th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="논문/작품">작</span></th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="교내발표자료">교</span></th>
								<th class="_user_files"><span data-toggle="tooltip" data-placement="top" title="" data-original-title="학회발표자료">학</span></th>
							</tr>
						</thead>
						<thead>
							<tr>
								<td style="vertical-align: middle;">필터</td>
								<th><input type="text" class="form-control _filter"></th>
								<th><input type="text" class="form-control _filter"></th>
								<th>
									<select class="form-control _filter">
										<option value="">(미선택)</option>
										<option value="작품">작품</option>
										<option value="논문">논문</option>
									</select>
								</th>
								<th>
									<select class="form-control _filter">
										<option value="">(미선택)</option>
										<option value="개인">개인</option>
										<option value="공동">공동</option>
									</select>
								</th>
								<th><input type="text" class="form-control _filter"></th>
								<th>
									<select class="form-control _filter">
										<option value="">(미선택)</option>
										<option value="미심사">미심사</option>
										<option value="심사통과">심사통과</option>
										<option value="재심대상자">재심대상자</option>
										<option value="기합격">기합격</option>
									</select>
								</th>
								<th colspan="8" style="vertical-align: middle;">
									-
								</th>
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
		            [10, 25, 50, 100, -1],
		            [10, 25, 50, 100, "전체"]
		        ],
		        //"sPaginationType": "full_numbers",
		        //"bSort": false,
		        "bProcessing": true,
		        "sAjaxSource": 'paperwork/ajax/get_paperworks',
		        "sServerMethod": "POST",
		        "aoColumns": [{
		            "mData": "index"
		        }, {
				    "mData": "ids"
		        }, {
		            "mData": "name"
		        }, {
					"mData": "Student.iswork",
		            "mRender": function(data, type, full) {
		                if(data) return "작품";
		                else return "논문";
		            }
		        }, {
					"mData": "Student.isgroup",
		            "mRender": function(data, type, full) {
		                if(data) return "공동";
		                else return "개인";
		            }
		        }, {
		        	"mData": "Student.title",
		            "mRender": function(data, type, full) {
		            	if(data.length>40) return data.substring(0,40)+"...";
		            	return data;
		            }
		        }, {
					"mData": "Student.result",
		            "mRender": function(data, type, full) {
		            	if(data==0) return "미심사";
		            	else if(data==1) return "심사통과";
		            	else if(data==2) return "재심대상자";
		            	else if(data==3) return "기합격";
		            }
		        }, {
					"mData": "Student.StudentInfo",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='paperwork/application/"+full.id+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }, {
					"mData": "Student.oath",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='"+data.link+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }, {
					"mData": "Student.proposal",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='"+data.link+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }, {
					"mData": "Student.midreport",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='"+data.link+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }, {
					"mData": "Student.finalreport",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='"+data.link+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }, {
					"mData": "Student.paperwork",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='"+data.link+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }, {
					"mData": "Student.presentation",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='"+data.link+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }, {
					"mData": "Student.conference",
		            "mRender": function(data, type, full) {
		            	if(data) return "<a href='"+data.link+"'><i class='fa fa-check-square-o'></i><span style='display:none;'>1</span></a>";
		            	return "<i class='fa fa-square-o'></i>";
		            }
		        }],
		        "fnRowCallback": function(nRow, aData, iDisplayIndex) {
		        	$(nRow).find('td:lt(7)').unbind("click").click(function() {
		        		document.location = "student/"+aData.id;
		            });
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
	</script>
{% endblock %}