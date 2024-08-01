import React from "react";
import Head from "next/head";
import { ConnectNostr } from "./connect-nostr";

type LayoutProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

const Layout: React.FC<LayoutProps> = ({
  children,
  title = "Default Title",
  description = "Default Description",
}) => {
  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      <div className="max-w-screen-md mx-auto mt-10">
        <div className="flex justify-between">
          <div className="text-3xl font-bold">NosBook</div>
          <ConnectNostr />
        </div>

        <main>{children}</main>
        <div className="my-12 text-gray-500 italic">
          <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />
          This template is created by{" "}
          <a
            href="https://github.com/RetricSu/offckb"
            target="_blank"
            rel="noopener noreferrer"
          >
            offckb
          </a>
        </div>
      </div>
    </div>
  );
};

export default Layout;
