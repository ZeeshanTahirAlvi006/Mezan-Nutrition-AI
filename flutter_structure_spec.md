# Proposed Flutter Project Structure (Riverpod + Clean Architecture)

This structure is designed for scalability, testability, and clear separation of concerns, matching the complexity of the NutriGuide application.

```text
lib/
├── main.dart                 # App entry point & initialization (Hive, Firebase)
├── app.dart                  # Root widget, Material 3 theme configuration, Router
├── core/                     # Cross-cutting concerns
│   ├── constants/            # API endpoints, Asset paths, M3 color constants
│   ├── errors/               # Failure & Exception classes
│   ├── network/              # Dio client, Interceptors (JWT)
│   ├── theme/                # Material 3 Theme data definitions
│   └── utils/                # Formatters, Validators (Mifflin-St Jeor)
├── data/                     # Data Layer (Repositories & Data Sources)
│   ├── models/               # JSON serialization models (User, Log, Meal)
│   ├── repositories/         # Implementation of domain repositories
│   └── sources/              # Remote (API) and Local (Hive) data sources
├── domain/                   # Domain Layer (Business Logic & Entities)
│   ├── entities/             # Clean business objects
│   └── repositories/         # Abstract repository interfaces
├── providers/                # Global Riverpod Providers
│   ├── auth_provider.dart    # User session & JWT management
│   ├── log_provider.dart     # Daily logs & Macro calculations
│   └── chat_provider.dart    # AI Chat state & Tool calling logic
└── presentation/             # UI Layer (Screens & Widgets)
    ├── dashboard/
    │   ├── screens/          # Dashboard view
    │   └── widgets/          # Macro indicators, Weekly chart
    ├── chat/
    │   ├── screens/          # Chat interface
    │   └── widgets/          # Message bubbles, Agent status indicator
    ├── meal_plan/
    │   ├── screens/          # 7-day plan view
    │   └── widgets/          # Meal cards, Date picker bar
    ├── onboarding/
    │   ├── screens/          # Multi-step profile setup
    │   └── widgets/          # Step indicators, Goal selectors
    ├── profile/              # User settings & Health profile
    └── shared/               # Reusable M3 widgets (Buttons, Bottom sheets)
```

## Key Architectural Choices:

1. **Feature-First Presentation:** UI is organized by feature (Dashboard, Chat, etc.) to make it easy to find and modify screens/widgets.
2. **Provider Hub:** Global states (Auth, Log, Chat) live in the `providers/` directory for easy access across any screen.
3. **Data/Domain Split:** Models handle raw API data, while Entities represent the clean data used by the UI.
4. **Core Services:** The `core/` folder contains the "plumbing" of the app (Networking, Themes, Utils) that doesn't belong to any specific feature.
