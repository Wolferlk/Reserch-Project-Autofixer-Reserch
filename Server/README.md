# Auto Fixer V6 - Image-Based Error Identification and Fixing Module

## Overview

This repository contains an individual contribution to the Auto Fixer V6 research project.
The module analyzes uploaded system error screenshots and returns likely error category,
OCR text, and AI-generated fixing steps.

## Updated Generator Pipeline

The generator pipeline is now standardized around KB error-fix training pairs.

1. `backend/generator/prepare_data.py`
- Reads `data/processed/training_pairs/gen_train.fixed.jsonl` and `data/processed/kb_dataset.csv`
- Cleans and deduplicates rows
- Produces `data/generator/train.csv`, `val.csv`, `test.csv`
- Produces dataset report in `data/generator/dataset_report.(txt|json)`

2. `backend/generator/train_generator.py`
- Fine-tunes `google/flan-t5-small`
- Writes model to `models/generator/`
- Writes training report to `models/generator/reports/`
- Writes training log/summary tables to `Reports/tables/`

3. `backend/evaluation/eval_generator.py`
- Runs generation over validation split
- Produces strict accuracy and token-F1 metrics for research reporting
- Writes evaluation tables to `Reports/tables/`

## End-to-End Commands

```bash
python backend/generator/prepare_data.py
python backend/generator/train_generator.py
python backend/evaluation/eval_generator.py
```

## API Use

Run backend:

```bash
uvicorn backend.app:app --reload
```

API endpoint:

- `POST /analyze` with image upload field `image`

The endpoint runs:

1. Screenshot classification
2. OCR extraction
3. KB retrieval
4. Generator-based step synthesis

## Notes for Research Reporting

Recommended generator metrics to include:

- Final training loss
- Final validation loss
- Exact-match accuracy (strict)
- Average token-F1 (recommended primary metric)
- Qualitative sample outputs
