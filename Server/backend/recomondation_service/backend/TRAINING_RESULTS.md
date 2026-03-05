# Model Training and Validation Results

## Training Date
2026-01-02

## Training Data Used
- **Error Training**: `error_training_data_combined.csv` (3,219 samples, 21 error types)
- **Product Category**: `product_texts.csv` (14 samples, 5 categories)
- **Product Need**: `hardware_component_dataset_combined.csv` (22,443 samples, 53 component types)

---

## Model Performance Summary

### 1. Error Type Classification Model

**Training Results:**
- **Training Samples**: 2,575
- **Test Samples**: 644
- **Classes**: 21 error types
- **Training Time**: 0.14 seconds

**Validation Metrics:**
- ✅ **Accuracy**: **83.70%**
- ✅ **Precision**: **83.75%**
- ✅ **Recall**: **83.70%**
- ✅ **F1-Score**: **83.44%**
- ✅ **Cross-Validation Accuracy**: **82.52%** (±0.85%)
- ✅ **MAP (Mean Average Precision)**: **86.00%**

**Top Performing Error Types:**
- BIOS Issue: 96% precision, 100% recall
- Boot Device Error: 100% precision, 100% recall
- Virus / Malware: 100% precision, 100% recall
- CPU Overheat: 87% precision, 94% recall
- OS Reinstall / Corrupted: 92% precision, 92% recall

**Model File**: `nlp_error_model_error_type.pkl`

---

### 2. Product Category Classification Model

**Training Results:**
- **Training Samples**: 11
- **Test Samples**: 3
- **Classes**: 5 categories
- **Training Time**: 0.02 seconds

**Validation Metrics:**
- ⚠️ **Accuracy**: **66.67%**
- ⚠️ **Precision**: **66.67%**
- ⚠️ **Recall**: **66.67%**
- ⚠️ **F1-Score**: **66.67%**
- ✅ **MAP (Mean Average Precision)**: **100.00%**

**Note**: Limited training data (only 14 samples total). Model performance is constrained by small dataset size. Consider collecting more training data for better accuracy.

**Model File**: `nlp_error_model_product.pkl`

---

### 3. Product Need (Component) Classification Model

**Training Results:**
- **Training Samples**: 17,954
- **Test Samples**: 4,489
- **Classes**: 53 component types
- **Training Time**: 0.54 seconds

**Validation Metrics:**
- ✅ **Accuracy**: **97.79%** ⭐
- ✅ **Precision**: **97.43%** ⭐
- ✅ **Recall**: **97.79%** ⭐
- ✅ **F1-Score**: **97.60%** ⭐
- ✅ **MAP (Mean Average Precision)**: **71.09%**

**Top Performing Components:**
- RAM Upgrade: 99.22% accuracy (386 test samples)
- CPU Upgrade: 99.49% accuracy (196 test samples)
- Monitor Replacement: 99.44% accuracy (178 test samples)
- Webcam Upgrade: 100% accuracy (211 test samples)
- PSU Upgrade: 98.68% accuracy (227 test samples)

**Model File**: `product_need_model.pkl`

---

## Overall Performance Comparison

| Model | Accuracy | Precision | Recall | F1-Score | MAP |
|-------|----------|-----------|--------|----------|-----|
| **Error Type** | 83.70% | 83.75% | 83.70% | 83.44% | 86.00% |
| **Product Category** | 66.67% | 66.67% | 66.67% | 66.67% | 100.00% |
| **Product Need** | **97.79%** ⭐ | **97.43%** ⭐ | **97.79%** ⭐ | **97.60%** ⭐ | 71.09% |

---

## Key Insights

### ✅ Strengths
1. **Product Need Model**: Excellent performance (97.79% accuracy) with large, diverse training dataset
2. **Error Type Model**: Strong performance (83.70% accuracy) with good balance across metrics
3. **All models trained successfully** using combined CSV files
4. **Fast training times**: All models trained in under 1 second

### ⚠️ Areas for Improvement
1. **Product Category Model**: Limited by small dataset (14 samples). Needs more training data.
2. **Error Type Model**: Some classes like "GPU Upgrade" and "USB / Port Issue" have lower performance due to fewer samples
3. **Product Need Model**: Some rare components (with only 1-2 samples) show 0% performance - consider data augmentation

---

## Recommendations

1. **Collect more Product Category training data** to improve accuracy from 66.67%
2. **Augment rare error types** (GPU Upgrade, USB/Port Issue) with more examples
3. **Add more samples for rare components** in Product Need model
4. **Monitor model performance** in production and collect feedback for continuous improvement

---

## Generated Visualizations

All evaluation visualizations have been saved to `backend/model_evaluations/`:
- Comprehensive metrics comparison charts
- Individual metric comparisons
- Radar charts for each model
- Metrics heatmap
- Summary tables
- Confusion matrices for detailed error analysis

---

## Model Files

All trained models are saved in `backend/`:
- ✅ `nlp_error_model_error_type.pkl` - Error Type Classification
- ✅ `nlp_error_model_product.pkl` - Product Category Classification
- ✅ `product_need_model.pkl` - Product Need (Component) Classification

---

**Status**: ✅ All models trained and validated successfully  
**Next Steps**: Deploy models to production and monitor performance

