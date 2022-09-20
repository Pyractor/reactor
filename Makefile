POE = poetry run python

run-dev:
	ls */*.py */**/*.py | entr -nr make run

run:
	$(POE) src/main.py

run-ui:
	cd ui && npm run start

build-ui:
	cd ui && npm run build
