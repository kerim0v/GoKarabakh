import os
import sqlite3

from flask_migrate import upgrade

from app import ROOT_DIR, create_app

MIGRATIONS = os.path.join(ROOT_DIR, "migrations")
BEFORE_TABLE_REBUILDS = "d0f86f436959"


def counts(path):
    db = sqlite3.connect(path)
    return [db.execute(f"select count(*) from {table}").fetchone()[0]
            for table in ("users", "places", "itinerary_items", "kx_transactions")]


def test_migrations_keep_existing_rows_on_sqlite(tmp_path):
    """Later migrations rebuild SQLite tables; that must not cascade-delete rows that point at them."""
    path = tmp_path / "old.db"
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": f"sqlite:///{path}"})
    with app.app_context():
        upgrade(directory=MIGRATIONS, revision=BEFORE_TABLE_REBUILDS)
        db = sqlite3.connect(path)
        db.execute("insert into users (id, kx_count, name, email, role) values ('u1', 5, 'Owner', 'o@x.com', 'owner')")
        db.execute("insert into places (id, owner_user_id, name, region, category, cost, is_active) "
                   "values ('p1', 'u1', 'Inn', 'shusha', 'hotel', 90, 1)")
        db.execute("insert into itinerary_items (id, user_id, place_id, day) values ('i1', 'u1', 'p1', 2)")
        db.execute("insert into kx_transactions (id, user_id, amount, reason) values ('k1', 'u1', 5, 'Welcome bonus')")
        db.commit()
        db.close()

        upgrade(directory=MIGRATIONS)

    assert counts(path) == [1, 1, 1, 1]
    assert sqlite3.connect(path).execute("pragma foreign_key_check").fetchall() == []
