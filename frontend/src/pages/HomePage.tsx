import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/layout/Navbar';
import UploadButton from '../components/shared/UploadButton';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h1>Welcome, {user?.username}!</h1>
        <p className="lead">Your study dashboard will appear here.</p>

        <div className="card mt-4" style={{ maxWidth: 400 }}>
          <div className="card-body">
            <h5 className="card-title">Test Upload</h5>
            <UploadButton bucket="test">Upload Asset</UploadButton>
          </div>
        </div>
      </div>
    </>
  );
}
