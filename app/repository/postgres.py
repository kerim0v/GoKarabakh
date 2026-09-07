import os
import uuid
from datetime import datetime, timezone

import psycopg2
from psycopg2 import IntegrityError
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

from app.models.place import Place
from app.models.user import User
from app.repository.base import Repository


load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


class PostgresUserRepository(Repository):
    def __init__(self, database_url=DATABASE_URL):
        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured")
        self.database_url = database_url

    def _connect(self):
        return psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)

    @staticmethod
    def _user_from_row(row):
        user = User(0, row["name"], [], 0, 0, 0, row["email"])
        user.id = row["id"]
        user.pwd_hash = row["passwordHash"]
        user.role = row["role"]
        user.kx_count = row.get("walletBalance", 0) or 0
        user.creation_date = row["createdAt"]
        user.modification_date = row["updatedAt"]
        return user

    def add(self, user):
        try:
            with self._connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        'INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt") '
                        'VALUES (%s, %s, %s, %s, %s, %s, %s)',
                        (
                            user.id,
                            user.email,
                            user.name,
                            user.pwd_hash,
                            "USER",
                            user.creation_date,
                            user.modification_date,
                        ),
                    )
                    cursor.execute(
                        'INSERT INTO "Wallet" (id, "userId", balance, "createdAt", "updatedAt") '
                        'VALUES (%s, %s, %s, %s, %s)',
                        (str(uuid.uuid4()), user.id, 0, user.creation_date, user.modification_date),
                    )
                connection.commit()
        except IntegrityError as error:
            if "email" in str(error).lower():
                raise ValueError("An account with this email already exists") from error
            raise

    def _get_row(self, query, values):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, values)
                return cursor.fetchone()

    def get(self, obj_id):
        row = self._get_row(
            'SELECT u.*, COALESCE(w.balance, 0) AS "walletBalance" '
            'FROM "User" u LEFT JOIN "Wallet" w ON w."userId" = u.id WHERE u.id = %s',
            (obj_id,),
        )
        return self._user_from_row(row) if row else None

    def get_by_email(self, email):
        row = self._get_row(
            'SELECT u.*, COALESCE(w.balance, 0) AS "walletBalance" '
            'FROM "User" u LEFT JOIN "Wallet" w ON w."userId" = u.id '
            'WHERE LOWER(u.email) = LOWER(%s)',
            (email,),
        )
        return self._user_from_row(row) if row else None

    def get_all(self):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'SELECT u.*, COALESCE(w.balance, 0) AS "walletBalance" '
                    'FROM "User" u LEFT JOIN "Wallet" w ON w."userId" = u.id ORDER BY u."createdAt"'
                )
                return [self._user_from_row(row) for row in cursor.fetchall()]

    def update(self, obj_id, data):
        user = self.get(obj_id)
        if not user:
            return
        user.update(data)
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'UPDATE "User" SET name = %s, email = %s, "updatedAt" = %s WHERE id = %s',
                    (user.name, user.email, datetime.now(timezone.utc), obj_id),
                )
                cursor.execute(
                    'UPDATE "Wallet" SET balance = %s, "updatedAt" = %s WHERE "userId" = %s',
                    (user.kx_count, datetime.now(timezone.utc), obj_id),
                )
            connection.commit()

    def delete(self, obj_id):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute('DELETE FROM "User" WHERE id = %s', (obj_id,))
            connection.commit()


class PostgresPlaceRepository(Repository):
    def __init__(self, database_url=DATABASE_URL):
        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured")
        self.database_url = database_url

    def _connect(self):
        return psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)

    @staticmethod
    def _place_from_row(row):
        place = Place(
            row["owner_user_id"],
            row["name"],
            row["is_tour"],
            row["cost"],
            row["description"],
            row["main_photo_url"],
            row["tags"],
        )
        place.id = row["id"]
        place.creation_date = row["creation_date"]
        place.modification_date = row["modification_date"]
        return place

    def add(self, place):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'INSERT INTO "Place" '
                    '(id, owner_user_id, name, is_tour, cost, description, main_photo_url, tags, creation_date, modification_date) '
                    'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    (
                        place.id,
                        place.owner_user_id,
                        place.name,
                        place.is_tour,
                        place.cost,
                        place.description,
                        place.main_photo_url,
                        place.tags,
                        place.creation_date,
                        place.modification_date,
                    ),
                )
            connection.commit()

    def get(self, obj_id):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute('SELECT * FROM "Place" WHERE id = %s', (obj_id,))
                row = cursor.fetchone()
        return self._place_from_row(row) if row else None

    def get_all(self):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute('SELECT * FROM "Place" ORDER BY creation_date')
                return [self._place_from_row(row) for row in cursor.fetchall()]

    def update(self, obj_id, data):
        place = self.get(obj_id)
        if not place:
            return
        place.update(data)
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'UPDATE "Place" SET name = %s, is_tour = %s, cost = %s, description = %s, '
                    'main_photo_url = %s, tags = %s, modification_date = %s WHERE id = %s',
                    (
                        place.name,
                        place.is_tour,
                        place.cost,
                        place.description,
                        place.main_photo_url,
                        place.tags,
                        place.modification_date,
                        place.id,
                    ),
                )
            connection.commit()

    def delete(self, obj_id):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute('DELETE FROM "Place" WHERE id = %s', (obj_id,))
            connection.commit()


class PostgresBookingRepository:
    def __init__(self, database_url=DATABASE_URL):
        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured")
        self.database_url = database_url

    def create(self, user_id, place_id, guests, arrival_date, amount, venue_name=None):
        booking_id = str(uuid.uuid4())
        with psycopg2.connect(self.database_url, cursor_factory=RealDictCursor) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'INSERT INTO "Booking" '
                    '(id, "userId", "arrivalDate", guests, status, "createdAt", "updatedAt", "placeId", "venueName") '
                    'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    (
                        booking_id,
                        user_id,
                        arrival_date,
                        guests,
                        "PENDING",
                        arrival_date,
                        arrival_date,
                        place_id,
                        venue_name,
                    ),
                )
        return booking_id
