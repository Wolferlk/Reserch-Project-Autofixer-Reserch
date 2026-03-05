import torch
from torchvision import transforms
from PIL import Image

from backend.classifier.model import ScreenshotCNN

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "models/classifier/cnn_classifier.pt"

# Load checkpoint once
checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
classes = checkpoint["classes"]
image_size = checkpoint.get("image_size", 224)

model = ScreenshotCNN(num_classes=len(classes), pretrained=False)
model.load_state_dict(checkpoint["model_state"])
model.to(DEVICE)
model.eval()

transform = transforms.Compose([
    transforms.Resize((image_size, image_size)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

def classify_image(image_path: str):
    img = Image.open(image_path).convert("RGB")
    img = transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(img)
        probs = torch.softmax(outputs, dim=1)[0]
        pred_idx = probs.argmax().item()

    return {
        "category": classes[pred_idx],
        "confidence": round(probs[pred_idx].item(), 4)
    }
