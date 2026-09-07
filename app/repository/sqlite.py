import sqlite3
from datetime import datetime
import json
from pathlib import Path

from app.models.place import Place
from app.models.user import User
from app.repository.base import Repository


DATABASE_PATH = Path(__file__).resolve().parents[2] / "gokarabakh.db"


class SQLiteUserRepository(Repository):
    def __init__(self, database_path=DATABASE_PATH):
        self.database_path = database_path
        self._create_table()

    def _connect(self):
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _create_table(self):
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    kx_count REAL NOT NULL DEFAULT 0,
                    name TEXT NOT NULL,
                    year_of_birth INTEGER NOT NULL DEFAULT 0,
                    month_of_birth INTEGER NOT NULL DEFAULT 0,
                    day_of_birth INTEGER NOT NULL DEFAULT 0,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    pwd_hash TEXT NOT NULL,
                    creation_date TEXT NOT NULL,
                    modification_date TEXT NOT NULL
                )
                """
            )

    @staticmethod
    def _user_from_row(row):
        user = User(
            row["kx_count"],
            row["name"],
            [],
            row["year_of_birth"],
            row["month_of_birth"],
            row["day_of_birth"],
            row["email"],
        )
        user.id = row["id"]
        user.pwd_hash = row["pwd_hash"]
        user.creation_date = datetime.fromisoformat(row["creation_date"])
        user.modification_date = datetime.fromisoformat(row["modification_date"])
        return user

    def add(self, user):
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO users (
                        id, kx_count, name, year_of_birth, month_of_birth,
                        day_of_birth, email, pwd_hash, creation_date,
                        modification_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user.id,
                        user.kx_count,
                        user.name,
                        user.year_of_birth,
                        user.month_of_birth,
                        user.day_of_birth,
                        user.email,
                        user.pwd_hash,
                        user.creation_date.isoformat(),
                        user.modification_date.isoformat(),
                    ),
                )
        except sqlite3.IntegrityError as error:
            if "email" in str(error).lower():
                raise ValueError("An account with this email already exists") from error
            raise

    def get(self, obj_id):
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE id = ?", (obj_id,)).fetchone()
        return self._user_from_row(row) if row else None

    def get_by_email(self, email):
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return self._user_from_row(row) if row else None

    def get_all(self):
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM users ORDER BY creation_date").fetchall()
        return [self._user_from_row(row) for row in rows]

    def update(self, obj_id, data):
        user = self.get(obj_id)
        if not user:
            return
        user.update(data)
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE users
                SET kx_count = ?, name = ?, year_of_birth = ?, month_of_birth = ?,
                    day_of_birth = ?, email = ?, pwd_hash = ?, modification_date = ?
                WHERE id = ?
                """,
                (
                    user.kx_count,
                    user.name,
                    user.year_of_birth,
                    user.month_of_birth,
                    user.day_of_birth,
                    user.email,
                    user.pwd_hash,
                    user.modification_date.isoformat(),
                    user.id,
                ),
            )

    def delete(self, obj_id):
        with self._connect() as connection:
            connection.execute("DELETE FROM users WHERE id = ?", (obj_id,))


class SQLitePlaceRepository(Repository):
    def __init__(self, database_path=DATABASE_PATH):
        self.database_path = database_path
        self._create_table()

    def _connect(self):
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _create_table(self):
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS places (
                    id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    is_tour INTEGER NOT NULL DEFAULT 0,
                    cost REAL NOT NULL,
                    description TEXT NOT NULL,
                    main_photo_url TEXT NOT NULL,
                    tags TEXT NOT NULL DEFAULT '[]',
                    creation_date TEXT NOT NULL,
                    modification_date TEXT NOT NULL
                )
                """
            )

    @staticmethod
    def _place_from_row(row):
        place = Place(
            row["owner_user_id"],
            row["name"],
            bool(row["is_tour"]),
            row["cost"],
            row["description"],
            row["main_photo_url"],
            json.loads(row["tags"]),
        )
        place.id = row["id"]
        place.creation_date = datetime.fromisoformat(row["creation_date"])
        place.modification_date = datetime.fromisoformat(row["modification_date"])
        return place

    def add(self, place):
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO places (
                    id, owner_user_id, name, is_tour, cost, description,
                    main_photo_url, tags, creation_date, modification_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    place.id,
                    place.owner_user_id,
                    place.name,
                    int(place.is_tour),
                    place.cost,
                    place.description,
                    place.main_photo_url,
                    json.dumps(place.tags),
                    place.creation_date.isoformat(),
                    place.modification_date.isoformat(),
                ),
            )

    def get(self, obj_id):
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM places WHERE id = ?", (obj_id,)).fetchone()
        return self._place_from_row(row) if row else None

    def get_all(self):
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM places ORDER BY creation_date").fetchall()
        return [self._place_from_row(row) for row in rows]

    def update(self, obj_id, data):
        place = self.get(obj_id)
        if not place:
            return
        place.update(data)
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE places
                SET name = ?, is_tour = ?, cost = ?, description = ?,
                    main_photo_url = ?, tags = ?, modification_date = ?
                WHERE id = ?
                """,
                (
                    place.name,
                    int(place.is_tour),
                    place.cost,
                    place.description,
                    place.main_photo_url,
                    json.dumps(place.tags),
                    place.modification_date.isoformat(),
                    place.id,
                ),
            )

    def delete(self, obj_id):
        with self._connect() as connection:
            connection.execute("DELETE FROM places WHERE id = ?", (obj_id,))
