import { Link } from 'react-router-dom';
import Navbar from '../components/shared/layout/Navbar';

export default function SettingsPage() {
  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h1>Account Settings</h1>
        <p>Manage your profile and security settings.</p>

        <Link to="/settings/password">Change Password</Link>
      </div>
    </>
  );
}
