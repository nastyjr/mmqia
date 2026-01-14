#!/bin/bash
source venv/bin/activate
uvicorn python_server.main:app --host 0.0.0.0 --port 3001 --reload
