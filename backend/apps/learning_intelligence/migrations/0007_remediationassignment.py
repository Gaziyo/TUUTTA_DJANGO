import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('courses', '0005_learningpath_learningpathcourse'),
        ('enrollments', '0001_initial'),
        ('learning_intelligence', '0006_gapmatrix_bloom_gap_component_gapmatrix_bloom_weight_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='RemediationAssignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('module_id', models.CharField(blank=True, max_length=100)),
                ('lesson_id', models.CharField(blank=True, max_length=100)),
                ('status', models.CharField(choices=[('assigned', 'Assigned'), ('completed', 'Completed'), ('dismissed', 'Dismissed')], default='assigned', max_length=20)),
                ('reason', models.TextField(blank=True)),
                ('scheduled_reassessment_at', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='remediation_assignments', to='courses.course')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_remediation_assignments', to='accounts.user')),
                ('enrollment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='remediation_assignments', to='enrollments.enrollment')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='remediation_assignments', to='organizations.organization')),
                ('trigger', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assignments', to='learning_intelligence.remediationtrigger')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='remediation_assignments', to='accounts.user')),
            ],
            options={
                'db_table': 'remediation_assignments',
            },
        ),
        migrations.AddIndex(
            model_name='remediationassignment',
            index=models.Index(fields=['organization', 'status'], name='remediation_organiz_b241be_idx'),
        ),
        migrations.AddIndex(
            model_name='remediationassignment',
            index=models.Index(fields=['user'], name='remediation_user_id_ae3f13_idx'),
        ),
        migrations.AddIndex(
            model_name='remediationassignment',
            index=models.Index(fields=['created_at'], name='remediation_created_b58a37_idx'),
        ),
    ]
