import { useAuth } from "../context/AuthContext";
import Navbar from "../components/shared/Navbar";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h1>Welcome, {user?.username}!</h1>
        <p className="lead">Your study dashboard will appear here.</p>
      </div>
    </>
  );
}
