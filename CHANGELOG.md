# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-24

### Added
- Bottom Navigation Bar with three core sections:
  - Generate (with dice icon)
  - Favorites
  - History
- Enhanced User Preferences:
  - Quote style selection (casual, direct, eloquent, poetic, humorous, spiritual, philosophical)
  - Areas of improvement selection
  - Personal goals setting
  - Writing style customization
- Advanced user preference analysis system
  - Quote length preferences
  - Theme analysis
  - Emotional tone detection
  - Complexity analysis

### Changed
- Navigation system from top-nav to bottom-nav for better mobile experience
- Updated icon system with more minimal design
  - New dice icon for generation
  - New arrow share icon
- Enhanced Profile Menu with expanded user preferences
- Improved quote generation algorithm based on user preferences

### Removed
- Daily Login feature and streak system
- Redundant UI elements
- Unused analytics events related to daily streaks

### Fixed
- Mobile responsiveness improvements
- Navigation flow optimizations
- Performance enhancements for preference saving
- Style preference persistence issues

### Technical Updates
- Enhanced user preference data structure
- Improved state management for preferences
- Optimized data fetching patterns
- Updated Firebase integration for new preference system

### Developer Notes
- Removed daily login related code (see docs/features/daily-login-improvements.md)
- Updated user preference analysis system (Demo.tsx)
- Enhanced quote generation logic (openai/route.ts)

## [1.1.1] - 2025-01-20

### What's New
- Redesigned navigation bar with smaller logo and profile images
- Improved mobile responsiveness
- Enhanced user profile section with updated styling
- Added Farcaster Frame integration
- Implemented dark mode support

### Improvements
- Optimized image loading performance
- Enhanced accessibility features
- Updated color scheme with purple accents
- Improved error handling for profile image loading

### Technical Updates
- Updated Next.js to version 15.0.3
- Added new dependencies for Farcaster integration
- Implemented edge runtime for OpenGraph images
- Enhanced TypeScript type definitions

### Bug Fixes
- Fixed profile image fallback behavior
- Resolved mobile Safari height issues
- Fixed dropdown menu positioning
- Corrected color contrast issues in dark mode

## [1.0.0] - 2025-01-06

### Added
- Initial release
- Quote generation with AI integration
- GIF pairing functionality
- Farcaster Frame integration
- User authentication
- Firebase/Firestore integration
- Quote favorites system
- Quote history tracking
- Modern UI with Tailwind CSS
- Animations with Framer Motion

### Changed
- N/A (Initial Release)

### Deprecated
- N/A (Initial Release)

### Removed
- N/A (Initial Release)

### Fixed
- N/A (Initial Release)

### Security
- Implemented secure Firebase authentication
- Added environment variable protection
- Secured API endpoints 