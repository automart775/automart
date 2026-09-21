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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
