import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
        ('accounts', '0001_initial'),
        ('courses', '0004_rename_adaptive_r_course__8ab751_idx_adaptive_re_course__b179a3_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='LearningPath',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=500)),
                ('description', models.TextField(blank=True)),
                ('thumbnail_url', models.URLField(blank=True)),
                ('estimated_duration', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')], default='draft', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_learning_paths', to='accounts.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='learning_paths', to='organizations.organization')),
            ],
            options={
                'db_table': 'learning_paths',
            },
        ),
        migrations.CreateModel(
            name='LearningPathCourse',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('order_index', models.IntegerField(default=0)),
                ('is_required', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='learning_path_entries', to='courses.course')),
                ('learning_path', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='path_courses', to='courses.learningpath')),
                ('unlock_after', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='learning_path_unlocks', to='courses.course')),
            ],
            options={
                'db_table': 'learning_path_courses',
                'ordering': ['order_index', 'created_at'],
                'unique_together': {('learning_path', 'course')},
            },
        ),
        migrations.AddIndex(
            model_name='learningpath',
            index=models.Index(fields=['organization', 'status'], name='learning_pa_organiz_0d5e1d_idx'),
        ),
        migrations.AddIndex(
            model_name='learningpath',
            index=models.Index(fields=['created_at'], name='learning_pa_created_009639_idx'),
        ),
    ]
