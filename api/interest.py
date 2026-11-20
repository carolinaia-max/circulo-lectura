from typing import Annotated

from psycopg.errors import UniqueViolation

from fastapi import APIRouter, Depends, HTTPException, Path, Response

from api.auth import current_user
from api.books import BookRequest
from api.db import connect_db


# Libros que cada usuario quiere que el club compre. Cada usuario ve y
# administra solo su propia lista.
router = APIRouter(prefix="/interes", tags=["Libros de interés"])

User = Annotated[dict, Depends(current_user)]
BookId = Annotated[int, Path(ge=1, le=2147483647)]

COLUMNS = """id, isbn, titulo, autor, genero, anio_publicacion, paginas,
             sinopsis, created_at, updated_at"""

DUPLICATE = "Ya tienes en tu lista un libro con ese ISBN."
NOT_FOUND = "El libro no está en tu lista."


@router.get("")
def list_interest_books(user: User):
    with connect_db() as connection:
        return connection.execute(
            f"SELECT {COLUMNS} FROM interest_books WHERE user_id = %s ORDER BY id",
            (user["id"],),
        ).fetchall()


@router.post("", status_code=201)
def create_interest_book(data: BookRequest, user: User):
    with connect_db() as connection:
        book = connection.execute(
            f"""
            INSERT INTO interest_books (
                user_id, isbn, titulo, autor, genero, anio_publicacion, paginas, sinopsis
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, isbn) DO NOTHING
            RETURNING {COLUMNS}
            """,
            (
                user["id"],
                data.isbn,
                data.titulo,
                data.autor,
                data.genero,
                data.anio_publicacion,
                data.paginas,
                data.sinopsis or None,
            ),
        ).fetchone()

    if book is None:
        raise HTTPException(status_code=409, detail=DUPLICATE)

    return book


@router.get("/{book_id}")
def get_interest_book(book_id: BookId, user: User):
    with connect_db() as connection:
        book = connection.execute(
            f"SELECT {COLUMNS} FROM interest_books WHERE id = %s AND user_id = %s",
            (book_id, user["id"]),
        ).fetchone()

    if book is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    return book


@router.put("/{book_id}")
def update_interest_book(book_id: BookId, data: BookRequest, user: User):
    try:
        with connect_db() as connection:
            book = connection.execute(
                f"""
                UPDATE interest_books
                SET isbn = %s,
                    titulo = %s,
                    autor = %s,
                    genero = %s,
                    anio_publicacion = %s,
                    paginas = %s,
                    sinopsis = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING {COLUMNS}
                """,
                (
                    data.isbn,
                    data.titulo,
                    data.autor,
                    data.genero,
                    data.anio_publicacion,
                    data.paginas,
                    data.sinopsis or None,
                    book_id,
                    user["id"],
                ),
            ).fetchone()
    except UniqueViolation:
        raise HTTPException(status_code=409, detail=DUPLICATE)

    if book is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    return book


@router.delete("/{book_id}", status_code=204)
def delete_interest_book(book_id: BookId, user: User):
    with connect_db() as connection:
        deleted = connection.execute(
            "DELETE FROM interest_books WHERE id = %s AND user_id = %s RETURNING id",
            (book_id, user["id"]),
        ).fetchone()

    if deleted is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)

    return Response(status_code=204)
