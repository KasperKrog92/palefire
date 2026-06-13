# Git hooks

Tracked hooks for Palefire. They are not active until each clone is pointed at
this directory (a one-time, per-machine step):

```sh
git config core.hooksPath .githooks
```

## pre-commit

Blocks a commit that stages `data/palefire.db` while a non-empty
`data/palefire.db-wal` exists. A non-empty WAL means Palefire still has writes
that have not been checkpointed into the database, so committing would capture a
stale db and drop unsaved campaign data. Close Palefire (which flushes the WAL),
then commit again. Bypass once with `git commit --no-verify` if the WAL is a
known-harmless leftover.
