from django.contrib import admin
from .models import CompetencyFramework, Competency, RoleCompetencyMapping, CompliancePolicy

admin.site.register(CompetencyFramework)
admin.site.register(Competency)
admin.site.register(RoleCompetencyMapping)
admin.site.register(CompliancePolicy)
