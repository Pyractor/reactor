POE = poetry run python

run:
	$(POE) src/main.py

run-ui:
	cd ui && npm run start
