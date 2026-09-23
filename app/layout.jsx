import "./globals.css";
import NavBar from "../components/NavBar";

export const metadata = {
  title: "AutoMarket — Buy, Sell, and Bid on Vehicles",
  description: "List vehicles and parts, run auctions, and sell directly — with shareable links built in.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <NavBar />
        <div style={{ maxWidth: "100vw", overflowX: "hidden" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
