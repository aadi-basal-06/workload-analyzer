# Workload Pressure & Deadline Collision Engine

## 1. Multi-Dimensional Workload Model

Student academic fatigue and cognitive burnout are multi-factorial. The engine aggregates five orthogonal stress vectors into a unified risk rating.

Every pressure component is scaled to a normalized $[0, 100]$ range:

### Dimension 1: Temporal Pressure ($P_T$, Weight: 25%)
- **Definition**: Measures deadline density (concentration of deliverables per unit time).
- **Formula**:
  $$\text{Deadlines Per Week} = \left(\frac{\text{Active Tasks Due}}{\text{Window Days}}\right) \times 7$$
  $$P_T = \min\left(100.00, \text{Deadlines Per Week} \times 20.00\right)$$
- **Interpretation**: 5 deadlines in a 7-day period scales to 100% temporal pressure.

### Dimension 2: Workload Pressure ($P_W$, Weight: 30%)
- **Definition**: Compares required study hours against the student's logged study availability.
- **Formula**:
  $$P_W = \min\left(100.00, \left(\frac{\text{Total Estimated Task Hours Remaining}}{\max(1.0, \text{Available Study Hours})}\right) \times 100\right)$$
- **Interpretation**: If a student has 40 hours of homework remaining and only 20 hours of logged study time, workload pressure hits 100% (causing an `OVERLOAD` collision).

### Dimension 3: Cognitive Pressure ($P_C$, Weight: 15%)
- **Definition**: Captures task complexity and conceptual difficulty.
- **Formula**:
  $$\text{Avg Product} = \frac{1}{N}\sum (\text{Cognitive Load [1-10]} \times \text{Difficulty Level [1-5]})$$
  $$P_C = \min\left(100.00, \left(\frac{\text{Avg Product}}{50.00}\right) \times 100\right)$$
- **Interpretation**: High difficulty project milestones elevate cognitive fatigue.

### Dimension 4: Assessment Pressure ($P_A$, Weight: 20%)
- **Definition**: Cumulative percentage of overall course grades due within the analysis window.
- **Formula**:
  $$P_A = \min\left(100.00, \sum \text{Assessment Weight (\%)}\right)$$
- **Interpretation**: Clustered midterms (e.g. 25% + 20% due in 24h) trigger maximum assessment stress.

### Dimension 5: Dependency Pressure ($P_D$, Weight: 10%)
- **Definition**: Quantifies blocking bottlenecks caused by unfinished prerequisite assignments.
- **Formula**:
  $$P_D = \min\left(100.00, \text{Count of Unfinished Prerequisites} \times 25.00\right)$$
- **Interpretation**: 4 uncompleted prerequisites creates a maximum blocking pressure of 100%.

---

## 2. Overall Risk Score & Classification

The composite risk score is evaluated as a weighted linear combination:

$$\text{Overall Risk} = 0.25 P_T + 0.30 P_W + 0.15 P_C + 0.20 P_A + 0.10 P_D$$

### Risk Levels
- **`LOW`**: $\text{Overall Risk} < 30.00\%$
- **`MEDIUM`**: $30.00\% \le \text{Overall Risk} < 55.00\%$
- **`HIGH`**: $55.00\% \le \text{Overall Risk} < 75.00\%$
- **`CRITICAL`**: $\text{Overall Risk} \ge 75.00\%$

---

## 3. Algorithmic Collision Detection Rules

Detected in `sp_detect_collisions` without duplicate unresolved entries:

1. **`DEADLINE_CLUSTER`**:
   - Condition: $\ge 3$ active deadlines within any continuous 48-hour window.
   - Severity: `MEDIUM` for 3 deadlines; `HIGH` for 4+ deadlines.
2. **`OVERLOAD`**:
   - Condition: Required study hours exceed available logged hours ($P_W > 100\%$).
   - Severity: `MEDIUM` for $1.0\times$ to $1.5\times$; `HIGH` for $> 1.5\times$ required hours.
3. **`ASSESSMENT_OVERLAP`**:
   - Condition: $\ge 2$ assessments due within 24 hours with cumulative grade weight $\ge 25\%$.
   - Severity: `HIGH`.

---

## 4. What-If Simulation Engine

Executed by `sp_simulate_deadline_change(task_id, proposed_deadline, faculty_id)`:
1. Dynamically isolates all students enrolled in the task's semester cohort.
2. Evaluates baseline cohort risk and collisions vs hypothetical metrics at the proposed date.
3. Computes:
   $$\text{Impact Score} = \text{Projected Risk} - \text{Original Risk}$$
4. Categorizes the decision:
   - **`APPROVE`**: Impact $\le 4.00\%$ and no new cluster created.
   - **`NOT RECOMMENDED`**: New cluster created ($\ge 2$ clashing tasks) or impact $\ge 15.00\%$.
   - **`SUGGEST ALTERNATE DATE`**: Moderate risk increase; recommends postponing 2–3 days.

