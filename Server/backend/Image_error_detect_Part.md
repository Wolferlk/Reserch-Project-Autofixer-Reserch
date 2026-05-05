# Auto Fixer Research Project
## Image Error Detection and Fix Generation Part
## 1. Abstract

This part of the Auto Fixer research project focuses on identifying software and system-related errors directly from screenshots and then generating practical fixing steps automatically. The module accepts an uploaded image, detects the visual error category, extracts visible text using OCR, matches the extracted content with a troubleshooting knowledge base, and finally generates a professional fix plan for the user.

The goal of this part is to reduce the time users spend manually searching for solutions after seeing an error dialog, blue screen, command-line failure, installation issue, login error, or network-related warning. Instead of depending only on text typed by the user, this module works directly with screenshots, which is important because many real users share images rather than exact error messages.

This part combines computer vision, OCR, information retrieval, and text generation into one pipeline. In the current implementation, the system is fully local and built using Python for the backend and TypeScript/React for the screenshot scanner frontend. The backend exposes one main API endpoint, `POST /analyze`, which returns the image classification result, cleaned OCR text, matched knowledge-base articles, and generated repair steps.

## 2. Objective of My Part

The main objective of my part is:

- to identify the error type from an uploaded screenshot,
- to extract readable error text from the screenshot,
- to find the closest known troubleshooting article from the knowledge base,
- to generate user-friendly repair steps,
- and to present the result through the screenshot-scanner frontend.

In practical terms, this part acts as the image-based diagnosis engine of the Auto Fixer platform.

## 3. Scope of My Part

The main folders related to this part are:

- `Server/backend/classifier`
- `Server/backend/evaluation`
- `Server/backend/generator`
- `Server/backend/ocr`
- `Server/backend/retriever`
- `Server/models`
- `Server/Reports`
- `Server/data`
- `Server/requirements.txt`
- `Frontend/app/screenshot-scanner`

Each of these folders supports one stage of the full image-to-fix pipeline.

## 4. High-Level System Description

The image error detection module works as a multi-stage AI pipeline:

1. The user uploads a screenshot through the frontend screenshot scanner page.
2. The image is sent to the backend endpoint `POST /analyze`.
3. The backend stores the uploaded image temporarily in the `uploads/` folder.
4. A CNN classifier predicts the screenshot category.
5. The OCR engine extracts visible text from the screenshot.
6. The OCR text is cleaned and normalized.
7. The retriever compares the cleaned text with the troubleshooting knowledge base.
8. The best matching articles are returned.
9. A fine-tuned text generation model creates repair steps using the knowledge-base context.
10. The backend cleans, validates, deduplicates, and formats the final fix plan.
11. The frontend displays:
   - detected category,
   - confidence score,
   - OCR text,
   - best matched article,
   - and final fixing steps.

This design is important because screenshot understanding alone is not enough. The classifier gives visual context, OCR gives textual evidence, retrieval gives factual grounding, and generation improves the final readability of the instructions.

## 5. Folder-by-Folder Description

### 5.1 `Server/backend/classifier`

This folder contains the image classification component used to identify the type of screenshot.

Main files:

- `model.py`
- `train.py`
- `infer.py`
- `utils.py`
- `dataset.py`
- `evaluate.py`
- `plot_training.py`
- helper scripts such as `check_dataset.py` and `clean_dataset.py`

What it does:

- builds a screenshot classification model,
- trains the model using labeled screenshot categories,
- performs inference during runtime,
- and evaluates model performance.

Implementation details:

- The classifier model is `ScreenshotCNN`.
- It uses `torchvision.models.resnet18`.
- Pretrained ImageNet weights are used through `ResNet18_Weights.DEFAULT`.
- The final fully connected layer is replaced with:
  - `Dropout(p=0.3)`
  - `Linear(in_features, num_classes)`

Training details from `train.py`:

- Optimizer: `AdamW`
- Loss: `CrossEntropyLoss`
- Class weighting is used to reduce class imbalance effects.
- Label smoothing: `0.05`
- Learning-rate scheduling: `ReduceLROnPlateau`
- Mixed precision support is available when CUDA is present.
- Early stopping patience: `6`
- Default input image size: `224 x 224`

Data augmentation used during training:

- resize to `224 x 224`
- random horizontal flip
- random rotation
- color jitter
- normalization with ImageNet mean and standard deviation

Runtime role:

- `infer.py` loads `models/classifier/cnn_classifier.pt`
- the uploaded image is converted to RGB,
- resized and normalized,
- passed through the CNN,
- and the output class and confidence score are returned.

Output example:

- category: predicted screenshot class
- confidence: softmax probability of the top class

### 5.2 `Server/backend/ocr`

This folder contains the OCR logic used to read the text shown inside screenshots.

Main file:

- `ocr_engine.py`

What it does:

- extracts raw text from screenshots,
- retries OCR with several page segmentation modes,
- applies light preprocessing when raw-image OCR is weak,
- and normalizes OCR text into a cleaner format for retrieval and generation.

Implementation details:

- OCR engine: `pytesseract`
- Tesseract executable path is configured for Windows.
- Multiple PSM modes are tried: `6`, `4`, and `11`
- OCR whitelist contains letters, digits, and common punctuation for UI dialogs.

OCR strategy:

1. First, run OCR on the raw image.
2. If the text result is weak, apply light preprocessing.
3. Preprocessing uses grayscale conversion and image upscaling.
4. The longest acceptable OCR output is selected.

Text cleaning operations:

- remove line breaks,
- restore spaces between merged words,
- normalize punctuation spacing,
- fix common OCR mistakes,
- lowercase the text,
- remove noisy characters,
- reduce multiple spaces.

This module is important because retrieval quality heavily depends on OCR quality.

### 5.3 `Server/backend/retriever`

This folder contains the knowledge-base retrieval module.

Main file:

- `kb_retriever.py`

What it does:

- loads the troubleshooting knowledge base,
- converts knowledge-base entries into vector space,
- compares user OCR text against knowledge-base articles,
- and returns the top matching troubleshooting records.

Implementation details:

- Retrieval method: TF-IDF vectorization
- Similarity method: cosine similarity
- Vectorizer: `TfidfVectorizer`
- N-grams: `(1, 2)`
- English stop words are removed

Input fields used for indexing:

- `title`
- `tags`
- `full_text`

Saved retrieval artifacts:

- `models/retriever/tfidf.pkl`
- `models/retriever/kb_vectors.pkl`

Runtime role:

- `retriever.load()` loads the saved vectorizer and knowledge-base matrix at application startup.
- `retriever.query(cleaned_text, top_k=3)` returns the top 3 related articles.

Returned metadata:

- `error_id`
- `title`
- `steps`
- `score`

### 5.4 `Server/backend/generator`

This folder contains the text generation component used to create natural-language repair instructions.

Main files:

- `prepare_data.py`
- `train_generator.py`
- `infer_generator.py`

What it does:

- prepares training data for the generator,
- fine-tunes a text-to-text transformer model,
- and generates fixing steps during inference.

Implementation details:

- Base model: `google/flan-t5-small`
- Framework: Hugging Face Transformers
- Model type: sequence-to-sequence text generation

Dataset preparation:

- Source 1: `data/processed/training_pairs/gen_train.fixed.jsonl`
- Source 2: `data/processed/kb_dataset.csv`
- The two sources are merged.
- Input-output duplicates are removed.
- Final dataset is split into train, validation, and test sets.

Training approach:

- tokenizer: `T5Tokenizer`
- model: `T5ForConditionalGeneration`
- trainer: Hugging Face `Trainer`
- data collator: `DataCollatorForSeq2Seq`

Important training settings in the current saved run:

- learning rate: `3e-4`
- training batch size: `4`
- evaluation batch size: `4`
- current saved run epochs: `1`
- current saved run max steps: `20`

Inference role:

- `generate_fix()` creates troubleshooting steps from an input prompt
- generation uses sampling:
  - `do_sample=True`
  - `temperature=0.85`
  - `top_p=0.92`
  - `top_k=50`
- repetition controls are also used:
  - `repetition_penalty=1.4`
  - `no_repeat_ngram_size=3`

Final output control:

- generated steps are normalized,
- split into numbered steps,
- validated for quality,
- merged with knowledge-base steps,
- deduplicated,
- and trimmed into a professional fix plan.

### 5.5 `Server/backend/evaluation`

This folder contains scripts used to evaluate classifier, retriever, generator, and end-to-end behavior.

Main evaluation purposes:

- classifier accuracy measurement
- generator text-quality measurement
- retriever ranking accuracy
- dataset statistics reporting
- chart generation for research reporting

Important note:

This folder contains both:

- directly computed evaluation scripts, and
- some manually prepared or presentation-oriented scripts/reports.

Because of that, when reporting research results, it is important to separate:

- values generated from actual training/evaluation code, and
- values written manually into static summary scripts.

Examples:

- `eval_generator.py` computes exact match and token-level F1 from actual predictions.
- `eval_retriever.py` computes top-1 and top-3 retrieval accuracy.
- `dataset_report.py` computes real dataset statistics.
- `end_to_end_report.py` writes a fixed metrics table manually.
- `full_generator_report.py` contains presentation-style approximated values.

### 5.6 `Server/models`

This folder stores trained models and reusable artifacts.

Important stored items:

- `models/classifier/cnn_classifier.pt`
- `models/retriever/tfidf.pkl`
- `models/retriever/kb_vectors.pkl`
- `models/generator/`
- `models/generator/runs/20260304_181956/`
- `models/generator/reports/`

This folder represents the trained knowledge of the image-detection pipeline.

### 5.7 `Server/Reports`

This folder contains evaluation outputs, CSV tables, JSON summaries, and generated charts.

Examples:

- classifier accuracy and confusion matrix
- generator training logs
- generator evaluation summaries
- dataset summaries
- end-to-end metric table

This folder is useful for dissertation writing, result analysis, and visualization.

### 5.8 `Server/data`

This folder contains all important datasets used for this module.

Sub-areas:

- `data/classifier`
- `data/images`
- `data/generator`
- `data/processed`
- `data/kb`

This folder is the core data source for training and evaluation.

### 5.9 `Server/requirements.txt`

This file defines the Python dependency stack for the backend.

Important libraries in use:

- `fastapi`
- `uvicorn`
- `pydantic`
- `numpy`
- `pandas`
- `scikit-learn`
- `torch`
- `torchvision`
- `transformers`
- `datasets`
- `sentence-transformers`
- `pytesseract`
- `pillow`
- `opencv-python`
- `matplotlib`
- `seaborn`
- `python-dotenv`
- `requests`
- `tqdm`

### 5.10 `Frontend/app/screenshot-scanner`

This is the user-facing page for this module.

Main file:

- `Frontend/app/screenshot-scanner/page.tsx`

What it does:

- accepts screenshot upload,
- validates file format and file size,
- displays a preview,
- shows pipeline-like loading logs,
- calls `http://127.0.0.1:8001/analyze`,
- and renders the analysis output in a user-friendly way.

Frontend features:

- drag and drop upload
- preview before analysis
- loading progress simulation
- classification display
- OCR text display
- best matched article display
- AI-generated fix plan display

Frontend technologies:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React icons

## 6. Used Technologies

The technologies used in this part can be grouped as follows.

### 6.1 Backend Frameworks

- FastAPI
- Uvicorn
- Pydantic

### 6.2 Machine Learning and Deep Learning

- PyTorch
- Torchvision
- Hugging Face Transformers
- Hugging Face Datasets
- scikit-learn

### 6.3 OCR and Image Processing

- Tesseract OCR
- pytesseract
- OpenCV
- Pillow

### 6.4 Data Processing and Reporting

- pandas
- numpy
- matplotlib
- seaborn

### 6.5 Frontend Technologies

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion

## 7. Used Languages

The main programming and markup languages used in this part are:

- Python
- TypeScript
- TSX
- JavaScript ecosystem tooling
- CSS
- JSON
- CSV
- Markdown

## 8. Pipeline Description

## 8.1 Input Stage

The user uploads a screenshot from the screenshot scanner page. Supported formats include:

- PNG
- JPG
- JPEG
- WEBP

The frontend restricts file size to `10 MB`.

## 8.2 Upload and Storage Stage

The backend saves the uploaded image to a temporary file inside the `uploads/` folder using a UUID-based filename.

## 8.3 Screenshot Classification Stage

The classifier predicts which category the image belongs to. This gives a visual understanding of the error type before OCR and retrieval happen.

Current category set from the saved classifier model:

1. `Stucked_Screens`
2. `app_crash`
3. `black_screen`
4. `browser_errors`
5. `bsod`
6. `cmd_errors`
7. `dialog_errors`
8. `driver_errors`
9. `file_explorer_errors`
10. `installer_errors`
11. `login_errors`
12. `network_errors`
13. `normal_application`
14. `normal_desktop`
15. `normal_installer`
16. `normal_terminal`
17. `powershell_errors`
18. `system_notifications`
19. `update_errors`

## 8.4 OCR Stage

The OCR module extracts the textual content from the screenshot. This is especially useful for:

- dialog boxes,
- command prompt errors,
- installation failures,
- update errors,
- browser error pages,
- login issues,
- and blue screen stop codes.

## 8.5 Text Cleaning Stage

The raw OCR result is cleaned to improve search quality. This stage:

- fixes merged words,
- normalizes spacing,
- replaces common OCR mistakes,
- removes noise,
- and standardizes the text.

## 8.6 Knowledge Retrieval Stage

The cleaned OCR text is passed to the knowledge-base retriever. The retriever returns the top 3 matching records from the troubleshooting dataset.

This grounding stage prevents the generator from producing completely free-form or unsupported repair steps.

## 8.7 Fix Generation Stage

If knowledge-base matches are available, their steps are merged into the generator prompt. The generator then creates user-friendly troubleshooting instructions.

Prompt purpose:

- include known fixing context,
- include the extracted error text,
- and produce short practical steps.

## 8.8 Post-Processing Stage

The generated steps are not returned directly without checking. Instead, the backend:

- extracts numbered steps,
- validates step quality,
- removes noise,
- removes duplicates,
- merges model output with KB steps,
- and falls back to generic troubleshooting steps if necessary.

This stage is important for practical reliability.

## 8.9 Frontend Presentation Stage

The result shown to the user includes:

- classification category,
- confidence score,
- OCR text,
- best matching article,
- matched similarity score,
- and final fix plan steps.

## 9. Used Models in My Part

This part uses multiple models and model-like components rather than a single AI model.

### 9.1 Screenshot Classification Model

- Model name: custom `ScreenshotCNN`
- Backbone: `ResNet18`
- Framework: PyTorch / Torchvision
- Purpose: classify screenshot type from image appearance

Why it is used:

- visually distinguish different types of error screenshots,
- separate normal screens from problematic screens,
- and provide context even before OCR finishes.

### 9.2 OCR Model / OCR Engine

- Engine: `Tesseract OCR`
- Wrapper: `pytesseract`
- Purpose: extract visible text from screenshots

Why it is used:

- many software errors contain crucial text,
- stop codes, exception names, installer messages, and command outputs are text-heavy,
- and retrieval quality depends on readable extracted text.

### 9.3 Retrieval Model

- Model type: `TfidfVectorizer` with cosine similarity
- Framework: scikit-learn
- Purpose: retrieve the most relevant troubleshooting article

Why it is used:

- simple and efficient baseline,
- easy to train and store,
- interpretable,
- and suitable for exact or near-exact error text matching.

### 9.4 Fix Generation Model

- Base model: `google/flan-t5-small`
- Fine-tuned model type: T5 sequence-to-sequence generator
- Framework: Hugging Face Transformers
- Purpose: convert error text and KB context into readable repair steps

Why it is used:

- supports instruction-style text generation,
- works well for text-to-text tasks,
- lightweight compared to larger LLMs,
- and can be fine-tuned locally.

## 10. Dataset Description

This part uses several datasets for different stages.

### 10.1 Screenshot Classification Dataset

Path:

- `Server/data/classifier`
- raw image source preparation script references `data/images`

Dataset structure:

- train
- val
- test

Number of classes in trained model:

- `19`

Total number of processed classifier images:

- `1365`

Split totals:

- Train: `947`
- Validation: `199`
- Test: `222`

Class distribution from `Reports/classifier/dataset_report.csv`:

| Class | Train | Val | Test | Total |
|---|---:|---:|---:|---:|
| cmd_errors | 184 | 39 | 40 | 263 |
| Stucked_Screens | 142 | 30 | 32 | 204 |
| network_errors | 75 | 16 | 17 | 108 |
| dialog_errors | 72 | 15 | 16 | 103 |
| installer_errors | 63 | 13 | 15 | 91 |
| black_screen | 44 | 9 | 10 | 63 |
| bsod | 43 | 9 | 10 | 62 |
| browser_errors | 39 | 8 | 10 | 57 |
| update_errors | 39 | 8 | 9 | 56 |
| login_errors | 39 | 8 | 9 | 56 |
| powershell_errors | 35 | 7 | 8 | 50 |
| normal_application | 32 | 7 | 8 | 47 |
| file_explorer_errors | 30 | 6 | 7 | 43 |
| normal_desktop | 26 | 5 | 7 | 38 |
| driver_errors | 26 | 5 | 7 | 38 |
| system_notifications | 23 | 4 | 6 | 33 |
| normal_terminal | 17 | 3 | 5 | 25 |
| app_crash | 16 | 3 | 4 | 23 |
| normal_installer | 2 | 1 | 2 | 5 |

Dataset observations:

- the dataset is clearly imbalanced,
- `cmd_errors` and `Stucked_Screens` dominate the dataset,
- `normal_installer` has only 5 images in total,
- and this imbalance directly affects per-class accuracy.

### 10.2 Knowledge Base Dataset

Path:

- `Server/data/processed/kb_dataset.csv`

Columns:

- `error_id`
- `title`
- `tags`
- `full_text`
- `steps`

Real dataset statistics from `Reports/tables/dataset_summary.csv`:

- Total knowledge-base articles: `899`
- Average steps per article: `9.48`
- Average full text length: `617.85` characters

Most frequent tags observed in the dataset:

- windows
- error
- troubleshooting
- application
- security
- crash
- device
- network
- common_error
- performance
- hardware
- storage
- stability
- dll
- driver

Purpose of this dataset:

- train the retriever,
- support grounding for step generation,
- and provide structured troubleshooting steps.

### 10.3 Generator Training Pair Dataset

Path:

- `Server/data/processed/training_pairs/gen_train.fixed.jsonl`

Recorded row count:

- `199` training-pair entries

Purpose:

- provide explicit input-output examples for the generator,
- improve instruction generation beyond direct KB copy,
- and teach the generator how to phrase steps clearly.

### 10.4 Final Generator Dataset

Prepared by:

- `Server/backend/generator/prepare_data.py`

Sources merged:

- `199` rows from training pairs
- `899` rows from KB CSV
- final deduplicated total: `1093`

Saved split:

- Train: `874`
- Validation: `109`
- Test: `110`

Split ratio:

- `80 / 10 / 10`

Important note:

The raw source total is `1098`, but the final saved dataset is `1093` after cleaning and duplicate removal.

## 11. Accuracy and Performance

## 11.1 Classifier Performance

Source:

- `Server/Reports/classifier/summary.json`

Saved classifier metrics:

- Best validation accuracy: `0.7148`
- Final training accuracy: `0.9482`
- Final validation accuracy: `0.7109`
- Test accuracy: `0.6441`
- Best epoch: `7`
- Epochs requested: `10`
- Device used for saved run: `CPU`

Interpretation:

- the training accuracy is much higher than the test accuracy,
- therefore the model learned useful visual patterns,
- but there is still a noticeable generalization gap,
- likely caused by class imbalance, screenshot diversity, and limited data in some categories.

Class-wise performance examples from `classification_report.csv`:

- `dialog_errors` F1-score: `0.9375`
- `cmd_errors` F1-score: `0.8000`
- `system_notifications` F1-score: `1.0000`
- `update_errors` F1-score: `0.8571`
- `normal_terminal` F1-score: `0.0000`
- `normal_installer` F1-score: `0.1333`

This shows that the model performs well on some visually distinctive categories, but weakly on very small or ambiguous classes.

## 11.2 OCR Performance

There is no separate automated OCR benchmark file stored for this module, but the project includes an estimated OCR score inside the combined end-to-end report.

Value from `Reports/tables/end_to_end_metrics.csv`:

- OCR accuracy estimate: `0.88`

Important note:

This value comes from a manually summarized end-to-end table, not from a dedicated OCR evaluation script stored in this module. Therefore, it should be reported as an estimated project metric, not as a directly reproducible benchmark.

## 11.3 Retriever Performance

The repository contains a real evaluation script for retriever accuracy:

- `Server/backend/evaluation/eval_retriever.py`

It measures:

- top-1 accuracy
- top-3 accuracy

The combined end-to-end metrics table currently records:

- Retriever top-3 accuracy: `0.91`

Important note:

This `0.91` value is available in the saved end-to-end metrics CSV, but the generated `retriever_accuracy.csv` file is not currently stored in `Server/Reports/tables`. So for a formal report, this value should be described carefully as a saved project summary value unless the script is rerun and exported again.

## 11.4 Generator Performance

### A. Saved training report

Source:

- `Server/models/generator/reports/training_report.json`

Saved run details:

- Model: `google/flan-t5-small`
- Train samples: `874`
- Validation samples: `109`
- Epochs in saved run: `1`
- Max training steps: `20`
- Device: `CPU`
- Final train loss: `2.7131`
- Final eval loss: `2.1154`
- Training time: `11.55` minutes

### B. Saved generator evaluation

Source:

- `Server/Reports/tables/generator_eval_summary.json`

Saved evaluation results:

- Samples evaluated: `10`
- Exact match accuracy: `0.0000`
- Average token F1: `0.2124`

Interpretation:

- strict exact-match is too harsh for text generation,
- token-level F1 is more meaningful because multiple valid solutions can exist for the same error,
- and the evaluation sample size here is small, so these values should be interpreted carefully.

### C. Manual presentation metrics also present in repository

The project also contains a manual end-to-end summary file with:

- Generator BLEU: `0.41`
- Generator ROUGE-L: `0.63`
- Human relevance score: `4.6`

These appear in:

- `Server/Reports/tables/end_to_end_metrics.csv`
- `Server/backend/evaluation/end_to_end_report.py`

Important note:

These are useful for presentation and dissertation summary tables, but in the current repository they are written as fixed values rather than being generated directly from the stored evaluation pipeline. Therefore, they should be clearly labeled as project summary metrics.

## 11.5 End-to-End Performance Summary

The image error detection system is successful at integrating multiple AI stages into one working pipeline:

- visual classification,
- OCR extraction,
- knowledge retrieval,
- and fix generation.

The strongest parts currently are:

- practical end-to-end usability,
- good retrieval grounding,
- good performance on visually strong classes,
- and a clear user-facing frontend flow.

The weaker parts currently are:

- classifier imbalance,
- small sample counts for several classes,
- limited reproducible OCR benchmarking,
- and the generator evaluation still being lightweight compared with a full large-scale text-generation benchmark.

## 12. API Behavior of My Part

Main endpoint:

- `POST /analyze`

Input:

- multipart form upload
- field name: `image`

Main processing stages inside `backend/app.py`:

1. save image
2. classify screenshot
3. run OCR
4. query knowledge base
5. generate fix plan
6. return final structured response

Main response fields:

- `image_id`
- `image_classification`
- `ocr_text`
- `clean_text`
- `matched_articles`
- `generated_fix`
- `fix_plan_steps`

## 13. Why This Part Is Important

This module is important to the overall project because many users do not know how to describe their computer problem in technical language. However, they can often take a screenshot. By converting screenshots into meaningful troubleshooting plans, this part makes the Auto Fixer system more practical, more accessible, and more user-centered.

It also acts as a bridge between visual computing and troubleshooting intelligence:

- the classifier understands the visual form of the error,
- OCR extracts textual clues,
- the retriever links the issue to structured knowledge,
- and the generator makes the solution readable.

## 14. Strengths of My Part

- End-to-end screenshot-to-solution pipeline is implemented and working.
- Uses both vision and text rather than only one modality.
- Integrates classification, OCR, retrieval, and generation into a single API.
- Uses grounding from the knowledge base before generating solutions.
- Includes frontend visualization for user interaction.
- Saves reports, charts, and model artifacts for research documentation.
- Uses modular folder separation, making the pipeline easier to maintain.

## 15. Limitations of My Part

- Class imbalance is high in the screenshot classification dataset.
- Some classes have very small sample counts.
- OCR quality can still drop for blurred, low-resolution, or stylized screenshots.
- Tesseract path is Windows-specific in the current code.
- Generator evaluation is currently limited and partly mixed with manual summary metrics.
- The saved generator run is very small in the current report (`1` epoch, `20` max steps), so more training is still possible.
- The retriever currently uses TF-IDF only; semantic embedding retrieval could improve difficult matches.

## 16. Possible Future Improvements

- collect more images for underrepresented classes,
- reduce dataset imbalance,
- add better OCR benchmarking,
- add semantic retrieval using sentence embeddings,
- train the generator for more epochs with larger evaluation sets,
- add confidence fusion between classifier and OCR-retriever stages,
- support multilingual OCR,
- and add screenshot region detection to focus on the real error area only.

## 17. Final Conclusion

My part of the Auto Fixer research project is the image-based error identification and fixing pipeline. It starts from a screenshot and produces a structured troubleshooting result. Technically, it combines:

- a ResNet18-based screenshot classifier,
- Tesseract OCR,
- a TF-IDF retrieval system,
- and a FLAN-T5-small fix-step generator.

Based on the code and saved reports in the repository, this part is already a complete working research component with:

- dataset preparation,
- model training,
- runtime inference,
- evaluation scripts,
- stored artifacts,
- and a frontend interface.

The current results show that the approach is practical and promising, especially for automatic troubleshooting from screenshots. At the same time, the reports also show clear areas for improvement, especially in class balance, generator evaluation depth, and stricter reproducible end-to-end benchmarking.
