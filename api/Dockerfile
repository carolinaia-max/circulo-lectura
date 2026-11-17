FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./api

EXPOSE 8000

CMD ["sh", "-c", "python -m api.migrate && if [ \"${ENABLE_DEMO_SEED:-false}\" = \"true\" ]; then python -m api.seed; fi && exec python -m uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]