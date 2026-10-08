import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION_DIR = ROOT / "drizzle"


def migration_files():
    return sorted(MIGRATION_DIR.glob("[0-9][0-9][0-9][0-9]_*.sql"))


def apply_migration(db, path):
    contents = path.read_text(encoding="utf-8")
    for statement in contents.split("--> statement-breakpoint"):
        statement = statement.strip()
        if statement:
            db.execute(statement)


def apply_until(db, last_tag):
    for path in migration_files():
        apply_migration(db, path)
        if path.stem.startswith(last_tag):
            return
    raise AssertionError(f"Migration not found: {last_tag}")


class MigrationRegressionTests(unittest.TestCase):
    def test_0003_preserves_legacy_endpoints_as_disabled_records(self):
        db = sqlite3.connect(":memory:")
        db.execute("PRAGMA foreign_keys=ON")
        for path in migration_files():
            if path.stem.startswith(("0000", "0001", "0002")):
                apply_migration(db, path)
        db.execute("INSERT INTO user (id, name, username) VALUES ('user-a', 'A', 'a')")
        db.execute(
            "INSERT INTO endpoints (id, name, path, method, description, user_id) "
            "VALUES ('endpoint-a', 'legacy endpoint', '/old', 'POST', 'keep this', 'user-a')"
        )
        apply_migration(db, MIGRATION_DIR / "0003_curious_iron_monger.sql")
        row = db.execute(
            "SELECT status, channel_id, rule, remark FROM endpoints WHERE id='endpoint-a'"
        ).fetchone()
        self.assertEqual(row, ("inactive", "legacy-user-a", "{}", "keep this"))
        channel = db.execute(
            "SELECT type, webhook, status FROM channels WHERE id='legacy-user-a'"
        ).fetchone()
        self.assertEqual(channel, ("webhook", "", "inactive"))

    def test_0004_does_not_copy_nonexistent_credential_columns_as_literals(self):
        db = sqlite3.connect(":memory:")
        db.execute("PRAGMA foreign_keys=ON")
        for path in migration_files():
            if path.stem in {
                "0000_busy_tigra", "0001_chief_blade", "0002_lumpy_post",
                "0003_curious_iron_monger",
            }:
                apply_migration(db, path)
        db.execute("INSERT INTO user (id, name, username) VALUES ('user-b', 'B', 'b')")
        db.execute(
            "INSERT INTO channels (id, name, type, webhook, status, user_id) "
            "VALUES ('channel-b', 'old channel', 'dingtalk', 'https://example.com/hook', 'active', 'user-b')"
        )
        apply_migration(db, MIGRATION_DIR / "0004_cultured_excalibur.sql")
        row = db.execute("SELECT corpId, agentId FROM channels WHERE id='channel-b'").fetchone()
        self.assertEqual(row, (None, None))

    def test_all_registered_sql_migrations_complete_and_backfill_user_ids(self):
        db = sqlite3.connect(":memory:")
        db.execute("PRAGMA foreign_keys=ON")
        apply_until(db, "0002")
        db.execute("INSERT INTO user (id, name, username) VALUES ('user-c', 'C', 'c')")
        db.execute(
            "INSERT INTO endpoints (id, name, path, method, description, user_id) "
            "VALUES ('endpoint-c', 'legacy', '/old', 'POST', NULL, 'user-c')"
        )
        for path in migration_files():
            if 3 <= int(path.stem[:4]) <= 12:
                apply_migration(db, path)
        db.execute(
            "INSERT INTO push_logs (id, request_id, endpoint_id, status, response_body) "
            "VALUES ('log-c', 'request-c', 'endpoint-c', 'failed', 'old')"
        )
        apply_migration(db, MIGRATION_DIR / "0013_data_repair_and_registration_limits.sql")
        owner = db.execute("SELECT user_id FROM push_logs WHERE id='log-c'").fetchone()[0]
        self.assertEqual(owner, "user-c")
        table = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='registration_rate_limits'"
        ).fetchone()
        self.assertIsNotNone(table)

    def test_full_migration_chain_runs_on_empty_database(self):
        db = sqlite3.connect(":memory:")
        db.execute("PRAGMA foreign_keys=ON")
        for path in migration_files():
            apply_migration(db, path)
        self.assertIsNotNone(db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='registration_rate_limits'"
        ).fetchone())


if __name__ == "__main__":
    unittest.main()
