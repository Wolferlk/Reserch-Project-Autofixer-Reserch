import importlib
import torch

packages = [
    "torch",
    "transformers",
    "datasets",
    "pandas",
    "numpy",
    "matplotlib",
    "sentencepiece",
    "accelerate"
]

print("🔍 Checking Python environment...\n")

all_ok = True

for pkg in packages:
    try:
        importlib.import_module(pkg)
        print(f" {pkg} - OK")
    except ImportError:
        print(f" {pkg} - NOT INSTALLED")
        all_ok = False

print("\n🖥️ PyTorch Info:")
print("CUDA Available:", torch.cuda.is_available())
print("Device:", "GPU" if torch.cuda.is_available() else "CPU")

if all_ok:
    print("\n Environment is READY for training!")
else:
    print("\nMissing dependencies found. Please install them.")
