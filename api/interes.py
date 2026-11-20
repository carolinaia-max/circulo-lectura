from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from pydantic import BaseModel, Field, field_validator

from api.auth import current_user
from api.books import RequiredText
from api.db import connect_db


# Libros que cada usuario quiere que el club compre. Cada usuario ve y
# modifica solo su propia lista.
router = APIRouter(
    prefix="/interes",
    tags=["Libros de interés"],
    dependencies=[Depends(current_user)],
)

User = Annotated[dict, Depends(current_user)]


class InteresRequest(BaseModel):
    titulo: RequiredText
    autor: RequiredText
    anio_publicacion: int = Field(strict=True)

    @field_validator("anio_publicacion")
    @classmethod
    def check_year(cls, year: int) -> int:
        if year < 1 or year > date.today().year:
            raise ValueError("El año de publicación no es válido.")
        return year


@router.get("")
def list_interes(user: User):
    with connect_db() as connection:
        return connection.execute(
            """
            SELECT id, titulo, autor, anio_publicacion, created_at
            FROM libros_interes
            WHERE user_id = %s
            ORDER BY created_at, id
            """,
            (user["id"],),
        ).fetchall()


@router.post("", status_code=201)
def create_interes(data: InteresRequest, user: User):
    with connect_db() as connection:
        # El índice libros_interes_unico impide repetir título y autor
        # (sin distinguir mayúsculas) en la lista del mismo usuario.
        libro = connection.execute(
            """
            INSERT INTO libros_interes (user_id, titulo, autor, anio_publicacion)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id, titulo, autor, anio_publicacion, created_at
            """,
            (user["id"], data.titulo, data.autor, data.anio_publicacion),
        ).fetchone()

    if libro is None:
        raise HTTPException(status_code=409, detail="Ese libro ya está en la lista.")

    return libro


@router.delete("/{libro_id}", status_code=204)
def delete_interes(
    libro_id: Annotated[int, Path(ge=1, le=2147483647)],
    user: User,
):
    with connect_db() as connection:
        borrado = connection.execute(
            "DELETE FROM libros_interes WHERE id = %s AND user_id = %s RETURNING id",
            (libro_id, user["id"]),
        ).fetchone()

    if borrado is None:
        raise HTTPException(status_code=404, detail="El libro no está en la lista.")

    return Response(status_code=204)
