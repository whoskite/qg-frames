# ☺ FunQuotes

![image](https://github.com/user-attachments/assets/02cae4a3-68d9-4449-8283-739336deeb8f)


A modern web application that generates personalized quotes with GIF integration, powered by AI and enhanced with social sharing capabilities. Create, customize, and share inspiring quotes with matching GIFs on Farcaster..

## ✨ Features

- **AI-Powered Quote Generation**
  - Personalized quotes based on user preferences
  - Multiple quote styles (casual, direct, eloquent, poetic, humorous, spiritual, philosophical)
  - Context-aware generation based on time of day
  - Custom prompt support

- **Real Quotes (Categories)**
  - Curated, authentic quotes from notable figures, authors, and thinkers
  - Organized by themes for easy exploration
  - Users can browse and favorite their favorite quotes
  
- **Rich Media Integration**
  - Automatic GIF matching with GIPHY
  - GIF regeneration capability
  - Custom image generation for social sharing
  - Background themes and customization

- **User Experience**
  - Personalized onboarding flow
  - Quote history tracking
  - Favorite quotes collection
  - Keyboard shortcuts
  - Dark mode support
  - Mobile-responsive design

- **Social Features**
  - Direct sharing to Farcaster
  - Custom image generation for social posts
  - User profile integration
  - Social interactions tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.0, React 19, TypeScript
- **Styling**: TailwindCSS, Framer Motion
- **Authentication**: Farcaster Auth Kit
- **Backend Services**: Firebase
- **State Management**: React Query
- **UI Components**: Radix UI
- **Notifications**: Sonner
- **Analytics**: Firebase Analytics

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
cd funquotes
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following configurations:

```env
# App
NEXT_PUBLIC_URL=your_app_url

# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# GIPHY
GIPHY_API_KEY=your_giphy_api_key

# KV Storage (Optional)
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
```

4. Run the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## 🎨 Development

### Project Structure
```
src/
├── app/              # Next.js app router
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── types/           # TypeScript types
└── styles/          # Global styles
```

### Key Components
- `Demo.tsx`: Main application component
- `OnboardingFlow.tsx`: User onboarding experience
- `BottomNav.tsx`: Mobile navigation
- `ErrorBoundary.tsx`: Error handling

### API Routes
- `/api/giphy`: GIPHY integration
- `/api/firebase-config`: Firebase configuration
- `/api/webhook`: Farcaster webhook handler
- `/api/send-notification`: Notification service

## 📱 Mobile Support
The application is fully responsive and optimized for mobile devices, providing a seamless experience across all screen sizes.

We currently do not support Desktop.

## 🔒 Security
- Secure authentication through Farcaster
- Protected API routes
- Secure data storage with Firebase
- Environment variable protection

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is private and proprietary.

## 🔧 Troubleshooting

### Common Issues
1. **Firebase Initialization Failed**
   - Check Firebase configuration in `.env`
   - Verify Firebase project settings

2. **GIPHY Integration Issues**
   - Verify GIPHY API key
   - Check API rate limits

3. **Build Errors**
   - Clear `.next` directory
   - Update dependencies
   - Check TypeScript errors

For more issues, please check the error logs or create an issue in the repository.
