import { AllBooks } from "../components/book/all-books";
import { MyBook } from "../components/book/my-books";
import Layout from "@/components/layout";

const Home = () => {
  return (
    <Layout>
      <div className="my-6">
        <div className="mb-2 font-bold">My Books</div>
        <MyBook />
      </div>

      <div className="my-6">
        <div className="mb-2 font-bold">Explore Books</div>
        <AllBooks />
      </div>
    </Layout>
  );
};

export default Home;
