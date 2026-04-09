import Navbar from '../components/shared/layout/Navbar';
import CourseList from '../components/courses/CourseList';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12 col-lg-7">
            <CourseList />
          </div>
        </div>
      </div>
    </>
  );
}
