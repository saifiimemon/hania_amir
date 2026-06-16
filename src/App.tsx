import { HeroSection } from './components/HeroSection';

function App() {
  return (
    <div className="app-container">
      {/* Main Centered Content */}
      <main style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <HeroSection />
      </main>
    </div>
  );
}

export default App;
