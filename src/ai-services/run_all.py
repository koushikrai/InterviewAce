import subprocess
# To start all three FastAPI apps in one terminal
services = [
    ["uvicorn", "resume_parser:app", "--host", "0.0.0.0", "--port", "8001"],
    ["uvicorn", "interview_generator:app", "--host", "0.0.0.0", "--port", "8002"],
    ["uvicorn", "answer_feedback:app", "--host", "0.0.0.0", "--port", "8003"]
]

processes = []
try:
    for service in services:
        p = subprocess.Popen(service)
        processes.append(p)

    # Keep script running
    for p in processes:
        p.wait()

except KeyboardInterrupt:
    print("Stopping all services...")
    for p in processes:
        p.terminate()
