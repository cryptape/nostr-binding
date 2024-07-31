import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from "@remix-run/react";
import { useState } from "react";
import { SingerContext } from "./context/signer";
import { Buffer } from "buffer";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";
import { ccc } from "@ckb-ccc/ccc";

globalThis.Buffer = Buffer as unknown as BufferConstructor;

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export async function loader() {
  return json({
    ENV: {
      NETWORK: process.env.NETWORK,
    },
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="max-w-[700px] mx-auto">{children}</div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  const [signer, setSigner] = useState<ccc.SignerNostr | null>(null);

  const value = { signer, setSigner };
  return (
    <SingerContext.Provider value={value}>
      <Outlet />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
        }}
      />
    </SingerContext.Provider>
  );
}
