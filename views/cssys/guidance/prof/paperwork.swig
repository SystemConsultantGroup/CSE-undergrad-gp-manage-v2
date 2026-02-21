{% extends "layout.swig" %}

{% set page = "paperwork" %}

{% block page_header %}
	<link rel="stylesheet" href="/cssys/assets/js/datatables/dataTables.bootstrap.css">
	<style>
		#profList tbody td {
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
					<table id="profList" class="table table-striped table-bordered" cellspacing="0" width="100%">
						<thead>
							<tr>
								<td>#</td>
								<th>아이디</th>
								<th>이름</th>
								<th>논문/작품 제목</th>
								<th>개인공동여부</th>
								<th>심사상황</th>
								<th>비고</th>
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
	<script src="/cssys/assets/js/datatables/fnReloadAjax.js"></script>	
	<script type="text/javascript">
		var profList;
		jQuery(document).ready(function($) {
			profList=$("#profList").dataTable({
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
		        "bSort": false,
		        "bProcessing": true,
		        "sAjaxSource": 'paperwork/ajax/get_paperworks',
		        "sServerMethod": "POST",
		        "aoColumns": [{
		            "mData": "index"
		        }, {
				    "mData": "student_code"
		        }, {
		            "mData": "Student.name"
		        }, {
		            "mData": "title"
		        }, {
					"mData": "status",
		            "mRender": function(data, type, full) {
		                if(data) return "공동";
		                else return "개인";
		            }
		        }, {
					"mData": "evaluation",
		            "mRender": function(data, type, full) {
		                if(data==1) return "심사대기";
		                else if(data==2) return "심사중";
		                else if(data==3) return "재심대상자";
		                else if(data==4) return "심사통과";
		                else if(data==5) return "기합격";
		                else if(data==6) return "재심사";
		                else return "미제출";
		            }
		        }, {
					"mData": "comment"
		        }],
		        "fnRowCallback": function(nRow, aData, iDisplayIndex) {
		        	// 팝업 푸쉬 넣어줘야함
		        	/*
		        	console.log(aData);
		            $(nRow).find("td:eq(2)").unbind("click").click(function() {
		                viewInfo(aData);
		            });
					*/
		        },
		        "fnDrawCallback": function(oSettings) {
		            $(window).trigger('xenon.resized');
		        }
		    });
		});
	</script>
{% endblock %}