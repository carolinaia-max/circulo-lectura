
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row


project_folder = Path(__file__).resolve().parent.parent
load_dotenv(project_folder / ".env")


def connect_db():
    database_url = os.getenv("DATABASE_URL")

    # Producción: conexión mediante DATABASE_URL (Render)
    if database_url:
        return psycopg.connect(
            database_url,
            row_factory=dict_row,
        )

    # Desarrollo local: conexión mediante variables individuales
    return psycopg.connect(
        host=os.getenv("PGHOST", "127.0.0.1"),
        port=int(os.getenv("PGPORT", "5433")),
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        row_factory=dict_row,
    )
