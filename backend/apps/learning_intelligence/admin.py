from django.contrib import admin
from .models import (
    CognitiveProfile,
    GapMatrix,
    RemediationTrigger,
    RemediationAssignment,
    AdaptivePolicy,
    AdaptiveRecommendation,
    AdaptiveDecisionLog,
    InterventionLog,
)

admin.site.register(CognitiveProfile)
admin.site.register(GapMatrix)
admin.site.register(RemediationTrigger)
admin.site.register(RemediationAssignment)
admin.site.register(AdaptivePolicy)
admin.site.register(AdaptiveRecommendation)
admin.site.register(AdaptiveDecisionLog)
admin.site.register(InterventionLog)
