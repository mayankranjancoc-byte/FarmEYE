"""
FarmEYE - Animal Detection & ReID Model Training Pipeline
==========================================================

This script demonstrates the complete training process for:
1. YOLOv8 Animal Detection
2. ReID Network for Individual Animal Identification
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
import albumentations as A
from albumentations.pytorch import ToTensorV2
import mlflow
import mlflow.pytorch
from ultralytics import YOLO
import numpy as np
from pathlib import Path
import cv2
from typing import Tuple, List, Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Training configuration"""
    
    # Paths
    DATA_DIR = Path("data/farmeye")
    TRAIN_DIR = DATA_DIR / "train"
    VAL_DIR = DATA_DIR / "val"
    TEST_DIR = DATA_DIR / "test"
    OUTPUT_DIR = Path("output/models")
    
    # Detection Model
    DETECTION_MODEL = "yolov8x.pt"  # Pretrained YOLOv8
    IMG_SIZE = 640
    DETECTION_EPOCHS = 300
    DETECTION_BATCH = 16
    
    # ReID Model
    REID_EMBEDDING_DIM = 512
    REID_EPOCHS = 100
    REID_BATCH = 32
    REID_LR = 1e-4
    TRIPLET_MARGIN = 0.3
    
    # Hardware
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    NUM_WORKERS = 8
    
    # MLflow
    MLFLOW_TRACKING_URI = "http://localhost:5000"
    EXPERIMENT_NAME = "farmeye_detection_reid"


# ============================================================================
# DATA AUGMENTATION
# ============================================================================

class AugmentationPipeline:
    """Advanced augmentation for livestock images"""
    
    @staticmethod
    def get_training_transforms():
        """Training augmentations with weather/lighting variations"""
        return A.Compose([
            A.RandomBrightnessContrast(
                brightness_limit=0.3,
                contrast_limit=0.3,
                p=0.5
            ),
            A.OneOf([
                A.GaussianBlur(blur_limit=3),
                A.MedianBlur(blur_limit=3),
                A.MotionBlur(blur_limit=3),
            ], p=0.3),
            A.HorizontalFlip(p=0.5),
            A.RandomRain(
                slant_lower=-10,
                slant_upper=10,
                drop_length=20,
                p=0.2
            ),
            A.RandomFog(
                fog_coef_lower=0.1,
                fog_coef_upper=0.3,
                p=0.2
            ),
            A.RandomShadow(p=0.3),
            A.HueSaturationValue(
                hue_shift_limit=20,
                sat_shift_limit=30,
                val_shift_limit=20,
                p=0.3
            ),
            A.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
            ToTensorV2()
        ], bbox_params=A.BboxParams(
            format='yolo',
            label_fields=['class_labels']
        ))
    
    @staticmethod
    def get_validation_transforms():
        """Validation transforms (no augmentation)"""
        return A.Compose([
            A.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
            ToTensorV2()
        ])


# ============================================================================
# REID NETWORK ARCHITECTURE
# ============================================================================

class ReIDNetwork(nn.Module):
    """
    Re-identification network for individual animal recognition.
    Uses ResNet50 backbone with triplet loss for metric learning.
    """
    
    def __init__(self, embedding_dim: int = 512, num_animals: int = 1000):
        super(ReIDNetwork, self).__init__()
        
        # Backbone: ResNet50 pretrained on ImageNet
        self.backbone = models.resnet50(pretrained=True)
        
        # Remove final FC layer
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        
        # Embedding layers
        self.embedding = nn.Sequential(
            nn.Linear(num_features, 1024),
            nn.BatchNorm1d(1024),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(1024, embedding_dim),
            nn.BatchNorm1d(embedding_dim)
        )
        
        # Classification head (optional, for supervised learning)
        self.classifier = nn.Linear(embedding_dim, num_animals)
        
    def forward(self, x):
        """Forward pass"""
        features = self.backbone(x)
        embeddings = self.embedding(features)
        # L2 normalize embeddings for metric learning
        embeddings = nn.functional.normalize(embeddings, p=2, dim=1)
        return embeddings
    
    def forward_classifier(self, x):
        """Forward with classification"""
        embeddings = self.forward(x)
        logits = self.classifier(embeddings)
        return embeddings, logits


# ============================================================================
# TRIPLET LOSS
# ============================================================================

class TripletLoss(nn.Module):
    """
    Triplet loss for metric learning.
    Ensures: d(anchor, positive) < d(anchor, negative) + margin
    """
    
    def __init__(self, margin: float = 0.3):
        super(TripletLoss, self).__init__()
        self.margin = margin
        
    def forward(
        self,
        anchor: torch.Tensor,
        positive: torch.Tensor,
        negative: torch.Tensor
    ) -> torch.Tensor:
        """
        Args:
            anchor: Embeddings of anchor samples (N, D)
            positive: Embeddings of positive samples (N, D)
            negative: Embeddings of negative samples (N, D)
        
        Returns:
            Triplet loss value
        """
        pos_distance = (anchor - positive).pow(2).sum(1)
        neg_distance = (anchor - negative).pow(2).sum(1)
        
        losses = torch.relu(pos_distance - neg_distance + self.margin)
        return losses.mean()


# ============================================================================
# REID DATASET
# ============================================================================

class ReIDDataset(Dataset):
    """Dataset for ReID training with triplet sampling"""
    
    def __init__(
        self,
        data_dir: Path,
        transform=None,
        triplet_sampling: bool = True
    ):
        self.data_dir = data_dir
        self.transform = transform
        self.triplet_sampling = triplet_sampling
        
        # Load dataset
        self.samples = self._load_samples()
        self.animal_to_images = self._build_index()
        
    def _load_samples(self) -> List[Tuple[Path, str]]:
        """Load all image paths and their animal IDs"""
        samples = []
        for animal_dir in self.data_dir.iterdir():
            if animal_dir.is_dir():
                animal_id = animal_dir.name
                for img_path in animal_dir.glob("*.jpg"):
                    samples.append((img_path, animal_id))
        return samples
    
    def _build_index(self) -> Dict[str, List[int]]:
        """Build index mapping animal_id -> sample indices"""
        index = {}
        for idx, (_, animal_id) in enumerate(self.samples):
            if animal_id not in index:
                index[animal_id] = []
            index[animal_id].append(idx)
        return index
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        if self.triplet_sampling:
            return self._get_triplet(idx)
        else:
            return self._get_single(idx)
    
    def _get_single(self, idx):
        """Get single sample (for validation)"""
        img_path, animal_id = self.samples[idx]
        image = cv2.imread(str(img_path))
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        if self.transform:
            image = self.transform(image=image)['image']
        
        return image, animal_id
    
    def _get_triplet(self, idx):
        """Sample anchor, positive, negative triplet"""
        # Anchor
        anchor_path, anchor_id = self.samples[idx]
        anchor_img = cv2.imread(str(anchor_path))
        anchor_img = cv2.cvtColor(anchor_img, cv2.COLOR_BGR2RGB)
        
        # Positive (same animal, different image)
        pos_indices = [i for i in self.animal_to_images[anchor_id] if i != idx]
        if len(pos_indices) == 0:
            pos_idx = idx  # Fallback
        else:
            pos_idx = np.random.choice(pos_indices)
        pos_path, _ = self.samples[pos_idx]
        pos_img = cv2.imread(str(pos_path))
        pos_img = cv2.cvtColor(pos_img, cv2.COLOR_BGR2RGB)
        
        # Negative (different animal)
        neg_animal_ids = [aid for aid in self.animal_to_images.keys() if aid != anchor_id]
        neg_animal_id = np.random.choice(neg_animal_ids)
        neg_idx = np.random.choice(self.animal_to_images[neg_animal_id])
        neg_path, _ = self.samples[neg_idx]
        neg_img = cv2.imread(str(neg_path))
        neg_img = cv2.cvtColor(neg_img, cv2.COLOR_BGR2RGB)
        
        # Apply transforms
        if self.transform:
            anchor_img = self.transform(image=anchor_img)['image']
            pos_img = self.transform(image=pos_img)['image']
            neg_img = self.transform(image=neg_img)['image']
        
        return anchor_img, pos_img, neg_img, anchor_id


# ============================================================================
# TRAINING FUNCTIONS
# ============================================================================

def train_detection_model(config: Config):
    """
    Train YOLOv8 detection model
    """
    logger.info("=" * 80)
    logger.info("TRAINING YOLOV8 DETECTION MODEL")
    logger.info("=" * 80)
    
    # Initialize MLflow
    mlflow.set_tracking_uri(config.MLFLOW_TRACKING_URI)
    mlflow.set_experiment(config.EXPERIMENT_NAME)
    
    with mlflow.start_run(run_name="yolov8_detection"):
        # Load pretrained YOLOv8
        model = YOLO(config.DETECTION_MODEL)
        
        # Log parameters
        mlflow.log_params({
            "model": "yolov8x",
            "epochs": config.DETECTION_EPOCHS,
            "batch_size": config.DETECTION_BATCH,
            "img_size": config.IMG_SIZE,
            "device": config.DEVICE
        })
        
        # Train
        results = model.train(
            data=str(config.DATA_DIR / "dataset.yaml"),
            epochs=config.DETECTION_EPOCHS,
            imgsz=config.IMG_SIZE,
            batch=config.DETECTION_BATCH,
            device=config.DEVICE,
            augment=True,
            patience=50,
            workers=config.NUM_WORKERS,
            project=str(config.OUTPUT_DIR),
            name="yolov8_detection",
            save=True,
            plots=True
        )
        
        # Log metrics
        mlflow.log_metrics({
            "mAP_0.5": results.results_dict['metrics/mAP50(B)'],
            "mAP_0.5:0.95": results.results_dict['metrics/mAP50-95(B)'],
            "precision": results.results_dict['metrics/precision(B)'],
            "recall": results.results_dict['metrics/recall(B)']
        })
        
        # Save model
        model_path = config.OUTPUT_DIR / "yolov8_detection" / "weights" / "best.pt"
        mlflow.log_artifact(str(model_path))
        
        logger.info(f"✓ Detection model saved to {model_path}")
        logger.info(f"✓ mAP@0.5 = {results.results_dict['metrics/mAP50(B)']:.4f}")


def train_reid_model(config: Config):
    """
    Train ReID network with triplet loss
    """
    logger.info("=" * 80)
    logger.info("TRAINING REID NETWORK")
    logger.info("=" * 80)
    
    # Initialize MLflow
    with mlflow.start_run(run_name="reid_network"):
        # Data loaders
        train_dataset = ReIDDataset(
            config.TRAIN_DIR / "reid",
            transform=AugmentationPipeline.get_training_transforms(),
            triplet_sampling=True
        )
        val_dataset = ReIDDataset(
            config.VAL_DIR / "reid",
            transform=AugmentationPipeline.get_validation_transforms(),
            triplet_sampling=False
        )
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=config.REID_BATCH,
            shuffle=True,
            num_workers=config.NUM_WORKERS,
            pin_memory=True
        )
        val_loader = DataLoader(
            val_dataset,
            batch_size=config.REID_BATCH,
            shuffle=False,
            num_workers=config.NUM_WORKERS
        )
        
        # Model
        num_animals = len(train_dataset.animal_to_images)
        model = ReIDNetwork(
            embedding_dim=config.REID_EMBEDDING_DIM,
            num_animals=num_animals
        ).to(config.DEVICE)
        
        # Loss and optimizer
        triplet_loss = TripletLoss(margin=config.TRIPLET_MARGIN)
        optimizer = optim.AdamW(model.parameters(), lr=config.REID_LR, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config.REID_EPOCHS)
        
        # Log parameters
        mlflow.log_params({
            "model": "ResNet50_ReID",
            "embedding_dim": config.REID_EMBEDDING_DIM,
            "epochs": config.REID_EPOCHS,
            "batch_size": config.REID_BATCH,
            "learning_rate": config.REID_LR,
            "triplet_margin": config.TRIPLET_MARGIN,
            "num_animals": num_animals
        })
        
        # Training loop
        best_val_loss = float('inf')
        
        for epoch in range(config.REID_EPOCHS):
            # Train
            model.train()
            train_loss = 0.0
            
            for batch in train_loader:
                anchor, positive, negative, _ = batch
                anchor = anchor.to(config.DEVICE)
                positive = positive.to(config.DEVICE)
                negative = negative.to(config.DEVICE)
                
                # Forward
                anchor_emb = model(anchor)
                pos_emb = model(positive)
                neg_emb = model(negative)
                
                # Loss
                loss = triplet_loss(anchor_emb, pos_emb, neg_emb)
                
                # Backward
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
            
            train_loss /= len(train_loader)
            
            # Validation
            model.eval()
            val_loss = 0.0
            
            with torch.no_grad():
                # Simple validation: compute average embedding distance
                embeddings = []
                labels = []
                
                for images, animal_ids in val_loader:
                    images = images.to(config.DEVICE)
                    embs = model(images)
                    embeddings.append(embs.cpu())
                    labels.extend(animal_ids)
                
                embeddings = torch.cat(embeddings)
                # Compute pairwise distances (simplified)
                distances = torch.cdist(embeddings, embeddings)
                val_loss = distances.mean().item()
            
            # Scheduler step
            scheduler.step()
            
            # Logging
            logger.info(
                f"Epoch [{epoch+1}/{config.REID_EPOCHS}] | "
                f"Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}"
            )
            
            mlflow.log_metrics({
                "train_loss": train_loss,
                "val_loss": val_loss,
                "learning_rate": scheduler.get_last_lr()[0]
            }, step=epoch)
            
            # Save best model
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                model_path = config.OUTPUT_DIR / "reid_best.pt"
                torch.save(model.state_dict(), model_path)
                logger.info(f"✓ Saved best model (val_loss={val_loss:.4f})")
        
        # Log final model
        mlflow.pytorch.log_model(model, "model")
        logger.info("✓ ReID training complete!")


# ============================================================================
# MAIN TRAINING PIPELINE
# ============================================================================

def main():
    """Run complete training pipeline"""
    config = Config()
    
    # Create output directory
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    logger.info("🚀 Starting FarmEYE Model Training Pipeline")
    logger.info(f"Device: {config.DEVICE}")
    logger.info(f"Data Directory: {config.DATA_DIR}")
    
    # Step 1: Train Detection Model
    train_detection_model(config)
    
    # Step 2: Train ReID Model
    train_reid_model(config)
    
    logger.info("=" * 80)
    logger.info("🎉 TRAINING COMPLETE!")
    logger.info("=" * 80)
    logger.info(f"Models saved to: {config.OUTPUT_DIR}")
    logger.info("Next steps:")
    logger.info("  1. Evaluate models on test set")
    logger.info("  2. Convert to ONNX for production")
    logger.info("  3. Deploy to TorchServe")
    logger.info("  4. Monitor performance in production")


if __name__ == "__main__":
    main()
