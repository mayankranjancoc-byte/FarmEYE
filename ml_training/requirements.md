# FarmEYE ML Training Requirements

## Core Dependencies

```bash
# PyTorch ecosystem
torch>=2.0.0
torchvision>=0.15.0
torchaudio>=2.0.0

# Computer Vision
ultralytics>=8.0.0  # YOLOv8
opencv-python>=4.8.0
albumentations>=1.3.0
Pillow>=10.0.0

# Machine Learning
scikit-learn>=1.3.0
xgboost>=2.0.0
scipy>=1.11.0
numpy>=1.24.0
pandas>=2.0.0

# Deep Learning Utils
timm>=0.9.0  # Pretrained models
torchmetrics>=1.0.0

# MLOps & Experiment Tracking
mlflow>=2.8.0
wandb>=0.15.0
dvc>=3.0.0  # Data version control

# Model Serving
torchserve>=0.8.0
onnx>=1.14.0
onnxruntime>=1.16.0

# Database & Storage
psycopg2-binary>=2.9.0  # PostgreSQL
sqlalchemy>=2.0.0
redis>=5.0.0
boto3>=1.28.0  # AWS S3

# API & Web
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.4.0

# Task Queue
celery>=5.3.0
redis>=5.0.0

# Monitoring
prometheus-client>=0.18.0
evidently>=0.4.0  # ML monitoring

# Visualization
matplotlib>=3.8.0
seaborn>=0.13.0
plotly>=5.17.0

# Utils
tqdm>=4.66.0
python-dotenv>=1.0.0
pyyaml>=6.0
click>=8.1.0  # CLI
loguru>=0.7.0  # Better logging
```

## Development Dependencies

```bash
# Testing
pytest>=7.4.0
pytest-cov>=4.1.0
pytest-mock>=3.11.0

# Code Quality
black>=23.9.0  # Formatting
flake8>=6.1.0  # Linting
mypy>=1.5.0  # Type checking
isort>=5.12.0  # Import sorting

# Jupyter
jupyter>=1.0.0
ipykernel>=6.25.0
ipywidgets>=8.1.0

# Documentation
sphinx>=7.2.0
sphinx-rtd-theme>=1.3.0
```

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install PyTorch (CUDA 11.8)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install all dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt
```

## Hardware Requirements

### For Training
- GPU: NVIDIA A100 80GB (recommended) or V100 32GB
- RAM: 128GB+ recommended
- Storage: 2TB+ NVMe SSD

### For Inference (Edge)
- GPU: NVIDIA Jetson AGX Orin or Intel NUC + Coral TPU
- RAM: 16GB+
- Storage: 256GB SSD

## Docker Setup

```dockerfile
FROM pytorch/pytorch:2.0.0-cuda11.8-cudnn8-runtime

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy code
COPY . .

# Expose ports
EXPOSE 8000 5000

# Run training
CMD ["python", "ml_training/train_detection_reid.py"]
```

## Environment Variables

```bash
# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_EXPERIMENT_NAME=farmeye_ml

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/farmeye
TIMESCALE_URL=postgresql://user:pass@localhost:5432/timescale

# Redis
REDIS_URL=redis://localhost:6379

# AWS (for S3 storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=farmeye-data

# Model serving
TORCHSERVE_URL=http://localhost:8080

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```
