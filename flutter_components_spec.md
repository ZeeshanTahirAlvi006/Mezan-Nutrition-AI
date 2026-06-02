# Detailed Front-End Component Specification (Material 3)

This document details the specific components and views required for the NutriGuide Flutter application, strictly adhering to **Material 3 (M3)** guidelines.

## 1. Core Visual Styles (Material 3)
- **Design System:** Strict Material 3 adherence.
- **Color System:** 
    - Utilize **Dynamic Color** (Material You) where the primary palette is derived from the user's wallpaper (if supported).
    - **Primary:** Health Green (#10B981 equivalent in M3 palette).
    - **Surface:** M3 Neutral variants for background and container roles.
    - **Elevation:** Use M3 color-based elevation (Surface Tints) instead of drop shadows.
- **Typography:** M3 Type Scale using **Roboto** or the system font.
    - Display Large/Medium for macro numbers.
    - Body Large/Medium for messages.
- **Shape:** M3 rounded corners (Extra Large for cards, Full for FABs).

## 2. Key Screen Components (M3)

### 2.1 Dashboard Screen
- **`MacroProgressIndicators`:** M3 CircularProgressIndicators for macro tracking. For the "concentric" look, use nested `Stack` widgets with different stroke widths and colors from the M3 Tertiary and Secondary palettes.
- **`DailyCheckInSegmentedButton`:** Use M3 Segmented Buttons for quick mood/energy selection.
- **`WeeklyAdherenceCard`:** M3 Elevated Card containing a chart with M3-compliant colors.
- **`ExtendedFAB`:** M3 Extended Floating Action Button ("Log Meal") that collapses to a standard FAB on scroll.

### 2.2 Chat (AI Coach) Screen
- **`ChatMessages`:** M3-styled chat bubbles using `SurfaceVariant` for incoming and `PrimaryContainer` for outgoing messages.
- **`InputBar`:** M3 Search Bar style or filled TextField with rounded corners.
- **`AgentStatusIndicator`:** M3 LinearProgressIndicator (Indeterminate) shown at the top of the chat during AI "thinking" phases.

### 2.3 Meal Planner Screen
- **`DateFilterChips`:** M3 Filter Chips in a scrollable list for day selection.
- **`MealList`:** M3 Filled Cards for each meal category.
- **`FoodListItem`:** M3 List Items with trailing icons for replacement/actions.

### 2.4 Pantry Manager
- **`IngredientInput`:** M3 Filled TextField with trailing 'Add' button.
- **`PantryChips`:** M3 Input Chips with 'delete' icons for each ingredient.

## 3. Logic & Control Flows (M3 Patterns)

### 3.1 The "Food Logging" Flow (M3 Modal Bottom Sheet)
1. **Trigger:** User scans a barcode or taps FAB.
2. **Lookup:** App sends data to `/api/food/lookup`.
3. **Display:** Show results in an **M3 Modal Bottom Sheet** (Full width, rounded top corners).
4. **Action:** User adjusts servings via an M3 Slider; confirm with a Text Button.

### 3.2 The "AI Interaction" Flow
1. **Interaction:** AI response triggers a "Meal Suggestion" displayed as an M3 Card within the chat.
2. **Action:** "Add to Log" button on the card uses the M3 Filled Button style.

### 3.3 Onboarding (M3 Stepper/Navigation)
1. **Visuals:** Use an M3 LinearProgressIndicator at the top to show onboarding progress.
2. **Layout:** Center-aligned M3 Headline and Body text with a prominent "Next" button at the bottom (M3 Filled Button).
