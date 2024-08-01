"use client";

import { loadWasmSync } from "@rust-nostr/nostr-sdk";
import { AllBooks } from "../components/all-books";
import { ConnectNostr } from "../components/connect-nostr";
import { MyBook } from "../components/my-books";
import Layout from "@/components/layout";

loadWasmSync();

const Home = () => {
  return (
    <Layout>
      <div className="my-6">
        <MyBook />
      </div>

      <div className="my-6">
        <AllBooks />
      </div>
    </Layout>
  );
};

export default Home;
