# Quote Generator with Farcaster Frames

A modern, interactive quote generator built with Next.js and Farcaster Frames integration. Generate inspiring quotes, share them on Farcaster, and manage your favorite quotes with a beautiful UI.

## 🌟 Features

- **AI-Powered Quote Generation**: Generate unique and inspiring quotes
- **GIF Integration**: Automatically paired GIFs that match the quote's mood
- **Farcaster Integration**: Share quotes directly to Farcaster with frames
- **Quote Management**:
  - Save favorite quotes
  - View quote history
  - Regenerate GIFs for existing quotes
- **Modern UI**: Beautiful, responsive design with smooth animations
- **User Authentication**: Farcaster user authentication
- **Cloud Storage**: Firebase/Firestore integration for persistent storage

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Farcaster account
- Firebase project (for storage)
- GIPHY API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/whoskite/qg-frames.git
cd qg-frames
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your API keys and configuration values

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# GIPHY API Configuration
NEXT_PUBLIC_GIPHY_API_KEY=your_giphy_api_key

# Optional: Analytics Configuration
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_google_analytics_id

# Optional: API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000 
```

## 🛠️ Built With

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Firebase](https://firebase.google.com/) - Backend and storage
- [Farcaster Frame SDK](https://docs.farcaster.xyz/reference/frames/spec) - Farcaster integration
- [GIPHY API](https://developers.giphy.com/) - GIF integration

## 📱 Features in Detail

### Quote Generation
- Generate quotes based on user input or random prompts
- AI-powered quote generation system
- Automatic GIF pairing based on quote content

### Farcaster Integration
- Share quotes directly to Farcaster
- Frame support for interactive sharing
- User authentication through Farcaster

### Quote Management
- Save favorite quotes with associated GIFs
- View and manage quote history
- One-click regeneration of GIFs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to the Farcaster team for the Frame SDK
- GIPHY for providing the GIF API
- All contributors and users of the app

## 📬 Contact

Kite - [@kite](https://warpcast.com/kite) on Farcaster

Project Link: [https://github.com/whoskite/qg-frames](https://github.com/whoskite/qg-frames)

## 🔮 Future Plans

Core Features:
- [ ] Quote categories and themes
- [ ] Public quote gallery with curation
- [ ] User collections and playlists

User Experience:
- [ ] New user onboarding flow
- [ ] In-app curated feed with engagement features
- [ ] Lazy loading and pagination
- [ ] Image loading optimizations

Integration & Data:
- [ ] Hubble integration
- [ ] Talent Protocol integration
- [ ] Unified private/public data system with Firebase & Hubble

Social & Sharing:
- [ ] Expanded social platform integrations
- [ ] Enhanced sharing capabilities

Analytics:
- [ ] Usage tracking and insights
- [ ] Performance monitoring
- [ ] User feedback system