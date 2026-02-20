.PHONY: help install run migrate shell test

help:
	@echo "Available commands:"
	@echo "  make install    - Install Python dependencies"
	@echo "  make run        - Run Django dev server"
	@echo "  make migrate    - Run database migrations"
	@echo "  make shell      - Open Django shell"
	@echo "  make test       - Run tests"

install:
	cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements/development.txt

run:
	cd backend && source venv/bin/activate && DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development python manage.py runserver

migrate:
	cd backend && source venv/bin/activate && DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development python manage.py migrate

makemigrations:
	cd backend && source venv/bin/activate && DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development python manage.py makemigrations

shell:
	cd backend && source venv/bin/activate && DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development python manage.py shell

test:
	cd backend && source venv/bin/activate && DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development python manage.py test

createsuperuser:
	cd backend && source venv/bin/activate && DJANGO_SETTINGS_MODULE=tuutta_backend.settings.development python manage.py createsuperuser
