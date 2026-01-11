"""
FarmEYE - Health Risk Prediction Model Training
================================================

Multi-input neural network combining:
- LSTM for time-series (activity, visits, speed)
- Dense layers for tabular features (age, weight, history)
- CNN for visual features (body condition)
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import xgboost as xgb
import mlflow
import mlflow.pytorch
from pathlib import Path
from typing import Tuple, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

class HealthConfig:
    """Health model training configuration"""
    
    # Paths
    DATA_DIR = Path("data/farmeye/health")
    OUTPUT_DIR = Path("output/models/health")
    
    # Model architecture
    LSTM_HIDDEN = 128
    LSTM_LAYERS = 2
    DENSE_HIDDEN = [256, 128, 64]
    DROPOUT = 0.3
    
    # Training
    EPOCHS = 100
    BATCH_SIZE = 64
    LEARNING_RATE = 1e-4
    WEIGHT_DECAY = 1e-4
    
    # Features
    SEQUENCE_LENGTH = 168  # 7 days * 24 hours
    NUM_TABULAR_FEATURES = 15
    NUM_VISUAL_FEATURES = 512  # From pretrained ResNet
    
    # Hardware
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    NUM_WORKERS = 4


# ============================================================================
# FEATURE ENGINEERING
# ============================================================================

class FeatureEngine:
    """Extract and engineer features for health prediction"""
    
    @staticmethod
    def engineer_time_series_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate time-series features from detection events
        
        Args:
            df: DataFrame with columns [animal_id, timestamp, activity, speed]
        
        Returns:
            DataFrame with engineered features
        """
        features = []
        
        for animal_id in df['animal_id'].unique():
            animal_df = df[df['animal_id'] == animal_id].sort_values('timestamp')
            
            # Rolling statistics (24h, 48h, 7d windows)
            for window in [24, 48, 168]:
                animal_df[f'activity_mean_{window}h'] = \
                    animal_df['activity'].rolling(window, min_periods=1).mean()
                animal_df[f'activity_std_{window}h'] = \
                    animal_df['activity'].rolling(window, min_periods=1).std()
                animal_df[f'speed_mean_{window}h'] = \
                    animal_df['speed'].rolling(window, min_periods=1).mean()
                animal_df[f'speed_std_{window}h'] = \
                    animal_df['speed'].rolling(window, min_periods=1).std()
            
            # Visit frequency
            animal_df['visits_24h'] = \
                animal_df.rolling('24h', on='timestamp').size()
            animal_df['visits_48h'] = \
                animal_df.rolling('48h', on='timestamp').size()
            
            # Baseline deviation
            baseline_activity = animal_df['activity'].quantile(0.5)
            animal_df['activity_deviation'] = \
                (baseline_activity - animal_df['activity']) / baseline_activity
            
            # Behavioral patterns
            animal_df['hour'] = animal_df['timestamp'].dt.hour
            animal_df['is_night'] = animal_df['hour'].apply(lambda h: 1 if h < 6 or h > 20 else 0)
            animal_df['night_activity_ratio'] = \
                animal_df.groupby('is_night')['activity'].transform('mean')
            
            features.append(animal_df)
        
        return pd.concat(features, ignore_index=True)
    
    @staticmethod
    def create_sequences(
        df: pd.DataFrame,
        sequence_length: int = 168
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create time-series sequences
        
        Returns:
            X: sequences of shape (num_samples, sequence_length, num_features)
            y: health risk scores of shape (num_samples,)
        """
        sequences = []
        targets = []
        
        feature_cols = [col for col in df.columns if col not in 
                       ['animal_id', 'timestamp', 'health_score']]
        
        for animal_id in df['animal_id'].unique():
            animal_df = df[df['animal_id'] == animal_id].sort_values('timestamp')
            
            for i in range(len(animal_df) - sequence_length):
                seq = animal_df[feature_cols].iloc[i:i+sequence_length].values
                target = animal_df['health_score'].iloc[i+sequence_length]
                
                sequences.append(seq)
                targets.append(target)
        
        return np.array(sequences), np.array(targets)


# ============================================================================
# HEALTH PREDICTION MODEL
# ============================================================================

class HealthPredictionModel(nn.Module):
    """
    Multi-input neural network for health risk prediction
    
    Inputs:
        1. Time-series: (batch, seq_len, time_features) -> LSTM
        2. Tabular: (batch, tabular_features) -> Dense
        3. Visual: (batch, visual_features) -> Dense
    
    Output:
        Health risk score: (batch, 1) in range [0, 100]
    """
    
    def __init__(
        self,
        time_series_dim: int,
        tabular_dim: int,
        visual_dim: int,
        lstm_hidden: int = 128,
        lstm_layers: int = 2,
        dense_hidden: list = [256, 128, 64],
        dropout: float = 0.3
    ):
        super(HealthPredictionModel, self).__init__()
        
        # LSTM for time-series
        self.lstm = nn.LSTM(
            input_size=time_series_dim,
            hidden_size=lstm_hidden,
            num_layers=lstm_layers,
            batch_first=True,
            dropout=dropout if lstm_layers > 1 else 0
        )
        
        # Dense for tabular features
        self.tabular_net = nn.Sequential(
            nn.Linear(tabular_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.ReLU()
        )
        
        # Dense for visual features
        self.visual_net = nn.Sequential(
            nn.Linear(visual_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.ReLU()
        )
        
        # Fusion network
        fusion_input_dim = lstm_hidden + 64 + 128
        layers = []
        prev_dim = fusion_input_dim
        
        for hidden_dim in dense_hidden:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout)
            ])
            prev_dim = hidden_dim
        
        # Output layer
        layers.append(nn.Linear(prev_dim, 1))
        layers.append(nn.Sigmoid())  # Output in [0, 1], scale to [0, 100]
        
        self.fusion_net = nn.Sequential(*layers)
    
    def forward(
        self,
        time_series: torch.Tensor,
        tabular: torch.Tensor,
        visual: torch.Tensor
    ) -> torch.Tensor:
        """
        Forward pass
        
        Args:
            time_series: (batch, seq_len, time_features)
            tabular: (batch, tabular_features)
            visual: (batch, visual_features)
        
        Returns:
            Health risk scores: (batch, 1) in range [0, 100]
        """
        # LSTM branch
        lstm_out, (h_n, c_n) = self.lstm(time_series)
        lstm_features = h_n[-1]  # Last hidden state
        
        # Tabular branch
        tabular_features = self.tabular_net(tabular)
        
        # Visual branch
        visual_features = self.visual_net(visual)
        
        # Concatenate all features
        combined = torch.cat([lstm_features, tabular_features, visual_features], dim=1)
        
        # Fusion and prediction
        output = self.fusion_net(combined)
        
        # Scale to [0, 100]
        output = output * 100
        
        return output


# ============================================================================
# DATASET
# ============================================================================

class HealthDataset(Dataset):
    """Dataset for health prediction"""
    
    def __init__(
        self,
        time_series: np.ndarray,
        tabular: np.ndarray,
        visual: np.ndarray,
        targets: np.ndarray
    ):
        self.time_series = torch.FloatTensor(time_series)
        self.tabular = torch.FloatTensor(tabular)
        self.visual = torch.FloatTensor(visual)
        self.targets = torch.FloatTensor(targets)
    
    def __len__(self):
        return len(self.targets)
    
    def __getitem__(self, idx):
        return (
            self.time_series[idx],
            self.tabular[idx],
            self.visual[idx],
            self.targets[idx]
        )


# ============================================================================
# TRAINING FUNCTION
# ============================================================================

def train_health_model(config: HealthConfig):
    """Train multi-input health prediction model"""
    
    logger.info("=" * 80)
    logger.info("TRAINING HEALTH PREDICTION MODEL")
    logger.info("=" * 80)
    
    # MLflow tracking
    mlflow.set_experiment("farmeye_health_prediction")
    
    with mlflow.start_run(run_name="multi_input_nn"):
        # Load data (placeholder - replace with actual data loading)
        logger.info("Loading and preprocessing data...")
        
        # For demonstration, create synthetic data
        num_samples = 10000
        time_series = np.random.randn(num_samples, config.SEQUENCE_LENGTH, 5)
        tabular = np.random.randn(num_samples, config.NUM_TABULAR_FEATURES)
        visual = np.random.randn(num_samples, config.NUM_VISUAL_FEATURES)
        targets = np.random.rand(num_samples) * 100
        
        # Train/val split
        indices = np.arange(num_samples)
        train_idx, val_idx = train_test_split(indices, test_size=0.2, random_state=42)
        
        train_dataset = HealthDataset(
            time_series[train_idx],
            tabular[train_idx],
            visual[train_idx],
            targets[train_idx]
        )
        val_dataset = HealthDataset(
            time_series[val_idx],
            tabular[val_idx],
            visual[val_idx],
            targets[val_idx]
        )
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=True,
            num_workers=config.NUM_WORKERS
        )
        val_loader = DataLoader(
            val_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=False,
            num_workers=config.NUM_WORKERS
        )
        
        # Model
        model = HealthPredictionModel(
            time_series_dim=5,
            tabular_dim=config.NUM_TABULAR_FEATURES,
            visual_dim=config.NUM_VISUAL_FEATURES,
            lstm_hidden=config.LSTM_HIDDEN,
            lstm_layers=config.LSTM_LAYERS,
            dense_hidden=config.DENSE_HIDDEN,
            dropout=config.DROPOUT
        ).to(config.DEVICE)
        
        # Loss and optimizer
        criterion = nn.MSELoss()
        optimizer = optim.Adam(
            model.parameters(),
            lr=config.LEARNING_RATE,
            weight_decay=config.WEIGHT_DECAY
        )
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode='min',
            patience=10,
            factor=0.5
        )
        
        # Log parameters
        mlflow.log_params({
            "model": "MultiInputNN",
            "lstm_hidden": config.LSTM_HIDDEN,
            "lstm_layers": config.LSTM_LAYERS,
            "dense_hidden": config.DENSE_HIDDEN,
            "dropout": config.DROPOUT,
            "epochs": config.EPOCHS,
            "batch_size": config.BATCH_SIZE,
            "learning_rate": config.LEARNING_RATE
        })
        
        # Training loop
        best_val_mae = float('inf')
        
        for epoch in range(config.EPOCHS):
            # Train
            model.train()
            train_loss = 0.0
            
            for ts, tab, vis, target in train_loader:
                ts = ts.to(config.DEVICE)
                tab = tab.to(config.DEVICE)
                vis = vis.to(config.DEVICE)
                target = target.to(config.DEVICE).unsqueeze(1)
                
                # Forward
                output = model(ts, tab, vis)
                loss = criterion(output, target)
                
                # Backward
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
            
            train_loss /= len(train_loader)
            
            # Validation
            model.eval()
            val_loss = 0.0
            val_mae = 0.0
            
            with torch.no_grad():
                for ts, tab, vis, target in val_loader:
                    ts = ts.to(config.DEVICE)
                    tab = tab.to(config.DEVICE)
                    vis = vis.to(config.DEVICE)
                    target = target.to(config.DEVICE).unsqueeze(1)
                    
                    output = model(ts, tab, vis)
                    loss = criterion(output, target)
                    mae = torch.abs(output - target).mean()
                    
                    val_loss += loss.item()
                    val_mae += mae.item()
            
            val_loss /= len(val_loader)
            val_mae /= len(val_loader)
            
            # Scheduler step
            scheduler.step(val_loss)
            
            # Logging
            logger.info(
                f"Epoch [{epoch+1}/{config.EPOCHS}] | "
                f"Train Loss: {train_loss:.4f} | "
                f"Val Loss: {val_loss:.4f} | "
                f"Val MAE: {val_mae:.2f}"
            )
            
            mlflow.log_metrics({
                "train_mse": train_loss,
                "val_mse": val_loss,
                "val_mae": val_mae,
                "learning_rate": optimizer.param_groups[0]['lr']
            }, step=epoch)
            
            # Save best model
            if val_mae < best_val_mae:
                best_val_mae = val_mae
                model_path = config.OUTPUT_DIR / "health_model_best.pt"
                config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                torch.save(model.state_dict(), model_path)
                logger.info(f"✓ Saved best model (MAE={val_mae:.2f})")
        
        # Log final model
        mlflow.pytorch.log_model(model, "model")
        logger.info("✓ Health model training complete!")
        logger.info(f"Best validation MAE: {best_val_mae:.2f} points")


# ============================================================================
# ENSEMBLE WITH XGBOOST
# ============================================================================

def train_xgboost_ensemble(config: HealthConfig):
    """Train XGBoost model for ensemble"""
    
    logger.info("Training XGBoost ensemble model...")
    
    # Load features (placeholder)
    num_samples = 10000
    X = np.random.randn(num_samples, 50)
    y = np.random.rand(num_samples) * 100
    
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train XGBoost
    model = xgb.XGBRegressor(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.01,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=50,
        verbose=50
    )
    
    # Save
    model_path = config.OUTPUT_DIR / "xgboost_model.json"
    model.save_model(str(model_path))
    logger.info(f"✓ XGBoost model saved to {model_path}")


# ============================================================================
# MAIN
# ============================================================================

def main():
    config = HealthConfig()
    
    logger.info("🚀 Starting Health Model Training")
    logger.info(f"Device: {config.DEVICE}")
    
    # Train neural network
    train_health_model(config)
    
    # Train XGBoost
    train_xgboost_ensemble(config)
    
    logger.info("=" * 80)
    logger.info("🎉 TRAINING COMPLETE!")
    logger.info("=" * 80)


if __name__ == "__main__":
    main()
