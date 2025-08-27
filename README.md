# 🗺️ Itinerary Killer

A modern web application for planning and organizing activities in Orlando, Florida with location-based features and interactive mapping.

## ✨ Features

- **Interactive Map**: View all your planned activities on an interactive map
- **Location Services**: Get your current location and see distances to activities
- **Smart Organization**: Categorize activities by type (Theme Parks, Restaurants, Shopping, etc.)
- **Priority Management**: Set high, medium, or low priority for each activity
- **Rich Details**: Track duration, cost, notes, and completion status
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Instant updates as you add, edit, or complete activities
- **Distance Calculations**: See how far each activity is from your current location
- **Filtering & Sorting**: Organize activities by category, priority, or distance

## 🚀 Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/itinerary-killer.git
   cd itinerary-killer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to see the app in action!

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to GitHub Pages

### Project Structure

```
src/
├── components/          # React components
│   ├── AddItemModal.tsx # Modal for adding new activities
│   └── ItineraryList.tsx # List of all itinerary items
├── hooks/              # Custom React hooks
│   └── useSpacetimeDB.ts # Database integration hook
├── utils/              # Utility functions
│   └── location.ts     # Location and distance calculations
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Mapping**: Leaflet with React-Leaflet
- **Styling**: CSS with modern design principles
- **Icons**: Lucide React
- **Database**: Spacetime DB (with localStorage fallback)
- **Deployment**: GitHub Pages

## 🗄️ Database Integration

The app is designed to work with Spacetime DB for persistent storage. Currently, it uses localStorage as a fallback, but you can easily integrate with Spacetime DB by:

1. Setting up your Spacetime DB instance
2. Adding your credentials to environment variables
3. Updating the `useSpacetimeDB` hook to use the actual API

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_SPACETIME_URL=your_spacetime_db_url
REACT_APP_SPACETIME_TOKEN=your_spacetime_db_token
```

## 🚀 Deployment

### GitHub Pages

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to GitHub Pages**
   ```bash
   npm run deploy
   ```

3. **Configure GitHub Pages**
   - Go to your repository settings
   - Navigate to Pages section
   - Set source to "Deploy from a branch"
   - Select `gh-pages` branch

### Manual Deployment

1. Build the project: `npm run build`
2. Upload the `dist` folder contents to your web server
3. Ensure your server is configured to handle client-side routing

## 📱 Mobile Support

The app is fully responsive and includes:
- Touch-friendly interface
- Mobile-optimized sidebar
- Responsive map controls
- Optimized form inputs for mobile devices

## 🔧 Configuration

### Customizing Categories

Edit the `CATEGORIES` array in `src/components/AddItemModal.tsx` to add or modify activity categories.

### Map Settings

Modify the default map center and zoom level in `src/App.tsx`:

```typescript
const defaultCenter: [number, number] = [28.5383, -81.3792]; // Orlando, FL
```

### Styling

The app uses CSS custom properties for easy theming. Modify colors and styles in `src/index.css`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Leaflet](https://leafletjs.com/) for the interactive mapping
- [OpenStreetMap](https://www.openstreetmap.org/) for map tiles
- [Nominatim](https://nominatim.org/) for geocoding services
- [Lucide](https://lucide.dev/) for beautiful icons

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Review the code comments

---

**Happy planning! 🎉**

*Built with ❤️ for Orlando adventures*
