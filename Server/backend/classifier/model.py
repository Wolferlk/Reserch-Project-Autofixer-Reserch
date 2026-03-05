import torch.nn as nn
from torchvision import models
from torchvision.models import ResNet18_Weights


class ScreenshotCNN(nn.Module):
    def __init__(self, num_classes: int, pretrained: bool = True):
        super().__init__()

        weights = ResNet18_Weights.DEFAULT if pretrained else None
        backbone = models.resnet18(weights=weights)
        in_features = backbone.fc.in_features
        backbone.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, num_classes)
        )
        self.model = backbone

    def forward(self, x):
        return self.model(x)
