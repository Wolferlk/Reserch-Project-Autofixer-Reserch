# Model Evaluation Summary

## Overview
This document summarizes the evaluation results for all ML models in the PC Recommendation Engine.

## Evaluation Metrics

### 1. Error Type Classification Model
- **Accuracy**: 78.57%
- **Precision**: 75.56%
- **Recall**: 78.57%
- **F1-Score**: 76.46%
- **MAP (Mean Average Precision)**: 87.74%
- **Test Samples**: 644
- **Number of Classes**: 21

**Analysis**: This model performs well with good accuracy and excellent MAP score, indicating strong ranking capabilities for error type classification.

### 2. Product Category Classification Model
- **Accuracy**: 66.67%
- **Precision**: 66.67%
- **Recall**: 66.67%
- **F1-Score**: 66.67%
- **MAP (Mean Average Precision)**: 100.00%
- **Test Samples**: 3
- **Number of Classes**: 3

**Analysis**: Limited test data (only 3 samples), but perfect MAP score. Consider collecting more test data for more reliable evaluation.

### 3. Product Need (Component) Classification Model
- **Accuracy**: 76.97%
- **Precision**: 78.58%
- **Recall**: 76.97%
- **F1-Score**: 75.82%
- **MAP (Mean Average Precision)**: 71.53%
- **Test Samples**: 165
- **Number of Classes**: 44

**Analysis**: Good performance across all metrics. The model handles 44 different component types effectively with balanced precision and recall.

## Generated Visualizations

The following visualization files have been generated in the `model_evaluations` directory:

### Performance Metrics Visualizations

1. **comprehensive_metrics_comparison.png**
   - Side-by-side bar chart comparing all metrics (Accuracy, Precision, Recall, F1-Score, MAP) across all models

2. **individual_metrics_comparison.png**
   - Separate bar charts for each metric, making it easy to compare models for specific metrics

3. **radar_chart_comparison.png**
   - Radar/spider charts showing all metrics for each model in a circular format

4. **metrics_heatmap.png**
   - Heatmap visualization showing metric values as color intensities

5. **summary_table.png**
   - Tabular summary of all metrics for all models

### Confusion Matrices

6. **confusion_matrix_error_type_classification.png**
   - Confusion matrix for Error Type Classification model showing both raw counts and normalized percentages
   - Helps identify which error types are commonly confused with each other

7. **confusion_matrix_product_category_classification.png**
   - Confusion matrix for Product Category Classification model
   - Shows both raw counts and normalized percentages

8. **confusion_matrix_product_category_classification_normalized.png**
   - Large normalized confusion matrix for Product Category Classification model

9. **confusion_matrix_product_need_component_classification.png**
   - Confusion matrix for Product Need (Component) Classification model
   - Shows both raw counts and normalized percentages
   - Helps identify which hardware components are commonly confused

## Key Insights

1. **Error Type Model**: Best overall performance with 78.57% accuracy and excellent MAP of 87.74%
2. **Product Category Model**: Limited test data but shows perfect MAP score
3. **Product Need Model**: Good balance between precision (78.58%) and recall (76.97%)

## Recommendations

1. **Collect more test data** for Product Category model to get more reliable evaluation
2. **Error Type model** shows the best performance - consider using it as a reference for other models
3. **Product Need model** handles 44 classes well - consider if additional classes need to be added

## Understanding Confusion Matrices

Confusion matrices help you understand:
- **Diagonal elements**: Correct predictions (higher is better)
- **Off-diagonal elements**: Misclassifications (lower is better)
- **Row**: Represents the true class
- **Column**: Represents the predicted class

The confusion matrices are provided in two formats:
1. **Raw counts**: Shows the actual number of predictions
2. **Normalized (percentages)**: Shows the percentage of predictions, making it easier to compare classes with different sample sizes

### Interpreting the Matrices

- **Perfect model**: All values would be on the diagonal (0% off-diagonal)
- **Common confusions**: Off-diagonal values show which classes are frequently confused
- **Class imbalance**: Normalized matrices help identify if certain classes are harder to predict

## How to View Visualizations

All visualization files are saved in:
```
backend/model_evaluations/
```

Open any PNG file to view the graphical representations of the model performance metrics.

### Recommended Viewing Order

1. Start with **summary_table.png** for a quick overview
2. Check **comprehensive_metrics_comparison.png** for overall performance
3. Review **confusion_matrix_*.png** files to understand classification errors
4. Use **individual_metrics_comparison.png** to dive deep into specific metrics

## Running the Evaluation

To regenerate these visualizations, run:
```bash
cd backend
.\venv\Scripts\activate
python evaluate_models_with_visualization.py
```

