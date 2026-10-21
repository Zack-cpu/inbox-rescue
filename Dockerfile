FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml README.md ./
COPY rescue ./rescue
RUN pip install --no-cache-dir . && useradd --create-home rescue && mkdir /app/data && chown rescue:rescue /app/data
USER rescue
EXPOSE 8000
CMD ["uvicorn", "rescue.app:app", "--host", "0.0.0.0", "--port", "8000"]
