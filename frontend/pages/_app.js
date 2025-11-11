import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { DashboardProvider } from '../contexts/DashboardContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Component {...pageProps} />
      </DashboardProvider>
    </AuthProvider>
  );
}
