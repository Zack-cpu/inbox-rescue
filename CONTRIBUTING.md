# Contributing

Start with an issue describing the user problem and a reproducible example using synthetic mail only. Never attach real emails, OAuth tokens, or credentials.

Install `pip install -e '.[dev]'`, run `pytest -q`, and open a focused pull request. Every mailbox mutation must be explicit, preserve unrelated labels, and have appropriate failure tests.
