import "./globals.css";

export const metadata = {
  title: "Call-A-Van.live - See Who is Live Near You",
  description: "Local drivers. Real-time availability. Call directly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
