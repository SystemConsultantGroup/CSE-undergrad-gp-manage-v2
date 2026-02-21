{% extends 'layout.swig' %}

{% block site_body %}
	{{ message }}<br><br>
	{{ error.status }}<br><br>
	{{ error.stack }}
{% endblock %}



