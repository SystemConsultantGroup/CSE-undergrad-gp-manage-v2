{% extends "layout.swig" %}

{% set page = "error" %}

{% block site_header %}
	<style>
		.xe-widget.xe-progress-counter.xe-progress-counter-blue {
		    background-color: #0e62c7
		}
		.xe-widget.xe-progress-counter.xe-progress-counter-blue .xe-background {
		    color: #fff
		}
		.xe-widget.xe-progress-counter.xe-progress-counter-blue .xe-upper {
		    background-color: transparent
		}
		.xe-widget.xe-progress-counter .except {
			font-size: 100px;
			left: -12%;
			top: 25%;
		}
		.xe-widget.xe-progress-counter .except2 {
			font-size: 100px;
			left: -18%;
			top: 25%;
		}
		.calendar-env {
			margin-bottom: 20px;
		}
		.calendar-main {
			padding: 0px !important;
		}
		legend {
			border-bottom: 0px solid !important;
		}
		.panel {
			padding-top: 0px !important;
		}
		span {
			font-size: 15px !important; 
		}
		strong{
			font-size: 15px !important;
		}
    .main-font{
      font-family: Arimo, "Helvetica Neue", Helvetica, Arial, 'Nanum Gothic', sans-serif
    !important;
    }
    .btn-color{

    }
	</style>
{% endblock %}

{% block site_body %}
	<html>
    <head>
        <title>Rhythm &mdash; One & Multi Page Creative Theme</title>
        <meta name="description" content="">
        <meta name="keywords" content="">
        <meta charset="utf-8">
        <meta name="author" content="Roman Kirichik">
        <!--[if IE]><meta http-equiv='X-UA-Compatible' content='IE=edge,chrome=1'><![endif]-->
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        
        <!-- Favicons -->
        <link rel="shortcut icon" href="images/favicon.png">
        <link rel="apple-touch-icon" href="images/apple-touch-icon.png">
        <link rel="apple-touch-icon" sizes="72x72" href="images/apple-touch-icon-72x72.png">
        <link rel="apple-touch-icon" sizes="114x114" href="images/apple-touch-icon-114x114.png">
        
        <!-- CSS -->
        <link rel="stylesheet" href="/cssys/css/bootstrap_css/bootstrap.min.css">
        <link rel="stylesheet" href="/cssys/css/bootstrap_css/style.css">
        <link rel="stylesheet" href="/cssys/css/bootstrap_css/style-responsive.css">
        <link rel="stylesheet" href="/cssys/css/bootstrap_css/animate.min.css">
        <link rel="stylesheet" href="/cssys/css/bootstrap_css/vertical-rhythm.min.css">
        <link rel="stylesheet" href="/cssys/css/bootstrap_css/owl.carousel.css">
        <link rel="stylesheet" href="/cssys/css/bootstrap_css/magnific-popup.css">        

        
    </head>
    <body class="appear-animate">
        
        <!-- Page Loader -->        
        <div class="page-loader">
            <div class="loader">Loading...</div>
        </div>
        <!-- End Page Loader -->
        
        <!-- Page Wrap -->
        <div class="page" id="top">
            
            <!-- Home Section -->
            <section style="background"class="home-section bg-dark-alfa-90 parallax-2" data-background="images/full-width-images/section-bg-12.jpg">
                <div class="js-height-full">
                    
                    <!-- Hero Content -->
                    <div class="home-content container">
                        <div class="home-text">
                            <div class="hs-cont">
                                
                                <!-- Headings -->
                                <div class="hs-wrap">
                                    
                                    <div class="hs-line-13 font-alt mb-10">
                                        404
                                    </div>
                                    
                                    <div class="hs-line-4 font-alt mb-40 main-font">
                                        </br>찾는 페이지가 없습니다. </br>
                                        <div style ="font-size: 12px;">The page you were looking for could not be found.</div>
                                    </div>
                                    
                                    <div class="local-scroll">                                        
                                        <a href="main" class="btn btn-mod btn-w btn-round btn-small">Back To Home Page</a>                                        
                                    </div>
                                    
                                </div>
                                <!-- End Headings -->
                                
                            </div>
                        </div>
                    </div>
                    <!-- End Hero Content -->
                    
                </div>
            </section>
            <!-- End Home Section -->
            
            
            <!-- Navigation panel -->
            <nav class="main-nav dark transparent stick-fixed">
                <div class="full-wrapper relative clearfix">
                    <!-- Logo ( * your text or image into link tag *) -->
                    <div class="nav-logo-wrap local-scroll">
                        <a href="mp-index.html" class="logo">
                            <img src="images/logo-white.png" alt="" />
                        </a>
                    </div>
                    <div class="mobile-nav">
                        <i class="fa fa-bars"></i>
                    </div>
                    <!-- Main Menu -->
                </div>
            </nav>

        
        </div>
	<!--<div class="row">
	</div>-->
{% endblock %}

{% block site_footer %}
 <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery-1.11.2.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.easing.1.3.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/bootstrap.min.js"></script>        
  <script type="text/javascript" src="/cssys/js/bootstrap_js/SmoothScroll.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.scrollTo.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.localScroll.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.viewport.mini.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.countTo.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.appear.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.sticky.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.parallax-1.1.3.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.fitvids.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/owl.carousel.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/isotope.pkgd.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/imagesloaded.pkgd.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.magnific-popup.min.js"></script>
  <script type="text/javascript" src="http://maps.google.com/maps/api/js?sensor=false&amp;language=en"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/gmap3.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/wow.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/masonry.pkgd.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.simple-text-rotator.min.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/all.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/contact-form.js"></script>
  <script type="text/javascript" src="/cssys/js/bootstrap_js/jquery.ajaxchimp.min.js"></script>        
	<script src="/cssys/assets/js/moment.min.js"></script>
	<script src="/cssys/assets/js/fullcalendar/fullcalendar.min.js"></script>
	<script src="/cssys/assets/js/xenon-widgets.js"></script>
	<script type="text/javascript">
		console.log(this.students);
		console.log(this.profs);
		jQ uery(document).ready(function($) {
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
				selectable: true,
				eventLimit: true,
				events: [
					{% for system in systems %}
						{% if system.id!=1 && system.id!=13 && system.id!=7 && system.id!=8 %}
							{
								title: "{{system.phase}}",
								start: "{{system.start_}}",
								end: "{{system.end_}}"
							},
						{% endif %}
					{% endfor %}
			    ]
			});
			$(window).trigger('xenon.resized');
		});
	</script>
{% endblock %}
